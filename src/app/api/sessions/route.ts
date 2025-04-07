// src/app/api/sessions/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  const authSession = await getServerSession(authOptions);
  
  console.log('Auth session:', JSON.stringify(authSession, null, 2));
  
  if (!authSession?.user) {
    console.log('No authenticated user found');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    console.log('User email from session:', authSession.user.email);
    
    // Find the user by email
    let user = await prisma.user.findUnique({
      where: { 
        email: authSession.user.email as string 
      }
    });
    
    // Auto-create user if they don't exist in Prisma but have a valid session
    if (!user && authSession.user.email) {
      console.log(`Auto-creating user in database for ${authSession.user.email}`);
      
      try {
        user = await prisma.user.create({
          data: {
            email: authSession.user.email,
            name: authSession.user.name || authSession.user.email.split('@')[0],
            password: 'SESSION_CREATED_USER', // Placeholder password
          }
        });
        console.log('User auto-created successfully:', user.id);
      } catch (createError) {
        console.error('Error auto-creating user:', createError);
        return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 });
      }
    }
    
    if (!user) {
      console.log('User not found in database and could not be created:', authSession.user.email);
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }
    
    console.log('Found/created user in database:', user.id);
    
    // Fetch all sessions for this user
    const sessions = await prisma.session.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    console.log(`Found ${sessions.length} sessions for user`);
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch sessions' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authSession = await getServerSession(authOptions);
  
  console.log('POST /api/sessions - Auth session:', JSON.stringify(authSession, null, 2));
  
  if (!authSession?.user) {
    console.log('No authenticated user found');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    console.log('User email from session:', authSession.user.email);
    
    // Find the user by email
    let user = await prisma.user.findUnique({
      where: { 
        email: authSession.user.email as string 
      }
    });
    
    // Auto-create user if they don't exist in Prisma but have a valid session
    if (!user && authSession.user.email) {
      console.log(`Auto-creating user in database for ${authSession.user.email}`);
      
      try {
        user = await prisma.user.create({
          data: {
            email: authSession.user.email,
            name: authSession.user.name || authSession.user.email.split('@')[0],
            password: 'SESSION_CREATED_USER', // Placeholder password
          }
        });
        console.log('User auto-created successfully:', user.id);
      } catch (createError) {
        console.error('Error auto-creating user:', createError);
        return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 });
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }
    
    // Get the request body
    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2)); // Detailed logging
    
    // Extract data with safer defaults and validation
    const { 
      startTime, 
      date,
      theme = 'AI Therapy Session', 
      status = 'scheduled', 
      duration = 60, 
      notes = '',
      context = {} // Capture but ignore context data (it doesn't go in the DB)
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
    
    // Log the data we're about to save
    console.log('Creating session with data:', {
      userId: user.id,
      date: sessionDate,
      duration: Number(duration),
      theme,
      notes,
      status
    });
    
    try {
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
      
      console.log('Session created successfully:', newSession.id);
      return NextResponse.json(newSession, { status: 201 });
    } catch (prismaError) {
      // Catch and log Prisma-specific errors
      console.error('Prisma error creating session:', prismaError);
      return NextResponse.json(
        { 
          error: 'Database error creating session', 
          details: prismaError instanceof Error ? prismaError.message : 'Unknown Prisma error' 
        }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create session' }, 
      { status: 500 }
    );
  }
}