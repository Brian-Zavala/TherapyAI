// src/middleware.ts
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname
  
  // Public paths that don't require authentication
  const isPublicPath = path === '/auth/login' || 
                        path === '/auth/register' || 
                        path.startsWith('/api/auth') ||
                        path === '/' // Make homepage public
  
  // Check if the user is authenticated
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })
  
  // Redirect unauthenticated users from protected routes to login
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
  
  // Redirect authenticated users away from auth pages
  if (token && (path === '/auth/login' || path === '/auth/register')) {
    return NextResponse.redirect(new URL('/welcome', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/auth/:path*',
    '/welcome',
    // Exclude public static assets from middleware
    '/((?!api|_next/static|_next/image|favicon.ico|images|sounds|fonts|videos).*)',
  ]
}