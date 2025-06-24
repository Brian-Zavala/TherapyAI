import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createCsrfMiddleware } from '@edge-csrf/nextjs';
import { checkRateLimit, getRateLimiterConfig } from '@/lib/security/platform-agnostic-rate-limiter';
import { decode } from 'next-auth/jwt';

// 2025 Standard: Type definitions
interface RateLimit {
  requests: number;
  window: string;
  burst?: number; // Allow burst traffic
}

interface RouteConfig {
  rateLimit: RateLimit;
  requiresAuth?: boolean;
  skipCSRF?: boolean;
}

// 2025 Standard: Development-only logging
const isDevelopment = process.env.NODE_ENV === 'development';
if (isDevelopment) {
  console.log('🚀 Middleware initialized');
  const rateLimiterConfig = getRateLimiterConfig();
  console.log('📊 Rate limiter config:', rateLimiterConfig);
}

// CSRF Protection Toggle (Development Only)
const CSRF_PROTECTION_ENABLED = !(
  process.env.NODE_ENV === 'development' && 
  process.env.DISABLE_CSRF_PROTECTION === 'true'
);
console.log('🛡️ CSRF Protection:', CSRF_PROTECTION_ENABLED ? 'ENABLED' : 'DISABLED (DEV MODE)');

// CSRF middleware configuration
const csrfMiddleware = createCsrfMiddleware({
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    httpOnly: true,
    name: '__csrf',
    path: '/',
  },
  excludePathPrefixes: [
    '/api/auth/', // NextAuth handles its own CSRF
    '/api/vapi/webhook', // Webhooks need to be accessible
    '/api/webhooks/', // External webhooks
    '/api/health', // Health checks
    '/api/ws/', // WebSocket endpoints
  ],
});

// 2025 Standard: Enhanced route configuration with burst limits
const ROUTE_CONFIG: Record<string, RouteConfig> = {
  '/api/user/delete-account': { 
    rateLimit: { requests: 3, window: '1 h' },
    requiresAuth: true
  },
  '/api/user/password-reset': { 
    rateLimit: { requests: 5, window: '1 h' },
    requiresAuth: false
  },
  '/api/user/recover-account': { 
    rateLimit: { requests: 5, window: '1 h' },
    requiresAuth: false
  },
  '/api/auth/register': { 
    rateLimit: { requests: 5, window: '1 h', burst: 10 },
    requiresAuth: false,
    skipCSRF: false
  },
  '/api/vapi/token': { 
    rateLimit: { requests: 20, window: '1 h', burst: 5 },
    requiresAuth: true
  },
  '/api/vapi/webhook': { 
    rateLimit: { requests: 1000, window: '1 m' },
    requiresAuth: false,
    skipCSRF: true
  },
  '/api/sessions': { 
    rateLimit: { requests: 100, window: '1 m', burst: 20 },
    requiresAuth: true
  },
  '/api/dashboard': { 
    rateLimit: { requests: 200, window: '1 m', burst: 50 },
    requiresAuth: true
  },
  '/api/realtime': {
    rateLimit: { requests: 300, window: '1 m', burst: 100 },
    requiresAuth: true
  }
};

