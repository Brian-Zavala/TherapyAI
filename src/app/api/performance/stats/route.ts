// @ts-nocheck
import { getAuthSession } from '@/lib/auth'
/**
 * Performance statistics API endpoint
 * Provides real-time performance metrics for monitoring
 */

import { NextResponse } from 'next/server';
import { getPerformanceReport } from '@/lib/performance/monitoring';
import { dashboardCache } from '@/lib/cache/dashboard-cache';
import { checkDatabaseConnection } from '@/lib/prisma-optimized';

export async function GET(request: Request) {
  try {
    // Only allow authenticated users to view performance stats
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get performance metrics
    const performanceReport = getPerformanceReport();
    const cacheStats = dashboardCache.getStats();
    const sessionCacheStats = sessionCacheStats || {};
    
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