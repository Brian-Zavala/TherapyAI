import { getAuthSession } from '@/lib/auth'
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-optimized';

/**
 * POST /api/sessions/cleanup-stale
 * Force-completes all stale ACTIVE/PAUSED sessions for the current user.
 * Useful during development when sessions get stuck.
 */
export async function POST() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find and complete all active/paused sessions
    const result = await prisma.session.updateMany({
      where: {
        userId: session.user.id,
        status: { in: ['ACTIVE', 'PAUSED'] },
      },
      data: {
        status: 'COMPLETED',
        notes: 'Session force-completed via cleanup endpoint',
      },
    });

    // Also clean up TherapySession table
    const therapyResult = await prisma.therapySession.updateMany({
      where: {
        userId: session.user.id,
        status: { in: ['ACTIVE', 'PAUSED'] },
      },
      data: {
        status: 'COMPLETED',
      },
    });

    console.log(`Cleaned up ${result.count} Session(s) and ${therapyResult.count} TherapySession(s) for user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      cleaned: {
        sessions: result.count,
        therapySessions: therapyResult.count,
      },
    });
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    return NextResponse.json({ error: 'Failed to cleanup sessions' }, { status: 500 });
  }
}
