import { getAuthSession } from '@/lib/auth'
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-optimized';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Find the most recent active, paused, or recently-scheduled session for this user
    const activeSession = await prisma.session.findFirst({
      where: {
        userId: userId,
        OR: [
          { status: { in: ['ACTIVE', 'PAUSED'] } },
          // Include SCHEDULED sessions created within the last 30 min (VAPI not yet started)
          {
            status: 'SCHEDULED',
            createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
          },
        ],
        NOT: {
          notes: {
            contains: 'Session completed'
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        transcriptEntries: {
          take: 1,
          orderBy: {
            timestamp: 'desc'
          }
        }
      }
    });

    if (!activeSession || !['ACTIVE', 'PAUSED', 'SCHEDULED'].includes(activeSession.status)) {
      return NextResponse.json(null);
    }

    // Validate that the session hasn't exceeded its duration based on conversation time
    // SCHEDULED sessions haven't started yet so conversationTimeSeconds is always 0
    const sessionDurationMinutes = activeSession.duration || 15;
    const conversationTimeSeconds = activeSession.conversationTimeSeconds || 0;
    const conversationTimeMinutes = Math.floor(conversationTimeSeconds / 60);
    const remainingMinutes = sessionDurationMinutes - conversationTimeMinutes;

    // For SCHEDULED sessions, they haven't started so remaining = full duration
    if (remainingMinutes <= 0 && activeSession.status !== 'SCHEDULED') {
      return NextResponse.json(null);
    }

    // Check if session was started more than 24 hours ago (safety check)
    const sessionDate = activeSession.startTime || activeSession.date;
    const hoursAgo = (Date.now() - new Date(sessionDate).getTime()) / (1000 * 60 * 60);

    if (hoursAgo > 24) {
      // Auto-complete stale sessions
      await prisma.session.update({
        where: { id: activeSession.id },
        data: { status: 'COMPLETED', notes: 'Session auto-completed (stale - over 24 hours)' },
      });
      return NextResponse.json(null);
    }

    return NextResponse.json(activeSession);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch active session' },
      { status: 500 }
    );
  }
}
