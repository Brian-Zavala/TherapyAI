// src/app/api/sessions/upcoming/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
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

    console.log(`Fetching upcoming sessions for user ID: ${user.id}`);

    const now = new Date();

    // Query Session model
    const upcomingSessions = await prisma.session.findMany({
      where: {
        userId: user.id,
        date: {
          gte: now
        },
        status: 'scheduled' // Only include scheduled sessions, not cancelled or completed
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Also query TherapySession model
    const upcomingTherapySessions = await prisma.therapySession.findMany({
      where: {
        userId: user.id,
        sessionDate: {
          gte: now
        },
        status: 'scheduled' // Only include scheduled sessions, not cancelled or completed
      },
      orderBy: {
        sessionDate: 'asc'
      }
    });

    // Map TherapySession objects to match Session format
    const mappedTherapySessions = upcomingTherapySessions.map(ts => ({
      id: ts.id,
      userId: ts.userId,
      date: ts.sessionDate,
      duration: ts.duration,
      theme: 'Therapy Session', // Default since TherapySession might not have this field
      notes: ts.notes || '',
      status: ts.status,
      reminderSent: ts.reminderSent
    }));

    // Combine both arrays
    const combinedSessions = [...upcomingSessions, ...mappedTherapySessions];

    // Sort by date
    combinedSessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log(`Found ${upcomingSessions.length} sessions and ${upcomingTherapySessions.length} therapy sessions`);

    return NextResponse.json(combinedSessions);
  } catch (error) {
    console.error('Error fetching upcoming sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' }, 
      { status: 500 }
    );
  }
}