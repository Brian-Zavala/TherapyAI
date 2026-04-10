// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { TranscriptPerformanceOptimizer } from './transcript-performance-optimizer';
import { prisma } from '@/lib/prisma-optimized';
import { notificationService } from '@/lib/notifications/notification-service';
import { metrics } from '@/lib/performance/metrics-monitor';
import { therapyInsightsQueue } from '@/lib/queue/therapy-insights-queue';
import type { VAPIEndOfCallReport, VAPIWebhookPayload } from './types';

export class VAPIWebhookProcessor {
  private static readonly WEBHOOK_TIMEOUT = 4500; // 4.5s to stay under 5s limit
  private static readonly MAX_RETRIES = 3;

  /**
   * Process VAPI webhook with optimized performance
   * Must respond within 5 seconds
   */
  static async processWebhook(request: NextRequest): Promise<NextResponse> {
    const processingStart = Date.now();
    
    try {
      const payload = await request.json() as VAPIWebhookPayload;
      
      // Immediately acknowledge receipt
      const response = NextResponse.json({ success: true }, { status: 200 });
      
      // Process async without blocking response
      this.processAsync(payload).catch(error => {
        console.error('Async webhook processing failed:', error);
        metrics.recordError('webhook_processing', error);
      });

      // Record webhook handling time
      metrics.recordOperation('webhook_response', Date.now() - processingStart);
      
      return response;
    } catch (error) {
      console.error('Webhook processing error:', error);
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }
  }

  /**
   * Async processing of webhook payload
   */
  static async processAsync(payload: VAPIWebhookPayload): Promise<void> {
    switch (payload.type) {
      case 'end-of-call-report':
        await this.handleEndOfCallReport(payload.message as VAPIEndOfCallReport);
        break;
      
      case 'status-update':
        await this.handleStatusUpdate(payload.message);
        break;
      
      case 'transcript-ready':
        await this.handleTranscriptReady(payload.message);
        break;
      
      default:
        console.log(`Unhandled webhook type: ${payload.message.type}`);
    }
  }

  /**
   * Handle end-of-call report with optimized transcript processing
   */
  private static async handleEndOfCallReport(report: VAPIEndOfCallReport): Promise<void> {
    const { call } = report;
    const sessionId = call.metadata?.sessionId;

    if (!sessionId) {
      console.error('No sessionId in call metadata');
      return;
    }

    try {
      // 1. Update session status immediately
      const currentSession = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { notes: true }
      });

      let existingNotes: any = {};
      if (currentSession?.notes) {
        try {
          existingNotes = JSON.parse(currentSession.notes);
        } catch {
          // Keep existing plain text notes
          existingNotes = { originalNotes: currentSession.notes };
        }
      }

      const sessionMetadata = {
        ...existingNotes,
        callData: {
          callId: call.id,
          endedReason: report.endedReason,
          duration: report.duration,
          cost: report.cost,
          recordingUrl: report.recordingUrl
        }
      };

