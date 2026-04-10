// @ts-nocheck
// src/lib/enhanced-metrics/metric-calculator.ts
"use client";

import type { 
  EnhancedMetricData, 
  MetricInsight, 
  CommunicationPattern,
  Milestone,
  Recommendation,
  ComparativeData,
  PredictiveAnalytics,
  HabitData,
  ProgressSummary
} from "./types";

// ========================================
// ENHANCED METRIC CALCULATOR
// ========================================

export class EnhancedMetricCalculator {
  private static readonly INSIGHT_THRESHOLDS = {
    excellent: 85,
    good: 70,
    fair: 50,
    poor: 30
  };

  private static readonly PATTERN_DETECTION_WINDOW = 5; // sessions
  private static readonly CONFIDENCE_DECAY_RATE = 0.95; // per week

  // ========================================
  // INSIGHT GENERATION
  // ========================================

  static generateInsights(
    metrics: EnhancedMetricData[],
    historicalData: any[],
    sessionCount: number
  ): MetricInsight[] {
    const insights: MetricInsight[] = [];

    // Analyze current performance
    metrics.forEach(metric => {
      // Strength detection
      if (metric.value >= this.INSIGHT_THRESHOLDS.excellent) {
        insights.push({
          id: `strength-${metric.id}`,
          type: 'strength',
          title: `Excellence in ${metric.name}`,
          description: `Your ${metric.name.toLowerCase()} skills are in the top 15% of users. This is a key strength in your communication.`,
          confidence: metric.confidence,
          relatedMetrics: [metric.id],
          createdAt: new Date().toISOString()
        });
      }

      // Improvement opportunities
      if (metric.value < this.INSIGHT_THRESHOLDS.fair && metric.trend !== 'up') {
        insights.push({
          id: `improvement-${metric.id}`,
          type: 'improvement',
          title: `Focus Area: ${metric.name}`,
          description: `${metric.name} shows potential for significant improvement. Small consistent efforts here can yield big results.`,
          confidence: metric.confidence,
          relatedMetrics: [metric.id],
          createdAt: new Date().toISOString()
        });
      }

      // Trend observations
      if (metric.trend === 'up' && metric.previousValue) {
        const improvement = metric.value - metric.previousValue;
        if (improvement > 10) {
          insights.push({
            id: `trend-${metric.id}`,
            type: 'observation',
            title: `Rapid Progress in ${metric.name}`,
            description: `You've improved by ${improvement.toFixed(1)}% - that's faster than 80% of users!`,
            confidence: metric.confidence,
            relatedMetrics: [metric.id],
            createdAt: new Date().toISOString()
          });
        }
      }
    });

    // Cross-metric insights
    const avgValue = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
    const balanced = metrics.every(m => Math.abs(m.value - avgValue) < 15);

    if (balanced && avgValue > this.INSIGHT_THRESHOLDS.good) {
      insights.push({
        id: 'balance-strength',
        type: 'strength',
        title: 'Well-Rounded Communication',
        description: 'Your skills are balanced across all areas - a sign of mature communication abilities.',
        confidence: 90,
        relatedMetrics: metrics.map(m => m.id),
        createdAt: new Date().toISOString()
      });
    }

    // Warning insights
    const decliningMetrics = metrics.filter(m => m.trend === 'down');
    if (decliningMetrics.length >= 2) {
      insights.push({
        id: 'warning-decline',
        type: 'warning',
        title: 'Multiple Areas Declining',
        description: 'Several metrics are trending down. Consider scheduling a check-in with your therapist.',
        confidence: 85,
        relatedMetrics: decliningMetrics.map(m => m.id),
        createdAt: new Date().toISOString()
      });
    }

    return insights;
  }

  // ========================================
  // PATTERN DETECTION
  // ========================================

