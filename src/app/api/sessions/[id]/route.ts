import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

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

    const { endTime } = await request.json()
    const endDate = new Date(endTime)
    const startDate = existingSession.date
    
    // Calculate duration in minutes
    const durationInMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000)
    
    // Update the session
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        duration: durationInMinutes,
        // Make sure we have a notes field, even if it's empty
        notes: existingSession.notes || ''
      }
    })

    // Generate and store metrics based on this therapy session
    // Random scores for demo, but you could make this more sophisticated
    await generateMetricsFromSession(session.user.id as string, durationInMinutes)

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
  // For a real application, you would have more sophisticated logic here
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