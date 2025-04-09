// src/app/api/dashboard/communication-metrics/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
        status: 'completed',
        theme: themeValue
      },
      orderBy: {
        date: 'desc'
      },
      take: 3,
      select: {
        id: true,
        duration: true,
        transcript: true,
        date: true
      }
    });

    // Analyze recent session transcripts if available
    let transcriptAnalysis = null;
    if (recentSessions.length > 0 && recentSessions.some(s => s.transcript)) {
      const sessionsWithTranscript = recentSessions.filter(s => s.transcript);
      if (sessionsWithTranscript.length > 0) {
        // Import the analysis function from metrics-helper
        const { analyzeTranscriptForMetrics } = await import('@/app/api/sessions/[id]/metrics-helper');
        
        // Concatenate multiple transcripts with markers for better analysis
        const combinedTranscript = sessionsWithTranscript.map(s => 
          `SESSION_DATE: ${s.date.toISOString()}\n${s.transcript}`
        ).join('\n\n---\n\n');
        
        // Analyze the transcripts
        const avgDuration = sessionsWithTranscript.reduce((sum, s) => sum + (s.duration || 0), 0) / sessionsWithTranscript.length;
        transcriptAnalysis = analyzeTranscriptForMetrics(combinedTranscript, 70, 5);
      }
    }

    // Get communication metrics from the CommunicationMetrics table
    // Note: CommunicationMetrics doesn't have a therapyType field yet
    const metrics = await prisma.communicationMetrics.findFirst({
      where: {
        userId: user.id
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    // If we have transcript analysis, use it to influence the most recent metrics
    if (transcriptAnalysis && metrics) {
      // Create a weighted blend: 70% from metrics, 30% from recent transcript analysis
      const blendedMetrics = {
        activeListeningScore: Math.round(metrics.activeListeningScore * 0.7 + transcriptAnalysis.activeListeningScore * 0.3),
        expressingNeedsScore: Math.round(metrics.expressingNeedsScore * 0.7 + transcriptAnalysis.expressingNeedsScore * 0.3),
        conflictResolutionScore: Math.round(metrics.conflictResolutionScore * 0.7 + transcriptAnalysis.conflictResolutionScore * 0.3),
        emotionalSupportScore: Math.round(metrics.emotionalSupportScore * 0.7 + transcriptAnalysis.emotionalSupportScore * 0.3)
      };
      
      // Return the blended metrics
      return NextResponse.json([
        { name: "Active Listening", value: blendedMetrics.activeListeningScore },
        { name: "Expressing Needs", value: blendedMetrics.expressingNeedsScore },
        { name: "Conflict Resolution", value: blendedMetrics.conflictResolutionScore },
        { name: "Emotional Support", value: blendedMetrics.emotionalSupportScore }
      ]);
    }

    // If no metrics found, query the session data to generate real metrics based on actual session history
    if (!metrics) {
      // Get completed sessions for this user to analyze real data
      const completedSessions = await prisma.session.findMany({
        where: {
          userId: user.id,
          status: 'completed',
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
        const hasTranscript = completedSessions.filter(s => s.transcript && s.transcript.length > 0).length;
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
          status: 'completed',
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
      // Find solo therapy metrics for this user
      const soloMetrics = await prisma.soloTherapyMetrics.findFirst({
        where: {
          userId: user.id
        },
        orderBy: {
          date: 'desc'
        }
      });
      
      // If solo metrics exist, use them
      if (soloMetrics) {
        return NextResponse.json([
          { name: "Self-awareness", value: soloMetrics.selfAwarenessScore },
          { name: "Emotional Regulation", value: soloMetrics.emotionalRegulationScore },
          { name: "Personal Growth", value: soloMetrics.personalGrowthScore },
          { name: "Coping Skills", value: soloMetrics.copingSkillsScore }
        ]);
      } else {
        // Calculate from the primary metrics as a fallback
        const completedSessions = await prisma.session.count({
          where: {
            userId: user.id,
            status: 'completed',
            theme: themeValue // Use our consistent theme value
          }
        });
        
        // Only return metrics if there are completed sessions
        if (completedSessions > 0) {
          return NextResponse.json([
            { name: "Self-awareness", value: Math.min(100, metrics ? metrics.activeListeningScore : 30 + Math.round(completedSessions * 2)) },
            { name: "Emotional Regulation", value: Math.min(100, metrics ? metrics.expressingNeedsScore : 35 + Math.round(completedSessions * 1.5)) },
            { name: "Personal Growth", value: Math.min(100, metrics ? metrics.conflictResolutionScore : 40 + Math.round(completedSessions * 3)) },
            { name: "Coping Skills", value: Math.min(100, metrics ? metrics.emotionalSupportScore : 45 + Math.round(completedSessions)) }
          ]);
        } else {
          // No completed sessions for individual therapy
          return NextResponse.json([]);
        }
      }
    } else if (therapyType === 'family') {
      // Find family therapy metrics for this user
      const familyMetrics = await prisma.familyTherapyMetrics.findFirst({
        where: {
          userId: user.id
        },
        orderBy: {
          date: 'desc'
        }
      });
      
      // If family metrics exist, use them
      if (familyMetrics) {
        return NextResponse.json([
          { name: "Family Communication", value: familyMetrics.familyCommunicationScore },
          { name: "Role Definition", value: familyMetrics.roleDefinitionScore },
          { name: "Conflict Management", value: familyMetrics.conflictManagementScore },
          { name: "Family Bonding", value: familyMetrics.familyBondingScore }
        ]);
      } else {
        // Calculate from the primary metrics as a fallback
        const completedSessions = await prisma.session.count({
          where: {
            userId: user.id,
            status: 'completed',
            theme: themeValue // Use our consistent theme value
          }
        });
        
        // Only return metrics if there are completed sessions
        if (completedSessions > 0) {
          return NextResponse.json([
            { name: "Family Communication", value: Math.min(100, metrics ? metrics.activeListeningScore : 35 + Math.round(completedSessions * 1.5)) },
            { name: "Role Definition", value: Math.min(100, metrics ? metrics.expressingNeedsScore : 40 + Math.round(completedSessions * 2)) },
            { name: "Conflict Management", value: Math.min(100, metrics ? metrics.conflictResolutionScore : 30 + Math.round(completedSessions)) },
            { name: "Family Bonding", value: Math.min(100, metrics ? metrics.emotionalSupportScore : 45 + Math.round(completedSessions * 2.5)) }
          ]);
        } else {
          // No completed sessions for family therapy
          return NextResponse.json([]);
        }
      }
    } else {
      // Default 'couple' metrics - handle case where metrics might be null  
      if (!metrics) {
        // If we don't have metrics, use session count to generate baseline metrics
        const completedSessions = await prisma.session.count({
          where: {
            userId: user.id,
            status: 'completed',
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
          { name: "Active Listening", value: metrics.activeListeningScore },
          { name: "Expressing Needs", value: metrics.expressingNeedsScore },
          { name: "Conflict Resolution", value: metrics.conflictResolutionScore },
          { name: "Emotional Support", value: metrics.emotionalSupportScore }
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