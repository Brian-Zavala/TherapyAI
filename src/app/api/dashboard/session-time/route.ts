import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma-optimized';

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
    
    // Always filter by therapy type for accurate data
    const themeValue = therapyType === 'couple' ? 'Relationship Counseling' : 
                       therapyType === 'solo' ? 'Individual Therapy' : 'Family Therapy';
    
    // Get sessions for the specific therapy type only
    const sessionData = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "date"), 'Mon') as month,
        EXTRACT(YEAR FROM "date") as year,
        SUM(duration) as sessionTime,
        COUNT(*) as sessionCount
      FROM "Session"
      WHERE "userId" = ${user.id}
        AND "status" = 'completed'
        AND "theme" = ${themeValue}
        AND "date" >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', "date"), EXTRACT(YEAR FROM "date")
      ORDER BY DATE_TRUNC('month', "date")
    `;

    // Format for the chart
    const formattedData = (sessionData as any[]).map((item: any) => ({
      month: `${item.month} ${item.year}`,
      sessionTime: parseInt(item.sessiontime),
      sessionCount: parseInt(item.sessioncount)
    }));

    // If no sessions found, return empty array instead of mock data
    if (formattedData.length === 0) {
      // Return empty array to show empty state in UI
      return NextResponse.json([]);
    }

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Error fetching session time data:", error);
    
    // Return empty array on error to show error state in UI
    return NextResponse.json([]);
  }
}