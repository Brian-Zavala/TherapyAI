// @ts-nocheck
// src/hooks/useDashboardData.ts
"use client";

import { useMemo } from 'react';
import { useSession } from '@/hooks/useClerkSession'
import { useQuery } from '@tanstack/react-query'
import type {
  EnhancedMetricData,
  MetricInsight,
  CommunicationPattern,
  Milestone,
  Recommendation,
  HabitData,
  ProgressSummary
} from '@/lib/enhanced-metrics/types';

export interface DashboardData {
  metrics: EnhancedMetricData[];
  insights: MetricInsight[];
  patterns: CommunicationPattern[];
  milestones: Milestone[];
  recommendations: Recommendation[];
  habits: HabitData[];
  summary: ProgressSummary;
  loading: boolean;
  error: string | null;
}

const defaultSummary: ProgressSummary = {
  overallProgress: 0,
  sessionsCompleted: 0,
  averageSessionRating: 0,
  currentStreak: 0,
  improvementRate: 0,
  weeklyGoalProgress: 0,
  totalTimeInvested: 0,
  keyStrengths: [],
  areasOfGrowth: []
};

async function fetchDashboardData(period: string) {
  const [metricsResponse, commResponse, progressResponse] = await Promise.all([
    fetch(`/api/dashboard/metrics/enhanced?period=${period}`),
    fetch('/api/dashboard/communication-metrics'),
    fetch('/api/dashboard/relationship-progress'),
  ]);

  if (!metricsResponse.ok) throw new Error('Failed to fetch metrics');
  if (!commResponse.ok) throw new Error('Failed to fetch communication metrics');
  if (!progressResponse.ok) throw new Error('Failed to fetch progress');

  const [metricsData, commData, progressData] = await Promise.all([
    metricsResponse.json(),
    commResponse.json(),
    progressResponse.json(),
  ]);

  return { metricsData, commData, progressData };
}

