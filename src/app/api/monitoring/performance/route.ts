// @ts-nocheck
import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/monitoring/performance-monitor';

export async function GET(request: NextRequest) {
  try {
    // Check authentication - only allow admins or developers
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // In production, you might want to check for admin role
    // For now, allowing any authenticated user for monitoring
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';

    switch (type) {
      case 'summary':
        const summary = performanceMonitor.getPerformanceSummary();
        return NextResponse.json({
          success: true,
          data: summary,
          timestamp: new Date().toISOString()
        });

      case 'session-models':
        const comparison = performanceMonitor.getSessionModelComparison();
        return NextResponse.json({
          success: true,
          data: comparison,
          timestamp: new Date().toISOString()
        });

      case 'anomalies':
        const anomalies = await performanceMonitor.checkPerformanceAnomalies();
        return NextResponse.json({
          success: true,
          data: anomalies,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter. Use: summary, session-models, or anomalies' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[Performance Monitoring API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to retrieve performance data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}