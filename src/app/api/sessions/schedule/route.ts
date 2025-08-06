// app/api/sessions/schedule/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; 
import { prisma } from '@/lib/prisma-optimized';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { sessionDate, duration, notes, userId, theme } = await request.json();
    
    // Validate user has permission (e.g., if admin scheduling for someone else)
    if (session.user.id !== userId && (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    
    // Check if user has notification permissions
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: {
        notificationPrefs: true,
        smsConsent: true,
        phone: true,
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
    
    // Create in primary Session model
    const therapySession = await prisma.session.create({
      data: {
        userId,
        date: new Date(sessionDate),
        duration,
        notes,
        status: 'SCHEDULED',
        theme: theme || 'Therapy Session',
      },
    });
    
    logger.info('Session scheduled successfully', {
      sessionId: therapySession.id,
      userId,
      hasEmailPermission,
      hasSmsPermission
    });
    
    return NextResponse.json({ success: true, session: therapySession });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to schedule session' }, { status: 500 });
  }
}