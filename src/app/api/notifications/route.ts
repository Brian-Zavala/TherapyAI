/**
 * Notifications API Route
 * Manages user notifications for display on webpage and tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Query validation schema
const NotificationQuerySchema = z.object({
  type: z.enum(['reminder', 'completion', 'update', 'alert', 'all']).optional(),
  status: z.enum(['pending', 'sent', 'delivered', 'failed', 'all']).optional(),
  unreadOnly: z.boolean().optional(),
  limit: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional()
});

// Mark as read schema
const MarkReadSchema = z.object({
  notificationIds: z.array(z.string()),
  markAll: z.boolean().optional()
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      type: searchParams.get('type'),
      status: searchParams.get('status'),
      unreadOnly: searchParams.get('unreadOnly') === 'true',
      limit: parseInt(searchParams.get('limit') || '20'),
      page: parseInt(searchParams.get('page') || '1')
    };

    const validatedQuery = NotificationQuerySchema.parse(queryParams);
    const skip = (validatedQuery.page! - 1) * validatedQuery.limit!;

    // Build where clause
    const whereClause: any = {
      userId: session.user.id
    };

    if (validatedQuery.type && validatedQuery.type !== 'all') {
      whereClause.type = validatedQuery.type;
    }

    if (validatedQuery.status && validatedQuery.status !== 'all') {
      whereClause.deliveryStatus = validatedQuery.status;
    }

    if (validatedQuery.unreadOnly) {
      whereClause.readAt = null;
    }

    // Fetch notifications with pagination
    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: validatedQuery.limit,
        include: {
          session: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      }),
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({
        where: {
          userId: session.user.id,
          readAt: null
        }
      })
    ]);

    // Format notifications for display
    const formattedNotifications = notifications.map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      deliveryStatus: notification.deliveryStatus,
      deliveryMethod: notification.deliveryMethod,
      scheduledFor: notification.scheduledFor,
      sentAt: notification.sentAt,
      deliveredAt: notification.deliveredAt,
      readAt: notification.readAt,
      actionUrl: notification.actionUrl,
      actionTaken: notification.actionTaken,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      session: notification.session ? {
        id: notification.session.id,
        date: notification.session.date,
        theme: notification.session.theme,
        status: notification.session.status
      } : null
    }));

    return NextResponse.json({
      notifications: formattedNotifications,
      pagination: {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / validatedQuery.limit!),
        hasNext: skip + validatedQuery.limit! < totalCount,
        hasPrevious: validatedQuery.page! > 1
      },
      summary: {
        totalNotifications: totalCount,
        unreadCount,
        readCount: totalCount - unreadCount
      }
    });

  } catch (error) {
    console.error('Failed to fetch notifications:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to fetch notifications'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'markRead':
        const markReadData = MarkReadSchema.parse(body);
        
        if (markReadData.markAll) {
          // Mark all notifications as read
          await prisma.notification.updateMany({
            where: {
              userId: session.user.id,
              readAt: null
            },
            data: {
              readAt: new Date()
            }
          });

          return NextResponse.json({
            success: true,
            message: 'All notifications marked as read'
          });
        } else {
          // Mark specific notifications as read
          await prisma.notification.updateMany({
            where: {
              id: { in: markReadData.notificationIds },
              userId: session.user.id
            },
            data: {
              readAt: new Date()
            }
          });

          return NextResponse.json({
            success: true,
            message: `${markReadData.notificationIds.length} notifications marked as read`
          });
        }

      case 'takeAction':
        const { notificationId, actionType } = body;
        
        if (!notificationId) {
          return NextResponse.json({
            error: 'Notification ID is required'
          }, { status: 400 });
        }

        await prisma.notification.update({
          where: {
            id: notificationId,
            userId: session.user.id
          },
          data: {
            actionTaken: actionType,
            readAt: new Date()
          }
        });

        return NextResponse.json({
          success: true,
          message: 'Action recorded successfully'
        });

      default:
        return NextResponse.json({
          error: 'Invalid action'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Failed to update notifications:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to update notifications'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    const deleteAll = searchParams.get('deleteAll') === 'true';

    if (deleteAll) {
      // Delete all read notifications older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedCount = await prisma.notification.deleteMany({
        where: {
          userId: session.user.id,
          readAt: { not: null },
          createdAt: { lt: thirtyDaysAgo }
        }
      });

      return NextResponse.json({
        success: true,
        message: `${deletedCount.count} old notifications deleted`
      });
    }

    if (!notificationId) {
      return NextResponse.json({
        error: 'Notification ID is required'
      }, { status: 400 });
    }

    await prisma.notification.delete({
      where: {
        id: notificationId,
        userId: session.user.id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Failed to delete notification:', error);
    return NextResponse.json({
      error: 'Failed to delete notification'
    }, { status: 500 });
  }
}