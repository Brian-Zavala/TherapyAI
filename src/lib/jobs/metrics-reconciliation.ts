/**
 * Metrics Reconciliation Job
 * 
 * Backfills missing dashboard metrics for completed sessions that lack ProgressTracking
 * and CommunicationMetric records. This fixes dashboard sync issues for historical sessions.
 */

import { prisma } from '@/lib/database/prisma-optimized';
import { logger } from '@/lib/utils/logger';
import { calculateMetrics } from '@/lib/metrics/metrics-deduplication';

export interface ReconciliationProgress {
  totalSessions: number;
  processedSessions: number;
  successfulSessions: number;
  failedSessions: number;
  skippedSessions: number;
  currentBatch: number;
  totalBatches: number;
  estimatedTimeRemaining?: number;
  errors: Array<{
    sessionId: string;
    error: string;
    timestamp: Date;
  }>;
}

export interface ReconciliationOptions {
  userId?: string;
  batchSize?: number;
  maxSessions?: number;
  dryRun?: boolean;
  onProgress?: (progress: ReconciliationProgress) => void;
  skipRecentSessions?: boolean; // Skip sessions from last 24 hours to avoid conflicts
}

export interface ReconciliationResult {
  success: boolean;
  summary: ReconciliationProgress;
  duration: number;
  recommendations: string[];
}

/**
 * Find sessions that are missing dashboard metrics
 */
