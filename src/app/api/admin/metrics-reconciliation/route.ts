/**
 * Metrics Reconciliation API
 * 
 * Admin endpoint to backfill missing dashboard metrics for completed sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  reconcileSessionMetrics,
  reconcileUserMetrics,
  getReconciliationStats,
  findSessionsMissingMetrics
} from '@/lib/jobs/metrics-reconciliation';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'stats';
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '100');

    logger.info('Metrics reconciliation API called', {
      action,
      userId,
      limit,
      adminUser: session.user.id
    });

    switch (action) {
      case 'stats':
        const stats = await getReconciliationStats(userId || undefined);
        
        return NextResponse.json({
          success: true,
          action: 'stats',
          userId,
          stats,
          summary: {
            completion: `${stats.percentageComplete}%`,
            needsReconciliation: stats.sessionsMissingMetrics > 0,
            recommendation: stats.sessionsMissingMetrics > 0 
              ? `Run reconciliation for ${stats.sessionsMissingMetrics} sessions`
              : 'All sessions have metrics - no reconciliation needed'
          }
        });

      case 'preview':
        const sessionsMissing = await findSessionsMissingMetrics(userId || undefined, {
          limit,
          skipRecentSessions: true
        });
        
        return NextResponse.json({
          success: true,
          action: 'preview',
          userId,
          preview: {
            totalFound: sessionsMissing.length,
            sessions: sessionsMissing.slice(0, 10), // Show first 10 for preview
            sampleMissingMetrics: sessionsMissing.reduce((acc, session) => {
              session.missingMetrics.forEach(metric => {
                acc[metric] = (acc[metric] || 0) + 1;
              });
              return acc;
            }, {} as Record<string, number>)
          }
        });

      case 'dry-run':
        const dryRunResult = await reconcileSessionMetrics({
          userId: userId || undefined,
          batchSize: 5,
          maxSessions: parseInt(searchParams.get('maxSessions') || '50'),
          dryRun: true,
          skipRecentSessions: true
        });
        
        return NextResponse.json({
          success: true,
          action: 'dry-run',
          result: dryRunResult,
          summary: {
            wouldProcess: dryRunResult.summary.totalSessions,
            estimatedDuration: `${Math.round(dryRunResult.duration / 1000)}s`,
            recommendations: dryRunResult.recommendations
          }
        });

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Use: stats, preview, or dry-run' 
        }, { status: 400 });
    }

  } catch (error) {
    logger.error('Metrics reconciliation GET API error', {
      error: error instanceof Error ? error.message : error
    });
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      action = 'reconcile', 
      userId, 
      batchSize = 10, 
      maxSessions = 100,
      skipRecentSessions = true 
    } = body;

    logger.info('Metrics reconciliation POST API called', {
      action,
      userId,
      batchSize,
      maxSessions,
      adminUser: session.user.id
    });

    switch (action) {
      case 'reconcile':
        const reconciliationResult = await reconcileSessionMetrics({
          userId: userId || undefined,
          batchSize,
          maxSessions,
          dryRun: false,
          skipRecentSessions,
          onProgress: (progress) => {
            // Log progress for monitoring
            if (progress.processedSessions % 10 === 0) {
              logger.info('Reconciliation progress update', {
                ...progress,
                adminUser: session.user.id
              });
            }
          }
        });

        // Clear dashboard cache for affected users if successful
        if (reconciliationResult.success && reconciliationResult.summary.successfulSessions > 0) {
          try {
            const { dashboardCache } = await import('@/lib/cache/dashboard-cache');
            
            if (userId) {
              await dashboardCache.invalidateUser(userId);
              logger.info('Cleared dashboard cache for reconciled user', { userId });
            } else {
              // For system-wide reconciliation, we can't clear all caches efficiently
              logger.info('System-wide reconciliation completed - users may need to refresh dashboards');
            }
          } catch (cacheError) {
            logger.error('Error clearing cache after reconciliation', {
              error: cacheError
            });
          }
        }
        
        return NextResponse.json({
          success: true,
          action: 'reconcile',
          result: reconciliationResult,
          summary: {
            processed: reconciliationResult.summary.processedSessions,
            successful: reconciliationResult.summary.successfulSessions,
            failed: reconciliationResult.summary.failedSessions,
            duration: `${Math.round(reconciliationResult.duration / 1000)}s`,
            successRate: `${Math.round((reconciliationResult.summary.successfulSessions / reconciliationResult.summary.totalSessions) * 100)}%`,
            recommendations: reconciliationResult.recommendations
          }
        });

      case 'reconcile-user':
        if (!userId) {
          return NextResponse.json({ 
            error: 'userId required for user-specific reconciliation' 
          }, { status: 400 });
        }
        
        const userResult = await reconcileUserMetrics(userId, {
          batchSize,
          maxSessions,
          dryRun: false,
          skipRecentSessions
        });

        // Clear user's dashboard cache
        if (userResult.success && userResult.summary.successfulSessions > 0) {
          try {
            const { dashboardCache } = await import('@/lib/cache/dashboard-cache');
            await dashboardCache.invalidateUser(userId);
            logger.info('Cleared dashboard cache for reconciled user', { userId });
          } catch (cacheError) {
            logger.error('Error clearing user cache after reconciliation', {
              userId,
              error: cacheError
            });
          }
        }
        
        return NextResponse.json({
          success: true,
          action: 'reconcile-user',
          userId,
          result: userResult,
          summary: {
            processed: userResult.summary.processedSessions,
            successful: userResult.summary.successfulSessions,
            failed: userResult.summary.failedSessions,
            duration: `${Math.round(userResult.duration / 1000)}s`,
            recommendations: userResult.recommendations
          }
        });

      default:
        return NextResponse.json({ 
          error: 'Invalid action for POST. Use: reconcile or reconcile-user' 
        }, { status: 400 });
    }

  } catch (error) {
    logger.error('Metrics reconciliation POST API error', {
      error: error instanceof Error ? error.message : error
    });
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}