// Tests for performance monitoring and alerting
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { performanceMonitor } from '@/lib/monitoring/performance-monitor'
import { profileCache } from '@/lib/cache/profile-cache'

// Mock profile cache
vi.mock('@/lib/cache/profile-cache', () => ({
  profileCache: {
    get: vi.fn(),
    set: vi.fn()
  }
}))

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    // Reset console mocks
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('API Performance Tracking', () => {
    it('should track API call metrics', async () => {
      await performanceMonitor.trackApiCall('/api/test', 250)
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.api['/api/test']).toBeDefined()
      expect(metrics.api['/api/test'].count).toBe(1)
      expect(metrics.api['/api/test'].avgDuration).toBe(250)
      expect(metrics.api['/api/test'].minDuration).toBe(250)
      expect(metrics.api['/api/test'].maxDuration).toBe(250)
      expect(metrics.api['/api/test'].errors).toBe(0)
    })

    it('should calculate average duration correctly', async () => {
      await performanceMonitor.trackApiCall('/api/test', 100)
      await performanceMonitor.trackApiCall('/api/test', 200)
      await performanceMonitor.trackApiCall('/api/test', 300)
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.api['/api/test'].count).toBe(3)
      expect(metrics.api['/api/test'].avgDuration).toBe(200)
      expect(metrics.api['/api/test'].minDuration).toBe(100)
      expect(metrics.api['/api/test'].maxDuration).toBe(300)
    })

    it('should track API errors', async () => {
      const error = new Error('API Error')
      await performanceMonitor.trackApiCall('/api/test', 150, error)
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.api['/api/test'].errors).toBe(1)
      expect(metrics.api['/api/test'].lastError).toBe('API Error')
    })

    it('should alert on slow API calls', async () => {
      const warnSpy = vi.spyOn(console, 'warn')
      const errorSpy = vi.spyOn(console, 'error')
      
      await performanceMonitor.trackApiCall('/api/slow', 1500) // > 1000ms threshold
      
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Performance] Slow API call to /api/slow: 1500ms')
      )
      expect(errorSpy).toHaveBeenCalledWith(
        '[Performance Alert] slow_api:',
        expect.objectContaining({
          endpoint: '/api/slow',
          duration: 1500,
          threshold: 1000
        })
      )
    })

    it('should alert on high error rate', async () => {
      const errorSpy = vi.spyOn(console, 'error')
      
      // Create enough calls to trigger error rate alert
      for (let i = 0; i < 15; i++) {
        if (i < 3) {
          // 3 errors out of 15 calls = 20% error rate
          await performanceMonitor.trackApiCall('/api/test', 100, new Error('Test error'))
        } else {
          await performanceMonitor.trackApiCall('/api/test', 100)
        }
      }
      
      expect(errorSpy).toHaveBeenCalledWith(
        '[Performance Alert] high_error_rate:',
        expect.objectContaining({
          endpoint: '/api/test',
          errorRate: 0.2,
          errors: 3,
          total: 15
        })
      )
    })
  })

  describe('Database Performance Tracking', () => {
    it('should track database query metrics', () => {
      performanceMonitor.trackDatabaseQuery(50)
      performanceMonitor.trackDatabaseQuery(75)
      performanceMonitor.trackDatabaseQuery(125) // slow query
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.database.queryCount).toBe(3)
      expect(metrics.database.slowQueries).toBe(1)
      expect(metrics.database.avgQueryTime).toBe(250 / 3)
    })

    it('should alert on high slow query rate', () => {
      const errorSpy = vi.spyOn(console, 'error')
      
      // Create enough queries to trigger alert
      for (let i = 0; i < 60; i++) {
        if (i < 15) {
          // 15 slow queries out of 60 = 25% slow query rate
          performanceMonitor.trackDatabaseQuery(150)
        } else {
          performanceMonitor.trackDatabaseQuery(50)
        }
      }
      
      expect(errorSpy).toHaveBeenCalledWith(
        '[Performance Alert] high_slow_query_rate:',
        expect.objectContaining({
          slowQueries: 15,
          totalQueries: 60,
          rate: 0.25
        })
      )
    })
  })

  describe('Cache Performance Tracking', () => {
    it('should track cache hit/miss metrics', () => {
      performanceMonitor.trackCacheAccess(true)  // hit
      performanceMonitor.trackCacheAccess(true)  // hit
      performanceMonitor.trackCacheAccess(false) // miss
      performanceMonitor.trackCacheAccess(true)  // hit
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.cache.hits).toBe(3)
      expect(metrics.cache.misses).toBe(1)
      expect(metrics.cache.hitRate).toBe(0.75)
    })

    it('should alert on low cache hit rate', () => {
      const errorSpy = vi.spyOn(console, 'error')
      
      // Create enough accesses to trigger alert
      for (let i = 0; i < 120; i++) {
        if (i < 40) {
          // 40 hits out of 120 = 33% hit rate
          performanceMonitor.trackCacheAccess(true)
        } else {
          performanceMonitor.trackCacheAccess(false)
        }
      }
      
      expect(errorSpy).toHaveBeenCalledWith(
        '[Performance Alert] low_cache_hit_rate:',
        expect.objectContaining({
          hitRate: 40 / 120,
          hits: 40,
          misses: 80
        })
      )
    })

    it('should handle zero cache accesses', () => {
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.cache.hitRate).toBe(0)
    })
  })

  describe('Web Vitals Tracking', () => {
    it('should track page load metrics', () => {
      performanceMonitor.trackWebVitals({
        ttfb: 500,
        fcp: 1200,
        lcp: 2000,
        fid: 50,
        cls: 0.05
      })
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.pageLoad.ttfb).toBe(500)
      expect(metrics.pageLoad.fcp).toBe(1200)
      expect(metrics.pageLoad.lcp).toBe(2000)
      expect(metrics.pageLoad.fid).toBe(50)
      expect(metrics.pageLoad.cls).toBe(0.05)
    })

    it('should alert on poor LCP', () => {
      const errorSpy = vi.spyOn(console, 'error')
      
      performanceMonitor.trackWebVitals({ lcp: 3000 }) // > 2500ms
      
      expect(errorSpy).toHaveBeenCalledWith(
        '[Performance Alert] poor_lcp:',
        expect.objectContaining({ lcp: 3000 })
      )
    })

    it('should alert on poor FID', () => {
      const errorSpy = vi.spyOn(console, 'error')
      
      performanceMonitor.trackWebVitals({ fid: 150 }) // > 100ms
      
      expect(errorSpy).toHaveBeenCalledWith(
        '[Performance Alert] poor_fid:',
        expect.objectContaining({ fid: 150 })
      )
    })

    it('should alert on poor CLS', () => {
      const errorSpy = vi.spyOn(console, 'error')
      
      performanceMonitor.trackWebVitals({ cls: 0.2 }) // > 0.1
      
      expect(errorSpy).toHaveBeenCalledWith(
        '[Performance Alert] poor_cls:',
        expect.objectContaining({ cls: 0.2 })
      )
    })
  })

  describe('Health Status Calculation', () => {
    it('should calculate overall health status', () => {
      // Set up various metrics
      performanceMonitor.trackApiCall('/api/test', 300)
      performanceMonitor.trackDatabaseQuery(50)
      performanceMonitor.trackCacheAccess(true)
      performanceMonitor.trackCacheAccess(true)
      performanceMonitor.trackCacheAccess(false)
      
      const health = performanceMonitor.getHealthStatus()
      
      expect(health.status).toBeDefined()
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status)
      expect(health.score).toBeGreaterThanOrEqual(0)
      expect(health.score).toBeLessThanOrEqual(1)
      expect(health.components.api).toBeDefined()
      expect(health.components.database).toBeDefined()
      expect(health.components.cache).toBeDefined()
    })

    it('should mark as unhealthy with poor metrics', async () => {
      // Create poor API performance
      for (let i = 0; i < 5; i++) {
        await performanceMonitor.trackApiCall('/api/slow', 2000)
        await performanceMonitor.trackApiCall('/api/error', 500, new Error('Failed'))
      }
      
      // Create poor database performance
      for (let i = 0; i < 10; i++) {
        performanceMonitor.trackDatabaseQuery(200)
      }
      
      // Create poor cache performance
      for (let i = 0; i < 10; i++) {
        performanceMonitor.trackCacheAccess(false)
      }
      
      const health = performanceMonitor.getHealthStatus()
      expect(health.status).toBe('unhealthy')
      expect(health.score).toBeLessThan(0.5)
    })

    it('should mark as healthy with good metrics', () => {
      // Create good API performance
      for (let i = 0; i < 10; i++) {
        performanceMonitor.trackApiCall('/api/fast', 100)
      }
      
      // Create good database performance
      for (let i = 0; i < 10; i++) {
        performanceMonitor.trackDatabaseQuery(20)
      }
      
      // Create good cache performance
      for (let i = 0; i < 10; i++) {
        performanceMonitor.trackCacheAccess(true)
      }
      
      const health = performanceMonitor.getHealthStatus()
      expect(health.status).toBe('healthy')
      expect(health.score).toBeGreaterThan(0.8)
    })
  })

  describe('Alert Management', () => {
    it('should store and retrieve active alerts', async () => {
      // Trigger an alert
      await performanceMonitor.trackApiCall('/api/slow', 1500)
      
      const health = performanceMonitor.getHealthStatus()
      expect(health.alerts.length).toBeGreaterThan(0)
      expect(health.alerts[0].type).toBe('slow_api')
    })

    it('should remove old alerts after 5 minutes', async () => {
      // Trigger an alert
      await performanceMonitor.trackApiCall('/api/slow', 1500)
      
      // Verify alert exists
      let health = performanceMonitor.getHealthStatus()
      expect(health.alerts.length).toBeGreaterThan(0)
      
      // Fast-forward 6 minutes
      vi.advanceTimersByTime(6 * 60 * 1000)
      
      // Trigger another check to clean old alerts
      await performanceMonitor.trackApiCall('/api/test', 100)
      
      // Old alert should be removed
      health = performanceMonitor.getHealthStatus()
      const oldAlerts = health.alerts.filter(a => a.type === 'slow_api')
      expect(oldAlerts.length).toBe(0)
    })
  })

  describe('Persistence', () => {
    it('should persist metrics to cache', async () => {
      const setSpy = vi.spyOn(profileCache, 'set')
      
      // Set some metrics
      performanceMonitor.trackApiCall('/api/test', 100)
      performanceMonitor.trackDatabaseQuery(50)
      performanceMonitor.trackCacheAccess(true)
      
      // Fast-forward to trigger persistence (5 minutes)
      vi.advanceTimersByTime(5 * 60 * 1000)
      
      expect(setSpy).toHaveBeenCalledWith(
        'performance:metrics',
        expect.any(Object),
        60 * 60 * 1000 // 1 hour TTL
      )
    })

    it('should load persisted metrics on startup', async () => {
      const mockMetrics = {
        pageLoad: { ttfb: 100, fcp: 200, lcp: 300, fid: 40, cls: 0.01 },
        api: {
          '/api/test': {
            count: 10,
            totalDuration: 1000,
            avgDuration: 100,
            minDuration: 50,
            maxDuration: 200,
            errors: 1,
            lastMeasured: Date.now()
          }
        },
        database: {
          queryCount: 50,
          slowQueries: 5,
          avgQueryTime: 30,
          connectionPoolUsage: 0.5
        },
        cache: {
          hits: 80,
          misses: 20,
          hitRate: 0.8,
          redisAvailable: true
        }
      }
      
      vi.mocked(profileCache.get).mockResolvedValueOnce(mockMetrics)
      
      // Re-import to trigger constructor
      vi.resetModules()
      const { performanceMonitor: newMonitor } = await import('@/lib/monitoring/performance-monitor')
      
      // Should log that metrics were loaded
      expect(vi.mocked(console.log)).toHaveBeenCalledWith(
        expect.stringContaining('[Performance] Loaded persisted metrics')
      )
    })

    it('should handle persistence errors gracefully', async () => {
      vi.mocked(profileCache.set).mockRejectedValueOnce(new Error('Cache error'))
      
      // Should not throw when persistence fails
      expect(() => {
        vi.advanceTimersByTime(5 * 60 * 1000)
      }).not.toThrow()
      
      expect(vi.mocked(console.error)).toHaveBeenCalledWith(
        expect.stringContaining('[Performance] Error persisting metrics'),
        expect.any(Error)
      )
    })
  })

  describe('Helper Functions', () => {
    it('should wrap functions with performance tracking', async () => {
      const { trackApiPerformance } = await import('@/lib/monitoring/performance-monitor')
      
      const mockFn = vi.fn().mockResolvedValue({ data: 'test' })
      const wrapped = trackApiPerformance('/api/wrapped', mockFn)
      
      const result = await wrapped()
      
      expect(result).toEqual({ data: 'test' })
      expect(mockFn).toHaveBeenCalled()
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.api['/api/wrapped']).toBeDefined()
      expect(metrics.api['/api/wrapped'].count).toBe(1)
    })

    it('should track errors in wrapped functions', async () => {
      const { trackApiPerformance } = await import('@/lib/monitoring/performance-monitor')
      
      const mockFn = vi.fn().mockRejectedValue(new Error('Test error'))
      const wrapped = trackApiPerformance('/api/error', mockFn)
      
      await expect(wrapped()).rejects.toThrow('Test error')
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.api['/api/error'].errors).toBe(1)
      expect(metrics.api['/api/error'].lastError).toBe('Test error')
    })

    it('should work with middleware pattern', async () => {
      const { withPerformanceTracking } = await import('@/lib/monitoring/performance-monitor')
      
      const handler = vi.fn().mockResolvedValue(new Response('OK'))
      const wrapped = withPerformanceTracking(handler)
      
      const req = new Request('http://localhost/api/test')
      const result = await wrapped(req)
      
      expect(result.body).toBeDefined()
      expect(handler).toHaveBeenCalledWith(req)
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.api['/api/test']).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle metrics with no data gracefully', () => {
      const health = performanceMonitor.getHealthStatus()
      
      expect(health.components.api.score).toBe(1) // Perfect score with no data
      expect(health.components.database.score).toBeGreaterThanOrEqual(0)
      expect(health.components.cache.score).toBeGreaterThanOrEqual(0)
    })

    it('should provide deep cloned metrics', () => {
      const metrics1 = performanceMonitor.getMetrics()
      const metrics2 = performanceMonitor.getMetrics()
      
      expect(metrics1).not.toBe(metrics2)
      expect(metrics1).toEqual(metrics2)
      
      // Modifying returned metrics should not affect internal state
      metrics1.database.queryCount = 999
      const metrics3 = performanceMonitor.getMetrics()
      expect(metrics3.database.queryCount).not.toBe(999)
    })

    it('should handle Sentry integration', async () => {
      // Mock Sentry
      (global as any).window = { Sentry: { captureMessage: vi.fn() } }
      
      // Trigger an alert
      await performanceMonitor.trackApiCall('/api/slow', 1500)
      
      expect((global as any).window.Sentry.captureMessage).toHaveBeenCalledWith(
        'Performance Alert: slow_api',
        expect.objectContaining({
          level: 'warning',
          extra: expect.any(Object)
        })
      )
      
      // Cleanup
      delete (global as any).window
    })
  })
})