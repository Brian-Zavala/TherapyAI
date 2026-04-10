// @ts-nocheck
import { getAuthSession } from '@/lib/auth'
/**
 * Notifications API Route
 * Manages user notifications for display on webpage and tracking
 * Optimized with caching and performance monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-optimized';
import { z } from 'zod';
import { dashboardCache, cacheKeys } from '@/lib/cache/dashboard-cache';
import { performanceMonitor } from '@/lib/performance/monitoring';

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
  const startTime = Date.now();
  
  try {
    // Get session directly to avoid caching issues
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      type: searchParams.get('type') || undefined,
      status: searchParams.get('status') || undefined,
      unreadOnly: searchParams.get('unreadOnly') === 'true',
      limit: parseInt(searchParams.get('limit') || '20'),
      page: parseInt(searchParams.get('page') || '1')
    };

    const validatedQuery = NotificationQuerySchema.parse(queryParams);
    
    // Generate cache key
    const cacheKey = cacheKeys.notifications(session.user.id, validatedQuery);
    
    // Try cache first
    const cached = await dashboardCache.get(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      console.log(`[Notifications] Cache hit, returned in ${duration}ms`);
      performanceMonitor.trackApiCall('/api/notifications', duration, session.user.id, { cacheHit: true });
      return NextResponse.json(cached);
    }
    
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

    // Optimized query using transaction for better performance
    const result = await prisma.$transaction(async (tx) => {
      // Get notifications with only required fields
      const notifications = await tx.notification.findMany({
        where: whereClause,
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
          sessionId: true,
          session: {
            select: {
              id: true,
              date: true,
              theme: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: validatedQuery.limit || 20
      });
      
      // Get total count
      const totalCount = await tx.notification.count({ where: whereClause });
      
      // Get unread count
      const unreadCount = await tx.notification.count({
        where: {
          userId: session.user.id,
          readAt: null
        }
      });
      
      return {
        notifications,
        totalCount,
        unreadCount,
      };
    });

    // Format notifications for display
    const formattedNotifications = result.notifications.map(notification => ({
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
      session: notification.session
    }));

    // Create response
    const response = {
      notifications: formattedNotifications,
      pagination: {
        page: validatedQuery.page || 1,
        limit: validatedQuery.limit || 20,
        total: result.totalCount,
        totalPages: Math.ceil(result.totalCount / (validatedQuery.limit || 20)),
        hasNext: skip + (validatedQuery.limit || 20) < result.totalCount,
        hasPrevious: (validatedQuery.page || 1) > 1,
      },
      summary: {
        totalCount: result.totalCount,
        unreadCount: result.unreadCount
      }
    };

    // Cache the response
    await dashboardCache.set(cacheKey, response);
    
    const duration = Date.now() - startTime;
    console.log(`[Notifications] Query completed in ${duration}ms`);
    performanceMonitor.trackApiCall('/api/notifications', duration, session.user.id, { cacheHit: false });
    
    // Log slow queries for monitoring
    if (duration > 500) {
      console.warn(`[Notifications] Slow query detected: ${duration}ms`, {
        userId: session.user.id,
        params: validatedQuery,
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    performanceMonitor.trackApiCall('/api/notifications', duration, undefined, { error: true });
    
    console.error('[Notifications] Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// Mark notifications as read (with performance optimizations)
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get session directly
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = MarkReadSchema.parse(body);

    let updatedCount = 0;

    if (validated.markAll) {
      const result = await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });
      updatedCount = result.count;
    } else if (validated.notificationIds && validated.notificationIds.length > 0) {
      const result = await prisma.notification.updateMany({
        where: {
          id: { in: validated.notificationIds },
          userId: session.user.id,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });
      updatedCount = result.count;
    }

    // Invalidate user's notification cache
    await dashboardCache.invalidateUser(session.user.id);
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackApiCall('/api/notifications', duration, session.user.id, { method: 'PUT' });

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `${updatedCount} notification${updatedCount !== 1 ? 's' : ''} marked as read`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    performanceMonitor.trackApiCall('/api/notifications', duration, undefined, { method: 'PUT', error: true });
    
    console.error('[Notifications] Update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}