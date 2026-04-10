// @ts-nocheck
/**
 * Deterministic Insights Engine
 * Provides evidence-based therapy insights without requiring AI providers
 * Built from research on Gottman Method, EFT, and evidence-based couples therapy
 */

import { logger } from '@/lib/logger';
import type { 
  GeneratedInsights, 
  DynamicInsight, 
  UserContext 
} from './ai-insight-generator';
import type { ProcessedSessionData } from './session-data-processor';

interface InsightMapping {
  conditions: {
    communicationScore?: { min?: number; max?: number };
    emotionalScore?: { min?: number; max?: number };
    engagementLevel?: { min?: number; max?: number };
    conversationBalance?: { min?: number; max?: number };
    sessionCount?: { min?: number; max?: number };
    stressIndicators?: { min?: number; max?: number };
    breakthroughMoments?: { min?: number; max?: number };
    consistency?: 'excellent' | 'good' | 'needs-improvement';
    therapyType?: 'couples' | 'individual' | 'family';
  };
  insights: Partial<DynamicInsight>[];
  weeklyGoals: string[];
  focusAreas: string[];
  strengths?: string[];
  dailyTips: string[];
  priority: number; // Higher priority = more specific match
}

// Evidence-based insight mappings based on research
const INSIGHT_MAPPINGS: InsightMapping[] = [
  // High Performance Patterns (80%+ scores)
  {
    conditions: {
      communicationScore: { min: 80 },
      emotionalScore: { min: 80 },
      consistency: 'excellent'
    },
    priority: 10,
    insights: [
      {
        title: 'Exceptional Relationship Strength',
        description: 'Your communication and emotional connection scores indicate a thriving relationship. You\'re demonstrating the "masters of relationships" patterns identified by Dr. Gottman.',
        category: 'progress',
        priority: 'low',
        actionItems: [
          'Continue your weekly date nights to maintain connection',
          'Share your success strategies with other couples',
          'Explore new shared activities to deepen your bond'
        ],
        timeframe: 'this-month',
        confidence: 90
      },
      {
        title: 'Strong Conflict Resolution Skills',
        description: 'Your high communication scores suggest you\'ve mastered the art of healthy conflict. You\'re using repair attempts effectively and maintaining respect during disagreements.',
        category: 'communication',
        priority: 'low',
        actionItems: [
          'Document your successful conflict resolution strategies',
          'Practice "dream within conflict" conversations for deeper understanding',
          'Teach your children these healthy communication patterns'
        ],
        timeframe: 'this-week',
        confidence: 85
      }
    ],
    weeklyGoals: [
      'Maintain your excellent communication habits',
      'Explore one new shared hobby or interest',
      'Express daily appreciation to strengthen your bond',
      'Schedule a monthly relationship check-in'
    ],
    focusAreas: [
      'Maintaining momentum',
      'Deepening intimacy',
      'Building shared meaning'
    ],
    strengths: [
      'Exceptional communication skills',
      'Strong emotional bond',
      'Consistent therapy engagement',
      'Mutual respect and admiration'
    ],
    dailyTips: [
      'Start each day with a 6-second kiss (Dr. Gottman\'s recommendation)',
      'Share one thing you\'re grateful for about your partner',
      'Practice the "stress-reducing conversation" for 20 minutes'
    ]
  },

  // Good Progress Patterns (60-79% scores)
  {
    conditions: {
      communicationScore: { min: 60, max: 79 },
      emotionalScore: { min: 60, max: 79 },
      consistency: 'good'
    },
    priority: 9,
    insights: [
      {
        title: 'Positive Communication Momentum',
        description: 'Your scores show solid progress in building healthy communication patterns. You\'re developing the foundation for lasting relationship satisfaction.',
        category: 'communication',
        priority: 'medium',
        actionItems: [
          'Practice "I" statements during conflicts',
          'Implement daily 10-minute check-ins',
          'Use the speaker-listener technique for difficult topics'
        ],
        timeframe: 'this-week',
        confidence: 75
      },
      {
        title: 'Growing Emotional Connection',
        description: 'Your emotional bond is strengthening. Research shows that couples who maintain 5:1 positive to negative interactions thrive.',
        category: 'emotional',
        priority: 'medium',
        actionItems: [
          'Increase physical affection throughout the day',
          'Share one vulnerable feeling daily',
          'Practice empathetic listening without problem-solving'
        ],
        timeframe: 'this-week',
        confidence: 70
      }
    ],
    weeklyGoals: [
      'Complete the Love Maps questionnaire together',
      'Practice one new communication technique',
      'Schedule quality time without distractions',
      'Express appreciation using your partner\'s love language'
    ],
    focusAreas: [
      'Enhancing communication clarity',
      'Building emotional vocabulary',
      'Increasing positive interactions'
    ],
    strengths: [
      'Commitment to improvement',
      'Regular therapy attendance',
      'Willingness to try new techniques'
    ],
    dailyTips: [
      'Use "softened startup" when bringing up concerns',
      'Practice the 20-second hug for oxytocin release',
      'End each day sharing one positive moment'
    ]
  },

  // Struggling Patterns (below 60% scores)
  {
    conditions: {
      communicationScore: { max: 59 },
      emotionalScore: { max: 59 }
    },
    priority: 8,
    insights: [
      {
        title: 'Communication Rebuild Opportunity',
        description: 'Your scores indicate communication challenges, which is common and treatable. The Gottman Institute reports 69% of relationship problems are perpetual - success comes from how you discuss them.',
        category: 'communication',
        priority: 'high',
        actionItems: [
          'Pause conversations when flooded (heart rate over 100bpm)',
          'Practice one positive interaction before addressing issues',
          'Use "time-outs" with agreed return times'
        ],
        timeframe: 'immediate',
        confidence: 65
      },
      {
        title: 'Emotional Safety Focus',
        description: 'Creating emotional safety is your current priority. EFT research shows that addressing attachment needs can transform relationships.',
        category: 'emotional',
        priority: 'high',
        actionItems: [
          'Identify and share your attachment needs',
          'Practice non-defensive listening',
          'Create daily rituals of connection'
        ],
        timeframe: 'immediate',
        confidence: 60
      }
    ],
    weeklyGoals: [
      'Attend all scheduled therapy sessions',
      'Practice one de-escalation technique daily',
      'Have one positive interaction before any criticism',
      'Complete a relationship assessment together'
    ],
    focusAreas: [
      'Reducing criticism and defensiveness',
      'Building trust and safety',
      'Learning healthy conflict skills'
    ],
    dailyTips: [
      'Take 3 deep breaths before responding in conflict',
      'Use "I feel..." instead of "You always..."',
      'End difficult conversations with one appreciation'
    ]
  },

  // Imbalanced Communication Pattern
  {
    conditions: {
      conversationBalance: { max: 40 }
    },
    priority: 7,
    insights: [
      {
        title: 'Conversation Balance Needs Attention',
        description: 'One partner is dominating conversations (60%+ speaking time). Balanced dialogue is crucial for both partners to feel heard and valued.',
        category: 'communication',
        priority: 'high',
        actionItems: [
          'Use a 2-minute timer for each person to speak uninterrupted',
          'Practice reflective listening before responding',
          'Ask open-ended questions to encourage quieter partner'
        ],
        timeframe: 'immediate',
        confidence: 80
      }
    ],
    weeklyGoals: [
      'Practice equal speaking time in daily check-ins',
      'Complete the "Emotional Intelligence" assessment',
      'Have quieter partner lead one conversation daily'
    ],
    focusAreas: [
      'Creating space for both voices',
      'Active listening skills',
      'Emotional validation'
    ],
    dailyTips: [
      'Count to 3 before speaking to allow partner space',
      'Ask "What are your thoughts?" more often',
      'Summarize what you heard before adding your view'
    ]
  },

  // High Stress Pattern
  {
    conditions: {
      stressIndicators: { min: 5 }
    },
    priority: 6,
    insights: [
      {
        title: 'External Stress Impacting Relationship',
        description: 'High stress indicators suggest external pressures are affecting your connection. Research shows external stress is a major predictor of relationship satisfaction.',
        category: 'behavioral',
        priority: 'high',
        actionItems: [
          'Schedule daily stress-reducing conversations',
          'Create boundaries around work/life balance',
          'Practice stress-relief techniques together (meditation, exercise)'
        ],
        timeframe: 'immediate',
        confidence: 75
      }
    ],
    weeklyGoals: [
      'Implement "stress-reducing conversation" ritual',
      'Plan one stress-free activity together',
      'Identify and address top 3 stressors'
    ],
    focusAreas: [
      'Stress management',
      'Supporting each other',
      'Protecting couple time'
    ],
    dailyTips: [
      'Start with "How can I support you today?"',
      'Take 5 minutes for couple meditation',
      'Share stress before it builds up'
    ]
  },

  // Breakthrough Pattern
  {
    conditions: {
      breakthroughMoments: { min: 2 }
    },
    priority: 6,
    insights: [
      {
        title: 'Celebrating Breakthrough Moments',
        description: 'You\'ve experienced multiple breakthrough moments! These pivotal shifts are strong predictors of lasting change in relationships.',
        category: 'progress',
        priority: 'medium',
        actionItems: [
          'Document what led to these breakthroughs',
          'Recreate conditions that fostered openness',
          'Build on momentum with consistent practice'
        ],
        timeframe: 'this-week',
        confidence: 85
      }
    ],
    weeklyGoals: [
      'Review and celebrate your breakthroughs',
      'Apply breakthrough insights to other areas',
      'Share success with support network'
    ],
    focusAreas: [
      'Maintaining momentum',
      'Deepening insights',
      'Consistent application'
    ],
    strengths: [
      'Openness to change',
      'Emotional courage',
      'Breakthrough capacity'
    ],
    dailyTips: [
      'Recall breakthrough feelings when facing challenges',
      'Practice vulnerability like in breakthrough moments',
      'Acknowledge daily progress, however small'
    ]
  },

  // New Relationship Pattern
  {
    conditions: {
      sessionCount: { max: 3 }
    },
    priority: 5,
    insights: [
      {
        title: 'Building Your Therapy Foundation',
        description: 'You\'re in the early stages of couples therapy. Research shows the first 3-5 sessions are crucial for establishing trust and setting goals.',
        category: 'progress',
        priority: 'medium',
        actionItems: [
          'Complete relationship assessments honestly',
          'Identify your top 3 relationship goals',
          'Commit to consistent session attendance'
        ],
        timeframe: 'this-week',
        confidence: 70
      }
    ],
    weeklyGoals: [
      'Attend all scheduled sessions',
      'Complete intake questionnaires',
      'Establish therapy ground rules',
      'Practice one technique from each session'
    ],
    focusAreas: [
      'Building therapeutic alliance',
      'Goal clarification',
      'Establishing commitment'
    ],
    dailyTips: [
      'Share one therapy insight with partner daily',
      'Practice patience - change takes time',
      'Celebrate small wins together'
    ]
  },

  // Family Therapy Specific
  {
    conditions: {
      therapyType: 'family'
    },
    priority: 4,
    insights: [
      {
        title: 'Family System Dynamics',
        description: 'Family therapy addresses the interconnected relationships within your family system. Each member\'s growth contributes to overall family health.',
        category: 'relationship',
        priority: 'medium',
        actionItems: [
          'Create family meeting rituals',
          'Practice "I" statements with all family members',
          'Establish clear but flexible family boundaries'
        ],
        timeframe: 'this-week',
        confidence: 70
      }
    ],
    weeklyGoals: [
      'Hold one family meeting with agenda',
      'Practice active listening with each family member',
      'Create one new positive family tradition'
    ],
    focusAreas: [
      'Family communication patterns',
      'Role clarity',
      'Intergenerational healing'
    ],
    dailyTips: [
      'Have device-free family dinner conversations',
      'Express appreciation to each family member',
      'Model the behavior you want to see'
    ]
  },

  // Default/Fallback Pattern
  {
    conditions: {},
    priority: 1,
    insights: [
      {
        title: 'Commitment to Growth',
        description: 'Your engagement in therapy demonstrates commitment to relationship improvement. This commitment is the strongest predictor of positive outcomes.',
        category: 'progress',
        priority: 'medium',
        actionItems: [
          'Maintain regular therapy attendance',
          'Practice techniques between sessions',
          'Track your progress weekly'
        ],
        timeframe: 'this-week',
        confidence: 60
      }
    ],
    weeklyGoals: [
      'Attend therapy consistently',
      'Practice one new skill daily',
      'Have honest check-ins about progress'
    ],
    focusAreas: [
      'Building consistency',
      'Skill development',
      'Open communication'
    ],
    dailyTips: [
      'Start each day with positive intention',
      'Practice gratitude for your partner',
      'End day reflecting on progress made'
    ]
  }
];

