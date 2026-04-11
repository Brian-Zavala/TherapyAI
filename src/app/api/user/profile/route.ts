// @ts-nocheck
import { getAuthSession } from '@/lib/auth'
// Optimized profile API with caching and async operations
import { NextRequest, NextResponse } from "next/server"

// Next.js 15 route segment configuration for optimal performance
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30 // 30 seconds max for Railway
import { prisma } from "@/lib/prisma-optimized"
import { profileCache, cacheKeys } from "@/lib/cache/profile-cache"
import { findUserByEmailOptimized } from "@/lib/database/optimized-user-queries"
import { jobQueue, JobType } from "@/lib/queue/background-jobs"
import { formatPhoneNumber, validatePhoneNumber } from "@/lib/sms-service"
import type { WelcomeUser } from "@/lib/welcome-messages"
import { notificationPrefsSchema, preferredDaysSchema, currentConcernsSchema, onboardingDataSchema } from "@/lib/zod-schemas";

// Cache control headers
const CACHE_HEADERS = {
  'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
  'CDN-Cache-Control': 'max-age=60',
  'Vercel-CDN-Cache-Control': 'max-age=300'
}

// Helper function to process notification preferences and SMS consent
function processNotificationData(data: any) {
  let notificationPrefs = data.notificationPrefs || []
  if (typeof notificationPrefs === 'string') {
    notificationPrefs = notificationPrefs === 'none' ? [] : [notificationPrefs]
  }
  if (!Array.isArray(notificationPrefs)) {
    notificationPrefs = []
  }

  let formattedPhone = null
  let phoneValidated = false
  if (data.phone) {
    try {
      formattedPhone = formatPhoneNumber(data.phone, 'US')
      phoneValidated = validatePhoneNumber(formattedPhone)
    } catch (error) {
      console.warn('Phone number validation failed:', error)
      formattedPhone = data.phone
    }
  }

  const smsConsent = data.smsConsent === 'true' || data.smsConsent === true
  const hasSmsInPrefs = notificationPrefs.includes('sms')
  const finalSmsConsent = smsConsent && hasSmsInPrefs

  return {
    notificationPrefs,
    phone: formattedPhone,
    phoneValidated,
    smsConsent: finalSmsConsent,
    smsConsentDate: finalSmsConsent ? new Date() : null
  }
}

