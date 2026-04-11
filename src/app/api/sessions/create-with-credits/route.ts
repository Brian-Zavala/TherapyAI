// @ts-nocheck
import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/cache/redis-client';
import { SessionStatus, SessionType } from '@prisma/client';
import { z } from 'zod';
import {
  sessionCreationSchema,
  validateAndSanitizeDuration,
  type PlanType
} from '@/lib/validation/duration-validation';
import { calculateReservationExpiry } from '@/lib/utils/billing-utils';

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
    const session = await getAuthSession();
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
    const validatedData = sessionCreationSchema.parse(body);

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
      // Timeout increased: each query takes ~1300ms due to Supabase latency
      const result = await prisma.$transaction(async (tx) => {
        // 1. Get user with current credits + check concurrent sessions in parallel
        // Also fetch grace period from Redis (non-DB, safe to parallelize)
        const [user, activeSessionsList, graceData] = await Promise.all([
          tx.user.findUnique({
            where: { id: session.user.id },
            include: {
              usageCredits: {
                where: {
                  billingPeriodStart: { lte: new Date() },
                  billingPeriodEnd: { gte: new Date() },
                },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          }),
          tx.session.findMany({
            where: {
              userId: session.user.id,
              status: {
                in: [SessionStatus.ACTIVE, SessionStatus.PAUSED],
              },
            },
            orderBy: { startTime: 'desc' },
            take: 3,
            select: {
              id: true,
              theme: true,
              startTime: true,
              duration: true,
              conversationTimeSeconds: true,
              status: true,
            },
          }),
          redis.get(`payment:grace:${session.user.id}`).catch((redisError) => {
            console.warn(`Redis unavailable for grace period check: ${redisError}`);
            return null;
          }),
        ]);

        if (!user) {
          throw new Error('User not found');
        }

        // 2. Determine plan type from current credits or subscription status
        let planType: PlanType = 'free';

        if (user.usageCredits && user.usageCredits.length > 0) {
          planType = user.usageCredits[0].planType as PlanType;
        } else if (user.subscriptionStatus === 'active' && user.subscriptionId) {
          const subId = user.subscriptionId.toLowerCase();
          if (subId.includes('unlimited')) {
            planType = 'unlimited';
          } else if (subId.includes('growth')) {
            planType = 'growth';
          } else if (subId.includes('essential')) {
            planType = 'essential';
          } else {
            planType = 'essential';
          }
        }

        // 2a. Validate duration for user's plan
        const durationValidation = validateAndSanitizeDuration(validatedData.duration, planType);
        if (!durationValidation.isValid) {
          throw new Error(`INVALID_DURATION:${durationValidation.error}`);
        }
        const sessionDuration = durationValidation.duration;

        // 3. Check concurrent session limits
        const concurrentLimit = CONCURRENT_LIMITS[planType as keyof typeof CONCURRENT_LIMITS] || 1;

        if (activeSessionsList.length >= concurrentLimit) {
          const existingSession = activeSessionsList[0];
          throw {
            code: 'EXISTING_ACTIVE_SESSION',
            message: `You have an active session. Resume it or end it to start a new one.`,
            existingSession: {
              id: existingSession.id,
              theme: existingSession.theme || 'solo',
              startTime: existingSession.startTime?.toISOString() || new Date().toISOString(),
              duration: existingSession.duration,
              conversationTimeSeconds: existingSession.conversationTimeSeconds || 0,
            },
          };
        }

        // 4. Check for payment grace period
        let inGracePeriod = false;

        // If Redis failed (graceData is null from catch), try DB fallback
        if (graceData === null) {
          // Check if user metadata has grace period info (only if Redis was unavailable)
          if (user.metadata && typeof user.metadata === 'object' &&
              'paymentGracePeriod' in user.metadata) {
            const gracePeriodEnd = new Date(user.metadata.paymentGracePeriod as string);
            if (gracePeriodEnd > new Date()) {
              inGracePeriod = true;
              console.log(`User ${session.user.id} in grace period from DB until ${gracePeriodEnd.toISOString()}`);
              throw new Error('GRACE_PERIOD:Cannot start new sessions during payment grace period. Please update your payment method.');
            }
          }
        }

        if (graceData) {
          let grace: any;
          try {
            grace = typeof graceData === 'string' ? JSON.parse(graceData) : graceData;
          } catch (parseError) {
            console.error(`Malformed grace period data for user ${session.user.id}:`, parseError);
            redis.del(`payment:grace:${session.user.id}`).catch(() => {});
            grace = null;
          }

          if (grace && grace.gracePeriodEnd) {
            const gracePeriodEnd = new Date(grace.gracePeriodEnd);

            if (gracePeriodEnd > new Date()) {
              inGracePeriod = true;
              console.log(`User ${session.user.id} in grace period until ${gracePeriodEnd.toISOString()}`);

              let isExistingSession = false;
              if (validatedData.metadata?.continuationOf && grace.activeSessions?.includes(validatedData.metadata.continuationOf)) {
                const existingSession = await tx.session.findFirst({
                  where: {
                    id: validatedData.metadata.continuationOf,
                    userId: session.user.id,
                    status: {
                      in: [SessionStatus.ACTIVE, SessionStatus.PAUSED]
                    }
                  }
                });

                isExistingSession = !!existingSession;

                if (!isExistingSession) {
                  console.warn(`Security Alert: User ${session.user.id} attempted to continue non-existent or unauthorized session ${validatedData.metadata.continuationOf}`);
                }
              }

              if (!isExistingSession) {
                throw new Error('GRACE_PERIOD:Cannot start new sessions during payment grace period. Please update your payment method.');
              }
            }
          }
        }

        // 5. Use credits already loaded from step 1 (no extra query needed)
        const currentCredits = user.usageCredits?.[0] || null;

        if (!currentCredits && !inGracePeriod) {
          throw new Error('NO_CREDITS:No active credit balance found. Please upgrade your subscription.');
        }

        // 6. Check if user has enough credits
        const isUnlimited = planType === 'unlimited';
        const availableCredits = currentCredits
          ? currentCredits.totalCredits + currentCredits.bonusCredits - currentCredits.usedCredits
          : 0;

        if (!isUnlimited && !inGracePeriod && availableCredits < sessionDuration) {
          throw new Error(`INSUFFICIENT_CREDITS:You need ${sessionDuration} minutes but only have ${availableCredits} available.`);
        }

        // 7. Create the session
        let sessionType: 'SOLO' | 'COUPLE' | 'FAMILY' = 'SOLO';
        if (validatedData.therapyType === 'couple') {
          sessionType = 'COUPLE';
        } else if (validatedData.therapyType === 'family') {
          sessionType = 'FAMILY';
        }

        const newSession = await tx.session.create({
          data: {
            userId: session.user.id,
            sessionType: sessionType,
            status: SessionStatus.SCHEDULED,
            date: new Date(),
            duration: sessionDuration,
            assistantId: validatedData.metadata?.assistantId || null,
            theme: validatedData.metadata?.theme || 'AI Therapy Session',
          },
        });

        // 8. Reserve credits inline (avoids nested transaction from creditManager)
        if (!isUnlimited && currentCredits) {
          // Check active reservations for this user (excluding current session)
          const activeReservations = await tx.$queryRaw<any[]>`
            SELECT COALESCE(SUM(minutes), 0) as total
            FROM "CreditReservation"
            WHERE "userId" = ${session.user.id}
              AND status = 'ACTIVE'
              AND "expiresAt" > NOW()
              AND "sessionId" != ${newSession.id}
          `;

          const totalReserved = Number(activeReservations[0]?.total || 0);
          const actualAvailable = availableCredits - totalReserved;

          if (actualAvailable < sessionDuration) {
            throw new Error(`INSUFFICIENT_CREDITS:You need ${sessionDuration} minutes but only have ${actualAvailable} available (${totalReserved} reserved).`);
          }

          // Create reservation record directly using tx
          const reservationId = crypto.randomUUID();
          const expiresAt = calculateReservationExpiry(sessionDuration);

          await tx.$executeRaw`
            INSERT INTO "CreditReservation"
              (id, "userId", "sessionId", minutes, "creditId", "expiresAt", status, "createdAt", "updatedAt")
            VALUES
              (${reservationId}, ${session.user.id}, ${newSession.id}, ${sessionDuration},
               ${currentCredits.id}, ${expiresAt}, 'ACTIVE', NOW(), NOW())
          `;
        }

        // 9. Store family members if provided
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
          creditsReserved: !isUnlimited ? sessionDuration : 0,
          creditsRemaining: !isUnlimited ? availableCredits - sessionDuration : -1,
          planType,
          concurrentSessions: activeSessionsList.length + 1,
          concurrentLimit,
        };
      }, {
        maxWait: 10000,
        timeout: 30000,
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

    // Handle session conflict with existing session data
    if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 'EXISTING_ACTIVE_SESSION') {
      const conflictError = error as any;
      return NextResponse.json({
        success: false,
        error: {
          code: 'EXISTING_ACTIVE_SESSION',
          message: conflictError.message,
          existingSession: conflictError.existingSession,
          requestId,
          timestamp: new Date().toISOString(),
          retryable: false,
        }
      }, { status: 409 });
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
        code === 'GRACE_PERIOD' ? 402 :
        code === 'INVALID_DURATION' ? 400 :
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