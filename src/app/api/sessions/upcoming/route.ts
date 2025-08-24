// src/app/api/sessions/upcoming/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/database/prisma-optimized';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const authSession = await getServerSession(authOptions);

    if (!authSession?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { 
        email: authSession.user.email as string 
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    // Fetch upcoming sessions

    const now = new Date();

    // Query only Session model - with improved selection
    const upcomingSessions = await prisma.session.findMany({
      where: {
        userId: user.id,
        date: {
          gte: now
        },
        status: 'SCHEDULED' // Only include scheduled sessions, not cancelled or completed
      },
      select: {
        id: true,
        userId: true,
        date: true,
        duration: true,
        theme: true,
        notes: true,
        status: true,
        reminderSent: true,
        emailReminderSent: true,
        oneHourReminderSent: true,
        assistantId: true
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Sort by date (already sorted by query, but just in case)
    upcomingSessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log(`Found ${upcomingSessions.length} upcoming sessions`);

    // Return in expected format with sessions array
    return NextResponse.json({ 
      sessions: upcomingSessions.map(session => ({
        ...session,
        startTime: session.date, // Map date to startTime for compatibility
        therapyType: session.theme || 'individual' // Ensure therapyType exists
      }))
    });
  } catch (error) {
    console.error('Error fetching upcoming sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' }, 
      { status: 500 }
    );
  }
}