import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from "next/server"
import { profileCache, cacheKeys } from "@/lib/cache/profile-cache"

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const body = await req.json()
    const email = body.email || session.user.email
    
    // Only allow clearing own cache
    if (email !== session.user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    
    // Clear profile cache for this user
    const cacheKey = cacheKeys.userProfileByEmail(email)
    await profileCache.invalidate(cacheKey)
    
    console.log(`[Cache Clear] Cleared profile cache for ${email}`)
    
    return NextResponse.json({ 
      success: true, 
      message: "Profile cache cleared successfully" 
    })
  } catch (error) {
    console.error("[Cache Clear] Error:", error)
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    )
  }
}