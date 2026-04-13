import { getAuthSession } from '@/lib/auth'
// src/app/api/dashboard/communication-metrics/route.ts
// This is an optimized version with caching for immediate performance improvement
import { NextResponse } from "next/server";
import { analyzeTranscriptForMetrics } from '@/lib/transcript-analysis';
import { prisma } from '@/lib/prisma-optimized';
import { 
  handleDashboardError, 
  validateDashboardAuth,
  withRetry,
  DashboardError,
  DashboardErrorCode
} from '@/lib/api/dashboard-error-handler';
import { dashboardCache, cacheKeys } from '@/lib/cache/dashboard-cache';

export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const therapyType = searchParams.get('type') || 'couple';

    const session = await getAuthSession();
    const { email } = await validateDashboardAuth(session);

    // Find the user in the database
    const user = await withRetry(
      () => prisma.user.findUnique({
        where: { email },
        select: { id: true }
      })
    );

    if (!user) {
      throw new DashboardError(
        DashboardErrorCode.RECORD_NOT_FOUND,
        'User not found in database',
        404
      );
    }
    
    // Try cache first
    const cacheKey = cacheKeys.metrics(user.id);
    const cached = await dashboardCache.get(cacheKey);
    if (cached) {
      console.log(`[CommunicationMetrics] Cache hit, returned in ${Date.now() - startTime}ms`);
      return NextResponse.json(cached);
    }
    
    // Generate the metrics data
    const metricsData = await generateMetricsData(user.id, therapyType);
    
    // Cache the result
    await dashboardCache.set(cacheKey, metricsData);
    
    const duration = Date.now() - startTime;
    console.log(`[CommunicationMetrics] Query completed in ${duration}ms`);
    
    if (duration > 500) {
      console.warn(`[CommunicationMetrics] Slow query detected: ${duration}ms`, {
        userId: user.id,
        therapyType,
      });
    }
    
    return NextResponse.json(metricsData);
  } catch (error) {
    return handleDashboardError(error, {
      route: '/api/dashboard/communication-metrics',
      userId: (await getAuthSession())?.user?.id,
      action: 'fetchCommunicationMetrics',
    });
  }
}

async function generateMetricsData(userId: string, therapyType: string) {
  // Define theme value for consistent filtering
  const themeValue = therapyType === 'couple' ? 'Relationship Counseling' : 
                   therapyType === 'solo' ? 'Individual Therapy' : 'Family Therapy';

  // Get the 3 most recent completed sessions using optimized query
  const recentSessions = await withRetry(
    () => prisma.session.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        theme: themeValue
      },
      orderBy: { date: 'desc' },
      take: 3,
      select: {
        id: true,
        duration: true,
        date: true
      }
    })
  );

  // Get transcript entries for recent sessions if available
  let transcriptAnalysis = null;
  if (recentSessions.length > 0) {
    const sessionIds = recentSessions.map(s => s.id);
    
    // Use aggregation to get transcript data more efficiently
    const transcriptCount = await prisma.transcriptEntry.count({
      where: { sessionId: { in: sessionIds } }
    });
    
    if (transcriptCount > 0) {
      const transcriptEntries = await withRetry(
        () => prisma.transcriptEntry.findMany({
          where: { sessionId: { in: sessionIds } },
          orderBy: { timestamp: 'asc' },
          select: {
            speaker: true,
            text: true
          }
        })
      );
      
      if (transcriptEntries.length > 0) {
        // Combine transcript entries
        const combinedTranscript = transcriptEntries
          .map(entry => `${entry.speaker}: ${entry.text}`)
          .join('\n');
        
        // Analyze the transcripts
        const avgDuration = recentSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / recentSessions.length;
        transcriptAnalysis = analyzeTranscriptForMetrics(combinedTranscript, 70, 5, therapyType);
      }
    }
  }

  // Get communication metrics from database
  const metrics = await withRetry(
    () => prisma.communicationMetric.findFirst({
      where: {
        userId,
        metricType: { not: 'real-time' }
      },
      orderBy: { calculatedAt: 'desc' },
      select: {
        listening: true,
        expression: true,
        respect: true,
        empathy: true
      }
    })
  );
  
  // If we have transcript analysis, blend it with existing metrics
  if (transcriptAnalysis && metrics) {
    const blendedMetrics = {
      listening: Math.round((metrics.listening || 0) * 0.7 + transcriptAnalysis.activeListeningScore * 0.3),
      expression: Math.round((metrics.expression || 0) * 0.7 + transcriptAnalysis.expressingNeedsScore * 0.3),
      respect: Math.round((metrics.respect || 0) * 0.7 + transcriptAnalysis.conflictResolutionScore * 0.3),
      empathy: Math.round((metrics.empathy || 0) * 0.7 + transcriptAnalysis.emotionalSupportScore * 0.3)
    };
    
    return getMetricsArray(therapyType, blendedMetrics);
  }

  // If no metrics found, check if there are completed sessions
  if (!metrics) {
    const completedSessionsCount = await withRetry(
      () => prisma.session.count({
        where: {
          userId,
          status: 'COMPLETED',
          theme: themeValue
        }
      })
    );
    
    const emptyMetrics = getEmptyMetrics(therapyType);
    
    if (completedSessionsCount === 0) {
      return { 
        metrics: emptyMetrics, 
        isEmpty: true, 
        message: "Complete your first session to see communication metrics" 
      };
    }
    
    return { 
      metrics: emptyMetrics, 
      isEmpty: true, 
      message: "Complete a session with conversation to see detailed metrics" 
    };
  }

  // Return existing metrics
  return getMetricsArray(therapyType, metrics);
}

function getMetricsArray(therapyType: string, metrics: any) {
  if (therapyType === 'solo') {
    return [
      { name: "Self-awareness", value: metrics.listening || 0 },
      { name: "Emotional Regulation", value: metrics.expression || 0 },
      { name: "Personal Growth", value: metrics.respect || 0 },
      { name: "Coping Skills", value: metrics.empathy || 0 }
    ];
  } else if (therapyType === 'family') {
    return [
      { name: "Family Communication", value: metrics.listening || 0 },
      { name: "Role Definition", value: metrics.expression || 0 },
      { name: "Conflict Management", value: metrics.respect || 0 },
      { name: "Family Bonding", value: metrics.empathy || 0 }
    ];
  } else {
    return [
      { name: "Active Listening", value: metrics.listening || 0 },
      { name: "Expressing Needs", value: metrics.expression || 0 },
      { name: "Conflict Resolution", value: metrics.respect || 0 },
      { name: "Emotional Support", value: metrics.empathy || 0 }
    ];
  }
}

function getEmptyMetrics(therapyType: string) {
  if (therapyType === 'solo') {
    return [
      { name: "Self-awareness", value: 0 },
      { name: "Emotional Regulation", value: 0 },
      { name: "Personal Growth", value: 0 },
      { name: "Coping Skills", value: 0 }
    ];
  } else if (therapyType === 'family') {
    return [
      { name: "Family Communication", value: 0 },
      { name: "Role Definition", value: 0 },
      { name: "Conflict Management", value: 0 },
      { name: "Family Bonding", value: 0 }
    ];
  } else {
    return [
      { name: "Active Listening", value: 0 },
      { name: "Expressing Needs", value: 0 },
      { name: "Conflict Resolution", value: 0 },
      { name: "Emotional Support", value: 0 }
    ];
  }
}