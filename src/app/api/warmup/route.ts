// Warmup endpoint to prevent cold starts and initialize connections
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma-optimized'
import { profileCache } from '@/lib/cache/profile-cache'
import { redisHealthMonitor } from '@/lib/cache/redis-health'

// Next.js 15 configuration
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 10

export async function GET(req: NextRequest) {
  const startTime = Date.now()
  const results: Record<string, any> = {}
  
  try {
    // 1. Warm up database connection
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    results.database = {
      status: 'connected',
      latency: Date.now() - dbStart
    }
  } catch (error) {
    results.database = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
  
  try {
    // 2. Test Redis/cache connection
    const cacheStart = Date.now()
    const redisHealthy = await redisHealthMonitor.testConnection()
    results.cache = {
      status: redisHealthy ? 'connected' : 'fallback_to_memory',
      latency: Date.now() - cacheStart,
      health: redisHealthMonitor.getState()
    }
  } catch (error) {
    results.cache = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
  
  // 3. Overall health status
  const allHealthy = results.database?.status === 'connected'
  const totalTime = Date.now() - startTime
  
  return NextResponse.json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    responseTime: totalTime,
    services: results
  }, {
    status: allHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Response-Time': totalTime.toString()
    }
  })
}

// HEAD request for quick health checks
export async function HEAD(req: NextRequest) {
  try {
    await prisma.$queryRaw`SELECT 1`
    return new NextResponse(null, { status: 200 })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}