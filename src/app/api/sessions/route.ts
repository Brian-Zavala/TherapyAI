// src/app/api/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma-optimized';
import { authOptions } from '@/lib/auth';
import { Resend } from 'resend';
import SessionConfirmationEmail from '@/emails/SessionConfirmation';
import { sendSessionConfirmation } from '@/lib/sms-service';
import { sessionCache, cacheKeys } from '@/lib/session-cache';
import { validateEmailEnvironment } from '@/lib/env-validation';
import { z } from 'zod';
import type { Session, User } from '@prisma/client';

// Utility to convert frontend sessionType to Prisma enum
function sessionTypeToPrismaEnum(sessionType: string): 'SOLO' | 'COUPLE' | 'FAMILY' {
  switch (sessionType.toLowerCase()) {
    case 'solo': 
    case 'individual':
      return 'SOLO';
    case 'couple':
      return 'COUPLE';  
    case 'family':
      return 'FAMILY';
    default:
      return 'SOLO'; // fallback
  }
}

// 2025 Standard: Type definitions
// Define a type for the selected session fields to avoid type mismatches
type SelectedSessionFields = {
  id: string;
  userId: string;
  date: Date;
  startTime: Date | null;
  endTime: Date | null;
  duration: number;
  theme: string;
  notes: string | null;
  status: string;
  assistantId: string | null;
  isPaused: boolean;
  conversationTimeSeconds: number;
  totalPausedTimeSeconds: number;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    transcriptEntries: number;
  };
  transcriptEntries?: Array<{
    id: string;
    sessionId: string;
    speaker: string;
    text: string;
    timestamp: Date;
    isFinal: boolean;
  }>;
};

interface SessionWithCounts extends Omit<SelectedSessionFields, '_count' | 'transcriptEntries'> {
  transcriptCount: number;
  transcriptEntries: Array<{
    id: string;
    sessionId: string;
    speaker: string;
    text: string;
    timestamp: Date;
    isFinal: boolean;
  }>;
}

interface ApiError {
  error: string;
  code?: string;
  details?: any;
}

// 2025 Standard: Status conversion helpers
const apiStatusToPrisma = (status: string): string => {
  return status.toUpperCase();
};

const prismaStatusToApi = (status: string): string => {
  return status.toLowerCase();
};

// 2025 Standard: Validation schemas
const createSessionSchema = z.object({
  startTime: z.string().optional(),
  date: z.string().optional(),
  theme: z.string().default('AI Therapy Session'),
  // API accepts lowercase status values for consistency with frontend
  // These are converted to uppercase for Prisma's SessionStatus enum
  status: z.enum(['scheduled', 'active', 'completed', 'cancelled']).default('scheduled'),
  forceNew: z.boolean().optional().default(false),
  duration: z.number().min(15).max(240).default(60),
  notes: z.string().max(500).default(''),
  assistantId: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.enum(['weekly', 'biweekly', 'monthly']).nullable().default(null),
  // CRITICAL FIX: Add sessionType to ensure accurate therapy type tracking
  // Accept both lowercase and uppercase, default to lowercase for consistency with frontend
  sessionType: z.enum(['couple', 'family', 'solo', 'COUPLE', 'FAMILY', 'SOLO']).default('solo'),
  linkedSessionId: z.string().optional() // Link to scheduled session for tracking
});

