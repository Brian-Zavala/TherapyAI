import { getAuthSession } from '@/lib/auth'
// Optimized credits API for <500ms response time
import { NextRequest, NextResponse } from "next/server"
import { getCurrentCreditsOptimized } from "@/lib/database/optimized-queries"
import { getCached } from "@/lib/cache/redis-connection-pool"

// Route segment config for maximum performance
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Fast session check with timeout
    const session = await Promise.race([
      getAuthSession(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session timeout')), 3000)
      )
    ]) as any

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { 
          status: 401,
          headers: { 'Cache-Control': 'no-cache' }
        }
      )
    }

    const userId = session.user.id
    
    // Use cached credit lookup with fallback
    const cacheKey = `api:credits:${userId}`
    
    const creditData = await getCached(cacheKey, async () => {
      // Parallel queries for speed
      const [credits, creditManager] = await Promise.all([
        getCurrentCreditsOptimized(userId),
        import('@/lib/services/credit-manager.service').then(m => m.creditManager)
      ])

      if (!credits) {
        // Emergency fallback - return minimal data
        return {
          available: 0,
          total: 0,
          used: 0,
          planType: 'free',
          billingPeriod: {
            start: new Date(),
            end: new Date()
          },
          emergencyFallback: true
        }
      }

      // Get usage stats efficiently
      const usageStats = await creditManager.getUsageStats(userId)
      
      return {
        available: credits.totalCredits - credits.usedCredits,
        total: credits.totalCredits,
        used: credits.totalCredits - credits.totalCredits - credits.usedCredits,
        planType: credits.planType,
        billingPeriod: {
          start: credits.billingPeriodStart,
          end: credits.billingPeriodEnd
        },
        usage: {
          thisMonth: usageStats.totalUsed,
          sessionCount: usageStats.sessionCount,
          averageLength: usageStats.averageSessionLength
        },
        status: credits.totalCredits - credits.usedCredits > 0 ? 'active' : 'depleted'
      }
    }, 120) // 2 minute cache

    const responseTime = Date.now() - startTime
    
    return NextResponse.json(creditData, {
      headers: {
        'Cache-Control': 'private, max-age=60',
        'X-Response-Time': `${responseTime}ms`,
        'X-Cache-Status': creditData.emergencyFallback ? 'fallback' : 'hit'
      }
    })
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('[API] Credits error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { 
        error: "Internal server error",
        available: 0,
        total: 0,
        used: 0,
        planType: 'free',
        status: 'error'
      },
      { 
        status: 500,
        headers: {
          'X-Response-Time': `${responseTime}ms`,
          'X-Error': 'true'
        }
      }
    )
  }
}