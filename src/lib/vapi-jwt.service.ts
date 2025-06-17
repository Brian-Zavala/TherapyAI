import jwt from 'jsonwebtoken';

class VapiJWTService {
  private readonly orgId: string;
  private readonly privateKey: string;
  private readonly defaultExpiration = 3600; // 1 hour
  private tokenCache = new Map<string, { token: VapiTokenResponse; validUntil: number }>();
  private cleanupInterval: NodeJS.Timer | null = null;

  constructor() {
    this.orgId = process.env.VAPI_ORG_ID!;
    this.privateKey = this.formatPrivateKey(process.env.VAPI_PRIVATE_KEY!);
    
    if (!this.orgId || !this.privateKey) {
      throw new Error('VAPI_ORG_ID and VAPI_PRIVATE_KEY environment variables are required');
    }

    // Clean expired tokens every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanExpiredTokens(), 5 * 60 * 1000);
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
    
    // For UUID-style API keys (like the one in .env), return as is
    // These will use HS256 algorithm instead of RS256
    return key;
  }

  private cleanExpiredTokens(): void {
    const now = Date.now();
    for (const [key, value] of this.tokenCache.entries()) {
      if (value.validUntil < now) {
        this.tokenCache.delete(key);
      }
    }
  }

  async getOrCreateToken(userId: string, scope: 'public' | 'private' = 'public'): Promise<VapiTokenResponse> {
    const cacheKey = `${userId}-${scope}`;
    const cached = this.tokenCache.get(cacheKey);
    
    // Return cached token if valid and not expiring soon (5 min buffer)
    if (cached && cached.validUntil > Date.now() + (5 * 60 * 1000)) {
      return cached.token;
    }

    // Generate new token
    const tokenData = this.generateToken(userId, scope);
    
    // Cache token
    this.tokenCache.set(cacheKey, {
      token: tokenData,
      validUntil: tokenData.expiresAt * 1000
    });

    return tokenData;
  }

  private generateToken(userId: string, scope: 'public' | 'private'): VapiTokenResponse {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + this.defaultExpiration;

    const payload = {
      orgId: this.orgId,
      token: { scope },
      sub: userId,
      iat: now,
      exp: expiresAt,
      iss: 'vapi-therapy-app',
    };

    try {
      // Determine algorithm based on key format
      const isRSAKey = this.privateKey.includes('-----BEGIN');
      const algorithm = isRSAKey ? 'RS256' : 'HS256';
      
      const token = jwt.sign(payload, this.privateKey, { 
        algorithm: algorithm as jwt.Algorithm
      });
      
      console.log(`[VapiJWTService] Generated JWT token with ${algorithm} algorithm for user ${userId}`);
      
      return {
        token,
        expiresAt,
        scope,
        issuedAt: now,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[VapiJWTService] JWT generation failed:', error);
      throw new Error(`JWT generation failed: ${message}`);
    }
  }

  invalidateUserTokens(userId: string): void {
    for (const [key] of this.tokenCache.entries()) {
      if (key.startsWith(`${userId}-`)) {
        this.tokenCache.delete(key);
      }
    }
  }

  // Clean up on service destruction
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.tokenCache.clear();
  }
}

// Types
export interface VapiTokenResponse {
  token: string;
  expiresAt: number;
  scope: 'public' | 'private';
  issuedAt: number;
}

export interface VapiTokenRequest {
  scope?: 'public' | 'private';
  userId?: string;
}

export interface VapiError {
  error: string;
  code: string;
  statusCode: number;
  retryAfter?: number; // For rate limiting
}

// Export singleton instance
export const vapiJWTService = process.env.VAPI_ORG_ID && process.env.VAPI_PRIVATE_KEY
  ? new VapiJWTService()
  : null;

export function isVapiJWTAvailable(): boolean {
  return vapiJWTService !== null;
}