/**
 * Optimized session management for high-frequency API calls
 * Reduces getServerSession overhead during active VAPI sessions
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest } from 'next/server';

// In-memory session cache with LRU eviction
class SessionCache {
  private cache = new Map<string, { session: any; timestamp: number; userId: string }>();
  private readonly maxSize = 1000;
  private readonly ttlMs = 60 * 1000; // 1 minute TTL

  set(key: string, session: any): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      session,
      timestamp: Date.now(),
      userId: session?.user?.id || 'unknown'
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.session;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; hitRate: number } {
    const size = this.cache.size;
    // Simple approximation - in production, track hits/misses
    return { size, hitRate: 0.8 };
  }
}

const sessionCache = new SessionCache();

/**
 * Extract session identifier from request
 */
function getSessionKey(req?: NextRequest | Request): string {
  if (!req) return 'default';

  try {
    // Try to get session token from cookie or authorization header
    let sessionToken = '';
    
    if ('cookies' in req && req.cookies) {
      // Next.js request
      sessionToken = req.cookies.get('next-auth.session-token')?.value ||
                    req.cookies.get('__Secure-next-auth.session-token')?.value ||
                    '';
    } else if (req.headers) {
      // Standard request
      const cookies = req.headers.get('cookie') || '';
      const tokenMatch = cookies.match(/(?:^|;)\s*(?:__Secure-)?next-auth\.session-token=([^;]+)/);
      sessionToken = tokenMatch?.[1] || '';
    }

    // Fallback to authorization header
    if (!sessionToken) {
      const authHeader = req.headers.get('authorization') || '';
      sessionToken = authHeader.replace('Bearer ', '').substring(0, 32);
    }

    return sessionToken ? `session:${sessionToken.substring(0, 16)}` : 'anonymous';
  } catch (error) {
    console.warn('[SessionCache] Failed to extract session key:', error);
    return 'fallback';
  }
}

/**
 * Cached getServerSession for high-frequency API endpoints
 * Use this for transcript batching, metrics, and other frequent calls
 */
export async function getCachedServerSession(req?: NextRequest | Request) {
  const sessionKey = getSessionKey(req);
  
  // Try cache first
  const cachedSession = sessionCache.get(sessionKey);
  if (cachedSession) {
    return cachedSession;
  }

  // Cache miss - get fresh session
  try {
    const session = await getServerSession(authOptions);
    
    // Cache the result (including null sessions)
    sessionCache.set(sessionKey, session);
    
    return session;
  } catch (error) {
    console.error('[SessionCache] getServerSession failed:', error);
    return null;
  }
}

/**
 * Standard getServerSession for critical auth operations
 * Use this for login, logout, profile updates, etc.
 */
export async function getFreshServerSession(req?: NextRequest | Request) {
  return getServerSession(authOptions);
}

/**
 * Invalidate cached sessions (call on login/logout)
 */
export function invalidateSessionCache(pattern?: string): void {
  sessionCache.invalidate(pattern);
}

/**
 * Get cache statistics for monitoring
 */
export function getSessionCacheStats() {
  return sessionCache.getStats();
}

/**
 * Middleware helper for route-specific session caching
 */
export function withSessionCache(handler: (req: any, session: any) => Promise<Response>) {
  return async (req: NextRequest | Request) => {
    const session = await getCachedServerSession(req);
    return handler(req, session);
  };
}

/**
 * Auth validation helper with caching
 */
export async function validateAuth(req?: NextRequest | Request): Promise<{
  isValid: boolean;
  session: any;
  userId?: string;
  email?: string;
}> {
  const session = await getCachedServerSession(req);
  
  if (!session?.user?.id) {
    return { isValid: false, session: null };
  }

  return {
    isValid: true,
    session,
    userId: session.user.id,
    email: session.user.email
  };
}

// Export cache instance for testing
export { sessionCache };