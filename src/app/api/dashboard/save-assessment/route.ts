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
    
    // Save to CommunicationMetrics
    const savedMetrics = await prisma.communicationMetrics.create({
      data: {
        userId: user.id,
        date: new Date(date),
        activeListeningScore: communicationScore,
        expressingNeedsScore: trustScore,
        conflictResolutionScore: conflictScore,
        emotionalSupportScore: intimacyScore,
      },
    });
    
    // Calculate relationship progress data and save it
    const week = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7)); // Current week number
    
    // Create or update progress data
    const existingProgress = await prisma.relationshipProgress.findFirst({
      where: {
        userId: user.id,
        week: week,
      },
    });
    
    if (existingProgress) {
      // Update existing progress
      await prisma.relationshipProgress.update({
        where: { id: existingProgress.id },
        data: {
          closeness: (communicationScore + intimacyScore) / 2,
          communication: communicationScore, // Fix: use communicationScore directly
          date: new Date(),
        },
      });
    } else {
      // Create new progress
      await prisma.relationshipProgress.create({
        data: {
          userId: user.id,
          week: week,
          closeness: (communicationScore + intimacyScore) / 2,
          communication: communicationScore, // Fix: use communicationScore directly
          date: new Date(),
        },
      });
    }
    
    return NextResponse.json({ success: true, savedMetrics });
  } catch (error) {
    console.error("Error saving assessment data:", error);
    return NextResponse.json(
      { error: "Failed to save assessment data" },
      { status: 500 }
    );
  }
}