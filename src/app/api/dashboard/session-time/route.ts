import { getAuthSession } from '@/lib/auth'
import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma-optimized';
import { 
  handleDashboardError, 
  validateDashboardAuth,
  withRetry,
  DashboardError,
  DashboardErrorCode
} from '@/lib/api/dashboard-error-handler';
import { dashboardCache, cacheKeys } from '@/lib/cache/dashboard-cache';
import { findUserByEmailOptimized } from '@/lib/database/optimized-user-queries';

// Utility to convert frontend therapy type to Prisma enum for filtering
function therapyTypeToPrismaEnum(therapyType: string): 'SOLO' | 'COUPLE' | 'FAMILY' {
  switch (therapyType.toLowerCase()) {
    case 'solo': 
    case 'individual':
      return 'SOLO';
    case 'couple':
      return 'COUPLE';  
    case 'family':
      return 'FAMILY';
    default:
      return 'SOLO';
  }
}

export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const therapyType = searchParams.get('type'); // null = all types

    // Use cached session to reduce auth overhead
    const session = await getAuthSession();
    const { email } = await validateDashboardAuth(session);

    // Find the user in the database using optimized query with caching
    const userResult = await findUserByEmailOptimized(email);
    const user = userResult ? { id: userResult.id } : null;

    if (!user) {
      throw new DashboardError(
        DashboardErrorCode.RECORD_NOT_FOUND,
        'User not found in database',
        404
      );
    }

    // Try cache first
    const cacheKey = cacheKeys.sessions(user.id, 'COMPLETED', therapyType || 'all');
    const cached = await dashboardCache.get(cacheKey);
    if (cached) {
      console.log(`[SessionTime] Cache hit, returned in ${Date.now() - startTime}ms`);
      return NextResponse.json(cached);
    }

    // Get sessions — filter by type if specified, otherwise return all types
    let sessionData;
    if (therapyType) {
      const sessionTypeValue = therapyTypeToPrismaEnum(therapyType);
      sessionData = await withRetry(
        () => prisma.$queryRaw`
          SELECT
            TO_CHAR(DATE_TRUNC('month', "date"), 'Mon') as month,
            EXTRACT(YEAR FROM "date") as year,
            SUM(duration) as sessionTime,
            COUNT(*) as sessionCount
          FROM "Session"
          WHERE "userId" = ${user.id}
            AND "status" = 'COMPLETED'
            AND "sessionType" = ${sessionTypeValue}::"SessionType"
            AND "date" >= NOW() - INTERVAL '6 months'
          GROUP BY DATE_TRUNC('month', "date"), EXTRACT(YEAR FROM "date")
          ORDER BY DATE_TRUNC('month', "date")
        `
      );
    } else {
      // No type filter — return all session types combined
      sessionData = await withRetry(
        () => prisma.$queryRaw`
          SELECT
            TO_CHAR(DATE_TRUNC('month', "date"), 'Mon') as month,
            EXTRACT(YEAR FROM "date") as year,
            SUM(duration) as sessionTime,
            COUNT(*) as sessionCount
          FROM "Session"
          WHERE "userId" = ${user.id}
            AND "status" = 'COMPLETED'
            AND "date" >= NOW() - INTERVAL '6 months'
          GROUP BY DATE_TRUNC('month', "date"), EXTRACT(YEAR FROM "date")
          ORDER BY DATE_TRUNC('month', "date")
        `
      );
    }

    // Format for the chart
    const formattedData = (sessionData as any[]).map((item: any) => ({
      month: `${item.month} ${item.year}`,
      sessionTime: parseInt(item.sessiontime),
      sessionCount: parseInt(item.sessioncount)
    }));

    // If no sessions found, return empty array instead of mock data
    if (formattedData.length === 0) {
      // Cache empty result too
      await dashboardCache.set(cacheKey, []);
      return NextResponse.json([]);
    }

    // Cache the result
    await dashboardCache.set(cacheKey, formattedData);
    
    const duration = Date.now() - startTime;
    console.log(`[SessionTime] Query completed in ${duration}ms`);
    
    if (duration > 500) {
      console.warn(`[SessionTime] Slow query detected: ${duration}ms`, {
        userId: user.id,
        therapyType,
      });
    }

    return NextResponse.json(formattedData);
  } catch (error) {
    return handleDashboardError(error, {
      route: '/api/dashboard/session-time',
      userId: (await getAuthSession())?.user?.id,
      action: 'fetchSessionTime',
    });
  }
}