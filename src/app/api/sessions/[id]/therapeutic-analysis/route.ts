// Therapeutic Analysis API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database/prisma-optimized';
import { therapeuticInsightEngine } from '@/lib/services/therapeutic-insight-engine';

// POST - Trigger therapeutic analysis for a completed session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: sessionId } = await params;

    // Find user and verify session ownership
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const therapySession = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        transcriptEntries: true,
        sessionSummary: true
      }
    });

    if (!therapySession || therapySession.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if session is completed
    if (therapySession.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Session must be completed before analysis' }, 
        { status: 400 }
      );
    }

    // Check if already being processed
    if (therapySession.sessionSummary?.processingStatus === 'processing') {
      return NextResponse.json(
        { message: 'Analysis already in progress' },
        { status: 202 }
      );
    }

    // Trigger async analysis (fire and forget)
    therapeuticInsightEngine.processSessionTranscript(sessionId)
      .catch(error => {
        console.error(`Background analysis failed for session ${sessionId}:`, error);
      });

    return NextResponse.json({ 
      message: 'Therapeutic analysis started',
      sessionId,
      status: 'processing'
    });

  } catch (error) {
    console.error('Error triggering therapeutic analysis:', error);
    return NextResponse.json(
      { error: 'Failed to start therapeutic analysis' },
      { status: 500 }
    );
  }
}

// GET - Retrieve therapeutic analysis results
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: sessionId } = await params;

    // Find user and verify session ownership
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get comprehensive therapeutic analysis
    const analysisData = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        sessionSummary: true,
        therapeuticBreakthroughs: {
          orderBy: { createdAt: 'desc' }
        },
        emotionalMilestones: {
          orderBy: { createdAt: 'desc' }
        },
        fromTherapeuticRelationships: {
          include: {
            toSession: {
              select: {
                id: true,
                date: true,
                theme: true,
                completedAt: true
              }
            }
          }
        },
        toTherapeuticRelationships: {
          include: {
            fromSession: {
              select: {
                id: true,
                date: true,
                theme: true,
                completedAt: true
              }
            }
          }
        }
      }
    });

    if (!analysisData || analysisData.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({
      sessionId,
      summary: analysisData.sessionSummary,
      breakthroughs: analysisData.therapeuticBreakthroughs,
      emotionalMilestones: analysisData.emotionalMilestones,
      sessionConnections: {
        connectedFrom: analysisData.toTherapeuticRelationships,
        connectedTo: analysisData.fromTherapeuticRelationships
      },
      analysisComplete: analysisData.sessionSummary?.processingStatus === 'completed'
    });

  } catch (error) {
    console.error('Error retrieving therapeutic analysis:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve therapeutic analysis' },
      { status: 500 }
    );
  }
}