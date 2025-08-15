import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redis } from '@/lib/cache/redis-client';

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if there's a recent credit update flag
    const updateFlag = await redis.get(`credits:updated:${session.user.id}`);
    
    if (updateFlag) {
      // Clear the flag after reading
      await redis.del(`credits:updated:${session.user.id}`);
      
      return NextResponse.json({
        hasUpdate: true,
        timestamp: updateFlag,
        message: 'Credits have been updated'
      });
    }

    return NextResponse.json({
      hasUpdate: false,
      message: 'No recent credit updates'
    });
    
  } catch (error: any) {
    console.error('[Credits Check] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check credit updates' },
      { status: 500 }
    );
  }
}