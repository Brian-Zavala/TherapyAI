import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-optimized';
import { Resend } from 'resend';
import SessionConfirmationEmail from '@/emails/SessionConfirmation';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sessionId } = await params;
    const { newDate } = await request.json();

    if (!newDate) {
      return NextResponse.json({ error: 'New date is required' }, { status: 400 });
    }

    const sessionDate = new Date(newDate);
    if (sessionDate < new Date()) {
      return NextResponse.json({ error: 'Cannot reschedule to a past date' }, { status: 400 });
    }

    // Find the existing session
    const existingSession = await prisma.session.findUnique({
      where: { 
        id: sessionId,
        userId: session.user.id
      },
      include: {
        user: true
      }
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (existingSession.status !== 'SCHEDULED' && existingSession.status !== 'ABANDONED') {
      return NextResponse.json({ 
        error: 'Can only reschedule scheduled or abandoned sessions' 
      }, { status: 400 });
    }

    // Update the session with new date and reset reminder flags
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        date: sessionDate,
        status: 'SCHEDULED',
        emailReminderSent: false,
        smsReminderSent: false,
        oneHourReminderSent: false
      }
    });

    // Send rescheduling confirmation email
    try {
      await resend.emails.send({
        from: `Therapy Support <${process.env.EMAIL_FROM}>`,
        to: existingSession.user.email,
        subject: 'Your Therapy Session Has Been Rescheduled',
        react: SessionConfirmationEmail({
          username: existingSession.user.name || 'Valued Client',
          sessionDate: sessionDate,
          duration: existingSession.duration,
          notes: existingSession.notes || undefined,
          baseUrl: process.env.NEXTAUTH_URL || 'https://therapyai.us',
        } as any) as any,
      });
    } catch (emailError) {
      console.error('Error sending rescheduling confirmation email:', emailError);
    }

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('Error rescheduling session:', error);
    return NextResponse.json({ 
      error: 'Failed to reschedule session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}