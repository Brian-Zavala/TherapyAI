import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { 
  findSessionsNeedingReconciliation,
  reconcileMultipleSessions,
  cleanupAllDuplicateTranscripts
} from '@/lib/vapi/transcript-reconciliation'
import { getTranscriptStrategy } from '@/lib/vapi/transcript-strategy'

/**
 * GET /api/admin/reconcile-transcripts
 * Get sessions that need reconciliation
 */
export async function GET(request: NextRequest) {
  try {
    // Validate admin session
    const session = await getAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // TODO: Add admin role check here when roles are implemented
    // For now, allow any authenticated user

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')

    // Get current strategy
    const strategy = getTranscriptStrategy()

    // Find sessions needing reconciliation
    const sessionsNeedingReconciliation = await findSessionsNeedingReconciliation(limit)

    return NextResponse.json({
      strategy: {
        mode: strategy.useWebhookAsSource ? 'webhook-primary' : 'realtime-primary',
        reconciliationEnabled: strategy.reconciliationEnabled,
        realtimeSaving: strategy.enableRealtimeSaving,
        webhookAsSource: strategy.useWebhookAsSource
      },
      sessionsNeedingReconciliation: sessionsNeedingReconciliation.length,
      sessionIds: sessionsNeedingReconciliation
    })

  } catch (error) {
    console.error('Error getting reconciliation status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get reconciliation status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/reconcile-transcripts
 * Run reconciliation on multiple sessions
 */
export async function POST(request: NextRequest) {
  try {
    // Validate admin session
    const session = await getAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // TODO: Add admin role check here when roles are implemented

    const body = await request.json()
    const { sessionIds, cleanupAll } = body

    if (cleanupAll) {
      console.log('🧹 Running system-wide duplicate cleanup...')
      const result = await cleanupAllDuplicateTranscripts()
      
      return NextResponse.json({
        success: true,
        mode: 'cleanup-all',
        sessionsProcessed: result.sessionsProcessed,
        totalDuplicatesRemoved: result.totalDuplicatesRemoved,
        message: `Cleaned up ${result.totalDuplicatesRemoved} duplicates across ${result.sessionsProcessed} sessions`
      })
    }

    if (!sessionIds || !Array.isArray(sessionIds)) {
      return NextResponse.json(
        { error: 'sessionIds array is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Running reconciliation for ${sessionIds.length} sessions...`)
    const results = await reconcileMultipleSessions(sessionIds)

    const summary = {
      totalSessions: results.length,
      totalDuplicatesFound: results.reduce((sum, r) => sum + r.duplicatesFound, 0),
      totalDuplicatesRemoved: results.reduce((sum, r) => sum + r.duplicatesRemoved, 0),
      totalErrors: results.filter(r => r.errors.length > 0).length
    }

    return NextResponse.json({
      success: true,
      summary,
      results,
      message: `Processed ${summary.totalSessions} sessions, removed ${summary.totalDuplicatesRemoved} duplicates`
    })

  } catch (error) {
    console.error('Error running reconciliation:', error)
    return NextResponse.json(
      { 
        error: 'Failed to run reconciliation',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/reconcile-transcripts
 * Clear reconciliation flags (for testing)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Validate admin session
    const session = await getAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // TODO: Add admin role check here when roles are implemented

    const { prisma } = await import('@/lib/prisma')
    
    // Clear reconciliation flags from all sessions
    // Note: Since metadata field doesn't exist in Session schema, 
    // this operation is simplified to just count sessions
    const result = await prisma.session.findMany({
      where: {
        status: 'COMPLETED'
      },
      select: {
        id: true
      }
    })

    // For now, we'll just return a count since we can't actually clear metadata
    const mockResult = { count: result.length }

    return NextResponse.json({
      success: true,
      sessionsCleared: mockResult.count,
      message: `Found ${mockResult.count} completed sessions (metadata clearing not available)`
    })

  } catch (error) {
    console.error('Error clearing reconciliation flags:', error)
    return NextResponse.json(
      { 
        error: 'Failed to clear reconciliation flags',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}