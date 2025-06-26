import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withRetry } from '@/lib/prisma-enhanced'
import { z } from 'zod'
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek } from 'date-fns'

// Request validation schema
const MetricsQuerySchema = z.object({
  userId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  aggregate: z.enum(['daily', 'weekly', 'monthly']).optional().default('daily'),
  includeProgress: z.boolean().optional().default(false),
  includeFamilyMembers: z.boolean().optional().default(false),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const query = {
      userId: searchParams.get('userId') || session.user.id,
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      aggregate: searchParams.get('aggregate') || 'daily',
      includeProgress: searchParams.get('includeProgress') === 'true',
      includeFamilyMembers: searchParams.get('includeFamilyMembers') === 'true',
    }

    // Validate query parameters
    const validatedQuery = MetricsQuerySchema.parse(query)

    // Check authorization if requesting another user's data
    if (validatedQuery.userId !== session.user.id && (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Set default date range if not provided
    const endDate = validatedQuery.endDate ? new Date(validatedQuery.endDate) : new Date()
    const startDate = validatedQuery.startDate 
      ? new Date(validatedQuery.startDate)
      : subDays(endDate, 30) // Default to 30 days

    // Build queries based on aggregate level
    let metricsData: any[] = []
    
    if (validatedQuery.aggregate === 'daily') {
      // Use raw SQL for efficient daily aggregation with the new schema
      metricsData = await prisma.$queryRaw`
        SELECT 
          DATE(date) as date,
          AVG("clarityScore") as "clarityScore",
          AVG("empathyScore") as "empathyScore",
          AVG("respectScore") as "respectScore",
          AVG("overallScore") as "overallScore",
          AVG("listeningScore") as "listeningScore",
          AVG("expressionScore") as "expressionScore",
          AVG("conflictScore") as "conflictScore",
          COUNT(DISTINCT "sessionId") as "sessionCount"
        FROM "CommunicationMetric"
        WHERE "userId" = ${validatedQuery.userId}
          AND date >= ${startDate}
          AND date <= ${endDate}
          AND "metricType" = 'session-complete'
        GROUP BY DATE(date)
        ORDER BY date ASC
      `
    } else if (validatedQuery.aggregate === 'weekly') {
      // Use the weekly_metrics view for better performance
      metricsData = await prisma.$queryRaw`
        SELECT 
          week_start as date,
          avg_clarity_score as "clarityScore",
          avg_empathy_score as "empathyScore",
          avg_respect_score as "respectScore",
          avg_overall_score as "overallScore",
          session_count as "sessionCount"
        FROM weekly_metrics
        WHERE "userId" = ${validatedQuery.userId}
          AND week_start >= ${startOfWeek(startDate)}
          AND week_start <= ${endOfWeek(endDate)}
        ORDER BY week_start ASC
      `
    }

    // Include progress tracking if requested
    let progressData = null
    if (validatedQuery.includeProgress) {
      progressData = await withRetry(async () => {
        return await prisma.progressTracking.findMany({
          where: {
            userId: validatedQuery.userId,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            closenessScore: true,
            communicationScore: true,
            notes: true,
            date: true,
          },
        })
      })
    }

    // Include family member data if requested
    let familyMembers = null
    if (validatedQuery.includeFamilyMembers) {
      familyMembers = await withRetry(async () => {
        return await prisma.familyMember.findMany({
          where: {
            userId: validatedQuery.userId,
            isActive: true,
          },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            name: true,
            relationship: true,
            age: true,
          },
        })
      })
    }

    // Get session statistics using the view
    const sessionStats = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM user_session_stats WHERE user_id = $1
    `, validatedQuery.userId)

    // Calculate trends
    const trends = calculateTrends(metricsData)

    // Get real-time active session metrics if any
    let activeSessionMetrics = null
    const activeSession = await prisma.session.findFirst({
      where: {
        userId: validatedQuery.userId,
        status: 'active',
      },
      orderBy: { startTime: 'desc' },
      select: {
        id: true,
        startTime: true,
        theme: true,
      },
    })

    if (activeSession) {
      // Subscribe to real-time metrics for active session
      activeSessionMetrics = {
        sessionId: activeSession.id,
        startTime: activeSession.startTime,
        theme: activeSession.theme,
        realtimeChannelName: `session:${activeSession.id}:metrics`,
      }
    }

    return NextResponse.json({
      metrics: metricsData.map(formatMetricData),
      progress: progressData,
      familyMembers,
      sessionStats: sessionStats[0] || null,
      trends,
      activeSession: activeSessionMetrics,
      meta: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        aggregate: validatedQuery.aggregate,
        totalDays: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      },
    })
  } catch (error: any) {
    console.error('Error fetching enhanced metrics:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}

// POST endpoint for real-time metric updates during active sessions
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { sessionId, metrics } = body

    // Verify session ownership
    const therapySession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true, status: true },
    })

    if (!therapySession || therapySession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (therapySession.status !== 'active') {
      return NextResponse.json({ error: 'Session is not active' }, { status: 400 })
    }

    // Create real-time metric entry
    const metricEntry = await prisma.communicationMetric.create({
      data: {
        userId: session.user.id,
        sessionId,
        clarity: metrics.clarity || 50,
        empathy: metrics.empathy || 50,
        respect: metrics.respect || 50,
        overall: metrics.overall || 50,
        listening: metrics.listening || 50,
        expression: metrics.expression || 50,
        metricType: 'real-time',
        calculatedAt: new Date(),
      },
    })

    // Broadcast update via Supabase
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await supabase
      .channel(`session:${sessionId}:metrics`)
      .send({
        type: 'broadcast',
        event: 'metrics-update',
        payload: {
          sessionId,
          metrics: metricEntry,
          timestamp: new Date().toISOString(),
        },
      })

    return NextResponse.json({
      success: true,
      metricId: metricEntry.id,
    })
  } catch (error) {
    console.error('Error saving real-time metrics:', error)
    return NextResponse.json(
      { error: 'Failed to save metrics' },
      { status: 500 }
    )
  }
}

// Helper functions
function formatMetricData(metric: any) {
  return {
    date: metric.date,
    clarityScore: parseFloat(metric.clarityScore?.toFixed(2) || '0'),
    empathyScore: parseFloat(metric.empathyScore?.toFixed(2) || '0'),
    respectScore: parseFloat(metric.respectScore?.toFixed(2) || '0'),
    overallScore: parseFloat(metric.overallScore?.toFixed(2) || '0'),
    listeningScore: parseFloat(metric.listeningScore?.toFixed(2) || '0'),
    expressionScore: parseFloat(metric.expressionScore?.toFixed(2) || '0'),
    conflictScore: parseFloat(metric.conflictScore?.toFixed(2) || '0'),
    sessionCount: parseInt(metric.sessionCount || '0'),
  }
}

function calculateTrends(metrics: any[]) {
  if (metrics.length < 2) return null

  const recent = metrics.slice(-7) // Last 7 data points
  const previous = metrics.slice(-14, -7) // Previous 7 data points

  const avgRecent = calculateAverage(recent)
  const avgPrevious = calculateAverage(previous)

  return {
    clarity: calculatePercentageChange(avgPrevious.clarity, avgRecent.clarity),
    empathy: calculatePercentageChange(avgPrevious.empathy, avgRecent.empathy),
    respect: calculatePercentageChange(avgPrevious.respect, avgRecent.respect),
    overall: calculatePercentageChange(avgPrevious.overall, avgRecent.overall),
  }
}

function calculateAverage(metrics: any[]) {
  const sum = metrics.reduce(
    (acc, m) => ({
      clarity: acc.clarity + parseFloat(m.clarityScore || 0),
      empathy: acc.empathy + parseFloat(m.empathyScore || 0),
      respect: acc.respect + parseFloat(m.respectScore || 0),
      overall: acc.overall + parseFloat(m.overallScore || 0),
    }),
    { clarity: 0, empathy: 0, respect: 0, overall: 0 }
  )

  const count = metrics.length || 1
  return {
    clarity: sum.clarity / count,
    empathy: sum.empathy / count,
    respect: sum.respect / count,
    overall: sum.overall / count,
  }
}

function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0
  return ((newValue - oldValue) / oldValue) * 100
}