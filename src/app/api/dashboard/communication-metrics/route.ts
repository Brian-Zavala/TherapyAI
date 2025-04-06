// src/app/api/dashboard/communication-metrics/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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

    if (!metrics) {
      // Return default values if no metrics are found
      return NextResponse.json([
        { name: "Active Listening", value: 25 },
        { name: "Expressing Needs", value: 25 },
        { name: "Conflict Resolution", value: 25 },
        { name: "Emotional Support", value: 25 }
      ]);
    }

    // Format the metrics for the chart
    const formattedMetrics = [
      { name: "Active Listening", value: metrics.activeListeningScore },
      { name: "Expressing Needs", value: metrics.expressingNeedsScore },
      { name: "Conflict Resolution", value: metrics.conflictResolutionScore },
      { name: "Emotional Support", value: metrics.emotionalSupportScore }
    ];

    return NextResponse.json(formattedMetrics);
  } catch (error) {
    console.error("Error fetching communication metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch communication metrics" },
      { status: 500 }
    );
  }
}