// @ts-nocheck
/**
 * Session Completion Handler
 * Automatically triggers insight regeneration and pattern analysis when sessions complete
 */

import { prisma } from '@/lib/prisma-optimized';
import { logger } from '@/lib/logger';
import { DynamicInsightsService } from './dynamic-insights-service';
import { AdvancedPatternAnalytics } from './advanced-pattern-analytics';
import { insightsBroadcaster } from './real-time-insights-broadcaster';
import { dailyTipScheduler } from './daily-tip-scheduler';

export interface SessionCompletionContext {
  sessionId: string;
  userId: string;
  duration: number;
  participantCount: number;
  hasTranscripts: boolean;
  isSignificantSession: boolean; // Whether this session warrants insight regeneration
}

export class SessionCompletionHandler {
  private static processingQueue = new Map<string, Promise<void>>();
  
  /**
   * Handle session completion - main entry point
   */
  static async handleSessionCompletion(sessionId: string): Promise<void> {
    // Prevent duplicate processing
    if (this.processingQueue.has(sessionId)) {
      logger.info('Session completion already being processed', { sessionId });
      return this.processingQueue.get(sessionId)!;
    }

    const processingPromise = this.processSessionCompletion(sessionId);
    this.processingQueue.set(sessionId, processingPromise);

    try {
      await processingPromise;
    } finally {
      this.processingQueue.delete(sessionId);
    }
  }

  /**
   * Process session completion
   */
  private static async processSessionCompletion(sessionId: string): Promise<void> {
    logger.info('Processing session completion', { sessionId });

    try {
      // Get session context
      const context = await this.getSessionContext(sessionId);
      if (!context) {
        logger.warn('Session not found or invalid', { sessionId });
        return;
      }

      // Check if this session warrants insight regeneration
      if (!context.isSignificantSession) {
        logger.info('Session not significant enough for insight regeneration', { 
          sessionId, 
          duration: context.duration,
          hasTranscripts: context.hasTranscripts 
        });
        return;
      }

      // Process in parallel for performance
      await Promise.all([
        this.regenerateInsights(context),
        this.updatePatternAnalysis(context),
        this.checkForMilestones(context),
        this.updatePersonalizedTips(context)
      ]);

      // Broadcast completion to user's dashboard
      await insightsBroadcaster.broadcastSessionCompletion(context.userId, sessionId);

      logger.info('Session completion processing completed', { 
        sessionId, 
        userId: context.userId 
      });

    } catch (error) {
      logger.error('Failed to process session completion', { 
        sessionId,
        error: error instanceof Error ? error.message : error 
      });
    }
  }

