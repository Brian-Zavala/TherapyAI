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

    // Run independent queries in parallel: recentSessions + communicationMetric
    const [recentSessions, metrics] = await Promise.all([
      // Get the 3 most recent completed sessions for this therapy type with retry and proper filtering
      withRetry(
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
      ),
      // CRITICAL FIX: Get communication metrics filtered by session therapy type
      withRetry(
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
      )
    ]);

    // Sequential: Get transcript entries for recent sessions (depends on recentSessions)
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
    
    // Detect if stored metrics are all-zero (legacy bad data from therapyType bug)
    const metricsAreAllZero = metrics &&
      !metrics.listening && !metrics.expression && !metrics.respect && !metrics.empathy

    // Treat all-zero DB records the same as "no metrics" so we fall back to transcript analysis
    const effectiveMetrics = metricsAreAllZero ? null : metrics

    let responseData;

    // Build metric names based on therapy type (used in multiple branches below)
    const metricNames = therapyType === 'solo'
      ? ['Self-awareness', 'Emotional Regulation', 'Personal Growth', 'Coping Skills']
      : therapyType === 'family'
        ? ['Family Communication', 'Role Definition', 'Conflict Management', 'Family Bonding']
        : ['Active Listening', 'Expressing Needs', 'Conflict Resolution', 'Emotional Support']

    const transcriptScores = transcriptAnalysis
      ? [
          transcriptAnalysis.activeListeningScore,
          transcriptAnalysis.expressingNeedsScore,
          transcriptAnalysis.conflictResolutionScore,
          transcriptAnalysis.emotionalSupportScore,
        ]
      : null

    if (transcriptAnalysis && effectiveMetrics) {
      // Blend: 70% stored metrics + 30% live transcript analysis
      const dbScores = [
        effectiveMetrics.listening || 0,
        effectiveMetrics.expression || 0,
        effectiveMetrics.respect || 0,
        effectiveMetrics.empathy || 0,
      ]
      responseData = metricNames.map((name, i) => ({
        name,
        value: Math.round(dbScores[i] * 0.7 + transcriptScores![i] * 0.3),
      }))
    } else if (transcriptAnalysis && !effectiveMetrics) {
      // No DB metrics (or all-zero legacy records) — use transcript analysis directly
      responseData = metricNames.map((name, i) => ({
        name,
        value: transcriptScores![i],
      }))
    } else if (effectiveMetrics) {
      // DB metrics exist and no recent transcript — use DB values
      const dbScores = [
        effectiveMetrics.listening || 0,
        effectiveMetrics.expression || 0,
        effectiveMetrics.respect || 0,
        effectiveMetrics.empathy || 0,
      ]
      responseData = metricNames.map((name, i) => ({ name, value: dbScores[i] }))
    } else {
      // No metrics and no transcript data — return empty state
      const completedSessionsCount = await withRetry(
        () => prisma.session.count({
          where: { userId: user.id, status: 'COMPLETED', sessionType: sessionTypeValue }
        })
      )
      const msg = completedSessionsCount === 0
        ? 'Complete your first session to see communication metrics'
        : 'Complete a session with conversation to see detailed metrics'
      responseData = {
        metrics: metricNames.map(name => ({ name, value: 0 })),
        isEmpty: true,
        message: msg,
      }
    }

    // Only cache non-empty results to avoid persisting stale zero data
    const shouldCache = Array.isArray(responseData) && responseData.some((m: any) => m.value > 0)
    if (shouldCache) {
      await dashboardCache.set(cacheKey, responseData)
    }
    
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