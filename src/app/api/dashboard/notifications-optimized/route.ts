/**
 * Optimized Notifications API with caching and improved query performance
 * This is an example implementation showing how to apply the performance optimizations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database/prisma-optimized';
import { z } from 'zod';
import { dashboardCache, cacheKeys } from '@/lib/cache/dashboard-cache';

// Session cache to reduce auth overhead
const sessionCache = new Map<string, { session: any; expires: number }>();
const SESSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Optimized session retrieval
async function getCachedSession(request: Request) {
  const cacheKey = request.headers.get('cookie') || 'no-cookie';
  
  const cached = sessionCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.session;
  }
  
  const session = await getServerSession(authOptions);
  if (session) {
    sessionCache.set(cacheKey, {
      session,
      expires: Date.now() + SESSION_CACHE_TTL,
    });
  }
  
  return session;
}

// Query validation schema
const NotificationQuerySchema = z.object({
  type: z.enum(['reminder', 'completion', 'update', 'alert', 'all']).optional(),
  status: z.enum(['pending', 'sent', 'delivered', 'failed', 'all']).optional(),
  unreadOnly: z.boolean().optional(),
  limit: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional()
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Use cached session
    const session = await getCachedSession(request);
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
      console.log(`[Notifications] Cache hit, returned in ${Date.now() - startTime}ms`);
      return NextResponse.json(cached);
    }
    
    const skip = (validatedQuery.page! - 1) * validatedQuery.limit!;

    // Build optimized where clause
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

    // Optimized query using single transaction and aggregation
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
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: validatedQuery.limit || 20
      });
      
      // Get counts using aggregation (much faster than separate count queries)
      const counts = await tx.notification.aggregate({
        where: whereClause,
        _count: true,
      });
      
      const unreadCount = await tx.notification.aggregate({
        where: {
          userId: session.user.id,
          readAt: null
        },
        _count: true,
      });
      
      return {
        notifications,
        totalCount: counts._count,
        unreadCount: unreadCount._count,
      };
    });

    // Format response
    const response = {
      notifications: result.notifications,
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
        unreadCount: result.unreadCount,
        types: {
          reminder: result.notifications.filter(n => n.type === 'reminder').length,
          completion: result.notifications.filter(n => n.type === 'completion').length,
          update: result.notifications.filter(n => n.type === 'update').length,
          alert: result.notifications.filter(n => n.type === 'alert').length,
        }
      }
    };

    // Cache the response
    await dashboardCache.set(cacheKey, response);

    const duration = Date.now() - startTime;
    console.log(`[Notifications] Query completed in ${duration}ms`);
    
    // Log slow queries for monitoring
    if (duration > 500) {
      console.warn(`[Notifications] Slow query detected: ${duration}ms`, {
        userId: session.user.id,
        params: validatedQuery,
      });
    }

    return NextResponse.json(response);
  } catch (error) {
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

// Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const session = await getCachedSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAll } = body;

    let updatedCount = 0;

    if (markAll) {
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
    } else if (notificationIds && Array.isArray(notificationIds)) {
      const result = await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
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

    return NextResponse.json({
      success: true,
      updatedCount,
    });
  } catch (error) {
    console.error('[Notifications] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}