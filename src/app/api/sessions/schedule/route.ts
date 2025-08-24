// app/api/sessions/schedule/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; 
import { prisma } from '@/lib/database/prisma-optimized';
import { logger } from '@/lib/utils/logger';
import { getPersonalizedAssistantConfig } from '@/lib/vapi';
import { z } from 'zod';
import { strictDurationSchema } from '@/lib/validation/duration-validation';

// Validation schema for scheduling
const ScheduleSessionSchema = z.object({
  sessionDate: z.string().datetime(),
  duration: strictDurationSchema.default(30),
  notes: z.string().optional(),
  userId: z.string(),
  theme: z.string().optional(),
  therapyType: z.enum(['couple', 'solo', 'family']).default('solo'), // Changed default to 'solo'
  selectedFamilyMembers: z.array(z.object({
    name: z.string(),
    age: z.number(),
    relation: z.string()
  })).optional(),
  timezone: z.string().default('UTC')
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const validation = ScheduleSessionSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: validation.error.errors 
      }, { status: 400 });
    }
    
    const { sessionDate, duration, notes, userId, theme, therapyType, selectedFamilyMembers, timezone } = validation.data;
    
    // Validate user has permission (e.g., if admin scheduling for someone else)
    if (session.user.id !== userId && (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    
    // Get full user profile for VAPI configuration
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: {
        notificationPrefs: true,
        smsConsent: true,
        phone: true,
        assistantId: true,
        age: true,
        partnerName: true,
        partnerAge: true,
        relationshipStatus: true,
        pronouns: true,
        currentConcerns: true,
        communicationStyle: true,
        sessionPreference: true,
        additionalNotes: true,
        timezone: true
      }
    });
    
    // Parse notification preferences
    const notificationPrefs = userProfile?.notificationPrefs || [];
    const hasEmailPermission = Array.isArray(notificationPrefs) 
      ? notificationPrefs.includes('email') 
      : notificationPrefs === 'email';
    const hasSmsPermission = Array.isArray(notificationPrefs) 
      ? notificationPrefs.includes('sms') && userProfile?.smsConsent && userProfile?.phone
      : notificationPrefs === 'sms' && userProfile?.smsConsent && userProfile?.phone;
    
    // Validate at least one notification method is enabled
    if (!hasEmailPermission && !hasSmsPermission) {
      logger.warn('User attempting to schedule without notification permissions', {
        userId,
        notificationPrefs,
        smsConsent: userProfile?.smsConsent,
        hasPhone: !!userProfile?.phone
      });
      
      return NextResponse.json({ 
        error: 'Notification permissions required',
        message: 'Please enable email or SMS notifications to schedule sessions. This ensures you receive important reminders.',
        needsPermission: true 
      }, { status: 400 });
    }
    
    // Check for conflicts before scheduling
    const sessionDateTime = new Date(sessionDate);
    const sessionEndTime = new Date(sessionDateTime.getTime() + duration * 60 * 1000);
    
    const conflictingSessions = await prisma.session.findMany({
      where: {
        userId,
        status: {
          in: ['SCHEDULED', 'ACTIVE', 'PAUSED']
        },
        OR: [
          {
            // Session starts during the new session
            date: {
              gte: sessionDateTime,
              lt: sessionEndTime
            }
          },
          {
            // Session ends during the new session
            AND: [
              { date: { lt: sessionDateTime } },
              { 
                endTime: {
                  gt: sessionDateTime,
                  lte: sessionEndTime
                }
              }
            ]
          },
          {
            // Session encompasses the new session
            AND: [
              { date: { lte: sessionDateTime } },
              { 
                endTime: {
                  gte: sessionEndTime
                }
              }
            ]
          }
        ]
      }
    });
    
    if (conflictingSessions.length > 0) {
      return NextResponse.json({ 
        error: 'Time slot conflict',
        message: 'This time slot conflicts with an existing session.',
        conflicts: conflictingSessions.map(s => ({
          id: s.id,
          date: s.date,
          duration: s.duration,
          status: s.status
        }))
      }, { status: 409 });
    }
    
    // Prepare VAPI assistant configuration for this scheduled session
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        onboardingCompleted: true,
        familyMembers: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          select: {
            name: true,
            age: true,
            relationship: true
          }
        }
      }
    });
    
    // Create assistant configuration that will be used when session starts
    const userProfileData = {
      id: user?.id,
      name: user?.name,
      userName: user?.name,
      age: userProfile?.age,
      userAge: userProfile?.age,
      pronouns: userProfile?.pronouns,
      partnerName: userProfile?.partnerName,
      partnerAge: userProfile?.partnerAge,
      relationshipStatus: userProfile?.relationshipStatus,
      therapyType: therapyType,
      currentConcerns: userProfile?.currentConcerns || [],
      communicationStyle: userProfile?.communicationStyle || 'balanced',
      sessionPreference: userProfile?.sessionPreference || 'flexible',
      additionalNotes: userProfile?.additionalNotes || '',
      selectedFamilyMembers: selectedFamilyMembers || []
    };
    
    const sessionOptions = {
      duration: duration,
      startTime: sessionDate
    };
    
    // Generate personalized VAPI config (will be stored with session)
    const vapiConfig = getPersonalizedAssistantConfig(userProfileData, therapyType, sessionOptions);
    
    // Create in primary Session model with VAPI config
    const therapySession = await prisma.session.create({
      data: {
        userId,
        date: new Date(sessionDate),
        duration,
        notes,
        status: 'SCHEDULED',
        theme: theme || 'Therapy Session',
        sessionType: therapyType === 'couple' ? 'COUPLE' : therapyType === 'family' ? 'FAMILY' : 'SOLO',
        assistantId: userProfile?.assistantId || getAssistantIdForType(therapyType)
      },
    });
    
    logger.info('Session scheduled successfully', {
      sessionId: therapySession.id,
      userId,
      hasEmailPermission,
      hasSmsPermission
    });
    
    // Optionally store VAPI config for quick session start
    if (vapiConfig) {
      await prisma.conversationState.create({
        data: {
          sessionId: therapySession.id,
          state: vapiConfig as any,
          expiresAt: new Date(sessionDateTime.getTime() + 24 * 60 * 60 * 1000) // Expires 24 hours after session date
        }
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      session: {
        ...therapySession,
        vapiConfigured: true,
        conflictsChecked: true
      }
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to schedule session' }, { status: 500 });
  }
}

// Helper function to get assistant ID based on therapy type
function getAssistantIdForType(therapyType: string): string | undefined {
  switch (therapyType) {
    case 'couple':
      return process.env.NEXT_PUBLIC_VAPI_COUPLE_ASSISTANT_ID;
    case 'solo':
      return process.env.NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID;
    case 'family':
      return process.env.NEXT_PUBLIC_VAPI_FAMILY_ASSISTANT_ID;
    default:
      return process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
  }
}