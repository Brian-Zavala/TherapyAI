// High-performance Redis connection pooling for <100ms latency
import { Redis } from '@upstash/redis'

interface RedisPoolConfig {
  maxConnections: number
  minConnections: number
  acquireTimeoutMs: number
  retryDelay: number
  maxRetries: number
}

interface PooledConnection {
  redis: Redis
  inUse: boolean
  createdAt: number
  lastUsed: number
}

class RedisConnectionPool {
  private pool: PooledConnection[] = []
  private waitingQueue: Array<{
    resolve: (redis: Redis) => void
    reject: (error: Error) => void
    timestamp: number
  }> = []
  
  private config: RedisPoolConfig = {
    maxConnections: 10,
    minConnections: 2, 
    acquireTimeoutMs: 5000,
    retryDelay: 100,
    maxRetries: 3
  }

  private stats = {
    totalConnections: 0,
    activeConnections: 0,
    queueSize: 0,
    totalAcquires: 0,
    totalReleases: 0,
    averageLatency: 0
  }

  constructor() {
    this.initializePool()
    this.startMaintenanceTimer()
  }

  private async initializePool() {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.warn('[RedisPool] Redis credentials not configured')
      return
    }

    // Create minimum connections
    for (let i = 0; i < this.config.minConnections; i++) {
      try {
        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
          // Optimize for performance
          retry: {
            retries: 2,
            retryDelayOnFailure: 100
          }
        })

        // Test connection
        await redis.ping()

        this.pool.push({
          redis,
          inUse: false,
          createdAt: Date.now(),
          lastUsed: Date.now()
        })

        this.stats.totalConnections++
        console.log(`[RedisPool] Initialized connection ${i + 1}/${this.config.minConnections}`)
      } catch (error) {
        console.error(`[RedisPool] Failed to create connection ${i + 1}:`, error)
      }
    }
  }

  async acquire(): Promise<Redis> {
    const startTime = Date.now()
    this.stats.totalAcquires++

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // Remove from waiting queue
        const index = this.waitingQueue.findIndex(w => w.resolve === resolve)
        if (index !== -1) {
          this.waitingQueue.splice(index, 1)
        }
        reject(new Error(`Redis connection acquire timeout after ${this.config.acquireTimeoutMs}ms`))
      }, this.config.acquireTimeoutMs)

      const tryAcquire = () => {
        // Find available connection
        const available = this.pool.find(conn => !conn.inUse)
        
        if (available) {
          available.inUse = true
          available.lastUsed = Date.now()
          this.stats.activeConnections++
          
          clearTimeout(timeoutId)
          
          // Update latency stats
          const latency = Date.now() - startTime
          this.stats.averageLatency = (this.stats.averageLatency + latency) / 2
          
          resolve(available.redis)
          return
        }

        // Try to create new connection if under limit
        if (this.pool.length < this.config.maxConnections) {
          this.createConnection()
            .then(redis => {
              clearTimeout(timeoutId)
              const latency = Date.now() - startTime
              this.stats.averageLatency = (this.stats.averageLatency + latency) / 2
              resolve(redis)
            })
            .catch(() => {
              // Fall back to queuing
              this.waitingQueue.push({ resolve, reject, timestamp: Date.now() })
              this.stats.queueSize = this.waitingQueue.length
            })
          return
        }

        // Queue the request
        this.waitingQueue.push({ resolve, reject, timestamp: Date.now() })
        this.stats.queueSize = this.waitingQueue.length
      }

      tryAcquire()
    })
  }

  release(redis: Redis) {
    const connection = this.pool.find(conn => conn.redis === redis)
    if (connection && connection.inUse) {
      connection.inUse = false
      connection.lastUsed = Date.now()
      this.stats.activeConnections--
      this.stats.totalReleases++

      // Process waiting queue
      const waiting = this.waitingQueue.shift()
      if (waiting) {
        connection.inUse = true
        this.stats.activeConnections++
        this.stats.queueSize = this.waitingQueue.length
        waiting.resolve(redis)
      }
    }
  }

  private async createConnection(): Promise<Redis> {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Redis credentials not configured')
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      retry: {
        retries: 2,
        retryDelayOnFailure: 100
      }
    })

    // Test connection
    await redis.ping()

    this.pool.push({
      redis,
      inUse: true,
      createdAt: Date.now(),
      lastUsed: Date.now()
    })

    this.stats.totalConnections++
    this.stats.activeConnections++

    return redis
  }

  private startMaintenanceTimer() {
    setInterval(() => {
      this.maintainPool()
    }, 60000) // Every minute
  }

  private maintainPool() {
    const now = Date.now()
    const maxIdleTime = 5 * 60 * 1000 // 5 minutes

    // Remove stale connections
    this.pool = this.pool.filter(conn => {
      if (!conn.inUse && (now - conn.lastUsed) > maxIdleTime && this.pool.length > this.config.minConnections) {
        this.stats.totalConnections--
        return false
      }
      return true
    })

    // Log stats
    if (this.stats.totalAcquires > 0) {
      console.log('[RedisPool] Stats:', {
        totalConnections: this.stats.totalConnections,
        activeConnections: this.stats.activeConnections,
        queueSize: this.stats.queueSize,
        averageLatency: Math.round(this.stats.averageLatency),
        poolUtilization: Math.round((this.stats.activeConnections / this.stats.totalConnections) * 100)
      })
    }
  }

  getStats() {
    return { ...this.stats }
  }

  // Optimized methods for common operations
  async getWithFallback<T>(key: string, fallback: () => Promise<T>, ttl: number = 300): Promise<T> {
    const redis = await this.acquire()
    
    try {
      const cached = await redis.get(key)
      if (cached) {
        return typeof cached === 'string' ? JSON.parse(cached) : cached
      }
      
      // Cache miss - get from fallback
      const data = await fallback()
      
      // Set in cache (non-blocking)
      redis.set(key, JSON.stringify(data), { ex: ttl }).catch(err => 
        console.error('[RedisPool] Cache set error:', err)
      )
      
      return data
    } finally {
      this.release(redis)
    }
  }

  async setOptimistic(key: string, value: any, ttl: number = 300): Promise<void> {
    const redis = await this.acquire()
    
    try {
      await redis.set(key, JSON.stringify(value), { ex: ttl })
    } finally {
      this.release(redis)
    }
  }

  async delBatch(keys: string[]): Promise<void> {
    if (keys.length === 0) return
    
    const redis = await this.acquire()
    
    try {
      await redis.del(...keys)
    } finally {
      this.release(redis)
    }
  }
}

// Singleton instance
export const redisPool = new RedisConnectionPool()

// Convenience functions
export async function getCached<T>(
  key: string, 
  fallback: () => Promise<T>, 
  ttl: number = 300
): Promise<T> {
  return redisPool.getWithFallback(key, fallback, ttl)
}

export async function setCache(key: string, value: any, ttl: number = 300): Promise<void> {
  return redisPool.setOptimistic(key, value, ttl)
}

export async function delCache(keys: string | string[]): Promise<void> {
  const keyArray = Array.isArray(keys) ? keys : [keys]
  return redisPool.delBatch(keyArray)
}