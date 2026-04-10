import { getAuthSession } from '@/lib/auth'
import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma-optimized';

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const session = await getAuthSession();

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
    
    // Extract assessment scores with validation - handle both zero scores and missing scores
    const communicationScore = typeof results.communicationScore === 'number' ? results.communicationScore : 50;
    const trustScore = typeof results.trustScore === 'number' ? results.trustScore : 50;
    const intimacyScore = typeof results.intimacyScore === 'number' ? results.intimacyScore : 50;
    const conflictScore = typeof results.conflictScore === 'number' ? results.conflictScore : 50;
    
    // All scores are now guaranteed to be numbers, so no additional validation needed
    
    // Get recent completed sessions to incorporate data
    const recentSessions = await prisma.session.findMany({
      where: {
        userId: user.id,
        status: 'COMPLETED'
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
    
    // Save metrics and progress tracking atomically
    const savedMetrics = await prisma.$transaction([
      prisma.communicationMetric.create({
        data: {
          userId: user.id,
          sessionId: null,
          clarity: adjustedCommunicationScore,
          empathy: adjustedTrustScore,
          respect: adjustedConflictScore,
          overall: adjustedIntimacyScore,
          listening: adjustedCommunicationScore,
          expression: adjustedTrustScore,
          metricType: 'assessment',
          calculatedAt: new Date(date)
        },
      }),
      prisma.progressTracking.create({
        data: {
          userId: user.id,
          closenessScore: Math.round((communicationScore + intimacyScore) / 2),
          communicationScore: Math.round(communicationScore),
          date: new Date()
        },
      }),
    ]);

    return NextResponse.json({ success: true, savedMetrics: savedMetrics[0] });
  } catch (error) {
    console.error("Error saving assessment data:", error);
    return NextResponse.json(
      { error: "Failed to save assessment data" },
      { status: 500 }
    );
  }
}