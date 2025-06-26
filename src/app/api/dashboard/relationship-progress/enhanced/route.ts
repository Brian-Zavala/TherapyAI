import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withRetry } from '@/lib/prisma-enhanced'
import { z } from 'zod'
import { subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns'

// Request validation schema
const ProgressQuerySchema = z.object({
  therapyType: z.enum(['couple', 'family', 'individual']).default('couple'),
  timeframe: z.enum(['week', 'month', 'all']).default('all'),
  includeMetrics: z.boolean().default(true),
  includeSessions: z.boolean().default(true),
  limit: z.number().min(1).max(100).default(50)
})

// Progress data point type
interface ProgressDataPoint {
  date: Date
  sessionId: string
  sessionNumber: number
  closeness: number
  communication: number
  overall: number
  listening: number
  expression: number
  clarity: number
  empathy: number
  respect: number
  duration: number
  conversationTurns: number
  familyMembers?: Array<{
    id: string
    name: string
    relationship: string
  }>
  insights: string[]
  trends: {
    closeness: number
    communication: number
    overall: number
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate query parameters
    const searchParams = req.nextUrl.searchParams
    const query = ProgressQuerySchema.parse({
      therapyType: searchParams.get('therapyType'),
      timeframe: searchParams.get('timeframe'),
      includeMetrics: searchParams.get('includeMetrics') === 'true',
      includeSessions: searchParams.get('includeSessions') === 'true',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    })

    // Calculate date range
    let startDate: Date | undefined
    const now = new Date()
    
    switch (query.timeframe) {
      case 'week':
        startDate = startOfDay(subWeeks(now, 1))
        break
      case 'month':
        startDate = startOfDay(subMonths(now, 1))
        break
      case 'all':
        startDate = undefined
        break
    }

    // Get user's completed sessions with metrics
    const sessions = await withRetry(async () => 
      prisma.session.findMany({
        where: {
          userId: session.user.id,
          status: 'completed',
          sessionType: query.therapyType === 'individual' ? 'individual' : query.therapyType,
          ...(startDate && {
            completedAt: {
              gte: startDate,
              lte: endOfDay(now)
            }
          })
        },
        include: {
          communicationMetrics: {
            where: {
              metricType: 'final' // Only get final metrics for completed sessions
            },
            orderBy: {
              calculatedAt: 'desc'
            },
            take: 1
          },
          sessionFamilyMembers: query.therapyType === 'family' ? {
            include: {
              familyMember: true
            }
          } : false,
          _count: {
            select: {
              transcriptEntries: true
            }
          }
        },
        orderBy: {
          completedAt: 'asc'
        },
        take: query.limit
      })
    )

    // Calculate progress tracking data
    const progressData: ProgressDataPoint[] = []
    let previousMetrics: any = null
    
    sessions.forEach((session: any, index: number) => {
      const metrics = session.communicationMetrics[0]
      if (!metrics) return // Skip sessions without metrics
      
      // Calculate trends (change from previous session)
      const trends = previousMetrics ? {
        closeness: metrics.clarity - previousMetrics.clarity,
        communication: metrics.empathy - previousMetrics.empathy,
        overall: metrics.overall - previousMetrics.overall
      } : {
        closeness: 0,
        communication: 0,
        overall: 0
      }
      
      // Generate insights based on metrics and trends
      const insights: string[] = []
      
      if (trends.overall > 5) {
        insights.push(query.therapyType === 'family' ? 
          'Significant family dynamics improvement' : 
          'Relationship breakthrough achieved')
      } else if (trends.overall > 2) {
        insights.push(query.therapyType === 'family' ?
          'Family connections strengthening' :
          'Positive relationship momentum')
      } else if (trends.overall < -2) {
        insights.push(query.therapyType === 'family' ?
          'Facing family adjustment challenges' :
          'Working through relationship challenges')
      }
      
      if (metrics.clarity > 80) {
        insights.push('Excellent communication clarity')
      }
      
      if (metrics.empathy > 85) {
        insights.push('Strong empathetic connection')
      }
      
      if (metrics.respect > 90) {
        insights.push('Outstanding mutual respect')
      }
      
      if (metrics.listening && metrics.listening > 80) {
        insights.push('Active listening skills improving')
      }
      
      progressData.push({
        date: session.completedAt || session.date,
        sessionId: session.id,
        sessionNumber: index + 1,
        closeness: Math.round(metrics.clarity),
        communication: Math.round(metrics.empathy),
        overall: Math.round(metrics.overall),
        listening: Math.round(metrics.listening || 50),
        expression: Math.round(metrics.expression || 50),
        clarity: Math.round(metrics.clarity),
        empathy: Math.round(metrics.empathy),
        respect: Math.round(metrics.respect),
        duration: session.duration,
        conversationTurns: session._count.transcriptEntries,
        familyMembers: session.sessionFamilyMembers ? 
          (session.sessionFamilyMembers as any[]).map(sfm => ({
            id: sfm.familyMember.id,
            name: sfm.familyMember.name,
            relationship: sfm.familyMember.relationship
          })) : undefined,
        insights,
        trends
      })
      
      previousMetrics = metrics
    })

    // Calculate aggregate statistics
    const aggregateStats = progressData.length > 0 ? {
      totalSessions: progressData.length,
      averageMetrics: {
        closeness: Math.round(progressData.reduce((sum, p) => sum + p.closeness, 0) / progressData.length),
        communication: Math.round(progressData.reduce((sum, p) => sum + p.communication, 0) / progressData.length),
        overall: Math.round(progressData.reduce((sum, p) => sum + p.overall, 0) / progressData.length),
        listening: Math.round(progressData.reduce((sum, p) => sum + p.listening, 0) / progressData.length),
        expression: Math.round(progressData.reduce((sum, p) => sum + p.expression, 0) / progressData.length)
      },
      totalProgress: progressData.length > 1 ? {
        closeness: progressData[progressData.length - 1].closeness - progressData[0].closeness,
        communication: progressData[progressData.length - 1].communication - progressData[0].communication,
        overall: progressData[progressData.length - 1].overall - progressData[0].overall
      } : null,
      lastSession: progressData[progressData.length - 1] || null,
      firstSession: progressData[0] || null,
      totalDuration: progressData.reduce((sum, p) => sum + p.duration, 0),
      totalConversationTurns: progressData.reduce((sum, p) => sum + p.conversationTurns, 0)
    } : null

    // Get user's progress milestones if they exist
    const milestones = await prisma.progressTracking.findMany({
      where: {
        userId: session.user.id,
        ...(startDate && {
          date: {
            gte: startDate,
            lte: endOfDay(now)
          }
        })
      },
      orderBy: {
        date: 'desc'
      },
      take: 10
    })

    return NextResponse.json({
      progress: progressData,
      aggregateStats,
      milestones: milestones.map((m: any) => ({
        date: m.date,
        milestone: m.notes,
        scores: {
          closeness: m.closenessScore,
          communication: m.communicationScore
        }
      })),
      meta: {
        therapyType: query.therapyType,
        timeframe: query.timeframe,
        dataPoints: progressData.length,
        dateRange: {
          start: startDate?.toISOString() || null,
          end: now.toISOString()
        }
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error fetching relationship progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch progress data' },
      { status: 500 }
    )
  }
}

// POST endpoint to save progress milestones
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    
    // Validate request body
    const MilestoneSchema = z.object({
      sessionId: z.string(),
      therapyType: z.enum(['couple', 'family', 'individual']),
      closenessScore: z.number().min(0).max(100),
      communicationScore: z.number().min(0).max(100),
      notes: z.string().optional(),
      assistantId: z.string().optional()
    })
    
    const validatedData = MilestoneSchema.parse(body)

    // Verify session belongs to user
    const sessionExists = await prisma.session.findFirst({
      where: {
        id: validatedData.sessionId,
        userId: session.user.id
      }
    })

    if (!sessionExists) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      )
    }

    // Create progress tracking entry
    const milestone = await withRetry(async () =>
      prisma.progressTracking.create({
        data: {
          userId: session.user.id,
          sessionId: validatedData.sessionId,
          closenessScore: validatedData.closenessScore,
          communicationScore: validatedData.communicationScore,
          notes: validatedData.notes,
          assistantId: validatedData.assistantId,
          date: new Date()
        }
      })
    )

    return NextResponse.json({
      success: true,
      milestone: {
        id: milestone.id,
        date: milestone.date,
        scores: {
          closeness: milestone.closenessScore,
          communication: milestone.communicationScore
        },
        notes: milestone.notes
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error saving progress milestone:', error)
    return NextResponse.json(
      { error: 'Failed to save progress milestone' },
      { status: 500 }
    )
  }
}