// src/app/api/dashboard/communication-metrics/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma-optimized';
import { 
  handleDashboardError, 
  validateDashboardAuth,
  withRetry,
  DashboardError,
  DashboardErrorCode
} from '@/lib/api/dashboard-error-handler';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const therapyType = searchParams.get('type') || 'couple';

    const session = await getServerSession(authOptions);
    const { email } = await validateDashboardAuth(session);

    // Find the user in the database (might not be the same ID as the session)
    const user = await withRetry(
      () => prisma.user.findUnique({
        where: { email }
      })
    );

    if (!user) {
      throw new DashboardError(
        DashboardErrorCode.RECORD_NOT_FOUND,
        'User not found in database',
        404
      );
    }
    
    // Define theme value for consistent filtering
    const themeValue = therapyType === 'couple' ? 'Relationship Counseling' : 
                     therapyType === 'solo' ? 'Individual Therapy' : 'Family Therapy';

    // Get the 3 most recent completed sessions for this therapy type with retry
    const recentSessions = await withRetry(
      () => prisma.session.findMany({
        where: {
          userId: user.id,
          status: 'COMPLETED',
          theme: themeValue
        },
        orderBy: {
          date: 'desc'
        },
        take: 3,
        select: {
          id: true,
          duration: true,
          date: true
        }
      })
    );

    // Get transcript entries for recent sessions
    let transcriptAnalysis = null;
    if (recentSessions.length > 0) {
      const sessionIds = recentSessions.map(s => s.id);
      const transcriptEntries = await withRetry(
        () => prisma.transcriptEntry.findMany({
          where: {
            sessionId: { in: sessionIds }
          },
          orderBy: {
            timestamp: 'asc'
          }
        })
      );
      
      if (transcriptEntries.length > 0) {
        // Import the analysis function from metrics-helper
        const { analyzeTranscriptForMetrics } = await import('@/app/api/sessions/[id]/metrics-helper');
        
        // Combine transcript entries into a single transcript
        const combinedTranscript = transcriptEntries
          .map(entry => `${entry.speaker}: ${entry.text}`)
          .join('\n');
        
        // Analyze the transcripts
        const avgDuration = recentSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / recentSessions.length;
        transcriptAnalysis = analyzeTranscriptForMetrics(combinedTranscript, 70, 5, therapyType);
      }
    }

    // Get communication metrics from the CommunicationMetric table with retry
    // Use assistantId if available, otherwise use the latest metrics
    const metrics = await withRetry(
      () => prisma.communicationMetric.findFirst({
        where: {
          userId: user.id,
          // Filter by therapy type using assistantId pattern matching
          ...(therapyType === 'couple' && { metricType: { not: 'real-time' } }),
          ...(therapyType === 'solo' && { metricType: { not: 'real-time' } }),
          ...(therapyType === 'family' && { metricType: { not: 'real-time' } })
        },
        orderBy: {
          calculatedAt: 'desc'
        }
      })
    );
    
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
      return NextResponse.json([
        { name: "Active Listening", value: blendedMetrics.listening },
        { name: "Expressing Needs", value: blendedMetrics.expression },
        { name: "Conflict Resolution", value: blendedMetrics.respect },
        { name: "Emotional Support", value: blendedMetrics.empathy }
      ]);
    }

    // If no metrics found, check if there are completed sessions
    if (!metrics) {
      const completedSessionsCount = await withRetry(
        () => prisma.session.count({
          where: {
            userId: user.id,
            status: 'COMPLETED',
            theme: themeValue
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
        
        return NextResponse.json({ 
          metrics: emptyMetrics, 
          isEmpty: true, 
          message: "Complete your first session to see communication metrics" 
        });
      }
      
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
      
      return NextResponse.json({ 
        metrics: emptyMetrics, 
        isEmpty: true, 
        message: "Complete a session with conversation to see detailed metrics" 
      });
    }

    // Use existing metrics from database
    if (therapyType === 'solo') {
      return NextResponse.json([
        { name: "Self-awareness", value: metrics.listening || 0 },
        { name: "Emotional Regulation", value: metrics.expression || 0 },
        { name: "Personal Growth", value: metrics.respect || 0 },
        { name: "Coping Skills", value: metrics.empathy || 0 }
      ]);
    } else if (therapyType === 'family') {
      return NextResponse.json([
        { name: "Family Communication", value: metrics.listening || 0 },
        { name: "Role Definition", value: metrics.expression || 0 },
        { name: "Conflict Management", value: metrics.respect || 0 },
        { name: "Family Bonding", value: metrics.empathy || 0 }
      ]);
    } else {
      // Default 'couple' metrics
      return NextResponse.json([
        { name: "Active Listening", value: metrics.listening || 0 },
        { name: "Expressing Needs", value: metrics.expression || 0 },
        { name: "Conflict Resolution", value: metrics.respect || 0 },
        { name: "Emotional Support", value: metrics.empathy || 0 }
      ]);
    }
  } catch (error) {
    return handleDashboardError(error, {
      route: '/api/dashboard/communication-metrics',
      userId: (await getServerSession(authOptions))?.user?.id,
      action: 'fetchCommunicationMetrics',
    });
  }
}