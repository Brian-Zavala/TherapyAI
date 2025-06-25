// src/app/api/auth/debug/route.ts
// 2025 Standard: Debug endpoint for NextAuth configuration

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  // Development only endpoint
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const headersList = await headers()
  const host = headersList.get('host')
  const forwardedProto = headersList.get('x-forwarded-proto')
  const origin = request.nextUrl.origin

  return NextResponse.json({
    debug: {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
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
        }
      },
      auth: {
        hasSecret: !!process.env.NEXTAUTH_SECRET,
        hasGoogleCreds: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        cookieNames: {
          sessionToken: (process.env.NODE_ENV as string) === 'production' 
            ? '__Secure-next-auth.session-token' 
            : 'next-auth.session-token',
        }
      }
    }
  })
}