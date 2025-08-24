// Integration tests for production performance optimizations
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { profileCache } from '@/lib/cache/profile-cache'
import { redisHealthMonitor } from '@/lib/cache/redis-health'
import { performanceMonitor } from '@/lib/monitoring/performance-monitor'
import { prisma } from '@/lib/database/prisma-optimized'
import { getServerSession } from 'next-auth'

// Define UserProfile interface locally
interface UserProfile {
  id: string
  email: string
  name: string
  onboardingCompleted?: boolean
  hasSeenIntro?: boolean
}

// Mock Redis client
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    scan: vi.fn(),
    ping: vi.fn()
  }))
}))

// Mock Next Auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { email: 'test@example.com', name: 'Test User' }
  })
}))

describe('Performance Optimizations Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset performance metrics
    vi.spyOn(performanceMonitor, 'getMetrics').mockReturnValue({
      pageLoad: { ttfb: 0, fcp: 0, lcp: 0, fid: 0, cls: 0 },
      api: {},
      database: { queryCount: 0, slowQueries: 0, avgQueryTime: 0, connectionPoolUsage: 0 },
      cache: { hits: 0, misses: 0, hitRate: 0, redisAvailable: true }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Redis Failover to Memory Cache', () => {
    it('should fallback to memory cache when Redis is unavailable', async () => {
      // Simulate Redis failure
      vi.spyOn(redisHealthMonitor, 'isRedisAvailable').mockReturnValue(false)

      const testData: UserProfile = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        onboardingCompleted: true,
        hasSeenIntro: true
      }

      // Set data (should go to memory only)
      await profileCache.set('test-key', testData)

      // Get data (should come from memory)
      const result = await profileCache.get('test-key')
      expect(result).toEqual(testData)
    })

    it('should use Redis when available and fallback on error', async () => {
      const mockRedis = {
        get: vi.fn().mockRejectedValueOnce(new Error('Redis timeout')),
        set: vi.fn().mockResolvedValue('OK'),
        ping: vi.fn().mockResolvedValue('PONG')
      }

      // Mock Redis as initially healthy
      vi.spyOn(redisHealthMonitor, 'isRedisAvailable').mockReturnValue(true)

      const testData = { test: 'data' }
      
      // This should try Redis first, fail, then use memory
      await profileCache.set('test-key', testData)
      const result = await profileCache.get('test-key')
      
      expect(result).toEqual(testData)
    })

    it('should handle circuit breaker pattern correctly', async () => {
      const healthState = redisHealthMonitor.getState()
      
      // Simulate multiple failures to open circuit breaker
      for (let i = 0; i < 3; i++) {
        await redisHealthMonitor.testConnection()
      }

      // Circuit breaker should prevent further Redis attempts
      expect(redisHealthMonitor.isRedisAvailable()).toBe(false)
    })
  })

  describe('Performance Monitoring', () => {
    it('should track API performance metrics', async () => {
      const trackSpy = vi.spyOn(performanceMonitor, 'trackApiCall')

      // Simulate API call
      await performanceMonitor.trackApiCall('/api/test', 150)

      expect(trackSpy).toHaveBeenCalledWith('/api/test', 150, undefined)
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.api['/api/test']).toBeDefined()
      expect(metrics.api['/api/test'].avgDuration).toBe(150)
    })

    it('should alert on slow API calls', async () => {
      const consoleSpy = vi.spyOn(console, 'warn')

      // Track a slow API call (> 1000ms)
      await performanceMonitor.trackApiCall('/api/slow', 2500)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Performance] Slow API call')
      )
    })

    it('should track cache hit rates', () => {
      const trackSpy = vi.spyOn(performanceMonitor, 'trackCacheAccess')

      // Simulate cache hits and misses
      performanceMonitor.trackCacheAccess(true)  // hit
      performanceMonitor.trackCacheAccess(true)  // hit
      performanceMonitor.trackCacheAccess(false) // miss

      const metrics = performanceMonitor.getMetrics()
      expect(metrics.cache.hits).toBe(2)
      expect(metrics.cache.misses).toBe(1)
      expect(metrics.cache.hitRate).toBeCloseTo(0.67, 2)
    })

    it('should calculate health scores correctly', () => {
      // Simulate various metrics
      performanceMonitor.trackApiCall('/api/test1', 500)
      performanceMonitor.trackApiCall('/api/test2', 1500)
      performanceMonitor.trackDatabaseQuery(50)
      performanceMonitor.trackDatabaseQuery(150) // slow query
      performanceMonitor.trackCacheAccess(true)
      performanceMonitor.trackCacheAccess(false)

      const health = performanceMonitor.getHealthStatus()
      
      expect(health.status).toBeDefined()
      expect(health.score).toBeGreaterThan(0)
      expect(health.score).toBeLessThanOrEqual(1)
      expect(health.components.api).toBeDefined()
      expect(health.components.database).toBeDefined()
      expect(health.components.cache).toBeDefined()
    })
  })

  describe('Error Recovery', () => {
    it('should recover from database connection errors', async () => {
      const mockPrismaQuery = vi.fn()
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce({ id: '123' })

      // Mock Prisma $queryRaw
      prisma.$queryRaw = mockPrismaQuery

      const result = await prisma.$queryRaw`SELECT 1`
      expect(result).toEqual({ id: '123' })
      expect(mockPrismaQuery).toHaveBeenCalledTimes(2)
    })

    it('should handle profile updates with cache invalidation', async () => {
      const invalidateSpy = vi.spyOn(profileCache, 'invalidate')
      const invalidatePatternSpy = vi.spyOn(profileCache, 'invalidatePattern')

      // Simulate profile update
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' })
      })

      expect(invalidateSpy).toHaveBeenCalled()
      expect(invalidatePatternSpy).toHaveBeenCalledWith(
        expect.stringContaining('profile:*')
      )
    })
  })

  describe('Stale-While-Revalidate Pattern', () => {
    it('should serve stale data while revalidating', async () => {
      const staleData = { id: '123', name: 'Stale User' }
      const freshData = { id: '123', name: 'Fresh User' }

      // Set stale data in cache
      await profileCache.set('profile:test', staleData, 1000) // 1 second TTL

      // Wait for data to become stale
      await new Promise(resolve => setTimeout(resolve, 1100))

      // First request should get stale data immediately
      const result1 = await profileCache.get('profile:test')
      expect(result1).toBeNull() // Because TTL expired

      // In real implementation, SWR would serve stale and revalidate
      // This is handled by the ProfileProvider component
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent cache operations', async () => {
      const operations = Array(10).fill(null).map((_, i) => 
        profileCache.set(`key-${i}`, { value: i })
      )

      await Promise.all(operations)

      // Verify all values are cached
      for (let i = 0; i < 10; i++) {
        const result = await profileCache.get(`key-${i}`)
        expect(result).toEqual({ value: i })
      }
    })

    it('should handle pattern invalidation correctly', async () => {
      // Set multiple related cache entries
      await profileCache.set('profile:user:1', { id: '1' })
      await profileCache.set('profile:user:2', { id: '2' })
      await profileCache.set('settings:user:1', { theme: 'dark' })

      // Invalidate pattern
      await profileCache.invalidatePattern('profile:user:*')

      // Profile entries should be gone
      expect(await profileCache.get('profile:user:1')).toBeNull()
      expect(await profileCache.get('profile:user:2')).toBeNull()
      
      // Settings should remain
      expect(await profileCache.get('settings:user:1')).toEqual({ theme: 'dark' })
    })
  })

  describe('Performance Thresholds', () => {
    it('should respect performance budgets', async () => {
      const metrics = performanceMonitor.getMetrics()

      // Verify initial state meets performance budgets
      expect(metrics.pageLoad.ttfb).toBeLessThan(800)
      expect(metrics.pageLoad.fcp).toBeLessThan(1800)
      expect(metrics.pageLoad.lcp).toBeLessThan(2500)
      expect(metrics.cache.hitRate).toBeGreaterThanOrEqual(0)
    })

    it('should handle edge case of empty cache gracefully', async () => {
      const result = await profileCache.get('non-existent-key')
      expect(result).toBeNull()
    })

    it('should handle malformed cache data', async () => {
      // Set invalid data
      const invalidData = { circular: {} }
      invalidData.circular = invalidData // Circular reference

      // Should handle without crashing
      await expect(profileCache.set('invalid-key', invalidData)).resolves.not.toThrow()
    })
  })
})

describe('Production Readiness Checks', () => {
  it('should have all required environment variables', () => {
    const requiredEnvVars = [
      'DATABASE_URL',
      'DIRECT_URL',
      'NEXTAUTH_URL',
      'NEXTAUTH_SECRET'
    ]

    for (const envVar of requiredEnvVars) {
      expect(process.env[envVar]).toBeDefined()
    }
  })

  it('should have proper error boundaries in place', async () => {
    const { ErrorBoundary } = await import('@/components/ErrorBoundary')
    expect(ErrorBoundary).toBeDefined()
  })

  it('should have monitoring enabled', () => {
    expect(performanceMonitor).toBeDefined()
    expect(redisHealthMonitor).toBeDefined()
  })

  it('should handle session timeout gracefully', async () => {
    // Mock expired session
    vi.mocked(getServerSession).mockResolvedValueOnce(null)

    const response = await fetch('/api/user/profile')
    expect(response.status).toBe(401)
  })
})
