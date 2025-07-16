// src/app/api/dashboard/metrics/v2/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma-optimized';
import { z } from "zod";
import { cache } from "react";

// ========================================
// TYPES & VALIDATION
// ========================================

const MetricQuerySchema = z.object({
  type: z.enum(['couple', 'family', 'individual']).optional().default('couple'),
  timeRange: z.enum(['week', 'month', 'quarter', 'year', 'all']).optional().default('month'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  includeRealTime: z.boolean().optional().default(false),
  aggregation: z.enum(['latest', 'average', 'trend']).optional().default('latest')
});

type MetricQuery = z.infer<typeof MetricQuerySchema>;

interface MetricResponse {
  metrics: MetricData[];
  metadata: {
    totalSessions: number;
    averageConfidence: number;
    lastUpdated: string;
    dataQuality: 'high' | 'medium' | 'low';
    suggestions?: string[];
  };
  trends?: {
    period: string;
    direction: 'improving' | 'declining' | 'stable';
    changePercentage: number;
  };
}

interface MetricData {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  trend?: 'up' | 'down' | 'stable';
  confidence: number;
  source: 'session' | 'assessment' | 'calculated';
  timestamp: string;
}

// ========================================
// CACHING
// ========================================

const getCachedUser = cache(async (email: string) => {
  return await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          sessionFrequency: true
        }
      }
    }
  });
});

// ========================================
// METRIC CALCULATIONS
// ========================================

class MetricCalculator {
  private static readonly METRIC_WEIGHTS = {
    couple: {
      listening: 0.25,
      expression: 0.25,
      respect: 0.25,
      empathy: 0.25
    },
    family: {
      communication: 0.3,
      boundaries: 0.2,
      support: 0.3,
      cohesion: 0.2
    },
    individual: {
      awareness: 0.3,
      regulation: 0.3,
      growth: 0.2,
      coping: 0.2
    }
  };

  static calculateOverallScore(metrics: Record<string, number>, type: string): number {
    const weights = this.METRIC_WEIGHTS[type as keyof typeof this.METRIC_WEIGHTS] || this.METRIC_WEIGHTS.couple;
    
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [key, weight] of Object.entries(weights)) {
      if (metrics[key] !== undefined) {
        totalScore += metrics[key] * weight;
        totalWeight += weight;
      }
    }
    
    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  static calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
    const threshold = 5; // 5% threshold
    const change = ((current - previous) / previous) * 100;
    