function transformDashboardData(raw: Awaited<ReturnType<typeof fetchDashboardData>>) {
  const { metricsData, commData, progressData } = raw;

  // Transform the data into our enhanced format
  const enhancedMetrics: EnhancedMetricData[] = [
    {
      id: 'clarity',
      name: 'Communication Clarity',
      value: commData.metrics?.clarityScore || 0,
      previousValue: commData.previousMetrics?.clarityScore,
      trend: commData.trends?.clarity > 0 ? 'up' : commData.trends?.clarity < 0 ? 'down' : 'stable',
      confidence: 0.85,
      source: 'session',
      timestamp: new Date().toISOString()
    },
    {
      id: 'empathy',
      name: 'Empathy & Understanding',
      value: commData.metrics?.empathyScore || 0,
      previousValue: commData.previousMetrics?.empathyScore,
      trend: commData.trends?.empathy > 0 ? 'up' : commData.trends?.empathy < 0 ? 'down' : 'stable',
      confidence: 0.90,
      source: 'session',
      timestamp: new Date().toISOString()
    },
    {
      id: 'respect',
      name: 'Mutual Respect',
      value: commData.metrics?.respectScore || 0,
      previousValue: commData.previousMetrics?.respectScore,
      trend: commData.trends?.respect > 0 ? 'up' : commData.trends?.respect < 0 ? 'down' : 'stable',
      confidence: 0.88,
      source: 'session',
      timestamp: new Date().toISOString()
    }
  ];

  // Generate insights based on metrics
  const insights: MetricInsight[] = [];
  const strongMetrics = enhancedMetrics.filter(m => m.value > 75);
  const weakMetrics = enhancedMetrics.filter(m => m.value < 50);

  strongMetrics.forEach(metric => {
    insights.push({
      id: `strength-${metric.id}`,
      type: 'strength',
      title: `Strong ${metric.name}`,
      description: `Your ${metric.name.toLowerCase()} score is excellent at ${metric.value}%. Keep up the great work!`,
      metric: metric.id,
      impact: 'high',
      confidence: metric.confidence
    });
  });

  weakMetrics.forEach(metric => {
    insights.push({
      id: `improvement-${metric.id}`,
      type: 'improvement',
      title: `Improve ${metric.name}`,
      description: `Your ${metric.name.toLowerCase()} score is ${metric.value}%. Focus on this area for better communication.`,
      metric: metric.id,
      impact: 'medium',
      confidence: metric.confidence,
      suggestedActions: [
        'Practice active listening',
        'Ask clarifying questions',
        'Validate your partner\'s feelings'
      ]
    });
  });

  // Calculate summary
  const summary: ProgressSummary = {
    overallProgress: Math.round((enhancedMetrics.reduce((sum, m) => sum + m.value, 0) / enhancedMetrics.length)),
    sessionsCompleted: metricsData.sessionStats?.total_sessions || 0,
    averageSessionRating: progressData.averageRating || 0,
    currentStreak: progressData.currentStreak || 0,
    improvementRate: Math.round(((commData.metrics?.overallScore || 0) - (commData.previousMetrics?.overallScore || 0)) / (commData.previousMetrics?.overallScore || 1) * 100),
    weeklyGoalProgress: 0,
    totalTimeInvested: metricsData.sessionStats?.total_duration || 0,
    keyStrengths: strongMetrics.map(m => m.name),
    areasOfGrowth: weakMetrics.map(m => m.name)
  };

  // Generate patterns
  const patterns: CommunicationPattern[] = [];
  if (commData.trends?.clarity > 10) {
    patterns.push({
      id: 'clarity-improving',
      name: 'Improving Clarity',
      type: 'positive',
      frequency: 'frequent',
      impact: 'high',
      firstDetected: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      lastDetected: new Date().toISOString(),
      description: 'Your communication clarity has been consistently improving'
    });
  }

  // Generate milestones
  const milestones: Milestone[] = [
    {
      id: 'first-session',
      title: 'First Session Completed',
      description: 'You completed your first therapy session',
      type: 'achievement',
      progress: 100,
      criteria: { target: 1, current: metricsData.sessionStats?.total_sessions || 0, unit: 'sessions' },
      unlockedAt: metricsData.sessionStats?.total_sessions > 0 ? new Date().toISOString() : undefined,
      reward: { type: 'badge', value: 10, icon: '🏅' }
    },
    {
      id: 'week-streak',
      title: '7-Day Streak',
      description: 'Complete sessions for 7 consecutive days',
      type: 'streak',
      progress: Math.min((progressData.currentStreak || 0) / 7 * 100, 100),
      criteria: { target: 7, current: progressData.currentStreak || 0, unit: 'days' },
      unlockedAt: progressData.currentStreak >= 7 ? new Date().toISOString() : undefined,
      reward: { type: 'badge', value: 25, icon: '🔥' }
    }
  ];

  // Generate recommendations
  const recommendations: Recommendation[] = [];
  if (commData.metrics?.clarityScore < 60) {
    recommendations.push({
      id: 'improve-clarity',
      title: 'Practice "I" Statements',
      description: 'Use "I feel" statements to express your emotions clearly without blaming',
      category: 'communication',
      priority: 'high',
      impact: 'high',
      estimatedTime: 10,
      resources: [
        { type: 'article', title: 'Guide to I Statements', url: '#' },
        { type: 'exercise', title: 'Practice Exercise', url: '#' }
      ]
    });
  }

  return {
    metrics: enhancedMetrics,
    insights,
    patterns,
    milestones,
    recommendations,
    habits: [] as HabitData[],
    summary,
  };
}

export function useDashboardData(period: string = 'month'): DashboardData {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardData', userId, period],
    queryFn: () => fetchDashboardData(period),
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  return useMemo(() => {
    if (!data) {
      return {
        metrics: [],
        insights: [],
        patterns: [],
        milestones: [],
        recommendations: [],
        habits: [],
        summary: defaultSummary,
        loading: isLoading,
        error: error instanceof Error ? error.message : error ? 'Failed to load dashboard data' : null,
      };
    }

    const transformed = transformDashboardData(data);
    return {
      ...transformed,
      loading: false,
      error: null,
    };
  }, [data, isLoading, error]);
}