/**
 * Deterministic Insight Generator
 * Matches session data to evidence-based insight patterns
 */
export class DeterministicInsightEngine {
  /**
   * Generate insights based on session metrics and patterns
   */
  generateInsights(
    sessionData: ProcessedSessionData[], 
    userContext: UserContext
  ): GeneratedInsights {
    logger.info('Generating deterministic insights', {
      userId: userContext.userId,
      sessionCount: sessionData.length
    });

    // Calculate aggregate metrics
    const metrics = this.calculateAggregateMetrics(sessionData);
    
    // Find best matching insight patterns
    const matches = this.findMatchingPatterns(metrics, userContext);
    
    // Combine insights from top matches
    const combinedInsights = this.combineInsights(matches, sessionData, userContext);
    
    // Calculate trends
    const trends = this.calculateTrends(sessionData);
    
    return {
      insights: combinedInsights.insights,
      weeklyGoals: combinedInsights.weeklyGoals,
      focusAreas: combinedInsights.focusAreas,
      strengths: combinedInsights.strengths,
      dailyTips: combinedInsights.dailyTips,
      trends,
      confidence: this.calculateConfidence(sessionData, matches),
      dataQuality: this.assessDataQuality(sessionData)
    };
  }

  private calculateAggregateMetrics(sessionData: ProcessedSessionData[]) {
    if (sessionData.length === 0) {
      return {
        avgCommunicationScore: 50,
        avgEmotionalScore: 50,
        avgEngagementLevel: 50,
        avgConversationBalance: 50,
        totalStressIndicators: 0,
        totalBreakthroughMoments: 0,
        sessionCount: 0
      };
    }

    const totals = sessionData.reduce((acc, session) => {
      // Map session data to scores (0-100 scale)
      const communicationScore = this.mapSentimentToScore(session.emotionalTone.overallSentiment);
      const emotionalScore = session.conversationFlow.engagementLevel || 50;
      
      return {
        communication: acc.communication + communicationScore,
        emotional: acc.emotional + emotionalScore,
        engagement: acc.engagement + (session.conversationFlow.engagementLevel || 50),
        balance: acc.balance + (session.conversationFlow.conversationBalance || 50),
        stress: acc.stress + session.emotionalTone.stressIndicators.length,
        breakthroughs: acc.breakthroughs + session.emotionalTone.breakthroughMoments.length
      };
    }, {
      communication: 0,
      emotional: 0,
      engagement: 0,
      balance: 0,
      stress: 0,
      breakthroughs: 0
    });

    const count = sessionData.length;
    
    return {
      avgCommunicationScore: Math.round(totals.communication / count),
      avgEmotionalScore: Math.round(totals.emotional / count),
      avgEngagementLevel: Math.round(totals.engagement / count),
      avgConversationBalance: Math.round(totals.balance / count),
      totalStressIndicators: totals.stress,
      totalBreakthroughMoments: totals.breakthroughs,
      sessionCount: count
    };
  }

