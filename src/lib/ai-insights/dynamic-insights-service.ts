// @ts-nocheck
/**
 * Dynamic Insights Service
 * Main service that integrates AI analysis, pattern recognition, and dynamic content generation
 * Replaces the hardcoded therapy-insights-generator.ts
 */

import { prisma } from '@/lib/prisma-optimized';
import { logger } from '@/lib/logger';
import { AIInsightGenerator, UserContext, GeneratedInsights } from './ai-insight-generator';
import { dailyTipScheduler } from './daily-tip-scheduler';
import { ComprehensiveInsights } from '../therapy-insights-generator';

export class DynamicInsightsService {
  private aiGenerator: AIInsightGenerator;

  constructor(userId: string) {
    this.aiGenerator = new AIInsightGenerator(userId);
  }

  /**
   * Generate comprehensive insights for dashboard display
   * This is the main entry point that replaces generateTherapyInsights()
   */
  async generateComprehensiveInsights(
    userId: string,
    sessions?: any[],
    userProfile?: any,
    sessionType?: 'SOLO' | 'COUPLE' | 'FAMILY'
  ): Promise<ComprehensiveInsights> {
    logger.info('Generating dynamic comprehensive insights', { userId });

    try {
      // Build user context from database if not provided
      const userContext = await this.buildUserContext(userId, userProfile);
      
      // Try to get cached insights first
      const cachedInsights = await this.getCachedInsights(userId);
      if (cachedInsights && this.isCacheValid(cachedInsights)) {
        logger.info('Using cached insights', { userId });
        return this.formatForDashboard(cachedInsights, userContext);
      }

      // Generate fresh AI insights
      const aiInsights = await this.aiGenerator.generateInsights(userContext);
      
      // Store insights in database for caching and analysis
      await this.storeInsights(userId, aiInsights);
      
      // Update user patterns based on new insights
      await this.updateUserPatterns(userId, aiInsights);
      
      // Format for dashboard compatibility
      const comprehensiveInsights = this.formatForDashboard(aiInsights, userContext);
      
      logger.info('Successfully generated dynamic insights', { 
        userId,
        insightCount: aiInsights.insights.length,
        confidence: aiInsights.confidence
      });

      return comprehensiveInsights;

    } catch (error) {
      logger.error('Failed to generate dynamic insights', { 
        userId, 
        error: error instanceof Error ? error.message : error 
      });
      
      // Fallback to basic insights if AI generation fails
      return this.generateFallbackInsights(userId, sessionType);
    }
  }

