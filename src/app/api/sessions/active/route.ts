import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    console.log('🔍 Checking for active sessions for userId:', userId);

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
        status: 'active',
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
      console.log('📭 No active sessions found for userId:', userId);
      return NextResponse.json(null);
    }

    console.log('🎯 Found active session:', {
      id: activeSession.id,
      status: activeSession.status,
      duration: activeSession.duration,
      conversationTimeSeconds: activeSession.conversationTimeSeconds,
      startTime: activeSession.startTime,
      date: activeSession.date,
      theme: activeSession.theme,
      assistantId: activeSession.assistantId
    });

    // Validate that the session hasn't exceeded its duration based on conversation time
    const sessionDurationMinutes = activeSession.duration;
    const conversationTimeSeconds = activeSession.conversationTimeSeconds || 0;
    const conversationTimeMinutes = Math.floor(conversationTimeSeconds / 60);
    const remainingMinutes = sessionDurationMinutes - conversationTimeMinutes;

    console.log(`📊 Session timing: ${conversationTimeMinutes}/${sessionDurationMinutes} minutes used, ${remainingMinutes} remaining`);

    if (remainingMinutes <= 0) {
      console.log('⏰ Session has expired based on conversation time, not returning as active');
      return NextResponse.json(null);
    }

    // Check if session was started more than 24 hours ago (safety check)
    const sessionDate = activeSession.startTime || activeSession.date;
    const hoursAgo = (Date.now() - new Date(sessionDate).getTime()) / (1000 * 60 * 60);
    
    if (hoursAgo > 24) {
      console.log(`⏰ Session is ${Math.round(hoursAgo)} hours old, too old to recover`);
      return NextResponse.json(null);
    }

    console.log('✅ Valid active session found, returning for recovery');
    return NextResponse.json(activeSession);
  } catch (error) {
    console.error('❌ Error fetching active session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active session' },
      { status: 500 }
    );
  }
}