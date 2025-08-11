import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma-client';
import { creditManager } from '@/lib/services/credit-manager.service';
import { vapiSessionManager } from '@/lib/services/vapi-session-manager';
import { redis } from '@/lib/cache/redis-client';
import { SessionStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { therapyType, requestedDuration } = await request.json();
    
    if (!therapyType) {
      return NextResponse.json(
        { error: 'Therapy type is required' },
        { status: 400 }
      );
    }
    
    // Check for existing active session
    const existingSession = await prisma.therapySession.findFirst({
      where: {
        userId: session.user.id,
        status: {
          in: [SessionStatus.ACTIVE, SessionStatus.SCHEDULED, SessionStatus.PAUSED],
        },
        createdAt: {
          gte: new Date(Date.now() - 2 * 60 * 60 * 1000), // Last 2 hours
        },
      },
    });
    
    if (existingSession) {
      return NextResponse.json(
        { 
          error: 'You already have an active session',
          existingSessionId: existingSession.id,
          status: existingSession.status,
        },
        { status: 409 } // Conflict
      );
    }
    
    // Use VAPI session manager which includes credit checks
    const result = await vapiSessionManager.startSession(
      session.user.id,
      therapyType,
      requestedDuration
    );
    
    if (!result.canStart) {
      // Return payment required status with details
      return NextResponse.json(
        {
          error: result.error,
          canStart: false,
          creditsAvailable: result.creditsAvailable,
          waitTime: result.waitTime,
        },
        { status: 402 } // Payment Required
      );
    }
    
    // Store session config for client
    const clientConfig = {
      sessionId: result.sessionConfig!.sessionId,
      maxDuration: result.sessionConfig!.maxDurationSeconds / 60,
      creditsReserved: result.sessionConfig!.maxDurationSeconds / 60,
      creditsAvailable: result.creditsAvailable,
      therapyType,
      userId: session.user.id,
    };
    
    // Store in Redis for quick access
    await redis.set(
      `session:client:${result.sessionConfig!.sessionId}`,
      JSON.stringify(clientConfig),
      'EX',
      7200 // 2 hours
    );
    
    return NextResponse.json({
      success: true,
      sessionId: result.sessionConfig!.sessionId,
      creditsReserved: result.sessionConfig!.maxDurationSeconds / 60,
      maxDuration: result.sessionConfig!.maxDurationSeconds / 60,
      creditsAvailable: result.creditsAvailable,
      vapiConfig: {
        // Return sanitized VAPI config for client
        maxDurationSeconds: result.sessionConfig!.maxDurationSeconds,
        therapyType,
      },
    });
  } catch (error) {
    console.error('[Create Session with Credits] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

// GET endpoint to check if user can start a session
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const therapyType = searchParams.get('therapyType') || 'individual';
    const requestedDuration = searchParams.get('duration');
    
    // Check credits
    const creditCheck = await creditManager.checkCredits(
      session.user.id,
      requestedDuration ? parseInt(requestedDuration) : undefined
    );
    
    // Check for active sessions
    const activeSessions = await prisma.therapySession.count({
      where: {
        userId: session.user.id,
        status: {
          in: [SessionStatus.ACTIVE, SessionStatus.SCHEDULED, SessionStatus.PAUSED],
        },
        createdAt: {
          gte: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      },
    });
    
    // Determine default duration based on therapy type and plan
    const defaultDurations: Record<string, number> = {
      individual: Math.min(20, creditCheck.maxSessionDuration),
      couples: Math.min(25, creditCheck.maxSessionDuration),
      family: Math.min(30, creditCheck.maxSessionDuration),
    };
    
    const suggestedDuration = Math.min(
      requestedDuration ? parseInt(requestedDuration) : defaultDurations[therapyType] || 15,
      creditCheck.availableMinutes,
      creditCheck.maxSessionDuration
    );
    
    return NextResponse.json({
      canStart: creditCheck.hasCredits && activeSessions === 0,
      credits: {
        available: creditCheck.availableMinutes,
        isUnlimited: creditCheck.isUnlimited,
        planType: creditCheck.planType,
        maxSessionDuration: creditCheck.maxSessionDuration,
      },
      suggestedDuration,
      hasActiveSession: activeSessions > 0,
      minimumDuration: 5, // Minimum session length
    });
  } catch (error) {
    console.error('[Check Session Availability] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check session availability' },
      { status: 500 }
    );
  }
}