// @ts-nocheck
import { getAuthSession } from '@/lib/auth'
// Therapeutic Context API for Session Preparation
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-optimized';
import { therapeuticInsightEngine } from '@/lib/therapeutic-insight-engine';
import { vapiContextManager } from '@/lib/vapi-context-manager';

// GET - Get therapeutic context for session preparation
export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const currentSessionId = searchParams.get('sessionId');
    const includeVapiConfig = searchParams.get('includeVapi') === 'true';

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { profile: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get therapeutic context
    const therapeuticContext = await therapeuticInsightEngine.getTherapeuticContext(
      user.id, 
      currentSessionId || undefined
    );

    // Get recent insights
    const [recentBreakthroughs, emotionalMilestones, sessionSummaries] = await Promise.all([
      prisma.therapeuticBreakthrough.findMany({
        where: { 
          userId: user.id,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          session: {
            select: { id: true, date: true, theme: true }
          }
        }
      }),
      prisma.emotionalMilestone.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          session: {
            select: { id: true, date: true }
          }
        }
      }),
      prisma.sessionSummary.findMany({
        where: { 
          userId: user.id,
          processingStatus: 'completed'
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: {
          session: {
            select: { id: true, date: true, theme: true, completedAt: true }
          }
        }
      })
    ]);

    let response: any = {
      userId: user.id,
      therapeuticContext,
      insights: {
        recentBreakthroughs,
        emotionalMilestones,
        sessionSummaries
      },
      continuityScore: this.calculateContinuityScore(sessionSummaries, recentBreakthroughs),
      lastSessionDate: sessionSummaries[0]?.session?.completedAt || null
    };

    // Include VAPI configuration if requested
    if (includeVapiConfig && currentSessionId) {
      const currentSession = await prisma.session.findUnique({
        where: { id: currentSessionId },
        include: { user: { include: { profile: true } } }
      });

      if (currentSession && currentSession.userId === user.id) {
        const vapiConfig = await vapiContextManager.createContextualAssistant({
          sessionId: currentSessionId,
          userId: user.id,
          assistantId: currentSession.assistantId || 'default',
          therapyType: currentSession.sessionType?.toLowerCase() as any || 'solo'
        });

        response.vapiConfiguration = vapiConfig;
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error retrieving therapeutic context:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve therapeutic context' },
      { status: 500 }
    );
  }
}

// Helper function to calculate continuity score
function calculateContinuityScore(
  sessionSummaries: any[], 
  breakthroughs: any[]
): number {
  if (sessionSummaries.length === 0) return 0;

  let score = 0;
  
  // Base score for having session summaries
  score += Math.min(sessionSummaries.length * 0.2, 0.6);
  
  // Bonus for recent breakthroughs
  const recentBreakthroughs = breakthroughs.filter(b => 
    new Date(b.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  score += Math.min(recentBreakthroughs.length * 0.1, 0.3);
  
  // Bonus for session consistency
  const sessionDates = sessionSummaries
    .map(s => new Date(s.session?.completedAt))
    .filter(date => !isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
    
  if (sessionDates.length >= 2) {
    const daysBetween = (sessionDates[0].getTime() - sessionDates[1].getTime()) / (1000 * 60 * 60 * 24);
    if (daysBetween <= 14) { // Sessions within 2 weeks
      score += 0.1;
    }
  }
  
  return Math.min(score, 1.0);
}

// POST - Generate enhanced context for specific situations
export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { contextType, sessionId, specificConcerns } = await request.json();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let enhancedContext = '';

    switch (contextType) {
      case 'crisis_support':
        enhancedContext = await this.generateCrisisContext(user.id);
        break;
      case 'breakthrough_followup':
        enhancedContext = await this.generateBreakthroughFollowup(user.id, specificConcerns);
        break;
      case 'pattern_exploration':
        enhancedContext = await this.generatePatternContext(user.id);
        break;
      default:
        enhancedContext = await therapeuticInsightEngine.getTherapeuticContext(user.id, sessionId);
    }

    return NextResponse.json({
      contextType,
      enhancedContext,
      generated: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating enhanced context:', error);
    return NextResponse.json(
      { error: 'Failed to generate enhanced context' },
      { status: 500 }
    );
  }
}

// Helper functions for enhanced context generation
async function generateCrisisContext(userId: string): Promise<string> {
  const recentSessions = await prisma.session.findMany({
    where: { 
      userId,
      status: 'COMPLETED',
      completedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last week
      }
    },
    include: {
      therapeuticBreakthroughs: true,
      emotionalMilestones: true
    },
    orderBy: { completedAt: 'desc' },
    take: 2
  });

  const highIntensityMoments = recentSessions
    .flatMap(s => s.emotionalMilestones)
    .filter(m => m.intensity > 0.7)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  let context = "CRISIS SUPPORT CONTEXT - Recent high-intensity emotional moments:\n\n";
  
  highIntensityMoments.slice(0, 3).forEach(moment => {
    context += `- ${moment.emotionType} (intensity: ${Math.round(moment.intensity * 100)}%): ${moment.description}\n`;
  });

  context += "\nApproach with extra care, validate their experiences, and focus on immediate coping strategies.";
  
  return context;
}

async function generateBreakthroughFollowup(userId: string, concernArea?: string): Promise<string> {
  const recentBreakthroughs = await prisma.therapeuticBreakthrough.findMany({
    where: { 
      userId,
      createdAt: {
        gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // Last 2 weeks
      }
    },
    include: {
      session: {
        select: { date: true, theme: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 3
  });

  let context = "BREAKTHROUGH FOLLOW-UP CONTEXT:\n\n";
  
  recentBreakthroughs.forEach((breakthrough, index) => {
    const sessionDate = breakthrough.session?.date.toLocaleDateString();
    context += `${index + 1}. ${breakthrough.breakthroughType.replace('_', ' ').toUpperCase()} (${sessionDate})\n`;
    context += `   ${breakthrough.description}\n`;
    context += `   Intensity: ${Math.round(breakthrough.intensity * 100)}%\n\n`;
  });

  if (concernArea) {
    context += `Focus area for today: ${concernArea}\n\n`;
  }

  context += "Explore how these breakthroughs have been integrating into their daily life and what new insights have emerged.";
  
  return context;
}

async function generatePatternContext(userId: string): Promise<string> {
  const [emotionalPatterns, therapeuticRelationships] = await Promise.all([
    prisma.emotionalMilestone.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    }),
    prisma.therapeuticRelationship.findMany({
      where: { userId },
      include: {
        fromSession: { select: { date: true, theme: true } },
        toSession: { select: { date: true, theme: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ]);

  // Analyze emotional patterns
  const emotionCounts = emotionalPatterns.reduce((acc: any, milestone) => {
    acc[milestone.emotionType] = (acc[milestone.emotionType] || 0) + 1;
    return acc;
  }, {});

  const topEmotions = Object.entries(emotionCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([emotion, count]) => `${emotion} (${count} occurrences)`);

  let context = "PATTERN EXPLORATION CONTEXT:\n\n";
  context += `Most frequent emotional themes: ${topEmotions.join(', ')}\n\n`;
  
  context += "Recurring session connections:\n";
  therapeuticRelationships.slice(0, 3).forEach(rel => {
    context += `- ${rel.connectionType}: ${rel.description} (strength: ${Math.round(rel.strength * 100)}%)\n`;
  });

  context += "\nExplore these patterns and help the client recognize recurring themes in their emotional landscape.";
  
  return context;
}