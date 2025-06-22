import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the user in the database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }
    
    // Parse the request body
    const body = await request.json();
    const { date, results } = body;
    
    if (!results) {
      return NextResponse.json({ error: "Invalid assessment data" }, { status: 400 });
    }
    
    // Extract assessment scores
    const {
      communicationScore = 50,
      trustScore = 50,
      intimacyScore = 50,
      conflictScore = 50
    } = results;
    
    // Get recent completed sessions to incorporate data
    const recentSessions = await prisma.session.findMany({
      where: {
        userId: user.id,
        status: 'completed'
      },
      orderBy: {
        date: 'desc'
      },
      take: 3
    });
    
    // Factor to adjust assessment scores based on session history
    let sessionAdjustmentFactor = 1.0;
    
    // If there are recent sessions, adjust scores slightly to reflect progress
    if (recentSessions.length > 0) {
      // More recent sessions = higher adjustment (max 1.15 for 3+ sessions)
      sessionAdjustmentFactor = 1.0 + (Math.min(recentSessions.length, 3) * 0.05);
      
      // Additional boost if sessions have transcripts (evidence of engagement)
      // Check for sessions with transcript entries instead
      const sessionIds = recentSessions.map(s => s.id);
      const transcriptCounts = await prisma.transcriptEntry.groupBy({
        by: ['sessionId'],
        where: { sessionId: { in: sessionIds } },
        _count: true
      });
      const sessionsWithTranscripts = transcriptCounts.filter(t => t._count > 0);
      if (sessionsWithTranscripts.length > 0) {
        sessionAdjustmentFactor += 0.05;
      }
    }
    
    // Calculate adjusted scores (never exceeding 100)
    const adjustedCommunicationScore = Math.min(100, Math.round(communicationScore * sessionAdjustmentFactor));
    const adjustedTrustScore = Math.min(100, Math.round(trustScore * sessionAdjustmentFactor));
    const adjustedConflictScore = Math.min(100, Math.round(conflictScore * sessionAdjustmentFactor));
    const adjustedIntimacyScore = Math.min(100, Math.round(intimacyScore * sessionAdjustmentFactor));
    
    // Save to CommunicationMetric with adjusted scores
    const savedMetrics = await prisma.communicationMetric.create({
      data: {
        userId: user.id,
        sessionId: '', // Assessment metric, not tied to a specific session
        clarity: adjustedCommunicationScore,
        empathy: adjustedTrustScore,
        respect: adjustedConflictScore,
        overall: adjustedIntimacyScore,
        listening: adjustedCommunicationScore,
        expression: adjustedTrustScore,
        metricType: 'assessment',
        calculatedAt: new Date(date)
      },
    });
    
    // Calculate relationship progress data and save it
    const week = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7)); // Current week number
    
    // Create progress tracking data
    await prisma.progressTracking.create({
      data: {
        userId: user.id,
        closenessScore: Math.round((communicationScore + intimacyScore) / 2),
        communicationScore: Math.round(communicationScore),
        date: new Date(),
        therapyType: 'couple' // Default therapy type for assessments
      },
    });
    
    return NextResponse.json({ success: true, savedMetrics });
  } catch (error) {
    console.error("Error saving assessment data:", error);
    return NextResponse.json(
      { error: "Failed to save assessment data" },
      { status: 500 }
    );
  }
}