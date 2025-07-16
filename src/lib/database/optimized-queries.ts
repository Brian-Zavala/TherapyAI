import { prisma } from '@/lib/prisma-optimized';
import { Prisma } from '@prisma/client';
import { metrics } from '@/lib/performance/metrics-monitor';
import { cache } from '@/lib/cache/redis-cache';

interface PaginationOptions {
  cursor?: string;
  take?: number;
  skip?: number;
}

interface QueryMetrics {
  query: string;
  duration: number;
  rowCount: number;
  cached: boolean;
}

export class OptimizedQueries {
  private static readonly DEFAULT_PAGE_SIZE = 50;
  private static readonly CACHE_TTL = 300; // 5 minutes
  private static readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second

  /**
   * Get transcript chunks with cursor pagination
   */
  static async getTranscriptChunks(
    sessionId: string,
    options: PaginationOptions = {}
  ) {
    const { cursor, take = this.DEFAULT_PAGE_SIZE, skip = 0 } = options;
    const cacheKey = `transcript:chunks:${sessionId}:${cursor || 'start'}:${take}`;

    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      metrics.recordCacheHit('transcript_chunks');
      return cached;
    }

    const start = Date.now();

    const chunks = await prisma.transcriptChunk.findMany({
      where: { sessionId },
      take,
      skip: cursor ? 0 : skip,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { timestamp: 'asc' },
      select: {
        id: true,
        speaker: true,
        content: true,
        timestamp: true,
        metadata: true
      }
    });

    const duration = Date.now() - start;
    this.recordQueryMetrics({
      query: 'getTranscriptChunks',
      duration,
      rowCount: chunks.length,
      cached: false
    });

    // Cache if query was fast
    if (duration < this.SLOW_QUERY_THRESHOLD) {
      await cache.set(cacheKey, chunks, this.CACHE_TTL);
    }

