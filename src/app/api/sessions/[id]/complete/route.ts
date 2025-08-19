import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma-optimized';
import { SessionLifecycleManager } from '@/lib/session/session-lifecycle-manager';
import { onSessionCompleted } from '@/lib/ai-insights/session-completion-handler';
import { Resend } from 'resend';
import SessionCompletedEmail from '@/emails/SessionCompleted';
import { rateLimitManager } from '@/lib/rate-limit-manager';
import { logger } from '@/lib/logger';
import { trackNotificationInteraction } from '@/lib/notification-tokens';
import { sendSMS } from '@/lib/sms-service';

const resend = new Resend(process.env.RESEND_API_KEY);
const lifecycleManager = SessionLifecycleManager.getInstance();

// In-memory lock for session completion to prevent race conditions
// This is necessary because multiple hooks (useSessionManagementV2 and useSupabaseSessionState)
// may call this endpoint simultaneously. Both need to make the call to work independently,
// but we only want the completion logic to run once.
const sessionCompletionLocks = new Map<string, Promise<any>>();

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
  
  // Check if completion is already in progress for this session
  const existingLock = sessionCompletionLocks.get(sessionId);
  if (existingLock) {
    logger.info('Session completion already in progress, waiting for result', { sessionId });
    try {
      const result = await existingLock;
      return NextResponse.json(result);
    } catch (error) {
      // If the previous attempt failed, we'll try again
      logger.warn('Previous completion attempt failed, retrying', { sessionId });
    }
  }
  
  // Create a new completion promise and store it
  const completionPromise = (async () => {
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
    
    if (currentState !== 'ACTIVE') {
      logger.warn('Session completion attempted on non-active session', {
        sessionId,
        currentState
      });
      
      if (currentState === 'COMPLETED') {
        return NextResponse.json({ 
          success: true,
          message: 'Session already completed'
        });
      }
      
      if (currentState === 'ENDING' || currentState === 'COMPLETING' || currentState === 'CALCULATING_METRICS') {
        // Session is already being processed, wait for completion
        logger.info('Session completion already in progress, waiting...', { sessionId, currentState });
        
        // Wait up to 10 seconds for completion
        const maxWaitTime = 10000;
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, 500));
          const newState = await lifecycleManager.getSessionState(sessionId);
          
          if (newState === 'COMPLETED') {
            return NextResponse.json({ 
              success: true,
              message: 'Session completed successfully'
            });
          }
          
          if (newState === 'FAILED') {
            return NextResponse.json({ 
              error: 'Session completion failed',
              currentState: newState
            }, { status: 500 });
          }
        }
        
        return NextResponse.json({ 
          error: 'Session completion timeout',
          currentState
        }, { status: 408 });
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

    // Use lifecycle manager to complete session (includes unified credit deduction)
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

    // Track completion if session was started via notification
    if (therapySession.notificationToken) {
      try {
        await trackNotificationInteraction(therapySession.notificationToken, 'completed');
      } catch (trackError) {
        logger.error('Error tracking notification completion', {
          sessionId,
          error: trackError
        });
      }
    }

    // Send completion notifications
    try {
      const durationInMinutes = Math.round((finalConversationTimeSeconds || (therapySession.duration ? therapySession.duration * 60 : 1800)) / 60);
      
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
      
      // Get user's profile for phone number
      const userProfile = await prisma.userProfile.findUnique({
        where: { userId: therapySession.userId },
        select: { phone: true, smsConsent: true }
      });
      
      // Send completion email
      await resend.emails.send({
        from: `Therapy Platform <${process.env.EMAIL_FROM}>`,
        to: therapySession.user.email,
        subject: 'Session Completed - Great Progress!',
        react: SessionCompletedEmail({
          username: therapySession.user.name || 'Valued Client',
          sessionDate: therapySession.date,
          duration: durationInMinutes,
          sessionNotes: therapySession.notes || undefined,
          nextSessionDate: nextSession?.date,
          baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        }) as any,
      });
      
      // Send SMS notification if consent given
      if (userProfile?.phone && userProfile.smsConsent) {
        const nextSessionText = nextSession 
          ? `Next: ${nextSession.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          : 'Schedule your next session';
          
        await sendSMS({
          to: userProfile.phone,
          body: `Session complete! ${durationInMinutes}min of growth achieved. ${nextSessionText}. STOP to unsub`,
          priority: 'normal',
          validateOnly: false,
          notificationId: `session-completed-${sessionId}`,
          userId: therapySession.userId,
        });
      }
    } catch (notificationError) {
      logger.error('Error sending session completion notifications', {
        sessionId,
        error: notificationError
      });
    }
    
    logger.info('Session completed successfully', {
      sessionId,
      userId: therapySession.userId,
      billableMinutes: finalBillableMinutes
    });

    // Trigger AI insights regeneration and pattern analysis
    await onSessionCompleted(sessionId);

    return { 
      success: true,
      billing: {
        conversationTimeSeconds: finalConversationTimeSeconds,
        billableMinutes: finalBillableMinutes,
        totalPausedMinutes: totalPausedMinutes || Math.floor((therapySession.totalPausedTimeSeconds || 0) / 60),
        scheduledDurationMinutes: therapySession.duration
      }
    };
    } catch (error) {
      logger.error('Error completing session', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  })();
  
  sessionCompletionLocks.set(sessionId, completionPromise);
  
  try {
    const result = await completionPromise;
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to complete session' }, { status: 500 });
  } finally {
    // Clean up the lock after completion
    sessionCompletionLocks.delete(sessionId);
  }
}