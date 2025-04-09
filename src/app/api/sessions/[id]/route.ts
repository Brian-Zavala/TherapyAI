// app/api/sessions/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { generateMetricsFromSession } from './metrics-helper'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const sessionId = params.id
    
    console.log('Fetching session ID:', sessionId)
    
    // First, find the user by email
    let user = await prisma.user.findUnique({
      where: { 
        email: session.user.email as string 
      }
    });
    
    // Auto-create user if they don't exist in Prisma but have a valid session
    if (!user && session.user.email) {
      console.log(`Auto-creating user in database for ${session.user.email}`);
      
      try {
        user = await prisma.user.create({
          data: {
            email: session.user.email,
            name: session.user.name || session.user.email.split('@')[0],
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const therapySession = await prisma.session.findUnique({
      where: {
        id: sessionId
      }
    })
    
    // Verify the session belongs to this user
    if (!therapySession || therapySession.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    return NextResponse.json(therapySession)
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session' }, 
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // params is not a Promise in Next.js route handlers, so we access it directly
  const sessionId = params.id
  
  console.log('Processing update for session ID:', sessionId)

  try {
    // First, find the user by email
    let user = await prisma.user.findUnique({
      where: { 
        email: session.user.email as string 
      }
    });
    
    // Auto-create user if they don't exist in Prisma but have a valid session
    if (!user && session.user.email) {
      console.log(`Auto-creating user in database for ${session.user.email}`);
      
      try {
        user = await prisma.user.create({
          data: {
            email: session.user.email,
            name: session.user.name || session.user.email.split('@')[0],
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Verify the session belongs to this user
    const existingSession = await prisma.session.findUnique({
      where: {
        id: sessionId
      }
    })

    if (!existingSession || existingSession.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { status, endTime, notes, transcript } = await request.json()
    
    const updateData: any = {}
    
    // Update status if provided
    if (status) {
      updateData.status = status
    }
    
    // Update notes if provided
    if (notes !== undefined) {
      updateData.notes = notes
    }
    
    // Update transcript if provided
    if (transcript !== undefined) {
      updateData.transcript = transcript
    }
    
    // Calculate duration if endTime is provided and status is completed
    if (endTime && status === 'completed') {
      const endDate = new Date(endTime)
      const startDate = existingSession.date
      
      // Calculate duration in minutes
      const durationInMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000)
      updateData.duration = durationInMinutes
    }
    
    // Update the session
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: updateData
    })

    // Generate metrics if session was completed
    if (status === 'completed') {
      try {
        // Determine therapy type from session theme
        let therapyType = 'couple';
        if (existingSession.theme && existingSession.theme.toLowerCase().includes('family')) {
          therapyType = 'family';
        }
        
        // Create or update metrics - first, check if metrics already exist for this session
        const existingMetrics = await prisma.progressTracking.findFirst({
          where: {
            sessionId: sessionId
          }
        });
        
        if (!existingMetrics) {
          // No metrics exist yet, create new ones
          // Make sure we're using the database user ID, not the session user ID
          await generateMetricsFromSession(
            user.id, 
            updatedSession.duration, 
            sessionId, 
            transcript, 
            therapyType
          );
          
          console.log(`Generated ${therapyType} metrics for session ${sessionId}`);
        } else {
          // Metrics already exist, update them
          console.log(`Metrics already exist for session ${sessionId}, not generating new ones`);
        }
      } catch (metricsError) {
        console.error('Error generating metrics, but continuing:', metricsError)
        // Don't fail the whole request if metrics generation fails
      }
    }

    return NextResponse.json(updatedSession)
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update session' },
      { status: 500 }
    )
  }
}

