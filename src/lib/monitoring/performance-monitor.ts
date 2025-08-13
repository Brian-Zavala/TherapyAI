import { redis } from '@/lib/cache/redis-client';
import { prisma } from '@/lib/prisma-optimized';

interface PerformanceMetric {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  sessionModel?: 'Session' | 'TherapySession';
  userId?: string;
  timestamp: Date;
  memory?: {
    used: number;
    heapUsed: number;
    heapTotal: number;
  };
  database?: {
    queryCount: number;
    slowQueries: number;
    connectionTime: number;
  };
}

interface DatabaseMetrics {
  queryDuration: number;
  model: string;
  operation: string;
  recordCount?: number;
  isSlowQuery: boolean;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private dbMetrics: DatabaseMetrics[] = [];
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private readonly SLOW_API_THRESHOLD = 2000; // 2 seconds
  private readonly MAX_METRICS_IN_MEMORY = 1000;

  // Track API endpoint performance
  async trackApiPerformance(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number,
    metadata?: {
      sessionModel?: 'Session' | 'TherapySession';
      userId?: string;
      queryCount?: number;
      slowQueries?: number;
    }
  ): Promise<void> {
    const metric: PerformanceMetric = {
      endpoint,
      method,
      duration,
      statusCode,
      sessionModel: metadata?.sessionModel,
      userId: metadata?.userId,
      timestamp: new Date(),
      memory: this.getMemoryUsage(),
      database: {
        queryCount: metadata?.queryCount || 0,
        slowQueries: metadata?.slowQueries || 0,
        connectionTime: 0 // Will be populated by database monitor
      }
    };

    // Store in memory
    this.metrics.push(metric);
    this.trimMetrics();

    // Store slow APIs in Redis for monitoring
    if (duration > this.SLOW_API_THRESHOLD) {
      await this.recordSlowApi(metric);
    }

    // Log critical performance issues
    if (duration > this.SLOW_API_THRESHOLD * 2) { // 4+ seconds
      console.error('[PerformanceMonitor] Critical slow API:', {
        endpoint,
        method,
        duration,
        statusCode,
        sessionModel: metadata?.sessionModel,
        userId: metadata?.userId
      });
    }
  }

  // Track database query performance
  trackDatabaseQuery(
    model: string,
    operation: string,
    duration: number,
    recordCount?: number
  ): void {
    const isSlowQuery = duration > this.SLOW_QUERY_THRESHOLD;
    
    const metric: DatabaseMetrics = {
      queryDuration: duration,
      model,
      operation,
      recordCount,
      isSlowQuery
    };

    this.dbMetrics.push(metric);
    this.trimDbMetrics();

    // Log slow queries
    if (isSlowQuery) {
      console.warn('[PerformanceMonitor] Slow query detected:', {
        model,
        operation,
        duration,
        recordCount
      });
    }
  }

  // Get performance summary for monitoring dashboard
  getPerformanceSummary() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentMetrics = this.metrics.filter(
      m => m.timestamp.getTime() > oneHourAgo
    );

    const recentDbMetrics = this.dbMetrics.filter(
      m => Date.now() - 60 * 60 * 1000 < now // approximate for db metrics
    );

    return {
      api: {
        totalRequests: recentMetrics.length,
        averageResponseTime: this.calculateAverage(recentMetrics.map(m => m.duration)),
        slowRequests: recentMetrics.filter(m => m.duration > this.SLOW_API_THRESHOLD).length,
        errorRate: recentMetrics.filter(m => m.statusCode >= 400).length / recentMetrics.length,
        sessionModelUsage: {
          Session: recentMetrics.filter(m => m.sessionModel === 'Session').length,
          TherapySession: recentMetrics.filter(m => m.sessionModel === 'TherapySession').length
        }
      },
      database: {
        totalQueries: recentDbMetrics.length,
        averageQueryTime: this.calculateAverage(recentDbMetrics.map(m => m.queryDuration)),
        slowQueries: recentDbMetrics.filter(m => m.isSlowQuery).length,
        modelUsage: this.getModelUsageStats(recentDbMetrics)
      },
      memory: this.getMemoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  // Get session model comparison metrics
  getSessionModelComparison() {
    const sessionMetrics = this.metrics.filter(m => m.sessionModel === 'Session');
    const therapySessionMetrics = this.metrics.filter(m => m.sessionModel === 'TherapySession');

    return {
      Session: {
        count: sessionMetrics.length,
        averageResponseTime: this.calculateAverage(sessionMetrics.map(m => m.duration)),
        slowRequestCount: sessionMetrics.filter(m => m.duration > this.SLOW_API_THRESHOLD).length
      },
      TherapySession: {
        count: therapySessionMetrics.length,
        averageResponseTime: this.calculateAverage(therapySessionMetrics.map(m => m.duration)),
        slowRequestCount: therapySessionMetrics.filter(m => m.duration > this.SLOW_API_THRESHOLD).length
      },
      performance_difference: {
        response_time_ratio: sessionMetrics.length > 0 && therapySessionMetrics.length > 0
          ? this.calculateAverage(sessionMetrics.map(m => m.duration)) / 
            this.calculateAverage(therapySessionMetrics.map(m => m.duration))
          : null
      }
    };
  }

  // Record slow API in Redis for alerting
  private async recordSlowApi(metric: PerformanceMetric): Promise<void> {
    try {
      const key = `slow-api:${Date.now()}`;
      const data = {
        endpoint: metric.endpoint,
        method: metric.method,
        duration: metric.duration,
        statusCode: metric.statusCode,
        sessionModel: metric.sessionModel,
        userId: metric.userId,
        timestamp: metric.timestamp.toISOString()
      };

      await redis.set(key, JSON.stringify(data), 'EX', 3600); // 1 hour expiry
    } catch (error) {
      console.error('[PerformanceMonitor] Failed to record slow API:', error);
    }
  }

  // Get memory usage statistics
  private getMemoryUsage() {
    const memUsage = process.memoryUsage();
    return {
      used: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) // MB
    };
  }

