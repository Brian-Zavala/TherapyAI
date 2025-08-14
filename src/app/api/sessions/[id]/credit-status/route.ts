import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma-optimized';
import { redis } from '@/lib/cache/redis-client';
import { creditManager } from '@/lib/services/credit-manager.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get session details
    const therapySession = await prisma.therapySession.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        userId: true,
        status: true,
        conversationTimeSeconds: true,
        totalPausedTimeSeconds: true,
        creditsReserved: true,
        creditsUsed: true,
        maxDuration: true,
        isPaused: true,
        lastConversationStart: true,
        createdAt: true,
      },
    });
    
    if (!therapySession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Verify user owns this session
    if (therapySession.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Calculate current credits used
    let currentConversationTime = therapySession.conversationTimeSeconds || 0;
    
    // If session is active and not paused, add time since last conversation start
    if (therapySession.status === 'ACTIVE' && 
        !therapySession.isPaused && 
        therapySession.lastConversationStart) {
      const activeTime = Math.floor(
        (Date.now() - new Date(therapySession.lastConversationStart).getTime()) / 1000
      );
      currentConversationTime += activeTime;
    }
    
    const creditsUsed = Math.ceil(currentConversationTime / 60);
    const creditsReserved = therapySession.creditsReserved || therapySession.maxDuration || 0;
    const creditsRemaining = Math.max(0, creditsReserved - creditsUsed);
    
    // Calculate percentage used
    const percentageUsed = creditsReserved > 0 
      ? Math.round((creditsUsed / creditsReserved) * 100)
      : 0;
    
    // Generate warnings based on usage
    const warnings = [];
    
    if (percentageUsed >= 95) {
      warnings.push({
        level: 'critical',
        message: 'Session ending very soon!',
        minutesRemaining: creditsRemaining,
      });
    } else if (percentageUsed >= 90) {
      warnings.push({
        level: 'critical',
        message: `Less than ${creditsRemaining} minutes remaining`,
        minutesRemaining: creditsRemaining,
      });
    } else if (percentageUsed >= 80) {
      warnings.push({
        level: 'warning',
        message: 'Approaching session time limit',
        minutesRemaining: creditsRemaining,
      });
    }
    
    // Check if user can extend session
    const userCredits = await creditManager.checkCredits(therapySession.userId);
    const canExtend = userCredits.hasCredits && 
                     userCredits.availableMinutes > creditsUsed &&
                     therapySession.status === 'ACTIVE';
    
    // Get real-time consumption from Redis (if available)
    const realtimeKey = `credits:consumption:${therapySession.userId}`;
    const realtimeData = await redis.get(realtimeKey);
    
    return NextResponse.json({
      sessionId: therapySession.id,
      status: therapySession.status,
      credits: {
        reserved: creditsReserved,
        used: creditsUsed,
        remaining: creditsRemaining,
        percentageUsed,
      },
      time: {
        conversationSeconds: currentConversationTime,
        conversationMinutes: Math.floor(currentConversationTime / 60),
        pausedSeconds: therapySession.totalPausedTimeSeconds || 0,
      },
      warnings,
      canExtend,
      extensionOptions: canExtend ? {
        availableMinutes: Math.min(
          userCredits.availableMinutes - creditsUsed,
          userCredits.maxSessionDuration - creditsUsed
        ),
        maxExtension: userCredits.maxSessionDuration - creditsUsed,
      } : null,
      realtime: realtimeData ? JSON.parse(realtimeData) : null,
    });
  } catch (error) {
    console.error('[Credit Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get credit status' },
      { status: 500 }
    );
  }
}

// POST endpoint to extend session credits
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { additionalMinutes } = await request.json();
    
    if (!additionalMinutes || additionalMinutes < 5 || additionalMinutes > 60) {
      return NextResponse.json(
        { error: 'Invalid extension duration (5-60 minutes)' },
        { status: 400 }
      );
    }
    
    // Get session
    const therapySession = await prisma.therapySession.findUnique({
      where: { id: params.id },
    });
    
    if (!therapySession || therapySession.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    if (therapySession.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Can only extend active sessions' },
        { status: 400 }
      );
    }
    
    // Check if user has credits for extension
    const creditCheck = await creditManager.checkCredits(
      session.user.id,
      additionalMinutes
    );
    
    if (!creditCheck.hasCredits || creditCheck.availableMinutes < additionalMinutes) {
      return NextResponse.json(
        {
          error: 'Insufficient credits for extension',
          availableMinutes: creditCheck.availableMinutes,
          requiredMinutes: additionalMinutes,
        },
        { status: 402 }
      );
    }
    
    // Reserve additional credits
    const tempReservationId = `${params.id}_extension_${Date.now()}`;
    const reserved = await creditManager.reserveCredits(
      session.user.id,
      tempReservationId,
      additionalMinutes
    );
    
    if (!reserved) {
      return NextResponse.json(
        { error: 'Unable to reserve additional credits' },
        { status: 500 }
      );
    }
    
    // Update session with new credits
    const newCreditsReserved = (therapySession.creditsReserved || 0) + additionalMinutes;
    const newMaxDuration = (therapySession.maxDuration || 0) + additionalMinutes;
    
    await prisma.therapySession.update({
      where: { id: params.id },
      data: {
        creditsReserved: newCreditsReserved,
        maxDuration: newMaxDuration,
      },
    });
    
    // Update Redis config if exists
    const configKey = `session:config:${params.id}`;
    const config = await redis.get(configKey);
    
    if (config) {
      const sessionConfig = JSON.parse(config);
      sessionConfig.maxMinutes = newMaxDuration;
      await redis.set(configKey, JSON.stringify(sessionConfig), 'EX', 7200);
    }
    
    return NextResponse.json({
      success: true,
      extended: true,
      additionalMinutes,
      newTotalMinutes: newMaxDuration,
      newCreditsReserved,
    });
  } catch (error) {
    console.error('[Extend Session] Error:', error);
    return NextResponse.json(
      { error: 'Failed to extend session' },
      { status: 500 }
    );
  }
}