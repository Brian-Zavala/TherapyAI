// Redis health monitoring and circuit breaker
import { Redis } from '@upstash/redis'

interface RedisHealthState {
  isHealthy: boolean
  lastCheck: number
  consecutiveFailures: number
  circuitBreakerOpen: boolean
  lastError: string | null
}

class RedisHealthMonitor {
  private state: RedisHealthState = {
    isHealthy: true,
    lastCheck: Date.now(),
    consecutiveFailures: 0,
    circuitBreakerOpen: false,
    lastError: null
  }

  private readonly MAX_CONSECUTIVE_FAILURES = 3
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000 // 1 minute
  private readonly HEALTH_CHECK_INTERVAL = 30000 // 30 seconds
  private redis: Redis | null = null
  private healthCheckTimer: NodeJS.Timeout | null = null

  constructor() {
    // Initialize Redis if credentials available
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
      this.startHealthChecks()
    } else {
      console.warn('[RedisHealth] Redis credentials not found, falling back to memory cache')
      this.state.isHealthy = false
      this.state.lastError = 'Redis credentials not configured'
    }
  }

  private startHealthChecks() {
    // Initial check
    this.checkHealth()

    // Periodic checks
    this.healthCheckTimer = setInterval(() => {
      this.checkHealth()
    }, this.HEALTH_CHECK_INTERVAL)

    // Cleanup on process exit
    if (typeof process !== 'undefined') {
      process.on('SIGINT', () => this.cleanup())
      process.on('SIGTERM', () => this.cleanup())
    }
  }

  private async checkHealth() {
    if (!this.redis) return

    try {
      // Simple ping to check connectivity
      const start = Date.now()
      await this.redis.ping()
      const latency = Date.now() - start

      // Update state on success
      this.state.isHealthy = true
      this.state.lastCheck = Date.now()
      this.state.consecutiveFailures = 0
      this.state.lastError = null

      // Close circuit breaker if it was open
      if (this.state.circuitBreakerOpen) {
        console.log('[RedisHealth] Circuit breaker closed, Redis is healthy again')
        this.state.circuitBreakerOpen = false
      }

      // Log if latency is high
      if (latency > 1000) {
        console.warn(`[RedisHealth] High Redis latency: ${latency}ms`)
      }
    } catch (error) {
      this.handleHealthCheckFailure(error)
    }
  }

  private handleHealthCheckFailure(error: any) {
    this.state.isHealthy = false
    this.state.lastCheck = Date.now()
    this.state.consecutiveFailures++
    this.state.lastError = error instanceof Error ? error.message : 'Unknown error'

    console.error('[RedisHealth] Health check failed:', this.state.lastError)

    // Open circuit breaker if too many failures
    if (this.state.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES && !this.state.circuitBreakerOpen) {
      this.state.circuitBreakerOpen = true
      console.error('[RedisHealth] Circuit breaker opened after', this.state.consecutiveFailures, 'failures')

      // Schedule circuit breaker reset
      setTimeout(() => {
        console.log('[RedisHealth] Attempting to close circuit breaker...')
        this.checkHealth()
      }, this.CIRCUIT_BREAKER_TIMEOUT)
    }
  }

  public isRedisAvailable(): boolean {
    // If circuit breaker is open, don't even try
    if (this.state.circuitBreakerOpen) {
      return false
    }

    // If last check was recent and healthy, trust it
    const timeSinceLastCheck = Date.now() - this.state.lastCheck
    if (timeSinceLastCheck < 5000 && this.state.isHealthy) {
      return true
    }

    // Otherwise, consider it unhealthy if we've had recent failures
    return this.state.isHealthy && this.state.consecutiveFailures === 0
  }

  public getState(): Readonly<RedisHealthState> {
    return { ...this.state }
  }

  public async testConnection(): Promise<boolean> {
    if (!this.redis || this.state.circuitBreakerOpen) {
      return false
    }

    try {
      await this.redis.ping()
      return true
    } catch {
      return false
    }
  }

  private cleanup() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
    console.log('[RedisHealth] Health monitor cleaned up')
  }
}

// Singleton instance
export const redisHealthMonitor = new RedisHealthMonitor()

// Export convenience function
export function isRedisHealthy(): boolean {
  return redisHealthMonitor.isRedisAvailable()
}