// 2025 Standard: Type-safe route config retrieval
const getRouteConfig = (pathname: string): RouteConfig => {
  // Find most specific matching route
  const matchingRoutes = Object.entries(ROUTE_CONFIG)
    .filter(([route]) => pathname.startsWith(route))
    .sort(([a], [b]) => b.length - a.length); // Sort by specificity
  
  if (matchingRoutes.length > 0) {
    return matchingRoutes[0][1];
  }
  
  // Default configuration
  return {
    rateLimit: { requests: 60, window: '1 m', burst: 10 },
    requiresAuth: pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')
  };
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip WebSocket upgrade requests completely
  if (request.headers.get('upgrade') === 'websocket') {
    console.log('🔄 Middleware: Skipping WebSocket upgrade request');
    return NextResponse.next();
  }

  // Skip WebSocket paths
  if (pathname.startsWith('/api/ws/')) {
    console.log('🔄 Middleware: Skipping WebSocket API path');
    return NextResponse.next();
  }

  // Skip static assets and public routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/' ||
    pathname.startsWith('/auth/login') ||
    pathname.startsWith('/auth/register')
  ) {
    return NextResponse.next();
  }

  // Create response object
  let response = NextResponse.next();

  // 2025 Standard: Enhanced rate limiting with user identification
  if (pathname.startsWith('/api/')) {
    const routeConfig = getRouteConfig(pathname);
    
    // Try to get user ID from JWT token for better rate limiting
    let userId: string | null = null;
    try {
      const token = request.cookies.get('next-auth.session-token')?.value ||
                   request.cookies.get('__Secure-next-auth.session-token')?.value;
      
      if (token && process.env.NEXTAUTH_SECRET) {
        const decoded = await decode({
          token,
          secret: process.env.NEXTAUTH_SECRET
        });
        userId = decoded?.sub ?? null;
      }
    } catch (error) {
      // Token decode failed, continue with IP-based limiting
      if (isDevelopment) {
        console.error('Token decode error:', error);
      }
    }
    
    // 2025 Standard: Comprehensive IP detection
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               request.headers.get('cf-connecting-ip') || // Cloudflare
               request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || // Vercel
               request.headers.get('fly-client-ip') || // Fly.io
               request.headers.get('true-client-ip') || // Akamai
               '127.0.0.1';
    
    // Use user ID if available, otherwise fall back to IP
    const identifier = userId ? `user:${userId}:${pathname}` : `ip:${ip}:${pathname}`;
    
    // Use platform-agnostic rate limiter
    const rateLimitResult = await checkRateLimit(
      identifier,
      routeConfig.rateLimit.requests,
      routeConfig.rateLimit.window
    );

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.reset).toISOString());
    response.headers.set('X-RateLimit-Platform', 'upstash');

    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      response.headers.set('Retry-After', retryAfter.toString());
      
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          code: 'RATE_LIMITED',
          retryAfter,
          platform: 'upstash',
          limit: rateLimitResult.limit,
          window: routeConfig.rateLimit.window
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(response.headers.entries()),
          },
        }
      );
    }
  }

  // Apply CSRF protection for API routes (conditionally)
  if (CSRF_PROTECTION_ENABLED && pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    try {
      response = await csrfMiddleware(request);
    } catch (error) {
      console.error('CSRF middleware error:', error);
      return new NextResponse(
        JSON.stringify({ 
          error: 'CSRF validation failed',
          code: 'CSRF_VALIDATION_FAILED',
          devHint: process.env.NODE_ENV === 'development' ? 'Set DISABLE_CSRF_PROTECTION=true in .env to disable CSRF in development' : undefined
        }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  // Authentication check for dashboard and therapy routes
  const token = request.cookies.get('next-auth.session-token')?.value ||
                request.cookies.get('__Secure-next-auth.session-token')?.value;
  
  const isDashboard = pathname.startsWith('/dashboard');
  const isTherapy = pathname === '/therapy';
  const isProtectedRoute = isDashboard || isTherapy;

  if (isProtectedRoute && !token) {
    console.log('🔒 Redirecting to login - no session token');
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // Add security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
  
  // 2025 Standard: Enhanced security headers with nonces
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  response.headers.set('X-Nonce', nonce);
  
  if (process.env.NODE_ENV === 'production') {
    // 2025 Standard: Strict CSP with monitoring
    const cspDirectives = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' https://vapi.ai https://*.sentry.io`,
      `style-src 'self' 'unsafe-inline'`, // Required for Tailwind
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.vapi.ai wss://*.vapi.ai https://*.supabase.co wss://*.supabase.co https://*.sentry.io",
      "media-src 'self' blob: https://vapi.ai",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "upgrade-insecure-requests",
      // 2025 Standard: Report CSP violations
      process.env.CSP_REPORT_URI ? `report-uri ${process.env.CSP_REPORT_URI}` : ''
    ].filter(Boolean).join('; ');
    
    response.headers.set('Content-Security-Policy', cspDirectives);
    
    // 2025 Standard: Additional security headers
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/ws (WebSocket endpoints)
     * - _next/webpack-hmr (Next.js HMR WebSocket)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/ws|_next/webpack-hmr|_next/static|_next/image|favicon.ico|public).*)',
  ],
};