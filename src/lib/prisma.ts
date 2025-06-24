// src/lib/prisma.ts
// Production-ready Prisma client with connection pooling and retry logic
export { 
  prisma, 
  checkDatabaseConnection,
  Prisma,
  type PrismaClient 
} from './prisma-optimized'

// Re-export legacy functions for compatibility
import { prisma as prismaClient } from './prisma-optimized'

// Legacy query statistics function (for compatibility)
export function getQueryStatistics() {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }
  
  return {
    totalQueries: 0, // Would need to be tracked in middleware
    slowQueries: [],
    connectionStatus: 'connected'
  }
}

// Legacy disconnect function (for compatibility)
export async function disconnectPrisma() {
  try {
    await prismaClient.$disconnect()
    console.log('[Prisma] Disconnected successfully')
  } catch (error) {
    console.error('[Prisma] Error during disconnect:', error)
  }
}

// Handle process termination
if (process.env.NODE_ENV === 'production') {
  process.on('SIGINT', disconnectPrisma)
  process.on('SIGTERM', disconnectPrisma)
}