export async function findSessionsMissingMetrics(
  userId?: string,
  options: {
    limit?: number;
    skipRecentSessions?: boolean;
  } = {}
): Promise<Array<{
  sessionId: string;
  userId: string;
  theme: string;
  sessionType: string;
  completedAt: Date;
  hasTranscripts: boolean;
  missingMetrics: string[];
}>> {
  const { limit = 1000, skipRecentSessions = true } = options;
  
  try {
    // Build where clause
    const whereClause: any = {
      status: 'COMPLETED',
      ...(userId && { userId }),
      ...(skipRecentSessions && {
        completedAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Skip last 24 hours
        }
      })
    };

    // Get completed sessions with related metrics data
    const sessions = await prisma.session.findMany({
      where: whereClause,
      select: {
        id: true,
        userId: true,
        theme: true,
        sessionType: true,
        completedAt: true,
        conversationTimeSeconds: true,
        transcriptEntries: {
          select: { id: true },
          take: 1 // Just check if any exist
        },
        progressTracking: {
          select: { id: true },
          take: 1
        },
        communicationMetrics: {
          select: { id: true },
          where: { metricType: { not: 'real-time' } },
          take: 1
        },
        sessionMetrics: {
          select: { id: true },
          take: 1
        }
      },
      orderBy: { completedAt: 'desc' },
      take: limit
    });

    // Filter to sessions missing dashboard metrics
    const sessionsMissingMetrics = sessions
      .filter(session => {
        const hasProgressTracking = session.progressTracking.length > 0;
        const hasCommunicationMetrics = session.communicationMetrics.length > 0;
        const hasSessionMetrics = session.sessionMetrics.length > 0;
        
        // Must be missing at least one of the essential metrics for dashboard
        return !hasProgressTracking || !hasCommunicationMetrics;
      })
      .map(session => {
        const missingMetrics = [];
        if (session.progressTracking.length === 0) missingMetrics.push('ProgressTracking');
        if (session.communicationMetrics.length === 0) missingMetrics.push('CommunicationMetric');
        if (session.sessionMetrics.length === 0) missingMetrics.push('SessionMetrics');
        
        return {
          sessionId: session.id,
          userId: session.userId,
          theme: session.theme || '',
          sessionType: session.sessionType || 'SOLO',
          completedAt: session.completedAt || new Date(),
          hasTranscripts: session.transcriptEntries.length > 0,
          missingMetrics
        };
      });

    logger.info('Found sessions missing metrics', {
      totalSessions: sessions.length,
      sessionsMissingMetrics: sessionsMissingMetrics.length,
      userId,
      skipRecentSessions
    });

    return sessionsMissingMetrics;

  } catch (error) {
    logger.error('Error finding sessions missing metrics', {
      userId,
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
}

/**
 * Reconcile metrics for sessions missing dashboard data
 */
export async function reconcileSessionMetrics(
  options: ReconciliationOptions = {}
): Promise<ReconciliationResult> {
  const {
    userId,
    batchSize = 10,
    maxSessions = 500,
    dryRun = false,
    onProgress,
    skipRecentSessions = true
  } = options;

  const startTime = Date.now();
  
  logger.info('Starting metrics reconciliation', {
    userId,
    batchSize,
    maxSessions,
    dryRun,
    skipRecentSessions
  });

  try {
    // Find sessions missing metrics
    const sessionsMissing = await findSessionsMissingMetrics(userId, {
      limit: maxSessions,
      skipRecentSessions
    });

    if (sessionsMissing.length === 0) {
      const result: ReconciliationResult = {
        success: true,
        summary: {
          totalSessions: 0,
          processedSessions: 0,
          successfulSessions: 0,
          failedSessions: 0,
          skippedSessions: 0,
          currentBatch: 0,
          totalBatches: 0,
          errors: []
        },
        duration: Date.now() - startTime,
        recommendations: ['No sessions found missing metrics - dashboard should be up to date']
      };
      
      logger.info('No sessions missing metrics found');
      return result;
    }

    // Initialize progress tracking
    const totalBatches = Math.ceil(sessionsMissing.length / batchSize);
    const progress: ReconciliationProgress = {
      totalSessions: sessionsMissing.length,
      processedSessions: 0,
      successfulSessions: 0,
      failedSessions: 0,
      skippedSessions: 0,
      currentBatch: 0,
      totalBatches,
      errors: []
    };

    logger.info('Processing sessions in batches', {
      totalSessions: progress.totalSessions,
      totalBatches,
      batchSize
    });

    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < sessionsMissing.length; i += batchSize) {
      const batch = sessionsMissing.slice(i, i + batchSize);
      progress.currentBatch = Math.floor(i / batchSize) + 1;
      
      // Calculate estimated time remaining
      if (progress.processedSessions > 0) {
        const avgTimePerSession = (Date.now() - startTime) / progress.processedSessions;
        const remainingSessions = progress.totalSessions - progress.processedSessions;
        progress.estimatedTimeRemaining = Math.round(avgTimePerSession * remainingSessions);
      }

      logger.info(`Processing batch ${progress.currentBatch}/${totalBatches}`, {
        batchSize: batch.length,
        sessionIds: batch.map(s => s.sessionId)
      });

      // Process batch concurrently but with controlled concurrency
      const batchPromises = batch.map(async (sessionData) => {
        try {
          if (dryRun) {
            // In dry run, just log what would be done
            logger.info('DRY RUN: Would reconcile metrics', {
              sessionId: sessionData.sessionId,
              missingMetrics: sessionData.missingMetrics,
              hasTranscripts: sessionData.hasTranscripts
            });
            progress.successfulSessions++;
          } else {
            // Actually reconcile metrics
            await calculateMetrics(sessionData.sessionId, sessionData.userId);
            progress.successfulSessions++;
            
            logger.info('Successfully reconciled session metrics', {
              sessionId: sessionData.sessionId,
              userId: sessionData.userId,
              missingMetrics: sessionData.missingMetrics
            });
          }
        } catch (error) {
          progress.failedSessions++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          progress.errors.push({
            sessionId: sessionData.sessionId,
            error: errorMessage,
            timestamp: new Date()
          });
          
          logger.error('Failed to reconcile session metrics', {
            sessionId: sessionData.sessionId,
            userId: sessionData.userId,
            error: errorMessage
          });
        }
        
        progress.processedSessions++;
      });

      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      // Call progress callback if provided
      if (onProgress) {
        onProgress({ ...progress });
      }

      // Small delay between batches to avoid overwhelming the database
      if (progress.currentBatch < totalBatches) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (progress.successfulSessions > 0) {
      recommendations.push(`Successfully reconciled ${progress.successfulSessions} sessions`);
    }
    
    if (progress.failedSessions > 0) {
      recommendations.push(`${progress.failedSessions} sessions failed - check logs for details`);
      recommendations.push('Consider running reconciliation again for failed sessions');
    }

    const successRate = Math.round((progress.successfulSessions / progress.totalSessions) * 100);
    if (successRate < 90) {
      recommendations.push('Low success rate detected - investigate common failure patterns');
    }

    if (!dryRun && progress.successfulSessions > 0) {
      recommendations.push('Clear dashboard cache to see updated metrics immediately');
    }

    const duration = Date.now() - startTime;
    
    const result: ReconciliationResult = {
      success: progress.failedSessions < progress.successfulSessions,
      summary: progress,
      duration,
      recommendations
    };

    logger.info('Metrics reconciliation completed', {
      ...result.summary,
      duration,
      successRate,
      dryRun
    });

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Metrics reconciliation failed', {
      userId,
      duration,
      error: error instanceof Error ? error.message : error
    });
    
    throw new Error(`Metrics reconciliation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Reconcile metrics for a specific user's dashboard
 */
export async function reconcileUserMetrics(
  userId: string,
  options: Omit<ReconciliationOptions, 'userId'> = {}
): Promise<ReconciliationResult> {
  return reconcileSessionMetrics({
    ...options,
    userId
  });
}

/**
 * Get reconciliation statistics without running the job
 */
export async function getReconciliationStats(userId?: string): Promise<{
  completedSessions: number;
  sessionsWithMetrics: number;
  sessionsMissingMetrics: number;
  percentageComplete: number;
  byTherapyType: Record<string, {
    total: number;
    withMetrics: number;
    missing: number;
  }>;
}> {
  try {
    const sessionsMissing = await findSessionsMissingMetrics(userId, {
      limit: 2000, // Higher limit for stats
      skipRecentSessions: false // Include all sessions for stats
    });

    // Get total completed sessions
    const totalCompleted = await prisma.session.count({
      where: {
        status: 'COMPLETED',
        ...(userId && { userId })
      }
    });

    // Group by therapy type
    const byTherapyType: Record<string, { total: number; withMetrics: number; missing: number }> = {};
    
    for (const sessionType of ['SOLO', 'COUPLE', 'FAMILY']) {
      const totalForType = await prisma.session.count({
        where: {
          status: 'COMPLETED',
          sessionType: sessionType as any,
          ...(userId && { userId })
        }
      });
      
      const missingForType = sessionsMissing.filter(s => s.sessionType === sessionType).length;
      
      byTherapyType[sessionType.toLowerCase()] = {
        total: totalForType,
        withMetrics: totalForType - missingForType,
        missing: missingForType
      };
    }

    const sessionsMissingCount = sessionsMissing.length;
    const sessionsWithMetrics = totalCompleted - sessionsMissingCount;
    const percentageComplete = totalCompleted > 0 
      ? Math.round((sessionsWithMetrics / totalCompleted) * 100) 
      : 100;

    return {
      completedSessions: totalCompleted,
      sessionsWithMetrics,
      sessionsMissingMetrics: sessionsMissingCount,
      percentageComplete,
      byTherapyType
    };

  } catch (error) {
    logger.error('Error getting reconciliation stats', {
      userId,
      error
    });
    throw error;
  }
}