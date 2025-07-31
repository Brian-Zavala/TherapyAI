import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-optimized';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Check for active sessions

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Find the most recent active session for this user
    const activeSession = await prisma.session.findFirst({
      where: {
        userId: userId,
        status: 'ACTIVE',
        // Additional safeguard: exclude any sessions that might be marked as completed elsewhere
        NOT: {
          notes: {
            contains: 'Session completed'
          }
        }
      },
      orderBy: {
        // Order by startTime if available, otherwise by date
        startTime: 'desc',
      },
      include: {
        transcriptEntries: {
          take: 1, // Just check if any exist
          orderBy: {
            timestamp: 'desc'
          }
        }
      }
    });

    if (!activeSession) {
      return NextResponse.json({ session: null });
    }

    // ADDITIONAL SAFEGUARD: Double-check session status in case of race conditions
    if (activeSession.status !== 'ACTIVE') {
      return NextResponse.json({ session: null });
    }

    // Found active session

    // Validate that the session hasn't exceeded its duration based on conversation time
    const sessionDurationMinutes = activeSession.duration;
    const conversationTimeSeconds = activeSession.conversationTimeSeconds || 0;
    const conversationTimeMinutes = Math.floor(conversationTimeSeconds / 60);
    const remainingMinutes = sessionDurationMinutes - conversationTimeMinutes;

    // Check session timing

    if (remainingMinutes <= 0) {
      return NextResponse.json({ session: null });
    }

    // Check if session was started more than 24 hours ago (safety check)
    const sessionDate = activeSession.startTime || activeSession.date;
    const hoursAgo = (Date.now() - new Date(sessionDate).getTime()) / (1000 * 60 * 60);
    
    if (hoursAgo > 24) {
      return NextResponse.json({ session: null });
    }

    // Return valid active session
    return NextResponse.json({ session: activeSession });
  } catch (error) {
    // Error fetching active session
    return NextResponse.json(
      { error: 'Failed to fetch active session' },
      { status: 500 }
    );
  }
}