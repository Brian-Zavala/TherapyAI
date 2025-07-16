import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma-optimized'
import { withTransaction, withRetry } from '@/lib/prisma-enhanced'
import { generateMetricsFromSession } from '../../metrics-helper'
import { Resend } from 'resend'
import SessionCompletedEmail from '@/emails/SessionCompleted'
import { rateLimitManager } from '@/lib/rate-limit-manager'
import { z } from 'zod'

const resend = new Resend(process.env.RESEND_API_KEY)

// Enhanced request validation
const CompleteSessionSchema = z.object({
  totalPausedMinutes: z.number().int().min(0).optional(),
  billableMinutes: z.number().int().min(0).optional(),
  completionNotes: z.string().max(5000).optional(),
  familyMemberIds: z.array(z.string()).optional(),
  finalMetrics: z.object({
    clarityScore: z.number().min(0).max(100).optional(),
    empathyScore: z.number().min(0).max(100).optional(),
    respectScore: z.number().min(0).max(100).optional(),
  }).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Rate limiting with enhanced configuration
  const rateLimitResult = await rateLimitManager.checkLimits(
    session.user.id,
    'session-completion',
    { 
      endpoint: '/api/sessions/complete/enhanced',
      userType: (session.user as any)?.type || 'standard'
    }
  )
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { 
        error: "Too many session completion requests. Please try again later.",
        retryAfter: rateLimitResult.nextRetryAfter 
      },
      { status: 429 }
    )
  }
  
  try {
    const { id: sessionId } = await params
    const body = await request.json().catch(() => ({}))
    
    // Validate request body
    const validatedData = CompleteSessionSchema.parse(body)
    
    // Fetch session with relationships using enhanced Prisma client
    const therapySession = await withRetry(async () => {
      return await prisma.session.findUnique({
        where: { id: sessionId },
        include: { 
          user: {
            include: {
              familyMembers: {
                where: { isActive: true },
                orderBy: { order: 'asc' }
              }
            }
          },
          conversationState: true,
          transcriptEntries: {
            select: { id: true },
            take: 1
          }
        },
      })
    })
    
    if (!therapySession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    // Check permission with enhanced validation
    if (therapySession.userId !== session.user.id && (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }
    
    // Prevent double completion
    if (therapySession.status === 'completed') {
      return NextResponse.json({ 
        error: 'Session already completed',
        sessionId: therapySession.id 
      }, { status: 409 })
    }
    
    // 🚀 ENHANCED SESSION COMPLETION WITH TRANSACTION
    const completionResult = await withTransaction(async (tx) => {
      // 1. Flush pending transcripts with transaction context
      console.log('📦 Flushing all pending transcript batches...')
      const { flushSessionTranscripts, cleanupSessionMetrics } = await import('@/lib/transcript-service-optimized')
      
      await flushSessionTranscripts(sessionId)
      
      // 2. Calculate final billing and conversation time
      let finalConversationTimeSeconds = therapySession.conversationTimeSeconds || 0
      
      if (therapySession.startTime && !therapySession.pausedAt) {
        const currentSegmentSeconds = Math.floor(
          (Date.now() - new Date(therapySession.startTime).getTime()) / 1000
        )
        finalConversationTimeSeconds += currentSegmentSeconds
      }
      
      const finalBillableMinutes = validatedData.billableMinutes || 
        Math.ceil(finalConversationTimeSeconds / 60)
      
      // 3. Update session with optimistic locking
      const updatedSession = await tx.session.update({
        where: { 
          id: sessionId,
          version: therapySession.version // Optimistic lock
        },
        data: { 
          status: 'completed',
          endTime: new Date(),
          conversationTimeSeconds: finalConversationTimeSeconds,
          duration: finalBillableMinutes,
          notes: validatedData.completionNotes || 
            `Session completed. Billable: ${finalBillableMinutes}min (${finalConversationTimeSeconds}s conversation)`,
          version: { increment: 1 }
        },
      })
      
      // 4. Generate comprehensive metrics
      console.log('📊 Generating comprehensive metrics...')
      
      // Get full transcript for analysis
      const transcriptEntries = await tx.transcriptEntry.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' },
        select: {
          speaker: true,
          text: true,
          timestamp: true,
          sentiment: true,
        }
      })
      
      // Build full transcript text
      const fullTranscript = transcriptEntries
        .map(entry => `${entry.speaker}: ${entry.text}`)
        .join('\n')
      
      // Determine therapy type and participants
      let therapyType = 'couple'
      const participantCount = validatedData.familyMemberIds?.length || 0
      
      if (participantCount > 2 || therapySession.theme?.toLowerCase().includes('family')) {
        therapyType = 'family'
      } else if (participantCount === 1 || therapySession.theme?.toLowerCase().includes('individual')) {
        therapyType = 'solo'
      }
      
      // Generate metrics with enhanced analysis
      await generateMetricsFromSession(
        therapySession.userId,
        finalBillableMinutes,
        sessionId,
        fullTranscript,
        therapyType,
        therapySession.assistantId || undefined
      )
      
      // 5. Create final communication metric record
      const finalMetric = await tx.communicationMetric.create({
        data: {
          userId: therapySession.userId,
          sessionId: sessionId,
          clarity: validatedData.finalMetrics?.clarityScore || 75,
          empathy: validatedData.finalMetrics?.empathyScore || 75,
          respect: validatedData.finalMetrics?.respectScore || 75,
          overall: 75,
          listening: 75,
          expression: 75,
          metricType: 'session-complete',
          calculatedAt: new Date()
        }
      })
      
      // 6. Update progress tracking
      const weekNumber = Math.floor((Date.now() - new Date(therapySession.user.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000))
      
      await tx.progressTracking.upsert({
        where: {
          id: `${therapySession.userId}-${therapyType}-progress`
        },
        update: {
          closenessScore: finalMetric.overall,
          communicationScore: finalMetric.overall,
          notes: `Session ${sessionId} completed successfully`
        },
        create: {
          id: `${therapySession.userId}-${therapyType}-progress`,
          userId: therapySession.userId,
          closenessScore: finalMetric.overall,
          communicationScore: finalMetric.overall,
          notes: `First session of week ${weekNumber} completed`
        }
      })
      
      // 7. Update conversation state final status
      if (therapySession.conversationState) {
        await tx.conversationState.update({
          where: { id: therapySession.conversationState.id },
          data: {
            lastActiveTime: new Date(),
            totalDuration: finalConversationTimeSeconds,
          }
        })
      }
      
      return {
        session: updatedSession,
        metric: finalMetric,
        transcriptCount: transcriptEntries.length,
        billing: {
          conversationTimeSeconds: finalConversationTimeSeconds,
          billableMinutes: finalBillableMinutes,
          totalPausedMinutes: validatedData.totalPausedMinutes || 0,
          scheduledDurationMinutes: therapySession.duration
        }
      }
    })
    
    // Clean up resources outside transaction
    try {
      const { cleanupSessionMetrics } = await import('@/lib/transcript-service-optimized')
      cleanupSessionMetrics(sessionId)
      
      const { cleanupBroadcastChannels } = await import('@/lib/metrics-broadcaster')
      await cleanupBroadcastChannels(sessionId)
    } catch (cleanupError) {
      console.error('⚠️ Error during cleanup:', cleanupError)
    }
    
    // Send completion email with enhanced data
    try {
      const nextSession = await prisma.session.findFirst({
        where: {
          userId: therapySession.userId,
          status: 'scheduled',
          date: { gt: new Date() }
        },
        orderBy: { date: 'asc' }
      })
      
      // Include family members in email if relevant
      const participantNames = validatedData.familyMemberIds 
        ? therapySession.user.familyMembers
            .filter((fm: any) => validatedData.familyMemberIds?.includes(fm.id))
            .map((fm: any) => fm.name)
        : []
      
      await resend.emails.send({
        from: `Therapy Support <${process.env.EMAIL_FROM}>`,
        to: therapySession.user.email,
        subject: 'Therapy Session Completed',
        react: SessionCompletedEmail({
          userName: therapySession.user.name || 'Valued Client',
          sessionDate: therapySession.date.toLocaleDateString(),
          sessionTime: therapySession.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          therapistName: 'Dr. Maya Thompson',
          sessionDuration: completionResult.billing.conversationTimeSeconds,
          sessionNotes: therapySession.notes || undefined,
          nextSessionDate: nextSession?.date.toLocaleDateString(),
          nextSessionTime: nextSession?.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }) as any,
      })
    } catch (emailError) {
      console.error('Error sending completion email:', emailError)
    }
    
    // Broadcast final completion event via Supabase
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      await supabase.channel(`session:${sessionId}`)
        .send({
          type: 'broadcast',
          event: 'session-completed',
          payload: {
            sessionId,
            userId: therapySession.userId,
            completedAt: new Date().toISOString(),
            metrics: {
              clarity: completionResult.metric.clarity,
              empathy: completionResult.metric.empathy,
              respect: completionResult.metric.respect,
              overall: completionResult.metric.overall
            },
            billing: completionResult.billing
          }
        })
    } catch (broadcastError) {
      console.error('Error broadcasting completion:', broadcastError)
    }
    
    console.log(`✅ Session ${sessionId} completed successfully with ${completionResult.transcriptCount} transcripts`)
    
    return NextResponse.json({ 
      success: true,
      sessionId,
      completedAt: new Date().toISOString(),
      billing: completionResult.billing,
      metrics: {
        clarity: completionResult.metric.clarity,
        empathy: completionResult.metric.empathy,
        respect: completionResult.metric.respect,
        overall: completionResult.metric.overall
      },
      transcriptCount: completionResult.transcriptCount
    })
    
  } catch (error: any) {
    console.error('Error completing session:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json({ 
        error: 'Session was modified by another process. Please retry.' 
      }, { status: 409 })
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: error.errors 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to complete session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}