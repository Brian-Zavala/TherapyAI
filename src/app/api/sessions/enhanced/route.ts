import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withRetry, withTransaction } from '@/lib/prisma-enhanced'
import { z } from 'zod'

// Enhanced session schema with validation
const CreateSessionSchema = z.object({
  assistantId: z.string().min(1).max(255),
  theme: z.string().min(1).max(255).optional(),
  mood: z.string().min(1).max(100).optional(),
  duration: z.number().int().min(1).max(180).default(60),
  isRecurring: z.boolean().optional(),
  recurrencePattern: z.enum(['daily', 'weekly', 'biweekly']).optional(),
  recurrenceCount: z.number().int().min(1).max(52).optional(),
  familyMemberIds: z.array(z.string()).optional(), // New field for family members
})

// GET /api/sessions/enhanced - Get user sessions with optimized queries
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const includeTranscripts = searchParams.get('includeTranscripts') === 'true'
    const includeMetrics = searchParams.get('includeMetrics') === 'true'

    // Build where clause with filters
    const where: any = { userId: session.user.id }
    
    if (status) {
      where.status = status
    }
    
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    // Execute queries with retry logic
    const [sessions, totalCount] = await withRetry(async () => {
      return await Promise.all([
        prisma.session.findMany({
          where,
          orderBy: { date: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            // Only include related data if requested
            transcriptEntries: includeTranscripts ? {
              select: {
                id: true,
                speaker: true,
                text: true,
                timestamp: true,
                isFinal: true,
              },
              orderBy: { timestamp: 'asc' },
              take: 100, // Limit transcript entries
            } : false,
            conversationState: {
              select: {
                isActive: true,
                isPaused: true,
                lastActiveTime: true,
                messageCount: true,
              },
            },
          },
        }),
        prisma.session.count({ where }),
      ])
    })

    // If metrics requested, fetch in parallel
    let metrics = null
    if (includeMetrics && sessions.length > 0) {
      const sessionIds = sessions.map((s: any) => s.id)
      metrics = await prisma.communicationMetric.findMany({
        where: {
          sessionId: { in: sessionIds },
        },
        select: {
          sessionId: true,
          clarity: true,
          empathy: true,
          respect: true,
          overall: true,
        },
      })
    }

    // Get family members for backward compatibility
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        familyMembers: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    })

    // Transform sessions for response
    const transformedSessions = sessions.map((session: any) => ({
      ...session,
      metrics: metrics?.find((m: any) => m.sessionId === session.id),
      // Add backward compatibility fields
      familyMembers: user?.familyMembers || [],
    }))

    return NextResponse.json({
      sessions: transformedSessions,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      meta: {
        hasTranscripts: includeTranscripts,
        hasMetrics: includeMetrics,
      },
    })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

