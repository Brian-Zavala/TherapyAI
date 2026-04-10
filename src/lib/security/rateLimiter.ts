// @ts-nocheck
import { NextRequest } from "next/server"

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory rate limiter for development/single-instance deployments
// For production, use Redis/Upstash KV for distributed rate limiting
class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.limits.entries()) {
        if (now > entry.resetTime) {
          this.limits.delete(key)
        }
      }
    }, 5 * 60 * 1000)
  }

  /**
   * Check if request is within rate limit
   * @param identifier - Unique identifier (IP, userId, etc.)
   * @param limit - Max requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Object with success status and remaining info
   */
  check(
    identifier: string,
    limit: number,
    windowMs: number
  ): {
    success: boolean
    limit: number
    remaining: number
    reset: number
  } {
    const now = Date.now()
    const entry = this.limits.get(identifier)

    if (!entry || now > entry.resetTime) {
      // New window
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      })
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: now + windowMs
      }
    }

    if (entry.count >= limit) {
      // Rate limit exceeded
      return {
        success: false,
        limit,
        remaining: 0,
        reset: entry.resetTime
      }
    }

    // Increment count
    entry.count++
    return {
      success: true,
      limit,
      remaining: limit - entry.count,
      reset: entry.resetTime
    }
  }

  /**
   * Get client identifier from request
   * Uses IP address with fallback to a default for local development
   */
  getIdentifier(request: NextRequest, userId?: string): string {
    // Prefer user ID if available (authenticated requests)
    if (userId) {
      return `user:${userId}`
    }

    // Try various headers for IP address
    const ip = 
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      request.headers.get("cf-connecting-ip") || // Cloudflare
      request.ip ||
      "127.0.0.1"

    return `ip:${ip}`
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.limits.clear()
  }
}

// Rate limit configurations for different endpoint types
export const RATE_LIMITS = {
  // Sensitive operations
  DELETE_ACCOUNT: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  PASSWORD_RESET: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  ACCOUNT_RECOVERY: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  
  // Auth endpoints
  LOGIN: { limit: 10, windowMs: 15 * 60 * 1000 }, // 10 per 15 min
  REGISTER: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  
  // API endpoints
  API_WRITE: { limit: 50, windowMs: 60 * 1000 }, // 50 per minute
  API_READ: { limit: 100, windowMs: 60 * 1000 }, // 100 per minute
  
  // Session operations
  SESSION_CREATE: { limit: 20, windowMs: 60 * 60 * 1000 }, // 20 per hour
  SESSION_UPDATE: { limit: 100, windowMs: 60 * 1000 }, // 100 per minute
  
  // Default fallback
  DEFAULT: { limit: 60, windowMs: 60 * 1000 } // 60 per minute
}

// Singleton instance
export const rateLimiter = new RateLimiter()

// Helper function to apply rate limiting in API routes
export async function checkRateLimit(
  request: NextRequest,
  limitType: keyof typeof RATE_LIMITS = "DEFAULT",
  userId?: string
): Promise<{
  success: boolean
  headers: Record<string, string>
}> {
  const config = RATE_LIMITS[limitType]
  const identifier = rateLimiter.getIdentifier(request, userId)
  const result = rateLimiter.check(identifier, config.limit, config.windowMs)

  const headers = {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": new Date(result.reset).toISOString(),
    "Retry-After": result.success ? "" : Math.ceil((result.reset - Date.now()) / 1000).toString()
  }

  return {
    success: result.success,
    headers
  }
}