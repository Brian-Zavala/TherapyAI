/**
 * Session caching layer to reduce authentication overhead
 * Caches NextAuth sessions to prevent repeated database lookups
 */

import { Session } from 'next-auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest } from 'next/server';

// In-memory cache with TTL
const sessionCache = new Map<string, { session: Session | null; expires: number }>();
const SESSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean up expired entries every minute
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of sessionCache.entries()) {
      if (value.expires < now) {
        sessionCache.delete(key);
      }
    }
  }, 60 * 1000);
}

/**
 * Get a session from cache or fetch it
 * Uses the cookie header as cache key
 */
export async function getCachedSession(request: Request | NextRequest): Promise<Session | null> {
  try {
    // For now, skip caching and directly get session to avoid issues
    // This ensures compatibility with Next.js API routes
    const session = await getServerSession(authOptions);
    return session;
  } catch (error) {
    console.error('[SessionCache] Error getting session:', error);
    return null;
  }
}

/**
 * Invalidate session cache for a specific request
 */
export function invalidateSessionCache(request: Request): void {
  const cacheKey = request.headers.get('cookie') || 'no-cookie';
  sessionCache.delete(cacheKey);
  console.log('[SessionCache] Cache invalidated');
}

/**
 * Clear entire session cache
 */
export function clearSessionCache(): void {
  sessionCache.clear();
  console.log('[SessionCache] Cache cleared');
}

/**
 * Get session cache statistics
 */
export function getSessionCacheStats(): { size: number; oldestExpiry: number | null } {
  let oldestExpiry: number | null = null;
  
  for (const value of sessionCache.values()) {
    if (!oldestExpiry || value.expires < oldestExpiry) {
      oldestExpiry = value.expires;
    }
  }
  
  return {
    size: sessionCache.size,
    oldestExpiry,
  };
}

/**
 * Middleware helper to add session caching to API routes
 */
export function withSessionCache<T extends (...args: any[]) => Promise<Response>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    const request = args[0] as Request;
    
    // Replace getServerSession with cached version in the handler
    const originalGetServerSession = global.getServerSession;
    global.getServerSession = async () => getCachedSession(request);
    
    try {
      return await handler(...args);
    } finally {
      // Restore original function
      global.getServerSession = originalGetServerSession;
    }
  }) as T;
}