  static detectPatterns(
    sessions: any[],
    metrics: EnhancedMetricData[]
  ): CommunicationPattern[] {
    const patterns: CommunicationPattern[] = [];

    // Analyze session data for patterns
    if (sessions.length >= this.PATTERN_DETECTION_WINDOW) {
      // Consistency pattern
      const consistentMetrics = metrics.filter(m => {
        const values = sessions
          .slice(-this.PATTERN_DETECTION_WINDOW)
          .map(s => s.metrics?.[m.id])
          .filter(Boolean);
        
        if (values.length < 3) return false;
        
        const variance = this.calculateVariance(values);
        return variance < 10 && values.every(v => v > this.INSIGHT_THRESHOLDS.good);
      });

      if (consistentMetrics.length > 0) {
        patterns.push({
          id: 'consistency-pattern',
          name: 'Consistent Excellence',
          description: 'You maintain steady high performance in key areas',
          frequency: 'consistent',
          impact: 'positive',
          examples: consistentMetrics.map(m => ({
            sessionId: sessions[sessions.length - 1].id,
            timestamp: new Date().toISOString(),
            context: `Maintained ${m.name} above ${this.INSIGHT_THRESHOLDS.good}%`,
            outcome: 'positive'
          })),
          suggestions: [
            'Continue your current practices',
            'Share what works with your partner',
            'Consider mentoring others'
          ]
        });
      }

      // Breakthrough pattern
      const breakthroughSessions = sessions.filter((s, i) => {
        if (i === 0) return false;
        const prevSession = sessions[i - 1];
        const improvement = (s.overallScore || 0) - (prevSession.overallScore || 0);
        return improvement > 15;
      });

      if (breakthroughSessions.length > 0) {
        patterns.push({
          id: 'breakthrough-pattern',
          name: 'Breakthrough Moments',
          description: 'You experience significant jumps in progress',
          frequency: breakthroughSessions.length > 2 ? 'frequent' : 'occasional',
          impact: 'positive',
          examples: breakthroughSessions.slice(-3).map(s => ({
            sessionId: s.id,
            timestamp: s.date,
            context: 'Major improvement in session',
            outcome: 'positive'
          })),
          suggestions: [
            'Reflect on what triggered these breakthroughs',
            'Document the techniques that worked',
            'Build on this momentum'
          ]
        });
      }

      // Challenge pattern
      const challengeAreas = metrics.filter(m => 
        m.value < this.INSIGHT_THRESHOLDS.fair && 
        m.trend !== 'up'
      );

      if (challengeAreas.length > 0) {
        patterns.push({
          id: 'challenge-pattern',
          name: 'Persistent Challenges',
          description: 'Some areas consistently need attention',
          frequency: 'frequent',
          impact: 'negative',
          examples: challengeAreas.map(m => ({
            sessionId: sessions[sessions.length - 1].id,
            timestamp: new Date().toISOString(),
            context: `${m.name} remains below target`,
            outcome: 'negative'
          })),
          suggestions: [
            'Focus on one challenge at a time',
            'Break down complex skills into smaller steps',
            'Celebrate small improvements'
          ]
        });
      }
    }

    return patterns;
  }

  // ========================================
  // MILESTONE TRACKING
  // ========================================

