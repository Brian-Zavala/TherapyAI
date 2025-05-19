import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateMetricsFromSession } from '../metrics-helper';
import { Resend } from 'resend';
import SessionCompletedEmail from '@/emails/SessionCompleted';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { id: sessionId } = await params;
    
    const therapySession = await prisma.therapySession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    
    if (!therapySession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Check permission (user or admin)
    if (therapySession.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    
    // Mark session as completed
    await prisma.therapySession.update({
      where: { id: sessionId },
      data: { status: 'completed' },
    });
    
    // Generate metrics based on the session
    try {
      // Determine therapy type from session theme
      let therapyType = 'couple';
      if (therapySession.notes && therapySession.notes.toLowerCase().includes('family')) {
        therapyType = 'family';
      }
      
      // Get session transcript if available from the session table
      const sessionData = await prisma.session.findFirst({
        where: { 
          userId: therapySession.userId,
          date: therapySession.sessionDate
        }
      });
      
      if (sessionData) {
        const duration = therapySession.duration || 30;
        await generateMetricsFromSession(
          therapySession.userId,
          duration,
          sessionId,
          sessionData.transcript,
          therapyType
        );
        
        console.log(`Generated ${therapyType} metrics for therapySession ${sessionId}`);
      }
    } catch (metricsError) {
      console.error('Error generating metrics, but continuing:', metricsError);
    }
    
    // Send SessionCompleted email
    try {
      // Calculate duration in seconds
      const durationInSeconds = therapySession.duration ? therapySession.duration * 60 : 1800; // Default to 30 minutes
      
      // Find the next scheduled session for this user
      const nextSession = await prisma.therapySession.findFirst({
        where: {
          userId: therapySession.userId,
          status: 'scheduled',
          sessionDate: {
            gt: new Date()
          }
        },
        orderBy: {
          sessionDate: 'asc'
        }
      });
      
      await resend.emails.send({
        from: `Therapy Support <${process.env.EMAIL_FROM}>`,
        to: therapySession.user.email,
        subject: 'Therapy Session Completed',
        react: SessionCompletedEmail({
          userName: therapySession.user.name || 'Valued Client',
          sessionDate: therapySession.sessionDate.toLocaleDateString(),
          sessionTime: therapySession.sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          therapistName: 'Dr. Maya Thompson', // You might want to get this from your database
          sessionDuration: durationInSeconds,
          sessionNotes: therapySession.notes || undefined,
          nextSessionDate: nextSession ? nextSession.sessionDate.toLocaleDateString() : undefined,
          nextSessionTime: nextSession ? nextSession.sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        }),
      });
      console.log('Session completion email sent successfully');
    } catch (emailError) {
      console.error('Error sending session completion email:', emailError);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error completing session:', error);
    return NextResponse.json({ error: 'Failed to complete session' }, { status: 500 });
  }
}