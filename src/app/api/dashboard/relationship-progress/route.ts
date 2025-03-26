// src/app/api/dashboard/relationship-progress/route.ts
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

    // Get progress metrics from the ProgressTracking table
    const progressData = await prisma.progressTracking.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        date: true,
        closenessScore: true,
        communicationScore: true
      },
      orderBy: {
        date: 'asc'
      },
      take: 10 // Limit to most recent entries
    });

    // Format the data for the chart
    const formattedData = progressData.map(entry => ({
      // Format date as Week X or actual date depending on your preference
      week: `Week ${new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      closeness: entry.closenessScore,
      communication: entry.communicationScore
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Error fetching relationship progress data:", error);
    return NextResponse.json(
      { error: "Failed to fetch relationship progress data" },
      { status: 500 }
    );
  }
}