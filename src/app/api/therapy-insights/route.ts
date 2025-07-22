import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma-optimized'
import { generateTherapyInsights } from '@/lib/therapy-insights-generator'
import { 
  handleDashboardError, 
  validateDashboardAuth,
  withRetry 
} from '@/lib/api/dashboard-error-handler'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { userId } = await validateDashboardAuth(session)
    
    // Fetch user's recent therapy sessions with retry
    const recentSessions = await withRetry(
      () => prisma.session.findMany({
        where: {
          userId,
          status: 'COMPLETED',
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
    )
    
    // Fetch user profile for personalization with retry
    const userProfile = await withRetry(
      () => prisma.userProfile.findUnique({
        where: {
          userId,
        },
      })
    )
    
    // Generate insights based on sessions and profile
    const insights = await generateTherapyInsights({
      sessions: recentSessions,
      userProfile,
      userId,
    })
    
    return NextResponse.json(insights)
    
  } catch (error) {
    return handleDashboardError(error, {
      route: '/api/therapy-insights',
      userId: (await getServerSession(authOptions))?.user?.id,
      action: 'generateInsights',
    })
  }
}