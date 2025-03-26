// src/app/api/dashboard/session-time/route.ts
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

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Error fetching session time data:", error);
    return NextResponse.json(
      { error: "Failed to fetch session time data" },
      { status: 500 }
    );
  }
}