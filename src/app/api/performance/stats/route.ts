/**
 * Performance statistics API endpoint
 * Provides real-time performance metrics for monitoring
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPerformanceReport } from '@/lib/performance/monitoring';
import { dashboardCache } from '@/lib/cache/dashboard-cache';
import { getSessionCacheStats } from '@/lib/auth/session-cache';
import { checkDatabaseConnection } from '@/lib/database/prisma-optimized';

export async function GET(request: Request) {
  try {
    // Only allow authenticated users to view performance stats
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get performance metrics
    const performanceReport = getPerformanceReport();
    const cacheStats = dashboardCache.getStats();
    const sessionCacheStats = getSessionCacheStats();
    
    // Check database health
    const dbHealth = await checkDatabaseConnection();

    // Compile comprehensive stats
    const stats = {
      performance: performanceReport,
      cache: {
        dashboard: cacheStats,
        session: sessionCacheStats,
      },
      database: dbHealth,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Performance Stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve performance stats' },
      { status: 500 }
    );
  }
}