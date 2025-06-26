import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

// 2025 Standard: Fix for NextAuth CLIENT_FETCH_ERROR
// This route ensures NextAuth can properly fetch session data
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(null)
    }
    
    return NextResponse.json(session)
  } catch (error) {
    console.error("[NextAuth] Session fetch error:", error)
    return NextResponse.json(null)
  }
}