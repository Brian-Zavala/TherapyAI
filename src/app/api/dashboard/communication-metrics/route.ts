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

    // Define default metrics for each therapy type
    const getDefaultMetrics = (type: string) => {
      switch (type) {
        case 'solo':
          return [
            { name: "Self-awareness", value: 30 },
            { name: "Emotional Regulation", value: 25 },
            { name: "Personal Growth", value: 35 },
            { name: "Coping Skills", value: 20 }
          ];
        case 'family':
          return [
            { name: "Family Communication", value: 25 },
            { name: "Role Definition", value: 30 },
            { name: "Conflict Management", value: 20 },
            { name: "Family Bonding", value: 35 }
          ];
        case 'couple':
        default:
          return [
            { name: "Active Listening", value: 25 },
            { name: "Expressing Needs", value: 25 },
            { name: "Conflict Resolution", value: 25 },
            { name: "Emotional Support", value: 25 }
          ];
      }
    };

    if (!metrics) {
      // Return default values based on therapy type if no metrics are found
      return NextResponse.json(getDefaultMetrics(therapyType));
    }

    // For demo purposes, modify the metrics based on therapy type
    // In a real app, you would have separate metrics stored for each therapy type
    if (therapyType === 'solo') {
      return NextResponse.json([
        { name: "Self-awareness", value: Math.min(100, metrics.activeListeningScore + 10) },
        { name: "Emotional Regulation", value: Math.min(100, metrics.expressingNeedsScore + 5) },
        { name: "Personal Growth", value: Math.min(100, metrics.conflictResolutionScore + 15) },
        { name: "Coping Skills", value: Math.min(100, metrics.emotionalSupportScore - 5) }
      ]);
    } else if (therapyType === 'family') {
      return NextResponse.json([
        { name: "Family Communication", value: Math.min(100, metrics.activeListeningScore - 5) },
        { name: "Role Definition", value: Math.min(100, metrics.expressingNeedsScore + 10) },
        { name: "Conflict Management", value: Math.min(100, metrics.conflictResolutionScore - 5) },
        { name: "Family Bonding", value: Math.min(100, metrics.emotionalSupportScore + 10) }
      ]);
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