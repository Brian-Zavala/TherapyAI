import { NextRequest, NextResponse } from 'next/server';
import { vapiSessionManager } from '@/lib/services/vapi-session-manager';
import { creditManager } from '@/lib/services/credit-manager.service';
import { redis } from '@/lib/cache/redis-client';
import { prisma } from '@/lib/prisma-client';
import { SessionStatus } from '@prisma/client';

// Credit-aware VAPI webhook handler
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { type, call, duration, transcript } = body.message || {};
    
    // Extract session ID from call metadata or custom data
    const sessionId = call?.metadata?.sessionId || call?.customData?.sessionId;
    const vapiCallId = call?.id;
    
    if (!sessionId) {
      console.log('[VAPI-Credit-Webhook] No session ID found in webhook');
      return NextResponse.json({ success: true });
    }
    
    // Get session config from Redis
    const configKey = `session:config:${sessionId}`;
    const sessionConfig = await redis.get(configKey);
    
    if (!sessionConfig) {
      console.warn('[VAPI-Credit-Webhook] Session config not found:', sessionId);
      // Still process the webhook but without credit enforcement
    }
    
    const config = sessionConfig ? JSON.parse(sessionConfig) : null;
    const elapsedSeconds = duration || 0;
    const elapsedMinutes = Math.ceil(elapsedSeconds / 60);
    
    console.log(`[VAPI-Credit-Webhook] Processing ${type} for session ${sessionId}`, {
      sessionId,
      vapiCallId,
      elapsedSeconds,
      elapsedMinutes,
      maxMinutes: config?.maxMinutes,
    });
    
    switch (type) {
      case 'call-start':
        // Verify credits are still available
        if (config) {
          const creditCheck = await creditManager.checkCredits(config.userId);
          
          if (!creditCheck.hasCredits) {
            console.log('[VAPI-Credit-Webhook] No credits available at call start');
            return NextResponse.json({
              action: 'end-call',
              reason: 'insufficient_credits',
              message: 'Insufficient credits to start session.',
            });
          }
        }
        
        // Update session status to active
        await prisma.therapySession.update({
          where: { id: sessionId },
          data: {
            status: SessionStatus.ACTIVE,
            vapiCallId,
            startTime: new Date(),
          },
        });
        
        console.log('[VAPI-Credit-Webhook] Session started successfully');
        break;
      
      case 'transcript':
      case 'speech-update':
        // Real-time credit monitoring
        if (config && config.maxMinutes) {
          const remainingMinutes = config.maxMinutes - elapsedMinutes;
          
          // Warning at 2 minutes remaining
          if (remainingMinutes === 2) {
            console.log('[VAPI-Credit-Webhook] 2 minutes warning');
            return NextResponse.json({
              action: 'inject-message',
              message: 'You have 2 minutes remaining in this session. Let\'s start wrapping up our discussion.',
            });
          }
          
          // Final warning at 1 minute
          if (remainingMinutes === 1) {
            console.log('[VAPI-Credit-Webhook] 1 minute warning');
            return NextResponse.json({
              action: 'inject-message',
              message: 'Just 1 minute left. Let\'s conclude with any final thoughts.',
            });
          }
          
          // End session when time limit reached
          if (elapsedMinutes >= config.maxMinutes) {
            console.log('[VAPI-Credit-Webhook] Time limit reached, ending session');
            return NextResponse.json({
              action: 'end-call',
              reason: 'session_limit_reached',
              message: `Your ${config.maxMinutes} minute session has ended. Thank you for using our service.`,
            });
          }
        }
        
        // Track real-time usage
        if (vapiCallId && elapsedMinutes > 0) {
          const usageKey = `usage:realtime:${vapiCallId}`;
          await redis.set(usageKey, elapsedMinutes, 'EX', 3600);
        }
        break;
      
      case 'function-call':
        // Handle function calls from assistant
        if (body.message?.functionCall?.name === 'checkRemainingTime' && config) {
          const remainingMinutes = Math.max(0, config.maxMinutes - elapsedMinutes);
          return NextResponse.json({
            result: {
              remainingMinutes,
              message: `You have ${remainingMinutes} minutes remaining in this session.`,
            },
          });
        }
        
        if (body.message?.functionCall?.name === 'extendSession') {
          const additionalMinutes = body.message.functionCall.parameters?.additionalMinutes || 10;
          const result = await vapiSessionManager.extendSession(sessionId, additionalMinutes);
          
          return NextResponse.json({
            result: {
              extended: result.extended,
              message: result.extended 
                ? `Session extended by ${additionalMinutes} minutes.`
                : result.error || 'Unable to extend session.',
            },
          });
        }
        break;
      
      case 'call-end':
      case 'end-of-call-report':
        // Complete session and deduct credits
        console.log('[VAPI-Credit-Webhook] Processing call end');
        
        if (sessionId && vapiCallId) {
          try {
            await vapiSessionManager.completeSession(
              sessionId,
              vapiCallId,
              elapsedSeconds
            );
            console.log('[VAPI-Credit-Webhook] Session completed, credits deducted');
          } catch (error) {
            console.error('[VAPI-Credit-Webhook] Error completing session:', error);
          }
        }
        
        // Clean up Redis
        if (config) {
          await redis.del(configKey);
          const usageKey = `usage:realtime:${vapiCallId}`;
          await redis.del(usageKey);
        }
        break;
      
      case 'error':
        // Handle errors with potential refund
        console.error('[VAPI-Credit-Webhook] Session error:', body.message?.error);
        
        if (sessionId && vapiCallId) {
          await vapiSessionManager.handleSessionError(
            sessionId,
            vapiCallId,
            elapsedSeconds
          );
        }
        break;
      
      case 'assistant-message':
      case 'user-message':
        // Log messages for analytics but don't interrupt
        console.log(`[VAPI-Credit-Webhook] ${type}:`, {
          sessionId,
          messageLength: body.message?.content?.length,
        });
        break;
      
      default:
        console.log(`[VAPI-Credit-Webhook] Unhandled event type: ${type}`);
    }
    
    // Always return success to VAPI within 5 seconds
    const processingTime = Date.now() - startTime;
    if (processingTime > 4000) {
      console.warn('[VAPI-Credit-Webhook] Slow processing:', processingTime, 'ms');
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[VAPI-Credit-Webhook] Error:', error);
    // Always return 200 to prevent VAPI retries
    return NextResponse.json({ 
      success: true,
      message: 'Webhook received (error logged)',
    });
  }
}

// GET endpoint for testing webhook configuration
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }
  
  try {
    // Check user's credit status
    const creditStatus = await creditManager.checkCredits(userId);
    
    // Get user's session stats
    const sessionStats = await vapiSessionManager.getSessionStats(userId);
    
    // Get current active sessions
    const activeSessions = await prisma.therapySession.findMany({
      where: {
        userId,
        status: { in: [SessionStatus.ACTIVE, SessionStatus.PAUSED] },
      },
      select: {
        id: true,
        status: true,
        maxDuration: true,
        creditsUsed: true,
        startTime: true,
      },
    });
    
    return NextResponse.json({
      credits: {
        hasCredits: creditStatus.hasCredits,
        available: creditStatus.remainingCredits,
        planType: creditStatus.planType,
        maxSessionDuration: creditStatus.maxSessionDuration,
        isUnlimited: creditStatus.isUnlimited,
      },
      sessions: {
        active: activeSessions,
        stats: sessionStats,
      },
      webhookUrl: `${process.env.NEXTAUTH_URL}/api/vapi/webhook-credit`,
    });
  } catch (error) {
    console.error('[VAPI-Credit-Webhook] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit status' },
      { status: 500 }
    );
  }
}