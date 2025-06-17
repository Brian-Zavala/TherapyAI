import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private cleanupInterval: NodeJS.Timer | null = null;

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 10) {
    this.windowMs = windowMs; // 15 minutes default
    this.maxRequests = maxRequests; // 10 requests per window default
    
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || entry.resetTime < now) {
      // New window or expired entry
      const resetTime = now + this.windowMs;
      this.store.set(identifier, { count: 1, resetTime });
      
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime,
      };
    }

    if (entry.count >= this.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000), // seconds
      };
    }

    // Increment count
    entry.count++;
    this.store.set(identifier, entry);

    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  // Method to get client identifier from request
  getClientIdentifier(request: Request | NextRequest, userId?: string): string {
    // Prefer userId for authenticated requests
    if (userId) {
      return `user:${userId}`;
    }

    // Fallback to IP address for unauthenticated requests
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';
    
    return `ip:${ip}`;
  }

  // Reset specific identifier (useful for testing or admin purposes)
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  // Get current state for identifier (useful for debugging)
  getState(identifier: string): RateLimitEntry | undefined {
    return this.store.get(identifier);
  }

  // Cleanup when service is destroyed
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// Create rate limiter instances for different endpoints
export const tokenRateLimiter = new RateLimiter(15 * 60 * 1000, 20); // 20 tokens per 15 minutes
export const authRateLimiter = new RateLimiter(15 * 60 * 1000, 5);   // 5 auth attempts per 15 minutes
export const sessionRateLimiter = new RateLimiter(60 * 60 * 1000, 30); // 30 sessions per hour
export const registrationRateLimiter = new RateLimiter(60 * 60 * 1000, 3); // 3 registrations per hour
export const apiRateLimiter = new RateLimiter(60 * 1000, 60); // 60 API calls per minute (general)

// Helper function to send rate limit headers
export function setRateLimitHeaders(
  response: Response | NextResponse,
  result: RateLimitResult,
  limit: number
): void {
  if (response instanceof NextResponse) {
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
    
    if (!result.allowed && result.retryAfter) {
      response.headers.set('Retry-After', result.retryAfter.toString());
    }
  }
}

// Helper function to create rate limit error response
export function createRateLimitErrorResponse(result: RateLimitResult, limit: number): NextResponse {
  const response = NextResponse.json({
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED',
    statusCode: 429,
    retryAfter: result.retryAfter,
  }, { status: 429 });
  
  setRateLimitHeaders(response, result, limit);
  return response;
}