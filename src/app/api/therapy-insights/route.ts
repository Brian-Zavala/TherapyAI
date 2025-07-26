import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma-optimized'
import { generateDynamicTherapyInsights } from '@/lib/ai-insights/dynamic-insights-service'
import { 
  handleDashboardError, 
  validateDashboardAuth,
  withRetry 
} from '@/lib/api/dashboard-error-handler'
import { logger } from '@/lib/logger'
import { dashboardCache, cacheKeys } from '@/lib/cache/dashboard-cache'
import { getCachedSession } from '@/lib/auth/session-cache'
import { performanceMonitor } from '@/lib/performance/monitoring'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Use cached session to reduce auth overhead
    const session = await getCachedSession(request)
    const { userId } = await validateDashboardAuth(session)
    
    // Try cache first - insights have longer TTL since they don't change frequently
    const cacheKey = cacheKeys.insights(userId)
    const cached = await dashboardCache.get(cacheKey)
    if (cached) {
      const duration = Date.now() - startTime
      logger.info('Therapy insights cache hit', { userId, duration })
      performanceMonitor.trackApiCall('/api/therapy-insights', duration, userId, { cacheHit: true })
      return NextResponse.json(cached)
    }
    
    logger.info('Generating dynamic therapy insights', { userId })
    
    // Fetch user's recent therapy sessions with retry
    const recentSessions = await withRetry(
      () => prisma.session.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          // Only include sessions with meaningful conversation time
          conversationTimeSeconds: { gt: 60 }
        },
        orderBy: {
          startTime: 'desc',
        },
        take: 10,
        include: {
          communicationMetrics: {
            where: {
              metricType: 'final',
            },
            select: {
              listening: true,
              expression: true,
              respect: true,
              empathy: true,
              overall: true,
              confidence: true,
            }
          },
          transcriptEntries: {
            select: {
              speaker: true,
              text: true,
              timestamp: true,
              sentiment: true,
              topics: true,
            },
            orderBy: {
              timestamp: 'asc'
            },
            take: 100 // Limit transcript entries per session to manage memory
          },
          sessionFamilyMembers: {
            include: {
              familyMember: {
                select: {
                  name: true,
                  relationship: true
                }
              },
            },
          },
        },
      })
    )
    
    // Fetch user profile for personalization with retry
    const userProfile = await withRetry(
      () => prisma.userProfile.findUnique({
        where: {
          userId,
        },
        select: {
          pronouns: true,
          age: true,
          partnerName: true,
          partnerAge: true,
          relationshipStatus: true,
          currentConcerns: true,
          communicationStyle: true,
          sessionPreference: true,
          user: {
            select: {
              name: true,
              email: true,
              sessions: {
                where: { status: 'COMPLETED' },
                select: {
                  id: true,
                  conversationTimeSeconds: true,
                  startTime: true
                },
                orderBy: {
                  startTime: 'desc'
                },
                take: 20
              }
            }
          }
        }
      })
    )
    
    // Generate dynamic insights based on actual VAPI session data
    const insights = await generateDynamicTherapyInsights({
      sessions: recentSessions,
      userProfile,
      userId,
    })
    
    // Cache the insights with longer TTL (5 minutes default)
    await dashboardCache.set(cacheKey, insights)
    
    const duration = Date.now() - startTime
    logger.info('Successfully generated dynamic insights', { 
      userId,
      insightCount: insights.insights?.length || 0,
      hasPersonalizedTips: !!insights.personalizedTips?.daily?.length,
      duration
    })
    
    performanceMonitor.trackApiCall('/api/therapy-insights', duration, userId, { cacheHit: false })
    
    // Log slow generation
    if (duration > 3000) {
      logger.warn('Slow therapy insights generation', {
        userId,
        duration,
        sessionCount: recentSessions.length
      })
    }
    
    return NextResponse.json(insights)
    
  } catch (error) {
    const duration = Date.now() - startTime
    performanceMonitor.trackApiCall('/api/therapy-insights', duration, undefined, { error: true })
    
    logger.error('Failed to generate dynamic therapy insights', { 
      userId: (await getServerSession(authOptions))?.user?.id,
      error: error instanceof Error ? error.message : error,
      duration
    })
    
    return handleDashboardError(error, {
      route: '/api/therapy-insights',
      userId: (await getServerSession(authOptions))?.user?.id,
      action: 'generateDynamicInsights',
    })
  }
}