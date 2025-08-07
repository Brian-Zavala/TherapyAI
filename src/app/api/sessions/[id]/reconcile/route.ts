import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { reconcileSessionTranscripts } from '@/lib/vapi/transcript-reconciliation'
import { z } from 'zod'

// Schema for validation
const paramsSchema = z.object({
  id: z.string().uuid()
})

/**
 * POST /api/sessions/[id]/reconcile
 * Manually trigger transcript reconciliation for a session
 * Useful for debugging duplicate transcript issues
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate params
    const awaitedParams = await params
    const { id: sessionId } = paramsSchema.parse(awaitedParams)

    console.log(`🔍 Manual reconciliation requested for session ${sessionId} by user ${session.user.id}`)

    // Run reconciliation
    const result = await reconcileSessionTranscripts(sessionId)

    // Return result
    return NextResponse.json({
      success: true,
      result: {
        sessionId: result.sessionId,
        duplicatesFound: result.duplicatesFound,
        duplicatesRemoved: result.duplicatesRemoved,
        entriesMerged: result.entriesMerged,
        finalEntryCount: result.finalEntryCount,
        errors: result.errors
      },
      message: `Reconciliation complete. Removed ${result.duplicatesRemoved} duplicates.`
    })

  } catch (error) {
    console.error('Error in reconcile endpoint:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to reconcile transcripts',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/sessions/[id]/reconcile
 * Get reconciliation status for a session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate params
    const { id: sessionId } = paramsSchema.parse(params)

    // Get session notes to check reconciliation status
    const { prisma } = await import('@/lib/prisma')
    const sessionData = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        notes: true,
        _count: {
          select: {
            transcriptEntries: true
          }
        }
      }
    })

    if (!sessionData) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Parse notes as JSON to get reconciliation metadata
    let reconciliationData: any = {}
    if (sessionData.notes) {
      try {
        const notesData = JSON.parse(sessionData.notes)
        reconciliationData = notesData.reconciliation || {}
      } catch {
        // Notes is not JSON or doesn't contain reconciliation data
        reconciliationData = {}
      }
    }

    return NextResponse.json({
      sessionId: sessionData.id,
      transcriptCount: sessionData._count.transcriptEntries,
      reconciliationCompleted: reconciliationData.reconciliationCompleted || false,
      reconciliationTimestamp: reconciliationData.reconciliationTimestamp || null,
      userWordCount: reconciliationData.userWordCount || 0,
      assistantWordCount: reconciliationData.assistantWordCount || 0
    })

  } catch (error) {
    console.error('Error getting reconciliation status:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to get reconciliation status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}