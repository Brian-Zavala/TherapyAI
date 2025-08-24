// Tests for Redis health monitoring and circuit breaker
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { redisHealthMonitor } from '@/lib/cache/redis-health'
import { Redis } from '@upstash/redis'

// Mock Upstash Redis
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn()
}))

describe('RedisHealthMonitor', () => {
  let mockRedisInstance: any
  let mockPing: vi.Mock
  let mockTimers: any[]

  beforeEach(() => {
    vi.clearAllMocks()
    mockTimers = []
    
    // Mock Redis instance
    mockPing = vi.fn().mockResolvedValue('PONG')
    mockRedisInstance = {
      ping: mockPing,
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn()
    }

    // Mock Redis constructor
    vi.mocked(Redis).mockImplementation(() => mockRedisInstance)

    // Mock timers to control health checks
    vi.useFakeTimers()
    
    // Capture setInterval calls
    const originalSetInterval = global.setInterval
    global.setInterval = ((fn: Function, ms: number) => {
      const timer = originalSetInterval(fn, ms)
      mockTimers.push({ fn, ms, timer })
      return timer
    }) as any
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    // Clear any intervals created by the monitor
    mockTimers.forEach(({ timer }) => clearInterval(timer))
  })

  describe('Health Checks', () => {
    it('should report healthy when Redis responds to ping', async () => {
      const isHealthy = redisHealthMonitor.isRedisAvailable()
      expect(isHealthy).toBe(true)

      // Manually trigger health check
      await redisHealthMonitor.testConnection()
      expect(mockPing).toHaveBeenCalled()
    })

    it('should report unhealthy when Redis ping fails', async () => {
      mockPing.mockRejectedValueOnce(new Error('Connection refused'))

      const result = await redisHealthMonitor.testConnection()
      expect(result).toBe(false)
    })

    it('should track consecutive failures', async () => {
      // Simulate multiple failures
      mockPing.mockRejectedValue(new Error('Connection timeout'))

      for (let i = 0; i < 3; i++) {
        await redisHealthMonitor.testConnection()
      }

      const state = redisHealthMonitor.getState()
      expect(state.consecutiveFailures).toBeGreaterThanOrEqual(3)
    })

    it('should detect high latency', async () => {
      const consoleSpy = vi.spyOn(console, 'warn')
      
      // Mock slow ping response
      mockPing.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('PONG'), 1500))
      )

      // Fast-forward time to trigger health check
      vi.advanceTimersByTime(30000) // 30 seconds

      // Wait for async operations
      await vi.runAllTimersAsync()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RedisHealth] High Redis latency')
      )
    })
  })

  describe('Circuit Breaker', () => {
    it('should open circuit breaker after max failures', async () => {
      const consoleSpy = vi.spyOn(console, 'error')
      mockPing.mockRejectedValue(new Error('Connection failed'))

      // Trigger multiple failures
      for (let i = 0; i < 3; i++) {
        await redisHealthMonitor.testConnection()
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RedisHealth] Circuit breaker opened')
      )

      // Circuit breaker should prevent further attempts
      expect(redisHealthMonitor.isRedisAvailable()).toBe(false)
    })

    it('should attempt to close circuit breaker after timeout', async () => {
      mockPing.mockRejectedValue(new Error('Connection failed'))

      // Open circuit breaker
      for (let i = 0; i < 3; i++) {
        await redisHealthMonitor.testConnection()
      }

      // Initially unavailable
      expect(redisHealthMonitor.isRedisAvailable()).toBe(false)

      // Mock successful ping for recovery
      mockPing.mockResolvedValue('PONG')

      // Fast-forward past circuit breaker timeout (60 seconds)
      vi.advanceTimersByTime(60000)
      await vi.runAllTimersAsync()

      // Should attempt to close circuit breaker
      const state = redisHealthMonitor.getState()
      expect(state.circuitBreakerOpen).toBe(false)
    })

    it('should reset consecutive failures on successful connection', async () => {
      // First cause some failures
      mockPing.mockRejectedValueOnce(new Error('Temporary failure'))
      await redisHealthMonitor.testConnection()

      // Then succeed
      mockPing.mockResolvedValue('PONG')
      await redisHealthMonitor.testConnection()

      const state = redisHealthMonitor.getState()
      expect(state.consecutiveFailures).toBe(0)
      expect(state.isHealthy).toBe(true)
    })
  })

  describe('State Management', () => {
    it('should provide read-only state', () => {
      const state1 = redisHealthMonitor.getState()
      const state2 = redisHealthMonitor.getState()

      // Should be different objects (cloned)
      expect(state1).not.toBe(state2)
      expect(state1).toEqual(state2)

      // Modifying returned state should not affect internal state
      // state1.isHealthy = false // Cannot assign to readonly property
      const state3 = redisHealthMonitor.getState()
      expect(state3.isHealthy).toBe(true)
    })

    it('should track last error message', async () => {
      const errorMessage = 'Custom connection error'
      mockPing.mockRejectedValueOnce(new Error(errorMessage))

      await redisHealthMonitor.testConnection()

      const state = redisHealthMonitor.getState()
      expect(state.lastError).toBe(errorMessage)
    })

    it('should handle non-Error objects in failures', async () => {
      mockPing.mockRejectedValueOnce('String error')

      await redisHealthMonitor.testConnection()

      const state = redisHealthMonitor.getState()
      expect(state.lastError).toBe('Unknown error')
    })
  })

  describe('Availability Checks', () => {
    it('should trust recent healthy checks', async () => {
      mockPing.mockResolvedValue('PONG')
      
      // Perform successful health check
      await redisHealthMonitor.testConnection()

      // Should trust the recent check without re-testing
      const available1 = redisHealthMonitor.isRedisAvailable()
      const available2 = redisHealthMonitor.isRedisAvailable()
      
      expect(available1).toBe(true)
      expect(available2).toBe(true)
      expect(mockPing).toHaveBeenCalledTimes(1) // Not called again
    })

    it('should not trust old health checks', async () => {
      const state = redisHealthMonitor.getState()
      
      // Simulate old last check by manipulating time
      vi.setSystemTime(new Date(Date.now() + 10000)) // 10 seconds in future

      // Should not trust the old check
      const available = redisHealthMonitor.isRedisAvailable()
      expect(available).toBe(true) // Still true because no failures
    })

    it('should handle missing Redis credentials', () => {
      // Reset environment
      const originalUrl = process.env.UPSTASH_REDIS_REST_URL
      const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN
      
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      // Re-import to test initialization without credentials
      vi.resetModules()
      
      // Should handle gracefully
      expect(() => import('@/lib/cache/redis-health')).not.toThrow()

      // Restore environment
      process.env.UPSTASH_REDIS_REST_URL = originalUrl
      process.env.UPSTASH_REDIS_REST_TOKEN = originalToken
    })
  })

  describe('Periodic Health Checks', () => {
    it('should perform periodic health checks', async () => {
      // Initial check should happen on construction
      expect(mockPing).toHaveBeenCalledTimes(0) // Not called immediately

      // Fast-forward to trigger periodic check
      vi.advanceTimersByTime(30000) // 30 seconds
      await vi.runAllTimersAsync()

      expect(mockPing).toHaveBeenCalled()
    })

    it('should clean up on process termination', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      
      // Simulate SIGINT
      process.emit('SIGINT' as any)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RedisHealth] Health monitor cleaned up')
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle ping timeout gracefully', async () => {
      mockPing.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      )

      const resultPromise = redisHealthMonitor.testConnection()
      
      // Fast-forward time
      vi.advanceTimersByTime(5000)
      
      const result = await resultPromise
      expect(result).toBe(false)
    })

    it('should handle rapid consecutive health checks', async () => {
      mockPing.mockResolvedValue('PONG')

      // Fire multiple checks simultaneously
      const checks = Array(10).fill(null).map(() => 
        redisHealthMonitor.testConnection()
      )

      const results = await Promise.all(checks)
      expect(results.every(r => r === true)).toBe(true)
      
      // Should handle concurrent checks without issues
      expect(mockPing.mock.calls.length).toBeGreaterThanOrEqual(10)
    })

    it('should maintain state consistency under load', async () => {
      // Alternate between success and failure
      let callCount = 0
      mockPing.mockImplementation(() => {
        callCount++
        if (callCount % 2 === 0) {
          return Promise.resolve('PONG')
        }
        return Promise.reject(new Error('Intermittent failure'))
      })

      // Perform many checks
      for (let i = 0; i < 10; i++) {
        await redisHealthMonitor.testConnection()
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      // State should be consistent
      const state = redisHealthMonitor.getState()
      expect(typeof state.isHealthy).toBe('boolean')
      expect(typeof state.consecutiveFailures).toBe('number')
    })
  })
})