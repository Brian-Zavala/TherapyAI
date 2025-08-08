// Production-ready Prisma client with connection pooling and retry logic
import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = global as unknown as { 
  prisma: PrismaClient | undefined
  connectionAttempts: number
  lastConnectionError: Date | null
}

// Connection configuration
const CONNECTION_TIMEOUT = 25000 // 25 seconds
const QUERY_TIMEOUT = 15000 // 15 seconds (increased for complex queries)
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second base delay

// Initialize connection tracking
if (!globalForPrisma.connectionAttempts) {
  globalForPrisma.connectionAttempts = 0
  globalForPrisma.lastConnectionError = null
}

// Create Prisma client with optimized settings
function createPrismaClient() {
  // Only show logs if explicitly enabled
  const showLogs = process.env.PRISMA_VERBOSE === 'true';
  
  const client = new PrismaClient({
    log: showLogs 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    errorFormat: 'minimal',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

  // Add middleware for query timing and retry logic
  client.$use(async (params, next) => {
    const startTime = Date.now()
    let lastError: any
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Add timeout to queries
        const result = await Promise.race([
          next(params),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout')), QUERY_TIMEOUT)
          )
        ])
        
        // Log slow queries in development
        if (process.env.NODE_ENV === 'development') {
          const duration = Date.now() - startTime
          if (duration > 1000) {
            console.warn(`[Prisma] Slow query (${duration}ms):`, {
              model: params.model,
              action: params.action
            })
          }
        }
        
        return result
      } catch (error: any) {
        lastError = error
        
        // Check if error is retryable
        if (isRetryableError(error) && attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY * Math.pow(2, attempt) // Exponential backoff
          console.warn(`[Prisma] Retrying after error (attempt ${attempt + 1}/${MAX_RETRIES}):`, {
            error: error.message,
            model: params.model,
            action: params.action,
            delay
          })
          
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        
        // Log non-retryable errors
        console.error('[Prisma] Query error:', {
          error: error.message,
          code: error.code,
          model: params.model,
          action: params.action,
          duration: Date.now() - startTime
        })
        
        throw error
      }
    }
    
    throw lastError
  })

  // Note: Since Prisma 5.0.0, the library engine handles cleanup automatically
  // No need for beforeExit handlers - the engine will be garbage collected properly

  return client
}

// Check if an error is retryable
function isRetryableError(error: any): boolean {
  if (!error) return false
  
  const retryableCodes = [
    'P1001', // Can't reach database server
    'P1002', // Database server timeout
    'P2024', // Connection pool timeout
    'P2025', // Operation timed out
  ]
  
  // Check Prisma error codes
  if (error.code && retryableCodes.includes(error.code)) {
    return true
  }
  
  // Check for connection-related errors
  const connectionErrors = [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNRESET',
    'ENETUNREACH',
  ]
  
  if (error.code && connectionErrors.includes(error.code)) {
    return true
  }
  
  // Check error messages
  const retryableMessages = [
    'connection timeout',
    'connection refused',
    'connection reset',
    'socket hang up',
    'prepared statement',
    'connection terminated',
  ]
  
  const errorMessage = error.message?.toLowerCase() || ''
  return retryableMessages.some(msg => errorMessage.includes(msg))
}

// Create singleton instance with connection retry
async function getPrismaClient(): Promise<PrismaClient> {
  if (!globalForPrisma.prisma) {
    if (process.env.PRISMA_VERBOSE === 'true') {
      console.log('[Prisma] Creating new client instance...')
    }
    
    try {
      globalForPrisma.prisma = createPrismaClient()
      
      // Test connection with retry
      let connected = false
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          await globalForPrisma.prisma.$connect()
          connected = true
          globalForPrisma.connectionAttempts = 0
          globalForPrisma.lastConnectionError = null
          if (process.env.PRISMA_VERBOSE === 'true') {
            console.log('[Prisma] Connected successfully')
          }
          break
        } catch (error) {
          console.error(`[Prisma] Connection attempt ${attempt + 1} failed:`, error)
          
          if (attempt < MAX_RETRIES) {
            const delay = RETRY_DELAY * Math.pow(2, attempt)
            if (process.env.PRISMA_VERBOSE === 'true') {
              console.log(`[Prisma] Retrying connection in ${delay}ms...`)
            }
            await new Promise(resolve => setTimeout(resolve, delay))
          } else {
            globalForPrisma.connectionAttempts++
            globalForPrisma.lastConnectionError = new Date()
            throw error
          }
        }
      }
      
      if (!connected) {
        throw new Error('Failed to connect to database after all retries')
      }
      
    } catch (error) {
      console.error('[Prisma] Failed to create client:', error)
      globalForPrisma.prisma = undefined
      throw error
    }
  }
  
  return globalForPrisma.prisma
}

