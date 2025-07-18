// src/app/api/dashboard/relationship-progress/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma-optimized';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const therapyType = searchParams.get('type') || 'couple';
    const timeframe = searchParams.get('timeframe') || 'all'; // 'week', 'month', 'all'
    
    // Don't include solo therapy data in relationship progress
    if (therapyType === 'solo') {
      return NextResponse.json([]);
    }

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
    
    // Define theme value for consistent filtering
    const themeValue = therapyType === 'couple' ? 'Relationship Counseling' : 'Family Therapy';

    // Date filter based on timeframe
    const dateFilter: any = {};
    if (timeframe === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      dateFilter.gte = oneWeekAgo;
    } else if (timeframe === 'month') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      dateFilter.gte = oneMonthAgo;
    }

    // Get progress metrics from the ProgressTracking table
    const progressData = await prisma.progressTracking.findMany({
      where: {
        userId: user.id,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
      },
      select: {
        date: true,
        closenessScore: true,
        communicationScore: true,
        notes: true,
        sessionId: true,
        assistantId: true // Include assistant ID
      },
      orderBy: {
        date: 'asc'
      },
      take: 12 // Increased to show more data points
    });

    // Format the data for the chart based on therapy type
    let formattedData;
    
    // Helper function to generate insights based on scores
    const generateInsight = (current: any, previous: any, type: string) => {
      if (!previous) return type === 'family' ? "Initial family assessment" : "Initial couple assessment";
      
      const closenessChange = current.closenessScore - previous.closenessScore;
      const commChange = current.communicationScore - previous.communicationScore;
      const overallChange = (closenessChange + commChange) / 2;
      
      // Therapy-specific insights
      if (type === 'family') {
        if (overallChange > 5) return "Significant family dynamics improvement";
        if (overallChange > 2) return "Family connections strengthening";
        if (overallChange < -2) return "Facing family adjustment challenges";
        if (closenessChange > 3 && commChange < 0) return "Bonding improving, communication needs work";
        if (closenessChange < 0 && commChange > 3) return "Communication strategies effective";
        return "Steady family therapy progress";
      } else {
        // Couple therapy insights
        if (overallChange > 5) return "Relationship breakthrough";
        if (overallChange > 2) return "Positive relationship momentum";
        if (overallChange < -2) return "Working through relationship challenges";
        if (closenessChange > 3 && commChange < 0) return "Emotional connection improving, dialogue needs work";
        if (closenessChange < 0 && commChange > 3) return "Communication techniques effective";
        return "Steady relationship progress";
      }
    };
    
    // Calculate trend data (for progress indicators)
    const calculateTrends = (data: any[]) => {
      if (data.length < 2) return { closeness: 0, communication: 0 };
      
      const firstEntry = data[0];
      const lastEntry = data[data.length - 1];
      
      return {
        closeness: lastEntry.closenessScore - firstEntry.closenessScore,
        communication: lastEntry.communicationScore - firstEntry.communicationScore
      };
    };
    
    const trends = calculateTrends(progressData);
    
    if (therapyType === 'family') {
      formattedData = progressData.map((entry, index) => {
        const prevEntry = index > 0 ? progressData[index - 1] : null;
        const dateFormatted = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        return {
          week: `${dateFormatted}`,
          closeness: Math.min(100, Math.max(0, entry.closenessScore + 3)), // Adjust for family therapy
          communication: Math.min(100, Math.max(0, entry.communicationScore - 3)), // Adjust for family therapy
          notes: entry.notes || "",
          sessionId: entry.sessionId || null,
          insight: generateInsight(entry, prevEntry, 'family'),
          date: entry.date,
          rawCloseness: entry.closenessScore,
          rawCommunication: entry.communicationScore,
          sessionNumber: index + 1,
          trends
        };
      });
    } else {
      // Default 'couple' therapy
      formattedData = progressData.map((entry, index) => {
        const prevEntry = index > 0 ? progressData[index - 1] : null;
        const dateFormatted = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        return {
          week: `${dateFormatted}`,
          closeness: entry.closenessScore,
          communication: entry.communicationScore,
          notes: entry.notes || "",
          sessionId: entry.sessionId || null,
          insight: generateInsight(entry, prevEntry, 'couple'),
          date: entry.date,
          rawCloseness: entry.closenessScore,
          rawCommunication: entry.communicationScore,
          sessionNumber: index + 1,
          trends
        };
      });
    }

    // If no progress data found, analyze session data to get real metrics instead of using static defaults
    if (formattedData.length === 0) {
      // Get completed sessions for the user
      const completedSessions = await prisma.session.findMany({
        where: {
          userId: user.id,
          status: 'COMPLETED',
          theme: themeValue
        },
        select: {
          id: true,
          date: true,
          duration: true,
          notes: true
        },
        orderBy: {
          date: 'asc'
        }
      });
      
      console.log(`Found ${completedSessions.length} completed sessions for ${therapyType} therapy`);
      
      // If there are completed sessions, generate progress tracking data based on real sessions
      if (completedSessions.length > 0) {
        // Group sessions by week for aggregated data
        const sessionsByWeek = completedSessions.reduce<Record<string, typeof completedSessions>>((acc, session) => {
          const sessionDate = new Date(session.date);
          const weekStart = new Date(sessionDate);
          weekStart.setDate(sessionDate.getDate() - sessionDate.getDay());
          const weekKey = weekStart.toISOString().split('T')[0];
          
          if (!acc[weekKey]) {
            acc[weekKey] = [];
          }
          acc[weekKey].push(session);
          return acc;
        }, {});
        
        // Generate default data for weeks without metrics
        const weeks = Object.keys(sessionsByWeek).sort();
        console.log(`Grouped into ${weeks.length} weeks`);
        
        // No automated data generation - return empty array
        console.log(`Found ${completedSessions.length} completed sessions, but no progress tracking data`);
        
        return NextResponse.json([]);
      }
      
      // If no completed sessions, return empty array
      console.log("No completed sessions found, returning empty array");
      
      return NextResponse.json([]);
    }

    // If we have real data, return it
    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Error fetching relationship progress data:", error);
    
    // Return empty array on error to show error state in UI
    return NextResponse.json([]);
  }
}