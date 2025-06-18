import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { vapiJWTRedisService, isRedisEnabled } from '@/lib/vapi-jwt-redis.service';
import { upstashRedis } from '@/lib/upstash-redis.service';
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
      // Check if JWT service is available
      if (!vapiJWTRedisService) {
        console.error('[VAPI Token] JWT service not initialized - missing VAPI_ORG_ID or VAPI_PRIVATE_KEY environment variables');
        return NextResponse.json({
          error: 'Voice service configuration error. Please contact support.',
          code: 'SERVICE_NOT_CONFIGURED',
          statusCode: 503,
        } as VapiError, { status: 503 });
      }
      
      // Generate token with Redis caching and rate limiting
      const tokenData = await vapiJWTRedisService.getOrCreateToken(userId, scope, userType);
      
      const responseTime = Date.now() - startTime;
      console.log(`Generated JWT token for user ${session.user.email} with scope: ${scope} in ${responseTime}ms`);
      
      // Set security headers
      const response = NextResponse.json(tokenData);
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      response.headers.set('X-Response-Time', `${responseTime}ms`);
      response.headers.set('X-Cache-Status', tokenData.cached ? 'HIT' : 'MISS');
      response.headers.set('X-Rate-Limit-Profile', userType === 'premium' ? 'premium' : 'vapi-token');
      response.headers.set('X-Backend-Type', isRedisEnabled ? 'redis' : 'memory');
      
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