// GET handler with caching and optimized queries
export async function GET(req: NextRequest) {
  const startTime = Date.now()
  let session: any = null
  
  try {
    // Add response headers for better performance
    const headers = new Headers(CACHE_HEADERS)
    headers.set('X-Response-Time', startTime.toString())
    
    // EDGE CASE: Session retrieval with timeout protection
    // 15s timeout: new users trigger DB create + credit init which can take 8-12s
    try {
      session = await Promise.race([
        getAuthSession(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session retrieval timeout')), 15000)
        )
      ])
    } catch (sessionError) {
      console.error('[Profile API] Session retrieval error:', sessionError)
      return NextResponse.json({
        error: "Authentication service unavailable",
        code: "AUTH_TIMEOUT"
      }, { status: 503 })
    }
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // EDGE CASE: Validate email format before using in queries
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(session.user.email)) {
      console.error('[Profile API] Invalid email format:', session.user.email)
      return NextResponse.json({ 
        error: "Invalid email format",
        code: "INVALID_EMAIL" 
      }, { status: 400 })
    }
    
    // PERFORMANCE FIX: Check cache first before querying database
    const cacheKey = cacheKeys.userProfileByEmail(session.user.email)
    let cached = null
    
    try {
      cached = await Promise.race([
        profileCache.get(cacheKey),
        new Promise((resolve) => setTimeout(() => resolve(null), 2000)) // 2s cache timeout
      ])
    } catch (cacheError) {
      console.warn('[Profile API] Cache retrieval error, continuing without cache:', cacheError)
    }
    
    if (cached) {
      console.log(`[Profile API] Cache hit for ${session.user.email} (${Date.now() - startTime}ms)`)
      headers.set('X-Cache', 'HIT')
      headers.set('X-Response-Time', (Date.now() - startTime).toString())
      return NextResponse.json(cached, { headers })
    }
    
    // Use optimized parallel queries with increased timeout
    // Timeout should be less than the client's 20 seconds to allow for error handling
    let user = await Promise.race([
      findUserByEmailOptimized(session.user.email),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile query timeout after 18 seconds')), 18000)
      )
    ]) as any
    
    // If optimized query returns null, try direct query as fallback
    if (!user) {
      console.log(`[Profile API] Optimized query returned null, trying direct query for ${session.user.email}`)
      
      const fallbackUser = await Promise.race([
        prisma.user.findUnique({
          where: { email: session.user.email },
          include: {
            profile: true,
            familyMembers: {
              where: { isActive: true },
              orderBy: { order: 'asc' }
            }
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Fallback query timeout after 10 seconds')), 10000)
        )
      ]) as any
      
      if (!fallbackUser) {
        console.log(`[Profile API] User not found for ${session.user.email} - stale session`)
        return NextResponse.json({ 
          error: "User not found - please log in again",
          code: "STALE_SESSION" 
        }, { status: 401 })
      }
      
      // Transform fallback result to match optimized query structure
      user = {
        ...fallbackUser,
        familyMembers: fallbackUser.familyMembers || []
      }
    }
    
    // EDGE CASE: Ensure user object has expected structure
    if (!user || typeof user !== 'object') {
      console.error('[Profile API] Invalid user object structure')
      return NextResponse.json({ 
        error: "Invalid user data structure",
        code: "DATA_INTEGRITY_ERROR" 
      }, { status: 500 })
    }
    
    // Transform data for response with null safety
    const profile = user.profile || {}
    const familyMembers = Array.isArray(user.familyMembers) ? user.familyMembers : []
    
    // Map family members to legacy format
    const familyMemberData: any = {}
    for (let i = 0; i < 7; i++) {
      const member = familyMembers[i]
      const num = i + 1
      familyMemberData[`familyMember${num}`] = member?.name || ""
      familyMemberData[`familyMember${num}Age`] = member?.age || null
      familyMemberData[`familyMember${num}Relation`] = member?.relationship || ""
    }
    
    const responseData = {
      id: user.id,
      name: user.name || "",
      email: user.email,
      pronouns: profile?.pronouns || "",
      age: profile?.age || null,
      partnerName: profile?.partnerName || "",
      partnerAge: profile?.partnerAge || null,
      relationshipStatus: profile?.relationshipStatus || "",
      ...familyMemberData,
      currentConcerns: profile?.currentConcerns || null,
      emergencyContact: profile?.emergencyContact || "",
      sessionPreference: profile?.sessionPreference || "",
      preferredDays: profile?.preferredDays || null,
      sessionFrequency: profile?.sessionFrequency || "",
      recurringSession: profile?.recurringSession || "",
      reminderTiming: profile?.reminderTiming || "",
      communicationStyle: profile?.communicationStyle || "",
      additionalNotes: profile?.additionalNotes || "",
      onboardingCompleted: user.onboardingCompleted || false,
      onboardingData: user.onboardingData || null,
      phone: profile?.phone || "",
      notificationPrefs: profile?.notificationPrefs || "email",
      hasSeenIntro: user.hasSeenIntro || false
    }
    
    // Cache the response with longer TTL for better performance
    // EDGE CASE: Don't block response on cache write failure
    profileCache.set(cacheKey, responseData, 10 * 60 * 1000).catch(cacheError => {
      console.warn('[Profile API] Failed to cache response:', cacheError)
    })
    
    console.log(`[Profile API] Fetched profile for ${session.user.email} (${Date.now() - startTime}ms)`)
    headers.set('X-Cache', 'MISS')
    headers.set('X-Response-Time', (Date.now() - startTime).toString())
    return NextResponse.json(responseData, { headers })
    
  } catch (error) {
    const userEmail = session?.user?.email || 'unknown'
    console.error("[Profile API] Error:", error)
    
    // Handle timeout errors specifically
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        console.error(`[Profile API] Query timeout for ${userEmail} after ${Date.now() - startTime}ms`)
        return NextResponse.json({ 
          error: "Profile request timed out. Please try again.", 
          code: "TIMEOUT",
          details: "The profile query took too long to complete. This may be due to high database load."
        }, { status: 408 })
      }
      
      // Handle connection errors
      if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
        console.error(`[Profile API] Database connection error for ${userEmail}`)
        return NextResponse.json({ 
          error: "Database connection error. Please try again shortly.",
          code: "CONNECTION_ERROR"
        }, { status: 503 })
      }
    }
    
    // Generic error response
    return NextResponse.json(
      { error: "Failed to fetch profile" }, 
      { status: 500 }
    )
  }
}

