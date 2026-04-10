import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-optimized'

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Update user to mark intro as seen
    // Use email to find user since ID might not be in session for OAuth users
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { hasSeenIntro: true }
    })

    return NextResponse.json({ success: true, userId: updatedUser.id })
  } catch (error) {
    console.error('Error updating intro status:', error)
    return NextResponse.json(
      { error: 'Failed to update intro status' },
      { status: 500 }
    )
  }
}