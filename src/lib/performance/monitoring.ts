/**
 * Performance monitoring utilities
 * Track API response times and database query performance
 */

interface PerformanceMetric {
  route: string;
  duration: number;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private slowQueryThreshold = 500; // ms
  private slowApiThreshold = 1000; // ms

  /**
   * Track API route performance
   */
  trackApiCall(route: string, duration: number, userId?: string, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      route,
      duration,
      timestamp: new Date(),
      userId,
      metadata,
    };

    this.metrics.push(metric);

    // Log slow APIs
    if (duration > this.slowApiThreshold) {
      console.warn(`[Performance] Slow API detected:`, {
        route,
        duration: `${duration}ms`,
        userId,
        ...metadata,
      });
    }

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Track database query performance
   */
  trackQuery(operation: string, duration: number, metadata?: Record<string, any>) {
    if (duration > this.slowQueryThreshold) {
      console.warn(`[Performance] Slow query detected:`, {
        operation,
        duration: `${duration}ms`,
        ...metadata,
      });
    }
  }

  /**
   * Get performance statistics
   */
  getStats(route?: string) {
    const relevantMetrics = route 
      ? this.metrics.filter(m => m.route === route)
      : this.metrics;

    if (relevantMetrics.length === 0) {
      return null;
    }

    const durations = relevantMetrics.map(m => m.duration);
    const sorted = durations.sort((a, b) => a - b);

    return {
      count: durations.length,
      avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      slowCount: durations.filter(d => d > this.slowApiThreshold).length,
    };
  }

  /**
   * Get slow endpoints
   */
  getSlowEndpoints(limit = 10) {
    const endpointStats = new Map<string, { count: number; totalDuration: number }>();

    for (const metric of this.metrics) {
      const existing = endpointStats.get(metric.route) || { count: 0, totalDuration: 0 };
      existing.count++;
      existing.totalDuration += metric.duration;
      endpointStats.set(metric.route, existing);
    }

    return Array.from(endpointStats.entries())
      .map(([route, stats]) => ({
        route,
        avgDuration: Math.round(stats.totalDuration / stats.count),
        count: stats.count,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }

  /**
   * Clear metrics
   */
  clear() {
    this.metrics = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Middleware to track API performance
 */
export function withPerformanceTracking<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  routeName: string
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();
    const request = args[0] as Request;
    
    try {
      const response = await handler(...args);
      const duration = Date.now() - startTime;
      
      // Extract user ID if available
      const userId = request.headers.get('x-user-id') || undefined;
      
      performanceMonitor.trackApiCall(routeName, duration, userId, {
        method: request.method,
        status: response.status,
      });
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      performanceMonitor.trackApiCall(routeName, duration, undefined, {
        method: request.method,
        error: true,
      });
      
      throw error;
    }
  }) as T;
}

/**
 * Track database query performance
 */
export async function trackDatabaseQuery<T>(
  operation: string,
  query: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await query();
    const duration = Date.now() - startTime;
    
    performanceMonitor.trackQuery(operation, duration);
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    performanceMonitor.trackQuery(operation, duration, { error: true });
    
    throw error;
  }
}

/**
 * Performance reporting endpoint data
 */
export function getPerformanceReport() {
  const overallStats = performanceMonitor.getStats();
  const slowEndpoints = performanceMonitor.getSlowEndpoints();
  
  return {
    summary: overallStats,
    slowEndpoints,
    timestamp: new Date(),
  };
}