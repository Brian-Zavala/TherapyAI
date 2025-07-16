import { prisma } from '@/lib/prisma-optimized';
import { TranscriptService } from '@/lib/transcript-service-optimized';
import { metrics } from '@/lib/performance/metrics-monitor';
import type { VAPIMessage, VAPIEndOfCallReport } from './types';

interface ProcessingOptions {
  batchSize?: number;
  streamingEnabled?: boolean;
  useSummaryCache?: boolean;
  maxConcurrency?: number;
}

interface ProcessingResult {
  sessionId: string;
  messagesProcessed: number;
  processingTimeMs: number;
  summaryAvailable: boolean;
  recordingUrl?: string;
}

export class TranscriptPerformanceOptimizer {
  private static readonly DEFAULT_BATCH_SIZE = 100;
  private static readonly MAX_CONCURRENT_BATCHES = 3;
  private static readonly SUMMARY_CACHE_TTL = 86400; // 24 hours

  /**
   * Process VAPI's structured messages array with optimal performance
   */
  static async processVAPITranscript(
    report: VAPIEndOfCallReport,
    sessionId: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const {
      batchSize = this.DEFAULT_BATCH_SIZE,
      streamingEnabled = true,
      useSummaryCache = true,
      maxConcurrency = this.MAX_CONCURRENT_BATCHES
    } = options;

    try {
      // Track processing start
      metrics.startOperation('transcript_processing', { sessionId });

      // 1. Store VAPI's pre-generated summary for quick access
      if (report.summary && useSummaryCache) {
        await this.storeSummary(sessionId, report.summary, report.endedAt);
      }

      // 2. Store recording URL if available
      if (report.recordingUrl) {
        await this.storeRecordingUrl(sessionId, report.recordingUrl);
      }

      // 3. Process messages array in optimized batches
      const messages = report.messages || [];
      const processedCount = await this.processMessagesInBatches(
        sessionId,
        messages,
        batchSize,
        maxConcurrency,
        streamingEnabled
      );

      // 4. Update session with processing metadata
      await this.updateSessionMetadata(sessionId, {
        messageCount: processedCount,
        duration: report.duration,
        endedReason: report.endedReason,
        processingCompleted: true
      });

      const processingTime = Date.now() - startTime;
      metrics.recordOperation('transcript_processing', processingTime, {
        sessionId,
        messageCount: processedCount,
        batchSize
      });

      return {
        sessionId,
        messagesProcessed: processedCount,
        processingTimeMs: processingTime,
        summaryAvailable: !!report.summary,
        recordingUrl: report.recordingUrl
      };

    } catch (error) {
      metrics.recordError('transcript_processing', error as Error, { sessionId });
      throw new Error(`Failed to process VAPI transcript: ${error}`);
    }
  }

  /**
   * Process messages in optimized batches with concurrency control
   */
  private static async processMessagesInBatches(
    sessionId: string,
    messages: VAPIMessage[],
    batchSize: number,
    maxConcurrency: number,
    streamingEnabled: boolean
  ): Promise<number> {
    if (!messages.length) return 0;

    const batches = this.createBatches(messages, batchSize);
    let processedCount = 0;

    if (streamingEnabled) {
      // Process batches with controlled concurrency
      const processingQueue: Promise<void>[] = [];
      
      for (const batch of batches) {
        // Wait if we've reached max concurrency
        if (processingQueue.length >= maxConcurrency) {
          await Promise.race(processingQueue);
          processingQueue.splice(
            processingQueue.findIndex(p => p === undefined),
            1
          );
        }

        const processPromise = this.processBatch(sessionId, batch)
          .then(count => { processedCount += count; });
        
        processingQueue.push(processPromise);
      }

      // Wait for all remaining batches
      await Promise.all(processingQueue);
    } else {
      // Sequential processing
      for (const batch of batches) {
        processedCount += await this.processBatch(sessionId, batch);
      }
    }

    return processedCount;
  }

  /**
   * Process a single batch of messages
   */
  private static async processBatch(
    sessionId: string,
    messages: VAPIMessage[]
  ): Promise<number> {
    const transcriptChunks = messages.map(msg => ({
      sessionId,
      speaker: msg.role === 'assistant' ? 'therapist' : msg.role,
      timestamp: new Date(msg.time || Date.now()),
      content: msg.content,
      messageId: msg.id,
      metadata: {
        endTime: msg.endTime,
        secondsFromStart: msg.secondsFromStart,
        duration: msg.duration
      }
    }));

    // Bulk insert with Prisma
    const result = await prisma.transcriptChunk.createMany({
      data: transcriptChunks,
      skipDuplicates: true // Avoid duplicate processing
    });

    return result.count;
  }

  /**
   * Create optimized batches from messages array
   */
  private static createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Store VAPI's pre-generated summary
   */
  private static async storeSummary(
    sessionId: string,
    summary: string,
    timestamp: string
  ): Promise<void> {
    await prisma.sessionSummary.upsert({
      where: { sessionId },
      create: {
        sessionId,
        summary,
        generatedAt: new Date(timestamp),
        source: 'vapi',
        metadata: {
          cacheExpiry: Date.now() + (this.SUMMARY_CACHE_TTL * 1000)
        }
      },
      update: {
        summary,
        generatedAt: new Date(timestamp),
        metadata: {
          cacheExpiry: Date.now() + (this.SUMMARY_CACHE_TTL * 1000)
        }
      }
    });
  }

  /**
   * Store recording URL for backup access
   */
  private static async storeRecordingUrl(
    sessionId: string,
    recordingUrl: string
  ): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        metadata: {
          recordingUrl,
          recordingAvailable: true
        }
      }
    });
  }

  /**
   * Update session with processing metadata
   */
  private static async updateSessionMetadata(
    sessionId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        metadata: {
          ...metadata,
          lastProcessedAt: new Date()
        }
      }
    });
  }

  /**
   * Get cached summary if available
   */
  static async getCachedSummary(sessionId: string): Promise<string | null> {
    const summary = await prisma.sessionSummary.findFirst({
      where: {
        sessionId,
        metadata: {
          path: ['cacheExpiry'],
          gte: Date.now()
        }
      }
    });

    return summary?.summary || null;
  }

  /**
   * Stream messages with cursor-based pagination
   */
  static async *streamMessages(
    sessionId: string,
    pageSize: number = 50
  ): AsyncGenerator<VAPIMessage[]> {
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const chunks = await prisma.transcriptChunk.findMany({
        where: { sessionId },
        take: pageSize,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { timestamp: 'asc' }
      });

      if (chunks.length === 0) {
        hasMore = false;
        break;
      }

      // Convert to VAPI message format
      const messages: VAPIMessage[] = chunks.map(chunk => ({
        id: chunk.messageId || chunk.id,
        role: chunk.speaker === 'therapist' ? 'assistant' : chunk.speaker,
        content: chunk.content,
        time: chunk.timestamp.toISOString(),
        endTime: chunk.metadata?.endTime,
        secondsFromStart: chunk.metadata?.secondsFromStart,
        duration: chunk.metadata?.duration
      }));

      yield messages;

      cursor = chunks[chunks.length - 1].id;
      hasMore = chunks.length === pageSize;
    }
  }
}