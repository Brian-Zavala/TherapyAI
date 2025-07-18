// src/app/api/auth/debug/route.ts
// 2025 Standard: Debug endpoint for NextAuth configuration

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  // Development only endpoint
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const headersList = await headers()
  const host = headersList.get('host')
  const forwardedProto = headersList.get('x-forwarded-proto')
  const origin = request.nextUrl.origin
  
  // Try to get the session
  let sessionData = null
  let sessionError = null
  try {
    sessionData = await getServerSession(authOptions)
  } catch (error) {
    sessionError = error instanceof Error ? error.message : String(error)
  }

  return NextResponse.json({
    debug: {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXTAUTH_SECRET_SET: !!process.env.NEXTAUTH_SECRET,
        NEXTAUTH_SECRET_LENGTH: process.env.NEXTAUTH_SECRET?.length || 0,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        PORT: process.env.PORT || '3000',
      },
      request: {
        origin,
        host,
        forwardedProto,
        url: request.url,
        headers: {
          host: headersList.get('host'),
          origin: headersList.get('origin'),
          referer: headersList.get('referer'),
          cookie: headersList.get('cookie') ? 'present' : 'missing',
        }
      },
      auth: {
        hasSecret: !!process.env.NEXTAUTH_SECRET,
        secretLength: process.env.NEXTAUTH_SECRET?.length || 0,
        hasGoogleCreds: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        hasFacebookCreds: !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
        cookieNames: {
          sessionToken: (process.env.NODE_ENV as string) === 'production' 
            ? '__Secure-next-auth.session-token' 
            : 'next-auth.session-token',
        }
      },
      session: {
        hasSession: !!sessionData,
        sessionError,
        sessionData: sessionData ? {
          hasUser: !!sessionData.user,
          userId: sessionData.user?.id || 'no-id',
          userEmail: sessionData.user?.email || 'no-email',
          expires: sessionData.expires
        } : null
      },
      authOptions: {
        hasAdapter: !!authOptions.adapter,
        sessionStrategy: authOptions.session?.strategy,
        hasSecret: !!authOptions.secret,
        debugEnabled: authOptions.debug,
        pages: authOptions.pages
      }
    }
  })
}