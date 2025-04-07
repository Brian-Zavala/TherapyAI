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
                        path === '/api/auth'
  
  // Check if the user is authenticated
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })
  
  // Redirect unauthenticated users from home page to login page
  if (path === '/' && !token) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
  
  // Redirect unauthenticated users from protected routes to login
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
  
  // Only redirect authenticated users from auth pages to dashboard, not from homepage
  if (token && (path === '/auth/login' || path === '/auth/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/auth/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
}