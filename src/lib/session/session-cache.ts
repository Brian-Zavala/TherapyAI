// Simple in-memory cache for session data
// This helps reduce database load for frequently accessed sessions

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SessionCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  // Get cached data
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if cache entry has expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  // Set cache data
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  // Clear specific cache entry
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  // Clear all cache entries for a user
  invalidateUser(userId: string): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // Clear entire cache
  clear(): void {
    this.cache.clear();
  }

  // Get cache size
  size(): number {
    return this.cache.size;
  }
}

// Create singleton instance
export const sessionCache = new SessionCache();

// Helper functions for specific cache operations
export const cacheKeys = {
  userSessions: (userId: string) => `sessions:${userId}`,
  sessionTranscript: (sessionId: string) => `transcript:${sessionId}`,
  sessionDetails: (sessionId: string) => `session:${sessionId}`
};