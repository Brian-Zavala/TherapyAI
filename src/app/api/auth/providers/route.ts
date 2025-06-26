import { NextResponse } from 'next/server'

// 2025 Standard: Fix for NextAuth provider endpoint
export async function GET() {
  return NextResponse.json({
    credentials: {
      id: "credentials",
      name: "credentials",
      type: "credentials",
      signinUrl: "/api/auth/signin/credentials",
      callbackUrl: "/api/auth/callback/credentials"
    }
  })
}