// 2025 Standard: Lazy initialization
let resend: Resend | null = null;
const getResendClient = () => {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

// 2025 Standard: Structured logging
const log = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Sessions API] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  },
  error: (message: string, error: any) => {
    console.error(`[Sessions API] ${message}`, {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
};

export async function GET(request: NextRequest) {
  try {
    // 2025 Standard: Early auth check with proper typing
    const authSession = await getServerSession(authOptions);
    if (!authSession?.user?.email) {
      return NextResponse.json<ApiError>(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' }, 
        { status: 401 }
      );
    }
    
    // 2025 Standard: Secure user lookup without auto-creation
    const user = await prisma.user.findUnique({
      where: { email: authSession.user.email },
      select: { 
        id: true, 
        email: true,
        isDeleted: true 
      }
    });
    
    if (!user) {
      return NextResponse.json<ApiError>(
        { error: 'User not found', code: 'USER_NOT_FOUND' }, 
        { status: 404 }
      );
    }
    
    // 2025 Standard: Check if account is active
    if (user.isDeleted === true) {
      return NextResponse.json<ApiError>(
        { error: 'Account is deleted', code: 'ACCOUNT_DELETED' }, 
        { status: 403 }
      );
    }
    
    // 2025 Standard: Query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const statusParam = searchParams.get('status');
    const status = statusParam ? apiStatusToPrisma(statusParam) as Session['status'] : null;
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    
    // Check cache with query params
    const cacheKey = `${cacheKeys.userSessions(user.id)}:${page}:${limit}:${status}:${sortBy}:${sortOrder}`;
    const cachedSessions = sessionCache.get<SessionWithCounts[]>(cacheKey);
    
    if (cachedSessions) {
      log.info(`Cache hit: ${cachedSessions.length} sessions`);
      return NextResponse.json(cachedSessions);
    }
    
    // 2025 Standard: Optimized query with pagination
    const skip = (page - 1) * limit;
    const [sessions, totalCount] = await prisma.$transaction([
      prisma.session.findMany({
        where: {
          userId: user.id,
          ...(status && { status })
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          date: true,
          startTime: true,
          endTime: true,
          duration: true,
          theme: true,
          notes: true,
          status: true,
          assistantId: true,
          isPaused: true,
          conversationTimeSeconds: true,
          totalPausedTimeSeconds: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              transcriptEntries: true
            }
          },
          transcriptEntries: {
            orderBy: {
              timestamp: 'asc'
            },
            take: 100 // Limit to prevent overfetching for list view
          }
        }
      }),
      prisma.session.count({
        where: {
          userId: user.id,
          ...(status && { status })
        }
      })
    ]);
    
    // 2025 Standard: Transform with proper typing
    const sessionsWithCounts: SessionWithCounts[] = sessions.map(session => ({
      ...session,
      transcriptCount: session._count.transcriptEntries,
      transcriptEntries: session.transcriptEntries || []
    }));
    
    // Cache with TTL
    sessionCache.set(cacheKey, sessionsWithCounts, 300); // 5 minute cache
    
    // 2025 Standard: Return with pagination metadata
    return NextResponse.json({
      data: sessionsWithCounts,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrevious: page > 1
      }
    });
  } catch (error) {
    log.error('Failed to fetch sessions', error);
    return NextResponse.json<ApiError>(
      { 
        error: 'Failed to fetch sessions', 
        code: 'FETCH_ERROR',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 2025 Standard: Auth check
    const authSession = await getServerSession(authOptions);
    if (!authSession?.user?.email) {
      return NextResponse.json<ApiError>(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' }, 
        { status: 401 }
      );
    }
    
    // 2025 Standard: Parse and validate request body (only read once)
    const body = await request.json();
    const validatedData = createSessionSchema.safeParse(body);
    
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
    
    const data = validatedData.data;
    
    // Note: Rate limiting is now handled by middleware
    // The middleware already checked rate limits based on the route config
  
    // 2025 Standard: User lookup with proper error handling
    const user = await prisma.user.findUnique({
      where: { email: authSession.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        isDeleted: true,
        profile: true
      }
    });
    
    if (!user) {
      return NextResponse.json<ApiError>(
        { error: 'User not found', code: 'USER_NOT_FOUND' }, 
        { status: 404 }
      );
    }
    
    if (user.isDeleted === true) {
      return NextResponse.json<ApiError>(
        { error: 'Account is deleted', code: 'ACCOUNT_DELETED' }, 
        { status: 403 }
      );
    }
    
    // 2025 Standard: Date validation with proper error handling
    let sessionDate: Date;
    
    if (data.startTime && data.startTime !== 'Invalid Date') {
      sessionDate = new Date(data.startTime);
    } else if (data.date && data.date !== 'Invalid Date') {
      sessionDate = new Date(data.date);
    } else {
      sessionDate = new Date();
    }
    
    if (isNaN(sessionDate.getTime())) {
      return NextResponse.json<ApiError>(
        { error: 'Invalid date provided', code: 'INVALID_DATE' }, 
        { status: 400 }
      );
    }
    
    // 2025 Standard: Validate session time is not in the past for scheduled sessions
    if (data.status === 'scheduled' && sessionDate < new Date()) {
      return NextResponse.json<ApiError>(
        { error: 'Cannot schedule session in the past', code: 'PAST_DATE' }, 
        { status: 400 }
      );
    }
    
    // 2025 Standard: Use transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      
      // 2025 Standard: Handle existing active sessions with user choice
      if (data.status === 'active') {
        const existingActiveSession = await tx.session.findFirst({
          where: {
            userId: user.id,
            status: 'ACTIVE'
          },
          orderBy: { date: 'desc' }
        });
        
        if (existingActiveSession) {
          // Calculate session age and remaining time for informational purposes only
          const sessionStartTime = existingActiveSession.startTime || existingActiveSession.date;
          const hoursAgo = (Date.now() - new Date(sessionStartTime).getTime()) / (1000 * 60 * 60);
          const conversationTime = existingActiveSession.conversationTimeSeconds || 0;
          const duration = existingActiveSession.duration || 60;
          const remainingMinutes = duration - (conversationTime / 60);
          
          // Log session state for debugging - NO auto-expiration
          log.info('Existing active session found', { 
            sessionId: existingActiveSession.id,
            startTime: existingActiveSession.startTime,
            hoursAgo: Math.round(hoursAgo),
            conversationTime: conversationTime,
            duration: duration,
            remainingMinutes: remainingMinutes
          });
          
          // Check if user wants to force new session
          const forceNew = data.forceNew === true;
          
          if (!forceNew) {
            // Return existing session info with conflict status
            // Frontend must handle this and give user choice
            throw new Error(JSON.stringify({
              code: 'EXISTING_ACTIVE_SESSION',
              existingSession: {
                id: existingActiveSession.id,
                theme: existingActiveSession.theme,
                startTime: existingActiveSession.startTime,
                duration: existingActiveSession.duration,
                conversationTimeSeconds: existingActiveSession.conversationTimeSeconds,
                remainingMinutes: remainingMinutes,
                hoursAgo: hoursAgo
              }
            }));
          }
          
          // User explicitly wants new session - end the current one
          log.info('User requested to end existing session and start new one', { 
            existingSessionId: existingActiveSession.id 
          });
          
          await tx.session.update({
            where: { id: existingActiveSession.id },
            data: { 
              status: 'COMPLETED',
              endTime: new Date(),
              terminationReason: 'user_started_new_session',
              notes: existingActiveSession.notes + '\n\n[Session ended by user to start new session]'
            }
          });
        }
      }
      
      // Create the main session
      const newSession = await tx.session.create({
        data: {
          userId: user.id,
          date: sessionDate,
          startTime: data.status === 'active' ? sessionDate : null,
          duration: data.duration,
          theme: data.theme,
          notes: data.notes,
          status: apiStatusToPrisma(data.status) as any, // Convert to uppercase for Prisma enum
          assistantId: data.assistantId || user.profile?.assistantId || null,
          isPaused: false,
          conversationTimeSeconds: 0,
          totalPausedTimeSeconds: 0,
          // CRITICAL FIX: Store the actual therapy type with proper enum conversion
          sessionType: sessionTypeToPrismaEnum(data.sessionType)
        }
      });
      
      // Handle linked scheduled session - update its status when therapy starts
      if (data.linkedSessionId && data.status === 'active') {
        log.info('Updating linked scheduled session', { 
          linkedSessionId: data.linkedSessionId,
          newSessionId: newSession.id 
        });
        
        // Update the scheduled session to indicate therapy has started
        await tx.session.update({
          where: { 
            id: data.linkedSessionId,
            userId: user.id // Ensure user owns the session
          },
          data: {
            status: 'ACTIVE',
            startTime: sessionDate,
            notes: (await tx.session.findUnique({
              where: { id: data.linkedSessionId },
              select: { notes: true }
            }))?.notes + `\n\n[Therapy started with session ${newSession.id}]`
          }
        }).catch(error => {
          // Log error but don't fail the whole transaction
          log.error('Failed to update linked session', error);
        });
      }
      
      // 2025 Standard: Handle recurring sessions in transaction
      const recurringSessionIds: string[] = [];
      if (data.isRecurring && data.recurringFrequency && data.status === 'scheduled') {
        const nextDate = new Date(sessionDate);
        
        for (let i = 0; i < 4; i++) {
          switch (data.recurringFrequency) {
            case 'weekly':
              nextDate.setDate(nextDate.getDate() + 7);
              break;
            case 'biweekly':
              nextDate.setDate(nextDate.getDate() + 14);
              break;
            case 'monthly':
              nextDate.setMonth(nextDate.getMonth() + 1);
              break;
          }
          
          const recurringSession = await tx.session.create({
            data: {
              userId: user.id,
              date: new Date(nextDate),
              duration: data.duration,
              theme: data.theme,
              notes: `${data.notes} (Recurring session)`,
              status: 'SCHEDULED',
              assistantId: data.assistantId || user.profile?.assistantId || null
            }
          });
          
          recurringSessionIds.push(recurringSession.id);
        }
      }
      
      return { newSession, recurringSessionIds };
    });
      
    // 2025 Standard: Invalidate caches after successful creation
    sessionCache.invalidate(cacheKeys.userSessions(user.id));
    
    // 2025 Standard: Send email asynchronously without blocking response
    const isImmediateSession = data.status === 'active' || 
      (sessionDate.getTime() - new Date().getTime() < 5 * 60 * 1000);
    
    if (!isImmediateSession && data.status === 'scheduled') {
      // Fire and forget email sending
      Promise.resolve().then(async () => {
        try {
          const emailValidation = validateEmailEnvironment();
          const resendClient = getResendClient();
          
          if (!emailValidation.isValid || !resendClient) {
            log.error('Email environment not configured', emailValidation.missingVars);
            return;
          }
          
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          await resendClient.emails.send({
            from: `Therapy Support <${process.env.EMAIL_FROM}>`,
            to: user.email,
            subject: 'Your Therapy Session is Scheduled',
            react: SessionConfirmationEmail({
              username: user.name || 'Valued Client',
              sessionDate: sessionDate,
              duration: data.duration,
              theme: data.theme,
              notes: data.notes,
              baseUrl: baseUrl,
            }),
          });
          
          log.info('Confirmation email sent', { userId: user.id, sessionId: result.newSession.id });
        } catch (emailError) {
          log.error('Failed to send confirmation email', emailError);
        }
      });
    }
      
    // 2025 Standard: Return comprehensive response
    return NextResponse.json({
      session: result.newSession,
      recurringSessionsCreated: result.recurringSessionIds.length,
      recurringSessionIds: result.recurringSessionIds
    }, { status: 201 });
    
  } catch (error) {
    // 2025 Standard: Structured error handling
    if (error instanceof Error) {
      // Handle existing active session
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.code === 'EXISTING_ACTIVE_SESSION') {
          return NextResponse.json(
            { 
              error: 'An active session already exists', 
              code: 'EXISTING_ACTIVE_SESSION',
              existingSession: errorData.existingSession,
              message: 'Resume existing session or explicitly end it to start new' 
            }, 
            { status: 409 }
          );
        }
      } catch {
        // Not a JSON error, continue with normal error handling
      }
      
      // Legacy duplicate session error
      if (error.message === 'DUPLICATE_ACTIVE_SESSION') {
        return NextResponse.json<ApiError>(
          { 
            error: 'An active session already exists', 
            code: 'DUPLICATE_ACTIVE_SESSION' 
          }, 
          { status: 409 }
        );
      }
    }
    
    log.error('Failed to create session', error);
    
    return NextResponse.json<ApiError>(
      { 
        error: 'Failed to create session', 
        code: 'CREATE_ERROR',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }, 
      { status: 500 }
    );
  }
}