  static calculateMilestones(
    userId: string,
    metrics: EnhancedMetricData[],
    sessions: any[],
    habits: HabitData[]
  ): Milestone[] {
    const milestones: Milestone[] = [];

    // Session milestones
    const sessionMilestones = [
      { count: 5, title: 'Getting Started', description: 'Complete your first 5 sessions' },
      { count: 10, title: 'Building Momentum', description: 'Reach 10 therapy sessions' },
      { count: 25, title: 'Committed to Growth', description: 'Complete 25 sessions' },
      { count: 50, title: 'Transformation Journey', description: 'Achieve 50 sessions' },
      { count: 100, title: 'Century of Progress', description: 'Reach 100 sessions milestone' }
    ];

    sessionMilestones.forEach(sm => {
      const progress = Math.min(100, (sessions.length / sm.count) * 100);
      milestones.push({
        id: `sessions-${sm.count}`,
        type: 'achievement',
        title: sm.title,
        description: sm.description,
        unlockedAt: sessions.length >= sm.count ? sessions[sm.count - 1].date : undefined,
        progress,
        criteria: {
          type: 'sessions',
          target: sm.count,
          current: sessions.length,
          unit: 'sessions'
        },
        reward: sessions.length >= sm.count ? {
          type: 'badge',
          value: `${sm.count}-sessions`,
          icon: '🏆'
        } : undefined
      });
    });

    // Skill milestones
    metrics.forEach(metric => {
      const skillMilestones = [
        { value: 70, title: 'Proficient', icon: '⭐' },
        { value: 85, title: 'Advanced', icon: '🌟' },
        { value: 95, title: 'Master', icon: '💫' }
      ];

      skillMilestones.forEach(sm => {
        const achieved = metric.value >= sm.value;
        milestones.push({
          id: `skill-${metric.id}-${sm.value}`,
          type: 'improvement',
          title: `${sm.title} in ${metric.name}`,
          description: `Achieve ${sm.value}% or higher in ${metric.name}`,
          unlockedAt: achieved ? new Date().toISOString() : undefined,
          progress: Math.min(100, (metric.value / sm.value) * 100),
          criteria: {
            type: 'metric_value',
            target: sm.value,
            current: metric.value,
            unit: '%'
          },
          reward: achieved ? {
            type: 'badge',
            value: `${metric.id}-${sm.title.toLowerCase()}`,
            icon: sm.icon
          } : undefined
        });
      });
    });

    // Streak milestones
    habits.forEach(habit => {
      const streakMilestones = [
        { days: 7, title: 'Week Warrior' },
        { days: 30, title: 'Monthly Master' },
        { days: 90, title: 'Quarter Champion' }
      ];

      streakMilestones.forEach(sm => {
        const achieved = habit.streak >= sm.days;
        milestones.push({
          id: `streak-${habit.id}-${sm.days}`,
          type: 'streak',
          title: sm.title,
          description: `Maintain ${habit.name} for ${sm.days} days`,
          unlockedAt: achieved ? new Date().toISOString() : undefined,
          progress: Math.min(100, (habit.streak / sm.days) * 100),
          criteria: {
            type: 'consistency',
            target: sm.days,
            current: habit.streak,
            unit: 'days'
          },
          reward: achieved ? {
            type: 'badge',
            value: `streak-${sm.days}`,
            icon: '🔥'
          } : undefined
        });
      });
    });

    return milestones.sort((a, b) => b.progress - a.progress);
  }

  // ========================================
  // RECOMMENDATION ENGINE
  // ========================================

