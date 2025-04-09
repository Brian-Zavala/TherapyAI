import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateMetricsFromSession } from '../metrics-helper';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const sessionId = params.id;
    
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
    
    // Send email notification is disabled until email service is configured
    // Uncomment when email service is set up
    /*
    await sendEmail({
      to: therapySession.user.email,
      subject: 'Therapy Session Completed',
      html: `
        <h1>Your therapy session has been marked as completed</h1>
        <p>Thank you for attending your session on ${therapySession.sessionDate.toLocaleString()}</p>
      `,
    });
    */
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error completing session:', error);
    return NextResponse.json({ error: 'Failed to complete session' }, { status: 500 });
  }
}