      await prisma.session.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          endTime: new Date(report.endedAt),
          notes: JSON.stringify(sessionMetadata)
        }
      });

      // 2. Process transcript using optimized handler
      const processingResult = await TranscriptPerformanceOptimizer.processVAPITranscript(
        report,
        sessionId,
        {
          batchSize: 100,
          streamingEnabled: true,
          useSummaryCache: true,
          maxConcurrency: 3
        }
      );

      // 3. Queue insights generation (non-blocking)
      await therapyInsightsQueue.add('generate-insights', {
        sessionId,
        summary: report.summary,
        messageCount: processingResult.messagesProcessed,
        duration: report.duration
      });

      // 4. Send completion notification
      const sessionForNotification = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { user: true }
      });

      if (sessionForNotification?.userId) {
        await notificationService.createNotification({
          userId: sessionForNotification.userId,
          type: 'session_completed',
          title: 'Therapy Session Completed',
          message: `Your ${Math.round(report.duration / 60)} minute session has been processed.`,
          metadata: {
            sessionId,
            duration: report.duration,
            summaryAvailable: processingResult.summaryAvailable
          }
        });
      }

      metrics.recordSuccess('end_of_call_processing', {
        sessionId,
        processingTimeMs: processingResult.processingTimeMs,
        messagesProcessed: processingResult.messagesProcessed
      });

    } catch (error) {
      console.error('Failed to process end-of-call report:', error);
      metrics.recordError('end_of_call_processing', error as Error, { sessionId });
      
      // Retry logic
      await this.retryProcessing(report, sessionId);
    }
  }

  /**
   * Handle status updates
   */
  private static async handleStatusUpdate(message: any): Promise<void> {
    const { status, callId, metadata } = message;
    const sessionId = metadata?.sessionId;

    if (!sessionId) return;

    // Update session with status in notes field
    const statusSession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { notes: true }
    });

    let existingNotes: any = {};
    if (statusSession?.notes) {
      try {
        existingNotes = JSON.parse(statusSession.notes);
      } catch {
        existingNotes = { originalNotes: statusSession.notes };
      }
    }

    const statusMetadata = {
      ...existingNotes,
      statusData: {
        lastStatus: status,
        lastStatusUpdate: new Date(),
        callId
      }
    };

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        notes: JSON.stringify(statusMetadata)
      }
    });

    // Send real-time notification for important status changes
    if (['in-progress', 'ended'].includes(status)) {
      await notificationService.createNotification({
        userId: metadata.userId,
        type: 'session_status',
        title: 'Session Status Update',
        message: `Your therapy session is ${status}`,
        metadata: { sessionId, status }
      });
    }
  }

  /**
   * Handle transcript ready notification
   */
  private static async handleTranscriptReady(message: any): Promise<void> {
    const { sessionId, transcriptUrl } = message;

    if (!sessionId) return;

    // Update session with transcript URL in notes field
    const transcriptSession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { notes: true }
    });

    let existingNotes: any = {};
    if (transcriptSession?.notes) {
      try {
        existingNotes = JSON.parse(transcriptSession.notes);
      } catch {
        existingNotes = { originalNotes: transcriptSession.notes };
      }
    }

    const transcriptMetadata = {
      ...existingNotes,
      transcriptData: {
        transcriptUrl,
        transcriptReady: true,
        transcriptReadyAt: new Date()
      }
    };

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        notes: JSON.stringify(transcriptMetadata)
      }
    });

    // Notify user
    const notificationSession = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true }
    });

    if (notificationSession?.userId) {
      await notificationService.createNotification({
        userId: notificationSession.userId,
        type: 'transcript_ready',
        title: 'Transcript Available',
        message: 'Your session transcript is now available for review.',
        metadata: { sessionId, transcriptUrl }
      });
    }
  }

  /**
   * Retry failed processing with exponential backoff
   */
  private static async retryProcessing(
    report: VAPIEndOfCallReport,
    sessionId: string,
    attempt: number = 1
  ): Promise<void> {
    if (attempt > this.MAX_RETRIES) {
      console.error(`Max retries reached for session ${sessionId}`);
      const retrySession = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { notes: true }
      });

      let existingNotes: any = {};
      if (retrySession?.notes) {
        try {
          existingNotes = JSON.parse(retrySession.notes);
        } catch {
          existingNotes = { originalNotes: retrySession.notes };
        }
      }

      const failureMetadata = {
        ...existingNotes,
        processingErrors: {
          processingFailed: true,
          lastRetryAt: new Date(),
          retryCount: attempt
        }
      };

      await prisma.session.update({
        where: { id: sessionId },
        data: {
          notes: JSON.stringify(failureMetadata)
        }
      });
      return;
    }

    const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
    
    setTimeout(async () => {
      try {
        await TranscriptPerformanceOptimizer.processVAPITranscript(
          report,
          sessionId,
          { batchSize: 50 } // Smaller batch for retry
        );
      } catch (error) {
        console.error(`Retry ${attempt} failed:`, error);
        await this.retryProcessing(report, sessionId, attempt + 1);
      }
    }, delay);
  }

  /**
   * Validate webhook signature
   */
  static validateSignature(request: NextRequest): boolean {
    const signature = request.headers.get('x-vapi-signature');
    const timestamp = request.headers.get('x-vapi-timestamp');
    
    if (!signature || !timestamp) {
      return false;
    }

    // TODO: Implement signature validation
    // This would verify the webhook is from VAPI
    return true;
  }
}

// Export the processVapiWebhook function for background job processing
export async function processVapiWebhook(
  webhookEventId: string,
  payload: any,
  correlationId: string
): Promise<void> {
  console.log(`[processVapiWebhook] Processing webhook event ${webhookEventId} with correlation ${correlationId}`);
  
  try {
    // Process the webhook payload asynchronously
    await VAPIWebhookProcessor.processAsync(payload);
    
    // Update webhook event status to processed
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: 'processed',
        processedAt: new Date()
      }
    });
  } catch (error) {
    console.error(`[processVapiWebhook] Failed to process webhook event ${webhookEventId}:`, error);
    
    // Update webhook event status to failed
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        processedAt: new Date()
      }
    }).catch(updateError => {
      console.error('Failed to update webhook status:', updateError);
    });
    
    throw error; // Re-throw to trigger retry logic
  }
}