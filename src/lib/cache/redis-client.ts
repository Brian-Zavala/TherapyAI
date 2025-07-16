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
      return await this.client.get(key);
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
      // Handle different set signatures
      // set(key, value, 'EX', seconds, 'NX')
      if (args.length >= 2 && args[0] === 'EX') {
        const options: any = { ex: args[1] };
        if (args[2] === 'NX') {
          options.nx = true;
        }
        return await this.client.set(key, value, options) as string;
      }
      
      return await this.client.set(key, value) as string;
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
      return await this.client.del(key);
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
      return await this.client.ping();
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
      return await this.client.expire(key, seconds);
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
      return await this.client.exists(key);
    } catch (error) {
      console.error('[RedisClient] EXISTS error:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const redis = new RedisClient();