import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const isDevelopment = process.env.NODE_ENV === 'development'

// Public routes that don't need auth
const isPublicRoute = createRouteMatcher([
  '/',
  '/auth/login',
  '/auth/register',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/pricing',
  '/privacy',
  '/terms',
  '/support',
  '/site.webmanifest',
  '/api/health',
  '/api/analytics/(.*)',
  '/api/webhooks/(.*)',
  '/api/vapi/webhook(.*)',
  '/api/cron/(.*)',
  '/api/stripe/webhook(.*)',
  '/api/admin/reset-user-credits',
])

// Lightweight TTL cache — evicts expired entries on access, caps at MAX_SIZE
// Replaces unbounded Map to prevent memory leaks in long-running middleware
const CACHE_MAX_SIZE = 10_000

const _cacheStore = new Map<string, { value: number; expiresAt: number }>()

function cacheGet(key: string): number | undefined {
  const entry = _cacheStore.get(key)
  if (!entry) return undefined
  if (entry.expiresAt < Date.now()) {
    _cacheStore.delete(key)
    return undefined
  }
  return entry.value
}

function cacheSet(key: string, value: number, ttlMs: number): void {
  // Evict oldest 10% when at capacity
  if (_cacheStore.size >= CACHE_MAX_SIZE) {
    const toDelete = Math.ceil(CACHE_MAX_SIZE * 0.1)
    let deleted = 0
    for (const k of _cacheStore.keys()) {
      _cacheStore.delete(k)
      if (++deleted >= toDelete) break
    }
  }
  _cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs })
}

// Map-compatible facade so Upstash Ratelimit SDK can use it as ephemeralCache
const sharedCache = {
  get(key: string) {
    return cacheGet(key)
  },
  set(key: string, value: number) {
    // Upstash ratelimit cache entries are short-lived; default 60s TTL
    cacheSet(key, value, 60_000)
    return this
  },
  delete(key: string) {
    return _cacheStore.delete(key)
  },
  has(key: string) {
    return cacheGet(key) !== undefined
  },
  get size() {
    return _cacheStore.size
  },
  clear() {
    _cacheStore.clear()
  },
} as unknown as Map<string, number>

// Initialize Upstash Redis (singleton)
let redis: Redis | null = null
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

// Pre-create rate limiters
const rateLimiters = new Map<string, Ratelimit>()

if (redis) {
  rateLimiters.set('default', new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
    prefix: '@upstash/ratelimit',
    ephemeralCache: sharedCache,
    enableProtection: true,
  }))

  const customLimits = [
    { key: '/api/user/delete-account', requests: 3, window: '1 h' },
    { key: '/api/user/password-reset', requests: 5, window: '1 h' },
    { key: '/api/user/recover-account', requests: 5, window: '1 h' },
    { key: '/api/vapi/token', requests: isDevelopment ? 200 : 20, window: isDevelopment ? '1 m' : '1 h' },
    { key: '/api/vapi/webhook', requests: 1000, window: '1 m' },
    { key: '/api/sessions', requests: 100, window: '1 m' },
    { key: '/api/dashboard', requests: 200, window: '1 m' },
  ]

  for (const limit of customLimits) {
    rateLimiters.set(limit.key, new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit.requests, limit.window as any),
      analytics: true,
      prefix: '@upstash/ratelimit',
      ephemeralCache: sharedCache,
    }))
  }
}

// Helper to get client IP
function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('fly-client-ip') ||
    request.headers.get('true-client-ip') ||
    '127.0.0.1'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default clerkMiddleware(async (auth: any, request: NextRequest) => {
  const pathname = request.nextUrl.pathname

  // Skip static assets (public directory files and Next.js internals)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/sounds/') ||
    pathname.startsWith('/videos/') ||
    pathname.startsWith('/animations/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/fonts/') ||
    /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|mp3|mp4|webmanifest|json)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Skip WebSocket upgrades
  if (request.headers.get('upgrade') === 'websocket' || pathname.startsWith('/api/ws/')) {
    return NextResponse.next()
  }

  // Protect non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect()
  }

  const response = NextResponse.next()

  // Rate limiting for API routes
  if (pathname.startsWith('/api/') && rateLimiters.size > 0) {
    let rateLimiter: Ratelimit | undefined

    for (const [route, limiter] of rateLimiters) {
      if (route !== 'default' && pathname.startsWith(route)) {
        rateLimiter = limiter
        break
      }
    }

    if (!rateLimiter) {
      rateLimiter = rateLimiters.get('default')
    }

    if (rateLimiter) {
      const { userId } = await auth()
      const identifier = userId
        ? `user:${userId}:${pathname}`
        : `ip:${getClientIp(request)}:${pathname}`

      try {
        const { success, limit, remaining, reset } = await rateLimiter.limit(identifier)

        response.headers.set('X-RateLimit-Limit', limit.toString())
        response.headers.set('X-RateLimit-Remaining', remaining.toString())
        response.headers.set('X-RateLimit-Reset', new Date(reset).toISOString())

        if (!success) {
          const retryAfter = Math.ceil((reset - Date.now()) / 1000)
          return new NextResponse(
            JSON.stringify({
              error: 'Too many requests',
              code: 'RATE_LIMITED',
              retryAfter,
              message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': retryAfter.toString(),
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': new Date(reset).toISOString(),
              },
            }
          )
        }
      } catch (error) {
        console.error('Rate limiting error:', error)
      }
    }
  }

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  if (!isDevelopment) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()')
  }

  return response
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sounds|videos|animations|images|fonts|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp|css|js|woff|woff2|ttf|eot|mp3|mp4|webmanifest|json)).*)',
  ],
}
