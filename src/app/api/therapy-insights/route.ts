import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-optimized'
import { generateDynamicTherapyInsights } from '@/lib/ai-insights/dynamic-insights-service'
import { realTimeInsightsProcessor } from '@/lib/ai-insights/real-time-insights-processor'
import { 
  handleDashboardError, 
  validateDashboardAuth,
  withRetry 
} from '@/lib/api/dashboard-error-handler'
import { logger } from '@/lib/logger'
import { dashboardCache, cacheKeys } from '@/lib/cache/dashboard-cache'
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
    // Get therapy type and session ID from query parameters
    const { searchParams } = new URL(request.url);
    const therapyType = searchParams.get('type') || 'solo';
    const activeSessionId = searchParams.get('sessionId');
    const sessionTypeValue = therapyTypeToPrismaEnum(therapyType);
    
    // Use cached session to reduce auth overhead
    const session = await getAuthSession()
    const { userId } = await validateDashboardAuth(session)
    
    // Check if there's an active session with real-time insights
    if (activeSessionId) {
      const realtimeInsights = await realTimeInsightsProcessor.getCurrentInsights(activeSessionId);
      if (realtimeInsights && realtimeInsights.length > 0) {
        const duration = Date.now() - startTime;
        logger.info('Real-time insights retrieved', { 
          userId, 
          therapyType, 
          sessionId: activeSessionId, 
          insightCount: realtimeInsights.length,
          duration 
        });
        
        performanceMonitor.trackApiCall('/api/therapy-insights', duration, userId, { 
          realTime: true, 
          therapyType,
          sessionId: activeSessionId 
        });
        
        return NextResponse.json({
          insights: realtimeInsights,
          isRealTime: true,
          sessionId: activeSessionId,
          therapyType,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Try cache for historical insights when no active session
    const cacheKey = `${cacheKeys.insights(userId)}_${therapyType}`
    const cached = await dashboardCache.get(cacheKey)
    if (cached && !activeSessionId) {
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
      userId: (await getAuthSession())?.user?.id,
      error: error instanceof Error ? error.message : error,
      duration
    })
    
    return handleDashboardError(error, {
      route: '/api/therapy-insights',
      userId: (await getAuthSession())?.user?.id,
      action: 'generateDynamicInsights',
    })
  }
}