  private mapSentimentToScore(sentiment: string): number {
    const sentimentScores: Record<string, number> = {
      'very positive': 90,
      'positive': 75,
      'neutral': 50,
      'negative': 25,
      'very negative': 10
    };
    
    return sentimentScores[sentiment.toLowerCase()] || 50;
  }

  private findMatchingPatterns(
    metrics: any, 
    userContext: UserContext
  ): InsightMapping[] {
    const matches: { pattern: InsightMapping; score: number }[] = [];
    
    for (const pattern of INSIGHT_MAPPINGS) {
      let matchScore = 0;
      let conditionsMet = 0;
      let totalConditions = 0;
      
      // Check each condition
      const conditions = pattern.conditions;
      
      // Communication score
      if (conditions.communicationScore) {
        totalConditions++;
        if (this.inRange(metrics.avgCommunicationScore, conditions.communicationScore)) {
          conditionsMet++;
          matchScore += pattern.priority * 10;
        }
      }
      
      // Emotional score
      if (conditions.emotionalScore) {
        totalConditions++;
        if (this.inRange(metrics.avgEmotionalScore, conditions.emotionalScore)) {
          conditionsMet++;
          matchScore += pattern.priority * 10;
        }
      }
      
      // Engagement level
      if (conditions.engagementLevel) {
        totalConditions++;
        if (this.inRange(metrics.avgEngagementLevel, conditions.engagementLevel)) {
          conditionsMet++;
          matchScore += pattern.priority * 8;
        }
      }
      
      // Conversation balance
      if (conditions.conversationBalance) {
        totalConditions++;
        if (this.inRange(metrics.avgConversationBalance, conditions.conversationBalance)) {
          conditionsMet++;
          matchScore += pattern.priority * 8;
        }
      }
      
      // Session count
      if (conditions.sessionCount) {
        totalConditions++;
        if (this.inRange(metrics.sessionCount, conditions.sessionCount)) {
          conditionsMet++;
          matchScore += pattern.priority * 5;
        }
      }
      
      // Stress indicators
      if (conditions.stressIndicators) {
        totalConditions++;
        if (this.inRange(metrics.totalStressIndicators, conditions.stressIndicators)) {
          conditionsMet++;
          matchScore += pattern.priority * 7;
        }
      }
      
      // Breakthrough moments
      if (conditions.breakthroughMoments) {
        totalConditions++;
        if (this.inRange(metrics.totalBreakthroughMoments, conditions.breakthroughMoments)) {
          conditionsMet++;
          matchScore += pattern.priority * 9;
        }
      }
      
      // Consistency
      if (conditions.consistency) {
        totalConditions++;
        if (conditions.consistency === userContext.sessionHistory.consistency) {
          conditionsMet++;
          matchScore += pattern.priority * 6;
        }
      }
      
      // Therapy type
      if (conditions.therapyType) {
        totalConditions++;
        if (conditions.therapyType === userContext.therapyType) {
          conditionsMet++;
          matchScore += pattern.priority * 5;
        }
      }
      
      // Only include patterns where at least 50% of conditions are met
      if (totalConditions === 0 || (conditionsMet / totalConditions) >= 0.5) {
        matches.push({ pattern, score: matchScore });
      }
    }
    
    // Sort by score and return top 3 matches
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(m => m.pattern);
  }

