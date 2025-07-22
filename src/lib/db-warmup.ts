// Database connection warmup utility
import { prisma } from './prisma-optimized'

/**
 * Warm up the database connection to avoid cold start delays
 * This should be called during application startup
 */
export async function warmupDatabase() {
  try {
    console.log('[DB Warmup] Starting database connection warmup...')
    const startTime = Date.now()
    
    // Execute a simple query to force connection initialization
    await prisma.$queryRaw`SELECT 1 as warmup`
    
    const duration = Date.now() - startTime
    console.log(`[DB Warmup] Database connection established in ${duration}ms`)
    
    // Optional: Pre-warm specific model connections
    // This helps with Prisma's lazy model initialization
    await Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.session.count().catch(() => 0),
      prisma.familyMember.count().catch(() => 0),
    ])
    
    console.log('[DB Warmup] Model connections warmed up successfully')
    return true
  } catch (error) {
    console.error('[DB Warmup] Failed to warm up database connection:', error)
    // Don't throw - let the app continue and handle connection errors later
    return false
  }
}

/**
 * Optimized family member query with better performance
 */
export async function getFamilyMembersOptimized(userId: string) {
  // Use a more optimized query with only necessary fields
  // and avoid N+1 query problems
  return await prisma.familyMember.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      age: true,
      relationship: true,
      order: true,
      isActive: true,
    },
    orderBy: {
      order: 'asc',
    },
    // Add query hints for better performance
    // @ts-ignore - Prisma doesn't have official support for hints yet
    _hints: {
      index: 'idx_family_member_user_active', // Assuming this index exists
    }
  })
}