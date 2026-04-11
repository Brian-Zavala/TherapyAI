// @ts-nocheck
import { prisma } from '@/lib/prisma-optimized';
import { SessionStatus } from '@prisma/client';
import { CreditManager, creditManager } from './credit-manager.service';
import { redis, safeParseRedis } from '@/lib/cache/redis-client';
import { sendEmail } from '@/lib/email';
import Vapi from '@vapi-ai/web';
import { convertToBillableMinutes } from '@/lib/utils/billing-utils';

export interface VapiSessionConfig {
  sessionId: string;
  maxDurationSeconds: number;
  assistant: any;
  userId: string;
  therapyType: string;
}

export class VapiSessionManager {
  private creditManager: CreditManager;

  constructor() {
    this.creditManager = creditManager;
  }

  /**
   * Get user's subscription plan details
   */
  private async getUserPlanDetails(userId: string): Promise<{
    planType: string;
    maxConcurrent: number;
    maxSessionDuration: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        subscriptionId: true,
        maxSessionDuration: true,
        concurrentSessions: true,
      },
    });

    // Determine plan type from subscription
    const planType = (user?.subscriptionStatus === 'active' && user.subscriptionId)
      ? 'pro'
      : 'free';

    // Get plan limits
    const planLimits = {
      free: { maxConcurrent: 1, maxSessionDuration: 15 },
      pro:  { maxConcurrent: 1, maxSessionDuration: 30 },
    };

    const limits = planLimits[planType as keyof typeof planLimits];

    return {
      planType,
      maxConcurrent: user?.concurrentSessions || limits.maxConcurrent,
      maxSessionDuration: user?.maxSessionDuration || limits.maxSessionDuration,
    };
  }

  /**
   * Get active sessions for a user
   */
  private async getActiveSessions(userId: string) {
    return await prisma.therapySession.findMany({
      where: {
        userId,
        status: {
          in: [SessionStatus.ACTIVE, SessionStatus.SCHEDULED, SessionStatus.PAUSED],
        },
        // Sessions started in last 2 hours (safety check)
        createdAt: {
          gte: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Start a VAPI session with credit checks and enforcement
   */
  async startSession(
    userId: string,
    therapyType: string,
    requestedMinutes?: number
  ): Promise<{
    canStart: boolean;
    sessionConfig?: VapiSessionConfig;
    error?: string;
    creditsAvailable?: number;
    waitTime?: number;
  }> {
    // 1. Check credits
    const creditCheck = await this.creditManager.checkCredits(userId, requestedMinutes);

    if (!creditCheck.hasCredits) {
      return {
        canStart: false,
        error: 'Insufficient credits. Please upgrade your plan or purchase additional credits.',
        creditsAvailable: creditCheck.remainingCredits,
      };
    }

    // 2. Get plan details and check concurrent sessions
    const planDetails = await this.getUserPlanDetails(userId);
    const activeSessions = await this.getActiveSessions(userId);

    if (activeSessions.length >= planDetails.maxConcurrent) {
      // Calculate estimated wait time based on oldest active session
      const oldestSession = activeSessions[activeSessions.length - 1];
      const sessionAge = Date.now() - oldestSession.createdAt.getTime();
      const estimatedRemaining = Math.max(
        0,
        (planDetails.maxSessionDuration * 60 * 1000) - sessionAge
      );

      return {
        canStart: false,
        error: `Maximum concurrent sessions (${planDetails.maxConcurrent}) reached. Please wait for an active session to complete.`,
        waitTime: Math.ceil(estimatedRemaining / 1000 / 60), // in minutes
      };
    }

    // 3. Calculate actual session duration (minimum of available credits and max session duration)
    const sessionMinutes = Math.min(
      creditCheck.availableMinutes,
      creditCheck.maxSessionDuration,
      requestedMinutes || creditCheck.maxSessionDuration
    );

    // 4. Reserve credits to prevent race conditions
    const session = await prisma.therapySession.create({
      data: {
        userId,
        therapyType,
        status: SessionStatus.SCHEDULED,
        maxDuration: sessionMinutes,
        creditsAllocated: sessionMinutes,
        sessionDate: new Date(),
        startTime: new Date(),
      },
    });

    const reserved = await this.creditManager.reserveCredits(
      userId,
      session.id,
      sessionMinutes
    );

    if (!reserved) {
      // Rollback session creation if reservation fails
      await prisma.therapySession.delete({ where: { id: session.id } });
      return {
        canStart: false,
        error: 'Unable to reserve credits. Please try again.',
      };
    }

    // 5. Create VAPI configuration with time limits and credit enforcement
    const vapiConfig = this.createVapiConfig(
      therapyType,
      sessionMinutes,
      creditCheck.remainingCredits,
      creditCheck.planType
    );

    // 6. Store session config in Redis for webhook validation
    const configKey = `session:config:${session.id}`;
    await redis.set(
      configKey,
      JSON.stringify({
        userId,
        sessionId: session.id,
        maxMinutes: sessionMinutes,
        startTime: Date.now(),
        planType: creditCheck.planType,
      }),
      'EX',
      7200 // 2 hours TTL
    );

    return {
      canStart: true,
      sessionConfig: {
        sessionId: session.id,
        maxDurationSeconds: sessionMinutes * 60,
        assistant: vapiConfig,
        userId,
        therapyType,
      },
      creditsAvailable: creditCheck.remainingCredits,
    };
  }

  /**
   * Create VAPI configuration with credit-based time limits
   */
  private createVapiConfig(
    therapyType: string,
    maxMinutes: number,
    remainingCredits: number,
    planType: string
  ): any {
    const warningTime = Math.max(2, Math.floor(maxMinutes * 0.2)); // Warn at 80% usage

    return {
      transcriber: {
        provider: 'deepgram',
        model: 'nova-3',
        language: 'en',
      },
      model: {
        provider: 'anthropic',
        model: 'claude-3-haiku',
        messages: [
          {
            role: 'system',
            content: `You are a professional ${therapyType} therapist conducting a session.
              
              CRITICAL SESSION LIMITS:
              - Maximum session duration: ${maxMinutes} minutes
              - Warning at ${maxMinutes - warningTime} minutes elapsed
              - Session will automatically end at ${maxMinutes} minutes
              - User has ${remainingCredits} total minutes remaining in their ${planType} plan
              
              TIME MANAGEMENT:
              - At ${maxMinutes - warningTime} minutes: "We have about ${warningTime} minutes remaining in today's session."
              - At ${maxMinutes - 1} minutes: "We're approaching the end of our session time. Let's start wrapping up."
              - Keep track of time and help the user make the most of their session.
              
              Be professional, empathetic, and focused on helping within the time constraints.`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'checkRemainingTime',
              description: 'Check how much time is remaining in the session',
              parameters: {
                type: 'object',
                properties: {},
              },
            },
          },
          {
            type: 'function',
            function: {
              name: 'extendSession',
              description: 'Request to extend the session if user has available credits',
              parameters: {
                type: 'object',
                properties: {
                  additionalMinutes: {
                    type: 'number',
                    description: 'Number of additional minutes requested',
                  },
                },
              },
            },
          },
        ],
        temperature: 0.7,
        maxTokens: 500,
      },
      voice: {
        provider: '11labs',
        voiceId: 'sarah', // Professional, calm voice
        stability: 0.8,
        similarityBoost: 0.8,
      },
      // CRITICAL: Hard time limit enforcement
      maxDurationSeconds: maxMinutes * 60,
      silenceTimeoutSeconds: 30,
      responseDelaySeconds: 0.4,
      
      // Graceful session ending
      endCallMessage: `Thank you for your session today. You've used ${maxMinutes} minutes. ${
        remainingCredits > maxMinutes
          ? `You have ${remainingCredits - maxMinutes} minutes remaining in your plan.`
          : 'Consider upgrading your plan for more session time.'
      }`,
      endCallPhrases: [
        'goodbye',
        'end session',
        'stop session',
        'thank you goodbye',
      ],
      
      // Webhook for real-time tracking and credit deduction
      serverUrl: `${process.env.NEXTAUTH_URL}/api/vapi/webhook`,
      serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET,
      
      // Session metadata for tracking
      metadata: {
        therapyType,
        maxMinutes: maxMinutes.toString(),
        planType,
        creditsAvailable: remainingCredits.toString(),
      },
    };
  }

  /**
   * Handle real-time session updates from VAPI webhook
   */
  async handleWebhookUpdate(
    sessionId: string,
    vapiCallId: string,
    event: string,
    duration?: number
  ): Promise<any> {
    const configKey = `session:config:${sessionId}`;
    const config = await redis.get(configKey);
    
    if (!config) {
      console.error('Session config not found:', sessionId);
      return { success: false, error: 'Session not found' };
    }

    const sessionConfig = safeParseRedis<any>(config);
    if (!sessionConfig) {
      console.error('Failed to parse session config:', sessionId);
      return { success: false, error: 'Invalid session config' };
    }
    const elapsedMinutes = duration ? Math.ceil(duration / 60) : 0;

    switch (event) {
      case 'call-start':
        // Update session status to active
        await prisma.therapySession.update({
          where: { id: sessionId },
          data: {
            status: SessionStatus.ACTIVE,
            vapiCallId,
            startTime: new Date(),
          },
        });
        break;

      case 'transcript':
      case 'speech-update':
        // Check if approaching limit
        const remainingMinutes = sessionConfig.maxMinutes - elapsedMinutes;
        
        if (remainingMinutes <= 2 && remainingMinutes > 0) {
          return {
            action: 'inject-message',
            message: `You have ${remainingMinutes} minute${
              remainingMinutes === 1 ? '' : 's'
            } remaining in this session.`,
          };
        }
        
        if (elapsedMinutes >= sessionConfig.maxMinutes) {
          return {
            action: 'end-call',
            reason: 'session_limit_reached',
            message: 'Your session time has been reached. Thank you for using our service.',
          };
        }
        break;

      case 'call-end':
        // Complete session and deduct credits
        await this.completeSession(sessionId, vapiCallId, duration || 0);
        break;

      case 'error':
        // Handle technical issues with potential refund
        await this.handleSessionError(sessionId, vapiCallId, duration || 0);
        break;
    }

    return { success: true };
  }

  /**
   * Complete a session using SessionLifecycleManager for unified architecture
   */
  async completeSession(
    sessionId: string,
    vapiCallId: string,
    durationSeconds: number
  ): Promise<void> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) {
      console.error('Session not found for completion:', sessionId);
      return;
    }

    // Update VAPI timing for reconciliation
    try {
      const { timingReconciliation } = await import('@/lib/services/credit-timing-reconciliation');
      await timingReconciliation.updateVapiTiming(sessionId, durationSeconds);
    } catch (error) {
      console.error('Error updating VAPI timing:', error);
    }

    // Delegate to SessionLifecycleManager for unified completion
    try {
      const { SessionLifecycleManager } = await import('@/lib/session/session-lifecycle-manager');
      await SessionLifecycleManager.getInstance().completeSession(sessionId, session.userId);
    } catch (error) {
      console.error('Error completing session via lifecycle manager:', error);
      
      // Fallback to manual cleanup if lifecycle manager fails
      await this.handleFailedCompletion(sessionId, vapiCallId, durationSeconds);
    }

    // Clean up Redis config
    const configKey = `session:config:${sessionId}`;
    await redis.del(configKey);
  }

  /**
   * Fallback completion when SessionLifecycleManager fails
   */
  private async handleFailedCompletion(
    sessionId: string,
    vapiCallId: string,
    durationSeconds: number
  ): Promise<void> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) return;

    const minutesUsed = Math.ceil(durationSeconds / 60);

    // Mark as completed in database as fallback
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.COMPLETED,
        conversationTimeSeconds: durationSeconds,
        completedAt: new Date(),
        endTime: new Date(),
      },
    });

    console.warn('Session completed via fallback mechanism', {
      sessionId,
      vapiCallId,
      durationSeconds,
      minutesUsed
    });
  }

  /**
   * Handle session errors with potential credit refund
   */
  async handleSessionError(
    sessionId: string,
    vapiCallId: string,
    durationSeconds: number
  ): Promise<void> {
    const session = await prisma.therapySession.findUnique({
      where: { id: sessionId },
    });

    if (!session) return;

    const minutesUsed = Math.ceil(durationSeconds / 60);

    // Update session as terminated
    await prisma.therapySession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.TECHNICAL_ISSUE,
        duration: minutesUsed,
        creditsUsed: 0, // Don't charge for technical issues
        terminationReason: 'Technical error during session',
        endTime: new Date(),
      },
    });

    // Refund credits if session lasted less than 2 minutes
    if (minutesUsed < 2 && session.creditsAllocated) {
      await this.creditManager.refundCredits(
        session.userId,
        sessionId,
        session.creditsAllocated,
        'Session terminated due to technical issue'
      );
    }

    // Clean up Redis
    const configKey = `session:config:${sessionId}`;
    await redis.del(configKey);
  }

  /**
   * Handle mid-session credit exhaustion
   */
  async handleCreditExhaustion(
    sessionId: string,
    vapiCallId: string
  ): Promise<void> {
    // Send graceful termination to VAPI
    const terminationMessage = {
      type: 'end-call',
      message: 'Your session credits have been exhausted. The session will end in 30 seconds. Thank you for using our service.',
    };

    // Update session status
    await prisma.therapySession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.TERMINATED,
        terminationReason: 'CREDITS_EXHAUSTED',
        endTime: new Date(),
      },
    });

    // Send notification to user
    await this.notifyUser(sessionId, 'credits_exhausted');
  }

  /**
   * Extend an active session if credits are available
   */
  async extendSession(
    sessionId: string,
    additionalMinutes: number
  ): Promise<{
    extended: boolean;
    newMaxDuration?: number;
    error?: string;
  }> {
    const session = await prisma.therapySession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.status !== SessionStatus.ACTIVE) {
      return { extended: false, error: 'Session not active' };
    }

    // Check if user has credits for extension
    const creditCheck = await this.creditManager.checkCredits(
      session.userId,
      additionalMinutes
    );

    if (!creditCheck.hasCredits || creditCheck.availableMinutes < additionalMinutes) {
      return {
        extended: false,
        error: `Insufficient credits. You have ${creditCheck.availableMinutes} minutes available.`,
      };
    }

    // Reserve additional credits
    const tempSessionId = `${sessionId}_extension_${Date.now()}`;
    const reserved = await this.creditManager.reserveCredits(
      session.userId,
      tempSessionId,
      additionalMinutes
    );

    if (!reserved) {
      return { extended: false, error: 'Unable to reserve additional credits' };
    }

    // Update session with new duration
    const newMaxDuration = (session.maxDuration || 0) + additionalMinutes;
    await prisma.therapySession.update({
      where: { id: sessionId },
      data: {
        maxDuration: newMaxDuration,
        creditsAllocated: (session.creditsAllocated || 0) + additionalMinutes,
      },
    });

    // Update Redis config
    const configKey = `session:config:${sessionId}`;
    const config = await redis.get(configKey);
    if (config) {
      const sessionConfig = safeParseRedis<any>(config);
      if (sessionConfig) {
        sessionConfig.maxMinutes = newMaxDuration;
        await redis.set(configKey, JSON.stringify(sessionConfig), 'EX', 7200);
      }
    }

    return { extended: true, newMaxDuration };
  }

  /**
   * Send session summary email
   */
  private async sendSessionSummary(
    email: string,
    name: string | null,
    minutesUsed: number
  ): Promise<void> {
    await sendEmail({
      to: email,
      subject: 'Your Therapy Session Summary',
      html: `
        <h2>Session Complete</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Your therapy session has been completed successfully.</p>
        <ul>
          <li>Duration: ${minutesUsed} minutes</li>
          <li>Credits used: ${minutesUsed}</li>
        </ul>
        <p>View your session history and remaining credits in your dashboard.</p>
        <br>
        <a href="${process.env.NEXTAUTH_URL}/dashboard">View Dashboard</a>
      `,
    });
  }

  /**
   * Notify user about session events
   */
  private async notifyUser(
    sessionId: string,
    notificationType: 'credits_exhausted' | 'session_extended' | 'technical_issue'
  ): Promise<void> {
    const session = await prisma.therapySession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) return;

    const messages = {
      credits_exhausted: {
        subject: 'Session Credits Exhausted',
        message: 'Your therapy session ended because you ran out of credits. Consider upgrading your plan for uninterrupted sessions.',
      },
      session_extended: {
        subject: 'Session Extended Successfully',
        message: 'Your therapy session has been extended. Additional credits have been reserved.',
      },
      technical_issue: {
        subject: 'Session Ended - Technical Issue',
        message: 'Your session ended due to a technical issue. Credits have been refunded to your account.',
      },
    };

    const { subject, message } = messages[notificationType];

    await sendEmail({
      to: session.user.email,
      subject,
      html: `
        <h2>${subject}</h2>
        <p>Hi ${session.user.name || 'there'},</p>
        <p>${message}</p>
        <p>View your account details in your dashboard.</p>
        <br>
        <a href="${process.env.NEXTAUTH_URL}/dashboard/billing">View Billing</a>
      `,
    });
  }

  /**
   * Get session statistics for a user
   */
  async getSessionStats(userId: string): Promise<{
    totalSessions: number;
    totalMinutes: number;
    averageDuration: number;
    lastSession: Date | null;
    upcomingSessions: number;
  }> {
    const sessions = await prisma.therapySession.findMany({
      where: { userId },
      select: {
        duration: true,
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const completedSessions = sessions.filter(
      s => s.status === SessionStatus.COMPLETED
    );
    const upcomingSessions = sessions.filter(
      s => s.status === SessionStatus.SCHEDULED
    );

    const totalMinutes = completedSessions.reduce(
      (sum, s) => sum + (s.duration || 0),
      0
    );

    return {
      totalSessions: completedSessions.length,
      totalMinutes,
      averageDuration:
        completedSessions.length > 0
          ? totalMinutes / completedSessions.length
          : 0,
      lastSession: sessions[0]?.createdAt || null,
      upcomingSessions: upcomingSessions.length,
    };
  }
}

// Export singleton instance
export const vapiSessionManager = new VapiSessionManager();