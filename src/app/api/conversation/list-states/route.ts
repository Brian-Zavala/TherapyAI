import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-optimized'

export async function GET() {
  try {
    // Authentication
    const session = await getAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all paused conversations for the user
    const conversationStates = await prisma.conversationState.findMany({
      where: {
        userId: session.user.id,
        isPaused: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1 // Just get the last message for preview
        },
        session: {
          select: {
            id: true,
            theme: true,
            date: true
          }
        }
      },
      orderBy: { lastActiveTime: 'desc' },
      take: 10 // Limit to 10 most recent
    })

    const states = conversationStates.map(state => ({
      id: state.id,
      sessionId: state.sessionId,
      assistantId: state.assistantId,
      lastActiveTime: state.lastActiveTime.toISOString(),
      messageCount: state.messageCount,
      totalDuration: state.totalDuration,
      lastMessage: state.messages[0]?.content || '',
      sessionTheme: state.session?.theme || 'AI Therapy Session',
      sessionDate: state.session?.date || state.createdAt
    }))

    return NextResponse.json({
      success: true,
      states
    })

  } catch (error) {
    console.error('Failed to list conversation states:', error)

    return NextResponse.json(
      { success: false, error: 'Failed to load conversations' },
      { status: 500 }
    )
  }
}