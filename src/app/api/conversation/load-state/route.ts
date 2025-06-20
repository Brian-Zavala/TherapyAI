import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Input validation schema
const LoadStateSchema = z.object({
  sessionId: z.string().min(1)
})

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    const validatedParams = LoadStateSchema.parse({ sessionId })

    // Get conversation state with messages
    const conversationState = await prisma.conversationState.findFirst({
      where: {
        sessionId: validatedParams.sessionId,
        userId: session.user.id
      },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          take: 1000 // Limit messages to prevent huge payloads
        }
      }
    })

    if (!conversationState) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Check if conversation has expired
    if (conversationState.expiresAt && conversationState.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Conversation has expired' },
        { status: 410 }
      )
    }

    // Update state to active
    await prisma.conversationState.update({
      where: { id: conversationState.id },
      data: {
        isActive: true,
        isPaused: false,
        lastActiveTime: new Date()
      }
    })

    // Extract assistant config from metadata if it exists
    const metadata = conversationState.metadata as Record<string, unknown>
    const assistantConfig = metadata?.assistantConfig

    return NextResponse.json({
      success: true,
      state: {
        id: conversationState.id,
        sessionId: conversationState.sessionId,
        assistantId: conversationState.assistantId,
        // Include assistantConfig if it's an inline configuration
        ...(assistantConfig && { assistantConfig }),
        messages: conversationState.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.getTime(),
          metadata: msg.metadata
        })),
        variableValues: conversationState.variableValues,
        sessionMetadata: {
          startTime: conversationState.sessionStartTime.getTime(),
          lastActiveTime: conversationState.lastActiveTime.getTime(),
          totalDuration: conversationState.totalDuration
        }
      }
    })

  } catch (error) {
    console.error('Failed to load conversation state:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to load conversation' },
      { status: 500 }
    )
  }
}