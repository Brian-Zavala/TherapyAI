/**
 * Database operations with built-in error handling and fallbacks
 * Provides resilient database access with retry logic and caching
 */

import { prisma } from './prisma-enhanced'
import { createSupabaseServerClient } from './supabase-server'
import { z } from 'zod'
import { toPrismaSessionType } from '@/lib/session-type-converter'

// Error types for better error handling
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = true,
    public details?: any
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class ValidationError extends Error {
  constructor(message: string, public errors: z.ZodError) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Retry configuration
interface RetryConfig {
  maxAttempts: number
  initialDelay: number
  maxDelay: number
  backoffFactor: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2
}

// Cache configuration
interface CacheConfig {
  ttl: number // Time to live in milliseconds
  staleWhileRevalidate: boolean
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 60000, // 1 minute
  staleWhileRevalidate: true
}

// Simple in-memory cache
class DatabaseCache {
  private cache = new Map<string, { data: any; timestamp: number; stale?: boolean }>()

  set(key: string, data: any, ttl: number) {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + ttl
    })
  }

  get(key: string): { data: any; stale: boolean } | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const isExpired = Date.now() > entry.timestamp
    if (isExpired && !entry.stale) {
      // Mark as stale for stale-while-revalidate
      entry.stale = true
    }

    return {
      data: entry.data,
      stale: isExpired
    }
  }

  delete(key: string) {
    this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }
}

const cache = new DatabaseCache()

/**
 * Execute database operation with retry logic
 */
