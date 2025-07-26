/**
 * Daily Tip Scheduler
 * Handles automatic rotation of daily tips at midnight and personalized tip generation
 */

import { prisma } from '@/lib/prisma-optimized';
import { logger } from '@/lib/logger';
import { AIInsightGenerator } from './ai-insight-generator';

export interface DailyTipRotationConfig {
  timezone: string;
  rotationHour: number; // 0-23, when to rotate tips
  maxPersonalizedTips: number;
  fallbackTips: string[];
}

export class DailyTipScheduler {
  private config: DailyTipRotationConfig;

  constructor(config: Partial<DailyTipRotationConfig> = {}) {
    this.config = {
      timezone: 'America/Los_Angeles',
      rotationHour: 0, // Midnight
      maxPersonalizedTips: 10,
      fallbackTips: [
        'Take three deep breaths before responding in tense moments',
        'Express one appreciation to your partner today',
        'Practice active listening by reflecting back what you hear',
        'Share one vulnerable thought with your partner',
        'Notice and acknowledge your partner\'s efforts today',
        'Take a 10-minute walk together without phones',
        'Ask your partner "How can I support you today?"',
        'Practice the 6-second hug technique'
      ],
      ...config
    };
  }

  /**
   * Schedule midnight tip rotation for all users
   * This should be called by a cron job or scheduled function
   */
  async rotateDailyTips(): Promise<void> {
    logger.info('Starting daily tip rotation', { 
      time: new Date().toISOString(),
      timezone: this.config.timezone 
    });

    try {
      // Get all active users who need tip rotation
      const activeUsers = await this.getActiveUsers();
      
      let successCount = 0;
      let errorCount = 0;

      // Process users in batches to avoid overwhelming the system
      const BATCH_SIZE = 50;
      for (let i = 0; i < activeUsers.length; i += BATCH_SIZE) {
        const batch = activeUsers.slice(i, i + BATCH_SIZE);
        
        await Promise.allSettled(
          batch.map(async (user) => {
            try {
              await this.rotateUserTips(user.id);
              successCount++;
            } catch (error) {
              errorCount++;
              logger.error('Failed to rotate tips for user', { 
                userId: user.id, 
                error: error instanceof Error ? error.message : error 
              });
            }
          })
        );

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info('Daily tip rotation completed', { 
        totalUsers: activeUsers.length,
        successCount,
        errorCount
      });

      // Clean up old tips
      await this.cleanupOldTips();

    } catch (error) {
      logger.error('Daily tip rotation failed', { 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * Rotate tips for a specific user
   */
  async rotateUserTips(userId: string): Promise<void> {
    logger.debug('Rotating tips for user', { userId });

    try {
      // Get user's recent insights to generate personalized tips
      const recentInsights = await prisma.aIInsight.findMany({
        where: {
          userId,
          status: 'active',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        orderBy: { confidence: 'desc' },
        take: 5
      });

      // Generate personalized tips based on insights
      const personalizedTips = await this.generatePersonalizedTips(userId, recentInsights);

      // Archive current active tips
      await prisma.dailyTip.updateMany({
        where: {
          userId,
          isActive: true,
          scheduledDate: {
            lte: new Date()
          }
        },
        data: {
          isActive: false,
          lastShownAt: new Date()
        }
      });

      // Schedule new tips for the next 7 days
      const now = new Date();
      const tips = [...personalizedTips, ...this.config.fallbackTips].slice(0, 7);

      for (let i = 0; i < tips.length; i++) {
        const scheduledDate = new Date(now);
        scheduledDate.setDate(scheduledDate.getDate() + i);
        scheduledDate.setHours(this.config.rotationHour, 0, 0, 0);

        await prisma.dailyTip.create({
          data: {
            userId,
            content: tips[i],
            category: this.categorizeTip(tips[i]),
            scheduledDate,
            isActive: true,
            isPersonalized: i < personalizedTips.length,
            basedOnInsights: i < personalizedTips.length ? 
              recentInsights.map(insight => insight.id) : []
          }
        });
      }

    } catch (error) {
      logger.error('Failed to rotate user tips', { 
        userId, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * Generate personalized tips based on user's insights
   */
  private async generatePersonalizedTips(userId: string, insights: any[]): Promise<string[]> {
    if (insights.length === 0) {
      return [];
    }

    const tips: string[] = [];

    // Generate tips based on insight categories
    for (const insight of insights) {
      const tip = this.generateTipFromInsight(insight);
      if (tip && !tips.includes(tip)) {
        tips.push(tip);
      }
    }

    return tips.slice(0, this.config.maxPersonalizedTips);
  }

  /**
   * Generate a specific tip based on an insight
   */
  private generateTipFromInsight(insight: any): string | null {
    const { category, priority, actionItems } = insight;

    // Use the first action item as a daily tip if it's actionable
    if (actionItems && actionItems.length > 0) {
      const firstAction = actionItems[0];
      if (this.isActionableTip(firstAction)) {
        return this.formatAsDailyTip(firstAction);
      }
    }

    // Generate category-specific tips
    switch (category) {
      case 'communication':
        return this.generateCommunicationTip(insight);
      case 'emotional':
        return this.generateEmotionalTip(insight);
      case 'behavioral':
        return this.generateBehavioralTip(insight);
      case 'mental-health':
        return this.generateMentalHealthTip(insight);
      default:
        return null;
    }
  }

  private generateCommunicationTip(insight: any): string {
    const tips = [
      'Practice reflecting back what you hear before responding',
      'Use "I feel" statements instead of "you" statements today',
      'Ask one curious question about your partner\'s perspective',
      'Take a 5-second pause before responding to difficult topics',
      'Express appreciation for something specific your partner did'
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  }

  private generateEmotionalTip(insight: any): string {
    const tips = [
      'Share one vulnerable feeling with your partner today',
      'Practice the 6-second hug to release bonding hormones',
      'Notice and name one emotion you\'re feeling right now',
      'Create a moment of eye contact during conversation',
      'Express gratitude for your partner\'s emotional support'
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  }

  private generateBehavioralTip(insight: any): string {
    const tips = [
      'Do one small act of kindness for your partner',
      'Follow through on a promise you made, no matter how small',
      'Put away phones during dinner conversation',
      'Take 10 minutes to check in about each other\'s day',
      'Practice your breathing exercise together'
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  }

  private generateMentalHealthTip(insight: any): string {
    const tips = [
      'Take 5 minutes for personal mindfulness practice',
      'Write down three things you\'re grateful for',
      'Take a walk outside to reset your mental state',
      'Practice one stress-reduction technique you\'ve learned',
      'Check in with your own emotional needs today'
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  }

  /**
   * Check if an action item is suitable as a daily tip
   */
  private isActionableTip(action: string): boolean {
    const dailyKeywords = ['daily', 'today', 'each day', 'practice', 'try', 'take'];
    const actionLower = action.toLowerCase();
    
    // Should be concise (under 100 characters) and actionable
    return action.length < 100 && 
           dailyKeywords.some(keyword => actionLower.includes(keyword));
  }

  /**
   * Format an action item as a daily tip
   */
  private formatAsDailyTip(action: string): string {
    // Remove periods and ensure it starts with a verb
    let tip = action.replace(/\.$/, '');
    
    // Ensure it starts with an action word
    if (!/^(take|practice|try|share|express|ask|create|notice|do)\\b/i.test(tip)) {
      tip = `Try to ${tip.toLowerCase()}`;
    }

    return tip;
  }

  /**
   * Categorize a tip for filtering and organization
   */
  private categorizeTip(tip: string): string {
    const tipLower = tip.toLowerCase();
    
    if (tipLower.includes('breath') || tipLower.includes('mindful') || tipLower.includes('stress')) {
      return 'self-care';
    } else if (tipLower.includes('listen') || tipLower.includes('speak') || tipLower.includes('communicate')) {
      return 'communication';
    } else if (tipLower.includes('feel') || tipLower.includes('emotion') || tipLower.includes('connect')) {
      return 'emotional';
    } else {
      return 'relationship';
    }
  }

  /**
   * Get active users who need tip rotation
   */
  private async getActiveUsers(): Promise<Array<{ id: string; email: string }>> {
    return prisma.user.findMany({
      where: {
        isDeleted: false,
        // Users who have had recent activity or sessions
        OR: [
          {
            sessions: {
              some: {
                startTime: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                }
              }
            }
          },
          {
            updatedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Updated in last 7 days
            }
          }
        ]
      },
      select: {
        id: true,
        email: true
      }
    });
  }

  /**
   * Clean up old tips to prevent database bloat
   */
  private async cleanupOldTips(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const deletedCount = await prisma.dailyTip.deleteMany({
      where: {
        isActive: false,
        lastShownAt: {
          lt: thirtyDaysAgo
        }
      }
    });

    logger.info('Cleaned up old daily tips', { deletedCount: deletedCount.count });
  }

  /**
   * Get today's tip for a specific user
   */
  async getTodaysTip(userId: string): Promise<string | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tip = await prisma.dailyTip.findFirst({
      where: {
        userId,
        isActive: true,
        scheduledDate: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: {
        scheduledDate: 'desc'
      }
    });

    if (tip) {
      // Mark as shown
      await prisma.dailyTip.update({
        where: { id: tip.id },
        data: { 
          timesShown: { increment: 1 },
          lastShownAt: new Date()
        }
      });

      return tip.content;
    }

    // Fallback to a general tip if no personalized tip exists
    return this.config.fallbackTips[Math.floor(Math.random() * this.config.fallbackTips.length)];
  }

  /**
   * Force regenerate tips for a user (useful for testing or manual refresh)
   */
  async regenerateUserTips(userId: string): Promise<void> {
    logger.info('Manually regenerating tips for user', { userId });
    await this.rotateUserTips(userId);
  }
}

// Export a singleton instance
export const dailyTipScheduler = new DailyTipScheduler();