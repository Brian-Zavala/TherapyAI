import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Find the most recent active session for this user
    const activeSession = await prisma.session.findFirst({
      where: {
        userId: userId,
        status: 'active',
        endTime: null,
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    if (!activeSession) {
      return NextResponse.json(null);
    }

    return NextResponse.json(activeSession);
  } catch (error) {
    console.error('Error fetching active session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active session' },
      { status: 500 }
    );
  }
}