  /**
   * Get session context for processing decisions
   */
  private static async getSessionContext(sessionId: string): Promise<SessionCompletionContext | null> {
    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          transcriptEntries: {
            select: { id: true, speaker: true, text: true }
          },
          sessionFamilyMembers: {
            select: { id: true }
          }
        }
      });

      if (!session || session.status !== 'COMPLETED') {
        return null;
      }

      const duration = session.conversationTimeSeconds || 0;
      const participantCount = session.sessionFamilyMembers.length + 1; // +1 for primary user
      const hasTranscripts = session.transcriptEntries.length > 0;
      
      // Determine if this is a significant session
      const isSignificantSession = this.isSessionSignificant(duration, hasTranscripts, participantCount);

      return {
        sessionId,
        userId: session.userId,
        duration,
        participantCount,
        hasTranscripts,
        isSignificantSession
      };

    } catch (error) {
      logger.error('Failed to get session context', { 
        sessionId,
        error: error instanceof Error ? error.message : error 
      });
      return null;
    }
  }

  /**
   * Determine if session is significant enough for insight regeneration
   */
  private static isSessionSignificant(duration: number, hasTranscripts: boolean, participantCount: number): boolean {
    // Minimum requirements for insight regeneration
    const minDuration = 300; // 5 minutes minimum
    const hasMinimalTranscripts = hasTranscripts;
    
    // More participants = more significant (relationship/family therapy)
    const participantBonus = participantCount > 1;
    
    // Longer sessions are more significant
    const durationSignificant = duration >= minDuration;
    const veryLongSession = duration >= 1200; // 20+ minutes is always significant
    
    return (durationSignificant && hasMinimalTranscripts) || veryLongSession || participantBonus;
  }

  /**
   * Regenerate insights based on new session data
   */
  private static async regenerateInsights(context: SessionCompletionContext): Promise<void> {
    logger.info('Regenerating insights after session completion', { 
      sessionId: context.sessionId,
      userId: context.userId 
    });

    try {
      const insightsService = new DynamicInsightsService(context.userId);
      
      // Generate fresh insights including the new session
      const newInsights = await insightsService.generateComprehensiveInsights(context.userId);

      // Broadcast insights update if significant new content
      if (newInsights.insights && newInsights.insights.length > 0) {
        await insightsBroadcaster.broadcastInsightsUpdate(context.userId, {
          insights: newInsights.insights.map(insight => ({
            id: insight.id || `insight-${Date.now()}`,
            title: insight.title,
            description: insight.description,
            category: insight.category,
            priority: insight.priority,
            actionItems: insight.actionItems || [],
            basedOn: insight.basedOn || [],
            evidence: [], // Will be populated by AI generator
            timeframe: insight.timeframe || 'this-week',
            confidence: 35 // SAFETY: Lowered from 75% to 35%
          })),
          weeklyGoals: newInsights.summary.weeklyGoals,
          focusAreas: newInsights.summary.focusAreas,
          strengths: newInsights.summary.topStrengths,
          dailyTips: newInsights.personalizedTips?.daily || [],
          trends: newInsights.trends,
          confidence: 35, // SAFETY: Lowered from 75% to 35%
          dataQuality: 'high' as const
        });

        logger.info('Successfully regenerated and broadcast insights', { 
          userId: context.userId,
          insightCount: newInsights.insights.length 
        });
      }

    } catch (error) {
      logger.error('Failed to regenerate insights', { 
        sessionId: context.sessionId,
        userId: context.userId,
        error: error instanceof Error ? error.message : error 
      });
    }
  }

  /**
   * Update pattern analysis with new session data
   */
  private static async updatePatternAnalysis(context: SessionCompletionContext): Promise<void> {
    logger.info('Updating pattern analysis', { 
      sessionId: context.sessionId,
      userId: context.userId 
    });

    try {
      const analytics = new AdvancedPatternAnalytics(context.userId);
      const trends = await analytics.generateTrendAnalysis();

      if (trends.length > 0) {
        // Store updated patterns
        await this.storePatternUpdates(context.userId, trends);

        // Broadcast pattern updates
        await insightsBroadcaster.broadcastPatternUpdate(context.userId, trends);

        logger.info('Successfully updated pattern analysis', { 
          userId: context.userId,
          trendCount: trends.length 
        });
      }

    } catch (error) {
      logger.error('Failed to update pattern analysis', { 
        sessionId: context.sessionId,
        userId: context.userId,
        error: error instanceof Error ? error.message : error 
      });
    }
  }

  /**
   * Check for achieved milestones
   */
  private static async checkForMilestones(context: SessionCompletionContext): Promise<void> {
    logger.info('Checking for milestones', { 
      sessionId: context.sessionId,
      userId: context.userId 
    });

    try {
      const milestones = await this.detectAchievedMilestones(context);
      
      if (milestones.length > 0) {
        // Store milestone achievements
        await this.storeMilestoneAchievements(context.userId, milestones);

        // Create celebratory insights for achieved milestones
        await this.createMilestoneCelebrations(context.userId, context.sessionId, milestones);

        logger.info('Detected milestone achievements', { 
          userId: context.userId,
          milestoneCount: milestones.length 
        });
      }

    } catch (error) {
      logger.error('Failed to check milestones', { 
        sessionId: context.sessionId,
        userId: context.userId,
        error: error instanceof Error ? error.message : error 
      });
    }
  }

  /**
   * Update personalized daily tips based on new session
   */
  private static async updatePersonalizedTips(context: SessionCompletionContext): Promise<void> {
    logger.info('Updating personalized tips', { 
      sessionId: context.sessionId,
      userId: context.userId 
    });

    try {
      // Check if user needs fresh tips based on new insights
      const shouldUpdateTips = await this.shouldUpdateTips(context);

      if (shouldUpdateTips) {
        // Regenerate tips for this user
        await dailyTipScheduler.regenerateUserTips(context.userId);

        // Get today's new tip and broadcast it
        const newTip = await dailyTipScheduler.getTodaysTip(context.userId);
        if (newTip) {
          await insightsBroadcaster.broadcastDailyTipUpdate(context.userId, newTip);
        }

        logger.info('Successfully updated personalized tips', { 
          userId: context.userId 
        });
      }

    } catch (error) {
      logger.error('Failed to update personalized tips', { 
        sessionId: context.sessionId,
        userId: context.userId,
        error: error instanceof Error ? error.message : error 
      });
    }
  }

  /**
   * Store pattern updates in database
   */
  private static async storePatternUpdates(userId: string, trends: any[]): Promise<void> {
    // Run all upserts in parallel instead of sequentially (eliminates N+1)
    const results = await Promise.allSettled(
      trends.map(trend =>
        prisma.insightPattern.upsert({
          where: {
            userId_patternType: {
              userId,
              patternType: `trend_${trend.metric}`
            }
          },
          update: {
            lastObserved: new Date(),
            frequency: { increment: 1 },
            confidence: trend.confidence / 100,
            evidence: {
              direction: trend.direction,
              velocity: trend.velocity,
              inflectionPoints: trend.inflectionPoints?.length || 0
            },
            isPositive: trend.direction === 'improving'
          },
          create: {
            userId,
            patternType: `trend_${trend.metric}`,
            patternTitle: `${trend.metric} Trend`,
            description: `${trend.direction} trend in ${trend.metric} with ${trend.confidence}% confidence`,
            firstObserved: new Date(),
            lastObserved: new Date(),
            frequency: 1,
            confidence: trend.confidence / 100,
            evidence: {
              direction: trend.direction,
              velocity: trend.velocity,
              inflectionPoints: trend.inflectionPoints?.length || 0
            },
            isPositive: trend.direction === 'improving'
          }
        })
      )
    );

    for (const [i, result] of results.entries()) {
      if (result.status === 'rejected') {
        logger.error('Failed to store pattern update', {
          userId,
          metric: trends[i].metric,
          error: result.reason instanceof Error ? result.reason.message : result.reason
        });
      }
    }
  }

  /**
   * Detect achieved milestones
   */
  private static async detectAchievedMilestones(context: SessionCompletionContext): Promise<any[]> {
    // Check various milestone criteria
    const milestones = [];

    // Fetch both counts in parallel instead of sequentially
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [sessionCount, recentSessions] = await Promise.all([
      prisma.session.count({
        where: { userId: context.userId, status: 'COMPLETED' }
      }),
      prisma.session.count({
        where: {
          userId: context.userId,
          status: 'COMPLETED',
          startTime: { gte: thirtyDaysAgo }
        }
      })
    ]);

    if ([5, 10, 25, 50].includes(sessionCount)) {
      milestones.push({
        type: 'session_count',
        title: `${sessionCount} Sessions Completed!`,
        description: `Reached ${sessionCount} therapy sessions - a significant commitment to growth`,
        value: sessionCount
      });
    }

    if (recentSessions >= 4) {
      milestones.push({
        type: 'consistency',
        title: 'Consistency Champion!',
        description: `Completed ${recentSessions} sessions this month - excellent consistency`,
        value: recentSessions
      });
    }

    // Duration milestones
    if (context.duration >= 2400) { // 40+ minutes
      milestones.push({
        type: 'duration',
        title: 'Deep Dive Session',
        description: `Spent ${Math.round(context.duration / 60)} minutes in meaningful conversation`,
        value: context.duration
      });
    }

    return milestones;
  }

  /**
   * Store milestone achievements
   */
  private static async storeMilestoneAchievements(userId: string, milestones: any[]): Promise<void> {
    if (milestones.length === 0) return;

    try {
      await prisma.dynamicGoal.createMany({
        data: milestones.map(milestone => ({
          userId,
          title: milestone.title,
          description: milestone.description,
          category: 'milestone',
          goalType: milestone.type,
          targetDate: new Date(),
          status: 'COMPLETED',
          progress: 100,
          completedAt: new Date(),
          aiGenerated: false,
          metadata: { confidence: 100 }
        }))
      });
    } catch (error) {
      logger.error('Failed to store milestone achievements', {
        userId,
        count: milestones.length,
        error: error instanceof Error ? error.message : error
      });
    }
  }

  /**
   * Create celebratory insights for milestones
   */
  private static async createMilestoneCelebrations(userId: string, sessionId: string, milestones: any[]): Promise<void> {
    if (milestones.length === 0) return;

    try {
      await prisma.aIInsight.createMany({
        data: milestones.map(milestone => ({
          userId,
          sessionId,
          type: 'progress',
          title: `🎉 ${milestone.title}`,
          description: milestone.description + ' This shows your dedication to improving your relationship.',
          importance: 'low',
          actionable: true,
          confidence: 100,
          metadata: {
            category: 'progress',
            priority: 'low',
            timeframe: 'immediate',
            actionItems: [
              'Celebrate this achievement with your partner',
              'Reflect on how far you\'ve come',
              'Share this success with someone you trust'
            ],
            basedOn: [`Milestone: ${milestone.type} = ${milestone.value}`],
            evidence: [],
            aiModel: 'milestone-detection',
            isPersonalized: true
          }
        }))
      });
    } catch (error) {
      logger.error('Failed to create milestone celebrations', {
        userId,
        count: milestones.length,
        error: error instanceof Error ? error.message : error
      });
    }
  }

  /**
   * Determine if tips should be updated
   */
  private static async shouldUpdateTips(context: SessionCompletionContext): Promise<boolean> {
    // Update tips if:
    // 1. It's been more than 3 days since last tip update
    // 2. This was a particularly significant session
    // 3. User has achieved a milestone

    const lastTipUpdate = await prisma.dailyTip.findFirst({
      where: {
        userId: context.userId,
        isPersonalized: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const daysSinceLastUpdate = lastTipUpdate 
      ? (Date.now() - lastTipUpdate.createdAt.getTime()) / (24 * 60 * 60 * 1000)
      : 7; // If no personalized tips, definitely update

    return daysSinceLastUpdate >= 3 || 
           context.duration >= 1800 || // 30+ minute session
           context.participantCount > 1; // Multi-participant session
  }
}

/**
 * Integration hook for session completion API
 * Call this from your session completion endpoint
 */
export async function onSessionCompleted(sessionId: string): Promise<void> {
  // Fire and forget - don't block the API response
  setImmediate(() => {
    SessionCompletionHandler.handleSessionCompletion(sessionId)
      .catch(error => {
        logger.error('Session completion handler failed', { 
          sessionId,
          error: error instanceof Error ? error.message : error 
        });
      });
  });
}