// Export prisma getter - handle async initialization
let prismaPromise: Promise<PrismaClient> | undefined
let prismaInstance: PrismaClient | undefined

// Initialize prisma immediately
if (typeof window === 'undefined') {
  prismaPromise = getPrismaClient()
  prismaPromise.then(client => {
    prismaInstance = client
    if (process.env.PRISMA_VERBOSE === 'true') {
      console.log('[Prisma] Client initialized and ready')
    }
  }).catch(error => {
    console.error('[Prisma] Failed to initialize client:', error)
    process.exit(1)
  })
}

// Export a proxy that waits for initialization
export const prisma = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    // If already initialized, use it directly
    if (prismaInstance) {
      return Reflect.get(prismaInstance, prop)
    }
    
    // For query methods, return a function that waits for initialization
    const queryMethods = ['findUnique', 'findFirst', 'findMany', 'create', 'update', 'delete', 'upsert', 'createMany', 'updateMany', 'deleteMany', 'count', 'aggregate', 'groupBy', '$transaction', '$queryRaw', '$executeRaw', '$connect', '$disconnect']
    
    if (typeof prop === 'string' && (queryMethods.includes(prop) || prop.startsWith('$'))) {
      return async (...args: any[]) => {
        if (!prismaPromise) {
          throw new Error('[Prisma] Client initialization not started')
        }
        const client = await prismaPromise
        const method = Reflect.get(client, prop)
        if (typeof method === 'function') {
          return method.apply(client, args)
        }
        return method
      }
    }
    
    // For model access (e.g., prisma.user), return a proxy that handles async methods
    if (typeof prop === 'string' && !prop.startsWith('$') && prop !== 'then') {
      return new Proxy({}, {
        get: (_, subProp) => {
          return async (...args: any[]) => {
            if (!prismaPromise) {
              throw new Error('[Prisma] Client initialization not started')
            }
            const client = await prismaPromise
            const model = Reflect.get(client, prop)
            const method = Reflect.get(model, subProp)
            if (typeof method === 'function') {
              return method.apply(model, args)
            }
            return method
          }
        }
      })
    }
    
    // For other properties, wait for initialization
    throw new Error(`[Prisma] Cannot access property '${String(prop)}' before initialization`)
  }
})

// Export helper to check connection health
export async function checkDatabaseConnection(): Promise<{
  connected: boolean
  latency?: number
  error?: string
}> {
  const startTime = Date.now()
  
  try {
    await prisma.$queryRaw`SELECT 1`
    return {
      connected: true,
      latency: Date.now() - startTime
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Graceful shutdown handler - only in development with verbose logging
// The library engine handles cleanup automatically in production
if (process.env.NODE_ENV !== 'production' && process.env.PRISMA_VERBOSE === 'true') {
  const gracefulShutdown = async (signal: string) => {
    console.log(`[Prisma] Received ${signal}, disconnecting client...`)
    try {
      // Only disconnect if client is initialized
      if (prismaInstance) {
        await prismaInstance.$disconnect()
        console.log('[Prisma] Client disconnected successfully')
      } else {
        console.log('[Prisma] Client not initialized, skipping disconnect')
      }
    } catch (error) {
      console.error('[Prisma] Error during disconnect:', error)
    }
  }

  // Handle various shutdown signals
  process.once('SIGINT', () => gracefulShutdown('SIGINT'))
  process.once('SIGTERM', () => gracefulShutdown('SIGTERM'))
  // Note: beforeExit is still valid for process-level events, just not for Prisma client events
  process.once('beforeExit', () => gracefulShutdown('beforeExit'))
}

// Export types
export { Prisma }
export type { PrismaClient }