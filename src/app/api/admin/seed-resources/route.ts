import { getAuthSession } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { seedResources } from '@/lib/resources/seed-resources'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic';

// POST /api/admin/seed-resources
// Seeds the Resource table with curated content. Safe to call multiple times (wipes + re-seeds).
export async function POST() {
  try {
    const session = await getAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const count = await seedResources()
    logger.info('Resources seeded', { count, seededBy: session.user.id })

    return NextResponse.json({ success: true, count })
  } catch (error) {
    logger.error('Resource seed failed', { error })
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}
