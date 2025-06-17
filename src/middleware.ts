import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimitManager } from '@/lib/rate-limit-manager';

export async function middleware(request: NextRequest) {
  // Skip WebSocket upgrade requests completely
  if (request.headers.get('upgrade') === 'websocket') {
    console.log('🔄 Middleware: Skipping WebSocket upgrade request');
    return NextResponse.next();
  }

  // Skip WebSocket paths
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/api/ws/')) {
    console.log('🔄 Middleware: Skipping WebSocket API path');
    return NextResponse.next();
  }

  // General API rate limiting (excluding specific endpoints with their own limits)
  if (pathname.startsWith('/api/')) {
    // Skip rate limiting for endpoints that have their own specific limits
    const hasSpecificLimit = 
      pathname.startsWith('/api/vapi/token') ||
      pathname.startsWith('/api/register') ||
      pathname.startsWith('/api/sessions') ||
      pathname.includes('/complete');
    
    if (!hasSpecificLimit) {
      // Get client identifier for rate limiting
      const clientId = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'anonymous';
      
      // In middleware, we can't access session easily in Edge Runtime
      // User type detection should be handled in individual API routes
      const userType = 'standard';
      
      // Apply general API rate limit using Redis if available
      const rateLimitResult = await rateLimitManager.checkLimits(
        clientId,
        'api',
        { 
          endpoint: pathname,
          userType 
        }
      );
      
      if (!rateLimitResult.allowed) {
        const response = NextResponse.json({
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          statusCode: 429,
          retryAfter: rateLimitResult.nextRetryAfter,
        }, { status: 429 });
        
        if (rateLimitResult.nextRetryAfter) {
          response.headers.set('Retry-After', rateLimitResult.nextRetryAfter.toString());
          response.headers.set('X-Rate-Limit-Profile', userType === 'premium' ? 'premium' : 'api');
        }
        
        return response;
      }
    }
  }

  // Authentication check for dashboard and therapy routes
  const token = request.cookies.get('next-auth.session-token');
  const isAuthPage = pathname.startsWith('/auth/');
  const isDashboard = pathname.startsWith('/dashboard');
  const isTherapy = pathname === '/therapy';
  const isProtectedRoute = isDashboard || isTherapy;

  if (isProtectedRoute && !token) {
    console.log('🔒 Redirecting to login - no session token');
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  return NextResponse.next();
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