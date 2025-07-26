/**
 * Simplified Notifications API Route
 * Temporary replacement to fix 500 errors
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Simple query without complex caching
    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          priority: true,
          deliveryStatus: true,
          deliveryMethod: true,
          scheduledFor: true,
          sentAt: true,
          deliveredAt: true,
          readAt: true,
          actionUrl: true,
          actionTaken: true,
          createdAt: true,
          updatedAt: true,
        }
      }),
      prisma.notification.count({ where: { userId: session.user.id } }),
      prisma.notification.count({ where: { userId: session.user.id, readAt: null } })
    ]);

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: skip + limit < totalCount,
        hasPrevious: page > 1,
      },
      summary: {
        totalCount,
        unreadCount
      }
    });
  } catch (error) {
    console.error('[Notifications] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}