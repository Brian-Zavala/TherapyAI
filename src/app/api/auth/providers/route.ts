import { authOptions } from "@/lib/auth"
import { NextResponse } from 'next/server'

// 2025 Standard: Return actual configured providers
export async function GET() {
  try {
    // Build providers response from our auth config
    const providers: Record<string, any> = {}
    
    // Add configured providers
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      providers.google = {
        id: "google",
        name: "Google",
        type: "oauth",
        signinUrl: "/api/auth/signin/google",
        callbackUrl: "/api/auth/callback/google"
      }
    }
    
    if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
      providers.facebook = {
        id: "facebook", 
        name: "Facebook",
        type: "oauth",
        signinUrl: "/api/auth/signin/facebook",
        callbackUrl: "/api/auth/callback/facebook"
      }
    }
    
    // Always include credentials
    providers.credentials = {
      id: "credentials",
      name: "credentials", 
      type: "credentials",
      signinUrl: "/api/auth/signin/credentials",
      callbackUrl: "/api/auth/callback/credentials"
    }
    
    return NextResponse.json(providers)
  } catch (error) {
    console.error("[Auth] Providers endpoint error:", error)
    return NextResponse.json({})
  }
}