    return {
      chunks,
      nextCursor: chunks.length === take ? chunks[chunks.length - 1].id : null,
      hasMore: chunks.length === take
    };
  }

  /**
   * Get session summary with performance metrics
   */
  static async getSessionSummary(sessionId: string) {
    const cacheKey = `session:summary:${sessionId}`;
    
    const cached = await cache.get(cacheKey);
    if (cached) {
      metrics.recordCacheHit('session_summary');
      return cached;
    }

    const start = Date.now();

    const [session, chunkCount, speakers, duration] = await Promise.all([
      prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          sessionSummary: true,
          _count: {
            select: { transcriptChunks: true }
          }
        }
      }),
      
      prisma.transcriptChunk.count({
        where: { sessionId }
      }),
      
      prisma.transcriptChunk.groupBy({
        by: ['speaker'],
        where: { sessionId },
        _count: { speaker: true }
      }),
      
      prisma.transcriptChunk.aggregate({
        where: { sessionId },
        _min: { timestamp: true },
        _max: { timestamp: true }
      })
    ]);

    const summary = {
      session,
      metrics: {
        totalChunks: chunkCount,
        speakers: speakers.map(s => ({
          name: s.speaker,
          messageCount: s._count.speaker
        })),
        duration: duration._max.timestamp && duration._min.timestamp
          ? duration._max.timestamp.getTime() - duration._min.timestamp.getTime()
          : 0
      }
    };

    const queryDuration = Date.now() - start;
    this.recordQueryMetrics({
      query: 'getSessionSummary',
      duration: queryDuration,
      rowCount: 1,
      cached: false
    });

    await cache.set(cacheKey, summary, this.CACHE_TTL * 2);
    return summary;
  }

  /**
   * Search transcripts with full-text search
   */
  static async searchTranscripts(
    userId: string,
    searchTerm: string,
    options: PaginationOptions = {}
  ) {
    const { cursor, take = this.DEFAULT_PAGE_SIZE } = options;
    const start = Date.now();

    // Use Prisma's full-text search if available
    const results = await prisma.$queryRaw<any[]>`
      SELECT 
        tc.id,
        tc."sessionId",
        tc.speaker,
        tc.content,
        tc.timestamp,
        s.title as session_title,
        ts_rank(to_tsvector('english', tc.content), plainto_tsquery('english', ${searchTerm})) as rank
      FROM "TranscriptChunk" tc
      JOIN "Session" s ON s.id = tc."sessionId"
      WHERE 
        s."userId" = ${userId}
        AND to_tsvector('english', tc.content) @@ plainto_tsquery('english', ${searchTerm})
      ORDER BY rank DESC, tc.timestamp DESC
      LIMIT ${take}
      OFFSET ${cursor ? parseInt(cursor) : 0}
    `;

    const duration = Date.now() - start;
    this.recordQueryMetrics({
      query: 'searchTranscripts',
      duration,
      rowCount: results.length,
      cached: false
    });

    return {
      results,
      nextCursor: results.length === take ? String((parseInt(cursor || '0') + take)) : null
    };
  }

  /**
   * Get aggregated session metrics
   */
  static async getSessionMetrics(userId: string, dateRange?: { start: Date; end: Date }) {
    const cacheKey = `metrics:${userId}:${dateRange?.start?.toISOString() || 'all'}`;
    
    const cached = await cache.get(cacheKey);
    if (cached) {
      metrics.recordCacheHit('session_metrics');
      return cached;
    }

    const start = Date.now();
    
    const where: Prisma.SessionWhereInput = {
      userId,
      isDeleted: false,
      status: 'completed',
      ...(dateRange && {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      })
    };

    const [
      totalSessions,
      totalDuration,
      avgSessionLength,
      sessionsByDay,
      topSpeakers
    ] = await Promise.all([
      prisma.session.count({ where }),
      
      prisma.session.aggregate({
        where,
        _sum: { duration: true }
      }),
      
      prisma.session.aggregate({
        where,
        _avg: { duration: true }
      }),
      
      prisma.$queryRaw<any[]>`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          SUM(duration) as total_duration
        FROM "Session"
        WHERE 
          "userId" = ${userId}
          AND status = 'completed'
          AND "isDeleted" = false
          ${dateRange ? Prisma.sql`AND created_at BETWEEN ${dateRange.start} AND ${dateRange.end}` : Prisma.empty}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `,
      
      prisma.$queryRaw<any[]>`
        SELECT 
          tc.speaker,
          COUNT(*) as message_count,
          COUNT(DISTINCT tc."sessionId") as session_count
        FROM "TranscriptChunk" tc
        JOIN "Session" s ON s.id = tc."sessionId"
        WHERE 
          s."userId" = ${userId}
          AND s.status = 'completed'
          ${dateRange ? Prisma.sql`AND s.created_at BETWEEN ${dateRange.start} AND ${dateRange.end}` : Prisma.empty}
        GROUP BY tc.speaker
        ORDER BY message_count DESC
        LIMIT 5
      `
    ]);

    const metricsData = {
      totalSessions,
      totalDuration: totalDuration._sum.duration || 0,
      avgSessionLength: avgSessionLength._avg.duration || 0,
      sessionsByDay,
      topSpeakers,
      calculatedAt: new Date()
    };

    const duration = Date.now() - start;
    this.recordQueryMetrics({
      query: 'getSessionMetrics',
      duration,
      rowCount: totalSessions,
      cached: false
    });

    await cache.set(cacheKey, metricsData, this.CACHE_TTL * 12); // 1 hour cache
    return metricsData;
  }

  /**
   * Batch load sessions with related data
   */
  static async batchLoadSessions(
    sessionIds: string[],
    includeTranscripts: boolean = false
  ) {
    const start = Date.now();

    const sessions = await prisma.session.findMany({
      where: {
        id: { in: sessionIds },
        isDeleted: false
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        sessionSummary: true,
        ...(includeTranscripts && {
          transcriptChunks: {
            take: 10,
            orderBy: { timestamp: 'asc' }
          }
        }),
        _count: {
          select: {
            transcriptChunks: true
          }
        }
      }
    });

    const duration = Date.now() - start;
    this.recordQueryMetrics({
      query: 'batchLoadSessions',
      duration,
      rowCount: sessions.length,
      cached: false
    });

    return sessions;
  }

  /**
   * Create database indexes for optimal performance
   */
  static async createIndexes() {
    const indexes = [
      // Transcript chunk indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcript_session_timestamp ON "TranscriptChunk"("sessionId", timestamp)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcript_speaker ON "TranscriptChunk"(speaker)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcript_content_gin ON "TranscriptChunk" USING gin(to_tsvector(\'english\', content))',
      
      // Session indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_user_status ON "Session"("userId", status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_created ON "Session"(created_at DESC)',
      
      // Notification indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_user_read ON "Notification"("userId", "isRead")',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_created ON "Notification"(created_at DESC)'
    ];

    for (const index of indexes) {
      try {
        await prisma.$executeRawUnsafe(index);
        console.log(`Created index: ${index.match(/idx_\w+/)?.[0]}`);
      } catch (error) {
        console.error(`Failed to create index: ${error}`);
      }
    }
  }

  /**
   * Record query metrics for monitoring
   */
  private static recordQueryMetrics(metrics: QueryMetrics) {
    if (metrics.duration > this.SLOW_QUERY_THRESHOLD) {
      console.warn(`Slow query detected: ${metrics.query} took ${metrics.duration}ms`);
    }

    metrics.recordOperation('database_query', metrics.duration, {
      query: metrics.query,
      rowCount: metrics.rowCount,
      cached: metrics.cached
    });
  }

  /**
   * Clean up old data for performance
   */
  static async cleanupOldData(daysToKeep: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const start = Date.now();

    // Soft delete old sessions
    const result = await prisma.session.updateMany({
      where: {
        createdAt: { lt: cutoffDate },
        isDeleted: false
      },
      data: {
        isDeleted: true,
        metadata: {
          deletedAt: new Date(),
          deletionReason: 'auto_cleanup'
        }
      }
    });

    const duration = Date.now() - start;
    console.log(`Cleaned up ${result.count} old sessions in ${duration}ms`);

    return result.count;
  }
}