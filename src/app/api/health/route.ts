import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRateLimiterConfig } from '@/lib/security/platform-agnostic-rate-limiter'
import { createClient } from '@supabase/supabase-js'

// Detect deployment platform
const DEPLOYMENT_PLATFORM = (() => {
  if (process.env.VERCEL) return 'vercel'
  if (process.env.RAILWAY_ENVIRONMENT) return 'railway'
  if (process.env.RENDER_SERVICE_NAME) return 'render'
  if (process.env.FLY_APP_NAME) return 'fly'
  if (process.env.NETLIFY) return 'netlify'
  if (process.env.HEROKU_APP_ID) return 'heroku'
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return 'aws-lambda'
  if (process.env.GOOGLE_CLOUD_PROJECT) return 'google-cloud'
  if (process.env.AZURE_FUNCTIONS_ENVIRONMENT) return 'azure'
  return 'self-hosted'
})()

/**
 * Health Check Endpoint
 * Provides comprehensive diagnostics for any deployment platform
 */
export async function GET() {
  const startTime = Date.now()
  
  // Initialize health status
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    platform: {
      detected: DEPLOYMENT_PLATFORM,
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    services: {
      database: { status: 'unknown', latency: 0 } as { status: string; latency: number; error?: string },
      redis: { status: 'unknown', type: 'none' },
      supabase: { status: 'unknown', latency: 0 } as { status: string; latency: number; error?: string },
      email: { status: 'unknown', provider: 'resend' },
      sms: { status: 'unknown', provider: 'twilio', mode: 'unknown' },
      vapi: { status: 'unknown' },
    },
    security: {
      csrf: { enabled: true, middleware: 'edge-csrf' },
      rateLimit: getRateLimiterConfig(),
      cors: { enabled: true },
      headers: { configured: true },
    },
    deployment: {
      vercelUrl: process.env.VERCEL_URL,
      railwayStaticUrl: process.env.RAILWAY_STATIC_URL,
      renderServiceName: process.env.RENDER_SERVICE_NAME,
      flyAppName: process.env.FLY_APP_NAME,
      port: process.env.PORT || '3000',
    },
    recommendations: [] as string[],
  }

  // Check Database
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    health.services.database = {
      status: 'healthy',
      latency: Date.now() - dbStart,
    }
  } catch (error) {
    health.status = 'degraded'
    health.services.database = {
      status: 'unhealthy',
      latency: 0,
      error: error instanceof Error ? error.message : 'Database connection failed',
    }
    health.recommendations.push('Check DATABASE_URL environment variable')
  }

  // Check Redis/Rate Limiting
  const rateLimitConfig = getRateLimiterConfig()
  health.services.redis = {
    status: rateLimitConfig.hasRedis ? 'healthy' : 'not_configured',
    type: rateLimitConfig.redisType,
  }
  
  if (!rateLimitConfig.hasRedis) {
    health.recommendations.push(...rateLimitConfig.recommendations)
  }

  // Check Supabase Realtime
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabaseStart = Date.now()
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      
      // Simple connectivity check
      const { error } = await supabase.from('_test_').select('*').limit(1)
      
      health.services.supabase = {
        status: error?.code === 'PGRST116' ? 'healthy' : 'unhealthy', // Table not found is expected
        latency: Date.now() - supabaseStart,
      }
    } catch (error) {
      health.services.supabase = {
        status: 'unhealthy',
        latency: 0,
        error: 'Supabase connection failed',
      }
    }
  } else {
    health.services.supabase = {
      status: 'not_configured',
      latency: 0,
    }
    health.recommendations.push('Configure Supabase for real-time features')
  }

  // Check Email Service (Resend)
  if (process.env.RESEND_API_KEY) {
    health.services.email = {
      status: 'configured',
      provider: 'resend',
    }
  } else {
    health.services.email = {
      status: 'not_configured',
      provider: 'none',
    }
    health.recommendations.push('Configure RESEND_API_KEY for email notifications')
  }

  // Check SMS Service (Twilio)
  if (process.env.SMS_USE_MOCK === 'true') {
    health.services.sms = {
      status: 'healthy',
      provider: 'twilio',
      mode: 'mock',
    }
  } else if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    health.services.sms = {
      status: 'configured',
      provider: 'twilio',
      mode: 'production',
    }
  } else {
    health.services.sms = {
      status: 'not_configured',
      provider: 'none',
      mode: 'disabled',
    }
  }

  // Check VAPI
  if (process.env.VAPI_API_KEY) {
    health.services.vapi = {
      status: 'configured',
    }
  } else {
    health.services.vapi = {
      status: 'not_configured',
    }
    health.recommendations.push('Configure VAPI_API_KEY for voice AI features')
  }

  // Platform-specific recommendations
  switch (DEPLOYMENT_PLATFORM) {
    case 'railway':
      if (process.env.REDIS_URL && !process.env.REDIS_URL.includes('family=0')) {
        health.recommendations.push('Add ?family=0 to REDIS_URL for Railway IPv6 support')
      }
      break
    
    case 'vercel':
      if (!process.env.KV_REST_API_URL && !process.env.UPSTASH_REDIS_REST_URL) {
        health.recommendations.push('Consider Vercel KV or Upstash Redis for better edge performance')
      }
      break
    
    case 'self-hosted':
      health.recommendations.push('Ensure proper process management (PM2, systemd, etc.)')
      health.recommendations.push('Configure reverse proxy (nginx, caddy) for production')
      break
  }

  // Calculate total latency
  const totalLatency = Date.now() - startTime

  // Determine overall health
  const unhealthyServices = Object.values(health.services).filter(
    service => service.status === 'unhealthy'
  ).length
  
  if (unhealthyServices > 0) {
    health.status = 'unhealthy'
  } else if (health.recommendations.length > 0) {
    health.status = 'degraded'
  }

  return NextResponse.json({
    ...health,
    latency: totalLatency,
    message: health.status === 'healthy' 
      ? `All systems operational on ${DEPLOYMENT_PLATFORM}` 
      : `Some issues detected on ${DEPLOYMENT_PLATFORM}`,
  }, {
    status: health.status === 'healthy' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Deployment-Platform': DEPLOYMENT_PLATFORM,
    }
  })
}