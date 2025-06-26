import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { vapiJWTRedisService, isRedisEnabled } from '@/lib/vapi-jwt-redis.service';
import { vapiPublicTokenService } from '@/lib/vapi-public-token-service';
import { upstashRedis } from '@/lib/upstash-redis.service';
import { validateVapiKey } from '@/lib/vapi-key-validator';
import type { VapiTokenRequest, VapiError } from '@/lib/vapi-jwt.service';

/**
 * Generate a secure client token for Vapi
 * This endpoint now generates proper JWT tokens for VAPI authentication
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
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
      let tokenType: 'jwt' | 'api-key' = 'jwt';
      
      // Check if we have JWT token generation available (preferred method)
      if (vapiJWTRedisService && process.env.VAPI_PRIVATE_KEY && process.env.VAPI_ORG_ID) {
        // Use JWT token generation - this is the recommended approach
        console.log('[VAPI Token] Using JWT token generation for web client');
        tokenData = await vapiJWTRedisService.getOrCreateToken(userId, scope, userType);
        tokenType = 'jwt';
      } else {
        // Fallback: Check if we have a public API key available
        const apiKey = process.env.VAPI_API_KEY;
        const validation = apiKey ? validateVapiKey(apiKey) : null;
        
        if (validation?.isValid && validation.type === 'public') {
          // Use the public API key directly as a fallback
          console.log('[VAPI Token] Using public API key directly (fallback method)');
          
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
          console.error('[VAPI Token] Please set either:');
          console.error('[VAPI Token] 1. VAPI_PRIVATE_KEY and VAPI_ORG_ID for JWT authentication (recommended)');
          console.error('[VAPI Token] 2. VAPI_API_KEY with a public key (pk_) as a fallback');
          return NextResponse.json({
            error: 'Voice service authentication not configured. Please contact support.',
            code: 'AUTH_NOT_CONFIGURED',
            statusCode: 503,
            details: 'VAPI authentication requires either JWT token setup or a public API key',
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
      backend: isRedisEnabled ? 'redis' : 'memory',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}