  private inRange(value: number, range: { min?: number; max?: number }): boolean {
    if (range.min !== undefined && value < range.min) return false;
    if (range.max !== undefined && value > range.max) return false;
    return true;
  }

  private combineInsights(
    matches: InsightMapping[], 
    sessionData: ProcessedSessionData[],
    userContext: UserContext
  ): {
    insights: DynamicInsight[];
    weeklyGoals: string[];
    focusAreas: string[];
    strengths: string[];
    dailyTips: string[];
  } {
    const insights: DynamicInsight[] = [];
    const weeklyGoals = new Set<string>();
    const focusAreas = new Set<string>();
    const strengths = new Set<string>();
    const dailyTips = new Set<string>();
    
    // Process each matching pattern
    matches.forEach((match, index) => {
      // Add insights with proper structure
      match.insights.forEach((insight, insightIndex) => {
        insights.push({
          id: `insight-${Date.now()}-${index}-${insightIndex}`,
          title: insight.title || 'Relationship Insight',
          description: insight.description || '',
          category: insight.category || 'relationship',
          priority: insight.priority || 'medium',
          actionItems: insight.actionItems || [],
          basedOn: this.extractBasedOn(sessionData),
          evidence: this.extractEvidence(sessionData),
          timeframe: insight.timeframe || 'this-week',
          confidence: insight.confidence || 65
        });
      });
      
      // Collect other elements
      match.weeklyGoals.forEach(goal => weeklyGoals.add(goal));
      match.focusAreas.forEach(area => focusAreas.add(area));
      match.strengths?.forEach(strength => strengths.add(strength));
      match.dailyTips.forEach(tip => dailyTips.add(tip));
    });
    
    // Ensure we have at least some content
    if (insights.length === 0) {
      insights.push(this.getDefaultInsight(userContext));
    }
    
    return {
      insights: insights.slice(0, 5), // Limit to 5 insights
      weeklyGoals: Array.from(weeklyGoals).slice(0, 4),
      focusAreas: Array.from(focusAreas).slice(0, 3),
      strengths: Array.from(strengths).slice(0, 4),
      dailyTips: Array.from(dailyTips).slice(0, 3)
    };
  }

