import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma-optimized';
import { SessionLifecycleManager } from '@/lib/session/session-lifecycle-manager';
import { Resend } from 'resend';
import SessionCompletedEmail from '@/emails/SessionCompleted';
import { rateLimitManager } from '@/lib/rate-limit-manager';
import { logger } from '@/lib/logger';

const resend = new Resend(process.env.RESEND_API_KEY);
const lifecycleManager = SessionLifecycleManager.getInstance();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { id: sessionId } = await params;
  
  // Rate limiting check
  const clientId = session.user?.id || 'anonymous';
  const userType = (session.user as any)?.type || 'standard';
  
  const rateLimitResult = await rateLimitManager.checkLimits(
    clientId,
    'session-creation',
    { 
      endpoint: '/api/sessions/complete',
      userType 
    }
  );
  
  if (!rateLimitResult.allowed) {
    const response = NextResponse.json(
      { 
        error: "Too many session completion requests. Please try again later.",
        retryAfter: rateLimitResult.nextRetryAfter 
      },
      { status: 429 }
    );
    
    if (rateLimitResult.nextRetryAfter) {
      response.headers.set('Retry-After', rateLimitResult.nextRetryAfter.toString());
    }
    
    return response;
  }
  
  try {
    // Parse request body for billing data
    const body = await request.json().catch(() => ({}));
    const {
      totalPausedMinutes,
      billableMinutes,
      completionNotes
    } = body;

    // Check if session is already being completed
    const currentState = await lifecycleManager.getSessionState(sessionId);
    
    if (currentState !== 'active') {
      logger.warn('Session completion attempted on non-active session', {
        sessionId,
        currentState
      });
      
      if (currentState === 'completed') {
        return NextResponse.json({ 
          success: true,
          message: 'Session already completed'
        });
      }
      
      return NextResponse.json({ 
        error: 'Session cannot be completed in current state',
        currentState
      }, { status: 400 });
    }
    
    // Get session details
    const therapySession = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    
    if (!therapySession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Check permission (user or admin)
    if (therapySession.userId !== session.user.id && (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Calculate final billing data if not provided
    let finalBillableMinutes = billableMinutes;
    let finalConversationTimeSeconds = therapySession.conversationTimeSeconds || 0;
    
    // If we're currently in an active conversation, add the current segment
    if (therapySession.lastConversationStart && !therapySession.isPaused) {
      const currentSegmentSeconds = Math.floor(
        (Date.now() - new Date(therapySession.lastConversationStart).getTime()) / 1000
      );
      finalConversationTimeSeconds += currentSegmentSeconds;
    }
    
    // Calculate billable minutes from conversation time if not provided
    if (!finalBillableMinutes && finalConversationTimeSeconds > 0) {
      finalBillableMinutes = Math.ceil(finalConversationTimeSeconds / 60);
    }

    logger.info('Starting session completion process', {
      sessionId,
      userId: therapySession.userId,
      conversationTimeSeconds: finalConversationTimeSeconds,
      billableMinutes: finalBillableMinutes
    });

    // Use lifecycle manager to complete session
    await lifecycleManager.completeSession(sessionId, therapySession.userId);

    // Update session with billing data
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        conversationTimeSeconds: finalConversationTimeSeconds,
        notes: completionNotes || `Session completed. Billable time: ${finalBillableMinutes} minutes (${finalConversationTimeSeconds} seconds of conversation). Total paused: ${totalPausedMinutes || 0} minutes.`
      }
    });

    // Flush any pending transcript batches
    try {
      const { flushSessionTranscripts, cleanupSessionMetrics } = await import('@/lib/transcript-service-optimized');
      await flushSessionTranscripts(sessionId);
      cleanupSessionMetrics(sessionId);
      
      // Clean up Supabase broadcast channels
      const { cleanupBroadcastChannels } = await import('@/lib/metrics-broadcaster');
      await cleanupBroadcastChannels(sessionId);
    } catch (flushError) {
      logger.error('Error during cleanup operations', {
        sessionId,
        error: flushError
      });
    }

    // Send completion email
    try {
      const durationInSeconds = finalConversationTimeSeconds || (therapySession.duration ? therapySession.duration * 60 : 1800);
      
      // Find the next scheduled session for this user
      const nextSession = await prisma.session.findFirst({
        where: {
          userId: therapySession.userId,
          status: 'SCHEDULED',
          date: {
            gt: new Date()
          }
        },
        orderBy: {
          date: 'asc'
        }
      });
      
      await resend.emails.send({
        from: `Therapy Support <${process.env.EMAIL_FROM}>`,
        to: therapySession.user.email,
        subject: 'Therapy Session Completed',
        react: SessionCompletedEmail({
          userName: therapySession.user.name || 'Valued Client',
          sessionDate: therapySession.date.toLocaleDateString(),
          sessionTime: therapySession.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          therapistName: 'Dr. Maya Thompson',
          sessionDuration: durationInSeconds,
          sessionNotes: therapySession.notes || undefined,
          nextSessionDate: nextSession ? nextSession.date.toLocaleDateString() : undefined,
          nextSessionTime: nextSession ? nextSession.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        }) as any,
      });
    } catch (emailError) {
      logger.error('Error sending session completion email', {
        sessionId,
        error: emailError
      });
    }
    
    logger.info('Session completed successfully', {
      sessionId,
      userId: therapySession.userId,
      billableMinutes: finalBillableMinutes
    });

    return NextResponse.json({ 
      success: true,
      billing: {
        conversationTimeSeconds: finalConversationTimeSeconds,
        billableMinutes: finalBillableMinutes,
        totalPausedMinutes: totalPausedMinutes || Math.floor((therapySession.totalPausedTimeSeconds || 0) / 60),
        scheduledDurationMinutes: therapySession.duration
      }
    });
  } catch (error) {
    logger.error('Error completing session', {
      sessionId,
      error
    });
    return NextResponse.json({ error: 'Failed to complete session' }, { status: 500 });
  }
}