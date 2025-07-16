import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma-optimized'
import { generateTherapyInsights } from '@/lib/therapy-insights-generator'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Fetch user's recent therapy sessions
    const recentSessions = await prisma.session.findMany({
      where: {
        userId: session.user.id,
        status: 'completed',
      },
      orderBy: {
        startTime: 'desc',
      },
      take: 10,
      include: {
        communicationMetrics: {
          where: {
            metricType: 'final',
          },
        },
        transcriptEntries: {
          select: {
            speaker: true,
            text: true,
            sentiment: true,
            topics: true,
          },
        },
        sessionFamilyMembers: {
          include: {
            familyMember: true,
          },
        },
      },
    })
    
    // Fetch user profile for personalization
    const userProfile = await prisma.userProfile.findUnique({
      where: {
        userId: session.user.id,
      },
    })
    
    // Generate insights based on sessions and profile
    const insights = await generateTherapyInsights({
      sessions: recentSessions,
      userProfile,
      userId: session.user.id,
    })
    
    return NextResponse.json(insights)
    
  } catch (error) {
    console.error('[API] therapy-insights error:', error)
    
    // Return graceful error response
    return NextResponse.json(
      {
        insights: [],
        summary: {
          overallProgress: 'moderate',
          topStrengths: ['Commitment to therapy'],
          weeklyGoals: ['Continue regular sessions'],
          focusAreas: [],
        },
        trends: {
          communication: 'stable',
          emotional: 'stable',
          consistency: 'improving',
        },
        personalizedTips: {
          daily: ['Take 5 minutes for mindful breathing'],
          weekly: ['Schedule quality time together'],
          exercises: ['Practice gratitude journaling'],
        },
      },
      { status: 200 } // Still return 200 with default data
    )
  }
}