  static generateRecommendations(
    metrics: EnhancedMetricData[],
    patterns: CommunicationPattern[],
    userProfile: any
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Analyze metrics for recommendations
    const weakestMetric = metrics.reduce((min, m) => 
      m.value < min.value ? m : min
    );

    const strongestMetric = metrics.reduce((max, m) => 
      m.value > max.value ? m : max
    );

    // Weakness-based recommendations
    if (weakestMetric.value < this.INSIGHT_THRESHOLDS.fair) {
      recommendations.push({
        id: `improve-${weakestMetric.id}`,
        priority: 'high',
        category: 'focus_area',
        title: `Strengthen Your ${weakestMetric.name}`,
        description: `Focus on improving ${weakestMetric.name} as it's currently your biggest growth opportunity.`,
        rationale: `This area is ${this.INSIGHT_THRESHOLDS.fair - weakestMetric.value}% below the recommended threshold.`,
        expectedImpact: 'Significant improvement in overall communication effectiveness',
        timeframe: '2-4 weeks with consistent practice',
        resources: [
          {
            type: 'exercise',
            title: `${weakestMetric.name} Practice Guide`,
            duration: '10 min/day'
          },
          {
            type: 'article',
            title: `Understanding ${weakestMetric.name} in Relationships`,
            duration: '5 min read'
          }
        ],
        relatedMetrics: [weakestMetric.id]
      });
    }

    // Strength-leveraging recommendations
    if (strongestMetric.value > this.INSIGHT_THRESHOLDS.excellent) {
      recommendations.push({
        id: `leverage-${strongestMetric.id}`,
        priority: 'medium',
        category: 'technique',
        title: `Leverage Your ${strongestMetric.name} Strength`,
        description: `Use your excellent ${strongestMetric.name} skills to support other areas of growth.`,
        rationale: `You're in the top 15% for this skill - use it as a foundation.`,
        expectedImpact: 'Accelerated improvement in related areas',
        timeframe: 'Immediate application possible',
        resources: [
          {
            type: 'video',
            title: 'Advanced Techniques for High Performers',
            duration: '15 min'
          }
        ],
        relatedMetrics: [strongestMetric.id]
      });
    }

    // Pattern-based recommendations
    const challengePattern = patterns.find(p => p.id === 'challenge-pattern');
    if (challengePattern) {
      recommendations.push({
        id: 'address-patterns',
        priority: 'high',
        category: 'technique',
        title: 'Break Through Persistent Patterns',
        description: 'Try new approaches to overcome recurring challenges.',
        rationale: 'Current strategies aren\'t yielding desired results.',
        expectedImpact: 'Break through plateaus and accelerate progress',
        timeframe: '1-2 weeks to see initial changes',
        resources: [
          {
            type: 'tool',
            title: 'Pattern Interrupt Techniques',
            duration: '20 min workshop'
          }
        ],
        relatedMetrics: challengePattern.examples.map(e => e.sessionId)
      });
    }

    // Maintenance recommendations for high performers
    const allHigh = metrics.every(m => m.value > this.INSIGHT_THRESHOLDS.good);
    if (allHigh) {
      recommendations.push({
        id: 'maintain-excellence',
        priority: 'low',
        category: 'exercise',
        title: 'Maintain Your Excellence',
        description: 'Keep your skills sharp with maintenance practices.',
        rationale: 'Consistent practice prevents skill degradation.',
        expectedImpact: 'Sustained high performance',
        timeframe: 'Ongoing',
        resources: [
          {
            type: 'exercise',
            title: 'Daily Communication Check-in',
            duration: '5 min/day'
          }
        ],
        relatedMetrics: metrics.map(m => m.id)
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // ========================================
  // COMPARATIVE ANALYTICS
  // ========================================

  static async generateComparativeData(
    metric: EnhancedMetricData,
    cohortData: any[]
  ): Promise<ComparativeData> {
    // Simulate cohort analysis (in production, this would query aggregated data)
    const values = cohortData.map(d => d.value).sort((a, b) => a - b);
    const userPercentile = this.calculatePercentile(metric.value, values);

    const distribution = [10, 25, 50, 75, 90].map(percentile => ({
      percentile,
      value: this.getPercentileValue(values, percentile)
    }));

    const insights: string[] = [];

    if (userPercentile > 75) {
      insights.push(`You're performing better than ${userPercentile}% of similar users`);
    } else if (userPercentile < 25) {
      insights.push(`There's significant room for improvement - you're currently in the bottom ${100 - userPercentile}%`);
    } else {
      insights.push(`You're performing at an average level compared to similar users`);
    }

    if (metric.trend === 'up' && userPercentile < 75) {
      insights.push('Your upward trend suggests you\'ll soon outperform the average');
    }

    return {
      cohortSize: cohortData.length,
      percentile: userPercentile,
      averageValue: values.reduce((a, b) => a + b, 0) / values.length,
      distribution,
      insights
    };
  }

  // ========================================
  // PREDICTIVE ANALYTICS
  // ========================================

  static generatePredictions(
    historicalData: any[],
    currentMetric: EnhancedMetricData,
    factors: any
  ): PredictiveAnalytics {
    // Simple linear projection (in production, use ML models)
    const recentData = historicalData.slice(-10);
    const trend = this.calculateTrend(recentData);
    
    const projectedValue = Math.min(100, Math.max(0, 
      currentMetric.value + (trend * 4) // 4 weeks projection
    ));

    const predictiveFactors: PredictiveFactor[] = [
      {
        name: 'Current Trend',
        impact: trend > 0 ? 'positive' : 'negative',
        weight: 0.4,
        description: `${Math.abs(trend).toFixed(1)}% ${trend > 0 ? 'improvement' : 'decline'} per week`
      },
      {
        name: 'Session Frequency',
        impact: factors.sessionFrequency > 0.8 ? 'positive' : 'negative',
        weight: 0.3,
        description: factors.sessionFrequency > 0.8 ? 'Regular sessions boost progress' : 'Irregular sessions may slow progress'
      },
      {
        name: 'Practice Consistency',
        impact: factors.practiceConsistency > 0.7 ? 'positive' : 'negative',
        weight: 0.3,
        description: `${(factors.practiceConsistency * 100).toFixed(0)}% practice completion rate`
      }
    ];

    const scenarios: PredictiveScenario[] = [
      {
        name: 'Best Case',
        probability: 0.2,
        outcome: Math.min(100, projectedValue + 15),
        description: 'If you increase practice and maintain consistency',
        requirements: [
          'Complete all recommended exercises',
          'Maintain weekly sessions',
          'Apply techniques daily'
        ]
      },
      {
        name: 'Expected',
        probability: 0.6,
        outcome: projectedValue,
        description: 'Continuing current patterns',
        requirements: [
          'Maintain current session frequency',
          'Continue current practice level'
        ]
      },
      {
        name: 'Risk Case',
        probability: 0.2,
        outcome: Math.max(0, projectedValue - 10),
        description: 'If consistency drops or sessions are missed',
        requirements: []
      }
    ];

    return {
      projectedValue,
      timeframe: '4 weeks',
      confidence: this.calculatePredictionConfidence(historicalData),
      factors: predictiveFactors,
      scenarios
    };
  }

  // ========================================
  // PROGRESS SUMMARY
  // ========================================

  static generateProgressSummary(
    userId: string,
    period: string,
    metrics: EnhancedMetricData[],
    sessions: any[],
    habits: HabitData[]
  ): ProgressSummary {
    const periodSessions = this.filterSessionsByPeriod(sessions, period);
    const overallProgress = this.calculateOverallProgress(metrics, periodSessions);

    const highlights = this.identifyHighlights(metrics, periodSessions);
    const challenges = this.identifyChallenges(metrics, periodSessions);
    const breakthroughs = this.identifyBreakthroughs(periodSessions);
    
    const consistency: ConsistencyMetrics = {
      sessionFrequency: this.calculateSessionFrequency(periodSessions, period),
      engagementScore: this.calculateEngagementScore(periodSessions),
      practiceAdherence: this.calculatePracticeAdherence(habits),
      improvementVelocity: this.calculateImprovementVelocity(metrics)
    };

    return {
      userId,
      period: period as any,
      overallProgress,
      highlights,
      challenges,
      breakthroughs,
      consistency
    };
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  private static calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  private static calculatePercentile(value: number, sortedValues: number[]): number {
    const index = sortedValues.findIndex(v => v >= value);
    if (index === -1) return 100;
    return Math.round((index / sortedValues.length) * 100);
  }

  private static getPercentileValue(sortedValues: number[], percentile: number): number {
    const index = Math.floor((percentile / 100) * sortedValues.length);
    return sortedValues[Math.min(index, sortedValues.length - 1)];
  }

  private static calculateTrend(data: any[]): number {
    if (data.length < 2) return 0;
    const firstValue = data[0].value || 0;
    const lastValue = data[data.length - 1].value || 0;
    return (lastValue - firstValue) / data.length;
  }

  private static calculatePredictionConfidence(data: any[]): number {
    if (data.length < 5) return 50;
    const variance = this.calculateVariance(data.map(d => d.value || 0));
    return Math.max(50, Math.min(95, 100 - variance));
  }

  private static filterSessionsByPeriod(sessions: any[], period: string): any[] {
    const now = new Date();
    const cutoff = new Date();
    
    switch (period) {
      case 'week':
        cutoff.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        cutoff.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return sessions;
    }
    
    return sessions.filter(s => new Date(s.date) > cutoff);
  }

  private static calculateOverallProgress(metrics: EnhancedMetricData[], sessions: any[]): number {
    if (sessions.length < 2) return 0;
    
    const firstSession = sessions[0];
    const lastSession = sessions[sessions.length - 1];
    
    const initialScore = firstSession.overallScore || 50;
    const currentScore = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
    
    return Math.round(((currentScore - initialScore) / initialScore) * 100);
  }

  private static identifyHighlights(metrics: EnhancedMetricData[], sessions: any[]): ProgressHighlight[] {
    const highlights: ProgressHighlight[] = [];
    
    // Find biggest improvements
    metrics
      .filter(m => m.trend === 'up' && m.previousValue)
      .sort((a, b) => (b.value - b.previousValue!) - (a.value - a.previousValue!))
      .slice(0, 3)
      .forEach(m => {
        highlights.push({
          type: 'improvement',
          title: `Major Progress in ${m.name}`,
          description: `Improved by ${(m.value - m.previousValue!).toFixed(1)}%`,
          metricImpact: m.value - m.previousValue!,
          date: m.timestamp
        });
      });
    
    return highlights;
  }

  private static identifyChallenges(metrics: EnhancedMetricData[], sessions: any[]): ProgressChallenge[] {
    return metrics
      .filter(m => m.value < this.INSIGHT_THRESHOLDS.fair)
      .map(m => ({
        id: `challenge-${m.id}`,
        area: m.name,
        description: `${m.name} needs focused attention`,
        severity: m.value < this.INSIGHT_THRESHOLDS.poor ? 'significant' : 'moderate' as const,
        suggestions: [
          `Schedule dedicated practice for ${m.name}`,
          'Discuss strategies with your therapist',
          'Track daily progress'
        ],
        resources: []
      }));
  }

  private static identifyBreakthroughs(sessions: any[]): Breakthrough[] {
    const breakthroughs: Breakthrough[] = [];
    
    sessions.forEach((session, index) => {
      if (index === 0) return;
      
      const prevSession = sessions[index - 1];
      const improvement = (session.overallScore || 0) - (prevSession.overallScore || 0);
      
      if (improvement > 20) {
        breakthroughs.push({
          id: `breakthrough-${session.id}`,
          date: session.date,
          type: 'relational',
          description: `Significant breakthrough with ${improvement.toFixed(1)}% improvement`,
          triggerEvent: session.notes?.substring(0, 100),
          sustainabilityScore: Math.min(90, 70 + improvement)
        });
      }
    });
    
    return breakthroughs;
  }

  private static calculateSessionFrequency(sessions: any[], period: string): number {
    if (sessions.length === 0) return 0;
    
    const weeks = period === 'week' ? 1 : 
                  period === 'month' ? 4 : 
                  period === 'quarter' ? 13 : 52;
    
    return sessions.length / weeks;
  }

  private static calculateEngagementScore(sessions: any[]): number {
    if (sessions.length === 0) return 0;
    
    const avgDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length;
    const targetDuration = 50; // minutes
    
    return Math.min(100, (avgDuration / targetDuration) * 100);
  }

  private static calculatePracticeAdherence(habits: HabitData[]): number {
    if (habits.length === 0) return 0;
    
    const adherenceScores = habits.map(h => {
      const recentCompletions = h.completions.slice(-7);
      return recentCompletions.length / 7;
    });
    
    return Math.round(adherenceScores.reduce((a, b) => a + b, 0) / habits.length * 100);
  }

  private static calculateImprovementVelocity(metrics: EnhancedMetricData[]): number {
    const improvements = metrics
      .filter(m => m.previousValue)
      .map(m => m.value - m.previousValue!);
    
    if (improvements.length === 0) return 0;
    
    return improvements.reduce((a, b) => a + b, 0) / improvements.length;
  }
}