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

// Utility to convert frontend therapy type to Prisma enum for filtering
function therapyTypeToPrismaEnum(therapyType: string): 'SOLO' | 'COUPLE' | 'FAMILY' {
  switch (therapyType.toLowerCase()) {
    case 'solo': 
    case 'individual':
      return 'SOLO';
    case 'couple':
      return 'COUPLE';  
    case 'family':
      return 'FAMILY';
    default:
      return 'SOLO';
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Get therapy type from query parameters
    const { searchParams } = new URL(request.url);
    const therapyType = searchParams.get('type') || 'solo';
    const sessionTypeValue = therapyTypeToPrismaEnum(therapyType);
    
    // Use cached session to reduce auth overhead
    const session = await getCachedSession(request)
    const { userId } = await validateDashboardAuth(session)
    
    // Try cache first - insights have longer TTL since they don't change frequently
    // Include therapy type in cache key for therapy-specific caching
    const cacheKey = `${cacheKeys.insights(userId)}_${therapyType}`
    const cached = await dashboardCache.get(cacheKey)
    if (cached) {
      const duration = Date.now() - startTime
      logger.info('Therapy insights cache hit', { userId, therapyType, duration })
      performanceMonitor.trackApiCall('/api/therapy-insights', duration, userId, { cacheHit: true, therapyType })
      return NextResponse.json(cached)
    }
    
    logger.info('Generating dynamic therapy insights', { userId, therapyType })
    
    // CRITICAL FIX: Fetch user's recent therapy sessions filtered by therapy type
    const recentSessions = await withRetry(
      () => prisma.session.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          sessionType: sessionTypeValue, // CRITICAL: Filter by specific therapy type
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
      therapyType,
      sessionCount: recentSessions.length,
      insightCount: insights.insights?.length || 0,
      hasPersonalizedTips: !!insights.personalizedTips?.daily?.length,
      duration
    })
    
    performanceMonitor.trackApiCall('/api/therapy-insights', duration, userId, { cacheHit: false, therapyType })
    
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