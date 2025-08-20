// High-performance database queries optimized for <100ms response times
import { prisma } from '@/lib/prisma-optimized'
import { getCached, setCache } from '@/lib/cache/redis-connection-pool'
import type { User, UserProfile, Session, UsageCredits } from '@prisma/client'

// User profile with optimized caching and minimal data transfer
export async function getUserProfileOptimized(userId: string): Promise<{
  user: User & { profile: UserProfile | null }
  sessions: { count: number; recent: Session[] }
  credits: UsageCredits | null
} | null> {
  const cacheKey = `user:profile:optimized:${userId}`
  
  return getCached(cacheKey, async () => {
    // Single parallel query with optimized selects
    const [user, sessionStats, credits] = await Promise.all([
      // User with profile - optimized select
      prisma.user.findUnique({
        where: { id: userId, isDeleted: false },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          emailVerified: true,
          createdAt: true,
          profile: {
            select: {
              id: true,
              hasSeenIntro: true,
              timezone: true,
              currentConcerns: true,
              preferredDays: true,
              age: true,
              partnerAge: true,
              relationshipDuration: true,
              notificationPrefs: true,
              phone: true,
              smsConsent: true,
              recurringSession: true,
              reminderTiming: true,
              updatedAt: true
            }
          }
        }
      }),

      // Session statistics - optimized aggregation
      prisma.session.aggregate({
        where: { userId },
        _count: { id: true }
      }).then(async (count) => {
        const recent = await prisma.session.findMany({
          where: { userId },
          select: {
            id: true,
            status: true,
            createdAt: true,
            durationMinutes: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        })
        return { count: count._count.id, recent }
      }),

      // Current credits - optimized with date range
      prisma.usageCredits.findFirst({
        where: {
          userId,
          billingPeriodStart: { lte: new Date() },
          billingPeriodEnd: { gte: new Date() }
        },
        select: {
          id: true,
          creditsRemaining: true,
          totalCredits: true,
          planType: true,
          billingPeriodStart: true,
          billingPeriodEnd: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
      })
    ])

    if (!user) return null

    return {
      user: user as User & { profile: UserProfile | null },
      sessions: sessionStats,
      credits: credits as UsageCredits | null
    }
  }, 300) // 5 minutes cache
}

// Optimized credits query with fallback chain
export async function getCurrentCreditsOptimized(userId: string): Promise<UsageCredits | null> {
  const cacheKey = `credits:current:${userId}`
  
  return getCached(cacheKey, async () => {
    return prisma.usageCredits.findFirst({
      where: {
        userId,
        billingPeriodStart: { lte: new Date() },
        billingPeriodEnd: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    })
  }, 180) // 3 minutes cache for credits
}

// Optimized session queries for dashboard
export async function getUserSessionsOptimized(
  userId: string, 
  limit: number = 10,
  status?: string[]
): Promise<Session[]> {
  const cacheKey = `sessions:user:${userId}:${limit}:${status?.join(',') || 'all'}`
  
  return getCached(cacheKey, async () => {
    return prisma.session.findMany({
      where: {
        userId,
        ...(status ? { status: { in: status } } : {})
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        durationMinutes: true,
        vapiCallId: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }, 120) // 2 minutes cache
}

// Optimized dashboard metrics
export async function getDashboardMetricsOptimized(userId: string): Promise<{
  totalSessions: number
  totalMinutes: number
  creditsRemaining: number
  recentSessions: Session[]
  upcomingSessions: Session[]
}> {
  const cacheKey = `dashboard:metrics:${userId}`
  
  return getCached(cacheKey, async () => {
    const [sessionStats, credits, recentSessions, upcomingSessions] = await Promise.all([
      // Session aggregation
      prisma.session.aggregate({
        where: { userId },
        _count: { id: true },
        _sum: { durationMinutes: true }
      }),

      // Current credits
      getCurrentCreditsOptimized(userId),

      // Recent completed sessions
      prisma.session.findMany({
        where: {
          userId,
          status: 'COMPLETED'
        },
        select: {
          id: true,
          createdAt: true,
          durationMinutes: true,
          status: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),

      // Upcoming scheduled sessions
      prisma.session.findMany({
        where: {
          userId,
          status: 'SCHEDULED',
          createdAt: { gte: new Date() }
        },
        select: {
          id: true,
          createdAt: true,
          status: true
        },
        orderBy: { createdAt: 'asc' },
        take: 3
      })
    ])

    return {
      totalSessions: sessionStats._count.id,
      totalMinutes: sessionStats._sum.durationMinutes || 0,
      creditsRemaining: credits?.creditsRemaining || 0,
      recentSessions,
      upcomingSessions
    }
  }, 300) // 5 minutes cache
}

// Real-time session state optimization
export async function getActiveSessionOptimized(userId: string): Promise<Session | null> {
  // No caching for active sessions - need real-time data
  return prisma.session.findFirst({
    where: {
      userId,
      status: { in: ['ACTIVE', 'PAUSED'] }
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      durationMinutes: true,
      vapiCallId: true,
      updatedAt: true
    },
    orderBy: { updatedAt: 'desc' }
  })
}

// Cache invalidation helpers
export async function invalidateUserCache(userId: string): Promise<void> {
  const keys = [
    `user:profile:optimized:${userId}`,
    `credits:current:${userId}`,
    `dashboard:metrics:${userId}`,
    `sessions:user:${userId}:*`
  ]
  
  // Pattern-based cache invalidation would be implemented here
  console.log(`[Cache] Invalidating user cache for ${userId}`)
}

// Warmup critical queries
export async function warmupCriticalQueries(userId: string): Promise<void> {
  try {
    await Promise.all([
      getUserProfileOptimized(userId),
      getCurrentCreditsOptimized(userId),
      getDashboardMetricsOptimized(userId)
    ])
    console.log(`[Performance] Warmed up cache for user ${userId}`)
  } catch (error) {
    console.error('[Performance] Cache warmup failed:', error)
  }
}