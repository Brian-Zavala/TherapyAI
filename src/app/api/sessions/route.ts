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
    
    // Get the request body
    const body = await request.json();
    console.log('Request body:', body); // Logging to debug
    
    // Extract data with safer defaults and validation
    const { 
      startTime, 
      date,
      theme = 'AI Therapy Session', 
      status = 'scheduled', 
      duration = 60, 
      notes = '' 
    } = body;
    
    // Validate date input
    let sessionDate: Date;
    
    if (startTime && startTime !== 'Invalid Date') {
      sessionDate = new Date(startTime);
    } else if (date && date !== 'Invalid Date') {
      sessionDate = new Date(date);
    } else {
      // Default to current time if no valid date is provided
      sessionDate = new Date();
    }
    
    // Verify we have a valid date
    if (isNaN(sessionDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date provided' }, 
        { status: 400 }
      );
    }
    
    // Create session using the fields from your schema
    const newSession = await prisma.session.create({
      data: {
        userId: user.id,
        date: sessionDate,
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