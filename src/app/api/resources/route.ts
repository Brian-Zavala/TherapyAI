import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-optimized'
import { getMatchedResources } from '@/lib/resources/resource-matcher.service'
import { fetchBooksForCategory } from '@/lib/resources/open-library-client'
import { validateDashboardAuth } from '@/lib/api/dashboard-error-handler'
import { logger } from '@/lib/logger'

// GET /api/resources?category=communication&sessionType=COUPLE&priority=high
// Optional: &concerns=anxiety,trust  &topics=argument,feeling,listen
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    const { userId } = await validateDashboardAuth(session)

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'communication'
    const sessionType = (searchParams.get('sessionType') || 'SOLO') as 'SOLO' | 'COUPLE' | 'FAMILY'
    const priority = (searchParams.get('priority') || 'medium') as 'high' | 'medium' | 'low'
    const concerns = searchParams.get('concerns')?.split(',').filter(Boolean) || []
    const topics = searchParams.get('topics')?.split(',').filter(Boolean) || []

    // Enrich concerns from user profile if not provided
    let profileConcerns = concerns
    if (concerns.length === 0) {
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
        select: { currentConcerns: true },
      })
      if (profile?.currentConcerns) {
        const raw = profile.currentConcerns
        const rawStr = typeof raw === 'string' ? raw : Array.isArray(raw) ? (raw as string[]).join(',') : ''
        profileConcerns = rawStr.toLowerCase().split(/[,;]+/).map((s: string) => s.trim()).filter(Boolean)
      }
    }

    // Run matching + Open Library fetch in parallel
    const [matched, books] = await Promise.all([
      getMatchedResources({
        category,
        priority,
        sessionType,
        concerns: profileConcerns,
        topics,
        limit: 6,
      }),
      fetchBooksForCategory(category, 2),
    ])

    logger.info('Resources matched', {
      userId,
      category,
      sessionType,
      matchedCount: matched.length,
      bookCount: books.length,
    })

    return NextResponse.json({
      resources: matched,
      books: books.map(b => ({
        title: b.title,
        authors: b.authors,
        description: b.description,
        url: b.url,
        source: 'Open Library',
        type: 'book',
      })),
      meta: { category, sessionType, priority },
    })
  } catch (error) {
    logger.error('Resources fetch failed', { error })
    return NextResponse.json({ resources: [], books: [], meta: {} }, { status: 500 })
  }
}
