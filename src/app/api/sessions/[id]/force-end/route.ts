// src/app/api/sessions/[id]/force-end/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma-optimized';
import { authOptions } from '@/lib/auth';
import { sessionCache, cacheKeys } from '@/lib/session-cache';
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
    
    // 2025 Standard: Use transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Get the session with user info
      const session = await tx.session.findUnique({
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
        throw new Error('Session not found');
      }
      
      // Verify user owns the session
      if (session.user.email !== authSession.user.email) {
        throw new Error('Not authorized to end this session');
      }
      
      // Check if session is already ended
      if (['COMPLETED', 'CANCELLED', 'TERMINATED', 'ABANDONED'].includes(session.status)) {
        log.info('Session already ended', { 
          sessionId, 
          currentStatus: session.status 
        });
        return { session, alreadyEnded: true };
      }
      
      // Calculate session duration and estimated cost
      const conversationTime = session.conversationTimeSeconds || 0;
      const estimatedMinutes = Math.ceil(conversationTime / 60);
      const estimatedCost = estimatedMinutes * 0.13; // $0.13 per minute
      
      // Billing protection check (unless explicitly skipped)
      if (!skipBillingProtection && conversationTime > 0) {
        // Log warning for sessions with significant conversation time
        if (conversationTime > 300) { // More than 5 minutes
          log.info('WARNING: Ending session with significant conversation time', {
            sessionId,
            conversationTimeSeconds: conversationTime,
            estimatedCost: estimatedCost.toFixed(2),
            reason: reason
          });
        }
      }
      
      // Update the session
      const updatedSession = await tx.session.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          endTime: new Date(),
          completedAt: new Date(),
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
            estimatedCost: estimatedCost,
            skipBillingProtection,
            requestedBy: authSession.user.email
          }
        }
      });
      
      return { session: updatedSession, alreadyEnded: false };
    });
    
    // 2025 Standard: Invalidate caches
    sessionCache.invalidate(cacheKeys.userSessions(result.session.userId));
    sessionCache.invalidate(cacheKeys.session(sessionId));
    
    // Log the action
    log.info('Session force ended', {
      sessionId,
      userId: result.session.userId,
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
    
    if (error instanceof Error) {
      if (error.message === 'Session not found') {
        return NextResponse.json<ApiError>(
          { error: 'Session not found', code: 'NOT_FOUND' }, 
          { status: 404 }
        );
      }
      
      if (error.message === 'Not authorized to end this session') {
        return NextResponse.json<ApiError>(
          { error: 'Not authorized', code: 'FORBIDDEN' }, 
          { status: 403 }
        );
      }
    }
    
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