// PATCH handler for onboarding updates
export async function PATCH(request: Request) {
  try {
    const session = await getAuthSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const userEmail = session.user.email
    const userName = session.user.name
    const data = await request.json()

    // Validate onboarding data structure
    try {
      if (data && typeof data === 'object') {
        onboardingDataSchema.parse(data);
      }
    } catch (error) {
      console.error('[Profile API] Onboarding validation error:', error);
      return NextResponse.json({ error: "Invalid onboarding data", details: error }, { status: 400 });
    }
    
    // Track family members for debug output (declare outside transaction scope)
    let familyMembersCreatedCount = 0
    
    // Use transaction for atomic updates
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Find or create user
      let user = await tx.user.findUnique({
        where: { email: userEmail }
      })
      
      if (!user) {
        user = await tx.user.create({
          data: {
            email: userEmail,
            name: data.nickname || userName || userEmail.split('@')[0],
            password: 'SESSION_CREATED_USER',
            onboardingData: data,
            onboardingCompleted: true
          }
        })
      } else {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            onboardingData: data,
            onboardingCompleted: true,
            name: data.nickname || user.name
          }
        })
      }
      
      // Update profile
      const notificationData = processNotificationData(data)
      await tx.userProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          pronouns: data.pronouns || null,
          age: data.age ? parseInt(data.age) : null,
          relationshipStatus: data.relationshipStatus || null,
          ...notificationData,
          partnerName: data.partnerName || null,
          partnerAge: data.partnerAge ? parseInt(data.partnerAge) : null,
          currentConcerns: data.goals || data.currentConcerns || null,
          emergencyContact: data.emergencyContact || null,
          sessionPreference: data.sessionTime || data.sessionPreference || null,
          preferredDays: data.preferredDays || null,
          sessionFrequency: data.sessionFrequency || null,
          recurringSession: data.recurringSession || null,
          reminderTiming: data.reminderTiming || null,
          communicationStyle: data.communicationStyle || null,
          additionalNotes: data.additionalNotes || null
        },
        update: {
          pronouns: data.pronouns || null,
          age: data.age ? parseInt(data.age) : null,
          relationshipStatus: data.relationshipStatus || null,
          ...notificationData,
          partnerName: data.partnerName || null,
          partnerAge: data.partnerAge ? parseInt(data.partnerAge) : null,
          currentConcerns: data.goals || data.currentConcerns || null,
          emergencyContact: data.emergencyContact || null,
          sessionPreference: data.sessionTime || data.sessionPreference || null,
          preferredDays: data.preferredDays || null,
          sessionFrequency: data.sessionFrequency || null,
          recurringSession: data.recurringSession || null,
          reminderTiming: data.reminderTiming || null,
          communicationStyle: data.communicationStyle || null,
          additionalNotes: data.additionalNotes || null
        }
      })
      
      // Delete existing family members before recreating
      await tx.familyMember.deleteMany({
        where: { userId: user.id }
      })

      const familyMembersToCreate = []
      for (let i = 1; i <= 7; i++) {
        const memberName = data[`familyMember${i}`]
        const memberAge = data[`familyMember${i}Age`]
        const memberRelation = data[`familyMember${i}Relation`]

        // Only create family member if name is provided and not empty
        if (memberName && typeof memberName === 'string' && memberName.trim()) {
          familyMembersToCreate.push({
            userId: user.id,
            name: memberName.trim(),
            age: memberAge ? parseInt(String(memberAge)) : null,
            relationship: (memberRelation && typeof memberRelation === 'string') ? memberRelation.trim() : '',
            order: i - 1,
            isActive: true
          })
        }
      }

      if (familyMembersToCreate.length > 0) {
        await tx.familyMember.createMany({
          data: familyMembersToCreate
        })
      }

      // Store count for debug output
      familyMembersCreatedCount = familyMembersToCreate.length

      return user
    })
    
    // Invalidate cache comprehensively
    await Promise.all([
      profileCache.invalidate(cacheKeys.userProfileByEmail(session.user.email)),
      updatedUser.id ? profileCache.invalidate(cacheKeys.userProfile(updatedUser.id)) : Promise.resolve(),
      // Also invalidate pattern to clear any related cache entries
      profileCache.invalidatePattern(`profile:*${session.user.email}*`)
    ])
    
    // CRITICAL FIX: Mark welcome messages as sent immediately to prevent loops
    try {
      await prisma.user.update({
        where: { id: updatedUser.id },
        data: {
          welcomeMessageSent: true,
          welcomeMessageSentAt: new Date()
        }
      });
      console.log(`✅ [Profile API] Marked welcomeMessageSent=true for ${updatedUser.email} to prevent duplicate sends`);
    } catch (updateError) {
      console.error(`❌ [Profile API] Failed to mark welcome messages as sent:`, updateError);
    }
    
    // Queue welcome messages asynchronously (only if not already sent)
    if (!updatedUser.welcomeMessageSent) {
      // Check if there's already a pending job for this user
      const pendingJobs = await jobQueue.getJobsByType(JobType.SEND_WELCOME_MESSAGES);
      const hasPendingJob = pendingJobs.some(job => 
        job.data.id === updatedUser.id && 
        (job.status === 'pending' || job.status === 'processing')
      );
      
      if (hasPendingJob) {
        console.log(`[Profile API] Welcome message job already pending for ${updatedUser.email}, skipping duplicate`);
      } else {
        const welcomeUser: WelcomeUser = {
          id: updatedUser.id,
          name: updatedUser.name || data.nickname || 'Friend',
          email: updatedUser.email,
          notificationPrefs: data.notificationPrefs || [],
          phone: data.phone,
          smsConsent: data.smsConsent === 'true' || data.smsConsent === true,
          therapyGoals: data.goals || data.currentConcerns,
          relationshipStatus: data.relationshipStatus,
          age: data.age ? parseInt(data.age) : undefined
        }
        
        await jobQueue.enqueue(JobType.SEND_WELCOME_MESSAGES, welcomeUser, { maxAttempts: 2 })
        console.log(`[Profile API] Queued welcome messages for ${updatedUser.email} with maxAttempts: 2`)
      }
    } else {
      console.log(`[Profile API] Welcome messages already sent for ${updatedUser.email}, skipping`)
    }
    
    return NextResponse.json({ 
      message: "Onboarding completed successfully",
      user: { id: updatedUser.id, email: updatedUser.email }
    })
    
  } catch (error) {
    console.error("[Profile API] Onboarding error:", error)
    return NextResponse.json({ error: "Failed to update onboarding" }, { status: 500 })
  }
}