  // Calculate average from array of numbers
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return Math.round(numbers.reduce((sum, num) => sum + num, 0) / numbers.length);
  }

  // Get model usage statistics
  private getModelUsageStats(metrics: DatabaseMetrics[]) {
    const usage: Record<string, number> = {};
    metrics.forEach(m => {
      usage[m.model] = (usage[m.model] || 0) + 1;
    });
    return usage;
  }

  // Trim metrics to prevent memory leaks
  private trimMetrics(): void {
    if (this.metrics.length > this.MAX_METRICS_IN_MEMORY) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_IN_MEMORY);
    }
  }

  // Trim database metrics to prevent memory leaks
  private trimDbMetrics(): void {
    if (this.dbMetrics.length > this.MAX_METRICS_IN_MEMORY) {
      this.dbMetrics = this.dbMetrics.slice(-this.MAX_METRICS_IN_MEMORY);
    }
  }

  // Check for performance anomalies
  async checkPerformanceAnomalies(): Promise<{
    hasAnomalies: boolean;
    anomalies: Array<{
      type: string;
      message: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      data?: any;
    }>;
  }> {
    const summary = this.getPerformanceSummary();
    const anomalies = [];

    // Check for high error rate
    if (summary.api.errorRate > 0.1) { // 10% error rate
      anomalies.push({
        type: 'high_error_rate',
        message: `High API error rate: ${(summary.api.errorRate * 100).toFixed(1)}%`,
        severity: summary.api.errorRate > 0.25 ? 'critical' : 'high' as const,
        data: { errorRate: summary.api.errorRate }
      });
    }

    // Check for slow API responses
    if (summary.api.averageResponseTime > this.SLOW_API_THRESHOLD) {
      anomalies.push({
        type: 'slow_api_responses',
        message: `Slow average API response time: ${summary.api.averageResponseTime}ms`,
        severity: summary.api.averageResponseTime > this.SLOW_API_THRESHOLD * 2 ? 'critical' : 'high' as const,
        data: { averageResponseTime: summary.api.averageResponseTime }
      });
    }

    // Check for excessive slow queries
    const slowQueryRate = summary.database.totalQueries > 0 
      ? summary.database.slowQueries / summary.database.totalQueries 
      : 0;
    
    if (slowQueryRate > 0.1) { // 10% slow query rate
      anomalies.push({
        type: 'excessive_slow_queries',
        message: `High slow query rate: ${(slowQueryRate * 100).toFixed(1)}%`,
        severity: slowQueryRate > 0.25 ? 'critical' : 'medium' as const,
        data: { slowQueryRate, totalQueries: summary.database.totalQueries }
      });
    }

    // Check memory usage
    if (summary.memory.heapUsed > 512) { // 512MB heap usage
      anomalies.push({
        type: 'high_memory_usage',
        message: `High memory usage: ${summary.memory.heapUsed}MB`,
        severity: summary.memory.heapUsed > 1024 ? 'critical' : 'medium' as const,
        data: summary.memory
      });
    }

    return {
      hasAnomalies: anomalies.length > 0,
      anomalies
    };
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export middleware for Next.js API routes
export function withPerformanceTracking(
  handler: (req: any, res: any) => Promise<any>,
  options?: { sessionModel?: 'Session' | 'TherapySession' }
) {
  return async (req: any, res: any) => {
    const startTime = Date.now();
    const endpoint = req.url || 'unknown';
    const method = req.method || 'GET';
    
    let statusCode = 200;
    let userId: string | undefined;

    try {
      // Extract user ID if available
      const session = req.session || req.user;
      userId = session?.user?.id || session?.id;

      const result = await handler(req, res);
      
      // Get status code from response
      statusCode = res.statusCode || 200;
      
      return result;
    } catch (error) {
      statusCode = 500;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      
      // Track the performance asynchronously
      performanceMonitor.trackApiPerformance(
        endpoint,
        method,
        duration,
        statusCode,
        {
          sessionModel: options?.sessionModel,
          userId
        }
      ).catch(err => {
        console.error('[PerformanceMonitor] Failed to track API performance:', err);
      });
    }
  };
}