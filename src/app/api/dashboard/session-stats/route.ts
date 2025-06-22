import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withRetry } from '@/lib/prisma-enhanced'
import { subDays, startOfWeek } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const userId = searchParams.get('userId') || session.user.id

    // Check authorization
    if (userId !== session.user.id && (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get comprehensive session statistics using database view
    const [sessionStats] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        user_id,
        total_sessions,
        total_duration,
        avg_duration,
        last_session_date,
        active_sessions,
        sessions_last_week
      FROM user_session_stats 
      WHERE user_id = $1
    `, userId)

    if (!sessionStats) {
      // Return default values if no sessions yet
      return NextResponse.json({
        totalSessions: 0,
        totalDuration: 0,
        avgDuration: 0,
        lastSessionDate: null,
        sessionsLastWeek: 0,
        activeStreak: 0,
        completionRate: 0,
        preferredTime: null,
        preferredDays: [],
      })
    }

    // Calculate active streak
    const streakData = await calculateActiveStreak(userId)
    
    // Calculate session completion rate
    const completionRate = await calculateCompletionRate(userId)
    
    // Get preferred session times
    const preferences = await getSessionPreferences(userId)
    
    // Get session distribution by theme
    const themeDistribution = await getThemeDistribution(userId)
    
    // Get family member participation stats
    const familyStats = await getFamilyParticipationStats(userId)

    return NextResponse.json({
      totalSessions: parseInt(sessionStats.total_sessions || '0'),
      totalDuration: parseInt(sessionStats.total_duration || '0'),
      avgDuration: Math.round(parseFloat(sessionStats.avg_duration || '0')),
      lastSessionDate: sessionStats.last_session_date,
      sessionsLastWeek: parseInt(sessionStats.sessions_last_week || '0'),
      activeStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      completionRate,
      preferredTime: preferences.preferredTime,
      preferredDays: preferences.preferredDays,
      themeDistribution,
      familyParticipation: familyStats,
      activeSessions: parseInt(sessionStats.active_sessions || '0'),
    })
  } catch (error) {
    console.error('Error fetching session stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session statistics' },
      { status: 500 }
    )
  }
}

// Calculate active streak (consecutive days with sessions)
async function calculateActiveStreak(userId: string) {
  const sessions = await withRetry(async () => {
    return await prisma.session.findMany({
      where: {
        userId,
        status: 'completed',
      },
      orderBy: { date: 'desc' },
      select: { date: true },
      take: 365, // Last year of sessions
    })
  })

  if (sessions.length === 0) {
    return { currentStreak: 0, longestStreak: 0 }
  }

  // Convert to unique dates
  const uniqueDates = Array.from(
    new Set(sessions.map((s: any) => s.date.toISOString().split('T')[0]))
  ).sort().reverse()

  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 1
  
  // Check if there's a session today or yesterday for current streak
  const today = new Date().toISOString().split('T')[0]
  const yesterday = subDays(new Date(), 1).toISOString().split('T')[0]
  
  if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
    currentStreak = 1
    
    // Count consecutive days
    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1] as string)
      const currDate = new Date(uniqueDates[i] as string)
      const dayDiff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (dayDiff === 1) {
        currentStreak++
        tempStreak++
      } else {
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 1
      }
    }
  }
  
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak)
  
  return { currentStreak, longestStreak }
}

// Calculate session completion rate
async function calculateCompletionRate(userId: string) {
  const [completed, total] = await Promise.all([
    prisma.session.count({
      where: {
        userId,
        status: 'completed',
      },
    }),
    prisma.session.count({
      where: {
        userId,
        status: { in: ['completed', 'cancelled', 'no-show'] },
      },
    }),
  ])

  if (total === 0) return 100
  return Math.round((completed / total) * 100)
}

// Get preferred session times and days
async function getSessionPreferences(userId: string) {
  const completedSessions = await prisma.session.findMany({
    where: {
      userId,
      status: 'completed',
    },
    select: {
      date: true,
      startTime: true,
    },
    take: 50, // Last 50 sessions
  })

  if (completedSessions.length === 0) {
    return { preferredTime: null, preferredDays: [] }
  }

  // Count sessions by hour
  const hourCounts: Record<number, number> = {}
  const dayCounts: Record<number, number> = {}

  completedSessions.forEach((session: any) => {
    const date = session.startTime || session.date
    const hour = date.getHours()
    const day = date.getDay()
    
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
    dayCounts[day] = (dayCounts[day] || 0) + 1
  })

  // Find most common hour
  const preferredHour = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0]

  // Find most common days
  const sortedDays = Object.entries(dayCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([day]) => getDayName(parseInt(day)))

  return {
    preferredTime: preferredHour ? `${preferredHour}:00` : null,
    preferredDays: sortedDays,
  }
}

// Get session distribution by theme
async function getThemeDistribution(userId: string) {
  const themes = await (prisma.session as any).groupBy({
    by: ['theme'],
    where: {
      userId,
      status: 'completed',
      theme: { not: null },
    },
    _count: {
      theme: true,
    },
    orderBy: {
      _count: {
        theme: 'desc',
      },
    },
    take: 5,
  })

  return themes.map((t: any) => ({
    theme: t.theme || 'General',
    count: t._count.theme,
  }))
}

// Get family member participation statistics
async function getFamilyParticipationStats(userId: string) {
  // Get all family members
  const familyMembers = await prisma.familyMember.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      relationship: true,
    },
  })

  if (familyMembers.length === 0) {
    return null
  }

  // In a real implementation, you would track which family members
  // participated in each session. For now, return basic structure
  return {
    totalMembers: familyMembers.length,
    members: familyMembers.map((member: any) => ({
      id: member.id,
      name: member.name,
      relation: member.relationship,
      sessionsAttended: 0, // Would be calculated from session participation data
      lastSession: null,
    })),
  }
}

function getDayName(dayIndex: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayIndex] || ''
}