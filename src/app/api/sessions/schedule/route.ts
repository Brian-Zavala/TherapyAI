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
    const { sessionDate, duration, notes, userId, theme } = await request.json();
    
    // Validate user has permission (e.g., if admin scheduling for someone else)
    if (session.user.id !== userId && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    
    // Create in primary Session model instead of TherapySession
    const therapySession = await prisma.session.create({
      data: {
        userId,
        date: new Date(sessionDate),  // Use 'date' field in Session model
        duration,
        notes,
        status: 'scheduled',
        theme: theme || 'Therapy Session',  // Use theme field from request or default
      },
    });
    
    return NextResponse.json({ success: true, session: therapySession });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to schedule session' }, { status: 500 });
  }
}