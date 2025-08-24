import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database/prisma-optimized';
import { redis } from '@/lib/cache/redis-client';
import { SessionStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({
        hasActiveSession: false,
        error: 'UNAUTHORIZED',
        message: 'Please sign in to check for active sessions',
        requestId,
        timestamp: new Date().toISOString(),
      }, { status: 401 });
    }

    // Check for active TherapySession records (credit system)
    const activeSession = await prisma.therapySession.findFirst({
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
        sessionDate: true,
        notes: true,
        userId: true,
        updatedAt: true
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

    // Validate session hasn't expired
    const sessionAgeHours = (Date.now() - new Date(activeSession.createdAt).getTime()) / (1000 * 60 * 60);
    if (sessionAgeHours > 24) {
      canRecover = false;
    }

    // Check credit status for recovery
    if (canRecover) {
      try {
        // Get credit reservation for this session
        const reservationKey = `credits:reserved:${activeSession.id}`;
        const reservation = await redis.get(reservationKey);
        
        if (reservation) {
          const reservationData = JSON.parse(reservation);
          creditsRemaining = reservationData.creditsReserved || 0;
          
          // If no credits remaining, can't recover
          if (creditsRemaining <= 0) {
            canRecover = false;
          }
        } else {
          // No reservation found - use session duration
          creditsRemaining = activeSession.duration || 0;
          
          if (creditsRemaining <= 0) {
            canRecover = false;
          }
        }
      } catch (error) {
        console.error(`[${requestId}] Error checking credit status for recovery:`, error);
        // Default to allowing recovery but with 0 credits
        creditsRemaining = 0;
      }
    }

    // Update session metrics for recovery
    if (canRecover) {
      try {
        // Touch the session to update last access time
        await prisma.therapySession.update({
          where: { id: activeSession.id },
          data: {
            updatedAt: new Date()
          }
        });
      } catch (error) {
        console.error(`[${requestId}] Error updating recovery metadata:`, error);
        // Don't fail recovery for metadata update errors
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
        sessionDate: activeSession.sessionDate
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
    const session = await getServerSession(authOptions);
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

    // Update recovery status
    await prisma.therapySession.update({
      where: {
        id: sessionId,
        userId: session.user.id // Security: ensure ownership
      },
      data: {
        metadata: {
          ...(await prisma.therapySession.findUnique({
            where: { id: sessionId },
            select: { metadata: true }
          }))?.metadata as any || {},
          recoveryCompleted: recovered,
          recoveryCompletedAt: new Date().toISOString()
        }
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