    if (Math.abs(change) < threshold) return 'stable';
    return change > 0 ? 'up' : 'down';
  }

  static assessDataQuality(sessions: any[], metrics: any[]): 'high' | 'medium' | 'low' {
    const hasRecentSessions = sessions.some(s => 
      new Date(s.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    const hasMultipleSessions = sessions.length >= 3;
    const hasHighConfidence = metrics.some(m => m.confidence > 70);
    
    if (hasRecentSessions && hasMultipleSessions && hasHighConfidence) return 'high';
    if (hasRecentSessions || hasMultipleSessions) return 'medium';
    return 'low';
  }

  static generateSuggestions(metrics: MetricData[], type: string): string[] {
    const suggestions: string[] = [];
    
    // Find lowest performing metrics
    const lowMetrics = metrics.filter(m => m.value < 60);
    const decliningMetrics = metrics.filter(m => m.trend === 'down');
    
    if (lowMetrics.length > 0) {
      const lowestMetric = lowMetrics.sort((a, b) => a.value - b.value)[0];
      suggestions.push(`Focus on improving ${lowestMetric.name.toLowerCase()} in your next session`);
    }
    
    if (decliningMetrics.length > 0) {
      suggestions.push(`Some metrics are declining. Consider discussing this with your therapist`);
    }
    
    if (metrics.every(m => m.value > 80)) {
      suggestions.push(`Great progress! Consider setting new goals to maintain momentum`);
    }
    
    return suggestions;
  }
}

// ========================================
// MAIN HANDLER
// ========================================

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const queryResult = MetricQuerySchema.safeParse(searchParams);
    
    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: queryResult.error.errors },
        { status: 400 }
      );
    }
    
    const query = queryResult.data;

    // 3. Get user data (cached)
    const user = await getCachedUser(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 4. Determine effective therapy type
    const effectiveType = query.type === 'individual' ? 'solo' : query.type;
    const themeValue = effectiveType === 'couple' ? 'Relationship Counseling' : 
                       effectiveType === 'solo' ? 'Individual Therapy' : 'Family Therapy';

    // 5. Build date range filter
    const dateFilter = query.startDate && query.endDate ? {
      date: {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate)
      }
    } : query.timeRange !== 'all' ? {
      date: {
        gte: new Date(Date.now() - getTimeRangeMs(query.timeRange))
      }
    } : {};

    // 6. Fetch sessions with metrics
    const sessions = await prisma.session.findMany({
      where: {
        userId: user.id,
        status: 'completed',
        theme: themeValue,
        ...dateFilter
      },
      orderBy: { date: 'desc' },
      take: query.aggregation === 'trend' ? 20 : 10,
      select: {
        id: true,
        date: true,
        duration: true,
        conversationTimeSeconds: true,
        communicationMetrics: {
          select: {
            clarity: true,
            empathy: true,
            respect: true,
            overall: true,
            listening: true,
            expression: true,
            confidence: true,
            calculatedAt: true,
            metricType: true
          },
          orderBy: { calculatedAt: 'desc' },
          take: 1
        }
      }
    });

    // 7. Fetch standalone metrics (assessments)
    const standaloneMetrics = await prisma.communicationMetric.findMany({
      where: {
        userId: user.id,
        sessionId: null,
        metricType: 'assessment',
        ...dateFilter
      },
      orderBy: { calculatedAt: 'desc' },
      take: 5
    });

    // 8. Process and aggregate metrics
    let processedMetrics: MetricData[] = [];
    
    if (query.aggregation === 'latest') {
      // Get the most recent metrics
      const latestMetric = sessions[0]?.communicationMetrics[0] || standaloneMetrics[0];
      
      if (latestMetric) {
        processedMetrics = transformMetricsToData(latestMetric, effectiveType);
      } else {
        // Generate baseline metrics for new users
        processedMetrics = generateBaselineMetrics(effectiveType, sessions.length);
      }
    } else if (query.aggregation === 'average') {
      // Calculate average across all sessions
      const allMetrics = [
        ...sessions.flatMap(s => s.communicationMetrics),
        ...standaloneMetrics
      ].filter(Boolean);
      
      if (allMetrics.length > 0) {
        processedMetrics = calculateAverageMetrics(allMetrics, effectiveType);
      } else {
        processedMetrics = generateBaselineMetrics(effectiveType, 0);
      }
    } else {
      // Trend analysis
      processedMetrics = calculateTrendMetrics(sessions, standaloneMetrics, effectiveType);
    }

    // 9. Calculate metadata
    const avgConfidence = calculateAverageConfidence([
      ...sessions.flatMap(s => s.communicationMetrics),
      ...standaloneMetrics
    ]);
    
    const dataQuality = MetricCalculator.assessDataQuality(sessions, processedMetrics);
    const suggestions = MetricCalculator.generateSuggestions(processedMetrics, effectiveType);

    // 10. Calculate trends if requested
    let trends;
    if (query.aggregation === 'trend' && sessions.length >= 2) {
      const oldMetrics = sessions.slice(Math.floor(sessions.length / 2));
      const newMetrics = sessions.slice(0, Math.floor(sessions.length / 2));
      
      const oldAvg = calculateAverageScore(oldMetrics);
      const newAvg = calculateAverageScore(newMetrics);
      
      trends = {
        period: query.timeRange,
        direction: newAvg > oldAvg ? 'improving' as const : 
                   newAvg < oldAvg ? 'declining' as const : 'stable' as const,
        changePercentage: Math.round(((newAvg - oldAvg) / oldAvg) * 100)
      };
    }

    // 11. Build response
    const response: MetricResponse = {
      metrics: processedMetrics,
      metadata: {
        totalSessions: sessions.length,
        averageConfidence: avgConfidence,
        lastUpdated: new Date().toISOString(),
        dataQuality,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      },
      trends
    };

    // 12. Set cache headers
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
        'X-Data-Quality': dataQuality,
        'X-Session-Count': sessions.length.toString()
      }
    });

  } catch (error) {
    console.error("Metrics API error:", error);
    
    // Differentiate between different error types
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error && error.message.includes('P2025')) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }
    
    // Generic error response
    return NextResponse.json(
      { error: "Failed to fetch metrics", message: process.env.NODE_ENV === 'development' ? error : undefined },
      { status: 500 }
    );
  }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function getTimeRangeMs(range: string): number {
  const ranges: Record<string, number> = {
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    quarter: 90 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000
  };
  return ranges[range] || ranges.month;
}

