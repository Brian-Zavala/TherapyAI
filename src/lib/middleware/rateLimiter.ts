import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs?: number;
  max?: number;
  message?: string;
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// In-memory store for rate limit entries
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

/**
 * Creates a rate limiter middleware with configurable options
 */
export function createRateLimiter(config: RateLimitConfig = {}) {
  const {
    windowMs = 60000, // 1 minute default
    max = 100, // 100 requests per window default
    message = 'Too many requests, please try again later.',
    keyGenerator = (req: NextRequest) => {
      // Default key generator uses IP + pathname
      const forwarded = req.headers.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
      return `${ip}:${req.nextUrl.pathname}`;
    },
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = config;

  return async function rateLimiter(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    }

    // Check if limit exceeded
    if (entry.count >= max) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      return NextResponse.json(
        { error: message },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': max.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
          },
        }
      );
    }

    // Increment counter before processing request
    if (!skipSuccessfulRequests && !skipFailedRequests) {
      entry.count++;
    }

    try {
      // Process the request
      const response = await handler(req);
      
      // Increment counter based on response status if configured
      if (skipSuccessfulRequests && response.status >= 200 && response.status < 300) {
        // Don't count successful requests
      } else if (skipFailedRequests && response.status >= 400) {
        // Don't count failed requests
      } else if (skipSuccessfulRequests || skipFailedRequests) {
        entry.count++;
      }

      // Add rate limit headers to response
      const remaining = Math.max(0, max - entry.count);
      response.headers.set('X-RateLimit-Limit', max.toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

      return response;
    } catch (error) {
      // Handle errors and still count if not skipping failed requests
      if (!skipFailedRequests) {
        entry.count++;
      }
      throw error;
    }
  };
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  // Strict limit for destructive operations
  deletion: createRateLimiter({
    windowMs: 60000, // 1 minute
    max: 5, // 5 requests per minute
    message: 'Too many deletion attempts. Please wait before trying again.',
  }),

  // Standard API limit
  standard: createRateLimiter({
    windowMs: 60000, // 1 minute
    max: 100, // 100 requests per minute
  }),

  // Authentication attempts
  auth: createRateLimiter({
    windowMs: 15 * 60000, // 15 minutes
    max: 10, // 10 attempts per 15 minutes
    message: 'Too many authentication attempts. Please try again later.',
    skipSuccessfulRequests: true, // Only count failed attempts
  }),

  // Read-heavy operations
  read: createRateLimiter({
    windowMs: 60000, // 1 minute
    max: 300, // 300 requests per minute
  }),

  // Write operations
  write: createRateLimiter({
    windowMs: 60000, // 1 minute
    max: 50, // 50 requests per minute
  }),

  // Session operations (higher limit for real-time features)
  session: createRateLimiter({
    windowMs: 60000, // 1 minute
    max: 200, // 200 requests per minute
  }),
};

/**
 * Helper to apply rate limiting to a route handler
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  rateLimiter = rateLimiters.standard
) {
  return (req: NextRequest) => rateLimiter(req, handler);
}