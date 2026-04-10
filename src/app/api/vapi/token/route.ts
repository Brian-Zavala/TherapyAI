import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server';
import { validateVapiKey } from '@/lib/vapi-key-validator';
import type { VapiTokenRequest, VapiError } from '@/lib/vapi-jwt.service';

// Lazy-load these to avoid jsonwebtoken crash at module init
let _vapiJWTRedisService: any = null;
let _isRedisEnabled = false;
let _upstashRedis: any = null;

async function getJWTService() {
  if (_vapiJWTRedisService === null) {
    try {
      const mod = await import('@/lib/vapi-jwt-redis.service');
      _vapiJWTRedisService = mod.vapiJWTRedisService;
      _isRedisEnabled = mod.isRedisEnabled;
    } catch {
      _vapiJWTRedisService = undefined;
      _isRedisEnabled = false;
    }
  }
  return { vapiJWTRedisService: _vapiJWTRedisService, isRedisEnabled: _isRedisEnabled };
}

async function getUpstashRedis() {
  if (_upstashRedis === null) {
    try {
      const mod = await import('@/lib/upstash-redis.service');
      _upstashRedis = mod.upstashRedis;
    } catch {
      _upstashRedis = undefined;
    }
  }
  return _upstashRedis;
}

/**
 * Generate a secure client token for Vapi
 * This endpoint now generates proper JWT tokens for VAPI authentication
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: VapiTokenRequest = await req.json();
    const { scope = 'public', userId = session.user.id } = body;

    // Get user type from session or default to standard
    const userType = (session.user as any)?.type || 'standard';

    // Validate scope
    if (scope && !['public', 'private'].includes(scope)) {
      return NextResponse.json({
        error: 'Scope must be either "public" or "private"',
        code: 'INVALID_SCOPE',
        statusCode: 400,
      } as VapiError, { status: 400 });
    }

    // Validate userId
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      return NextResponse.json({
        error: 'Valid userId is required',
        code: 'INVALID_USER_ID',
        statusCode: 400,
      } as VapiError, { status: 400 });
    }

    const startTime = Date.now();

    try {
      let tokenData;
      let tokenType: 'direct' | 'jwt' | 'api-key' = 'direct';
      
      // Try using the public key directly first
      const publicKey = process.env.VAPI_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
      const serverKey = process.env.VAPI_SERVER_KEY;
      const therapyApiKey = process.env.VAPI_THERAPY_API_KEY;
      
      // Use the public key for client SDK authentication
      if (publicKey) {
        console.log('[VAPI Token] Using VAPI public key for client SDK');
        
        tokenData = {
          token: publicKey,
          expiresAt: Math.floor(Date.now() / 1000) + 86400, // 24 hours for cache
          scope,
          issuedAt: Math.floor(Date.now() / 1000),
          cached: false,
        };
        tokenType = 'direct';
      } else if (process.env.VAPI_PRIVATE_KEY && process.env.VAPI_ORG_ID) {
        // Legacy JWT approach (keeping as fallback)
        const { vapiJWTRedisService } = await getJWTService();
        if (vapiJWTRedisService) {
          console.log('[VAPI Token] Falling back to JWT token generation');
          tokenData = await vapiJWTRedisService.getOrCreateToken(userId, scope, userType);
          tokenType = 'jwt';
        }
      } else {
        // Final fallback: Check if we have a public API key available
        const apiKey = process.env.VAPI_API_KEY;
        const validation = apiKey ? validateVapiKey(apiKey) : null;
        
        if (validation?.isValid && validation.type === 'public') {
          console.log('[VAPI Token] Using public API key directly (final fallback)');
          
          tokenData = {
            token: apiKey,
            expiresAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour for cache
            scope,
            issuedAt: Math.floor(Date.now() / 1000),
            cached: false,
          };
          tokenType = 'api-key';
        } else {
          console.error('[VAPI Token] No valid authentication method available');
          console.error('[VAPI Token] Please set VAPI_PRIVATE_KEY (UUID format) in environment variables');
          return NextResponse.json({
            error: 'Voice service authentication not configured. Please contact support.',
            code: 'AUTH_NOT_CONFIGURED',
            statusCode: 503,
            details: 'VAPI authentication requires VAPI_PRIVATE_KEY to be set',
          } as VapiError, { status: 503 });
        }
      }
      
      const responseTime = Date.now() - startTime;
      console.log(`Generated ${tokenType} token for user ${session.user.email} with scope: ${scope} in ${responseTime}ms`);
      
      // Set security headers
      const response = NextResponse.json(tokenData);
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      response.headers.set('X-Response-Time', `${responseTime}ms`);
      response.headers.set('X-Cache-Status', tokenData.cached ? 'HIT' : 'MISS');
      response.headers.set('X-Rate-Limit-Profile', userType === 'premium' ? 'premium' : 'vapi-token');
      const { isRedisEnabled } = await getJWTService();
      response.headers.set('X-Backend-Type', isRedisEnabled ? 'redis' : 'memory');
      response.headers.set('X-Token-Type', tokenType);
      
      return response;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
        const retryMatch = error.message.match(/Retry after (\d+) seconds/);
        const retryAfter = retryMatch ? parseInt(retryMatch[1]) : 900;
        
        return NextResponse.json({
          error: error.message,
          code: 'RATE_LIMIT_EXCEEDED',
          statusCode: 429,
          retryAfter,
        } as VapiError, { 
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-Rate-Limit-Profile': userType === 'premium' ? 'premium' : 'vapi-token',
          }
        });
      }
      
      throw error;
    }
    
  } catch (error) {
    console.error('Error in token route:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to generate token',
      code: 'TOKEN_GENERATION_FAILED',
      statusCode: 500
    } as VapiError, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  try {
    const upstashRedis = await getUpstashRedis();
    const { isRedisEnabled } = await getJWTService();
    const health = upstashRedis ? await upstashRedis.healthCheck() : null;
    const metrics = upstashRedis ? upstashRedis.getMetrics() : null;

    return NextResponse.json({
      status: health?.healthy || !isRedisEnabled ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      backend: isRedisEnabled ? 'redis' : 'memory',
      redis: health,
      metrics,
      uptime: metrics?.uptime || 0,
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      backend: 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}