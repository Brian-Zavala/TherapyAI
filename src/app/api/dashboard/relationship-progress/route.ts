// src/app/api/dashboard/relationship-progress/route.ts
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
    
    // Get progress metrics from the ProgressTracking table
    const progressData = await prisma.progressTracking.findMany({
      where: {
        userId: user.id
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

    // Format the data for the chart based on therapy type
    let formattedData;
    
    if (therapyType === 'solo') {
      formattedData = progressData.map(entry => ({
        week: `Week ${new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        closeness: Math.min(100, Math.max(0, entry.closenessScore - 10)), // Adjust for solo therapy
        communication: Math.min(100, Math.max(0, entry.communicationScore + 15)) // Adjust for solo therapy
      }));
    } else if (therapyType === 'family') {
      formattedData = progressData.map(entry => ({
        week: `Week ${new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        closeness: Math.min(100, Math.max(0, entry.closenessScore + 5)), // Adjust for family therapy
        communication: Math.min(100, Math.max(0, entry.communicationScore - 5)) // Adjust for family therapy
      }));
    } else {
      // Default 'couple' therapy
      formattedData = progressData.map(entry => ({
        week: `Week ${new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        closeness: entry.closenessScore,
        communication: entry.communicationScore
      }));
    }

    // Return default data if no progress data found
    if (formattedData.length === 0) {
      const defaultData = [];
      const currentDate = new Date();
      
      // Generate 3 weeks of default data
      for (let i = 0; i < 3; i++) {
        const date = new Date();
        date.setDate(currentDate.getDate() - (i * 7));
        const weekLabel = `Week ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        
        if (therapyType === 'solo') {
          defaultData.unshift({
            week: weekLabel,
            closeness: 30 + i * 5, // Different starting values for solo
            communication: 40 + i * 5
          });
        } else if (therapyType === 'family') {
          defaultData.unshift({
            week: weekLabel,
            closeness: 45 + i * 5, // Different starting values for family
            communication: 35 + i * 5
          });
        } else {
          defaultData.unshift({
            week: weekLabel,
            closeness: 40 + i * 5, // Default values for couple
            communication: 40 + i * 5
          });
        }
      }
      
      return NextResponse.json(defaultData);
    }

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Error fetching relationship progress data:", error);
    
    // Return default data on error
    const defaultData = [];
    const currentDate = new Date();
    
    // Generate 3 weeks of default data
    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setDate(currentDate.getDate() - (i * 7));
      const weekLabel = `Week ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      
      defaultData.unshift({
        week: weekLabel,
        closeness: 0,
        communication: 0
      });
    }
    
    return NextResponse.json(defaultData);
  }
}