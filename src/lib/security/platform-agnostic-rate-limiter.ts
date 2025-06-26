import { Ratelimit } from '@upstash/ratelimit'
import type { Redis } from '@upstash/redis'
import type { Duration } from '@upstash/ratelimit'

// Redis client factory for Upstash only
async function createRedisClient(): Promise<Redis | null> {
  try {
    // Use Upstash Redis if configured
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const { Redis: UpstashRedis } = await import('@upstash/redis')
      return new UpstashRedis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    }
    
    console.warn('⚠️ UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN required for rate limiting')
  } catch (error) {
    console.error('Failed to create Upstash Redis client:', error)
  }
  
  return null
}

// Helper function to parse Duration string to milliseconds
function parseDurationToMs(duration: Duration): number {
  const durationStr = duration as string
  const match = durationStr.match(/^(\d+)\s*([smhd])$/)
  if (!match) throw new Error(`Invalid duration format: ${durationStr}`)
  
  const [, num, unit] = match
  const value = parseInt(num, 10)
  
  switch (unit) {
    case 's': return value * 1000
    case 'm': return value * 60 * 1000
    case 'h': return value * 60 * 60 * 1000
    case 'd': return value * 24 * 60 * 60 * 1000
    default: throw new Error(`Unknown time unit: ${unit}`)
  }
}

// In-memory fallback for development/testing
class InMemoryRateLimiter {
  private limits: Map<string, { count: number; resetTime: number }> = new Map()
  
  async limit(identifier: string, requests: number, window: Duration): Promise<{
    success: boolean
    limit: number
    remaining: number
    reset: number
  }> {
    const now = Date.now()
    const windowMs = parseDurationToMs(window)
    const entry = this.limits.get(identifier)
    
    if (!entry || now > entry.resetTime) {
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      })
      return {
        success: true,
        limit: requests,
        remaining: requests - 1,
        reset: now + windowMs
      }
    }
    
    if (entry.count >= requests) {
      return {
        success: false,
        limit: requests,
        remaining: 0,
        reset: entry.resetTime
      }
    }
    
    entry.count++
    return {
      success: true,
      limit: requests,
      remaining: requests - entry.count,
      reset: entry.resetTime
    }
  }
}

// Singleton rate limiter instance
let rateLimiterInstance: Ratelimit | InMemoryRateLimiter | null = null

// Create Upstash rate limiter
export async function createUpstashRateLimiter(
  requests: number = 60,
  window: Duration = '1 m' as Duration
): Promise<Ratelimit | InMemoryRateLimiter | null> {
  // Return existing instance if available
  if (rateLimiterInstance) return rateLimiterInstance
  
  const redis = await createRedisClient()
  
  if (redis) {
    console.log('✅ Rate limiting initialized with Upstash Redis')
    rateLimiterInstance = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, window),
      analytics: true,
      prefix: 'ratelimit',
    })
  } else {
    console.warn('⚠️ No Upstash Redis available - using in-memory rate limiting')
    console.warn('Note: In-memory rate limiting will not work correctly with multiple instances/workers')
    rateLimiterInstance = new InMemoryRateLimiter()
  }
  
  return rateLimiterInstance
}

// Helper function for middleware usage
export async function checkRateLimit(
  identifier: string,
  requests: number = 60,
  window: string = '1 m'
): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
}> {
  const limiter = await createUpstashRateLimiter(requests, window)
  
  if (!limiter) {
    // If no rate limiter available, allow the request
    return {
      success: true,
      limit: requests,
      remaining: requests,
      reset: Date.now() + 60000
    }
  }
  
  if (limiter instanceof InMemoryRateLimiter) {
    const windowSeconds = parseWindowToSeconds(window)
    return limiter.limit(identifier, requests, windowSeconds)
  }
  
  return limiter.limit(identifier)
}

// Parse window string to seconds
function parseWindowToSeconds(window: string): number {
  const match = window.match(/^(\d+)\s*([smhd])$/)
  if (!match) return 60 // Default to 1 minute
  
  const [, value, unit] = match
  const num = parseInt(value, 10)
  
  switch (unit) {
    case 's': return num
    case 'm': return num * 60
    case 'h': return num * 3600
    case 'd': return num * 86400
    default: return 60
  }
}

// Configuration helper
export function getRateLimiterConfig() {
  return {
    hasRedis: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    redisType: process.env.UPSTASH_REDIS_REST_URL ? 'upstash' : 'none',
    recommendations: getRecommendations()
  }
}

function getRecommendations(): string[] {
  const recommendations: string[] = []
  
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    recommendations.push('Set up Upstash Redis for distributed rate limiting')
    recommendations.push('Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to your environment variables')
  }
  
  return recommendations
}

// Backward compatibility alias
export const createPlatformRateLimiter = createUpstashRateLimiter