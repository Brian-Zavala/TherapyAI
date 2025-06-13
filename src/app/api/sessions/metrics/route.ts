/**
 * API Route: Session Metrics Persistence
 * Saves aggregated metrics to the database periodically
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { IncrementalMetrics } from '@/lib/real-time-metrics-optimized'

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { sessionId, metrics, metricsCount, periodStart, periodEnd } = body

    if (!sessionId || !metrics) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify session ownership
    const therapySession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { 
        userId: true, 
        status: true,
        theme: true,
        assistantId: true,
        notes: true
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

    // Calculate aggregate scores from IncrementalMetrics structure
    const communicationScore = metrics.communicationScore ? 
      Math.round(metrics.communicationScore) : null

    const emotionalScore = metrics.emotionalSupportScore ?
      Math.round(metrics.emotionalSupportScore) : null

    const progressScore = metrics.sessionProgress ?
      Math.round(metrics.sessionProgress) : null

    // Create progress tracking record if we have valid scores
    if (communicationScore !== null) {
      // Get therapy type from session or use default
      const therapyType = therapySession.theme?.toLowerCase().includes('family') ? 'family' :
                         therapySession.theme?.toLowerCase().includes('couple') ? 'couple' : 'individual'
      
      await prisma.progressTracking.create({
        data: {
          userId: session.user.id,
          sessionId,
          therapyType,
          communicationScore: Math.round(communicationScore),
          closenessScore: Math.round(emotionalScore || communicationScore), // Use emotional score as proxy for closeness
          notes: JSON.stringify({
            metricsCount,
            periodStart,
            periodEnd,
            emotionalScore,
            progressScore,
            rawMetrics: metrics
          }),
          assistantId: therapySession.assistantId
        }
      })
    }

    // Update session notes with metrics history
    const metricsHistory = therapySession.notes ? 
      (typeof therapySession.notes === 'string' && therapySession.notes.startsWith('{') ? 
        JSON.parse(therapySession.notes).metricsHistory || [] : []) : []
    
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        notes: JSON.stringify({
          metricsHistory: [
            ...metricsHistory,
            {
              timestamp: new Date().toISOString(),
              communicationScore,
              emotionalScore,
              progressScore,
              metricsCount,
              periodStart,
              periodEnd,
            }
          ].slice(-10) // Keep last 10 metric updates
        })
      }
    })

    return NextResponse.json({
      success: true,
      sessionId: updatedSession.id,
      timestamp: new Date().toISOString(),
      scores: {
        communication: communicationScore,
        emotional: emotionalScore,
        progress: progressScore
      }
    })

  } catch (error) {
    console.error('Error persisting metrics:', error)
    return NextResponse.json(
      { error: 'Failed to persist metrics' },
      { status: 500 }
    )
  }
}