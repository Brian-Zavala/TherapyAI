// src/app/api/sessions/counts/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma-optimized';
import { 
  handleDashboardError, 
  validateDashboardAuth,
  withRetry,
  DashboardError,
  DashboardErrorCode
} from '@/lib/api/dashboard-error-handler';
import { dashboardCache, cacheKeys } from '@/lib/cache/dashboard-cache';
import { getCachedSession } from '@/lib/auth/session-cache';
import { performanceMonitor } from '@/lib/performance/monitoring';
import { findUserByEmailOptimized } from '@/lib/database/optimized-user-queries';

export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
    // Use cached session to reduce auth overhead
    const session = await getCachedSession(request);
    const { email } = await validateDashboardAuth(session);

    // Find the user in the database using optimized query with caching
    const userResult = await findUserByEmailOptimized(email);
    const user = userResult ? { id: userResult.id } : null;

    if (!user) {
      throw new DashboardError(
        DashboardErrorCode.RECORD_NOT_FOUND,
        'User not found in database',
        404
      );
    }
    
    // Try cache first
    const cacheKey = cacheKeys.sessionCounts(user.id);
    const cached = await dashboardCache.get(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      console.log(`[SessionCounts] Cache hit, returned in ${duration}ms`);
      performanceMonitor.trackApiCall('/api/sessions/counts', duration, user.id, { cacheHit: true });
      return NextResponse.json(cached);
    }
    
    // Get session counts by therapy type with retry
    const sessionCounts = await withRetry(
      () => prisma.session.groupBy({
        by: ['sessionType'],
        where: {
          userId: user.id,
          status: 'COMPLETED'
        },
        _count: {
          id: true
        }
      })
    );
    
    // Also get counts by theme for more accurate mapping
    const sessionCountsByTheme = await withRetry(
      () => prisma.session.groupBy({
        by: ['theme'],
        where: {
          userId: user.id,
          status: 'COMPLETED'
        },
        _count: {
          id: true
        }
      })
    );
    
    // Map session types and themes to our standard therapy types
    const mapSessionTypeToTherapyType = (sessionType: string, theme: string): 'solo' | 'couple' | 'family' | null => {
      // First check theme for more accurate mapping
      const lowerTheme = theme.toLowerCase();
      if (lowerTheme.includes('individual') || lowerTheme.includes('solo')) {
        return 'solo';
      }
      if (lowerTheme.includes('relationship') || lowerTheme.includes('couple')) {
        return 'couple';
      }
      if (lowerTheme.includes('family')) {
        return 'family';
      }
      
      // Fallback to sessionType
      const lowerType = sessionType.toLowerCase();
      if (lowerType === 'individual' || lowerType === 'solo') {
        return 'solo';
      }
      if (lowerType === 'couple') {
        return 'couple';
      }
      if (lowerType === 'family') {
        return 'family';
      }
      
      return null;
    };
    
    // Get detailed session data for accurate mapping
    const allSessions = await withRetry(
      () => prisma.session.findMany({
        where: {
          userId: user.id,
          status: 'COMPLETED'
        },
        select: {
          sessionType: true,
          theme: true
        }
      })
    );
    
    // Count sessions by therapy type
    const counts = { solo: 0, couple: 0, family: 0 };
    
    allSessions.forEach(session => {
      const therapyType = mapSessionTypeToTherapyType(session.sessionType, session.theme);
      if (therapyType) {
        counts[therapyType]++;
      }
    });
    
    // Create response data
    const responseData = {
      solo: counts.solo,
      couple: counts.couple,
      family: counts.family,
      total: counts.solo + counts.couple + counts.family,
      breakdown: {
        bySessionType: sessionCounts.reduce((acc, item) => {
          acc[item.sessionType] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        byTheme: sessionCountsByTheme.reduce((acc, item) => {
          acc[item.theme] = item._count.id;
          return acc;
        }, {} as Record<string, number>)
      }
    };
    
    // Cache the response for 5 minutes (shorter than other dashboard data)
    await dashboardCache.set(cacheKey, responseData, 5 * 60); // 5 minutes
    
    const duration = Date.now() - startTime;
    console.log(`[SessionCounts] Query completed in ${duration}ms`, {
      userId: user.id,
      counts: responseData
    });
    performanceMonitor.trackApiCall('/api/sessions/counts', duration, user.id, { cacheHit: false });
    
    // Log slow queries for monitoring
    if (duration > 500) {
      console.warn(`[SessionCounts] Slow query detected: ${duration}ms`, {
        userId: user.id,
        totalSessions: responseData.total
      });
    }
    
    return NextResponse.json(responseData);
  } catch (error) {
    const duration = Date.now() - startTime;
    performanceMonitor.trackApiCall('/api/sessions/counts', duration, undefined, { error: true });
    
    return handleDashboardError(error, {
      route: '/api/sessions/counts',
      userId: (await getServerSession(authOptions))?.user?.id,
      action: 'fetchSessionCounts',
    });
  }
}

// Helper function to get session counts for a specific therapy type
export async function getSessionCountForTherapyType(
  userId: string, 
  therapyType: 'solo' | 'couple' | 'family'
): Promise<number> {
  // CRITICAL FIX: Use sessionType as primary filter with proper enum conversion
  function therapyTypeToPrismaEnum(therapyType: string): 'SOLO' | 'COUPLE' | 'FAMILY' {
    switch (therapyType.toLowerCase()) {
      case 'solo': 
      case 'individual':
        return 'SOLO';
      case 'couple':
        return 'COUPLE';  
      case 'family':
        return 'FAMILY';
      default:
        return 'SOLO';
    }
  }
  
  const sessionTypeValue = therapyTypeToPrismaEnum(therapyType);
  const themeMapping = {
    solo: 'Individual Therapy',
    couple: 'Relationship Counseling',
    family: 'Family Therapy'
  };
  
  const count = await prisma.session.count({
    where: {
      userId,
      status: 'COMPLETED',
      OR: [
        // Primary: Use sessionType for accuracy
        { sessionType: sessionTypeValue },
        // Fallback: Theme-based for legacy sessions
        { theme: themeMapping[therapyType] }
      ]
    }
  });
  
  return count;
}