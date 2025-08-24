import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

// Ensure global prisma type is correct
const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined }

// Enhanced Prisma client configuration for production
const createPrismaClient = () => {
  // Parse DATABASE_URL to add pooling parameters
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined')
  }

  // Add connection pooling parameters for Supabase
  const pooledUrl = databaseUrl.includes('?')
    ? `${databaseUrl}&pgbouncer=true&connection_limit=10&pool_timeout=30`
    : `${databaseUrl}?pgbouncer=true&connection_limit=10&pool_timeout=30`

  const client = new PrismaClient({
    datasources: {
      db: {
        url: pooledUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    errorFormat: 'minimal',
  })

  // Add middleware for optimistic locking
  client.$use(async (params, next) => {
    // Handle optimistic locking for updates
    if (params.action === 'update' || params.action === 'updateMany') {
      const model = params.model
      
      // Only apply to models with version field
      const versionedModels = ['User', 'Session', 'ConversationState']
      
      if (model && versionedModels.includes(model)) {
        // Increment version on update
        if (params.args.data) {
          params.args.data.version = {
            increment: 1
          }
        }
      }
    }
    
    return next(params)
  })

  // Add middleware for query performance monitoring
  if (process.env.NODE_ENV === 'development') {
    client.$use(async (params, next) => {
      const before = Date.now()
      const result = await next(params)
      const after = Date.now()
      const duration = after - before
      
      // Log slow queries (> 100ms)
      if (duration > 100) {
        console.warn(`⚠️ Slow query (${duration}ms):`, {
          model: params.model,
          action: params.action,
          duration,
        })
      }
      
      return result
    })
  }

  // Return the client directly (encryption can be added later if needed)
  return client
}

// Connection management with retry logic
const prismaClientSingleton = () => {
  let client: ReturnType<typeof createPrismaClient> | null = null
  let connectionAttempts = 0
  const maxRetries = 3
  const retryDelay = 1000 // 1 second

  const connect = async () => {
    try {
      if (!client) {
        client = createPrismaClient()
        await client.$connect()
        console.log('✅ Database connected successfully')
        connectionAttempts = 0
      }
      return client
    } catch (error) {
      connectionAttempts++
      console.error(`❌ Database connection failed (attempt ${connectionAttempts}/${maxRetries}):`, error)
      
      if (connectionAttempts < maxRetries) {
        console.log(`🔄 Retrying in ${retryDelay}ms...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        return connect()
      }
      
      throw error
    }
  }

  return {
    get: async () => {
      if (!client) {
        return await connect()
      }
      return client
    },
    disconnect: async () => {
      if (client) {
        await client.$disconnect()
        client = null
        console.log('🔌 Database disconnected')
      }
    }
  }
}

const prismaManager = prismaClientSingleton()

// Create singleton instance
let prismaInstance: PrismaClient | null = null

const getPrismaClient = () => {
  if (!prismaInstance) {
    prismaInstance = createPrismaClient()
  }
  return prismaInstance
}

// Export enhanced Prisma client
export const prisma = globalForPrisma.prisma || getPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma as PrismaClient
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prismaManager.disconnect()
})

// Helper functions for common patterns

/**
 * Execute a database operation with automatic retry on connection errors
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | null = null
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      
      // Check if it's a connection error
      if (error.code === 'P1001' || error.code === 'P1002') {
        console.log(`🔄 Retrying database operation (attempt ${i + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        continue
      }
      
      // For other errors, throw immediately
      throw error
    }
  }
  
  throw lastError
}

/**
 * Execute a transaction with proper error handling
 */
export async function withTransaction<T>(
  operation: (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => Promise<T>
): Promise<T> {
  const client = prisma as PrismaClient
  const result = await client.$transaction(operation, {
    maxWait: 5000, // 5 seconds
    timeout: 10000, // 10 seconds
    isolationLevel: 'ReadCommitted',
  })
  return result as T
}

/**
 * Batch database operations for better performance
 */
export class BatchProcessor<T> {
  private batch: T[] = []
  private batchSize: number
  private processFunction: (items: T[]) => Promise<void>
  private flushTimeout: NodeJS.Timeout | null = null
  private flushDelay: number

  constructor(
    batchSize: number,
    flushDelay: number,
    processFunction: (items: T[]) => Promise<void>
  ) {
    this.batchSize = batchSize
    this.flushDelay = flushDelay
    this.processFunction = processFunction
  }

  async add(item: T) {
    this.batch.push(item)
    
    if (this.batch.length >= this.batchSize) {
      await this.flush()
    } else {
      this.scheduleFlush()
    }
  }

  private scheduleFlush() {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout)
    }
    
    this.flushTimeout = setTimeout(() => {
      this.flush()
    }, this.flushDelay)
  }

  async flush() {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout)
      this.flushTimeout = null
    }
    
    if (this.batch.length === 0) {
      return
    }
    
    const itemsToProcess = [...this.batch]
    this.batch = []
    
    try {
      await this.processFunction(itemsToProcess)
    } catch (error) {
      console.error('Batch processing error:', error)
      // Optionally re-add items to batch for retry
      this.batch.unshift(...itemsToProcess)
      throw error
    }
  }
}

// Export types for use in other files
export type { PrismaClient }
export { Prisma } from '@prisma/client'