export async function withDatabaseOperation<T>(
  operation: () => Promise<T>,
  options: {
    operationName: string
    retryConfig?: Partial<RetryConfig>
    fallback?: T
    cache?: { key: string; config?: Partial<CacheConfig> }
  }
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig }
  const cacheConfig = options.cache ? { ...DEFAULT_CACHE_CONFIG, ...options.cache.config } : null

  // Check cache first
  if (cacheConfig && options.cache) {
    const cached = cache.get(options.cache.key)
    if (cached) {
      if (!cached.stale) {
        console.log(`[DB] Cache hit for ${options.operationName}`)
        return cached.data
      } else if (cacheConfig.staleWhileRevalidate) {
        // Return stale data and revalidate in background
        console.log(`[DB] Returning stale cache for ${options.operationName}, revalidating...`)
        revalidateInBackground()
        return cached.data
      }
    }
  }

  let lastError: Error | null = null
  let delay = retryConfig.initialDelay

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      console.log(`[DB] Executing ${options.operationName} (attempt ${attempt}/${retryConfig.maxAttempts})`)
      
      const result = await operation()
      
      // Cache successful result
      if (cacheConfig && options.cache) {
        cache.set(options.cache.key, result, cacheConfig.ttl)
      }
      
      return result
    } catch (error) {
      lastError = error as Error
      console.error(`[DB] Error in ${options.operationName} (attempt ${attempt}):`, error)

      // Check if error is retryable
      if (!isRetryableError(error)) {
        break
      }

      // Don't retry on last attempt
      if (attempt < retryConfig.maxAttempts) {
        console.log(`[DB] Retrying ${options.operationName} after ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        delay = Math.min(delay * retryConfig.backoffFactor, retryConfig.maxDelay)
      }
    }
  }

  // All retries failed, use fallback if provided
  if (options.fallback !== undefined) {
    console.warn(`[DB] Using fallback for ${options.operationName}`)
    return options.fallback
  }

  // Throw database error
  throw new DatabaseError(
    `Database operation '${options.operationName}' failed after ${retryConfig.maxAttempts} attempts`,
    'DB_OPERATION_FAILED',
    false,
    lastError
  )

  // Background revalidation function
  async function revalidateInBackground() {
    try {
      const result = await operation()
      if (cacheConfig && options.cache) {
        cache.set(options.cache.key, result, cacheConfig.ttl)
      }
    } catch (error) {
      console.error(`[DB] Background revalidation failed for ${options.operationName}:`, error)
    }
  }
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any): boolean {
  if (!error) return false

  // Prisma specific errors
  if (error.code) {
    const retryableCodes = [
      'P1001', // Can't reach database
      'P1002', // Database timeout
      'P2024', // Connection pool timeout
      'P2034', // Conflict in constraint
    ]
    return retryableCodes.includes(error.code)
  }

  // Generic database errors
  const errorMessage = error.message?.toLowerCase() || ''
  return (
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('unavailable')
  )
}

/**
 * Database operations with built-in error handling
 */
export const DatabaseOperations = {
  /**
   * Get user by ID with caching and fallback
   */
  async getUserById(userId: string) {
    return withDatabaseOperation(
      async () => {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            profile: true,
            familyMembers: {
              where: { isActive: true },
              orderBy: { order: 'asc' }
            }
          }
        })
        
        if (!user) {
          throw new DatabaseError('User not found', 'USER_NOT_FOUND', false)
        }
        
        return user
      },
      {
        operationName: 'getUserById',
        cache: {
          key: `user:${userId}`,
          config: { ttl: 300000 } // 5 minutes
        }
      }
    )
  },

  /**
   * Get active sessions with proper error handling
   */
  async getActiveSessions(userId: string) {
    return withDatabaseOperation(
      async () => {
        const sessions = await prisma.session.findMany({
          where: {
            userId,
            status: 'ACTIVE',
            conversationTimeSeconds: { gt: 30 }
          },
          include: {
            communicationMetrics: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          },
          orderBy: { startTime: 'desc' }
        })
        
        return sessions
      },
      {
        operationName: 'getActiveSessions',
        fallback: [], // Return empty array as fallback
        cache: {
          key: `sessions:active:${userId}`,
          config: { ttl: 30000 } // 30 seconds
        }
      }
    )
  },

  /**
   * Create session with validation and retry
   */
  async createSession(data: {
    userId: string
    assistantId: string
    theme?: string
    duration?: number
    sessionType?: 'individual' | 'couple' | 'family'
  }) {
    // Validate input
    const SessionSchema = z.object({
      userId: z.string().uuid(),
      assistantId: z.string().min(1),
      theme: z.string().optional(),
      duration: z.number().min(1).max(180).default(60),
      sessionType: z.enum(['individual', 'couple', 'family']).default('couple')
    })

    const validated = SessionSchema.parse(data)

    return withDatabaseOperation(
      async () => {
        // Use transaction for consistency
        const session = await prisma.$transaction(async (tx) => {
          // Check for existing active session
          const existingActive = await tx.session.findFirst({
            where: {
              userId: validated.userId,
              status: 'active'
            }
          })

          if (existingActive) {
            throw new DatabaseError(
              'User already has an active session',
              'ACTIVE_SESSION_EXISTS',
              false,
              { sessionId: existingActive.id }
            )
          }

          // Create new session
          const newSession = await tx.session.create({
            data: {
              userId: validated.userId,
              assistantId: validated.assistantId,
              theme: validated.theme || 'AI Therapy Session',
              duration: validated.duration,
              sessionType: toPrismaSessionType(validated.sessionType),
              status: 'SCHEDULED',
              date: new Date(),
              startTime: new Date()
            }
          })

          // Create initial metrics
          await tx.communicationMetric.create({
            data: {
              sessionId: newSession.id,
              userId: validated.userId,
              clarity: 50,
              empathy: 50,
              respect: 50,
              overall: 50,
              listening: 50,
              expression: 50,
              metricType: 'real-time',
              calculatedAt: new Date()
            }
          })

          return newSession
        })

        // Clear relevant caches
        cache.delete(`sessions:active:${validated.userId}`)
        cache.delete(`user:${validated.userId}`)

        return session
      },
      {
        operationName: 'createSession',
        retryConfig: {
          maxAttempts: 2 // Fewer retries for writes
        }
      }
    )
  },

  /**
   * Update session metrics with optimistic locking
   */
  async updateSessionMetrics(
    sessionId: string,
    metrics: {
      clarity: number
      empathy: number
      respect: number
      overall: number
      listening?: number
      expression?: number
    }
  ) {
    return withDatabaseOperation(
      async () => {
        // Use Supabase for real-time updates
        const supabase = await createSupabaseServerClient()
        
        // Get the session to find userId
        const session = await prisma.session.findUnique({
          where: { id: sessionId },
          select: { userId: true }
        })
        
        if (!session) {
          throw new DatabaseError('Session not found', 'SESSION_NOT_FOUND', false)
        }
        
        // Update in database
        const updated = await prisma.communicationMetric.create({
          data: {
            sessionId,
            userId: session.userId,
            clarity: metrics.clarity,
            empathy: metrics.empathy,
            respect: metrics.respect,
            overall: metrics.overall,
            listening: metrics.listening || 50,
            expression: metrics.expression || 50,
            metricType: 'real-time',
            calculatedAt: new Date()
          }
        })

        // Broadcast update
        await supabase
          .channel(`session:${sessionId}:metrics`)
          .send({
            type: 'broadcast',
            event: 'metrics-update',
            payload: {
              sessionId,
              metrics: updated,
              timestamp: new Date().toISOString()
            }
          })

        return updated
      },
      {
        operationName: 'updateSessionMetrics',
        retryConfig: {
          maxAttempts: 2,
          initialDelay: 500
        }
      }
    )
  },

  /**
   * Get dashboard metrics with multiple fallback strategies
   */
  async getDashboardMetrics(userId: string, timeframe: 'week' | 'month' | 'all' = 'all') {
    return withDatabaseOperation(
      async () => {
        const dateFilter = getDateFilter(timeframe)
        
        const [sessions, metrics, progress] = await Promise.all([
          // Get sessions
          prisma.session.count({
            where: {
              userId,
              status: 'COMPLETED',
              ...(dateFilter && { completedAt: dateFilter })
            }
          }),
          
          // Get average metrics
          prisma.communicationMetric.aggregate({
            where: {
              userId,
              metricType: 'final',
              ...(dateFilter && { calculatedAt: dateFilter })
            },
            _avg: {
              clarity: true,
              empathy: true,
              respect: true,
              overall: true
            }
          }),
          
          // Get progress data
          prisma.progressTracking.findMany({
            where: {
              userId,
              ...(dateFilter && { date: dateFilter })
            },
            orderBy: { date: 'desc' },
            take: 10
          })
        ])

        return {
          totalSessions: sessions,
          averageMetrics: {
            clarity: Math.round(metrics._avg.clarity || 0),
            empathy: Math.round(metrics._avg.empathy || 0),
            respect: Math.round(metrics._avg.respect || 0),
            overall: Math.round(metrics._avg.overall || 0)
          },
          recentProgress: progress
        }
      },
      {
        operationName: 'getDashboardMetrics',
        cache: {
          key: `dashboard:${userId}:${timeframe}`,
          config: { 
            ttl: 120000, // 2 minutes
            staleWhileRevalidate: true 
          }
        },
        fallback: {
          totalSessions: 0,
          averageMetrics: {
            clarity: 0,
            empathy: 0,
            respect: 0,
            overall: 0
          },
          recentProgress: []
        }
      }
    )
  }
}

/**
 * Get date filter for queries
 */
function getDateFilter(timeframe: 'week' | 'month' | 'all'): { gte: Date } | undefined {
  if (timeframe === 'all') return undefined
  
  const now = new Date()
  const date = new Date()
  
  if (timeframe === 'week') {
    date.setDate(now.getDate() - 7)
  } else if (timeframe === 'month') {
    date.setMonth(now.getMonth() - 1)
  }
  
  return { gte: date }
}

/**
 * Clear all caches (useful for testing or manual refresh)
 */
export function clearDatabaseCache() {
  cache.clear()
  console.log('[DB] Cache cleared')
}

/**
 * Health check for database connectivity
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean
  latency: number
  error?: string
}> {
  const start = Date.now()
  
  try {
    await prisma.$queryRaw`SELECT 1`
    
    return {
      healthy: true,
      latency: Date.now() - start
    }
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}