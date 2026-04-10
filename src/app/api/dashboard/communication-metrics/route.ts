import { getAuthSession } from '@/lib/auth'
// src/app/api/dashboard/communication-metrics/route.ts
import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma-optimized';
import { 
  handleDashboardError, 
  validateDashboardAuth,
  withRetry,
  DashboardError,
  DashboardErrorCode
} from '@/lib/api/dashboard-error-handler';
import { dashboardCache, cacheKeys } from '@/lib/cache/dashboard-cache';
import { performanceMonitor } from '@/lib/performance/monitoring';
import { findUserByEmailOptimized } from '@/lib/database/optimized-user-queries';

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

export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const therapyType = searchParams.get('type') || 'couple';

    // Use cached session to reduce auth overhead
    const session = await getAuthSession();
    const { email } = await validateDashboardAuth(session);

    // Find the user in the database using optimized query with caching
    const userResult = await findUserByEmailOptimized(email);
    const user = userResult ? { id: userResult.id } : null;

    if (!user) {
      throw new DashboardError(
        DashboardErrorCode.RECORD_NOT_FOUND,
        'User not found in database',
        404
      );
    }
    
    // Try cache first with therapy type
    const cacheKey = cacheKeys.communicationMetrics(user.id, therapyType);
    const cached = await dashboardCache.get(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      console.log(`[CommunicationMetrics] Cache hit for ${therapyType}, returned in ${duration}ms`);
      performanceMonitor.trackApiCall('/api/dashboard/communication-metrics', duration, user.id, { cacheHit: true, therapyType });
      return NextResponse.json(cached);
    }
    
    // CRITICAL FIX: Use sessionType for accurate filtering with proper enum conversion
    const sessionTypeValue = therapyTypeToPrismaEnum(therapyType);

    // Get the 3 most recent completed sessions for this therapy type with retry and proper filtering
    const recentSessions = await withRetry(
      () => prisma.session.findMany({
        where: {
          userId: user.id,
          status: 'COMPLETED',
          sessionType: sessionTypeValue
        },
        orderBy: {
          date: 'desc'
        },
        take: 3,
        select: {
          id: true,
          duration: true,
          date: true,
          theme: true,
          sessionType: true
        }
      })
    );

    // Get transcript entries for recent sessions with error handling
    let transcriptAnalysis = null;
    if (recentSessions.length > 0) {
      try {
        const sessionIds = recentSessions.map(s => s.id);
        const transcriptEntries = await withRetry(
          () => prisma.transcriptEntry.findMany({
            where: {
              sessionId: { in: sessionIds }
            },
            orderBy: {
              timestamp: 'asc'
            },
            select: {
              speaker: true,
              text: true
            }
          })
        );
        
        if (transcriptEntries.length > 0) {
          try {
            // Import the analysis function from metrics-helper
            const { analyzeTranscriptForMetrics } = await import('@/app/api/sessions/[id]/metrics-helper');
            
            // Combine transcript entries into a single transcript
            const combinedTranscript = transcriptEntries
              .map(entry => `${entry.speaker}: ${entry.text}`)
              .join('\n');
            
            // Analyze the transcripts with error handling
            const avgDuration = recentSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / recentSessions.length;
            transcriptAnalysis = analyzeTranscriptForMetrics(combinedTranscript, 70, 5, therapyType);
          } catch (analysisError) {
            console.warn(`[CommunicationMetrics] Transcript analysis failed for ${therapyType}:`, analysisError);
            // Continue without transcript analysis rather than failing the entire request
          }
        }
      } catch (transcriptError) {
        console.warn(`[CommunicationMetrics] Transcript fetch failed for ${therapyType}:`, transcriptError);
        // Continue without transcript data rather than failing the entire request
      }
    }

    // CRITICAL FIX: Get communication metrics filtered by session therapy type
    const metrics = await withRetry(
      () => prisma.communicationMetric.findFirst({
        where: {
          userId: user.id,
          sessionId: { not: null }, // CRITICAL: Only include metrics with valid session links
          metricType: { not: 'real-time' }, // Only get final calculated metrics
          session: {
            sessionType: sessionTypeValue // CRITICAL: Filter by the actual session therapy type
          }
        },
        orderBy: {
          calculatedAt: 'desc'
        }
      })
    );
    
    let responseData;
    
    // If we have transcript analysis, use it to influence the most recent metrics
    if (transcriptAnalysis && metrics) {
      // Create a weighted blend: 70% from metrics, 30% from recent transcript analysis
      const blendedMetrics = {
        listening: Math.round((metrics.listening || 0) * 0.7 + transcriptAnalysis.activeListeningScore * 0.3),
        expression: Math.round((metrics.expression || 0) * 0.7 + transcriptAnalysis.expressingNeedsScore * 0.3),
        respect: Math.round((metrics.respect || 0) * 0.7 + transcriptAnalysis.conflictResolutionScore * 0.3),
        empathy: Math.round((metrics.empathy || 0) * 0.7 + transcriptAnalysis.emotionalSupportScore * 0.3)
      };
      
      // Return the blended metrics
      responseData = [
        { name: "Active Listening", value: blendedMetrics.listening },
        { name: "Expressing Needs", value: blendedMetrics.expression },
        { name: "Conflict Resolution", value: blendedMetrics.respect },
        { name: "Emotional Support", value: blendedMetrics.empathy }
      ];
    } else if (!metrics) {
      // If no metrics found, check if there are completed sessions
      const completedSessionsCount = await withRetry(
        () => prisma.session.count({
          where: {
            userId: user.id,
            status: 'COMPLETED',
            sessionType: sessionTypeValue
          }
        })
      );
      
      // If there are no completed sessions, return empty state with 0 values
      if (completedSessionsCount === 0) {
        const emptyMetrics = therapyType === 'solo' ? [
          { name: "Self-awareness", value: 0 },
          { name: "Emotional Regulation", value: 0 },
          { name: "Personal Growth", value: 0 },
          { name: "Coping Skills", value: 0 }
        ] : therapyType === 'family' ? [
          { name: "Family Communication", value: 0 },
          { name: "Role Definition", value: 0 },
          { name: "Conflict Management", value: 0 },
          { name: "Family Bonding", value: 0 }
        ] : [
          { name: "Active Listening", value: 0 },
          { name: "Expressing Needs", value: 0 },
          { name: "Conflict Resolution", value: 0 },
          { name: "Emotional Support", value: 0 }
        ];
        
        responseData = { 
          metrics: emptyMetrics, 
          isEmpty: true, 
          message: "Complete your first session to see communication metrics" 
        };
      } else {
        // If there are completed sessions but no stored metrics, 
        // we still return empty state since we want real data only
        const emptyMetrics = therapyType === 'solo' ? [
          { name: "Self-awareness", value: 0 },
          { name: "Emotional Regulation", value: 0 },
          { name: "Personal Growth", value: 0 },
          { name: "Coping Skills", value: 0 }
        ] : therapyType === 'family' ? [
          { name: "Family Communication", value: 0 },
          { name: "Role Definition", value: 0 },
          { name: "Conflict Management", value: 0 },
          { name: "Family Bonding", value: 0 }
        ] : [
          { name: "Active Listening", value: 0 },
          { name: "Expressing Needs", value: 0 },
          { name: "Conflict Resolution", value: 0 },
          { name: "Emotional Support", value: 0 }
        ];
        
        responseData = { 
          metrics: emptyMetrics, 
          isEmpty: true, 
          message: "Complete a session with conversation to see detailed metrics" 
        };
      }
    } else {
      // Use existing metrics from database
      if (therapyType === 'solo') {
        responseData = [
          { name: "Self-awareness", value: metrics.listening || 0 },
          { name: "Emotional Regulation", value: metrics.expression || 0 },
          { name: "Personal Growth", value: metrics.respect || 0 },
          { name: "Coping Skills", value: metrics.empathy || 0 }
        ];
      } else if (therapyType === 'family') {
        responseData = [
          { name: "Family Communication", value: metrics.listening || 0 },
          { name: "Role Definition", value: metrics.expression || 0 },
          { name: "Conflict Management", value: metrics.respect || 0 },
          { name: "Family Bonding", value: metrics.empathy || 0 }
        ];
      } else {
        // Default 'couple' metrics
        responseData = [
          { name: "Active Listening", value: metrics.listening || 0 },
          { name: "Expressing Needs", value: metrics.expression || 0 },
          { name: "Conflict Resolution", value: metrics.respect || 0 },
          { name: "Emotional Support", value: metrics.empathy || 0 }
        ];
      }
    }
    
    // Cache the response
    await dashboardCache.set(cacheKey, responseData);
    
    const duration = Date.now() - startTime;
    console.log(`[CommunicationMetrics] Query completed for ${therapyType} in ${duration}ms`);
    performanceMonitor.trackApiCall('/api/dashboard/communication-metrics', duration, user.id, { cacheHit: false, therapyType });
    
    // Log slow queries for monitoring
    if (duration > 500) {
      console.warn(`[CommunicationMetrics] Slow query detected: ${duration}ms`, {
        userId: user.id,
        therapyType,
      });
    }
    
    return NextResponse.json(responseData);
  } catch (error) {
    const duration = Date.now() - startTime;
    performanceMonitor.trackApiCall('/api/dashboard/communication-metrics', duration, undefined, { error: true });
    
    return handleDashboardError(error, {
      route: '/api/dashboard/communication-metrics',
      userId: (await getAuthSession())?.user?.id,
      action: 'fetchCommunicationMetrics',
    });
  }
}