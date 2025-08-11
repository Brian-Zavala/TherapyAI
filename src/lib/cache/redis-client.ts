import { Redis } from '@upstash/redis';
import { redisHealthMonitor } from './redis-health';

// Create Redis client with health monitoring
class RedisClient {
  private client: Redis | null = null;

  constructor() {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      this.client = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    } else {
      console.warn('[RedisClient] Redis credentials not found, operations will fail gracefully');
    }
  }

  async get(key: string): Promise<any> {
    if (!this.client || !redisHealthMonitor.isRedisAvailable()) {
      return null;
    }
    
    try {
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis GET timeout')), 3000)
      );
      
      const result = await Promise.race([
        this.client.get(key),
        timeoutPromise
      ]);
      
      return result;
    } catch (error) {
      console.error('[RedisClient] GET error:', error);
      return null;
    }
  }

  async set(
    key: string,
    value: any,
    ...args: any[]
  ): Promise<string | null> {
    if (!this.client || !redisHealthMonitor.isRedisAvailable()) {
      return null;
    }

    try {
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise<string | null>((_, reject) => 
        setTimeout(() => reject(new Error('Redis SET timeout')), 3000)
      );
      
      let operation: Promise<string | null>;
      
      // Handle different set signatures for Upstash Redis
      // set(key, value, 'EX', seconds, 'NX')
      if (args.length >= 2 && args[0] === 'EX') {
        const ttl = args[1];
        const hasNX = args[2] === 'NX';
        
        if (hasNX) {
          // Use set with both TTL and NX options
          operation = this.client.set(key, value, { ex: ttl, nx: true }) as Promise<string | null>;
        } else {
          // Use set with just TTL
          operation = this.client.set(key, value, { ex: ttl }) as Promise<string | null>;
        }
      } else if (args.length === 1 && args[0] === 'NX') {
        // Just NX without TTL
        operation = this.client.set(key, value, { nx: true }) as Promise<string | null>;
      } else {
        // Simple set without options
        operation = this.client.set(key, value) as Promise<string | null>;
      }
      
      const result = await Promise.race([operation, timeoutPromise]);
      return result;
    } catch (error) {
      console.error('[RedisClient] SET error:', error);
      return null;
    }
  }

  async del(key: string): Promise<number> {
    if (!this.client || !redisHealthMonitor.isRedisAvailable()) {
      return 0;
    }

    try {
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise<number>((_, reject) => 
        setTimeout(() => reject(new Error('Redis DEL timeout')), 3000)
      );
      
      const result = await Promise.race([
        this.client.del(key),
        timeoutPromise
      ]);
      
      return result;
    } catch (error) {
      console.error('[RedisClient] DEL error:', error);
      return 0;
    }
  }

  async ping(): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    try {
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error('Redis PING timeout')), 1000)
      );
      
      const result = await Promise.race([
        this.client.ping(),
        timeoutPromise
      ]);
      
      return result;
    } catch (error) {
      console.error('[RedisClient] PING error:', error);
      return null;
    }
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.client || !redisHealthMonitor.isRedisAvailable()) {
      return 0;
    }

    try {
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise<number>((_, reject) => 
        setTimeout(() => reject(new Error('Redis EXPIRE timeout')), 3000)
      );
      
      const result = await Promise.race([
        this.client.expire(key, seconds),
        timeoutPromise
      ]);
      
      return result;
    } catch (error) {
      console.error('[RedisClient] EXPIRE error:', error);
      return 0;
    }
  }

  async exists(key: string): Promise<number> {
    if (!this.client || !redisHealthMonitor.isRedisAvailable()) {
      return 0;
    }

    try {
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise<number>((_, reject) => 
        setTimeout(() => reject(new Error('Redis EXISTS timeout')), 3000)
      );
      
      const result = await Promise.race([
        this.client.exists(key),
        timeoutPromise
      ]);
      
      return result;
    } catch (error) {
      console.error('[RedisClient] EXISTS error:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const redis = new RedisClient();