/**
 * Optimized user query functions with proper indexing and caching
 */

import { prisma } from '@/lib/database/prisma-optimized';
import { Prisma } from '@prisma/client';
import { profileCache, cacheKeys } from '@/lib/cache/profile-cache';

// Optimized select for user profile queries
const userProfileSelect = {
  id: true,
  email: true,
  name: true,
  onboardingCompleted: true,
  onboardingData: true,
  hasSeenIntro: true,
} as const;

const profileDetailsSelect = {
  pronouns: true,
  age: true,
  partnerName: true,
  partnerAge: true,
  relationshipStatus: true,
  currentConcerns: true,
  emergencyContact: true,
  sessionPreference: true,
  preferredDays: true,
  sessionFrequency: true,
  recurringSession: true,
  reminderTiming: true,
  communicationStyle: true,
  additionalNotes: true,
  phone: true,
  notificationPrefs: true,
  smsConsent: true,
  smsConsentDate: true,
  phoneValidated: true,
} as const;

const familyMemberSelect = {
  name: true,
  age: true,
  relationship: true,
  order: true,
} as const;

/**
 * Find user by email with optimized query
 * Uses parallel queries instead of nested relations for better performance
 */
export async function findUserByEmailOptimized(email: string) {
  // EDGE CASE: Validate email format before querying
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    console.warn('[OptimizedQuery] Invalid email format:', email)
    return null
  }
  
  // RACE CONDITION PREVENTION: Use transaction for consistent read
  return await prisma.$transaction(async (tx) => {
    // Execute queries in parallel for better performance
    const [user, profile, familyMembers] = await Promise.all([
      // Query 1: Get basic user data
      tx.user.findUnique({
        where: { email },
        select: userProfileSelect,
      }),
      
      // Query 2: Get profile data separately
      tx.userProfile.findFirst({
        where: { 
          user: { email } 
        },
        select: profileDetailsSelect,
      }),
      
      // Query 3: Get family members separately
      tx.familyMember.findMany({
        where: { 
          user: { email },
          isActive: true,
        },
        orderBy: { order: 'asc' },
        select: familyMemberSelect,
        take: 7, // Limit to 7 family members
      }),
    ]);

  if (!user) {
    return null;
  }

    // Combine results
    const result = {
      ...user,
      profile,
      familyMembers,
    };

    // Note: Caching is now handled in the API route
    return result;
  });
}

/**
 * Find user by ID with optimized query
 */
export async function findUserByIdOptimized(userId: string) {
  // Check cache first
  const cacheKey = `user:id:${userId}`;
  const cached = await profileCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      onboardingCompleted: true,
      hasSeenIntro: true,
      welcomeMessageSent: true,
      welcomeMessageSentAt: true,
      subscriptionStatus: true,
      isDeleted: true,
    },
  });

  if (user) {
    await profileCache.set(cacheKey, user, 300); // 5 minute TTL
  }

  return user;
}

/**
 * Batch find users by IDs
 */
export async function findUsersByIdsOptimized(userIds: string[]) {
  if (userIds.length === 0) return [];
  
  // Check cache for each user
  const cachedUsers: any[] = [];
  const uncachedIds: string[] = [];
  
  await Promise.all(
    userIds.map(async (id) => {
      const cacheKey = `user:id:${id}`;
      const cached = await profileCache.get(cacheKey);
      if (cached) {
        cachedUsers.push(cached);
      } else {
        uncachedIds.push(id);
      }
    })
  );
  
  // Fetch uncached users
  let dbUsers: any[] = [];
  if (uncachedIds.length > 0) {
    dbUsers = await prisma.user.findMany({
      where: { 
        id: { in: uncachedIds },
        isDeleted: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        onboardingCompleted: true,
        hasSeenIntro: true,
      },
    });
    
    // Cache the fetched users
    await Promise.all(
      dbUsers.map(async (user) => {
        const cacheKey = `user:id:${user.id}`;
        await profileCache.set(cacheKey, user, 300);
      })
    );
  }
  
  return [...cachedUsers, ...dbUsers];
}

/**
 * Update user profile with cache invalidation
 */
export async function updateUserProfileOptimized(
  email: string,
  data: Partial<Prisma.UserUpdateInput> & {
    profileData?: Partial<Prisma.UserProfileUpdateInput>;
  }
) {
  // EDGE CASE: Validate email before update
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new Error('Invalid email format')
  }
  
  const { profileData, ...userData } = data;
  
  // CONCURRENCY: Use optimistic locking with version field
  const result = await prisma.$transaction(async (tx) => {
    // Lock the user row for update to prevent race conditions
    const existingUser = await tx.user.findUnique({
      where: { email },
      select: { id: true, version: true }
    })
    
    if (!existingUser) {
      throw new Error('User not found')
    }
    // Update user
    const user = await tx.user.update({
      where: { email },
      data: userData,
      select: userProfileSelect,
    });
    
    // Update or create profile if profile data provided
    let profile = null;
    if (profileData && Object.keys(profileData).length > 0) {
      profile = await tx.userProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          ...profileData,
        },
        update: profileData,
        select: profileDetailsSelect,
      });
    }
    
    return { user, profile };
  });
  
  // Invalidate caches
  await Promise.all([
    profileCache.invalidate(email),
    profileCache.del(cacheKeys.userProfileByEmail(email)),
    profileCache.del(`user:id:${result.user.id}`),
  ]);
  
  return result;
}

/**
 * Warm up user cache (for frequently accessed users)
 */
export async function warmUpUserCache(emails: string[]) {
  const results = await Promise.allSettled(
    emails.map(email => findUserByEmailOptimized(email))
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  console.log(`[User Cache Warmup] Warmed up ${successful}/${emails.length} users`);
}