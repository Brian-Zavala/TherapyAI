import { upstashRedis, isUpstashRedisAvailable } from './upstash-redis.service';
import { validateVapiKey, getVapiWebKey } from './vapi-key-validator';

/**
 * Service for managing VAPI public tokens (API keys)
 * This is an alternative approach that uses VAPI API keys directly
 * instead of JWT tokens for web client authentication
 */
class VapiPublicTokenService {
  private readonly apiKey: string;
  private readonly orgId: string;
  private memoryCache = new Map<string, { token: string; expiresAt: number }>();

  constructor() {
    this.apiKey = process.env.VAPI_API_KEY || '';
    this.orgId = process.env.VAPI_ORG_ID || '';
    
    if (!this.apiKey) {
      console.warn('[VapiPublicTokenService] VAPI_API_KEY not found in environment variables');
    }
    
    // Cleanup memory cache every 5 minutes
    setInterval(() => this.cleanupMemoryCache(), 5 * 60 * 1000);
  }

  private cleanupMemoryCache(): void {
    const now = Date.now() / 1000;
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.expiresAt < now) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Get or create a public token for VAPI web client
   * For now, this returns the API key directly as VAPI web SDK might expect it
   */
  async getPublicToken(userId: string): Promise<{
    token: string;
    expiresAt: number;
    type: 'api-key' | 'jwt';
  }> {
    // Validate the API key
    const validation = validateVapiKey(this.apiKey);
    
    if (!validation.isValid) {
      console.error('[VapiPublicTokenService] Invalid API key:', validation);
      throw new Error(validation.message);
    }

    if (validation.type === 'secret') {
      console.error('[VapiPublicTokenService] SECURITY WARNING: Using secret key in web client!');
      console.error('Recommendations:', validation.recommendations);
      throw new Error('Cannot use secret key for web client. Please use a public key (pk_) instead.');
    }

    if (validation.type !== 'public') {
      throw new Error(`Invalid key type: ${validation.type}. Expected public key for web usage.`);
    }

    // For public keys, we can use them directly in the web client
    // They have built-in rate limiting and security on VAPI's side
    const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour expiry for cache

    return {
      token: this.apiKey,
      expiresAt,
      type: 'api-key'
    };
  }

  /**
   * Check if we should use API key directly or JWT tokens
   */
  shouldUseApiKey(): boolean {
    const validation = validateVapiKey(this.apiKey);
    
    // Use API key directly if:
    // 1. We have a valid public key (this is the recommended approach for web SDK)
    // 2. We don't have JWT private key configured
    // 3. The validation explicitly indicates public key usage
    return (
      (validation.isValid && validation.type === 'public') ||
      !process.env.VAPI_PRIVATE_KEY
    );
  }
}

// Export singleton instance
export const vapiPublicTokenService = new VapiPublicTokenService();