  private extractBasedOn(sessionData: ProcessedSessionData[]): string[] {
    const basedOn: string[] = [];
    
    if (sessionData.length > 0) {
      const avgDuration = sessionData.reduce((sum, s) => sum + s.duration, 0) / sessionData.length;
      basedOn.push(`${sessionData.length} therapy sessions analyzed`);
      basedOn.push(`Average session duration: ${Math.round(avgDuration / 60)} minutes`);
      
      const latestSession = sessionData[0];
      if (latestSession.keyTopics.length > 0) {
        basedOn.push(`Recent topics: ${latestSession.keyTopics.slice(0, 3).join(', ')}`);
      }
    }
    
    return basedOn;
  }

  private extractEvidence(sessionData: ProcessedSessionData[]): string[] {
    const evidence: string[] = [];
    
    // Extract key patterns from sessions
    const patterns = new Map<string, number>();
    
    sessionData.forEach(session => {
      session.communicationPatterns.forEach(pattern => {
        const count = patterns.get(pattern.type) || 0;
        patterns.set(pattern.type, count + pattern.frequency);
      });
    });
    
    // Convert to evidence statements
    patterns.forEach((frequency, type) => {
      if (frequency > 2) {
        evidence.push(`${type} pattern observed ${frequency} times`);
      }
    });
    
    return evidence.slice(0, 5);
  }

  private getDefaultInsight(userContext: UserContext): DynamicInsight {
    return {
      id: `default-${Date.now()}`,
      title: 'Continue Your Therapy Journey',
      description: `Your commitment to ${userContext.therapyType} therapy is the first step toward positive change. Consistency and openness will lead to meaningful progress.`,
      category: 'progress',
      priority: 'medium',
      actionItems: [
        'Attend all scheduled therapy sessions',
        'Practice one technique from each session',
        'Keep a journal of your thoughts and feelings'
      ],
      basedOn: ['Initial therapy engagement'],
      evidence: [],
      timeframe: 'this-week',
      confidence: 50
    };
  }

  private calculateTrends(sessionData: ProcessedSessionData[]) {
    if (sessionData.length < 2) {
      return {
        communication: 'stable' as const,
        emotional: 'stable' as const,
        consistency: 'needs-improvement' as const
      };
    }
    
    // Compare first half to second half of sessions
    const midpoint = Math.floor(sessionData.length / 2);
    const firstHalf = sessionData.slice(0, midpoint);
    const secondHalf = sessionData.slice(midpoint);
    
    const firstMetrics = this.calculateAggregateMetrics(firstHalf);
    const secondMetrics = this.calculateAggregateMetrics(secondHalf);
    
    const communicationDiff = secondMetrics.avgCommunicationScore - firstMetrics.avgCommunicationScore;
    const emotionalDiff = secondMetrics.avgEmotionalScore - firstMetrics.avgEmotionalScore;
    
    return {
      communication: communicationDiff > 5 ? 'improving' as const : 
                     communicationDiff < -5 ? 'declining' as const : 'stable' as const,
      emotional: emotionalDiff > 5 ? 'improving' as const : 
                 emotionalDiff < -5 ? 'declining' as const : 'stable' as const,
      consistency: sessionData.length >= 4 ? 'excellent' as const : 
                   sessionData.length >= 2 ? 'good' as const : 'needs-improvement' as const
    };
  }

  private calculateConfidence(
    sessionData: ProcessedSessionData[], 
    matches: InsightMapping[]
  ): number {
    let confidence = 30; // Base confidence
    
    // More data = higher confidence
    confidence += Math.min(sessionData.length * 5, 25);
    
    // Better quality matches = higher confidence
    if (matches.length > 0) {
      confidence += matches[0].priority * 3;
    }
    
    // Cap at 95%
    return Math.min(confidence, 95);
  }

  private assessDataQuality(sessionData: ProcessedSessionData[]): 'high' | 'medium' | 'low' {
    if (sessionData.length === 0) return 'low';
    if (sessionData.length < 3) return 'low';
    
    const avgDuration = sessionData.reduce((sum, s) => sum + s.duration, 0) / sessionData.length;
    const hasGoodData = sessionData.every(s => 
      s.conversationFlow.totalSpeakingTime > 0 &&
      s.keyTopics.length > 0
    );
    
    if (sessionData.length >= 5 && avgDuration >= 600 && hasGoodData) {
      return 'high';
    } else if (sessionData.length >= 3 && avgDuration >= 300) {
      return 'medium';
    }
    
    return 'low';
  }
}