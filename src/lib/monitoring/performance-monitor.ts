// Performance monitoring for production
import { profileCache } from '@/lib/cache/profile-cache'

interface PerformanceMetrics {
  pageLoad: {
    ttfb: number
    fcp: number
    lcp: number
    fid: number
    cls: number
  }
  api: {
    [endpoint: string]: {
      count: number
      totalDuration: number
      avgDuration: number
      minDuration: number
      maxDuration: number
      errors: number
      lastError?: string
      lastMeasured: number
    }
  }
  database: {
    queryCount: number
    slowQueries: number
    avgQueryTime: number
    connectionPoolUsage: number
  }
  cache: {
    hits: number
    misses: number
    hitRate: number
    redisAvailable: boolean
  }
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    pageLoad: {
      ttfb: 0,
      fcp: 0,
      lcp: 0,
      fid: 0,
      cls: 0
    },
    api: {},
    database: {
      queryCount: 0,
      slowQueries: 0,
      avgQueryTime: 0,
      connectionPoolUsage: 0
    },
    cache: {
      hits: 0,
      misses: 0,
      hitRate: 0,
      redisAvailable: true
    }
  }

  private readonly SLOW_API_THRESHOLD = 1000 // 1 second
  private readonly SLOW_QUERY_THRESHOLD = 100 // 100ms
  private readonly METRICS_CACHE_KEY = 'performance:metrics'
  private readonly METRICS_TTL = 60 * 60 * 1000 // 1 hour

  constructor() {
    // Load persisted metrics on startup
    this.loadPersistedMetrics()
    
    // Persist metrics periodically
    if (typeof window === 'undefined') { // Server-side only
      setInterval(() => {
        this.persistMetrics()
      }, 5 * 60 * 1000) // Every 5 minutes
    }
  }

  // Track API performance
  async trackApiCall(endpoint: string, duration: number, error?: Error) {
    if (!this.metrics.api[endpoint]) {
      this.metrics.api[endpoint] = {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errors: 0,
        lastMeasured: Date.now()
      }
    }

    const metric = this.metrics.api[endpoint]
    metric.count++
    metric.totalDuration += duration
    metric.avgDuration = metric.totalDuration / metric.count
    metric.minDuration = Math.min(metric.minDuration, duration)
    metric.maxDuration = Math.max(metric.maxDuration, duration)
    metric.lastMeasured = Date.now()

    if (error) {
      metric.errors++
      metric.lastError = error.message
    }

    // Alert if API is slow
    if (duration > this.SLOW_API_THRESHOLD) {
      console.warn(`[Performance] Slow API call to ${endpoint}: ${duration}ms`)
      this.sendAlert('slow_api', {
        endpoint,
        duration,
        threshold: this.SLOW_API_THRESHOLD
      })
    }

    // Alert if error rate is high
    const errorRate = metric.errors / metric.count
    if (errorRate > 0.1 && metric.count > 10) { // 10% error rate
      this.sendAlert('high_error_rate', {
        endpoint,
        errorRate,
        errors: metric.errors,
        total: metric.count
      })
    }
  }

  // Track database performance
  trackDatabaseQuery(duration: number, queryType?: string) {
    this.metrics.database.queryCount++
    
    if (duration > this.SLOW_QUERY_THRESHOLD) {
      this.metrics.database.slowQueries++
    }

    // Update average query time
    const totalTime = this.metrics.database.avgQueryTime * (this.metrics.database.queryCount - 1) + duration
    this.metrics.database.avgQueryTime = totalTime / this.metrics.database.queryCount

    // Alert if too many slow queries
    const slowQueryRate = this.metrics.database.slowQueries / this.metrics.database.queryCount
    if (slowQueryRate > 0.2 && this.metrics.database.queryCount > 50) { // 20% slow queries
      this.sendAlert('high_slow_query_rate', {
        slowQueries: this.metrics.database.slowQueries,
        totalQueries: this.metrics.database.queryCount,
        rate: slowQueryRate
      })
    }
  }

  // Track cache performance
  trackCacheAccess(hit: boolean) {
    if (hit) {
      this.metrics.cache.hits++
    } else {
      this.metrics.cache.misses++
    }
    
    const total = this.metrics.cache.hits + this.metrics.cache.misses
    this.metrics.cache.hitRate = total > 0 ? this.metrics.cache.hits / total : 0

    // Alert if cache hit rate is low
    if (this.metrics.cache.hitRate < 0.5 && total > 100) { // Less than 50% hit rate
      this.sendAlert('low_cache_hit_rate', {
        hitRate: this.metrics.cache.hitRate,
        hits: this.metrics.cache.hits,
        misses: this.metrics.cache.misses
      })
    }
  }

  // Track page load metrics (client-side)
  trackWebVitals(metrics: Partial<PerformanceMetrics['pageLoad']>) {
    Object.assign(this.metrics.pageLoad, metrics)

    // Alert if core web vitals are poor
    if (metrics.lcp && metrics.lcp > 2500) { // LCP > 2.5s
      this.sendAlert('poor_lcp', { lcp: metrics.lcp })
    }
    
    if (metrics.fid && metrics.fid > 100) { // FID > 100ms
      this.sendAlert('poor_fid', { fid: metrics.fid })
    }
    
    if (metrics.cls && metrics.cls > 0.1) { // CLS > 0.1
      this.sendAlert('poor_cls', { cls: metrics.cls })
    }
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    return JSON.parse(JSON.stringify(this.metrics)) // Deep clone
  }

  // Get health status
  getHealthStatus() {
    const apiHealth = this.calculateApiHealth()
    const dbHealth = this.calculateDatabaseHealth()
    const cacheHealth = this.calculateCacheHealth()
    
    const overallHealth = (apiHealth + dbHealth + cacheHealth) / 3

    return {
      status: overallHealth > 0.8 ? 'healthy' : overallHealth > 0.5 ? 'degraded' : 'unhealthy',
      score: overallHealth,
      components: {
        api: { score: apiHealth, status: this.getStatusFromScore(apiHealth) },
        database: { score: dbHealth, status: this.getStatusFromScore(dbHealth) },
        cache: { score: cacheHealth, status: this.getStatusFromScore(cacheHealth) }
      },
      alerts: this.getActiveAlerts()
    }
  }

  private calculateApiHealth(): number {
    const endpoints = Object.values(this.metrics.api)
    if (endpoints.length === 0) return 1

    let score = 1
    
    // Deduct for slow APIs
    const avgResponseTime = endpoints.reduce((sum, e) => sum + e.avgDuration, 0) / endpoints.length
    if (avgResponseTime > 500) score -= 0.2
    if (avgResponseTime > 1000) score -= 0.3
    
    // Deduct for errors
    const totalErrors = endpoints.reduce((sum, e) => sum + e.errors, 0)
    const totalCalls = endpoints.reduce((sum, e) => sum + e.count, 0)
    const errorRate = totalCalls > 0 ? totalErrors / totalCalls : 0
    score -= errorRate * 0.5

    return Math.max(0, score)
  }

  private calculateDatabaseHealth(): number {
    let score = 1
    
    // Deduct for slow queries
    const slowQueryRate = this.metrics.database.queryCount > 0 
      ? this.metrics.database.slowQueries / this.metrics.database.queryCount 
      : 0
    score -= slowQueryRate * 0.5
    
    // Deduct for high average query time
    if (this.metrics.database.avgQueryTime > 50) score -= 0.2
    if (this.metrics.database.avgQueryTime > 100) score -= 0.3

    return Math.max(0, score)
  }

  private calculateCacheHealth(): number {
    let score = 1
    
    // Deduct for low hit rate
    if (this.metrics.cache.hitRate < 0.8) score -= 0.2
    if (this.metrics.cache.hitRate < 0.5) score -= 0.3
    
    // Deduct if Redis is unavailable
    if (!this.metrics.cache.redisAvailable) score -= 0.3

    return Math.max(0, score)
  }

  private getStatusFromScore(score: number): string {
    if (score > 0.8) return 'healthy'
    if (score > 0.5) return 'degraded'
    return 'unhealthy'
  }

  private activeAlerts: Map<string, any> = new Map()

  private sendAlert(type: string, data: any) {
    const alert = {
      type,
      data,
      timestamp: Date.now(),
      id: `${type}_${Date.now()}`
    }
    
    this.activeAlerts.set(alert.id, alert)
    
    // Remove old alerts
    for (const [id, alert] of this.activeAlerts) {
      if (Date.now() - alert.timestamp > 5 * 60 * 1000) { // 5 minutes
        this.activeAlerts.delete(id)
      }
    }

    // Log alert
    console.error(`[Performance Alert] ${type}:`, data)
    
    // Send to monitoring service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureMessage(`Performance Alert: ${type}`, {
        level: 'warning',
        extra: data
      })
    }
  }

  private getActiveAlerts() {
    return Array.from(this.activeAlerts.values())
      .filter(alert => Date.now() - alert.timestamp < 5 * 60 * 1000)
  }

  private async loadPersistedMetrics() {
    try {
      const cached = await profileCache.get(this.METRICS_CACHE_KEY)
      if (cached) {
        this.metrics = cached
        console.log('[Performance] Loaded persisted metrics')
      }
    } catch (error) {
      console.error('[Performance] Error loading persisted metrics:', error)
    }
  }

  private async persistMetrics() {
    try {
      await profileCache.set(this.METRICS_CACHE_KEY, this.metrics, this.METRICS_TTL)
      console.log('[Performance] Persisted metrics')
    } catch (error) {
      console.error('[Performance] Error persisting metrics:', error)
    }
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Helper functions for easy tracking
export function trackApiPerformance(endpoint: string, fn: () => Promise<any>) {
  return async () => {
    const start = Date.now()
    let error: Error | undefined
    
    try {
      const result = await fn()
      return result
    } catch (e) {
      error = e as Error
      throw e
    } finally {
      const duration = Date.now() - start
      performanceMonitor.trackApiCall(endpoint, duration, error)
    }
  }
}

// Middleware for API routes
export function withPerformanceTracking(handler: Function) {
  return async (req: Request, ...args: any[]) => {
    const start = Date.now()
    const endpoint = new URL(req.url).pathname
    let error: Error | undefined
    
    try {
      const result = await handler(req, ...args)
      return result
    } catch (e) {
      error = e as Error
      throw e
    } finally {
      const duration = Date.now() - start
      performanceMonitor.trackApiCall(endpoint, duration, error)
    }
  }
}