export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
  identifier: string;
  algorithm: string;
}

export interface RateLimitConfig {
  requests: number;
  window: string; // "10s", "1m", "1h", etc.
  algorithm?: 'fixedWindow' | 'slidingWindow' | 'tokenBucket';
  identifier?: string;
  prefix?: string;
}

export interface RateLimitRule {
  name: string;
  config: RateLimitConfig;
  condition?: (req: any) => boolean;
}

export interface CacheEntry<T = any> {
  data: T;
  expires: number;
  hits: number;
}

export interface RedisMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  rateLimitViolations: number;
  averageResponseTime: number;
  errorCount: number;
  uptime: number;
}

export interface RateLimitProfile {
  name: string;
  rules: RateLimitRule[];
  description?: string;
}