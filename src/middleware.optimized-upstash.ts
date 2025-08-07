import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createCsrfMiddleware } from '@edge-csrf/nextjs';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// 2025 PRODUCTION-READY Middleware with Optimized Upstash Rate Limiting
// Security-first with proper caching and performance optimization

const isDevelopment = process.env.NODE_ENV === 'development';

// CSRF Protection (only in production)
const CSRF_PROTECTION_ENABLED = process.env.NODE_ENV === 'production';

// Lazy-loaded CSRF middleware
let csrfMiddleware: any;
if (CSRF_PROTECTION_ENABLED) {
  csrfMiddleware = createCsrfMiddleware({
    cookie: {
      secure: true,
      sameSite: 'strict',
      httpOnly: true,
      name: '__csrf',
      path: '/',
    },
    excludePathPrefixes: [
      '/api/auth/',
      '/api/vapi/webhook',
      '/api/webhooks/',
      '/api/health',
      '/api/ws/',
    ],
  });
}// Shared ephemeral cache for all rate limiters (better performance)
const sharedCache = new Map();

// Initialize Upstash Redis (singleton)
let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// Pre-create all rate limiters (cached for reuse)
const rateLimiters = new Map<string, Ratelimit>();

// Initialize rate limiters once
if (redis) {
  // Default rate limiter
  rateLimiters.set('default', new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
    prefix: '@upstash/ratelimit',
    ephemeralCache: sharedCache,
    enableProtection: true,
  }));

  // Custom rate limiters for specific routes
  const customLimits = [
    { key: '/api/user/delete-account', requests: 3, window: '1 h' },
    { key: '/api/user/password-reset', requests: 5, window: '1 h' },
    { key: '/api/user/recover-account', requests: 5, window: '1 h' },
    { key: '/api/auth/register', requests: 5, window: '1 h' },
    { key: '/api/vapi/token', requests: 20, window: '1 h' },
    { key: '/api/vapi/webhook', requests: 1000, window: '1 m' },
    { key: '/api/sessions', requests: 100, window: '1 m' },
    { key: '/api/dashboard', requests: 200, window: '1 m' },
  ];

  // Create rate limiters for each custom limit
  for (const limit of customLimits) {
    rateLimiters.set(limit.key, new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit.requests, limit.window as any),
      analytics: true,
      prefix: '@upstash/ratelimit',
      ephemeralCache: sharedCache,
    }));
  }
}// Static asset patterns (compiled once)
const STATIC_PATTERNS = [
  /^\/_next/,
  /^\/static/,
  /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/,
  /^\/favicon/,
  /^\/robots\.txt$/,
  /^\/sitemap/,
];

// Public routes that don't need auth
const PUBLIC_ROUTES = new Set([
  '/',
  '/auth/login',
  '/auth/register',
  '/privacy',
  '/terms',
  '/support',
]);

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/admin',
  '/schedule',
  '/intro',
  '/settings',
  '/api/user',
  '/api/dashboard',
  '/api/sessions',
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  // FAST PATH 1: Skip static assets immediately
  for (const pattern of STATIC_PATTERNS) {
    if (pattern.test(pathname)) {
      return NextResponse.next();
    }
  }

  // FAST PATH 2: Skip NextAuth API routes (they handle their own security)
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // FAST PATH 3: Skip WebSocket upgrades
  if (request.headers.get('upgrade') === 'websocket' || pathname.startsWith('/api/ws/')) {
    return NextResponse.next();
  }  // CRITICAL SECURITY: Check authentication for protected routes
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  
  if (isProtectedRoute) {
    // Check for session token
    const sessionToken = request.cookies.get('next-auth.session-token')?.value ||
                        request.cookies.get('__Secure-next-auth.session-token')?.value;
    
    if (!sessionToken) {
      // No token = redirect to login
      const url = new URL('/auth/login', request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
    
    // Note: Full JWT validation happens in API routes/pages
    // This is a quick check to prevent obvious unauthorized access
  }

  // Check if this is a public route (skip further checks)
  if (PUBLIC_ROUTES.has(pathname) && !pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  let response = NextResponse.next();  // RATE LIMITING: Apply to API routes with Upstash
  if (pathname.startsWith('/api/') && rateLimiters.size > 0) {
    // Find the most specific rate limiter for this route
    let rateLimiter: Ratelimit | undefined;
    
    // Check for exact match or prefix match
    for (const [route, limiter] of rateLimiters) {
      if (route !== 'default' && pathname.startsWith(route)) {
        rateLimiter = limiter;
        break;
      }
    }
    
    // Fall back to default rate limiter
    if (!rateLimiter) {
      rateLimiter = rateLimiters.get('default');
    }
    
    if (rateLimiter) {
      // Build identifier for rate limiting
      let identifier: string;
      
      // For protected routes, try to use session token for user-based limiting
      if (isProtectedRoute) {
        const sessionToken = request.cookies.get('next-auth.session-token')?.value ||
                            request.cookies.get('__Secure-next-auth.session-token')?.value;
        if (sessionToken) {
          // Use first 16 chars of token as user identifier (no JWT decode needed)
          identifier = `user:${sessionToken.substring(0, 16)}:${pathname}`;
        } else {
          identifier = `ip:${getClientIp(request)}:${pathname}`;
        }
      } else {
        identifier = `ip:${getClientIp(request)}:${pathname}`;
      }
      
      try {
        const { success, limit, remaining, reset } = await rateLimiter.limit(identifier);
        
        // Add rate limit headers
        response.headers.set('X-RateLimit-Limit', limit.toString());
        response.headers.set('X-RateLimit-Remaining', remaining.toString());
        response.headers.set('X-RateLimit-Reset', new Date(reset).toISOString());
        
        if (!success) {
          const retryAfter = Math.ceil((reset - Date.now()) / 1000);
          return new NextResponse(
            JSON.stringify({
              error: 'Too many requests',
              code: 'RATE_LIMITED',
              retryAfter,
              message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': retryAfter.toString(),
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': new Date(reset).toISOString(),
              },
            }
          );
        }
      } catch (error) {
        // Log error but don't block request if rate limiting fails
        console.error('Rate limiting error:', error);
        // In production, you might want to track this with Sentry
        // Continue processing the request
      }
    }
  }  // CSRF Protection (only for state-changing operations in production)
  if (CSRF_PROTECTION_ENABLED && method !== 'GET' && method !== 'HEAD' && csrfMiddleware) {
    response = await csrfMiddleware(request);
  }

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Production-only strict headers
  if (!isDevelopment) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(self), geolocation=()'
    );
  }
  
  return response;
}

// Helper to get client IP
function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         request.headers.get('x-real-ip') || 
         request.headers.get('cf-connecting-ip') ||
         request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('fly-client-ip') ||
         request.headers.get('true-client-ip') ||
         '127.0.0.1';
}

// Optimized matcher - only match paths that need middleware
export const config = {
  matcher: [
    // Match all routes except static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|ico|css|js|woff|woff2|ttf|eot)).*)',
  ],
};