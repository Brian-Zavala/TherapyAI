// Therapeutic Breakthroughs API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma-optimized';

// GET - Retrieve user's therapeutic breakthroughs
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '30'; // days
    const sessionId = searchParams.get('sessionId');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build query filters
    const whereClause: any = {
      userId: user.id
    };

    if (sessionId) {
      whereClause.sessionId = sessionId;
    }

    if (type && type !== 'all') {
      whereClause.breakthroughType = type;
    }

    if (timeframe !== 'all') {
      const daysAgo = parseInt(timeframe);
      whereClause.createdAt = {
        gte: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
      };
    }

    // Get breakthroughs with session information
    const breakthroughs = await prisma.therapeuticBreakthrough.findMany({
      where: whereClause,
      include: {
        session: {
          select: {
            id: true,
            date: true,
            theme: true,
            completedAt: true,
            sessionType: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // Get breakthrough statistics
    const stats = await prisma.therapeuticBreakthrough.groupBy({
      by: ['breakthroughType'],
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(Date.now() - parseInt(timeframe) * 24 * 60 * 60 * 1000)
        }
      },
      _count: {
        id: true
      },
      _avg: {
        intensity: true
      }
    });

    // Calculate progress metrics
    const progressMetrics = {
      totalBreakthroughs: breakthroughs.length,
      averageIntensity: breakthroughs.reduce((sum, b) => sum + b.intensity, 0) / (breakthroughs.length || 1),
      typeDistribution: stats.map(stat => ({
        type: stat.breakthroughType,
        count: stat._count.id,
        averageIntensity: stat._avg.intensity || 0
      })),
      mostRecentBreakthrough: breakthroughs[0] || null,
      sessionsWithBreakthroughs: [...new Set(breakthroughs.map(b => b.sessionId))].length
    };

    return NextResponse.json({
      breakthroughs,
      progressMetrics,
      timeframe: parseInt(timeframe),
      filters: {
        sessionId,
        type,
        limit
      }
    });

  } catch (error) {
    console.error('Error retrieving therapeutic breakthroughs:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve therapeutic breakthroughs' },
      { status: 500 }
    );
  }
}

// POST - Create a new breakthrough (manual entry by therapist or user)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const {
      sessionId,
      breakthroughType,
      description,
      intensity,
      context,
      themes = [],
      transcriptId
    } = await request.json();

    // Validate required fields
    if (!sessionId || !breakthroughType || !description || intensity === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, breakthroughType, description, intensity' },
        { status: 400 }
      );
    }

    // Validate breakthrough type
    const validTypes = ['emotional_release', 'insight', 'pattern_recognition', 'vulnerability_moment', 'empathy_breakthrough'];
    if (!validTypes.includes(breakthroughType)) {
      return NextResponse.json(
        { error: `Invalid breakthrough type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate intensity (0-1)
    if (intensity < 0 || intensity > 1) {
      return NextResponse.json(
        { error: 'Intensity must be between 0 and 1' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify session ownership
    const therapySession = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!therapySession || therapySession.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 });
    }

    // Create breakthrough
    const breakthrough = await prisma.therapeuticBreakthrough.create({
      data: {
        sessionId,
        userId: user.id,
        transcriptId,
        breakthroughType,
        intensity,
        description,
        themes: Array.isArray(themes) ? themes : [],
        emotionalState: { context, timestamp: new Date().toISOString() },
        context: context || '',
        confidence: 0.9, // High confidence for manual entries
        aiGenerated: false // Manual entry
      },
      include: {
        session: {
          select: {
            date: true,
            theme: true,
            sessionType: true
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Breakthrough created successfully',
      breakthrough
    });

  } catch (error) {
    console.error('Error creating therapeutic breakthrough:', error);
    return NextResponse.json(
      { error: 'Failed to create therapeutic breakthrough' },
      { status: 500 }
    );
  }
}

// PUT - Update a breakthrough
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const {
      id,
      description,
      intensity,
      context,
      themes,
      followUpNeeded
    } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Breakthrough ID is required' }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify breakthrough ownership
    const existingBreakthrough = await prisma.therapeuticBreakthrough.findUnique({
      where: { id }
    });

    if (!existingBreakthrough || existingBreakthrough.userId !== user.id) {
      return NextResponse.json({ error: 'Breakthrough not found or access denied' }, { status: 404 });
    }

    // Update breakthrough
    const updatedBreakthrough = await prisma.therapeuticBreakthrough.update({
      where: { id },
      data: {
        ...(description && { description }),
        ...(intensity !== undefined && { intensity }),
        ...(context && { context }),
        ...(themes && { themes: Array.isArray(themes) ? themes : [] }),
        ...(followUpNeeded !== undefined && { followUpNeeded })
      },
      include: {
        session: {
          select: {
            date: true,
            theme: true,
            sessionType: true
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Breakthrough updated successfully',
      breakthrough: updatedBreakthrough
    });

  } catch (error) {
    console.error('Error updating therapeutic breakthrough:', error);
    return NextResponse.json(
      { error: 'Failed to update therapeutic breakthrough' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a breakthrough
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Breakthrough ID is required' }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify breakthrough ownership
    const existingBreakthrough = await prisma.therapeuticBreakthrough.findUnique({
      where: { id }
    });

    if (!existingBreakthrough || existingBreakthrough.userId !== user.id) {
      return NextResponse.json({ error: 'Breakthrough not found or access denied' }, { status: 404 });
    }

    // Delete breakthrough
    await prisma.therapeuticBreakthrough.delete({
      where: { id }
    });

    return NextResponse.json({
      message: 'Breakthrough deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting therapeutic breakthrough:', error);
    return NextResponse.json(
      { error: 'Failed to delete therapeutic breakthrough' },
      { status: 500 }
    );
  }
}