import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma-optimized'

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

    // Get the session and verify ownership
    const therapySession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        userId: true,
        isPaused: true,
        pauseStartTime: true,
        totalPausedTimeSeconds: true,
        conversationTimeSeconds: true,
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

    if (!therapySession.isPaused) {
      return NextResponse.json(
        { error: 'Session is not paused' },
        { status: 400 }
      )
    }

    // Calculate how long this pause lasted
    let pauseDuration = 0
    if (therapySession.pauseStartTime) {
      pauseDuration = Math.floor(
        (Date.now() - new Date(therapySession.pauseStartTime).getTime()) / 1000
      )
    }

    // Update session to resumed state
    const resumedAt = new Date()
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        isPaused: false,
        resumedAt: resumedAt,
        lastConversationStart: resumedAt, // Start tracking conversation time again
        totalPausedTimeSeconds: therapySession.totalPausedTimeSeconds + pauseDuration,
        pauseStartTime: null, // Clear pause start time
      }
    })

    // Calculate total elapsed time
    const totalElapsedSeconds = therapySession.startTime
      ? Math.floor((resumedAt.getTime() - new Date(therapySession.startTime).getTime()) / 1000)
      : 0

    return NextResponse.json({
      success: true,
      session: {
        id: updatedSession.id,
        isPaused: updatedSession.isPaused,
        resumedAt: updatedSession.resumedAt,
        conversationTimeSeconds: updatedSession.conversationTimeSeconds,
        totalElapsedSeconds,
        totalPausedTimeSeconds: updatedSession.totalPausedTimeSeconds,
        pauseDuration, // How long this specific pause lasted
      }
    })

  } catch (error) {
    console.error('Error resuming session:', error)
    return NextResponse.json(
      { error: 'Failed to resume session' },
      { status: 500 }
    )
  }
}