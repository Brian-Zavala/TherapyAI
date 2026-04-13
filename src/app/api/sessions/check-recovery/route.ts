import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-optimized';
import { redis } from '@/lib/cache/redis-client';
import { SessionStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({
        hasActiveSession: false,
        error: 'UNAUTHORIZED',
        message: 'Please sign in to check for active sessions',
        requestId,
        timestamp: new Date().toISOString(),
      }, { status: 401 });
    }

    // Check for active Session records (primary model)
    const activeSession = await prisma.session.findFirst({
      where: {
        userId: session.user.id,
        status: {
          in: [SessionStatus.ACTIVE, SessionStatus.PAUSED]
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        status: true,
        duration: true,
        createdAt: true,
        date: true,
        notes: true,
        userId: true,
        updatedAt: true,
        sessionType: true,
        vapiCallId: true,
        conversationTimeSeconds: true,
      }
    });

    if (!activeSession) {
      return NextResponse.json({
        hasActiveSession: false,
        sessionId: null,
        canRecover: false,
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    // Check if session is actually recoverable
    let canRecover = true;
    let creditsRemaining = 0;

    // Validate session hasn't expired (24h max)
    const sessionAgeHours = (Date.now() - new Date(activeSession.createdAt).getTime()) / (1000 * 60 * 60);
    if (sessionAgeHours > 24) {
      canRecover = false;
    }

    // Check credit status for recovery
    if (canRecover) {
      try {
        const reservationKey = `credits:reserved:${activeSession.id}`;
        const reservation = await redis.get(reservationKey);

        if (reservation) {
          const reservationData = typeof reservation === 'string' ? JSON.parse(reservation) : reservation;
          creditsRemaining = reservationData.creditsReserved || 0;

          if (creditsRemaining <= 0) {
            canRecover = false;
          }
        } else {
          // No reservation found - use session duration minus consumed time
          const consumedMinutes = Math.ceil((activeSession.conversationTimeSeconds || 0) / 60);
          creditsRemaining = Math.max(0, (activeSession.duration || 0) - consumedMinutes);

          if (creditsRemaining <= 0) {
            canRecover = false;
          }
        }
      } catch (error) {
        console.error(`[${requestId}] Error checking credit status for recovery:`, error);
        creditsRemaining = 0;
      }
    }

    return NextResponse.json({
      hasActiveSession: true,
      sessionId: activeSession.id,
      canRecover,
      creditsRemaining: Math.max(0, creditsRemaining),
      sessionInfo: {
        status: activeSession.status,
        duration: activeSession.duration,
        createdAt: activeSession.createdAt,
        sessionDate: activeSession.date,
        sessionType: activeSession.sessionType,
        vapiCallId: activeSession.vapiCallId,
      },
      requestId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error(`[${requestId}] Session recovery check error:`, error);

    return NextResponse.json({
      hasActiveSession: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to check for active sessions',
      requestId,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// POST endpoint for marking recovery completion
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'UNAUTHORIZED',
        requestId,
      }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, recovered } = body;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'SESSION_ID_REQUIRED',
        requestId,
      }, { status: 400 });
    }

    // Update recovery status on Session model
    await prisma.session.update({
      where: {
        id: sessionId,
        userId: session.user.id,
      },
      data: {
        notes: JSON.stringify({
          recoveryCompleted: recovered,
          recoveryCompletedAt: new Date().toISOString()
        }),
        updatedAt: new Date(),
      }
    });

    return NextResponse.json({
      success: true,
      requestId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error(`[${requestId}] Recovery completion error:`, error);

    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      requestId,
    }, { status: 500 });
  }
}
