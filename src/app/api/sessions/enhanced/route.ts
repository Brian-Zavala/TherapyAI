// @ts-nocheck
import { getAuthSession } from '@/lib/auth'
/**
 * Enhanced Session API Route
 * Supports intelligent scheduling, recurring sessions, and calendar integrations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-optimized';
import { z } from 'zod';
import { strictDurationSchema } from '@/lib/validation/duration-validation';
import { EnhancedReminderEngine } from '@/lib/enhanced-scheduler/reminder-engine';
import { CalendarIntegrationService } from '@/lib/enhanced-scheduler/calendar-integration';
import { Logger } from '@/lib/enhanced-scheduler/logging';

// Request validation schema
const CreateSessionSchema = z.object({
  date: z.string().datetime(),
  duration: strictDurationSchema.default(30),
  theme: z.string().min(1).max(255).default('AI Therapy Session'),
  notes: z.string().max(1000).optional(),
  notificationPrefs: z.string().default('email'),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
  userPreferences: z.object({
    sessionPreference: z.string().optional(),
    preferredDays: z.array(z.string()).optional(),
    sessionFrequency: z.string().optional(),
    recurringSession: z.string().optional(),
    reminderTiming: z.string().optional(),
    timeZone: z.string().optional(),
    communicationStyle: z.string().optional(),
  }).optional(),
  calendarIntegrations: z.array(z.object({
    provider: z.enum(['google', 'outlook', 'exchange']),
    enabled: z.boolean(),
    syncing: z.boolean()
  })).optional(),
  intelligentScheduling: z.boolean().default(true)
});

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateSessionSchema.parse(body);

    console.log('Creating enhanced session:', {
      userId: session.user.id,
      date: validatedData.date,
      isRecurring: validatedData.isRecurring,
      intelligentScheduling: validatedData.intelligentScheduling
    });

    // Get user profile for enhanced features
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        profile: true,
        familyMembers: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse session date
    const sessionDate = new Date(validatedData.date);
    
    // Validate session date
    if (sessionDate <= new Date()) {
      return NextResponse.json({ 
        error: 'Session date must be in the future' 
      }, { status: 400 });
    }

    let createdSession;
    let recurringSeriesId = null;

    // Use transaction for session creation
    const result = await prisma.$transaction(async (tx) => {
      // Create the main session
      const session = await tx.session.create({
        data: {
          userId: user.id,
          date: sessionDate,
          duration: validatedData.duration,
          theme: validatedData.theme,
          notes: validatedData.notes || '',
          status: 'SCHEDULED',
          assistantId: user.profile?.assistantId || null,
          sessionType: 'COUPLE'
        }
      });

      return { session };
    });

    createdSession = result.session;

    // Initialize services
    const reminderEngine = new EnhancedReminderEngine();
    const calendarIntegration = new CalendarIntegrationService();
    const logger = new Logger('SessionsEnhancedAPI');

    // Schedule reminders based on user preferences
    try {
      if (validatedData.userPreferences?.reminderTiming) {
        await reminderEngine.createReminderJobs(
          createdSession.id,
          user.id,
          sessionDate,
          validatedData.userPreferences.timeZone || 'UTC'
        );

        logger.info('Reminders scheduled for session', {
          sessionId: createdSession.id,
          userId: user.id,
          event: 'REMINDERS_SCHEDULED',
          reminderTiming: validatedData.userPreferences.reminderTiming,
          notificationMethod: user.profile?.notificationPrefs || 'email'
        });
      }
    } catch (reminderError) {
      logger.error('Failed to schedule reminders', reminderError, {
        sessionId: createdSession.id,
        userId: user.id
      });
      // Continue without failing the session creation
    }

    // Create calendar events if integrations are enabled
    try {
      const enabledIntegrations = validatedData.calendarIntegrations?.filter(ci => ci.enabled) || [];
      if (enabledIntegrations.length > 0) {
        const calendarEvent = {
          title: validatedData.theme,
          description: `Therapy session: ${validatedData.theme}${validatedData.notes ? `\n\nNotes: ${validatedData.notes}` : ''}`,
          startTime: sessionDate,
          endTime: new Date(sessionDate.getTime() + (validatedData.duration * 60 * 1000)),
          location: 'Online Therapy Session',
          attendees: [{ email: user.email }],
          timeZone: validatedData.userPreferences?.timeZone || 'UTC'
        };

        const calendarResults = await calendarIntegration.createCalendarEvent(
          user.id,
          calendarEvent,
          enabledIntegrations.map(ci => ci.provider)
        );

        logger.info('Calendar events created', {
          sessionId: createdSession.id,
          userId: user.id,
          event: 'CALENDAR_EVENTS_CREATED',
          results: calendarResults,
          integrationCount: enabledIntegrations.length
        });
      }
    } catch (calendarError) {
      logger.error('Failed to create calendar events', calendarError, {
        sessionId: createdSession.id,
        userId: user.id
      });
      // Continue without failing the session creation
    }

    // Handle recurring sessions if enabled
    if (validatedData.isRecurring && validatedData.recurringFrequency) {
      try {
        // Create additional recurring sessions (simplified implementation)
        const recurringDates = generateRecurringDates(
          sessionDate,
          validatedData.recurringFrequency,
          4 // Create 4 future sessions
        );

        const recurringSessionsData = recurringDates.map(date => ({
          userId: user.id,
          date,
          duration: validatedData.duration,
          theme: `${validatedData.theme} (Recurring)`,
          notes: `${validatedData.notes || ''}\n\nPart of recurring series`,
          status: 'SCHEDULED' as const,
          assistantId: user.profile?.assistantId || null,
          sessionType: 'COUPLE'
        }));

        await prisma.session.createMany({
          data: recurringSessionsData
        });

        recurringSeriesId = `series_${user.id}_${Date.now()}`;
        
        console.log('Recurring sessions created:', {
          seriesId: recurringSeriesId,
          sessionId: createdSession.id,
          count: recurringSessionsData.length
        });
      } catch (recurringError) {
        console.error('Failed to create recurring sessions:', recurringError);
        // Continue with single session creation
      }
    }

    // Prepare response
    const response = {
      success: true,
      session: {
        id: createdSession.id,
        date: createdSession.date,
        duration: createdSession.duration,
        theme: createdSession.theme,
        notes: createdSession.notes,
        status: createdSession.status
      },
      recurringSeriesId,
      enhancedFeatures: {
        intelligentScheduling: validatedData.intelligentScheduling,
        remindersCreated: true,
        calendarIntegration: validatedData.calendarIntegrations?.some(ci => ci.enabled) || false,
        recurringEnabled: validatedData.isRecurring
      },
      message: recurringSeriesId 
        ? 'Session and recurring series created successfully'
        : 'Session created successfully'
    };

    console.log('Enhanced session created successfully:', {
      sessionId: createdSession.id,
      recurringSeriesId,
      userId: user.id
    });

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Failed to create enhanced session:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json({
        error: 'Failed to create session',
        message: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper function to generate recurring dates
function generateRecurringDates(
  startDate: Date, 
  frequency: 'weekly' | 'biweekly' | 'monthly',
  count: number
): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);

  for (let i = 0; i < count; i++) {
    switch (frequency) {
      case 'weekly':
        currentDate = new Date(currentDate.getTime() + (7 * 24 * 60 * 60 * 1000));
        break;
      case 'biweekly':
        currentDate = new Date(currentDate.getTime() + (14 * 24 * 60 * 60 * 1000));
        break;
      case 'monthly':
        currentDate = new Date(currentDate);
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
    }
    dates.push(new Date(currentDate));
  }

  return dates;
}

// GET method for enhanced session retrieval
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');
    const includeMetrics = searchParams.get('includeMetrics') === 'true';

    if (sessionId) {
      // Get specific session with enhanced data
      const sessionData = await prisma.session.findFirst({
        where: {
          id: sessionId,
          userId: session.user.id
        },
        include: {
          transcriptEntries: includeMetrics,
          communicationMetrics: includeMetrics,
          progressTracking: includeMetrics,
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!sessionData) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      return NextResponse.json({
        session: sessionData,
        enhancedFeatures: {
          hasEnhancedScheduling: true,
          hasReminders: true,
          hasCalendarIntegration: false
        }
      });

    } else {
      // Get all sessions for user with pagination
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const skip = (page - 1) * limit;

      const [sessions, total] = await Promise.all([
        prisma.session.findMany({
          where: { userId: session.user.id },
          orderBy: { date: 'desc' },
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
            status: true,
            sessionType: true,
            assistantId: true,
            isPaused: true,
            conversationTimeSeconds: true,
            totalPausedTimeSeconds: true,
            completedAt: true,
            createdAt: true,
            updatedAt: true,
            // Omit: notes (large TEXT, fetch via detail endpoint)
            communicationMetrics: includeMetrics,
            progressTracking: includeMetrics
          }
        }),
        prisma.session.count({
          where: { userId: session.user.id }
        })
      ]);

      return NextResponse.json({
        sessions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrevious: page > 1
        }
      });
    }

  } catch (error) {
    console.error('Failed to retrieve sessions:', error);
    return NextResponse.json({
      error: 'Failed to retrieve sessions'
    }, { status: 500 });
  }
}