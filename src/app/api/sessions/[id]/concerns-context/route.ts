/**
 * Session-Specific Concerns Context API
 * Manages concerns context for individual therapy sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma-optimized';
import { z } from 'zod';
import { VAPIConcernsIntegration } from '@/lib/vapi-concerns-integration';
import { ConcernsProgressTracker } from '@/lib/concerns-progress-tracker';
import type { SessionConcernsContext } from '@/types/concerns-synchronization';

// Validation schemas
const UpdateContextSchema = z.object({
  primaryConcerns: z.array(z.string()).max(5),
  secondaryConcerns: z.array(z.string()).optional(),
  focusAreas: z.array(z.string()).optional(),
  expectedOutcomes: z.array(z.string()).optional(),
  contextualNotes: z.string().optional()
});

/**
 * GET /api/sessions/[id]/concerns-context
 * Get concerns context for a specific session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = params.id;

    // Verify session ownership
    const therapySession = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id
      },
      select: {
        id: true,
        status: true,
        metadata: true,
        user: {
          include: {
            profile: {
              select: { currentConcerns: true }
            }
          }
        }
      }
    });

    if (!therapySession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get current session concerns context
    const sessionMetadata = therapySession.metadata as any;
    const existingContext = sessionMetadata?.concernsContext;

    // Generate comprehensive context if not exists or if outdated
    const concernsContext = await VAPIConcernsIntegration.generateSessionContext(
      session.user.id,
      sessionId,
      'couple' // This could be determined from session type
    );

    // Structure response
    const contextResponse: SessionConcernsContext = {
      sessionId,
      primaryConcerns: concernsContext.concerns.primary.map(c => c.id),
      secondaryConcerns: concernsContext.concerns.secondary.map(c => c.id),
      focusAreas: existingContext?.focusAreas || [],
      expectedOutcomes: existingContext?.expectedOutcomes || [],
      contextualNotes: concernsContext.concerns.context
    };

    // Include additional context data
    return NextResponse.json({
      context: contextResponse,
      meta: {
        userConcerns: therapySession.user.profile?.currentConcerns || [],
        sessionStatus: therapySession.status,
        lastUpdated: existingContext?.updatedAt || new Date().toISOString(),
        naturalLanguageContext: concernsContext.concerns.context,
        historicalInsights: concernsContext.history.recentInsights.slice(0, 3)
      }
    });

  } catch (error) {
    console.error('GET concerns-context error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/sessions/[id]/concerns-context
 * Update concerns context for a specific session
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = params.id;
    const body = await request.json();
    const validatedData = UpdateContextSchema.parse(body);

    // Verify session ownership and that it's active or scheduled
    const therapySession = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
        status: { in: ['SCHEDULED', 'ACTIVE', 'PAUSED'] }
      }
    });

    if (!therapySession) {
      return NextResponse.json({ 
        error: 'Session not found or not in modifiable state' 
      }, { status: 404 });
    }

    // Update session context
    const updatedContext: SessionConcernsContext = {
      sessionId,
      primaryConcerns: validatedData.primaryConcerns,
      secondaryConcerns: validatedData.secondaryConcerns || [],
      focusAreas: validatedData.focusAreas || [],
      expectedOutcomes: validatedData.expectedOutcomes || [],
      contextualNotes: validatedData.contextualNotes || ''
    };

    // Update session metadata
    const currentMetadata = (therapySession.metadata as any) || {};
    const newMetadata = {
      ...currentMetadata,
      concernsContext: {
        ...updatedContext,
        updatedAt: new Date().toISOString(),
        updatedBy: 'user'
      }
    };

    await prisma.session.update({
      where: { id: sessionId },
      data: { metadata: newMetadata }
    });

    // If session is active, update VAPI context in real-time
    if (therapySession.status === 'ACTIVE') {
      await updateActiveSessionContext(sessionId, updatedContext);
    }

    // Update progress tracker
    const progressTracker = ConcernsProgressTracker.getInstance();
    await progressTracker.syncConcernsUpdate(
      session.user.id,
      'session',
      [...validatedData.primaryConcerns, ...(validatedData.secondaryConcerns || [])],
      sessionId
    );

    return NextResponse.json({
      success: true,
      context: updatedContext,
      meta: {
        sessionId,
        updatedAt: new Date().toISOString(),
        isActive: therapySession.status === 'ACTIVE'
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }
    
    console.error('PUT concerns-context error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}/**
 * POST /api/sessions/[id]/concerns-context/mention
 * Record a concern mention during active session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = params.id;
    const body = await request.json();
    
    const { concernIds, transcript, confidence, timestamp } = body;

    // Validate required fields
    if (!concernIds || !Array.isArray(concernIds) || concernIds.length === 0) {
      return NextResponse.json({ error: 'concernIds required' }, { status: 400 });
    }

    // Verify session is active
    const therapySession = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
        status: 'ACTIVE'
      }
    });

    if (!therapySession) {
      return NextResponse.json({ error: 'Session not active' }, { status: 400 });
    }

    // Update concerns tracking in session metadata
    const currentMetadata = (therapySession.metadata as any) || {};
    const concernsTracking = currentMetadata.concernsTracking || {};

    concernIds.forEach((concernId: string) => {
      if (!concernsTracking[concernId]) {
        concernsTracking[concernId] = {
          mentionCount: 0,
          firstMentioned: timestamp || new Date().toISOString(),
          confidence: []
        };
      }
      
      concernsTracking[concernId].mentionCount += 1;
      concernsTracking[concernId].lastMentioned = timestamp || new Date().toISOString();
      concernsTracking[concernId].confidence.push(confidence || 0.8);
    });

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        metadata: {
          ...currentMetadata,
          concernsTracking,
          lastConcernMention: timestamp || new Date().toISOString()
        }
      }
    });

    // Update progress tracker with real-time mention
    const progressTracker = ConcernsProgressTracker.getInstance();
    
    for (const concernId of concernIds) {
      await progressTracker.updateConcernProgress(
        session.user.id,
        concernId,
        {
          sessionId,
          type: 'pattern',
          description: `Real-time mention detected: ${transcript?.substring(0, 100) || 'Discussion detected'}`,
          confidence: confidence || 0.8,
          metadata: {
            transcriptSegments: transcript ? [transcript] : [],
            aiModel: 'real-time-detection',
            processingVersion: '1.0'
          }
        },
        'session'
      );
    }

    return NextResponse.json({
      success: true,
      mentionsRecorded: concernIds.length,
      timestamp: timestamp || new Date().toISOString()
    });

  } catch (error) {
    console.error('POST concerns-mention error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to update active VAPI session context
async function updateActiveSessionContext(sessionId: string, context: SessionConcernsContext) {
  // This would integrate with your VAPI real-time update system
  // For now, we'll log the update
  console.log(`[VAPI Context Update] Session ${sessionId}: Updated concerns context in real-time`);
  
  // Example of how this might work:
  // await vapiManager.updateSessionContext(sessionId, {
  //   variables: {
  //     primary_concerns: context.primaryConcerns.join(', '),
  //     focus_areas: context.focusAreas.join(', '),
  //     expected_outcomes: context.expectedOutcomes.join(', ')
  //   }
  // });
}