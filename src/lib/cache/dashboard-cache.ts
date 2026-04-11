// @ts-nocheck
/**
 * Dashboard Query Result Cache
 * Implements in-memory and Redis caching for expensive dashboard queries
 */

import { Redis } from '@upstash/redis';
import { isRedisHealthy } from './redis-health';

// Cache configuration
const CACHE_TTL = {
  notifications: 60 * 1000,        // 1 minute
  sessions: 2 * 60 * 1000,         // 2 minutes
  metrics: 60 * 1000,              // 1 minute
  progress: 2 * 60 * 1000,         // 2 minutes
  insights: 5 * 60 * 1000,         // 5 minutes
  userProfile: 5 * 60 * 1000,      // 5 minutes
};

// In-memory cache with LRU eviction
class LRUCache<T> {
  private cache = new Map<string, { data: T; expires: number; lastAccess: number }>();
  private maxSize = 100;

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (item.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    // Update last access time for LRU
    item.lastAccess = Date.now();
    return item.data;
  }

  set(key: string, data: T, ttl: number): void {
    // Evict least recently used if at capacity
    if (this.cache.size >= this.maxSize) {
      let oldestKey = '';
      let oldestTime = Infinity;
      
      for (const [k, v] of this.cache.entries()) {
        if (v.lastAccess < oldestTime) {
          oldestTime = v.lastAccess;
          oldestKey = k;
        }
      }
      
      if (oldestKey) this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl,
      lastAccess: Date.now(),
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Initialize caches
const memoryCache = new LRUCache<any>();
let redis: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// Cache key generators
export const cacheKeys = {
  notifications: (userId: string, params: any) => 
    `dashboard:notifications:${userId}:${JSON.stringify(params)}`,
  
  sessions: (userId: string, status?: string, theme?: string) => 
    `dashboard:sessions:${userId}:${status || 'all'}:${theme || 'all'}`,
  
  metrics: (userId: string, sessionId?: string, therapyType?: string) => 
    `dashboard:metrics:${userId}:${sessionId || 'latest'}:${therapyType || 'all'}`,
  
  progress: (userId: string, timeframe: string, therapyType?: string) => 
    `dashboard:progress:${userId}:${timeframe}:${therapyType || 'all'}`,
  
  insights: (userId: string, therapyType?: string) => 
    `dashboard:insights:${userId}:${therapyType || 'all'}`,
  
  userProfile: (userId: string) => 
    `dashboard:profile:${userId}`,
  
  sessionCounts: (userId: string) => 
    `dashboard:session-counts:${userId}`,
  
  // Therapy-type-specific cache keys
  communicationMetrics: (userId: string, therapyType: string) => 
    `dashboard:communication-metrics:${userId}:${therapyType}`,
  
  relationshipProgress: (userId: string, therapyType: string, timeframe: string) => 
    `dashboard:relationship-progress:${userId}:${therapyType}:${timeframe}`,
  
  aiInsights: (userId: string, therapyType: string) => 
    `dashboard:ai-insights:${userId}:${therapyType}`,
};

// Main cache interface
export const dashboardCache = {
  /**
   * Get cached data with fallback to memory cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try memory cache first (fastest)
      const memoryResult = memoryCache.get(key);
      if (memoryResult) {
        console.log(`[DashboardCache] Memory hit: ${key}`);
        return memoryResult;
      }
      
      // Try Redis if healthy
      if (redis && isRedisHealthy()) {
        try {
          const redisResult = await redis.get(key);
          if (redisResult) {
            console.log(`[DashboardCache] Redis hit: ${key}`);
            // Populate memory cache for next access
            const ttl = CACHE_TTL[key.split(':')[1]] || 60000;
            memoryCache.set(key, redisResult, ttl);
            return redisResult as T;
          }
        } catch (error) {
          console.warn('[DashboardCache] Redis error:', error);
        }
      }
      
      console.log(`[DashboardCache] Cache miss: ${key}`);
      return null;
    } catch (error) {
      console.error('[DashboardCache] Get error:', error);
      return null;
    }
  },

  /**
   * Set data in both memory and Redis caches
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const cacheType = key.split(':')[1];
      const finalTTL = ttl || CACHE_TTL[cacheType] || 60000;
      
      // Always set in memory cache
      memoryCache.set(key, data, finalTTL);
      console.log(`[DashboardCache] Set in memory: ${key}`);
      
      // Try to set in Redis if healthy
      if (redis && isRedisHealthy()) {
        try {
          await redis.set(key, data, { px: finalTTL });
          console.log(`[DashboardCache] Set in Redis: ${key}`);
        } catch (error) {
          console.warn('[DashboardCache] Redis set error:', error);
        }
      }
    } catch (error) {
      console.error('[DashboardCache] Set error:', error);
    }
  },

  /**
   * Invalidate specific cache key
   */
  async invalidate(key: string): Promise<void> {
    try {
      memoryCache.delete(key);
      
      if (redis && isRedisHealthy()) {
        try {
          await redis.del(key);
        } catch (error) {
          console.warn('[DashboardCache] Redis delete error:', error);
        }
      }
      
      console.log(`[DashboardCache] Invalidated: ${key}`);
    } catch (error) {
      console.error('[DashboardCache] Invalidate error:', error);
    }
  },

  /**
   * Invalidate all cache entries for a user
   */
  async invalidateUser(userId: string): Promise<void> {
    try {
      const pattern = `dashboard:*:${userId}:*`;
      
      // Clear from memory cache (simple implementation)
      memoryCache.clear(); // TODO: Implement pattern matching
      
      // Clear from Redis
      if (redis && isRedisHealthy()) {
        try {
          let cursor = 0;
          do {
            const [newCursor, keys] = await redis.scan(cursor, {
              match: pattern,
              count: 100,
            });
            cursor = parseInt(newCursor);
            
            if (keys.length > 0) {
              await redis.del(...keys);
            }
          } while (cursor !== 0);
        } catch (error) {
          console.warn('[DashboardCache] Redis pattern delete error:', error);
        }
      }
      
      console.log(`[DashboardCache] Invalidated user: ${userId}`);
    } catch (error) {
      console.error('[DashboardCache] Invalidate user error:', error);
    }
  },

  /**
   * Invalidate therapy-type-specific cache entries
   */
  async invalidateTherapyType(userId: string, therapyType: string): Promise<void> {
    try {
      const keys = [
        cacheKeys.communicationMetrics(userId, therapyType),
        cacheKeys.relationshipProgress(userId, therapyType, 'all'),
        cacheKeys.relationshipProgress(userId, therapyType, 'week'),
        cacheKeys.relationshipProgress(userId, therapyType, 'month'),
        cacheKeys.aiInsights(userId, therapyType),
        cacheKeys.sessionCounts(userId)
      ];
      
      for (const key of keys) {
        await this.invalidate(key);
      }
      
      console.log(`[DashboardCache] Invalidated therapy type ${therapyType} for user: ${userId}`);
    } catch (error) {
      console.error('[DashboardCache] Invalidate therapy type error:', error);
    }
  },

  /**
   * Invalidate cache when session is completed
   */
  async invalidateOnSessionComplete(userId: string, sessionTheme: string, sessionType: string): Promise<void> {
    try {
      // Map session to therapy type
      const therapyType = this.mapSessionToTherapyType(sessionTheme, sessionType);
      
      if (therapyType) {
        await this.invalidateTherapyType(userId, therapyType);
        
        // Also invalidate general session counts
        await this.invalidate(cacheKeys.sessionCounts(userId));
      }
      
      console.log(`[DashboardCache] Invalidated on session complete for user: ${userId}, therapy type: ${therapyType}`);
    } catch (error) {
      console.error('[DashboardCache] Invalidate on session complete error:', error);
    }
  },

  /**
   * Map session theme/type to therapy type
   */
  mapSessionToTherapyType(theme: string, sessionType: string): 'solo' | 'couple' | 'family' | null {
    const lowerTheme = theme.toLowerCase();
    // DB stores uppercase enums (SOLO/COUPLE/FAMILY) — normalize before comparing
    const lowerType = sessionType.toLowerCase();

    if (lowerTheme.includes('individual') || lowerTheme.includes('solo') || lowerType === 'solo' || lowerType === 'individual') {
      return 'solo';
    }
    if (lowerTheme.includes('relationship') || lowerTheme.includes('couple') || lowerType === 'couple') {
      return 'couple';
    }
    if (lowerTheme.includes('family') || lowerType === 'family') {
      return 'family';
    }

    return null;
  },

  /**
   * Get cache statistics
   */
  getStats(): { memorySize: number; redisHealthy: boolean } {
    return {
      memorySize: memoryCache.size(),
      redisHealthy: isRedisHealthy(),
    };
  },
};

// Utility function to wrap API handlers with caching
export function withDashboardCache<T>(
  getCacheKey: (params: any) => string,
  handler: () => Promise<T>,
  options?: { ttl?: number; skipCache?: boolean }
): Promise<T> {
  return async () => {
    if (options?.skipCache) {
      return handler();
    }
    
    const cacheKey = getCacheKey({});
    
    // Try cache first
    const cached = await dashboardCache.get<T>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Execute handler and cache result
    const result = await handler();
    await dashboardCache.set(cacheKey, result, options?.ttl);
    
    return result;
  };
}

// Performance monitoring wrapper
export function trackCachePerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  return fn().finally(() => {
    const duration = Date.now() - start;
    if (duration > 100) {
      console.warn(`[DashboardCache] Slow ${operation}: ${duration}ms`);
    }
  });
}