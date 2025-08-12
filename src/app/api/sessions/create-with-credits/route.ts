import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { creditManager } from '@/lib/services/credit-manager.service';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { SessionStatus, TherapyType } from '@prisma/client';
import { z } from 'zod';

// Validation schema for session creation with credits
const createSessionSchema = z.object({
  duration: z.number().min(5).max(180),
  therapyType: z.enum(['individual', 'couple', 'family']),
  familyMembers: z.array(z.object({
    name: z.string(),
    age: z.number(),
    relation: z.string(),
  })).optional(),
  metadata: z.record(z.string()).optional(),
});

// Concurrent session limits by plan
const CONCURRENT_LIMITS = {
  free: 1,
  essential: 1,
  growth: 2,
  unlimited: 3,
} as const;

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Please sign in to create a session',
          requestId,
          timestamp: new Date().toISOString(),
          retryable: false,
        }
      }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createSessionSchema.parse(body);

    // Atomic credit validation and session creation
    const lockKey = `session:create:${session.user.id}`;
    const lockValue = crypto.randomUUID();
    
    // Acquire distributed lock to prevent race conditions
    const lockAcquired = await redis.set(lockKey, lockValue, {
      nx: true, // Only set if doesn't exist
      ex: 10,   // 10 second expiry
    });

    if (!lockAcquired) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'CONCURRENT_REQUEST',
          message: 'Another session creation is in progress. Please wait.',
          requestId,
          timestamp: new Date().toISOString(),
          retryable: true,
        }
      }, { status: 429 });
    }

    try {
      // Transaction for atomic session creation with credit validation
      const result = await prisma.$transaction(async (tx) => {
        // 1. Get user with subscription info
        const user = await tx.user.findUnique({
          where: { id: session.user.id },
          include: {
            subscription: true,
          },
        });

        if (!user) {
          throw new Error('User not found');
        }

        // 2. Determine plan type
        const planType = user.subscription?.planType || 'free';

        // 3. Check concurrent session limits
        const activeSessions = await tx.therapySession.count({
          where: {
            userId: session.user.id,
            status: {
              in: [SessionStatus.ACTIVE, SessionStatus.PAUSED],
            },
          },
        });

        const concurrentLimit = CONCURRENT_LIMITS[planType as keyof typeof CONCURRENT_LIMITS] || 1;
        
        if (activeSessions >= concurrentLimit) {
          throw new Error(`CONCURRENT_LIMIT_EXCEEDED:You have reached your limit of ${concurrentLimit} concurrent session(s). Please end an existing session first.`);
        }

        // 4. Get current credits
        const currentCredits = await creditManager.getCurrentCredits(session.user.id);
        
        if (!currentCredits) {
          throw new Error('NO_CREDITS:No active credit balance found. Please upgrade your subscription.');
        }

        // 5. Check if user has enough credits
        const isUnlimited = planType === 'unlimited';
        const availableCredits = currentCredits.totalCredits + currentCredits.bonusCredits - currentCredits.usedCredits;
        
        if (!isUnlimited && availableCredits < validatedData.duration) {
          throw new Error(`INSUFFICIENT_CREDITS:You need ${validatedData.duration} minutes but only have ${availableCredits} available.`);
        }

        // 6. Create the session
        const newSession = await tx.therapySession.create({
          data: {
            userId: session.user.id,
            therapyType: validatedData.therapyType.toUpperCase() as TherapyType,
            status: SessionStatus.SCHEDULED,
            scheduledFor: new Date(),
            sessionLength: validatedData.duration,
            metadata: validatedData.metadata || {},
          },
        });

        // 7. Reserve credits for the session
        if (!isUnlimited) {
          await creditManager.reserveCredits(
            session.user.id,
            newSession.id,
            validatedData.duration
          );
        }

        // 8. Store family members if provided
        if (validatedData.therapyType === 'family' && validatedData.familyMembers?.length) {
          await tx.familyMember.createMany({
            data: validatedData.familyMembers.map(member => ({
              userId: session.user.id,
              sessionId: newSession.id,
              name: member.name,
              age: member.age,
              relation: member.relation,
            })),
          });
        }

        return {
          session: newSession,
          creditsReserved: !isUnlimited ? validatedData.duration : 0,
          creditsRemaining: !isUnlimited ? availableCredits - validatedData.duration : -1,
          planType,
          concurrentSessions: activeSessions + 1,
          concurrentLimit,
        };
      });

      // 9. Invalidate relevant caches
      await Promise.all([
        redis.del(`credits:${session.user.id}:current`),
        redis.del(`sessions:active:${session.user.id}`),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          sessionId: result.session.id,
          status: result.session.status,
          duration: result.session.sessionLength,
          creditsReserved: result.creditsReserved,
          creditsRemaining: result.creditsRemaining,
          planType: result.planType,
          concurrentInfo: {
            current: result.concurrentSessions,
            limit: result.concurrentLimit,
          },
        },
        requestId,
        timestamp: new Date().toISOString(),
      });

    } finally {
      // Always release the lock
      const currentLock = await redis.get(lockKey);
      if (currentLock === lockValue) {
        await redis.del(lockKey);
      }
    }

  } catch (error) {
    console.error(`[${requestId}] Session creation error:`, error);

    // Parse error messages
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
          requestId,
          timestamp: new Date().toISOString(),
          retryable: false,
        }
      }, { status: 400 });
    }

    if (error instanceof Error) {
      // Parse custom error codes
      const [code, message] = error.message.includes(':') 
        ? error.message.split(':', 2) 
        : ['INTERNAL_ERROR', error.message];

      const statusCode = 
        code === 'CONCURRENT_LIMIT_EXCEEDED' ? 409 :
        code === 'INSUFFICIENT_CREDITS' ? 402 :
        code === 'NO_CREDITS' ? 402 :
        500;

      return NextResponse.json({
        success: false,
        error: {
          code,
          message: message || 'Failed to create session',
          requestId,
          timestamp: new Date().toISOString(),
          retryable: code === 'CONCURRENT_REQUEST',
        }
      }, { status: statusCode });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        requestId,
        timestamp: new Date().toISOString(),
        retryable: true,
      }
    }, { status: 500 });
  }
}