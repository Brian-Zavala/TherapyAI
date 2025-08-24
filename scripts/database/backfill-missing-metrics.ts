#!/usr/bin/env tsx
/**
 * Backfill missing ProgressTracking and CommunicationMetric records
 * for completed sessions that already have SessionMetrics
 */

import { prisma } from '../src/lib/database/prisma-optimized';
import { logger } from '../src/lib/utils/logger';

async function backfillMissingMetrics() {
  logger.info('Starting metrics backfill process...');

  try {
    // Find sessions with SessionMetrics but missing ProgressTracking
    const sessionsWithMetrics = await prisma.sessionMetrics.findMany({
      include: {
        session: true
      }
    });

    logger.info(`Found ${sessionsWithMetrics.length} sessions with metrics`);

    let backfilledProgress = 0;
    let backfilledCommunication = 0;

    for (const metric of sessionsWithMetrics) {
      const { sessionId, userId } = metric;

      // Check if ProgressTracking exists
      const existingProgress = await prisma.progressTracking.findFirst({
        where: { sessionId, userId }
      });

      if (!existingProgress) {
        // Create ProgressTracking from existing metrics
        const communicationScore = Math.round((metric.engagementScore + metric.sentimentScore) / 2);
        const closenessScore = Math.round(metric.sentimentScore);

        await prisma.progressTracking.create({
          data: {
            userId,
            sessionId,
            assistantId: metric.session.assistantId,
            closenessScore: Math.max(0, Math.min(100, closenessScore)),
            communicationScore: Math.max(0, Math.min(100, communicationScore)),
            date: metric.createdAt,
            notes: `Backfilled from session metrics. Messages: ${metric.totalMessages}, Engagement: ${metric.engagementScore}%, Sentiment: ${metric.sentimentTrend}`
          }
        });

        backfilledProgress++;
        logger.info(`Created ProgressTracking for session ${sessionId}`);
      }

      // Check if CommunicationMetric exists
      const existingComm = await prisma.communicationMetric.findFirst({
        where: { sessionId, userId, metricType: 'final' }
      });

      if (!existingComm) {
        // Create CommunicationMetric from existing metrics
        const communicationScore = Math.round((metric.engagementScore + metric.sentimentScore) / 2);

        await prisma.communicationMetric.create({
          data: {
            userId,
            sessionId,
            clarity: Math.max(0, Math.min(100, metric.engagementScore)),
            empathy: Math.max(0, Math.min(100, metric.sentimentScore)),
            respect: Math.max(0, Math.min(100, Math.round(metric.engagementScore * 0.9))),
            overall: Math.max(0, Math.min(100, communicationScore)),
            listening: Math.max(0, Math.min(100, Math.round(metric.engagementScore * 0.85))),
            expression: Math.max(0, Math.min(100, Math.round(metric.engagementScore * 0.95))),
            metricType: 'final',
            calculatedAt: metric.createdAt,
            confidence: metric.totalMessages > 20 ? 0.8 : 0.6
          }
        });

        backfilledCommunication++;
        logger.info(`Created CommunicationMetric for session ${sessionId}`);
      }
    }

    logger.info(`Backfill complete! Created ${backfilledProgress} ProgressTracking and ${backfilledCommunication} CommunicationMetric records`);

    // Also check for orphaned sessions (completed but no metrics at all)
    const orphanedSessions = await prisma.session.findMany({
      where: {
        status: 'COMPLETED',
        sessionMetrics: null
      },
      include: {
        transcriptEntries: true
      }
    });

    if (orphanedSessions.length > 0) {
      logger.info(`Found ${orphanedSessions.length} completed sessions without any metrics`);
      
      // Import the calculation function
      const { calculateMetrics } = await import('../src/lib/metrics/metrics-deduplication');
      
      for (const session of orphanedSessions) {
        if (session.transcriptEntries.length > 0) {
          logger.info(`Calculating metrics for orphaned session ${session.id}`);
          await calculateMetrics(session.id, session.userId);
        }
      }
    }

  } catch (error) {
    logger.error('Error during backfill', { error });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillMissingMetrics();