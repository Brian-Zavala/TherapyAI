// src/app/api/sessions/[id]/route.ts
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
  
  try {
    const { endTime, notes } = await request.json()
    
    // Get the existing session
    const existingSession = await prisma.session.findUnique({
      where: { id: params.id }
    })
    
    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    // Verify ownership
    if (existingSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Calculate duration in minutes
    const startTime = new Date(existingSession.startTime)
    const endTimeDate = new Date(endTime)
    const durationMinutes = Math.round((endTimeDate.getTime() - startTime.getTime()) / 60000)
    
    // Update session
    const updatedSession = await prisma.session.update({
      where: { id: params.id },
      data: {
        endTime: endTimeDate,
        duration: durationMinutes,
        notes: notes || null
      }
    })
    
    return NextResponse.json(updatedSession)
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json(
      { error: 'Failed to update session' }, 
      { status: 500 }
    )
  }
}