import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Update user to mark intro as seen
    await prisma.user.update({
      where: { id: session.user.id },
      data: { hasSeenIntro: true }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating intro status:', error)
    return NextResponse.json(
      { error: 'Failed to update intro status' },
      { status: 500 }
    )
  }
}