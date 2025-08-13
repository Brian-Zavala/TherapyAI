import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/prisma-optimized';
import { redis } from '@/lib/cache/redis-client';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const checks: Record<string, any> = {};

  try {
    // Test database connection
    const dbStart = Date.now();
    try {
      const dbHealth = await checkDatabaseConnection();
      checks.database = {
        status: dbHealth.connected ? 'healthy' : 'unhealthy',
        latency: dbHealth.latency || 0,
        error: dbHealth.error || null,
        duration: Date.now() - dbStart
      };
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - dbStart
      };
    }

    // Test Redis connection
    const redisStart = Date.now();
    try {
      const pingResult = await redis.ping();
      checks.redis = {
        status: pingResult ? 'healthy' : 'unhealthy',
        latency: Date.now() - redisStart,
        response: pingResult
      };
    } catch (error) {
      checks.redis = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - redisStart
      };
    }

    // Test environment variables
    checks.environment = {
      hasDatabase: !!process.env.DATABASE_URL,
      hasRedis: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
      hasAuth: !!process.env.NEXTAUTH_SECRET,
      nodeEnv: process.env.NODE_ENV
    };

    const totalDuration = Date.now() - startTime;
    const overallStatus = Object.values(checks).every(check => 
      typeof check === 'object' && check.status !== 'unhealthy'
    ) ? 'healthy' : 'unhealthy';

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      checks
    });

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      error: error instanceof Error ? error.message : 'Unknown error',
      checks
    }, { status: 500 });
  }
}