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

    // Get all completed sessions for the user, grouped by month
    const sessionData = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "date"), 'Mon') as month,
        EXTRACT(YEAR FROM "date") as year,
        SUM(duration) as sessionTime
      FROM "Session"
      WHERE "userId" = ${session.user.id}
        AND "status" = 'completed'
        AND "date" >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', "date"), EXTRACT(YEAR FROM "date")
      ORDER BY DATE_TRUNC('month', "date")
    `;

    // Format for the chart
    const formattedData = sessionData.map((item) => ({
      month: `${item.month} ${item.year}`,
      sessionTime: parseInt(item.sessiontime)
    }));

    // Return default data if no sessions found
    if (formattedData.length === 0) {
      const currentDate = new Date();
      const months = [];
      
      // Generate last 3 months of default data
      for (let i = 0; i < 3; i++) {
        const date = new Date();
        date.setMonth(currentDate.getMonth() - i);
        const monthName = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        
        months.unshift({
          month: `${monthName} ${year}`,
          sessionTime: 0
        });
      }
      
      return NextResponse.json(months);
    }

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Error fetching session time data:", error);
    
    // Return default data on error
    const currentDate = new Date();
    const months = [];
    
    // Generate last 3 months of default data
    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setMonth(currentDate.getMonth() - i);
      const monthName = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      
      months.unshift({
        month: `${monthName} ${year}`,
        sessionTime: 0
      });
    }
    
    return NextResponse.json(months);
  }
}