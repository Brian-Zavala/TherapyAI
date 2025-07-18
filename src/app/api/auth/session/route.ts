import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

// 2025 Standard: Fix for NextAuth CLIENT_FETCH_ERROR
// This route ensures NextAuth can properly fetch session data
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    console.log("[NextAuth] Session endpoint called, session:", {
      hasSession: !!session,
      sessionData: session ? JSON.stringify(session) : 'null',
      userExists: !!session?.user,
      userId: session?.user?.id || 'no-id'
    })
    
    // Return empty object instead of null to prevent "Cannot convert undefined or null to object" error
    if (!session) {
      return NextResponse.json({})
    }
    
    // Ensure session has required structure
    const safeSession = {
      user: session.user || {},
      expires: session.expires || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
    
    return NextResponse.json(safeSession)
  } catch (error) {
    console.error("[NextAuth] Session fetch error:", error)
    // Return empty object instead of null
    return NextResponse.json({})
  }
}