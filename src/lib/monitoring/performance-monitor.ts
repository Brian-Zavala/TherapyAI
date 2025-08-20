// Performance monitoring and alerting system
import { setCache, getCached } from '@/lib/cache/redis-connection-pool'

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  metadata?: Record<string, any>
}

interface PerformanceThresholds {
  redis: number        // 100ms
  database: number     // 200ms
  api: number         // 500ms
  auth: number        // 1000ms
  ttfb: number        // 2000ms
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private thresholds: PerformanceThresholds = {
    redis: 100,
    database: 200,
    api: 500,
    auth: 1000,
    ttfb: 2000
  }

  // Track performance metric
  async track(name: string, value: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata
    }

    this.metrics.push(metric)

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }

    // Check thresholds and alert
    await this.checkThresholds(metric)

    // Store in Redis for persistence (async)
    this.storeMetricAsync(metric)
  }

  // Start timing operation
  startTimer(name: string): () => Promise<void> {
    const startTime = Date.now()
    
    return async (metadata?: Record<string, any>) => {
      const duration = Date.now() - startTime
      await this.track(name, duration, metadata)
    }
  }

  // Decorator for timing functions
  time<T extends (...args: any[]) => Promise<any>>(
    name: string,
    fn: T
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      const timer = this.startTimer(name)
      try {
        const result = await fn(...args)
        await timer({ success: true })
        return result
      } catch (error) {
        await timer({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
        throw error
      }
    }
  }

  // Check performance thresholds
  private async checkThresholds(metric: PerformanceMetric) {
    const category = this.getCategoryFromName(metric.name)
    const threshold = this.thresholds[category as keyof PerformanceThresholds]
    
    if (threshold && metric.value > threshold) {
      await this.alert({
        type: 'threshold_exceeded',
        metric: metric.name,
        value: metric.value,
        threshold,
        severity: this.getSeverity(metric.value, threshold),
        timestamp: metric.timestamp,
        metadata: metric.metadata
      })
    }
  }

  // Get performance category from metric name
  private getCategoryFromName(name: string): string {
    if (name.includes('redis')) return 'redis'
    if (name.includes('database') || name.includes('query')) return 'database'
    if (name.includes('auth') || name.includes('session')) return 'auth'
    if (name.includes('ttfb')) return 'ttfb'
    return 'api'
  }

  // Determine alert severity
  private getSeverity(value: number, threshold: number): 'warning' | 'critical' {
    return value > threshold * 2 ? 'critical' : 'warning'
  }

  // Send performance alert
  private async alert(alert: {
    type: string
    metric: string
    value: number
    threshold: number
    severity: 'warning' | 'critical'
    timestamp: number
    metadata?: Record<string, any>
  }) {
    console.warn(`🚨 [Performance Alert] ${alert.severity.toUpperCase()}:`, {
      metric: alert.metric,
      value: `${alert.value}ms`,
      threshold: `${alert.threshold}ms`,
      excess: `${alert.value - alert.threshold}ms over threshold`,
      timestamp: new Date(alert.timestamp).toISOString()
    })

    // Store alert for dashboard
    const alertKey = `alerts:performance:${Date.now()}`
    await setCache(alertKey, alert, 86400) // 24 hours
  }

  // Store metric asynchronously
  private storeMetricAsync(metric: PerformanceMetric) {
    setImmediate(async () => {
      try {
        const key = `metrics:${metric.name}:${Math.floor(metric.timestamp / 60000)}` // Per minute
        const existing = await getCached(key, async () => [], 60)
        existing.push(metric)
        await setCache(key, existing, 3600) // 1 hour TTL
      } catch (error) {
        console.error('[PerformanceMonitor] Failed to store metric:', error)
      }
    })
  }

  // Get performance stats
  async getStats(timeRange: number = 3600000): Promise<{
    averages: Record<string, number>
    counts: Record<string, number>
    p95: Record<string, number>
    violations: number
    alerts: any[]
  }> {
    const cutoff = Date.now() - timeRange
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff)

    const stats = {
      averages: {} as Record<string, number>,
      counts: {} as Record<string, number>,
      p95: {} as Record<string, number>,
      violations: 0,
      alerts: []
    }

    // Group by metric name
    const grouped = recentMetrics.reduce((acc, metric) => {
      if (!acc[metric.name]) acc[metric.name] = []
      acc[metric.name].push(metric.value)
      return acc
    }, {} as Record<string, number[]>)

    // Calculate stats for each metric
    Object.entries(grouped).forEach(([name, values]) => {
      stats.counts[name] = values.length
      stats.averages[name] = values.reduce((a, b) => a + b, 0) / values.length
      
      // P95 calculation
      const sorted = values.sort((a, b) => a - b)
      const p95Index = Math.floor(sorted.length * 0.95)
      stats.p95[name] = sorted[p95Index] || 0

      // Count threshold violations
      const category = this.getCategoryFromName(name)
      const threshold = this.thresholds[category as keyof PerformanceThresholds]
      if (threshold) {
        stats.violations += values.filter(v => v > threshold).length
      }
    })

    return stats
  }

  // Health check for performance
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'critical'
    metrics: Record<string, any>
    recommendations: string[]
  }> {
    const stats = await this.getStats(300000) // 5 minutes
    const recommendations: string[] = []
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy'

    // Check Redis performance
    if (stats.averages['redis'] > this.thresholds.redis) {
      status = 'degraded'
      recommendations.push('Redis latency is high - check connection pool')
    }

    // Check database performance
    if (stats.averages['database'] > this.thresholds.database) {
      status = 'degraded'
      recommendations.push('Database queries are slow - review indexes and query optimization')
    }

    // Check API performance
    const apiMetrics = Object.entries(stats.averages).filter(([name]) => 
      this.getCategoryFromName(name) === 'api'
    )
    const avgApiTime = apiMetrics.reduce((sum, [, value]) => sum + value, 0) / apiMetrics.length
    
    if (avgApiTime > this.thresholds.api) {
      status = status === 'healthy' ? 'degraded' : 'critical'
      recommendations.push('API response times are slow - optimize routes and add caching')
    }

    // Check violations
    if (stats.violations > 10) {
      status = 'critical'
      recommendations.push('High number of performance violations - immediate attention required')
    }

    return {
      status,
      metrics: {
        averageResponseTimes: stats.averages,
        p95ResponseTimes: stats.p95,
        totalViolations: stats.violations,
        requestCounts: stats.counts
      },
      recommendations
    }
  }

  // Reset metrics (for testing)
  reset() {
    this.metrics = []
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Convenience functions
export function trackPerformance(name: string, value: number, metadata?: Record<string, any>) {
  return performanceMonitor.track(name, value, metadata)
}

export function startTimer(name: string) {
  return performanceMonitor.startTimer(name)
}

export function timeFunction<T extends (...args: any[]) => Promise<any>>(name: string, fn: T) {
  return performanceMonitor.time(name, fn)
}

// Middleware helper for API routes
export function withPerformanceTracking(routeName: string) {
  return function<T extends (...args: any[]) => Promise<any>>(handler: T): T {
    return performanceMonitor.time(`api:${routeName}`, handler) as T
  }
}