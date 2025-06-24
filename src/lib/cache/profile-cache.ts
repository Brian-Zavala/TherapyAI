// Profile caching service with Redis/memory fallback
import { Redis } from '@upstash/redis'

// Initialize Redis client if available
let redis: Redis | null = null
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

// In-memory cache fallback
const memoryCache = new Map<string, { data: any; expires: number }>()

// Cache TTL (5 minutes)
const CACHE_TTL = 5 * 60 * 1000

export const profileCache = {
  async get(key: string): Promise<any | null> {
    try {
      // Try Redis first
      if (redis) {
        const cached = await redis.get(key)
        if (cached) {
          console.log(`[ProfileCache] Redis hit for key: ${key}`)
          return cached
        }
      }
      
      // Fallback to memory cache
      const memoryCached = memoryCache.get(key)
      if (memoryCached && memoryCached.expires > Date.now()) {
        console.log(`[ProfileCache] Memory hit for key: ${key}`)
        return memoryCached.data
      }
      
      console.log(`[ProfileCache] Cache miss for key: ${key}`)
      return null
    } catch (error) {
      console.error('[ProfileCache] Error getting from cache:', error)
      // On error, try memory cache
      const memoryCached = memoryCache.get(key)
      if (memoryCached && memoryCached.expires > Date.now()) {
        return memoryCached.data
      }
      return null
    }
  },

  async set(key: string, value: any, ttl: number = CACHE_TTL): Promise<void> {
    try {
      // Set in Redis if available
      if (redis) {
        await redis.set(key, value, { px: ttl })
        console.log(`[ProfileCache] Set in Redis: ${key}`)
      }
      
      // Always set in memory cache as backup
      memoryCache.set(key, {
        data: value,
        expires: Date.now() + ttl
      })
      console.log(`[ProfileCache] Set in memory: ${key}`)
      
      // Clean up expired memory entries periodically
      if (Math.random() < 0.1) { // 10% chance
        cleanupMemoryCache()
      }
    } catch (error) {
      console.error('[ProfileCache] Error setting cache:', error)
      // Still set in memory cache on error
      memoryCache.set(key, {
        data: value,
        expires: Date.now() + ttl
      })
    }
  },

  async invalidate(key: string): Promise<void> {
    try {
      if (redis) {
        await redis.del(key)
      }
      memoryCache.delete(key)
      console.log(`[ProfileCache] Invalidated: ${key}`)
    } catch (error) {
      console.error('[ProfileCache] Error invalidating cache:', error)
      memoryCache.delete(key)
    }
  },

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // For memory cache, delete all matching keys
      const regex = new RegExp(pattern.replace('*', '.*'))
      for (const key of memoryCache.keys()) {
        if (regex.test(key)) {
          memoryCache.delete(key)
        }
      }
      
      // For Redis, use scan and delete
      if (redis) {
        let cursor = 0
        do {
          const [newCursor, keys] = await redis.scan(cursor, {
            match: pattern,
            count: 100
          })
          cursor = parseInt(newCursor)
          
          if (keys.length > 0) {
            await redis.del(...keys)
          }
        } while (cursor !== 0)
      }
      
      console.log(`[ProfileCache] Invalidated pattern: ${pattern}`)
    } catch (error) {
      console.error('[ProfileCache] Error invalidating pattern:', error)
    }
  }
}

// Cleanup expired entries from memory cache
function cleanupMemoryCache() {
  const now = Date.now()
  let cleaned = 0
  
  for (const [key, value] of memoryCache.entries()) {
    if (value.expires < now) {
      memoryCache.delete(key)
      cleaned++
    }
  }
  
  if (cleaned > 0) {
    console.log(`[ProfileCache] Cleaned up ${cleaned} expired entries`)
  }
}

// Export cache key helpers
export const cacheKeys = {
  userProfile: (userId: string) => `profile:${userId}`,
  userProfileByEmail: (email: string) => `profile:email:${email}`,
  allProfiles: () => 'profile:*'
}