import jwt from 'jsonwebtoken';
import { upstashRedis, isUpstashRedisAvailable } from './upstash-redis.service';
import { rateLimitManager } from './rate-limit-manager';
import { VapiTokenResponse } from './vapi-jwt.service';

interface VapiTokenRedisResponse extends VapiTokenResponse {
  cached: boolean;
}

class VapiJWTRedisService {
  private readonly orgId: string;
  private readonly privateKey: string;
  private readonly defaultExpiration = 3600; // 1 hour
  // Fallback to memory cache if Redis is not available
  private memoryCache = new Map<string, { token: VapiTokenRedisResponse; validUntil: number }>();

  constructor() {
    this.orgId = process.env.VAPI_ORG_ID!;
    this.privateKey = this.formatPrivateKey(process.env.VAPI_PRIVATE_KEY!);
    
    if (!this.orgId || !this.privateKey) {
      throw new Error('VAPI_ORG_ID and VAPI_PRIVATE_KEY environment variables are required');
    }

    // Cleanup memory cache every 5 minutes
    setInterval(() => this.cleanupMemoryCache(), 5 * 60 * 1000);
  }

  private formatPrivateKey(key: string): string {
    // Handle different private key formats
    if (!key) return '';
    
    // If it's already properly formatted, return as is
    if (key.includes('-----BEGIN') && key.includes('-----END')) {
      return key
        .replace(/\\n/g, '\n')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
    }
    
    // For UUID-style API keys, return as is
    return key;
  }

