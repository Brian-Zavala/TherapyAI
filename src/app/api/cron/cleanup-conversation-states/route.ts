/**
 * Conversation States Cleanup Cron Job
 * Removes expired conversation states and states older than 30 days
 * Scheduled to run daily at 2 AM to minimize impact
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-optimized'
import { logger } from '@/lib/logger'

// Simple in-memory rate limiter for cron endpoints
const lastExecutionTime = new Map<string, number>()
const MIN_INTERVAL_MS = 60 * 60 * 1000 // 1 hour minimum between executions

export async function POST(request: NextRequest) {
  // Rate limiting check
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
  const lastRun = lastExecutionTime.get(clientIp)
  const now = Date.now()
  
  if (lastRun && (now - lastRun) < MIN_INTERVAL_MS) {
    logger.warn('Cron cleanup rate limit exceeded', { 
      clientIp,
      timeSinceLastRun: now - lastRun
    })
    return NextResponse.json({ 
      error: 'Rate limit exceeded. This endpoint can only be called once per hour.' 
    }, { status: 429 })
  }
  // Verify this is a legitimate cron request
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret) {
    logger.error('CRON_SECRET not configured')
    return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Unauthorized cron request for conversation state cleanup', { 
      hasAuth: !!authHeader,
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    logger.info('Starting conversation state cleanup cron job')
    
    const startTime = Date.now()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    // Count states to be deleted for logging
    const toDeleteCount = await prisma.conversationState.count({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { createdAt: { lt: thirtyDaysAgo } }
        ]
      }
    })
    
    if (toDeleteCount === 0) {
      logger.info('No conversation states to clean up')
      return NextResponse.json({ 
        success: true, 
        message: 'No conversation states to clean up',
        deletedCount: 0,
        duration: Date.now() - startTime
      })
    }
    
    // Delete expired states and their messages in batches
    const BATCH_SIZE = 100 // Process 100 states at a time to avoid memory/query limits
    let totalDeletedStates = 0
    let totalDeletedMessages = 0
    let hasMore = true
    
    while (hasMore) {
      const batchResult = await prisma.$transaction(async (tx) => {
        // Get a batch of states to delete
        const statesToDelete = await tx.conversationState.findMany({
          where: {
            OR: [
              { expiresAt: { lt: new Date() } },
              { createdAt: { lt: thirtyDaysAgo } }
            ]
          },
          select: { id: true },
          take: BATCH_SIZE
        })
        
        if (statesToDelete.length === 0) {
          return { deletedStates: 0, deletedMessages: 0, hasMore: false }
        }
        
        const stateIds = statesToDelete.map(state => state.id)
        
        // Delete associated messages first
        const deletedMessages = await tx.conversationMessage.deleteMany({
          where: {
            conversationStateId: { in: stateIds }
          }
        })
        
        // Then delete the states
        const deletedStates = await tx.conversationState.deleteMany({
          where: {
            id: { in: stateIds }
          }
        })
        
        return {
          deletedStates: deletedStates.count,
          deletedMessages: deletedMessages.count,
          hasMore: statesToDelete.length === BATCH_SIZE
        }
      }, {
        maxWait: 10000,   // 10 seconds max wait to acquire transaction
        timeout: 30000,   // 30 seconds timeout for each batch
      })
      
      totalDeletedStates += batchResult.deletedStates
      totalDeletedMessages += batchResult.deletedMessages
      hasMore = batchResult.hasMore
      
      // Log progress for long-running cleanups
      if (totalDeletedStates > 0 && totalDeletedStates % 1000 === 0) {
        logger.info(`Cleanup progress: ${totalDeletedStates} states deleted so far`)
      }
    }
    
    const result = {
      deletedStates: totalDeletedStates,
      deletedMessages: totalDeletedMessages
    }
    
    const duration = Date.now() - startTime
    
    logger.info('Conversation state cleanup completed successfully', { 
      deletedStates: result.deletedStates,
      deletedMessages: result.deletedMessages,
      duration: `${duration}ms`
    })
    
    // Update rate limiter after successful execution
    lastExecutionTime.set(clientIp, now)

    return NextResponse.json({ 
      success: true, 
      message: 'Conversation states cleaned up successfully',
      deletedStates: result.deletedStates,
      deletedMessages: result.deletedMessages,
      duration 
    })

  } catch (error) {
    logger.error('Conversation state cleanup cron job failed', { 
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    })

    // Check for specific database errors
    if (error instanceof Error && error.message.includes('P2025')) {
      // Record not found - likely a race condition
      logger.warn('Some records were already deleted - continuing')
      return NextResponse.json({ 
        success: true, 
        message: 'Cleanup completed with warnings',
        warning: 'Some records were already deleted'
      })
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Failed to clean up conversation states' 
    }, { status: 500 })
  }
}

// Allow GET requests for health checks and manual triggers
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if this is a manual trigger request
  const trigger = request.nextUrl.searchParams.get('trigger')
  if (trigger === 'manual') {
    logger.info('Manual trigger of conversation state cleanup')
    return POST(request)
  }

  // Otherwise return health check
  return NextResponse.json({ 
    status: 'healthy',
    service: 'conversation-state-cleanup-cron',
    timestamp: new Date().toISOString(),
    description: 'Cleans up expired conversation states and states older than 30 days'
  })
}