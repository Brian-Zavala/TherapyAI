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
    
    // Get communication metrics from the CommunicationMetrics table
    const metrics = await prisma.communicationMetrics.findFirst({
      where: {
        userId: user.id
      },
      orderBy: {
        date: 'desc'
      }
    });

    // If no metrics found, query the session data to generate real metrics based on actual session history
    if (!metrics) {
      // Get completed sessions for this user to analyze real data
      const completedSessions = await prisma.session.findMany({
        where: {
          userId: user.id,
          status: 'completed',
          type: therapyType
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
      
      // If no completed sessions, return empty metrics array to show empty state in UI
      return NextResponse.json([]);
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
            type: 'solo'
          }
        });
        
        return NextResponse.json([
          { name: "Self-awareness", value: Math.min(100, metrics.activeListeningScore + Math.round(completedSessions * 2)) },
          { name: "Emotional Regulation", value: Math.min(100, metrics.expressingNeedsScore + Math.round(completedSessions * 1.5)) },
          { name: "Personal Growth", value: Math.min(100, metrics.conflictResolutionScore + Math.round(completedSessions * 3)) },
          { name: "Coping Skills", value: Math.min(100, metrics.emotionalSupportScore + Math.round(completedSessions)) }
        ]);
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
            type: 'family'
          }
        });
        
        return NextResponse.json([
          { name: "Family Communication", value: Math.min(100, metrics.activeListeningScore + Math.round(completedSessions * 1.5)) },
          { name: "Role Definition", value: Math.min(100, metrics.expressingNeedsScore + Math.round(completedSessions * 2)) },
          { name: "Conflict Management", value: Math.min(100, metrics.conflictResolutionScore + Math.round(completedSessions)) },
          { name: "Family Bonding", value: Math.min(100, metrics.emotionalSupportScore + Math.round(completedSessions * 2.5)) }
        ]);
      }
    } else {
      // Default 'couple' metrics
      const formattedMetrics = [
        { name: "Active Listening", value: metrics.activeListeningScore },
        { name: "Expressing Needs", value: metrics.expressingNeedsScore },
        { name: "Conflict Resolution", value: metrics.conflictResolutionScore },
        { name: "Emotional Support", value: metrics.emotionalSupportScore }
      ];
      
      return NextResponse.json(formattedMetrics);
    }
  } catch (error) {
    console.error("Error fetching communication metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch communication metrics" },
      { status: 500 }
    );
  }
}