  private generateCacheKey(userId: string, scope: string): string {
    return `vapi:token:${userId}:${scope}`;
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.validUntil < now) {
        this.memoryCache.delete(key);
      }
    }
  }

  async getOrCreateToken(
    userId: string, 
    scope: 'public' | 'private' = 'public',
    userType: 'standard' | 'premium' = 'standard'
  ): Promise<VapiTokenRedisResponse> {
    // Check rate limits first
    const profileName = userType === 'premium' ? 'premium' : 'vapi-token';
    const rateLimitCheck = await rateLimitManager.checkLimits(userId, profileName, {
      scope,
      userType,
    });

    if (!rateLimitCheck.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${rateLimitCheck.nextRetryAfter} seconds.`);
    }

    const cacheKey = this.generateCacheKey(userId, scope);
    
    // Try Redis cache if available
    if (isUpstashRedisAvailable() && upstashRedis) {
      try {
        // Try to get from Redis cache first
        const cached = await upstashRedis.get<VapiTokenRedisResponse>(cacheKey);
        if (cached && cached.expiresAt > Math.floor(Date.now() / 1000) + 300) { // 5 min buffer
          console.log(`🎯 Token cache hit for ${userId}:${scope} (Redis)`);
          return { ...cached, cached: true };
        }
      } catch (error) {
        console.error('Redis cache error, falling back to memory:', error);
      }
    } else {
      // Fallback to memory cache
      const memCached = this.memoryCache.get(cacheKey);
      if (memCached && memCached.validUntil > Date.now() + (5 * 60 * 1000)) { // 5 min buffer
        console.log(`🎯 Token cache hit for ${userId}:${scope} (Memory)`);
        return { ...memCached.token, cached: true };
      }
    }

    // Generate new token
    const tokenData = this.generateToken(userId, scope);
    const redisToken: VapiTokenRedisResponse = { ...tokenData, cached: false };
    
    // Cache in Redis if available
    if (isUpstashRedisAvailable() && upstashRedis) {
      try {
        const cacheExpiry = Math.max(1, tokenData.expiresAt - Math.floor(Date.now() / 1000) - 60); // 1 min before token expires
        await upstashRedis.set(cacheKey, redisToken, { ex: cacheExpiry });
        console.log(`🔑 Generated new token for ${userId}:${scope}, cached in Redis for ${cacheExpiry}s`);
      } catch (error) {
        console.error('Failed to cache token in Redis:', error);
      }
    } else {
      // Fallback to memory cache
      this.memoryCache.set(cacheKey, {
        token: redisToken,
        validUntil: tokenData.expiresAt * 1000 - 60000, // 1 min before token expires
      });
      console.log(`🔑 Generated new token for ${userId}:${scope}, cached in memory`);
    }
    
    return redisToken;
  }

  private generateToken(userId: string, scope: 'public' | 'private'): VapiTokenResponse {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + this.defaultExpiration;

    // VAPI expects a specific JWT structure with a 'token' object
    const payload = {
      orgId: this.orgId,
      sub: userId,
      iat: now,
      exp: expiresAt,
      iss: 'vapi-therapy-app',
      // This is the required structure for VAPI JWT tokens
      token: {
        tag: scope,
        restrictions: {
          enabled: true,
          allowedOrigins: process.env.NODE_ENV === 'production' 
            ? [process.env.NEXTAUTH_URL || 'https://yourdomain.com']
            : ['http://localhost:3000', 'http://0.0.0.0:3000'],
          allowTransientAssistant: true, // Allow inline configurations
        },
      },
    };

    try {
      // Determine algorithm based on key format
      const isRSAKey = this.privateKey.includes('-----BEGIN');
      const algorithm = isRSAKey ? 'RS256' : 'HS256';
      
      const token = jwt.sign(payload, this.privateKey, { 
        algorithm: algorithm as jwt.Algorithm
      });
      
      console.log(`[VapiJWTRedisService] Generated JWT token with ${algorithm} algorithm for user ${userId}`);
      
      return {
        token,
        expiresAt,
        scope,
        issuedAt: now,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[VapiJWTRedisService] JWT generation failed:', error);
      throw new Error(`JWT generation failed: ${message}`);
    }
  }

  async invalidateUserTokens(userId: string): Promise<number> {
    const patterns = [
      this.generateCacheKey(userId, 'public'),
      this.generateCacheKey(userId, 'private'),
    ];
    
    // Clear from memory cache
    patterns.forEach(pattern => this.memoryCache.delete(pattern));
    
    // Clear from Redis if available
    if (isUpstashRedisAvailable() && upstashRedis) {
      try {
        return await upstashRedis.del(patterns);
      } catch (error) {
        console.error('Failed to invalidate tokens in Redis:', error);
        return 0;
      }
    }
    
    return patterns.length; // Return count of patterns cleared from memory
  }

  async getUserTokenInfo(userId: string): Promise<{
    public?: { expiresAt: number; cached: boolean };
    private?: { expiresAt: number; cached: boolean };
  }> {
    const result: any = {};
    
    if (isUpstashRedisAvailable() && upstashRedis) {
      try {
        const [publicToken, privateToken] = await Promise.all([
          upstashRedis.get<VapiTokenRedisResponse>(this.generateCacheKey(userId, 'public')),
          upstashRedis.get<VapiTokenRedisResponse>(this.generateCacheKey(userId, 'private')),
        ]);
        
        if (publicToken) {
          result.public = { expiresAt: publicToken.expiresAt, cached: true };
        }
        
        if (privateToken) {
          result.private = { expiresAt: privateToken.expiresAt, cached: true };
        }
      } catch (error) {
        console.error('Failed to get token info from Redis:', error);
      }
    } else {
      // Check memory cache
      const publicMem = this.memoryCache.get(this.generateCacheKey(userId, 'public'));
      const privateMem = this.memoryCache.get(this.generateCacheKey(userId, 'private'));
      
      if (publicMem) {
        result.public = { expiresAt: publicMem.token.expiresAt, cached: true };
      }
      
      if (privateMem) {
        result.private = { expiresAt: privateMem.token.expiresAt, cached: true };
      }
    }

    return result;
  }

  // Check if Redis is being used or fallback to memory
  getBackendType(): 'redis' | 'memory' {
    return isUpstashRedisAvailable() ? 'redis' : 'memory';
  }
}

// Export singleton instance with Redis support
// Initialize only if required environment variables are present
let vapiJWTRedisService: VapiJWTRedisService | null = null;

try {
  if (process.env.VAPI_ORG_ID && process.env.VAPI_PRIVATE_KEY) {
    vapiJWTRedisService = new VapiJWTRedisService();
  } else {
    console.error('[VapiJWTRedisService] Missing required environment variables: VAPI_ORG_ID and/or VAPI_PRIVATE_KEY');
  }
} catch (error) {
  console.error('[VapiJWTRedisService] Failed to initialize:', error);
  vapiJWTRedisService = null;
}

export { vapiJWTRedisService };

// Export a flag to check if Redis is available
export const isRedisEnabled = isUpstashRedisAvailable();