// @ts-nocheck
// src/hooks/useDashboardData.ts
"use client";

import { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useClerkSession'
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

export function useDashboardData(period: string = 'month'): DashboardData {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData>({
    metrics: [],
    insights: [],
    patterns: [],
    milestones: [],
    recommendations: [],
    habits: [],
    summary: {
      overallProgress: 0,
      sessionsCompleted: 0,
      averageSessionRating: 0,
      currentStreak: 0,
      improvementRate: 0,
      weeklyGoalProgress: 0,
      totalTimeInvested: 0,
      keyStrengths: [],
      areasOfGrowth: []
    },
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchDashboardData = async () => {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));

        // Fetch enhanced metrics
        const metricsResponse = await fetch(`/api/dashboard/metrics/enhanced?period=${period}`);
        if (!metricsResponse.ok) throw new Error('Failed to fetch metrics');
        const metricsData = await metricsResponse.json();

        // Fetch communication metrics
        const commResponse = await fetch('/api/dashboard/communication-metrics');
        if (!commResponse.ok) throw new Error('Failed to fetch communication metrics');
        const commData = await commResponse.json();

        // Fetch progress data
        const progressResponse = await fetch('/api/dashboard/relationship-progress');
        if (!progressResponse.ok) throw new Error('Failed to fetch progress');
        const progressData = await progressResponse.json();

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
        
        // Add strength insights
        const strongMetrics = enhancedMetrics.filter(m => m.value > 75);
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

        // Add improvement insights
        const weakMetrics = enhancedMetrics.filter(m => m.value < 50);
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
          weeklyGoalProgress: 0, // This would come from goal tracking when implemented
          totalTimeInvested: metricsData.sessionStats?.total_duration || 0,
          keyStrengths: strongMetrics.map(m => m.name),
          areasOfGrowth: weakMetrics.map(m => m.name)
        };

        // Generate patterns (simplified for now)
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

        setData({
          metrics: enhancedMetrics,
          insights,
          patterns,
          milestones,
          recommendations,
          habits: [], // TODO: Implement habit tracking
          summary,
          loading: false,
          error: null
        });

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load dashboard data'
        }));
      }
    };

    fetchDashboardData();
  }, [session?.user?.id, period]);

  return data;
}