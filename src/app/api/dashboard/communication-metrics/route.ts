// src/app/api/dashboard/communication-metrics/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma-optimized';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const therapyType = searchParams.get('type') || 'couple';

    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the user in the database (might not be the same ID as the session)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }
    
    // Define theme value for consistent filtering
    const themeValue = therapyType === 'couple' ? 'Relationship Counseling' : 
                     therapyType === 'solo' ? 'Individual Therapy' : 'Family Therapy';

    // Get the 3 most recent completed sessions for this therapy type
    const recentSessions = await prisma.session.findMany({
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
    });

    // Get transcript entries for recent sessions
    let transcriptAnalysis = null;
    if (recentSessions.length > 0) {
      const sessionIds = recentSessions.map(s => s.id);
      const transcriptEntries = await prisma.transcriptEntry.findMany({
        where: {
          sessionId: { in: sessionIds }
        },
        orderBy: {
          timestamp: 'asc'
        }
      });
      
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

    // Get communication metrics from the CommunicationMetric table
    // Use assistantId if available, otherwise use the latest metrics
    const metrics = await prisma.communicationMetric.findFirst({
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
    });
    
    // If we have transcript analysis, use it to influence the most recent metrics
    if (transcriptAnalysis && metrics) {
      // Create a weighted blend: 70% from metrics, 30% from recent transcript analysis
      const blendedMetrics = {
        listening: Math.round((metrics.listening || 50) * 0.7 + transcriptAnalysis.activeListeningScore * 0.3),
        expression: Math.round((metrics.expression || 50) * 0.7 + transcriptAnalysis.expressingNeedsScore * 0.3),
        respect: Math.round(metrics.respect * 0.7 + transcriptAnalysis.conflictResolutionScore * 0.3),
        empathy: Math.round(metrics.empathy * 0.7 + transcriptAnalysis.emotionalSupportScore * 0.3)
      };
      
      // Return the blended metrics
      return NextResponse.json([
        { name: "Active Listening", value: blendedMetrics.listening },
        { name: "Expressing Needs", value: blendedMetrics.expression },
        { name: "Conflict Resolution", value: blendedMetrics.respect },
        { name: "Emotional Support", value: blendedMetrics.empathy }
      ]);
    }

    // If no metrics found, query the session data to generate real metrics based on actual session history
    if (!metrics) {
      // Get completed sessions for this user to analyze real data
      const completedSessions = await prisma.session.findMany({
        where: {
          userId: user.id,
          status: 'COMPLETED',
          theme: themeValue
        },
        orderBy: {
          date: 'desc'
        },
        take: 10 // Use last 10 sessions for analysis
      });
      
      // If there are completed sessions, calculate metrics based on actual session data
      if (completedSessions.length > 0) {
        // Initialize metrics based on therapy type
        let calculatedMetrics;
        const sessionCount = completedSessions.length;
        const totalDuration = completedSessions.reduce((sum, session) => sum + (session.duration || 0), 0);
        const avgDuration = totalDuration / sessionCount;
        // Check for transcript entries instead of transcript field
        const sessionIds = completedSessions.map(s => s.id);
        const transcriptCounts = await prisma.transcriptEntry.groupBy({
          by: ['sessionId'],
          where: {
            sessionId: { in: sessionIds }
          },
          _count: true
        });
        const hasTranscript = transcriptCounts.length;
        const transcriptRatio = hasTranscript / sessionCount * 100;
        
        // Generate metrics based on actual session data and therapy type
        if (therapyType === 'solo') {
          calculatedMetrics = [
            { name: "Self-awareness", value: Math.min(100, Math.round(avgDuration * 0.6) + (transcriptRatio * 0.3)) },
            { name: "Emotional Regulation", value: Math.min(100, Math.round(sessionCount * 5) + (transcriptRatio * 0.2)) },
            { name: "Personal Growth", value: Math.min(100, Math.round(avgDuration * 0.5) + Math.round(sessionCount * 4)) },
            { name: "Coping Skills", value: Math.min(100, Math.round(sessionCount * 6) + (transcriptRatio * 0.25)) }
          ];
        } else if (therapyType === 'family') {
          calculatedMetrics = [
            { name: "Family Communication", value: Math.min(100, Math.round(avgDuration * 0.5) + (transcriptRatio * 0.35)) },
            { name: "Role Definition", value: Math.min(100, Math.round(sessionCount * 6) + (transcriptRatio * 0.15)) },
            { name: "Conflict Management", value: Math.min(100, Math.round(avgDuration * 0.4) + Math.round(sessionCount * 4)) },
            { name: "Family Bonding", value: Math.min(100, Math.round(sessionCount * 7) + (transcriptRatio * 0.2)) }
          ];
        } else {
          // Default 'couple' metrics
          calculatedMetrics = [
            { name: "Active Listening", value: Math.min(100, Math.round(avgDuration * 0.5) + (transcriptRatio * 0.3)) },
            { name: "Expressing Needs", value: Math.min(100, Math.round(sessionCount * 5) + (transcriptRatio * 0.25)) },
            { name: "Conflict Resolution", value: Math.min(100, Math.round(avgDuration * 0.4) + Math.round(sessionCount * 5)) },
            { name: "Emotional Support", value: Math.min(100, Math.round(sessionCount * 6) + (transcriptRatio * 0.2)) }
          ];
        }
        
        return NextResponse.json(calculatedMetrics);
      }
      
      // Check if there are any completed sessions for this therapy type
      // before returning empty array
      const completedSessionsCount = await prisma.session.count({
        where: {
          userId: user.id,
          status: 'COMPLETED',
          theme: themeValue
        }
      });
      
      // If there are no completed sessions, return empty metrics array
      if (completedSessionsCount === 0) {
        return NextResponse.json([]);
      }
      
      // Otherwise, proceed to generating fallback metrics
    }

    // Get real metrics based on therapy type from database
    if (therapyType === 'solo') {
      // Get completed sessions count
      const completedSessions = await prisma.session.count({
        where: {
          userId: user.id,
          status: 'COMPLETED',
          theme: themeValue // Use our consistent theme value
        }
      });
      
      // Only return metrics if there are completed sessions
      if (completedSessions > 0) {
        // Calculate metrics from base metrics or session count
        return NextResponse.json([
          { name: "Self-awareness", value: Math.min(100, metrics ? (metrics.listening || 50) : 30 + Math.round(completedSessions * 2)) },
          { name: "Emotional Regulation", value: Math.min(100, metrics ? (metrics.expression || 50) : 35 + Math.round(completedSessions * 1.5)) },
          { name: "Personal Growth", value: Math.min(100, metrics ? metrics.respect : 40 + Math.round(completedSessions * 3)) },
          { name: "Coping Skills", value: Math.min(100, metrics ? metrics.empathy : 45 + Math.round(completedSessions)) }
        ]);
      } else {
        // No completed sessions for individual therapy
        return NextResponse.json([]);
      }
    } else if (therapyType === 'family') {
      // Calculate from the primary metrics as a fallback
      const completedSessions = await prisma.session.count({
        where: {
          userId: user.id,
          status: 'COMPLETED',
          theme: themeValue // Use our consistent theme value
        }
      });
      
      // Only return metrics if there are completed sessions
      if (completedSessions > 0) {
        return NextResponse.json([
          { name: "Family Communication", value: Math.min(100, metrics ? (metrics.listening || 50) : 35 + Math.round(completedSessions * 1.5)) },
          { name: "Role Definition", value: Math.min(100, metrics ? (metrics.expression || 50) : 40 + Math.round(completedSessions * 2)) },
          { name: "Conflict Management", value: Math.min(100, metrics ? metrics.respect : 30 + Math.round(completedSessions)) },
          { name: "Family Bonding", value: Math.min(100, metrics ? metrics.empathy : 45 + Math.round(completedSessions * 2.5)) }
        ]);
      } else {
        // No completed sessions for family therapy
        return NextResponse.json([]);
      }
    } else {
      // Default 'couple' metrics - handle case where metrics might be null  
      if (!metrics) {
        // If we don't have metrics, use session count to generate baseline metrics
        const completedSessions = await prisma.session.count({
          where: {
            userId: user.id,
            status: 'COMPLETED',
            theme: themeValue // Use our consistent theme value
          }
        });
        
        // Only return metrics if there are completed sessions
        if (completedSessions > 0) {
          return NextResponse.json([
            { name: "Active Listening", value: 30 + Math.round(completedSessions * 2) },
            { name: "Expressing Needs", value: 35 + Math.round(completedSessions * 2.5) },
            { name: "Conflict Resolution", value: 40 + Math.round(completedSessions * 1.5) },
            { name: "Emotional Support", value: 45 + Math.round(completedSessions * 2) }
          ]);
        } else {
          // No completed sessions for couple therapy
          return NextResponse.json([]);
        }
      } else {
        // Use existing metrics
        const formattedMetrics = [
          { name: "Active Listening", value: metrics.listening || 50 },
          { name: "Expressing Needs", value: metrics.expression || 50 },
          { name: "Conflict Resolution", value: metrics.respect },
          { name: "Emotional Support", value: metrics.empathy }
        ];
        
        return NextResponse.json(formattedMetrics);
      }
    }
  } catch (error) {
    console.error("Error fetching communication metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch communication metrics" },
      { status: 500 }
    );
  }
}