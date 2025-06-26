import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const sessionId = params.id
    
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
        conversationTimeSeconds: true,
        lastConversationStart: true,
        startTime: true,
      }
    })

    if (!therapySession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    if (therapySession.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    if (therapySession.isPaused) {
      return NextResponse.json(
        { error: 'Session is already paused' },
        { status: 400 }
      )
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
    console.error('Error pausing session:', error)
    return NextResponse.json(
      { error: 'Failed to pause session' },
      { status: 500 }
    )
  }
}