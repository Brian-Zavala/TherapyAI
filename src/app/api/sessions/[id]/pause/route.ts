import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma-optimized'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('📍 POST /api/sessions/[id]/pause - Starting pause request')
    
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('❌ Pause request failed: Unauthorized')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: sessionId } = await params
    console.log(`📍 Processing pause for session ${sessionId} by user ${session.user.id}`)
    
    // Get conversation state ID from request body if provided
    // This will be used in future to link the paused session with saved VAPI conversation state
    let conversationStateId: string | undefined
    try {
      const body = await req.json()
      conversationStateId = body.conversationStateId
      // TODO: Store conversationStateId in session or related table when VAPI pause is fully integrated
      if (conversationStateId) {
        console.log('Conversation state saved with ID:', conversationStateId)
      }
    } catch {
      // Body parsing failed, continue without conversationStateId
    }

    // Get the session and verify ownership
    const therapySession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        userId: true,
        isPaused: true,
        pausedAt: true,
        conversationTimeSeconds: true,
        lastConversationStart: true,
        startTime: true,
        totalPausedTimeSeconds: true,
      }
    })

    if (!therapySession) {
      console.log(`❌ Pause request failed: Session ${sessionId} not found`)
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    if (therapySession.userId !== session.user.id) {
      console.log(`❌ Pause request failed: User ${session.user.id} does not own session ${sessionId}`)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    if (therapySession.isPaused) {
      // Session is already paused - return success with current state (idempotent)
      console.log('Session already paused, returning current state')
      const totalElapsedSeconds = therapySession.startTime
        ? Math.floor((Date.now() - new Date(therapySession.startTime).getTime()) / 1000)
        : 0
      
      return NextResponse.json({
        success: true,
        alreadyPaused: true,
        session: {
          id: sessionId,
          isPaused: true,
          pausedAt: therapySession.pausedAt,
          conversationTimeSeconds: therapySession.conversationTimeSeconds,
          totalElapsedSeconds,
          totalPausedTimeSeconds: therapySession.totalPausedTimeSeconds || 0,
        }
      })
    }

    // Calculate accumulated conversation time before pausing
    let updatedConversationTime = therapySession.conversationTimeSeconds
    if (therapySession.lastConversationStart) {
      const timeSinceLastStart = Math.floor(
        (Date.now() - new Date(therapySession.lastConversationStart).getTime()) / 1000
      )
      updatedConversationTime += timeSinceLastStart
    }

    // Update session to paused state
    const pausedAt = new Date()
    console.log(`📊 Updating session ${sessionId}: isPaused=true, conversationTime=${updatedConversationTime}s`)
    
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        isPaused: true,
        pausedAt: pausedAt,
        pauseStartTime: pausedAt, // Track when this pause started
        conversationTimeSeconds: updatedConversationTime,
        lastConversationStart: null, // Clear this since we're paused
      }
    })

    // Calculate total elapsed time
    const totalElapsedSeconds = therapySession.startTime
      ? Math.floor((pausedAt.getTime() - new Date(therapySession.startTime).getTime()) / 1000)
      : 0

    console.log(`✅ Session ${sessionId} paused successfully. Conversation time: ${updatedConversationTime}s, Total elapsed: ${totalElapsedSeconds}s`)

    return NextResponse.json({
      success: true,
      session: {
        id: updatedSession.id,
        isPaused: updatedSession.isPaused,
        pausedAt: updatedSession.pausedAt,
        conversationTimeSeconds: updatedSession.conversationTimeSeconds,
        totalElapsedSeconds,
        totalPausedTimeSeconds: updatedSession.totalPausedTimeSeconds || 0, // Return actual paused time, not calculated
      }
    })

  } catch (error) {
    console.error('❌ Error pausing session:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      sessionId: (await params).id,
      userId: (await getServerSession(authOptions))?.user?.id
    })
    return NextResponse.json(
      { 
        error: 'Failed to pause session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}