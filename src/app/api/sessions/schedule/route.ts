// app/api/sessions/schedule/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; 
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { sessionDate, duration, notes, userId } = await request.json();
    
    // Validate user has permission (e.g., if admin scheduling for someone else)
    if (session.user.id !== userId && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    
    const therapySession = await prisma.therapySession.create({
      data: {
        userId,
        sessionDate: new Date(sessionDate),
        duration,
        notes,
        status: 'scheduled',
      },
    });
    
    return NextResponse.json({ success: true, session: therapySession });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to schedule session' }, { status: 500 });
  }
}