function transformMetricsToData(metric: any, type: string): MetricData[] {
  const metricMap = {
    couple: [
      { key: 'listening', name: 'Active Listening' },
      { key: 'expression', name: 'Expressing Needs' },
      { key: 'respect', name: 'Conflict Resolution' },
      { key: 'empathy', name: 'Emotional Support' }
    ],
    family: [
      { key: 'clarity', name: 'Family Communication' },
      { key: 'expression', name: 'Role Definition' },
      { key: 'respect', name: 'Conflict Management' },
      { key: 'empathy', name: 'Family Bonding' }
    ],
    solo: [
      { key: 'clarity', name: 'Self-awareness' },
      { key: 'expression', name: 'Emotional Regulation' },
      { key: 'respect', name: 'Personal Growth' },
      { key: 'empathy', name: 'Coping Skills' }
    ]
  };

  const mapping = metricMap[type as keyof typeof metricMap] || metricMap.couple;
  
  return mapping.map((m, index) => ({
    id: `metric-${m.key}`,
    name: m.name,
    value: Math.round(metric[m.key] || metric.overall || 50),
    confidence: metric.confidence || 70,
    source: metric.metricType === 'assessment' ? 'assessment' : 'session',
    timestamp: metric.calculatedAt.toISOString()
  }));
}

function generateBaselineMetrics(type: string, sessionCount: number): MetricData[] {
  const baseValue = 30 + Math.min(sessionCount * 5, 20);
  const timestamp = new Date().toISOString();
  
  const metricNames = {
    couple: ['Active Listening', 'Expressing Needs', 'Conflict Resolution', 'Emotional Support'],
    family: ['Family Communication', 'Role Definition', 'Conflict Management', 'Family Bonding'],
    solo: ['Self-awareness', 'Emotional Regulation', 'Personal Growth', 'Coping Skills']
  };
  
  return (metricNames[type as keyof typeof metricNames] || metricNames.couple).map((name, index) => ({
    id: `baseline-${index}`,
    name,
    value: baseValue + (index * 5),
    confidence: 30,
    source: 'calculated' as const,
    timestamp
  }));
}

function calculateAverageMetrics(metrics: any[], type: string): MetricData[] {
  if (metrics.length === 0) return generateBaselineMetrics(type, 0);
  
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  
  metrics.forEach(m => {
    ['clarity', 'empathy', 'respect', 'overall', 'listening', 'expression'].forEach(key => {
      if (m[key] !== null && m[key] !== undefined) {
        sums[key] = (sums[key] || 0) + m[key];
        counts[key] = (counts[key] || 0) + 1;
      }
    });
  });
  
  const avgMetric = Object.keys(sums).reduce((acc, key) => ({
    ...acc,
    [key]: counts[key] > 0 ? sums[key] / counts[key] : 50
  }), {});
  
  return transformMetricsToData(avgMetric, type);
}

function calculateTrendMetrics(sessions: any[], standaloneMetrics: any[], type: string): MetricData[] {
  const allDataPoints = [
    ...sessions.map(s => ({
      date: s.date,
      metrics: s.communicationMetrics[0]
    })).filter(d => d.metrics),
    ...standaloneMetrics.map(m => ({
      date: m.calculatedAt,
      metrics: m
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  if (allDataPoints.length < 2) {
    return generateBaselineMetrics(type, sessions.length);
  }
  
  const latest = allDataPoints[0].metrics;
  const previous = allDataPoints[Math.min(allDataPoints.length - 1, 5)].metrics;
  
  const latestData = transformMetricsToData(latest, type);
  const previousData = transformMetricsToData(previous, type);
  
  return latestData.map((metric, index) => ({
    ...metric,
    previousValue: previousData[index]?.value,
    trend: MetricCalculator.calculateTrend(metric.value, previousData[index]?.value || metric.value)
  }));
}

function calculateAverageConfidence(metrics: any[]): number {
  const validMetrics = metrics.filter(m => m && m.confidence !== null && m.confidence !== undefined);
  if (validMetrics.length === 0) return 50;
  
  const sum = validMetrics.reduce((acc, m) => acc + m.confidence, 0);
  return Math.round(sum / validMetrics.length);
}

function calculateAverageScore(sessions: any[]): number {
  const scores = sessions
    .filter(s => s.communicationMetrics.length > 0)
    .map(s => s.communicationMetrics[0].overall);
    
  if (scores.length === 0) return 50;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}