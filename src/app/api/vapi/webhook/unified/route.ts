// @ts-nocheck
/**
 * Unified VAPI Webhook Handler
 * 
 * Consolidates all webhook processing into a single handler to prevent:
 * - Duplicate processing
 * - Race conditions
 * - Inconsistent state updates
 * 
 * Features:
 * - Credit management integration
 * - Timing reconciliation
 * - Real-time insights
 * - Idempotency protection
 * - Comprehensive error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-optimized';
import { creditManager } from '@/lib/services/credit-manager.service';
import { timingReconciliation } from '@/lib/services/credit-timing-reconciliation';
import { vapiSessionManager } from '@/lib/services/vapi-session-manager';
import { redis } from '@/lib/cache/redis-client';
import { SessionStatus } from '@prisma/client';
import { jobQueue, JobType } from '@/lib/queue/background-jobs';
import crypto from 'crypto';

// Webhook event types we handle
type WebhookEventType = 
  | 'call-start'
  | 'call-end'
  | 'end-of-call-report'
  | 'transcript'
  | 'speech-update'
  | 'function-call'
  | 'error'
  | 'hang'
  | 'conversation-update';

interface WebhookContext {
  correlationId: string;
  sessionId: string;
  vapiCallId: string;
  userId?: string;
  type: WebhookEventType;
  timestamp: number;
  idempotencyKey: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const correlationId = crypto.randomUUID();
  
  try {
    // Parse request body
    const body = await request.json();
    const { type, call, duration, transcript, error } = body.message || {};
    
    // Extract session and call IDs
    const sessionId = call?.metadata?.sessionId || call?.customData?.sessionId;
    const vapiCallId = call?.id;
    
    // Generate idempotency key
    const webhookId = body.id || crypto.randomUUID();
    const idempotencyKey = `webhook:${vapiCallId}:${type}:${webhookId}`;
    
    // Create webhook context
    const context: WebhookContext = {
      correlationId,
      sessionId,
      vapiCallId,
      type,
      timestamp: Date.now(),
      idempotencyKey,
    };
    
    // Log incoming webhook
    console.log(`[Unified-Webhook] ${correlationId} Processing ${type}`, {
      sessionId,
      vapiCallId,
      duration,
    });
    
    // Check for duplicate processing
    const alreadyProcessed = await checkIdempotency(idempotencyKey);
    if (alreadyProcessed) {
      console.log(`[Unified-Webhook] ${correlationId} Duplicate ignored`);
      return NextResponse.json({ 
        success: true, 
        correlationId,
        message: 'Already processed' 
      });
    }
    
    // Route to appropriate handler
    let response: any = { success: true };
    
    switch (type) {
      case 'call-start':
        response = await handleCallStart(context, body);
        break;
        
      case 'transcript':
      case 'speech-update':
        response = await handleTranscript(context, body, duration);
        break;
        
      case 'function-call':
        response = await handleFunctionCall(context, body);
        break;
        
      case 'call-end':
      case 'end-of-call-report':
        response = await handleCallEnd(context, body, duration);
        break;
        
      case 'error':
      case 'hang':
        response = await handleError(context, body, error);
        break;
        
      case 'conversation-update':
        response = await handleConversationUpdate(context, body);
        break;
        
      default:
        console.log(`[Unified-Webhook] ${correlationId} Unhandled type: ${type}`);
    }
    
    // Mark as processed (with TTL to allow retries after some time)
    await markAsProcessed(idempotencyKey);
    
    // Log completion
    const processingTime = Date.now() - startTime;
    console.log(`[Unified-Webhook] ${correlationId} Completed in ${processingTime}ms`);
    
    return NextResponse.json({
      ...response,
      correlationId,
      processingTime,
    });
    
  } catch (error) {
    console.error(`[Unified-Webhook] ${correlationId} Error:`, error);
    
    // Return success to prevent VAPI retries for non-critical errors
    return NextResponse.json({
      success: true,
      correlationId,
      error: 'Internal processing error',
    });
  }
}

/**
 * Check if webhook was already processed
 */
async function checkIdempotency(key: string): Promise<boolean> {
  const result = await redis.get(`processed:${key}`);
  return result !== null;
}

/**
 * Mark webhook as processed
 */
async function markAsProcessed(key: string, ttl = 300): Promise<void> {
  await redis.set(`processed:${key}`, '1', 'EX', ttl);
}

/**
 * Handle call start event
 */
