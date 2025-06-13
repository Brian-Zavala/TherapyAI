import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
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