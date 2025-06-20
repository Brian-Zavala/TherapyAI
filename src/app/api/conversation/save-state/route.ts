import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Input validation schema
const SaveStateSchema = z.object({
  sessionId: z.string().min(1),
  // Allow either assistantId OR inline configuration
  assistantId: z.string().min(1).max(255).optional(),
  assistantConfig: z.record(z.unknown()).optional(),
  isInlineConfig: z.boolean().optional(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(10000), // Prevent huge messages
    timestamp: z.number().int().positive(),
    metadata: z.record(z.unknown()).optional()
  })).max(1000), // Limit message count
  variableValues: z.record(z.unknown()).optional(),
  sessionMetadata: z.object({
    startTime: z.number().int().positive(),
    lastActiveTime: z.number().int().positive(),
    totalDuration: z.number().int().min(0).max(86400000), // Max 24 hours
  })
}).refine(
  (data) => data.assistantId || data.assistantConfig || data.isInlineConfig,
  {
    message: "Either assistantId or assistantConfig must be provided",
    path: ["assistantId"]
  }
)

export async function POST(request: NextRequest) {
  const authSession = await getServerSession(authOptions)
  
  try {
    // Authentication
    if (!authSession?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate input
    const body = await request.json()
    const validatedData = SaveStateSchema.parse(body)

    // Verify session ownership
    const therapySession = await prisma.session.findUnique({
      where: { id: validatedData.sessionId },
      select: { userId: true }
    })

    if (!therapySession || therapySession.userId !== authSession.user.id) {
      return NextResponse.json(
        { success: false, error: 'Session not found or unauthorized' },
        { status: 403 }
      )
    }

    // Save conversation state with transaction
    const conversationState = await prisma.$transaction(async (tx) => {
      // Check for existing conversation state
      const existingState = await tx.conversationState.findUnique({
        where: { sessionId: validatedData.sessionId }
      })

      if (existingState) {
        // Update existing state
        await tx.conversationState.update({
          where: { id: existingState.id },
          data: {
            assistantId: validatedData.assistantId || 'inline-config',
            sessionStartTime: new Date(validatedData.sessionMetadata.startTime),
            lastActiveTime: new Date(validatedData.sessionMetadata.lastActiveTime),
            totalDuration: validatedData.sessionMetadata.totalDuration,
            messageCount: validatedData.messages.length,
            variableValues: validatedData.variableValues || {},
            isPaused: true,
            isActive: false,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            updatedAt: new Date(),
            // Store inline config in metadata if provided
            metadata: validatedData.assistantConfig 
              ? { assistantConfig: validatedData.assistantConfig } as Record<string, unknown>
              : existingState.metadata || {} as Record<string, unknown>
          }
        })

        // Delete existing messages to replace with new ones
        await tx.conversationMessage.deleteMany({
          where: { conversationStateId: existingState.id }
        })

        // Create new messages
        if (validatedData.messages.length > 0) {
          await tx.conversationMessage.createMany({
            data: validatedData.messages.map(msg => ({
              conversationStateId: existingState.id,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.timestamp),
              metadata: msg.metadata as any || {}
            }))
          })
        }

        return existingState
      } else {
        // Create new conversation state
        const state = await tx.conversationState.create({
          data: {
            sessionId: validatedData.sessionId,
            userId: authSession.user.id,
            assistantId: validatedData.assistantId || 'inline-config',
            sessionStartTime: new Date(validatedData.sessionMetadata.startTime),
            lastActiveTime: new Date(validatedData.sessionMetadata.lastActiveTime),
            totalDuration: validatedData.sessionMetadata.totalDuration,
            messageCount: validatedData.messages.length,
            variableValues: validatedData.variableValues || {},
            isPaused: true,
            isActive: false,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            // Store inline config in metadata if provided
            metadata: validatedData.assistantConfig 
              ? { assistantConfig: validatedData.assistantConfig } as Record<string, unknown>
              : {} as Record<string, unknown>
          }
        })

        // Create messages
        if (validatedData.messages.length > 0) {
          await tx.conversationMessage.createMany({
            data: validatedData.messages.map(msg => ({
              conversationStateId: state.id,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.timestamp),
              metadata: msg.metadata as any || {}
            }))
          })
        }

        return state
      }
    })

    console.log(`Conversation state saved: ${conversationState.id} for session: ${validatedData.sessionId}`)

    return NextResponse.json({
      success: true,
      stateId: conversationState.id,
      messageCount: conversationState.messageCount
    })

  } catch (error) {
    console.error('Failed to save conversation state:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: authSession?.user?.id
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}