async function handleCallStart(
  context: WebhookContext,
  body: any
): Promise<any> {
  const { sessionId, vapiCallId } = context;
  
  if (!sessionId) {
    return { success: true };
  }
  
  // Start timing reconciliation
  await timingReconciliation.startSessionTiming(sessionId);
  
  // Get session config from Redis
  const configKey = `session:config:${sessionId}`;
  const sessionConfig = await redis.get(configKey);
  
  if (sessionConfig) {
    const config = JSON.parse(sessionConfig);
    
    // Verify credits are available
    const creditCheck = await creditManager.checkCredits(config.userId);
    
    if (!creditCheck.hasCredits) {
      console.log(`[Unified-Webhook] No credits available for session ${sessionId}`);
      
      // Mark as processed even for rejected calls
      await markAsProcessed(context.idempotencyKey, 86400);
      
      return {
        action: 'end-call',
        reason: 'insufficient_credits',
        message: 'Insufficient credits to start session.',
      };
    }
    
    // Store user ID in context for other handlers
    context.userId = config.userId;
  }
  
  // Update session status atomically
  const updateResult = await prisma.session.updateMany({
    where: { 
      id: sessionId,
      status: { not: SessionStatus.ACTIVE },
    },
    data: {
      status: SessionStatus.ACTIVE,
      vapiCallId,
      startTime: new Date(),
    },
  });
  
  if (updateResult.count > 0) {
    console.log(`[Unified-Webhook] Session ${sessionId} started`);
    
    // Queue background job for session monitoring
    await jobQueue.enqueue(JobType.SESSION_MONITOR, {
      sessionId,
      vapiCallId,
      startTime: new Date(),
    });
  }
  
  return { success: true };
}

/**
 * Handle transcript/speech events
 */
async function handleTranscript(
  context: WebhookContext,
  body: any,
  duration?: number
): Promise<any> {
  const { sessionId } = context;
  
  if (!sessionId || !duration) {
    return { success: true };
  }
  
  // Update VAPI timing
  if (duration > 0) {
    await timingReconciliation.updateVapiTiming(sessionId, duration);
  }
  
  // Get session config for credit monitoring
  const configKey = `session:config:${sessionId}`;
  const sessionConfig = await redis.get(configKey);
  
  if (sessionConfig) {
    const config = JSON.parse(sessionConfig);
    const elapsedMinutes = Math.ceil(duration / 60);
    
    if (config.maxMinutes) {
      const remainingMinutes = config.maxMinutes - elapsedMinutes;
      
      // Warning at 2 minutes
      if (remainingMinutes === 2) {
        return {
          action: 'inject-message',
          message: 'You have 2 minutes remaining in this session. Let\'s start wrapping up our discussion.',
        };
      }
      
      // Final warning at 1 minute
      if (remainingMinutes === 1) {
        return {
          action: 'inject-message',
          message: 'Just 1 minute left. Let\'s conclude with any final thoughts.',
        };
      }
      
      // End session at time limit
      if (elapsedMinutes >= config.maxMinutes) {
        console.log(`[Unified-Webhook] Time limit reached for session ${sessionId}`);
        return {
          action: 'end-call',
          reason: 'session_limit_reached',
          message: `Your ${config.maxMinutes} minute session has ended. Thank you for using our service.`,
        };
      }
    }
    
    // Track real-time usage
    const usageKey = `usage:realtime:${context.vapiCallId}`;
    await redis.set(usageKey, elapsedMinutes, 'EX', 3600);
  }
  
  // Process transcript for insights (async, don't wait)
  if (body.message?.transcript) {
    processTranscriptAsync(context, body.message.transcript);
  }
  
  return { success: true };
}

/**
 * Handle function calls from assistant
 */
async function handleFunctionCall(
  context: WebhookContext,
  body: any
): Promise<any> {
  const functionCall = body.message?.functionCall;
  
  if (!functionCall) {
    return { success: true };
  }
  
  const { name, parameters } = functionCall;
  
  switch (name) {
    case 'checkRemainingTime':
      const configKey = `session:config:${context.sessionId}`;
      const sessionConfig = await redis.get(configKey);
      
      if (sessionConfig) {
        const config = JSON.parse(sessionConfig);
        const duration = body.message?.duration || 0;
        const elapsedMinutes = Math.ceil(duration / 60);
        const remainingMinutes = Math.max(0, config.maxMinutes - elapsedMinutes);
        
        return {
          result: {
            remainingMinutes,
            message: `You have ${remainingMinutes} minutes remaining in this session.`,
          },
        };
      }
      break;
      
    case 'extendSession':
      const additionalMinutes = parameters?.additionalMinutes || 10;
      const result = await vapiSessionManager.extendSession(
        context.sessionId,
        additionalMinutes
      );
      
      return {
        result: {
          extended: result.extended,
          message: result.extended 
            ? `Session extended by ${additionalMinutes} minutes.`
            : result.error || 'Unable to extend session.',
        },
      };
      
    default:
      console.log(`[Unified-Webhook] Unknown function call: ${name}`);
  }
  
  return { success: true };
}

/**
 * Handle call end event
 */
