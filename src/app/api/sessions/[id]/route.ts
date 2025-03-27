// app/api/sessions/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

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
    
    const therapySession = await prisma.session.findUnique({
      where: {
        id: sessionId,
        userId: session.user.id as string
      }
    })
    
    if (!therapySession) {
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

  const sessionId = params.id

  try {
    // Verify the session belongs to this user
    const existingSession = await prisma.session.findUnique({
      where: {
        id: sessionId,
        userId: session.user.id as string
      }
    })

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { status, endTime, notes } = await request.json()
    
    const updateData: any = {}
    
    // Update status if provided
    if (status) {
      updateData.status = status
    }
    
    // Update notes if provided
    if (notes !== undefined) {
      updateData.notes = notes
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
      await generateMetricsFromSession(session.user.id as string, updatedSession.duration)
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

// Helper function to generate metrics from the session
async function generateMetricsFromSession(userId: string, duration: number) {
  // Calculate basic improvement scores based on session duration
  const baseScore = Math.min(85, 50 + Math.floor(duration / 5))
  const variability = 10 // Add some randomness to scores
  
  // Update progress tracking
  await prisma.progressTracking.create({
    data: {
      userId,
      closenessScore: baseScore + Math.floor(Math.random() * variability),
      communicationScore: baseScore + Math.floor(Math.random() * variability)
    }
  })
  
  // Update communication metrics
  await prisma.communicationMetrics.create({
    data: {
      userId,
      activeListeningScore: baseScore + Math.floor(Math.random() * variability),
      expressingNeedsScore: baseScore + Math.floor(Math.random() * variability),
      conflictResolutionScore: baseScore + Math.floor(Math.random() * variability),
      emotionalSupportScore: baseScore + Math.floor(Math.random() * variability)
    }
  })
}