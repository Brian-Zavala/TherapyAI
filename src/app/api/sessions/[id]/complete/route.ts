import { getAuthSession } from '@/lib/auth'
import { after, NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-optimized';
import { SessionLifecycleManager } from '@/lib/session/session-lifecycle-manager';
import { onSessionCompleted } from '@/lib/ai-insights/session-completion-handler';
import { sendEmail } from '@/lib/email';
import SessionCompletedEmail from '@/emails/SessionCompleted';
import { rateLimitManager } from '@/lib/rate-limit-manager';
import { logger } from '@/lib/logger';
import { trackNotificationInteraction } from '@/lib/notification-tokens';
import { sendSMS } from '@/lib/sms-service';
const lifecycleManager = SessionLifecycleManager.getInstance();

/**
 * Verify that all necessary metrics tables were populated for dashboard display
 * CRITICAL: Dashboard metrics depend on ProgressTracking and CommunicationMetric tables
 */
async function verifySessionMetricsCreation(sessionId: string, userId: string): Promise<{
  success: boolean;
  hasProgressTracking: boolean;
  hasCommunicationMetrics: boolean;
  hasSessionMetrics: boolean;
  details?: string;
}> {
  try {
    // Run all three verification queries in parallel — they're independent reads
    const [progressTracking, communicationMetrics, sessionMetrics] = await Promise.all([
      prisma.progressTracking.findFirst({
        where: { sessionId, userId },
        select: { id: true }
      }),
      prisma.communicationMetric.findFirst({
        where: { sessionId, userId, metricType: { not: 'real-time' } },
        select: { id: true }
      }),
      prisma.sessionMetrics.findFirst({
        where: { sessionId, userId },
        select: { id: true }
      })
    ]);

    const hasProgressTracking = !!progressTracking;
    const hasCommunicationMetrics = !!communicationMetrics;
    const hasSessionMetrics = !!sessionMetrics;

    // Success requires at minimum ProgressTracking and CommunicationMetrics for dashboard
    const success = hasProgressTracking && hasCommunicationMetrics;

    const details = !success ? 
      `Missing: ${!hasProgressTracking ? 'ProgressTracking ' : ''}${!hasCommunicationMetrics ? 'CommunicationMetrics ' : ''}${!hasSessionMetrics ? 'SessionMetrics' : ''}`.trim() :
      'All metrics tables populated';

    return {
      success,
      hasProgressTracking,
      hasCommunicationMetrics,
      hasSessionMetrics,
      details
    };
  } catch (error) {
    logger.error('Error verifying session metrics creation', {
      sessionId,
      userId,
      error
    });
    
    return {
      success: false,
      hasProgressTracking: false,
      hasCommunicationMetrics: false,
      hasSessionMetrics: false,
      details: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// In-memory lock for session completion to prevent race conditions
// This is necessary because multiple hooks (useSessionManagementV2 and useSupabaseSessionState)
// may call this endpoint simultaneously. Both need to make the call to work independently,
// but we only want the completion logic to run once.
const sessionCompletionLocks = new Map<string, Promise<any>>();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  
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
    
    // Get session details — select only fields used by critical path + background work.
    // Using select instead of include: { user: true } avoids fetching the full User record.
    const therapySession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        userId: true,
        conversationTimeSeconds: true,
        lastConversationStart: true,
        isPaused: true,
        duration: true,
        totalPausedTimeSeconds: true,
        notificationToken: true,
        notes: true,
        date: true,
        // Only the user fields needed for email/SMS notifications (background work)
        user: { select: { id: true, email: true, name: true } },
      },
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

    // ── CRITICAL PATH (blocking) ─────────────────────────────────────
    // Only the work the user MUST wait for: status change, credit deduction,
    // metrics calculation, and billing update.

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

    logger.info('Session critical path completed — returning response', {
      sessionId,
      userId: therapySession.userId,
      billableMinutes: finalBillableMinutes
    });

    // Build the response now so we can return it immediately
    const responsePayload = {
      success: true,
      billing: {
        conversationTimeSeconds: finalConversationTimeSeconds,
        billableMinutes: finalBillableMinutes,
        totalPausedMinutes: totalPausedMinutes || Math.floor((therapySession.totalPausedTimeSeconds || 0) / 60),
        scheduledDurationMinutes: therapySession.duration
      }
    };

    // ── BACKGROUND WORK (via Next.js `after()`) ────────────────────────
    // `after()` is the Next.js 15 API for running work AFTER the response
    // is sent. Unlike fire-and-forget promises, it's runtime-aware — the
    // platform (Railway/Vercel) keeps the function alive until it finishes.
    after(async () => {
      try {
        // 1. Verify & retry metrics if needed
        const metricsVerification = await verifySessionMetricsCreation(sessionId, therapySession.userId);
        if (!metricsVerification.success) {
          logger.error('Session completed but metrics verification failed', {
            sessionId,
            userId: therapySession.userId,
            verification: metricsVerification
          });

          const { calculateMetrics } = await import('@/lib/metrics/metrics-deduplication');
          await calculateMetrics(sessionId, therapySession.userId);

          const retryVerification = await verifySessionMetricsCreation(sessionId, therapySession.userId);
          if (!retryVerification.success) {
            logger.error('Metrics calculation retry also failed', { sessionId, retryVerification });
          } else {
            logger.info('Metrics calculation retry succeeded', { sessionId });
          }
        }

        // 2. Flush transcripts & cleanup channels (in parallel — independent ops)
        await Promise.allSettled([
          import('@/lib/transcript-service-optimized').then(async ({ flushSessionTranscripts, cleanupSessionMetrics }) => {
            await flushSessionTranscripts(sessionId);
            cleanupSessionMetrics(sessionId);
          }),
          import('@/lib/metrics-broadcaster').then(({ cleanupBroadcastChannels }) =>
            cleanupBroadcastChannels(sessionId)
          ),
          // 3. Notification tracking (independent, can run in parallel with cleanup)
          therapySession.notificationToken
            ? trackNotificationInteraction(therapySession.notificationToken, 'completed')
            : Promise.resolve()
        ]);

        // 4. Email + SMS notifications — fetch dependencies in parallel
        const durationInMinutes = Math.round(
          (finalConversationTimeSeconds || (therapySession.duration ? therapySession.duration * 60 : 1800)) / 60
        );

        const [nextSession, userProfile] = await Promise.all([
          prisma.session.findFirst({
            where: {
              userId: therapySession.userId,
              status: 'SCHEDULED',
              date: { gt: new Date() }
            },
            orderBy: { date: 'asc' },
            select: { date: true }
          }),
          prisma.userProfile.findUnique({
            where: { userId: therapySession.userId },
            select: { phone: true, smsConsent: true }
          })
        ]);

        // Send email and SMS in parallel
        const notificationPromises: Promise<unknown>[] = [
          sendEmail({
            to: therapySession.user.email,
            subject: 'Session Completed - Great Progress!',
            react: SessionCompletedEmail({
              username: therapySession.user.name || 'Valued Client',
              sessionDate: therapySession.date,
              duration: durationInMinutes,
              sessionNotes: therapySession.notes || undefined,
              nextSessionDate: nextSession?.date,
              baseUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000',
            }) as any,
          })
        ];

        if (userProfile?.phone && userProfile.smsConsent) {
          const nextSessionText = nextSession
            ? `Next: ${nextSession.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : 'Schedule your next session';

          notificationPromises.push(
            sendSMS({
              to: userProfile.phone,
              body: `Session complete! ${durationInMinutes}min of growth achieved. ${nextSessionText}. STOP to unsub`,
              priority: 'normal',
              validateOnly: false,
              notificationId: `session-completed-${sessionId}`,
              userId: therapySession.userId,
            })
          );
        }

        await Promise.allSettled(notificationPromises);

        // 5. AI insights regeneration (heaviest — runs last)
        await onSessionCompleted(sessionId);

        logger.info('Session background work completed', { sessionId });
      } catch (err) {
        logger.error('Error in session post-completion background work', { sessionId, error: err });
      }
    });

    return responsePayload;
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