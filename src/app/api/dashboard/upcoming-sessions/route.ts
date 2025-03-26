// src/app/api/dashboard/upcoming-sessions/route.ts
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

    // Get upcoming sessions for the user
    const upcomingSessions = await prisma.session.findMany({
      where: {
        userId: session.user.id,
        status: 'scheduled',
        date: {
          gte: new Date() // Sessions from today onwards
        }
      },
      select: {
        id: true,
        date: true,
        theme: true,
        status: true
      },
      orderBy: {
        date: 'asc'
      },
      take: 5 // Limit to next 5 sessions
    });

    // Format the sessions for the table
    const formattedSessions = upcomingSessions.map(session => ({
      id: session.id,
      date: new Date(session.date).toLocaleDateString(),
      time: new Date(session.date).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      theme: session.theme
    }));

    // Return default data if no sessions found
    if (formattedSessions.length === 0) {
      // Return empty array instead of default data
      // This allows the component to show its "No upcoming sessions" message
      return NextResponse.json([]);
    }

    return NextResponse.json(formattedSessions);
  } catch (error) {
    console.error("Error fetching upcoming sessions:", error);
    // Return empty array for better error handling in component
    return NextResponse.json([]);
  }
}