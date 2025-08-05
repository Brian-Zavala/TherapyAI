// Optimized profile API with caching and async operations
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
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

// GET handler with caching
export async function GET(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Use optimized query that handles caching internally
    const user = await findUserByEmailOptimized(session.user.email)
    
    if (!user) {
      // User not found - stale session, return 401 to force re-authentication
      console.log(`[Profile API] User not found for ${session.user.email} - stale session`)
      return NextResponse.json({ 
        error: "User not found - please log in again",
        code: "STALE_SESSION" 
      }, { status: 401 })
    }
    
    // Transform data for response
    const profile = user.profile
    const familyMembers = user.familyMembers || []
    
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
    
    // Cache the response
    const cacheKey = cacheKeys.userProfileByEmail(session.user.email)
    await profileCache.set(cacheKey, responseData)
    
    console.log(`[Profile API] Fetched profile for ${session.user.email} (${Date.now() - startTime}ms)`)
    return NextResponse.json(responseData, { headers: CACHE_HEADERS })
    
  } catch (error) {
    console.error("[Profile API] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch profile" }, 
      { status: 500 }
    )
  }
}

// PATCH handler for onboarding updates
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
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
      
      // Update family members - Delete existing first
      await tx.familyMember.deleteMany({
        where: { userId: user.id }
      })
      
      const familyMembersToCreate = []
      for (let i = 1; i <= 7; i++) {
        const memberName = data[`familyMember${i}`]
        const memberAge = data[`familyMember${i}Age`]
        const memberRelation = data[`familyMember${i}Relation`]
        
        console.log(`[Profile API] Processing family member ${i}:`, {
          name: memberName,
          age: memberAge,
          relation: memberRelation
        })
        
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
      
      console.log(`[Profile API] Creating ${familyMembersToCreate.length} family members for user ${user.id}:`, familyMembersToCreate)
      
      if (familyMembersToCreate.length > 0) {
        await tx.familyMember.createMany({
          data: familyMembersToCreate
        })
      }
      
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const userEmail = session.user.email
    const data = await request.json()
    
    console.log("[Profile API] PUT request data:", {
      email: userEmail,
      dataKeys: Object.keys(data),
      familyMemberFields: Object.keys(data).filter(key => key.startsWith('familyMember')),
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

      await tx.userProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
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
        },
        update: {
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
      
      // Update family members - Delete existing first
      await tx.familyMember.deleteMany({
        where: { userId: user.id }
      })
      
      const familyMembersToCreate = []
      for (let i = 1; i <= 7; i++) {
        const memberName = data[`familyMember${i}`]
        const memberAge = data[`familyMember${i}Age`]
        const memberRelation = data[`familyMember${i}Relation`]
        
        console.log(`[Profile API] Processing family member ${i}:`, {
          name: memberName,
          age: memberAge,
          relation: memberRelation
        })
        
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
      
      console.log(`[Profile API] Creating ${familyMembersToCreate.length} family members for user ${user.id}:`, familyMembersToCreate)
      
      if (familyMembersToCreate.length > 0) {
        await tx.familyMember.createMany({
          data: familyMembersToCreate
        })
      }
      
      return user
    })
    
    console.log(`[Profile API] Profile update transaction completed for user ${updatedUser.id}`)
    
    // Invalidate cache comprehensively
    try {
      await Promise.all([
        profileCache.invalidate(cacheKeys.userProfileByEmail(session.user.email)),
        updatedUser.id ? profileCache.invalidate(cacheKeys.userProfile(updatedUser.id)) : Promise.resolve(),
        // Also invalidate pattern to clear any related cache entries
        profileCache.invalidatePattern(`profile:*${session.user.email}*`)
      ])
      console.log(`[Profile API] Cache invalidated successfully for ${session.user.email}`)
    } catch (cacheError) {
      console.error(`[Profile API] Cache invalidation failed:`, cacheError)
      // Don't fail the request if cache invalidation fails
    }
    
    return NextResponse.json({ 
      message: "Profile updated successfully",
      user: { id: updatedUser.id, email: updatedUser.email },
      debug: process.env.NODE_ENV === 'development' ? {
        processedFields: Object.keys(data),
        familyMembersCreated: familyMembersToCreate?.length || 0
      } : undefined
    })
    
  } catch (error) {
    console.error("[Profile API] Update error:", error)
    console.error("[Profile API] Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: (error as any)?.code,
      meta: (error as any)?.meta
    })
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}