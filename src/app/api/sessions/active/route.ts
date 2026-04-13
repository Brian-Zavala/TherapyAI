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
    let conversationTimeSeconds = activeSession.conversationTimeSeconds || 0;

    // If lastConversationStart is set, the conversation was active when it disconnected
    // (e.g. page refresh). Add the unsaved active segment time so recovery gets accurate data.
    if (activeSession.lastConversationStart && !activeSession.isPaused) {
      const lastStart = new Date(activeSession.lastConversationStart).getTime();
      const unsavedSeconds = Math.max(0, Math.floor((Date.now() - lastStart) / 1000));
      // Cap at 5 minutes to avoid stale lastConversationStart inflating the time
      const cappedUnsaved = Math.min(unsavedSeconds, 300);
      if (cappedUnsaved > 0) {
        console.log(`⏱️ Adding ${cappedUnsaved}s unsaved active time (lastConversationStart was ${unsavedSeconds}s ago)`);
        conversationTimeSeconds += cappedUnsaved;
      }
    }

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

    // Return session with corrected conversationTimeSeconds (includes unsaved active segment)
    return NextResponse.json({
      ...activeSession,
      conversationTimeSeconds,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch active session' },
      { status: 500 }
    );
  }
}
