// Production-ready Prisma client with connection pooling and retry logic
import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = global as unknown as { 
  prisma: PrismaClient | undefined
  connectionAttempts: number
  lastConnectionError: Date | null
}

// Connection configuration
const CONNECTION_TIMEOUT = 20000 // 20 seconds
const QUERY_TIMEOUT = 10000 // 10 seconds
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second base delay

// Initialize connection tracking
if (!globalForPrisma.connectionAttempts) {
  globalForPrisma.connectionAttempts = 0
  globalForPrisma.lastConnectionError = null
}

// Create Prisma client with optimized settings
function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['error', 'warn'] 
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

  // Add connection event handlers
  client.$on('beforeExit' as never, async () => {
    console.log('[Prisma] Client disconnecting...')
  })

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
    console.log('[Prisma] Creating new client instance...')
    
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
          console.log('[Prisma] Connected successfully')
          break
        } catch (error) {
          console.error(`[Prisma] Connection attempt ${attempt + 1} failed:`, error)
          
          if (attempt < MAX_RETRIES) {
            const delay = RETRY_DELAY * Math.pow(2, attempt)
            console.log(`[Prisma] Retrying connection in ${delay}ms...`)
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
let prismaInstance: PrismaClient | undefined

export const prisma = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    if (!prismaInstance) {
      throw new Error('[Prisma] Client not initialized. Make sure to import prisma at the module level.')
    }
    return Reflect.get(prismaInstance, prop)
  }
})

// Initialize prisma asynchronously
if (typeof window === 'undefined') {
  getPrismaClient().then(client => {
    prismaInstance = client
    console.log('[Prisma] Client initialized and ready')
  }).catch(error => {
    console.error('[Prisma] Failed to initialize client:', error)
    process.exit(1)
  })
}

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

// Graceful shutdown handler
if (process.env.NODE_ENV !== 'production') {
  process.on('beforeExit', async () => {
    console.log('[Prisma] Disconnecting client...')
    await prisma.$disconnect()
  })
}

// Export types
export { Prisma }
export type { PrismaClient }