// POST /api/sessions/enhanced - Create new session with transaction
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    
    // Validate request body
    const validatedData = CreateSessionSchema.parse(body)

    // Check for active sessions to prevent duplicates
    const activeSession = await prisma.session.findFirst({
      where: {
        userId: session.user.id,
        status: 'active',
        conversationTimeSeconds: { gt: 30 },
      },
    })

    if (activeSession) {
      return NextResponse.json(
        { 
          error: 'Active session already exists',
          sessionId: activeSession.id,
        },
        { status: 409 }
      )
    }

    // Create session with transaction for data consistency
    const newSession = await withTransaction(async (tx) => {
      // Create main session
      const createdSession = await tx.session.create({
        data: {
          userId: session.user.id,
          assistantId: validatedData.assistantId,
          theme: validatedData.theme,
          duration: validatedData.duration,
          status: 'scheduled',
          startTime: new Date(),
          date: new Date(),
        },
      })

      // Create conversation state
      await tx.conversationState.create({
        data: {
          sessionId: createdSession.id,
          userId: session.user.id,
          assistantId: validatedData.assistantId || 'default-assistant',
          sessionStartTime: new Date(),
          lastActiveTime: new Date(),
          messages: {
            create: []
          }
        },
      })

      // Create initial communication metric
      await tx.communicationMetric.create({
        data: {
          userId: session.user.id,
          sessionId: createdSession.id,
          clarity: 50,
          empathy: 50,
          respect: 50,
          overall: 50,
          listening: 50,
          expression: 50,
          metricType: 'session',
          calculatedAt: new Date()
        },
      })

      // Handle recurring sessions if requested
      if (validatedData.isRecurring && validatedData.recurrencePattern && validatedData.recurrenceCount) {
        const recurringSessions = []
        const baseDate = new Date()
        
        for (let i = 1; i <= validatedData.recurrenceCount; i++) {
          const nextDate = new Date(baseDate)
          
          switch (validatedData.recurrencePattern) {
            case 'daily':
              nextDate.setDate(nextDate.getDate() + i)
              break
            case 'weekly':
              nextDate.setDate(nextDate.getDate() + (i * 7))
              break
            case 'biweekly':
              nextDate.setDate(nextDate.getDate() + (i * 14))
              break
          }
          
          recurringSessions.push({
            userId: session.user.id,
            assistantId: validatedData.assistantId,
            theme: validatedData.theme,
            mood: validatedData.mood,
            duration: validatedData.duration,
            status: 'scheduled',
            date: nextDate,
          })
        }
        
        await tx.session.createMany({
          data: recurringSessions,
        })
      }

      return createdSession
    })

    // Log session creation for analytics
    console.log(`✅ Session created: ${newSession.id} for user: ${session.user.id}`)

    return NextResponse.json({
      session: newSession,
      message: 'Session created successfully',
    })
  } catch (error) {
    console.error('Error creating session:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

// PATCH /api/sessions/enhanced - Batch update sessions
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { sessionIds, updates } = body

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json(
        { error: 'No session IDs provided' },
        { status: 400 }
      )
    }

    // Validate ownership of all sessions
    const userSessions = await prisma.session.findMany({
      where: {
        id: { in: sessionIds },
        userId: session.user.id,
      },
      select: { id: true, version: true },
    })

    if (userSessions.length !== sessionIds.length) {
      return NextResponse.json(
        { error: 'Unauthorized: Some sessions do not belong to user' },
        { status: 403 }
      )
    }

    // Perform batch update with optimistic locking
    const updateResults = await withTransaction(async (tx) => {
      const results = []
      
      for (const userSession of userSessions) {
        try {
          const updated = await tx.session.update({
            where: {
              id: userSession.id,
              version: userSession.version, // Optimistic locking
            },
            data: {
              ...updates,
              version: { increment: 1 },
              updatedAt: new Date(),
            },
          })
          results.push({ id: updated.id, success: true })
        } catch (error: any) {
          if (error.code === 'P2025') {
            // Record not found - version mismatch
            results.push({ 
              id: userSession.id, 
              success: false, 
              error: 'Version conflict' 
            })
          } else {
            throw error
          }
        }
      }
      
      return results
    })

    const successCount = updateResults.filter(r => r.success).length
    
    return NextResponse.json({
      message: `Updated ${successCount} of ${sessionIds.length} sessions`,
      results: updateResults,
    })
  } catch (error) {
    console.error('Error updating sessions:', error)
    return NextResponse.json(
      { error: 'Failed to update sessions' },
      { status: 500 }
    )
  }
}

// DELETE /api/sessions/enhanced - Soft delete sessions
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')
    const deleteAll = searchParams.get('deleteAll') === 'true'

    if (!sessionId && !deleteAll) {
      return NextResponse.json(
        { error: 'No session ID provided' },
        { status: 400 }
      )
    }

    if (deleteAll) {
      // Soft delete all sessions for user
      const result = await prisma.session.updateMany({
        where: {
          userId: session.user.id,
          status: { not: 'deleted' },
        },
        data: {
          status: 'deleted',
          updatedAt: new Date(),
        },
      })
      
      return NextResponse.json({
        message: `Soft deleted ${result.count} sessions`,
      })
    } else {
      // Soft delete specific session
      const deletedSession = await prisma.session.update({
        where: {
          id: sessionId!,
          userId: session.user.id,
        },
        data: {
          status: 'deleted',
          updatedAt: new Date(),
        },
      })
      
      return NextResponse.json({
        message: 'Session deleted successfully',
        sessionId: deletedSession.id,
      })
    }
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    )
  }
}