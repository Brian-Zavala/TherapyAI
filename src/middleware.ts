import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createCsrfMiddleware } from '@edge-csrf/nextjs';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// 2025 SECURITY-FIRST Performance Optimized Middleware
// Fixes critical authentication bypass while maintaining performance

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
}

// Initialize Upstash Redis and rate limiter (singleton)
let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
    prefix: '@upstash/ratelimit',
    // Enable caching for better performance
    ephemeralCache: new Map(),
    enableProtection: true,
  });
}

// Static asset patterns (compiled once)
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

// API routes that require strict rate limiting
const RATE_LIMITED_APIS = {
  '/api/user/delete-account': { requests: 3, window: '1 h' },
  '/api/user/password-reset': { requests: 5, window: '1 h' },
  '/api/user/recover-account': { requests: 5, window: '1 h' },
  '/api/auth/register': { requests: 5, window: '1 h' },
  '/api/vapi/token': { requests: 20, window: '1 h' },
  '/api/vapi/webhook': { requests: 1000, window: '1 m' },
  '/api/sessions': { requests: 100, window: '1 m' },
  '/api/dashboard': { requests: 200, window: '1 m' },
};

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
  }

  // CRITICAL SECURITY: Check authentication for protected routes
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

  let response = NextResponse.next();

  // RATE LIMITING: Apply to API routes with Upstash
  if (pathname.startsWith('/api/') && ratelimit) {
    // Get route-specific limits or use defaults
    const routeConfig = Object.entries(RATE_LIMITED_APIS).find(([route]) => 
      pathname.startsWith(route)
    );
    
    // For auth-required routes, try to get user ID for better rate limiting
    let identifier: string;
    if (isProtectedRoute) {
      // Try to extract user ID from session token (without full JWT decode)
      const sessionToken = request.cookies.get('next-auth.session-token')?.value ||
                          request.cookies.get('__Secure-next-auth.session-token')?.value;
      if (sessionToken) {
        // Use first part of token as a pseudo-identifier (faster than full decode)
        identifier = `user:${sessionToken.substring(0, 16)}:${pathname}`;
      } else {
        identifier = `ip:${getClientIp(request)}:${pathname}`;
      }
    } else {
      identifier = `ip:${getClientIp(request)}:${pathname}`;
    }
    
    try {
      // Use custom limits if configured
      let rateLimitResult;
      if (routeConfig && redis) {
        const [, config] = routeConfig;
        const customRatelimit = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(config.requests, config.window as any),
          prefix: '@upstash/ratelimit',
          ephemeralCache: new Map(),
        });
        rateLimitResult = await customRatelimit.limit(identifier);
      } else {
        rateLimitResult = await ratelimit.limit(identifier);
      }

      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.reset).toISOString());

      if (!rateLimitResult.success) {
        return new NextResponse(
          JSON.stringify({
            error: 'Too many requests',
            code: 'RATE_LIMITED',
            retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
            },
          }
        );
      }
    } catch (error) {
      // If rate limiting fails, log but don't block the request
      console.error('Rate limiting error:', error);
    }
  }

  // CSRF Protection (only for state-changing operations in production)
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
         '127.0.0.1';
}

// Optimized matcher - only match paths that need middleware
export const config = {
  matcher: [
    // Match all routes except static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|ico|css|js|woff|woff2|ttf|eot)).*)',
  ],
};