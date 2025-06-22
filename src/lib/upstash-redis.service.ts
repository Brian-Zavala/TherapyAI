import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { RateLimitConfig, RateLimitResult, CacheEntry, RedisMetrics } from '@/types/upstash';

class UpstashRedisService {
  private redis: Redis;
  private rateLimiters: Map<string, Ratelimit>;
  private cache: Map<string, CacheEntry>;
  private metrics: RedisMetrics;
  private startTime: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private metricsInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Initialize Redis connection
    this.redis = Redis.fromEnv();
    this.rateLimiters = new Map();
    this.cache = new Map();
    this.startTime = Date.now();
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      rateLimitViolations: 0,
      averageResponseTime: 0,
      errorCount: 0,
      uptime: 0,
    };

    // Cleanup cache every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
    
    // Update uptime every minute
    this.metricsInterval = setInterval(() => {
      this.metrics.uptime = Date.now() - this.startTime;
    }, 60 * 1000);

    this.validateConnection();
  }

  private async validateConnection(): Promise<void> {
    try {
      await this.redis.ping();
      console.log('✅ Upstash Redis connection established');
    } catch (error) {
      console.error('❌ Upstash Redis connection failed:', error);
      this.metrics.errorCount++;
    }
  }

  private generateLimiterKey(config: RateLimitConfig): string {
    const { requests, window, algorithm = 'slidingWindow', prefix = 'default' } = config;
    return `${prefix}:${algorithm}:${requests}:${window}`;
  }

  private createRateLimiter(config: RateLimitConfig): Ratelimit {
    const key = this.generateLimiterKey(config);
    
    if (this.rateLimiters.has(key)) {
      return this.rateLimiters.get(key)!;
    }

    const { requests, window, algorithm = 'slidingWindow', prefix = 'ratelimit' } = config;

    let limiter: any; // Algorithm type from Ratelimit

    switch (algorithm) {
      case 'fixedWindow':
        limiter = Ratelimit.fixedWindow(requests, window as any);
        break;
      case 'tokenBucket':
        // Token bucket: refill rate, window, burst capacity
        limiter = Ratelimit.tokenBucket(requests, window as any, requests * 2);
        break;
      case 'slidingWindow':
      default:
        limiter = Ratelimit.slidingWindow(requests, window as any);
        break;
    }

    const rateLimiter = new Ratelimit({
      redis: this.redis,
      limiter,
      prefix: `@upstash/${prefix}`,
      analytics: process.env.NODE_ENV === 'production',
      // Use ephemeral cache for better performance
      ephemeralCache: new Map(),
    });

    this.rateLimiters.set(key, rateLimiter);
    console.log(`📊 Created rate limiter: ${key}`);
    
    return rateLimiter;
  }

  async checkRateLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const startTime = Date.now();
    
    try {
      this.metrics.totalRequests++;
      
      const limiter = this.createRateLimiter(config);
      const result = await limiter.limit(identifier);

      if (!result.success) {
        this.metrics.rateLimitViolations++;
      }

      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);

      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
        identifier,
        algorithm: config.algorithm || 'slidingWindow',
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      this.metrics.errorCount++;
      
      // Fail open - allow request if rate limiter fails
      return {
        success: true,
        limit: config.requests,
        remaining: config.requests - 1,
        reset: Date.now() + this.parseWindow(config.window),
        identifier,
        algorithm: config.algorithm || 'slidingWindow',
      };
    }
  }

  private updateAverageResponseTime(responseTime: number): void {
    const totalTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1);
    this.metrics.averageResponseTime = (totalTime + responseTime) / this.metrics.totalRequests;
  }

  private parseWindow(window: string): number {
    const match = window.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error(`Invalid window format: ${window}`);

    const [, num, unit] = match;
    const value = parseInt(num);

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: throw new Error(`Unknown time unit: ${unit}`);
    }
  }

  // ==================== CACHING METHODS ====================

  async get<T = any>(key: string, useCache: boolean = true): Promise<T | null> {
    try {
      // Check local cache first
      if (useCache) {
        const cached = this.cache.get(key);
        if (cached && cached.expires > Date.now()) {
          cached.hits++;
          this.metrics.cacheHits++;
          return cached.data as T;
        }
      }

      this.metrics.cacheMisses++;
      const result = await this.redis.get(key);
      
      // Cache the result locally for 30 seconds
      if (useCache && result !== null) {
        this.cache.set(key, {
          data: result,
          expires: Date.now() + 30000,
          hits: 0,
        });
      }

      return result as T;
    } catch (error) {
      console.error('Redis GET error:', error);
      this.metrics.errorCount++;
      return null;
    }
  }

  async set(
    key: string, 
    value: any, 
    options?: { ex?: number; px?: number; nx?: boolean; xx?: boolean }
  ): Promise<boolean> {
    try {
      const result = await this.redis.set(key, value, options as any);
      
      // Update local cache
      if (options?.ex || options?.px) {
        const expiry = options.ex ? Date.now() + (options.ex * 1000) : 
                     options.px ? Date.now() + options.px : 
                     Date.now() + 300000; // 5 minutes default
        
        this.cache.set(key, {
          data: value,
          expires: expiry,
          hits: 0,
        });
      }

      return result === 'OK';
    } catch (error) {
      console.error('Redis SET error:', error);
      this.metrics.errorCount++;
      return false;
    }
  }

  async del(key: string | string[]): Promise<number> {
    try {
      const keys = Array.isArray(key) ? key : [key];
      
      // Remove from local cache
      keys.forEach(k => this.cache.delete(k));
      
      return await this.redis.del(...keys);
    } catch (error) {
      console.error('Redis DEL error:', error);
      this.metrics.errorCount++;
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      this.metrics.errorCount++;
      return false;
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch (error) {
      console.error('Redis INCR error:', error);
      this.metrics.errorCount++;
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, seconds);
      return result === 1;
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
      this.metrics.errorCount++;
      return false;
    }
  }

  // ==================== ADVANCED OPERATIONS ====================

  async pipeline(operations: Array<() => Promise<any>>): Promise<any[]> {
    try {
      // Note: Upstash Redis doesn't have traditional pipeline, 
      // but we can batch operations using Promise.all
      return await Promise.all(operations.map(op => op()));
    } catch (error) {
      console.error('Pipeline error:', error);
      this.metrics.errorCount++;
      return [];
    }
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    try {
      const result = await this.redis.zadd(key, { score, member });
      return result || 0;
    } catch (error) {
      console.error('Redis ZADD error:', error);
      this.metrics.errorCount++;
      return 0;
    }
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    try {
      return await this.redis.zremrangebyscore(key, min, max);
    } catch (error) {
      console.error('Redis ZREMRANGEBYSCORE error:', error);
      this.metrics.errorCount++;
      return 0;
    }
  }

  async zcard(key: string): Promise<number> {
    try {
      return await this.redis.zcard(key);
    } catch (error) {
      console.error('Redis ZCARD error:', error);
      this.metrics.errorCount++;
      return 0;
    }
  }

  // ==================== UTILITY METHODS ====================

  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  getMetrics(): RedisMetrics & { cacheSize: number; rateLimiterCount: number } {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      cacheSize: this.cache.size,
      rateLimiterCount: this.rateLimiters.size,
    };
  }

  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      rateLimitViolations: 0,
      averageResponseTime: 0,
      errorCount: 0,
      uptime: 0,
    };
    this.startTime = Date.now();
  }

  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const start = Date.now();
    
    try {
      await this.redis.ping();
      const latency = Date.now() - start;
      
      return {
        healthy: true,
        latency,
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Cleanup method for service destruction
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    this.cache.clear();
    this.rateLimiters.clear();
  }
}

// Export singleton instance
export const upstashRedis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new UpstashRedisService()
  : null;

export function isUpstashRedisAvailable(): boolean {
  return upstashRedis !== null;
}