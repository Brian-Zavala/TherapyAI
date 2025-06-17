// src/app/api/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { Resend } from 'resend';
import SessionConfirmationEmail from '@/emails/SessionConfirmation';
import { sendSessionConfirmation } from '@/lib/sms-service'; // Currently using mock implementation
import { sessionCache, cacheKeys } from '@/lib/session-cache';
import { validateEmailEnvironment } from '@/lib/env-validation';
import { rateLimitManager } from '@/lib/rate-limit-manager';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  const authSession = await getServerSession(authOptions);
  
  console.log('Auth session:', JSON.stringify(authSession, null, 2));
  
  if (!authSession?.user) {
    console.log('No authenticated user found');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    console.log('User email from session:', authSession.user.email);
    
    // Find the user by email
    let user = await prisma.user.findUnique({
      where: { 
        email: authSession.user.email as string 
      }
    });
    
    // Auto-create user if they don't exist in Prisma but have a valid session
    if (!user && authSession.user.email) {
      console.log(`Auto-creating user in database for ${authSession.user.email}`);
      
      try {
        user = await prisma.user.create({
          data: {
            email: authSession.user.email,
            name: authSession.user.name || authSession.user.email.split('@')[0],
            password: 'SESSION_CREATED_USER', // Placeholder password
          }
        });
        console.log('User auto-created successfully:', user.id);
      } catch (createError) {
        console.error('Error auto-creating user:', createError);
        return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 });
      }
    }
    
    if (!user) {
      console.log('User not found in database and could not be created:', authSession.user.email);
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }
    
    console.log('Found/created user in database:', user.id);
    
    // Check cache first
    const cacheKey = cacheKeys.userSessions(user.id);
    const cachedSessions = sessionCache.get<Array<{id: string, transcriptCount: number, transcriptEntries: unknown[]}>>(cacheKey);
    
    if (cachedSessions) {
      console.log(`Returning ${cachedSessions.length} cached sessions for user`);
      return NextResponse.json(cachedSessions);
    }
    
    // Fetch sessions for this user without transcript entries first
    // This prevents timeout issues with large datasets
    const sessions = await prisma.session.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        date: 'desc'
      },
      take: 50 // Limit to most recent 50 sessions
    });
    
    // For performance, return sessions without transcript counts
    // Transcript counts can be fetched on-demand when viewing individual sessions
    const sessionsWithCounts = sessions.map(session => ({
      ...session,
      transcriptCount: 0, // Will be loaded on-demand if needed
      transcriptEntries: [] // Empty array, transcripts fetched separately
    }));
    
    // Cache the results
    sessionCache.set(cacheKey, sessionsWithCounts);
    
    // IMPORTANT: do not filter out or delete any sessions or transcripts automatically
    // This ensures all data created by the user is preserved
    console.log(`Returning all ${sessionsWithCounts.length} sessions without filtering any data`);
    
    console.log(`Found ${sessionsWithCounts.length} sessions for user`);
    return NextResponse.json(sessionsWithCounts);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch sessions' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authSession = await getServerSession(authOptions);
  
  console.log('POST /api/sessions - Auth session:', JSON.stringify(authSession, null, 2));
  
  if (!authSession?.user) {
    console.log('No authenticated user found');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Find user first to get ID for rate limiting
  const userEmail = authSession.user.email as string;
  const preliminaryUser = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { id: true }
  });
  
  // Rate limiting check - using userId if available
  const clientId = preliminaryUser?.id || userEmail;
  const userType = (authSession.user as any)?.type || 'standard';
  
  const rateLimitResult = await rateLimitManager.checkLimits(
    clientId,
    'session-creation',
    { 
      endpoint: '/api/sessions',
      userType 
    }
  );
  
  if (!rateLimitResult.allowed) {
    const response = NextResponse.json(
      { 
        error: "Too many session creation attempts. Please try again later.",
        retryAfter: rateLimitResult.nextRetryAfter 
      },
      { status: 429 }
    );
    
    if (rateLimitResult.nextRetryAfter) {
      response.headers.set('Retry-After', rateLimitResult.nextRetryAfter.toString());
    }
    
    return response;
  }
  
  try {
    console.log('User email from session:', authSession.user.email);
    
    // Find the user by email
    let user = await prisma.user.findUnique({
      where: { 
        email: authSession.user.email as string 
      }
    });
    
    // Auto-create user if they don't exist in Prisma but have a valid session
    if (!user && authSession.user.email) {
      console.log(`Auto-creating user in database for ${authSession.user.email}`);
      
      try {
        user = await prisma.user.create({
          data: {
            email: authSession.user.email,
            name: authSession.user.name || authSession.user.email.split('@')[0],
            password: 'SESSION_CREATED_USER', // Placeholder password
          }
        });
        console.log('User auto-created successfully:', user.id);
      } catch (createError) {
        console.error('Error auto-creating user:', createError);
        return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 });
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }
    
    // Get the request body
    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2)); // Detailed logging
    
    // Extract data with safer defaults and validation
    const { 
      startTime, 
      date,
      theme = 'AI Therapy Session', 
      status = 'scheduled', 
      duration = 60, 
      notes = '',
      notificationPrefs,
      assistantId = '', // New field to capture assistant ID
      context = {}, // Capture but ignore context data (it doesn't go in the DB)
      isRecurring = false,
      recurringFrequency = null
    } = body;
    
    // Validate date input
    let sessionDate: Date;
    
    if (startTime && startTime !== 'Invalid Date') {
      sessionDate = new Date(startTime);
    } else if (date && date !== 'Invalid Date') {
      sessionDate = new Date(date);
    } else {
      // Default to current time if no valid date is provided
      sessionDate = new Date();
    }
    
    // Verify we have a valid date
    if (isNaN(sessionDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date provided' }, 
        { status: 400 }
      );
    }
    
    // Log the data we're about to save
    console.log('Creating session with data:', {
      userId: user.id,
      date: sessionDate,
      duration: Number(duration),
      theme,
      notes,
      status
    });
    
    try {
      // Get user's notification preferences from their profile
      const userProfile = await prisma.user.findUnique({
        where: { id: user.id },
        select: { notificationPrefs: true }
      });
      
      // Use user's preference or default to 'email' if not set
      const effectiveNotificationPrefs = userProfile?.notificationPrefs || 'email';
      
      // Check for existing active session to prevent duplicates
      if (status === 'active') {
        const existingActiveSession = await prisma.session.findFirst({
          where: {
            userId: user.id,
            status: 'active'
          },
          orderBy: {
            date: 'desc'
          }
        });
        
        if (existingActiveSession) {
          console.log(`🚨 DUPLICATE SESSION PREVENTION: Found existing active session ${existingActiveSession.id}, returning it instead of creating new one`);
          return NextResponse.json(existingActiveSession);
        }
      }
      
      // Create session using the fields from your schema
      const newSession = await prisma.session.create({
        data: {
          userId: user.id,
          date: sessionDate,
          startTime: status === 'active' ? sessionDate : null, // Set startTime only for active sessions
          duration: Number(duration),
          theme,
          notes,
          status,
          notificationPrefs: effectiveNotificationPrefs,
          assistantId: assistantId // Store the assistant ID from Vapi
        }
      });
      
      console.log('Session created successfully:', newSession.id);
      
      // Invalidate cache for this user
      sessionCache.invalidate(cacheKeys.userSessions(user.id));
      
      // Send scheduling confirmation email only for future scheduled sessions
      // Skip email for immediate/active sessions
      const isImmediateSession = status === 'active' || 
        (sessionDate.getTime() - new Date().getTime() < 5 * 60 * 1000); // Less than 5 minutes from now
      
      if (!isImmediateSession && status === 'scheduled') {
        try {
          // Validate email environment before sending
          const emailValidation = validateEmailEnvironment();
          if (!emailValidation.isValid) {
            console.error('Email environment validation failed, skipping email send:', emailValidation.missingVars);
          } else {
            const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
            await resend.emails.send({
              from: `Therapy Support <${process.env.EMAIL_FROM}>`,
              to: user.email,
              subject: 'Your Therapy Session is Scheduled',
              react: SessionConfirmationEmail({
                username: user.name || 'Valued Client',
                sessionDate: sessionDate,
                duration: Number(duration),
                theme: theme,
                notes: notes,
                baseUrl: baseUrl,
              }),
            });
            console.log('Scheduling confirmation email sent successfully');
          }
        } catch (emailError) {
          console.error('Error sending scheduling confirmation email:', emailError);
        }
      }
      
      // Handle recurring sessions
      if (isRecurring && recurringFrequency && status === 'scheduled') {
        try {
          const recurringSession: { message: string; sessionsCreated: number } = { message: '', sessionsCreated: 0 };
          const nextDate = new Date(sessionDate);
          
          // Create up to 4 future sessions based on frequency
          for (let i = 0; i < 4; i++) {
            switch (recurringFrequency) {
              case 'weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
              case 'biweekly':
                nextDate.setDate(nextDate.getDate() + 14);
                break;
              case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
              default:
                break;
            }
            
            // Create the recurring session
            const recurringSessionData = await prisma.session.create({
              data: {
                userId: user.id,
                date: new Date(nextDate),
                duration: Number(duration),
                theme,
                notes: notes + ' (Recurring session)',
                status: 'scheduled',
                notificationPrefs: effectiveNotificationPrefs,
                assistantId: assistantId || null
              }
            });
            
            recurringSession.sessionsCreated++;
          }
          
          console.log(`Created ${recurringSession.sessionsCreated} recurring sessions`);
        } catch (recurringError) {
          console.error('Error creating recurring sessions:', recurringError);
          // Don't fail the main session creation if recurring sessions fail
        }
      }
      
      return NextResponse.json(newSession, { status: 201 });
    } catch (prismaError) {
      // Catch and log Prisma-specific errors
      console.error('Prisma error creating session:', prismaError);
      return NextResponse.json(
        { 
          error: 'Database error creating session', 
          details: prismaError instanceof Error ? prismaError.message : 'Unknown Prisma error' 
        }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create session' }, 
      { status: 500 }
    );
  }
}