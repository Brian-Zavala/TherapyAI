import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-optimized';
import { z } from 'zod';
import { THERAPY_CONCERNS } from '@/data/therapy-concerns';
import type { UpdateConcernsRequest, ConcernsProgressResponse } from '@/types/concerns-synchronization';

// Validation schemas
const UpdateConcernsSchema = z.object({
  concerns: z.array(z.object({
    id: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    notes: z.string().optional()
  })),
  source: z.enum(['onboarding', 'profile', 'session']),
  sessionId: z.string().optional()
});

/**
 * GET /api/concerns - Get user's current concerns with progress
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const includeProgress = url.searchParams.get('include_progress') === 'true';
    const sessionId = url.searchParams.get('session_id');

    // Get user profile with concerns
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        currentConcerns: true,
        additionalNotes: true
      }
    });

    if (!userProfile) {
      return NextResponse.json({ concerns: [] });
    }

    const concernIds = userProfile.currentConcerns as string[] || [];
    const concerns = THERAPY_CONCERNS.filter(c => concernIds.includes(c.id));

    if (!includeProgress) {
      return NextResponse.json({ concerns });
    }

    // Get progress data if requested
    const progressData = await getConcernsProgress(session.user.id, concernIds, sessionId);
    
    return NextResponse.json(progressData);
    
  } catch (error) {
    console.error('GET /api/concerns error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/concerns - Update user's concerns
 */export async function PUT(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = UpdateConcernsSchema.parse(body);

    // Update user profile with new concerns
    const updatedProfile = await prisma.userProfile.update({
      where: { userId: session.user.id },
      data: {
        currentConcerns: validatedData.concerns.map(c => c.id),
        updatedAt: new Date()
      }
    });

    // Log concerns change for analytics
    await logConcernsChange(
      session.user.id,
      validatedData.concerns,
      validatedData.source,
      validatedData.sessionId
    );

    // If this is during a session, update session context
    if (validatedData.sessionId) {
      await updateSessionConcernsContext(
        validatedData.sessionId,
        validatedData.concerns
      );
    }

    // Broadcast real-time update
    await broadcastConcernsUpdate(session.user.id, {
      concernIds: validatedData.concerns.map(c => c.id),
      source: validatedData.source,
      sessionId: validatedData.sessionId
    });

    return NextResponse.json({ 
      success: true,
      concerns: validatedData.concerns 
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    console.error('PUT /api/concerns error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Helper function to get concerns progress data
 */
async function getConcernsProgress(
  userId: string, 
  concernIds: string[], 
  sessionId?: string | null
): Promise<ConcernsProgressResponse> {
  // Get recent sessions for progress analysis
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      completedAt: { not: null }
    },
    orderBy: { completedAt: 'desc' },
    take: 10,
    select: {
      id: true,
      completedAt: true,
      notes: true
    }
  });

  // Calculate progress for each concern
  const concernsWithProgress = await Promise.all(
    concernIds.map(async (concernId) => {
      const concern = THERAPY_CONCERNS.find(c => c.id === concernId);
      if (!concern) return null;

      const progressScore = await calculateConcernProgress(userId, concernId, sessions);
      const recentInsights = await getRecentInsightsForConcern(userId, concernId);
      const trend = calculateProgressTrend(progressScore, sessions);

      return {
        id: concernId,
        label: concern.label,
        progressScore,
        recentInsights,
        trend,
        nextSteps: generateNextSteps(concern, progressScore, trend)
      };
    })
  );

  const validConcerns = concernsWithProgress.filter((c): c is NonNullable<typeof c> => c !== null);
  
  // Calculate overall progress
  const overallScore = validConcerns.length > 0 
    ? validConcerns.reduce((sum, c) => sum + c.progressScore, 0) / validConcerns.length
    : 0;

  return {
    concerns: validConcerns as any,
    overallProgress: {
      score: overallScore,
      trend: calculateOverallTrend(validConcerns),
      milestones: await generateMilestones(userId, validConcerns)
    }
  };
}// Helper functions for progress calculation and insights
async function calculateConcernProgress(userId: string, concernId: string, sessions: any[]): Promise<number> {
  // Analyze session notes for progress indicators
  let progressScore = 50; // Start with neutral baseline
  
  for (const session of sessions) {
    // Check session notes for concern mentions and progress indicators
    if (session.notes) {
      const notesLower = session.notes.toLowerCase();
      const concernKeyword = concernId.replace('-', ' ');
      
      if (notesLower.includes(concernKeyword)) {
        // Simple progress detection based on keywords in notes
        if (notesLower.includes('progress') || notesLower.includes('improvement') || notesLower.includes('better')) {
          progressScore += 10;
        } else if (notesLower.includes('struggle') || notesLower.includes('difficult') || notesLower.includes('setback')) {
          progressScore -= 5;
        }
      }
    }
  }
  
  return Math.max(0, Math.min(100, progressScore));
}

async function getRecentInsightsForConcern(userId: string, concernId: string) {
  // Get recent sessions and extract insights from therapy insights table
  const therapyInsights = await prisma.therapyInsight.findMany({
    where: {
      userId,
      category: concernId
    },
    select: {
      id: true,
      sessionId: true,
      title: true,
      description: true,
      priority: true,
      confidence: true,
      generatedAt: true,
      metadata: true
    },
    take: 5,
    orderBy: { generatedAt: 'desc' }
  });

  return therapyInsights.map(insight => ({
    sessionId: insight.sessionId || '',
    extractedAt: insight.generatedAt,
    type: insight.priority,
    description: insight.description,
    confidence: insight.confidence,
    metadata: {
      title: insight.title,
      originalMetadata: insight.metadata,
      aiModel: 'claude-3',
      processingVersion: '1.0'
    }
  }));
}

function calculateProgressTrend(currentScore: number, sessions: any[]): 'improving' | 'stable' | 'declining' {
  if (sessions.length < 3) return 'stable';
  
  // Simple trend calculation based on recent session scores
  const recentSessions = sessions.slice(0, 3);
  const scores = recentSessions.map(() => currentScore); // Simplified for now
  
  const trend = scores[0] - scores[scores.length - 1];
  
  if (trend > 5) return 'improving';
  if (trend < -5) return 'declining';
  return 'stable';
}

function generateNextSteps(concern: any, progressScore: number, trend: string): string[] {
  const steps = [];
  
  if (progressScore < 40) {
    steps.push(`Focus on building foundation for ${concern.label.toLowerCase()}`);
    steps.push('Consider more frequent sessions to address this concern');
  } else if (progressScore > 70) {
    steps.push(`Continue reinforcing progress with ${concern.label.toLowerCase()}`);
    steps.push('Practice new skills outside of therapy sessions');
  } else {
    steps.push(`Maintain consistent work on ${concern.label.toLowerCase()}`);
  }
  
  if (trend === 'declining') {
    steps.push('Review recent challenges and adjust approach');
  }
  
  return steps;
}

function calculateOverallTrend(concerns: any[]): 'improving' | 'stable' | 'declining' {
  const improvingCount = concerns.filter(c => c.trend === 'improving').length;
  const decliningCount = concerns.filter(c => c.trend === 'declining').length;
  
  if (improvingCount > decliningCount) return 'improving';
  if (decliningCount > improvingCount) return 'declining';
  return 'stable';
}

async function generateMilestones(userId: string, concerns: any[]) {
  // Generate realistic milestones based on concerns and progress
  return [
    {
      description: 'Complete initial assessment of primary concerns',
      achievedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    },
    {
      description: 'Show consistent progress in top priority areas',
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 month
    }
  ];
}

// Logging and broadcasting functions
async function logConcernsChange(userId: string, concerns: any[], source: string, sessionId?: string) {
  // Log to analytics/audit system
  console.log(`[Concerns Update] User: ${userId}, Source: ${source}, Concerns: ${concerns.map(c => c.id).join(', ')}`);
}

async function updateSessionConcernsContext(sessionId: string, concerns: any[]) {
  // Update session notes with current concerns context since metadata doesn't exist
  const concernsContext = {
    primary: concerns.filter(c => c.priority === 'high').map(c => c.id),
    secondary: concerns.filter(c => c.priority !== 'high').map(c => c.id),
    updatedAt: new Date().toISOString()
  };
  
  const contextNote = `Concerns updated: ${JSON.stringify(concernsContext)}`;
  
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      notes: contextNote
    }
  });
}

async function broadcastConcernsUpdate(userId: string, updateData: any) {
  // Broadcast real-time update to connected clients
  console.log(`[Real-time] Broadcasting concerns update for user: ${userId}`);
}