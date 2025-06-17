import { upstashRedis } from './upstash-redis.service';
import { RateLimitRule, RateLimitResult, RateLimitProfile } from '@/types/upstash';

class RateLimitManager {
  private profiles: Map<string, RateLimitProfile>;

  constructor() {
    this.profiles = new Map();
    this.initializeDefaultProfiles();
  }

  private initializeDefaultProfiles(): void {
    // Vapi Token Generation Profile
    this.addProfile({
      name: 'vapi-token',
      description: 'Rate limiting for Vapi JWT token generation',
      rules: [
        {
          name: 'user-token-limit',
          config: {
            requests: 20,
            window: '15m',
            algorithm: 'slidingWindow',
            prefix: 'vapi-token',
          },
        },
        {
          name: 'user-burst-limit',
          config: {
            requests: 5,
            window: '1m',
            algorithm: 'tokenBucket',
            prefix: 'vapi-burst',
          },
        },
      ],
    });

    // Authentication Profile
    this.addProfile({
      name: 'auth',
      description: 'Rate limiting for authentication attempts',
      rules: [
        {
          name: 'login-attempts',
          config: {
            requests: 5,
            window: '15m',
            algorithm: 'fixedWindow',
            prefix: 'auth-login',
          },
        },
        {
          name: 'password-reset',
          config: {
            requests: 3,
            window: '1h',
            algorithm: 'fixedWindow',
            prefix: 'auth-reset',
          },
        },
      ],
    });

    // Session Creation Profile
    this.addProfile({
      name: 'session-creation',
      description: 'Rate limiting for therapy session creation',
      rules: [
        {
          name: 'session-limit',
          config: {
            requests: 30,
            window: '1h',
            algorithm: 'slidingWindow',
            prefix: 'session-create',
          },
        },
        {
          name: 'session-burst',
          config: {
            requests: 5,
            window: '1m',
            algorithm: 'tokenBucket',
            prefix: 'session-burst',
          },
        },
      ],
    });

    // Registration Profile
    this.addProfile({
      name: 'registration',
      description: 'Rate limiting for user registration',
      rules: [
        {
          name: 'registration-limit',
          config: {
            requests: 3,
            window: '1h',
            algorithm: 'fixedWindow',
            prefix: 'register',
          },
        },
      ],
    });

    // API Profile
    this.addProfile({
      name: 'api',
      description: 'General API rate limiting',
      rules: [
        {
          name: 'general-api',
          config: {
            requests: 1000,
            window: '1h',
            algorithm: 'slidingWindow',
            prefix: 'api-general',
          },
        },
        {
          name: 'api-burst',
          config: {
            requests: 100,
            window: '1m',
            algorithm: 'tokenBucket',
            prefix: 'api-burst',
          },
        },
      ],
    });

    // Premium User Profile
    this.addProfile({
      name: 'premium',
      description: 'Enhanced limits for premium users',
      rules: [
        {
          name: 'premium-token',
          config: {
            requests: 100,
            window: '15m',
            algorithm: 'slidingWindow',
            prefix: 'premium-token',
          },
        },
        {
          name: 'premium-api',
          config: {
            requests: 5000,
            window: '1h',
            algorithm: 'slidingWindow',
            prefix: 'premium-api',
          },
        },
        {
          name: 'premium-session',
          config: {
            requests: 100,
            window: '1h',
            algorithm: 'slidingWindow',
            prefix: 'premium-session',
          },
        },
      ],
    });
  }

  addProfile(profile: RateLimitProfile): void {
    this.profiles.set(profile.name, profile);
    console.log(`📋 Added rate limit profile: ${profile.name}`);
  }

  async checkLimits(
    identifier: string, 
    profileName: string,
    metadata?: Record<string, any>
  ): Promise<{
    allowed: boolean;
    results: RateLimitResult[];
    violatedRules: string[];
    nextRetryAfter?: number;
  }> {
    // If Redis is not available, allow all requests
    if (!upstashRedis) {
      return {
        allowed: true,
        results: [],
        violatedRules: [],
      };
    }

    const profile = this.profiles.get(profileName);
    if (!profile) {
      throw new Error(`Rate limit profile not found: ${profileName}`);
    }

    const results: RateLimitResult[] = [];
    const violatedRules: string[] = [];
    let allowed = true;
    let nextRetryAfter: number | undefined;

    for (const rule of profile.rules) {
      // Apply rule condition if specified
      if (rule.condition && metadata) {
        const mockReq = { ...metadata, identifier };
        if (!rule.condition(mockReq)) {
          continue;
        }
      }

      const result = await upstashRedis.checkRateLimit(identifier, rule.config);
      results.push(result);

      if (!result.success) {
        allowed = false;
        violatedRules.push(rule.name);
        
        if (result.retryAfter && (!nextRetryAfter || result.retryAfter < nextRetryAfter)) {
          nextRetryAfter = result.retryAfter;
        }
      }
    }

    return {
      allowed,
      results,
      violatedRules,
      nextRetryAfter,
    };
  }

  getProfile(name: string): RateLimitProfile | undefined {
    return this.profiles.get(name);
  }

  listProfiles(): string[] {
    return Array.from(this.profiles.keys());
  }

  removeProfile(name: string): boolean {
    return this.profiles.delete(name);
  }

  // Helper method to get the appropriate profile based on user type
  getProfileForUser(userType: 'standard' | 'premium' | undefined, baseProfile: string): string {
    if (userType === 'premium' && this.profiles.has('premium')) {
      return 'premium';
    }
    return baseProfile;
  }

  // Get all profiles as an object for debugging
  getAllProfiles(): Record<string, RateLimitProfile> {
    const profiles: Record<string, RateLimitProfile> = {};
    this.profiles.forEach((profile, name) => {
      profiles[name] = profile;
    });
    return profiles;
  }
}

// Export singleton instance
export const rateLimitManager = new RateLimitManager();