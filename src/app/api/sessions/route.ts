import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const userSessions = await prisma.session.findMany({
      where: { userId: session.user.id as string },
      orderBy: { startTime: 'desc' }
    })
    
    return NextResponse.json(userSessions)
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const { startTime } = await request.json()
    
    const newSession = await prisma.session.create({
      data: {
        userId: session.user.id as string,
        date: new Date(startTime),        // Changed from startTime to date
        duration: 0,                      // Required field
        theme: 'AI Therapy Session',      // Required field
        // status has default "scheduled"
      }
    })
    
    return NextResponse.json(newSession, { status: 201 })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create session' }, 
      { status: 500 }
    )
  }
}