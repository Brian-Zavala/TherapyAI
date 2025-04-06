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

    // Format the data for the chart
    const formattedData = progressData.map(entry => ({
      week: `Week ${new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      closeness: entry.closenessScore,
      communication: entry.communicationScore
    }));

    // Return default data if no progress data found
    if (formattedData.length === 0) {
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