// PUT handler for profile updates
export async function PUT(request: Request) {
  try {
    const session = await getAuthSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const userEmail = session.user.email
    const data = await request.json()
    
    console.log("[Profile API] PUT request data:", {
      email: userEmail,
      dataKeys: Object.keys(data),
      familyMemberFields: Object.keys(data).filter(key => key.startsWith('familyMember')),
      pronounsDebug: {
        received: data.pronouns,
        type: typeof data.pronouns,
        isDefined: data.pronouns !== undefined,
        isEmptyString: data.pronouns === "",
        isNull: data.pronouns === null
      },
      sampleData: {
        name: data.name,
        pronouns: data.pronouns,
        age: data.age,
        familyMember1: data.familyMember1,
        familyMember1Age: data.familyMember1Age,
        familyMember1Relation: data.familyMember1Relation
      }
    })

    // Validate the fields if they exist
    try {
      if (data.notificationPrefs !== undefined) {
        notificationPrefsSchema.parse(data.notificationPrefs);
      }
      if (data.preferredDays !== undefined) {
        preferredDaysSchema.parse(data.preferredDays);
      }
      if (data.currentConcerns !== undefined) {
        currentConcernsSchema.parse(data.currentConcerns);
      }
    } catch (error) {
      console.error('[Profile API] Validation error:', error);
      return NextResponse.json({ error: "Invalid profile data", details: error }, { status: 400 });
    }
    
    if (!data.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    
    // Track family members for debug output (declare outside transaction scope)
    let familyMembersCreatedCount = 0
    
    // Update with transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      // First check if user exists
      const existingUser = await tx.user.findUnique({
        where: { email: userEmail }
      })
      
      console.log("[Profile API] Existing user check:", {
        exists: !!existingUser,
        userId: existingUser?.id
      })
      
      if (!existingUser) {
        throw new Error(`User not found with email: ${userEmail}`)
      }
      
      const user = await tx.user.update({
        where: { email: userEmail },
        data: { name: data.name }
      })
      
      // Process notification preferences with proper handling
      const processedNotificationPrefs = (() => {
        if (!data.notificationPrefs) return 'email';
        if (typeof data.notificationPrefs === 'string') {
          if (data.notificationPrefs === 'both') return ['email', 'sms'];
          if (data.notificationPrefs === 'none') return [];
          return data.notificationPrefs;
        }
        return data.notificationPrefs;
      })();

      // Process phone with SMS consent logic
      let formattedPhone = null;
      let phoneValidated = false;
      let smsConsent = false;
      let smsConsentDate = null;

      if (data.phone) {
        try {
          formattedPhone = formatPhoneNumber(data.phone, 'US');
          phoneValidated = validatePhoneNumber(formattedPhone);
        } catch (error) {
          console.warn('Phone number validation failed:', error);
          formattedPhone = data.phone;
        }
        
        // Set SMS consent if notification prefs include SMS
        const hasSmsPref = Array.isArray(processedNotificationPrefs) 
          ? processedNotificationPrefs.includes('sms')
          : processedNotificationPrefs === 'sms';
        
        if (hasSmsPref && phoneValidated) {
          smsConsent = true;
          smsConsentDate = new Date();
        }
      }

      // Process preferred days properly
      const processedPreferredDays = (() => {
        if (!data.preferredDays) return null;
        if (typeof data.preferredDays === 'string') {
          try {
            return JSON.parse(data.preferredDays);
          } catch {
            return [data.preferredDays];
          }
        }
        return data.preferredDays;
      })();

      // Process current concerns properly  
      const processedCurrentConcerns = (() => {
        if (!data.currentConcerns) return null;
        if (typeof data.currentConcerns === 'string') {
          try {
            return JSON.parse(data.currentConcerns);
          } catch {
            return [data.currentConcerns];
          }
        }
        return data.currentConcerns;
      })();

      const upsertResult = await tx.userProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          pronouns: data.pronouns !== undefined ? (data.pronouns || null) : null,
          age: data.age ? parseInt(String(data.age)) : null,
          relationshipStatus: data.relationshipStatus !== undefined ? (data.relationshipStatus || null) : null,
          notificationPrefs: processedNotificationPrefs,
          partnerName: data.partnerName !== undefined ? (data.partnerName || null) : null,
          partnerAge: data.partnerAge ? parseInt(String(data.partnerAge)) : null,
          currentConcerns: processedCurrentConcerns,
          emergencyContact: data.emergencyContact !== undefined ? (data.emergencyContact || null) : null,
          sessionPreference: data.sessionPreference !== undefined ? (data.sessionPreference || null) : null,
          preferredDays: processedPreferredDays,
          sessionFrequency: data.sessionFrequency !== undefined ? (data.sessionFrequency || null) : null,
          recurringSession: data.recurringSession !== undefined ? (data.recurringSession || null) : null,
          reminderTiming: data.reminderTiming !== undefined ? (data.reminderTiming || null) : null,
          communicationStyle: data.communicationStyle !== undefined ? (data.communicationStyle || null) : null,
          additionalNotes: data.additionalNotes !== undefined ? (data.additionalNotes || null) : null,
          phone: formattedPhone,
          phoneValidated,
          smsConsent,
          smsConsentDate
        },
        update: {
          // CRITICAL FIX: Always update ALL fields that are sent from frontend
          // Empty strings should become null in database
          pronouns: data.pronouns || null,
          age: data.age ? parseInt(String(data.age)) : null,
          relationshipStatus: data.relationshipStatus || null,
          notificationPrefs: processedNotificationPrefs,
          partnerName: data.partnerName || null,
          partnerAge: data.partnerAge ? parseInt(String(data.partnerAge)) : null,
          currentConcerns: processedCurrentConcerns,
          emergencyContact: data.emergencyContact || null,
          sessionPreference: data.sessionPreference || null,
          preferredDays: processedPreferredDays,
          sessionFrequency: data.sessionFrequency || null,
          recurringSession: data.recurringSession || null,
          reminderTiming: data.reminderTiming || null,
          communicationStyle: data.communicationStyle || null,
          additionalNotes: data.additionalNotes || null,
          phone: formattedPhone,
          phoneValidated,
          smsConsent,
          smsConsentDate
        }
      })
      
      console.log(`[Profile API] Upsert result for user ${user.id}:`, {
        pronouns: upsertResult.pronouns,
        age: upsertResult.age,
        partnerName: upsertResult.partnerName,
        updatedAt: upsertResult.updatedAt
      })
      
      // Delete existing family members before recreating
      await tx.familyMember.deleteMany({
        where: { userId: user.id }
      })

      const familyMembersToCreate = []
      for (let i = 1; i <= 7; i++) {
        const memberName = data[`familyMember${i}`]
        const memberAge = data[`familyMember${i}Age`]
        const memberRelation = data[`familyMember${i}Relation`]

        // Only create family member if name is provided and not empty
        if (memberName && typeof memberName === 'string' && memberName.trim()) {
          familyMembersToCreate.push({
            userId: user.id,
            name: memberName.trim(),
            age: memberAge ? parseInt(String(memberAge)) : null,
            relationship: (memberRelation && typeof memberRelation === 'string') ? memberRelation.trim() : '',
            order: i - 1,
            isActive: true
          })
        }
      }

      if (familyMembersToCreate.length > 0) {
        await tx.familyMember.createMany({
          data: familyMembersToCreate
        })
      }

      // Store count for debug output
      familyMembersCreatedCount = familyMembersToCreate.length
      
      // Fetch the complete updated profile within the transaction to ensure consistency
      // Add small delay to ensure upsert is fully committed in the transaction
      const updatedUserWithProfile = await tx.user.findUnique({
        where: { id: user.id },
        include: {
          profile: true,
          familyMembers: {
            where: { isActive: true },
            orderBy: { order: 'asc' }
          }
        }
      })
      
      // Log what we're about to return
      console.log(`[Profile API] Transaction result - user ${user.id} profile:`, {
        pronouns: updatedUserWithProfile?.profile?.pronouns,
        age: updatedUserWithProfile?.profile?.age,
        partnerName: updatedUserWithProfile?.profile?.partnerName,
        hasProfile: !!updatedUserWithProfile?.profile
      })
      
      return updatedUserWithProfile
    })
    
    console.log(`[Profile API] Profile update transaction completed for user ${updatedUser.id}`)
    
    // CRITICAL: Invalidate ALL cache layers comprehensively BEFORE setting new cache
    try {
      // Clear ALL possible cache keys used by different parts of the system
      await Promise.all([
        // Clear the cache used by findUserByEmailOptimized in GET handler
        profileCache.invalidate(cacheKeys.userProfileByEmail(session.user.email)),
        // Clear user ID based cache
        updatedUser.id ? profileCache.invalidate(cacheKeys.userProfile(updatedUser.id)) : Promise.resolve(),
        // Clear any pattern-based caches
        profileCache.invalidatePattern(`profile:*${session.user.email}*`),
        profileCache.invalidatePattern(`profile:*${updatedUser.id}*`),
        // Also clear the optimized query cache key format
        profileCache.invalidate(`user:email:${session.user.email}`),
        profileCache.invalidate(`user:id:${updatedUser.id}`)
      ])
      console.log(`[Profile API] Cache invalidated successfully for all layers - email: ${session.user.email}, id: ${updatedUser.id}`)
    } catch (cacheError) {
      console.error(`[Profile API] Cache invalidation failed:`, cacheError)
      // Don't fail the request if cache invalidation fails
    }
    
    // Use the profile data from the transaction (already fetched)
    if (!updatedUser || !updatedUser.profile) {
      throw new Error('Failed to fetch updated profile from transaction')
    }
    
    // Build family member data for response
    const familyMemberData: any = {}
    for (let i = 1; i <= 7; i++) {
      const member = updatedUser.familyMembers[i - 1]
      familyMemberData[`familyMember${i}`] = member?.name || ""
      familyMemberData[`familyMember${i}Age`] = member?.age || null
      familyMemberData[`familyMember${i}Relation`] = member?.relationship || ""
    }
    
    // Build the complete profile response matching GET format
    const responseData = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name || "",
      pronouns: updatedUser.profile?.pronouns || "",
      age: updatedUser.profile?.age || null,
      partnerName: updatedUser.profile?.partnerName || "",
      partnerAge: updatedUser.profile?.partnerAge || null,
      relationshipStatus: updatedUser.profile?.relationshipStatus || "",
      ...familyMemberData,
      currentConcerns: updatedUser.profile?.currentConcerns || null,
      emergencyContact: updatedUser.profile?.emergencyContact || "",
      sessionPreference: updatedUser.profile?.sessionPreference || "",
      preferredDays: updatedUser.profile?.preferredDays || null,
      sessionFrequency: updatedUser.profile?.sessionFrequency || "",
      recurringSession: updatedUser.profile?.recurringSession || "",
      reminderTiming: updatedUser.profile?.reminderTiming || "",
      communicationStyle: updatedUser.profile?.communicationStyle || "",
      additionalNotes: updatedUser.profile?.additionalNotes || "",
      onboardingCompleted: updatedUser.onboardingCompleted || false,
      onboardingData: updatedUser.onboardingData || null,
      phone: updatedUser.profile?.phone || "",
      notificationPrefs: updatedUser.profile?.notificationPrefs || "email",
      hasSeenIntro: updatedUser.hasSeenIntro || false
    }
    
    // Cache the updated response
    const cacheKey = cacheKeys.userProfileByEmail(session.user.email)
    await profileCache.set(cacheKey, responseData)
    
    console.log(`[Profile API] Returning updated profile data for ${session.user.email}:`, {
      pronouns: responseData.pronouns,
      age: responseData.age,
      partnerName: responseData.partnerName,
      familyMember1: responseData.familyMember1
    })
    
    return NextResponse.json(responseData)
    
  } catch (error) {
    console.error("[Profile API] Update error:", error)
    console.error("[Profile API] Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: (error as any)?.code,
      meta: (error as any)?.meta
    })
    
    // Return more detailed error information
    const errorMessage = error instanceof Error ? error.message : "Failed to update profile"
    const errorDetails = {
      error: errorMessage,
      code: (error as any)?.code,
      // Include Prisma-specific error info if available
      meta: (error as any)?.meta,
      // Only include stack in development
      ...(process.env.NODE_ENV === 'development' && {
        stack: error instanceof Error ? error.stack : undefined
      })
    }
    
    return NextResponse.json(errorDetails, { status: 500 })
  }
}