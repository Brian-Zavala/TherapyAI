// src/app/api/sessions/[id]/force-end/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/database/prisma-optimized';
import { authOptions } from '@/lib/auth';
import { sessionCache, cacheKeys } from '@/lib/session/session-cache';
import { SessionLifecycleManager } from '@/lib/session/session-lifecycle-manager';
import { z } from 'zod';
import type { Session } from '@prisma/client';

// 2025 Standard: Type definitions
interface ApiError {
  error: string;
  code?: string;
  details?: any;
}

// 2025 Standard: Validation schema
const forceEndSchema = z.object({
  reason: z.string().min(1).max(500),
  terminationType: z.enum(['user_action', 'user_started_new', 'system_cleanup', 'technical_issue']).default('user_action'),
  skipBillingProtection: z.boolean().optional().default(false),
  vapiCallCost: z.number().optional(),
});

// 2025 Standard: Structured logging
const log = {
  info: (message: string, data?: any) => {
    console.log(`[Force End Session API] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error: any) => {
    console.error(`[Force End Session API] ${message}`, {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 2025 Standard: Auth check
    const authSession = await getServerSession(authOptions);
    if (!authSession?.user?.email) {
      return NextResponse.json<ApiError>(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' }, 
        { status: 401 }
      );
    }
    
    // 2025 Standard: Validate session ID
    const sessionId = params.id;
    if (!sessionId) {
      return NextResponse.json<ApiError>(
        { error: 'Session ID required', code: 'MISSING_SESSION_ID' }, 
        { status: 400 }
      );
    }
    
    // 2025 Standard: Parse and validate request body
    const body = await request.json();
    const validatedData = forceEndSchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json<ApiError>(
        { 
          error: 'Invalid request data', 
          code: 'VALIDATION_ERROR',
          details: validatedData.error.flatten()
        }, 
        { status: 400 }
      );
    }
    
    const { reason, terminationType, skipBillingProtection, vapiCallCost } = validatedData.data;
    
    // Get the session with user info for validation
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isDeleted: true
          }
        }
      }
    });
    
    if (!session) {
      return NextResponse.json<ApiError>(
        { error: 'Session not found', code: 'NOT_FOUND' }, 
        { status: 404 }
      );
    }
    
    // Verify user owns the session
    if (session.user.email !== authSession.user.email) {
      return NextResponse.json<ApiError>(
        { error: 'Not authorized', code: 'FORBIDDEN' }, 
        { status: 403 }
      );
    }
    
    // Check if session is already ended
    if (['COMPLETED', 'CANCELLED', 'TERMINATED', 'ABANDONED'].includes(session.status)) {
      log.info('Session already ended', { 
        sessionId, 
        currentStatus: session.status 
      });
      
      return NextResponse.json({
        success: true,
        session: {
          id: session.id,
          status: session.status,
          endTime: session.endTime,
          conversationTimeSeconds: session.conversationTimeSeconds,
          vapiCallCost: session.vapiCallCost
        },
        alreadyEnded: true,
        message: 'Session was already ended'
      });
    }
    
    // Calculate session duration for logging
    const conversationTime = session.conversationTimeSeconds || 0;
    const estimatedMinutes = Math.ceil(conversationTime / 60);
    
    // Billing protection warning (unless explicitly skipped)
    if (!skipBillingProtection && conversationTime > 300) { // More than 5 minutes
      log.info('WARNING: Force ending session with significant conversation time', {
        sessionId,
        conversationTimeSeconds: conversationTime,
        estimatedMinutes,
        reason: reason
      });
    }
    
    // 🚨 CRITICAL FIX: Use SessionLifecycleManager for proper credit deduction
    const lifecycleManager = SessionLifecycleManager.getInstance();
    
    // First update session metadata before completion
    await prisma.$transaction(async (tx) => {
      // Update session with force-end metadata
      await tx.session.update({
        where: { id: sessionId },
        data: {
          terminationReason: terminationType,
          notes: session.notes ? 
            `${session.notes}\n\n[Force ended: ${reason}]` : 
            `[Force ended: ${reason}]`,
          vapiCallCost: vapiCallCost || session.vapiCallCost,
          version: session.version + 1
        }
      });
      
      // Create audit log entry
      await tx.auditLog.create({
        data: {
          sessionId: sessionId,
          userId: session.userId,
          action: 'FORCE_END_SESSION',
          entityType: 'Session',
          entityId: sessionId,
          oldValues: {
            status: session.status,
            endTime: session.endTime,
            terminationReason: session.terminationReason
          },
          newValues: {
            status: 'COMPLETED',
            endTime: new Date(),
            terminationReason: terminationType
          },
          changedFields: ['status', 'endTime', 'terminationReason', 'notes'],
          metadata: {
            reason: reason,
            terminationType,
            conversationTimeSeconds: conversationTime,
            estimatedMinutes,
            skipBillingProtection,
            requestedBy: authSession.user.email,
            source: 'force_end_api'
          }
        }
      });
    });
    
    // Complete session with proper credit deduction via SessionLifecycleManager
    await lifecycleManager.completeSession(sessionId, session.userId);
    
    // Get updated session for response
    const completedSession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        endTime: true,
        completedAt: true,
        conversationTimeSeconds: true,
        vapiCallCost: true
      }
    });
    
    const result = { 
      session: completedSession!, 
      alreadyEnded: false 
    };
    
    // NOTE: Cache invalidation is handled by SessionLifecycleManager
    
    // Log the action
    log.info('Session force ended', {
      sessionId,
      userId: session.userId,
      reason,
      terminationType,
      alreadyEnded: result.alreadyEnded,
      conversationTime: result.session.conversationTimeSeconds
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      session: {
        id: result.session.id,
        status: result.session.status,
        endTime: result.session.endTime,
        conversationTimeSeconds: result.session.conversationTimeSeconds,
        vapiCallCost: result.session.vapiCallCost
      },
      alreadyEnded: result.alreadyEnded,
      message: result.alreadyEnded ? 
        'Session was already ended' : 
        'Session ended successfully'
    });
    
  } catch (error) {
    log.error('Failed to force end session', error);
    
    return NextResponse.json<ApiError>(
      { 
        error: 'Failed to end session', 
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }, 
      { status: 500 }
    );
  }
}