async function handleCallEnd(
  context: WebhookContext,
  body: any,
  duration?: number
): Promise<any> {
  const { sessionId, vapiCallId } = context;
  
  console.log(`[Unified-Webhook] Processing call end for session ${sessionId}`);
  
  if (!sessionId || !vapiCallId) {
    return { success: true };
  }
  
  try {
    // Reconcile timing for accurate billing
    const reconciliationResult = await timingReconciliation.completeSessionTiming(sessionId);
    
    console.log(`[Unified-Webhook] Timing reconciliation:`, {
      sessionId,
      actualMinutes: reconciliationResult.actualMinutes,
      source: reconciliationResult.source,
      confidence: reconciliationResult.confidence,
    });
    
    // Use separate idempotency key for completion
    const completionKey = `completion:${sessionId}:${vapiCallId}`;
    const alreadyCompleted = await redis.get(completionKey);
    
    if (!alreadyCompleted) {
      // Complete session with reconciled timing
      const actualSeconds = reconciliationResult.actualMinutes * 60;
      await vapiSessionManager.completeSession(
        sessionId,
        vapiCallId,
        actualSeconds
      );
      
      // Mark as completed
      await redis.set(completionKey, '1', 'EX', 86400);
      
      console.log(`[Unified-Webhook] Session ${sessionId} completed`);
      
      // Queue post-session tasks
      await jobQueue.enqueue(JobType.SESSION_COMPLETE, {
        sessionId,
        vapiCallId,
        duration: actualSeconds,
        completedAt: new Date(),
      });
      
      // Log timing warnings
      if (reconciliationResult.warnings.length > 0) {
        console.warn(`[Unified-Webhook] Timing warnings for ${sessionId}:`, 
          reconciliationResult.warnings
        );
      }
    } else {
      console.log(`[Unified-Webhook] Session ${sessionId} already completed`);
    }
    
    // Clean up Redis data
    await cleanupSessionData(sessionId, vapiCallId);
    
  } catch (error) {
    console.error(`[Unified-Webhook] Error completing session ${sessionId}:`, error);
    // Don't mark as processed to allow retry
    throw error;
  }
  
  return { success: true };
}

/**
 * Handle error events
 */
async function handleError(
  context: WebhookContext,
  body: any,
  error?: any
): Promise<any> {
  const { sessionId } = context;
  
  console.error(`[Unified-Webhook] Error for session ${sessionId}:`, error);
  
  if (sessionId && error) {
    // Check if refund is needed (session < 2 minutes)
    const duration = body.message?.duration || 0;
    const elapsedMinutes = Math.ceil(duration / 60);
    
    if (elapsedMinutes < 2) {
      // Queue refund job
      await jobQueue.enqueue(JobType.CREDIT_REFUND, {
        sessionId,
        reason: error?.message || 'Technical issue',
        minutes: elapsedMinutes,
      });
      
      console.log(`[Unified-Webhook] Refund queued for session ${sessionId}`);
    }
    
    // Update session status
    await prisma.session.updateMany({
      where: { id: sessionId },
      data: {
        status: SessionStatus.TECHNICAL_ISSUE,
        terminationReason: error?.message || 'Unknown error',
        endTime: new Date(),
      },
    });
  }
  
  return { success: true };
}

/**
 * Handle conversation update events
 */
async function handleConversationUpdate(
  context: WebhookContext,
  body: any
): Promise<any> {
  // Queue for async processing
  await jobQueue.enqueue(JobType.CONVERSATION_UPDATE, {
    sessionId: context.sessionId,
    vapiCallId: context.vapiCallId,
    update: body.message,
  });
  
  return { success: true };
}

/**
 * Process transcript asynchronously
 */
async function processTranscriptAsync(
  context: WebhookContext,
  transcript: any
): Promise<void> {
  try {
    await jobQueue.enqueue(JobType.TRANSCRIPT_PROCESS, {
      sessionId: context.sessionId,
      transcript,
      timestamp: context.timestamp,
    });
  } catch (error) {
    console.error(`[Unified-Webhook] Failed to queue transcript processing:`, error);
  }
}

/**
 * Clean up session data from Redis
 */
async function cleanupSessionData(
  sessionId: string,
  vapiCallId: string
): Promise<void> {
  try {
    const keys = [
      `session:config:${sessionId}`,
      `usage:realtime:${vapiCallId}`,
      `credits:reserved:${sessionId}`,
      `timing:session:${sessionId}`,
    ];
    
    await Promise.all(keys.map(key => redis.del(key)));
  } catch (error) {
    console.error(`[Unified-Webhook] Cleanup error:`, error);
  }
}

// Export for testing
export const handlers = {
  handleCallStart,
  handleTranscript,
  handleFunctionCall,
  handleCallEnd,
  handleError,
  handleConversationUpdate,
};