  /**
   * Build user context for AI analysis
   */
  private async buildUserContext(userId: string, userProfile?: any): Promise<UserContext> {
    if (!userProfile) {
      userProfile = await prisma.userProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              sessions: {
                where: { status: 'COMPLETED' },
                orderBy: { startTime: 'desc' },
                take: 10,
                select: {
                  id: true,
                  conversationTimeSeconds: true,
                  startTime: true
                }
              }
            }
          }
        }
      });
    }

    // Calculate session statistics
    const sessions = userProfile?.user?.sessions || [];
    const totalSessions = sessions.length;
    const averageDuration = sessions.length > 0 
      ? sessions.reduce((sum, s) => sum + (s.conversationTimeSeconds || 0), 0) / sessions.length 
      : 0;

    // Determine consistency based on recent activity
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentSessions = sessions.filter(s => new Date(s.startTime) > lastWeek).length;
    const monthlySessions = sessions.filter(s => new Date(s.startTime) > lastMonth).length;
    
    let consistency: 'excellent' | 'good' | 'needs-improvement';
    if (recentSessions >= 2) consistency = 'excellent';
    else if (monthlySessions >= 4) consistency = 'good';
    else consistency = 'needs-improvement';

    // Extract therapy type from profile or infer from family members
    let therapyType: 'couples' | 'individual' | 'family' = 'individual';
    if (userProfile?.partnerName) therapyType = 'couples';
    
    // Check for family members
    const familyMemberCount = await prisma.familyMember.count({
      where: { userId }
    });
    if (familyMemberCount > 1) therapyType = 'family';

    return {
      userId,
      therapyType,
      relationshipStatus: userProfile?.relationshipStatus || undefined,
      currentConcerns: Array.isArray(userProfile?.currentConcerns) 
        ? userProfile.currentConcerns 
        : [],
      sessionHistory: {
        totalSessions,
        averageDuration: Math.round(averageDuration),
        consistency
      }
    };
  }

  /**
   * Get cached insights if they exist and are recent
   */
  private async getCachedInsights(userId: string): Promise<GeneratedInsights | null> {
    const recentInsights = await prisma.aIInsight.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 6 * 60 * 60 * 1000) // Last 6 hours
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (recentInsights.length === 0) return null;

    // Reconstruct GeneratedInsights from database records
    // Extra fields (category, priority, actionItems, etc.) are stored in metadata JSON
    const insights = recentInsights.map(insight => {
      const meta = (insight.metadata as any) || {};
      return {
        id: insight.id,
        title: insight.title,
        description: insight.description,
        category: (meta.category || 'progress') as any,
        priority: (meta.priority || insight.importance || 'medium') as any,
        actionItems: meta.actionItems || [],
        basedOn: meta.basedOn || [],
        evidence: meta.evidence || [],
        timeframe: (meta.timeframe || 'this-week') as any,
        confidence: insight.confidence
      };
    });

    // Get additional data for complete insights
    const weeklyGoals = await this.getActiveGoals(userId, 'weekly');
    const focusAreas = await this.getActiveFocusAreas(userId);
    const strengths = await this.getIdentifiedStrengths(userId);
    const dailyTip = await dailyTipScheduler.getTodaysTip(userId);

    return {
      insights,
      weeklyGoals: weeklyGoals.map(g => g.title),
      focusAreas,
      strengths,
      dailyTips: dailyTip ? [dailyTip] : [],
      trends: await this.calculateTrends(userId),
      confidence: Math.round(insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length) || 30, // SAFETY: Lowered from 70% to 30%
      dataQuality: insights.length >= 3 ? 'high' : insights.length >= 1 ? 'medium' : 'low'
    };
  }

  /**
   * Check if cached insights are still valid
   */
  private isCacheValid(insights: GeneratedInsights): boolean {
    // Cache is valid if we have recent, high-confidence insights
    return insights.insights.length > 0 && 
           insights.confidence > 25 && // SAFETY: Lowered from 60% to 25%
           insights.dataQuality !== 'low';
  }

  /**
   * Store generated insights in database
   */
  private async storeInsights(userId: string, insights: GeneratedInsights): Promise<void> {
    // AIInsight requires a valid sessionId (FK to Session).
    // Use the user's most recent completed session as the anchor.
    const recentSession = await prisma.session.findFirst({
      where: { userId, status: 'COMPLETED' },
      orderBy: { startTime: 'desc' },
      select: { id: true }
    });

    if (!recentSession) {
      logger.warn('No completed sessions to anchor insights', { userId });
      return;
    }

    // Store individual insights
    for (const insight of insights.insights) {
      // Store extra fields in metadata JSON since AIInsight schema
      // only has: type, title, description, importance, actionable, metadata, confidence
      await prisma.aIInsight.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          sessionId: recentSession.id,
          type: insight.category || 'progress',
          title: insight.title,
          description: insight.description,
          importance: insight.priority || 'medium',
          actionable: (insight.actionItems?.length || 0) > 0,
          confidence: insight.confidence,
          metadata: {
            category: insight.category,
            priority: insight.priority,
            timeframe: insight.timeframe,
            actionItems: insight.actionItems,
            basedOn: insight.basedOn,
            evidence: insight.evidence,
            aiModel: 'claude-3-sonnet',
            isPersonalized: true
          }
        }
      });
    }

    // Store weekly goals
    for (const goal of insights.weeklyGoals) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 7);

      await prisma.dynamicGoal.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          title: goal,
          description: goal,
          category: 'weekly',
          goalType: 'relationship',
          targetDate,
          basedOnInsights: insights.insights.map(i => i.id),
          aiGenerated: true,
          metadata: { confidence: insights.confidence }
        }
      });
    }
  }

  /**
   * Update user patterns based on insights
   */
  private async updateUserPatterns(userId: string, insights: GeneratedInsights): Promise<void> {
    // Identify patterns from insights
    const communicationInsights = insights.insights.filter(i => i.category === 'communication');
    const emotionalInsights = insights.insights.filter(i => i.category === 'emotional');

    // Track communication improvement pattern
    if (communicationInsights.length > 0) {
      const isPositive = communicationInsights.some(i => i.confidence > 80);
      
      await this.updatePattern(userId, {
        patternType: 'communication_focus',
        title: 'Communication Pattern Analysis',
        description: `Identified ${communicationInsights.length} communication-related insights`,
        isPositive,
        evidence: { insights: communicationInsights.map(i => i.id) }
      });
    }

    // Track emotional connection pattern
    if (emotionalInsights.length > 0) {
      const isPositive = emotionalInsights.some(i => i.priority === 'low'); // Low priority = strength
      
      await this.updatePattern(userId, {
        patternType: 'emotional_connection',
        title: 'Emotional Connection Pattern',
        description: `Emotional connection insights detected`,
        isPositive,
        evidence: { insights: emotionalInsights.map(i => i.id) }
      });
    }
  }

  /**
   * Update or create a pattern record
   */
  private async updatePattern(userId: string, patternData: {
    patternType: string;
    title: string;
    description: string;
    isPositive: boolean;
    evidence: any;
  }): Promise<void> {
    const existing = await prisma.insightPattern.findFirst({
      where: {
        userId,
        patternType: patternData.patternType,
        isActive: true
      }
    });

    if (existing) {
      await prisma.insightPattern.update({
        where: { id: existing.id },
        data: {
          lastObserved: new Date(),
          frequency: { increment: 1 },
          description: patternData.description,
          evidence: patternData.evidence,
          isPositive: patternData.isPositive
        }
      });
    } else {
      await prisma.insightPattern.create({
        data: {
          userId,
          patternType: patternData.patternType,
          patternTitle: patternData.title,
          description: patternData.description,
          firstObserved: new Date(),
          lastObserved: new Date(),
          frequency: 1,
          confidence: 0.8,
          isPositive: patternData.isPositive,
          evidence: patternData.evidence,
          isActive: true
        }
      });
    }
  }

  /**
   * Format AI insights for dashboard compatibility
   */
  private formatForDashboard(insights: GeneratedInsights, userContext: UserContext): ComprehensiveInsights {
    const formattedInsights = insights.insights.map(insight => ({
      id: insight.id,
      category: insight.category,
      title: insight.title,
      description: insight.description,
      priority: insight.priority,
      actionItems: insight.actionItems,
      basedOn: insight.basedOn,
      timeframe: insight.timeframe,
      mentalHealthTips: insight.category === 'mental-health' ? insight.actionItems.slice(0, 2) : undefined,
      resources: insight.evidence.length > 0 ? [{
        title: 'Based on Your Sessions',
        description: insight.evidence[0].substring(0, 100) + '...',
        type: 'practice' as const
      }] : undefined,
      celebrationType: insight.priority === 'low' ? 'improvement' as const : undefined
    }));

    return {
      insights: formattedInsights,
      summary: {
        overallProgress: this.determineOverallProgress(insights),
        topStrengths: insights.strengths.slice(0, 3),
        focusAreas: insights.focusAreas.slice(0, 3),
        weeklyGoals: insights.weeklyGoals.slice(0, 4)
      },
      trends: insights.trends,
      personalizedTips: {
        daily: insights.dailyTips,
        weekly: insights.weeklyGoals.slice(0, 3),
        exercises: this.extractExercises(insights.insights)
      }
    };
  }

  /**
   * Determine overall progress as a numeric 0-100 score.
   * Combines insight priority distribution, confidence, data quality,
   * and session consistency into a single health score.
   */
  private determineOverallProgress(insights: GeneratedInsights): number {
    const total = insights.insights.length;
    if (total === 0) return 25; // No data yet

    const highPriorityCount = insights.insights.filter(i => i.priority === 'high').length;
    const medPriorityCount = insights.insights.filter(i => i.priority === 'medium').length;
    const lowPriorityCount = insights.insights.filter(i => i.priority === 'low').length;

    // Priority distribution score (0-40): fewer high-priority issues = better
    const priorityScore = Math.round(
      ((lowPriorityCount * 1.0 + medPriorityCount * 0.6 + highPriorityCount * 0.2) / total) * 40
    );

    // Confidence score (0-30): how confident the system is in its analysis
    const confidenceScore = Math.round(Math.min(insights.confidence, 100) * 0.3);

    // Data quality score (0-15)
    const qualityScore = insights.dataQuality === 'high' ? 15
      : insights.dataQuality === 'medium' ? 10
      : 5;

    // Engagement bonus (0-15): having more insights = more engagement data
    const engagementScore = Math.min(15, Math.round(total * 3));

    return Math.min(100, Math.max(10, priorityScore + confidenceScore + qualityScore + engagementScore));
  }

  /**
   * Extract exercises from insights
   */
  private extractExercises(insights: any[]): string[] {
    const exercises = insights
      .flatMap(i => i.actionItems)
      .filter(action => action.toLowerCase().includes('exercise') || 
                       action.toLowerCase().includes('practice') ||
                       action.toLowerCase().includes('technique'))
      .slice(0, 3);

    // Add default exercises if none found
    if (exercises.length === 0) {
      exercises.push(
        'Practice 5 minutes of couples breathing together',
        'Try the "appreciation exercise" - share 3 things you value about each other',
        'Use the "mirror technique" - reflect back what your partner says before responding'
      );
    }

    return exercises;
  }

  /**
   * Generate fallback insights when AI fails.
   * Always filters by sessionType to prevent cross-type data contamination.
   */
  private async generateFallbackInsights(
    userId: string,
    sessionType?: 'SOLO' | 'COUPLE' | 'FAMILY'
  ): Promise<ComprehensiveInsights> {
    logger.warn('Using fallback insights generation', { userId, sessionType });

    // Get basic user data for context — ALWAYS filter by session type
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        sessions: {
          where: {
            status: 'COMPLETED',
            // CRITICAL: only count sessions of this exact therapy type
            ...(sessionType ? { sessionType } : {})
          },
          orderBy: { startTime: 'desc' },
          take: 5
        },
        profile: true
      }
    });

    const sessionCount = user?.sessions?.length || 0;
    const hasRecentSessions = sessionCount > 0;

    // If no sessions exist for this type, return empty rather than generic content
    if (!hasRecentSessions && sessionType) {
      return {
        insights: [],
        summary: null as any,
        trends: {
          communication: 'stable' as const,
          emotional: 'stable' as const,
          consistency: 'needs-improvement' as const
        },
        personalizedTips: { daily: [], weekly: [], exercises: [] }
      };
    }

    return {
      insights: hasRecentSessions ? [{
        id: `fallback-${Date.now()}`,
        category: 'progress' as const,
        title: 'Continue Your Therapy Journey',
        description: `You've completed ${sessionCount} therapy sessions. Consistency is key to lasting change.`,
        priority: 'medium' as const,
        actionItems: [
          'Continue attending regular therapy sessions',
          'Practice techniques learned in your sessions',
          'Communicate openly with your partner about progress'
        ],
        basedOn: [`${sessionCount} completed therapy sessions`],
        timeframe: 'this-week' as const
      }] : [],
      summary: {
        overallProgress: hasRecentSessions ? Math.min(85, 30 + sessionCount * 10) : 20,
        topStrengths: hasRecentSessions ? ['Commitment to therapy', 'Taking action for improvement'] : ['Seeking help'],
        focusAreas: hasRecentSessions ? ['Consistency', 'Application of techniques'] : ['Getting started with therapy'],
        weeklyGoals: hasRecentSessions 
          ? ['Attend your next session', 'Practice one technique daily', 'Discuss progress with partner']
          : ['Schedule your first therapy session', 'Set relationship goals']
      },
      trends: {
        communication: 'stable' as const,
        emotional: 'stable' as const,
        consistency: sessionCount >= 4 ? 'good' as const : 'needs-improvement' as const
      },
      personalizedTips: {
        daily: ['Take three deep breaths before difficult conversations', 'Express one appreciation daily'],
        weekly: ['Schedule quality time together', 'Practice active listening'],
        exercises: ['Gratitude sharing exercise', 'Daily check-in practice']
      }
    };
  }

  // Helper methods for cached insight reconstruction
  private async getActiveGoals(userId: string, category: string) {
    return prisma.dynamicGoal.findMany({
      where: {
        userId,
        category,
        status: 'ACTIVE',
        targetDate: { gte: new Date() }
      },
      take: 5
    });
  }

  private async getActiveFocusAreas(userId: string): Promise<string[]> {
    // AIInsight uses 'importance' (not 'priority') and has no 'status' field
    const highImportanceInsights = await prisma.aIInsight.findMany({
      where: {
        userId,
        importance: 'high'
      },
      select: { title: true },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    return highImportanceInsights.map(i => i.title);
  }

  private async getIdentifiedStrengths(userId: string): Promise<string[]> {
    const lowImportanceInsights = await prisma.aIInsight.findMany({
      where: {
        userId,
        importance: 'low'
      },
      select: { title: true },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    const strengths = lowPriorityInsights.map(i => i.title.replace(/[🎉!]/g, '').trim());
    
    // Add default strengths if none identified
    if (strengths.length === 0) {
      strengths.push('Commitment to growth', 'Willingness to seek help');
    }

    return strengths;
  }

  private async calculateTrends(userId: string) {
    // Calculate trends based on recent patterns
    const recentPatterns = await prisma.insightPattern.findMany({
      where: {
        userId,
        isActive: true,
        lastObserved: {
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // Last 2 weeks
        }
      }
    });

    const communicationPattern = recentPatterns.find(p => p.patternType === 'communication_focus');
    const emotionalPattern = recentPatterns.find(p => p.patternType === 'emotional_connection');

    return {
      communication: communicationPattern?.isPositive ? 'improving' as const : 'stable' as const,
      emotional: emotionalPattern?.isPositive ? 'improving' as const : 'stable' as const,
      consistency: 'good' as const // This would be calculated from session frequency
    };
  }
}

/**
 * Main export function that replaces generateTherapyInsights.
 * sessionType must match a Prisma SessionType enum value ('SOLO' | 'COUPLE' | 'FAMILY').
 * When provided, all DB fallback queries are filtered to that type so analytics
 * from one therapy mode never bleed into another.
 */
export async function generateDynamicTherapyInsights({
  userId,
  sessions,
  userProfile,
  sessionType
}: {
  sessions?: any;
  userProfile?: any;
  userId: string;
  sessionType?: 'SOLO' | 'COUPLE' | 'FAMILY';
}): Promise<ComprehensiveInsights> {
  const service = new DynamicInsightsService(userId);
  return service.generateComprehensiveInsights(userId, sessions, userProfile, sessionType);
}