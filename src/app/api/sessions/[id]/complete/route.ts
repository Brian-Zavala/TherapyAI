import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateMetricsFromSession } from '../metrics-helper';
import { Resend } from 'resend';
import SessionCompletedEmail from '@/emails/SessionCompleted';
import { rateLimitManager } from '@/lib/rate-limit-manager';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Rate limiting check
  const clientId = session.user?.id || 'anonymous';
  const userType = (session.user as any)?.type || 'standard';
  
  const rateLimitResult = await rateLimitManager.checkLimits(
    clientId,
    'session-creation',
    { 
      endpoint: '/api/sessions/complete',
      userType 
    }
  );
  
  if (!rateLimitResult.allowed) {
    const response = NextResponse.json(
      { 
        error: "Too many session completion requests. Please try again later.",
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
    const { id: sessionId } = await params;
    
    // Parse request body for billing data
    const body = await request.json().catch(() => ({}));
    const {
      totalPausedMinutes,
      billableMinutes,
      completionNotes
    } = body;
    
    const therapySession = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    
    if (!therapySession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Check permission (user or admin)
    if (therapySession.userId !== session.user.id && (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    
    // 🚀 PHASE 3: COMPREHENSIVE SESSION-END PROCESSING
    
    // 1. Flush any pending transcript batches before completion
    try {
      console.log('📦 PHASE 3: Flushing all pending transcript batches...');
      const { flushSessionTranscripts, cleanupSessionMetrics } = await import('@/lib/transcript-service-optimized');
      
      // Force flush any remaining batched transcripts
      await flushSessionTranscripts(sessionId);
      console.log('✅ PHASE 3: All transcript batches flushed successfully');
      
      // Clean up any real-time metrics calculators
      cleanupSessionMetrics(sessionId);
      console.log('✅ PHASE 3: Session metrics cleaned up');
      
      // Clean up Supabase broadcast channels
      const { cleanupBroadcastChannels } = await import('@/lib/metrics-broadcaster');
      await cleanupBroadcastChannels(sessionId);
      console.log('✅ PHASE 3: Broadcast channels cleaned up');
    } catch (flushError) {
      console.error('⚠️ PHASE 3: Error flushing transcripts, but continuing with completion:', flushError);
    }

    // 2. Calculate final billing data if not provided
    let finalBillableMinutes = billableMinutes;
    let finalConversationTimeSeconds = therapySession.conversationTimeSeconds || 0;
    
    // If we're currently in an active conversation, add the current segment
    if (therapySession.lastConversationStart && !therapySession.isPaused) {
      const currentSegmentSeconds = Math.floor(
        (Date.now() - new Date(therapySession.lastConversationStart).getTime()) / 1000
      );
      finalConversationTimeSeconds += currentSegmentSeconds;
    }
    
    // Calculate billable minutes from conversation time if not provided
    if (!finalBillableMinutes && finalConversationTimeSeconds > 0) {
      finalBillableMinutes = Math.ceil(finalConversationTimeSeconds / 60);
    }
    
    console.log(`💰 Final billing calculation for session ${sessionId}:`, {
      conversationTimeSeconds: finalConversationTimeSeconds,
      billableMinutes: finalBillableMinutes,
      totalPausedMinutes: totalPausedMinutes || Math.floor((therapySession.totalPausedTimeSeconds || 0) / 60),
      scheduledDuration: therapySession.duration
    });
    
    // 3. Mark session as completed with billing data
    await prisma.session.update({
      where: { id: sessionId },
      data: { 
        status: 'completed',
        conversationTimeSeconds: finalConversationTimeSeconds,
        // Store billing data in notes or create new fields if needed
        notes: completionNotes || `Session completed. Billable time: ${finalBillableMinutes} minutes (${finalConversationTimeSeconds} seconds of conversation). Total paused: ${totalPausedMinutes || 0} minutes.`
      },
    });
    
    // 3. Generate comprehensive metrics based on the complete session (formerly real-time)
    try {
      // Determine therapy type from session theme
      let therapyType = 'couple';
      if (therapySession.theme && therapySession.theme.toLowerCase().includes('family')) {
        therapyType = 'family';
      } else if (therapySession.theme && therapySession.theme.toLowerCase().includes('individual')) {
        therapyType = 'solo';
      }
      
      const duration = therapySession.duration || 30;
      // Get full transcript from TranscriptEntry table
      const transcriptEntries = await prisma.transcriptEntry.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' },
        select: {
          speaker: true,
          text: true
        }
      });
      
      const fullTranscript = transcriptEntries
        .map(entry => `${entry.speaker}: ${entry.text}`)
        .join('\n');
      
      await generateMetricsFromSession(
        therapySession.userId,
        duration,
        sessionId,
        fullTranscript,
        therapyType,
        therapySession.assistantId || undefined
      );
      
      console.log(`✅ PHASE 3: Generated comprehensive ${therapyType} metrics for session ${sessionId}`);
      
      // 4. Additional post-session analysis (now that we have time)
      try {
        // Get final transcript count for verification
        const transcriptEntries = await prisma.transcriptEntry.count({
          where: { sessionId: sessionId }
        });
        console.log(`📊 PHASE 3: Session ${sessionId} completed with ${transcriptEntries} transcript entries`);
        
        // Update session with final transcript count
        await prisma.session.update({
          where: { id: sessionId },
          data: { 
            notes: `Session completed with ${transcriptEntries} transcript entries. Metrics generated successfully.`
          }
        });
        
      } catch (analysisError) {
        console.error('⚠️ PHASE 3: Error in post-session analysis:', analysisError);
      }
      
    } catch (metricsError) {
      console.error('❌ PHASE 3: Error generating comprehensive metrics, but continuing:', metricsError);
    }
    
    // Send SessionCompleted email
    try {
      // Use actual conversation time for the email
      const durationInSeconds = finalConversationTimeSeconds || (therapySession.duration ? therapySession.duration * 60 : 1800);
      
      // Find the next scheduled session for this user
      const nextSession = await prisma.session.findFirst({
        where: {
          userId: therapySession.userId,
          status: 'scheduled',
          date: {
            gt: new Date()
          }
        },
        orderBy: {
          date: 'asc'
        }
      });
      
      await resend.emails.send({
        from: `Therapy Support <${process.env.EMAIL_FROM}>`,
        to: therapySession.user.email,
        subject: 'Therapy Session Completed',
        react: SessionCompletedEmail({
          userName: therapySession.user.name || 'Valued Client',
          sessionDate: therapySession.date.toLocaleDateString(),
          sessionTime: therapySession.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          therapistName: 'Dr. Maya Thompson', // You might want to get this from your database
          sessionDuration: durationInSeconds,
          sessionNotes: therapySession.notes || undefined,
          nextSessionDate: nextSession ? nextSession.date.toLocaleDateString() : undefined,
          nextSessionTime: nextSession ? nextSession.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        }) as any,
      });
      console.log('Session completion email sent successfully');
    } catch (emailError) {
      console.error('Error sending session completion email:', emailError);
    }
    
    return NextResponse.json({ 
      success: true,
      billing: {
        conversationTimeSeconds: finalConversationTimeSeconds,
        billableMinutes: finalBillableMinutes,
        totalPausedMinutes: totalPausedMinutes || Math.floor((therapySession.totalPausedTimeSeconds || 0) / 60),
        scheduledDurationMinutes: therapySession.duration
      }
    });
  } catch (error) {
    console.error('Error completing session:', error);
    return NextResponse.json({ error: 'Failed to complete session' }, { status: 500 });
  }
}