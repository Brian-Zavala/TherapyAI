import { getAuthSession } from '@/lib/auth'
// src/app/api/dashboard/relationship-progress/route.ts
import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma-optimized';
import { 
  handleDashboardError, 
  validateDashboardAuth,
  withRetry,
  DashboardError,
  DashboardErrorCode
} from '@/lib/api/dashboard-error-handler';
import { dashboardCache, cacheKeys } from '@/lib/cache/dashboard-cache';
import { performanceMonitor } from '@/lib/performance/monitoring';
import { findUserByEmailOptimized } from '@/lib/database/optimized-user-queries';

// Utility to convert frontend therapy type to Prisma enum for filtering
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

export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const therapyType = searchParams.get('type') || 'couple';
    const timeframe = searchParams.get('timeframe') || 'all'; // 'week', 'month', 'all'
    
    // Don't include solo therapy data in relationship progress
    if (therapyType === 'solo') {
      return NextResponse.json([]);
    }

    // Use cached session to reduce auth overhead
    const session = await getAuthSession();
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
    
    // Try cache first with therapy type
    const cacheKey = cacheKeys.relationshipProgress(user.id, therapyType, timeframe);
    const cached = await dashboardCache.get(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      console.log(`[RelationshipProgress] Cache hit for ${therapyType}, returned in ${duration}ms`);
      performanceMonitor.trackApiCall('/api/dashboard/relationship-progress', duration, user.id, { cacheHit: true, therapyType });
      return NextResponse.json(cached);
    }
    
    // CRITICAL FIX: Use sessionType for accurate filtering with proper enum conversion
    const sessionTypeValue = therapyTypeToPrismaEnum(therapyType);

    // Date filter based on timeframe
    const dateFilter: any = {};
    if (timeframe === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      dateFilter.gte = oneWeekAgo;
    } else if (timeframe === 'month') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      dateFilter.gte = oneMonthAgo;
    }

    // Get progress metrics from the ProgressTracking table with retry and error handling
    // Filter by sessionType through the session relation
    let progressData: any[] = [];
    try {
      progressData = await withRetry(
        () => prisma.progressTracking.findMany({
          where: {
            userId: user.id,
            sessionId: { not: null }, // CRITICAL: Only include records with valid session links
            ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
            // Filter by sessionType through session relation
            session: {
              sessionType: sessionTypeValue
            }
          },
          select: {
            date: true,
            closenessScore: true,
            communicationScore: true,
            notes: true,
            sessionId: true,
            assistantId: true // Include assistant ID
          },
          orderBy: {
            date: 'asc'
          },
          take: 12 // Increased to show more data points
        })
      );
    } catch (progressError) {
      console.warn(`[RelationshipProgress] Progress tracking fetch failed for ${therapyType}:`, progressError);
      // Continue with empty array rather than failing the entire request
      progressData = [];
    }

    // Format the data for the chart based on therapy type
    let formattedData;
    
    // Helper function to generate insights based on scores
    const generateInsight = (current: any, previous: any, type: string) => {
      if (!previous) return type === 'family' ? "Initial family assessment" : "Initial couple assessment";
      
      const closenessChange = current.closenessScore - previous.closenessScore;
      const commChange = current.communicationScore - previous.communicationScore;
      const overallChange = (closenessChange + commChange) / 2;
      
      // Therapy-specific insights
      if (type === 'family') {
        if (overallChange > 5) return "Significant family dynamics improvement";
        if (overallChange > 2) return "Family connections strengthening";
        if (overallChange < -2) return "Facing family adjustment challenges";
        if (closenessChange > 3 && commChange < 0) return "Bonding improving, communication needs work";
        if (closenessChange < 0 && commChange > 3) return "Communication strategies effective";
        return "Steady family therapy progress";
      } else {
        // Couple AI insights
        if (overallChange > 5) return "Relationship breakthrough";
        if (overallChange > 2) return "Positive relationship momentum";
        if (overallChange < -2) return "Working through relationship challenges";
        if (closenessChange > 3 && commChange < 0) return "Emotional connection improving, dialogue needs work";
        if (closenessChange < 0 && commChange > 3) return "Communication techniques effective";
        return "Steady relationship progress";
      }
    };
    
    // Calculate trend data (for progress indicators)
    const calculateTrends = (data: any[]) => {
      if (data.length < 2) return { closeness: 0, communication: 0 };
      
      const firstEntry = data[0];
      const lastEntry = data[data.length - 1];
      
      return {
        closeness: lastEntry.closenessScore - firstEntry.closenessScore,
        communication: lastEntry.communicationScore - firstEntry.communicationScore
      };
    };
    
    const trends = calculateTrends(progressData);
    
    if (therapyType === 'family') {
      formattedData = progressData.map((entry, index) => {
        const prevEntry = index > 0 ? progressData[index - 1] : null;
        const dateFormatted = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        return {
          week: `${dateFormatted}`,
          closeness: Math.min(100, Math.max(0, entry.closenessScore + 3)), // Adjust for family therapy
          communication: Math.min(100, Math.max(0, entry.communicationScore - 3)), // Adjust for family therapy
          notes: entry.notes || "",
          sessionId: entry.sessionId || null,
          insight: generateInsight(entry, prevEntry, 'family'),
          date: entry.date,
          rawCloseness: entry.closenessScore,
          rawCommunication: entry.communicationScore,
          sessionNumber: index + 1,
          trends
        };
      });
    } else {
      // Default 'couple' therapy
      formattedData = progressData.map((entry, index) => {
        const prevEntry = index > 0 ? progressData[index - 1] : null;
        const dateFormatted = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        return {
          week: `${dateFormatted}`,
          closeness: entry.closenessScore,
          communication: entry.communicationScore,
          notes: entry.notes || "",
          sessionId: entry.sessionId || null,
          insight: generateInsight(entry, prevEntry, 'couple'),
          date: entry.date,
          rawCloseness: entry.closenessScore,
          rawCommunication: entry.communicationScore,
          sessionNumber: index + 1,
          trends
        };
      });
    }

    // If no progress data found, analyze session data to get real metrics instead of using static defaults
    if (formattedData.length === 0) {
      // Get completed sessions for the user with retry
      const completedSessions = await withRetry(
        () => prisma.session.findMany({
          where: {
            userId: user.id,
            status: 'COMPLETED',
            sessionType: sessionTypeValue
          },
          select: {
            id: true,
            date: true,
            duration: true,
            notes: true
          },
          orderBy: {
            date: 'asc'
          }
        })
      );
      
      console.log(`Found ${completedSessions.length} completed sessions for ${therapyType} therapy`);
      
      // If there are completed sessions, generate progress tracking data based on real sessions
      if (completedSessions.length > 0) {
        // Group sessions by week for aggregated data
        const sessionsByWeek = completedSessions.reduce<Record<string, typeof completedSessions>>((acc, session) => {
          const sessionDate = new Date(session.date);
          const weekStart = new Date(sessionDate);
          weekStart.setDate(sessionDate.getDate() - sessionDate.getDay());
          const weekKey = weekStart.toISOString().split('T')[0];
          
          if (!acc[weekKey]) {
            acc[weekKey] = [];
          }
          acc[weekKey].push(session);
          return acc;
        }, {});
        
        // Generate default data for weeks without metrics
        const weeks = Object.keys(sessionsByWeek).sort();
        console.log(`Grouped into ${weeks.length} weeks`);
        
        // No automated data generation - return empty array
        console.log(`Found ${completedSessions.length} completed sessions, but no progress tracking data`);
        
        // Cache empty result and track performance
        await dashboardCache.set(cacheKey, []);
        const duration = Date.now() - startTime;
        performanceMonitor.trackApiCall('/api/dashboard/relationship-progress', duration, user.id, { emptyResult: true });
        
        return NextResponse.json([]);
      }
      
      // If no completed sessions, return empty array
      console.log("No completed sessions found, returning empty array");
      
      // Cache empty result and track performance
      await dashboardCache.set(cacheKey, []);
      const duration = Date.now() - startTime;
      performanceMonitor.trackApiCall('/api/dashboard/relationship-progress', duration, user.id, { emptyResult: true });
      
      return NextResponse.json([]);
    }

    // Cache the response before returning
    await dashboardCache.set(cacheKey, formattedData);
    
    const duration = Date.now() - startTime;
    console.log(`[RelationshipProgress] Query completed for ${therapyType} in ${duration}ms`);
    performanceMonitor.trackApiCall('/api/dashboard/relationship-progress', duration, user.id, { cacheHit: false, therapyType });
    
    // Log slow queries for monitoring
    if (duration > 500) {
      console.warn(`[RelationshipProgress] Slow query detected: ${duration}ms`, {
        userId: user.id,
        therapyType,
        timeframe,
      });
    }
    
    // If we have real data, return it
    return NextResponse.json(formattedData);
  } catch (error) {
    const duration = Date.now() - startTime;
    performanceMonitor.trackApiCall('/api/dashboard/relationship-progress', duration, undefined, { error: true });
    
    return handleDashboardError(error, {
      route: '/api/dashboard/relationship-progress',
      userId: (await getAuthSession())?.user?.id,
      action: 'fetchRelationshipProgress',
    });
  }
}