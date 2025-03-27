// src/app/api/sessions/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  const authSession = await getServerSession(authOptions);
  
  if (!authSession?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { 
        email: authSession.user.email as string 
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }
    
    // Get the request body - accept startTime instead of date
    const { startTime, theme = 'AI Therapy Session', status = 'scheduled', duration = 60, notes = '' } = await request.json();
    
    // Create session using the fields from your schema
    const newSession = await prisma.session.create({
      data: {
        userId: user.id,
        date: new Date(startTime), // Map startTime to the date field
        duration: Number(duration),
        theme,
        notes,
        status
      }
    });
    
    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create session' }, 
      { status: 500 }
    );
  }
}