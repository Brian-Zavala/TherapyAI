// @ts-nocheck
/**
 * Real-time Insights Broadcaster
 * Handles broadcasting insight updates to dashboard in real-time via Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { GeneratedInsights } from './ai-insight-generator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role key for server-side broadcasting
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface InsightUpdatePayload {
  type: 'insights_generated' | 'daily_tip_updated' | 'patterns_updated';
  userId: string;
  data: any;
  timestamp: string;
  confidence?: number;
}

export class RealTimeInsightsBroadcaster {
  private static instance: RealTimeInsightsBroadcaster;
  private isEnabled: boolean;

  private constructor() {
    this.isEnabled = !!(supabaseUrl && supabaseServiceKey);
    
    if (!this.isEnabled) {
      logger.warn('Real-time insights broadcasting disabled - missing Supabase configuration');
    }
  }

  static getInstance(): RealTimeInsightsBroadcaster {
    if (!RealTimeInsightsBroadcaster.instance) {
      RealTimeInsightsBroadcaster.instance = new RealTimeInsightsBroadcaster();
    }
    return RealTimeInsightsBroadcaster.instance;
  }

  /**
   * Broadcast new insights to user's dashboard
   */
  async broadcastInsightsUpdate(userId: string, insights: GeneratedInsights): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const payload: InsightUpdatePayload = {
        type: 'insights_generated',
        userId,
        data: {
          insightCount: insights.insights.length,
          weeklyGoals: insights.weeklyGoals,
          focusAreas: insights.focusAreas,
          strengths: insights.strengths,
          trends: insights.trends,
          hasNewContent: true
        },
        timestamp: new Date().toISOString(),
        confidence: insights.confidence
      };

      // Broadcast to user-specific channel
      const { error } = await supabase
        .channel(`insights:${userId}`)
        .send({
          type: 'broadcast',
          event: 'insights_updated',
          payload
        });

      if (error) {
        logger.error('Failed to broadcast insights update', { userId, error });
      } else {
        logger.info('Successfully broadcast insights update', { 
          userId, 
          insightCount: insights.insights.length 
        });
      }

    } catch (error) {
      logger.error('Error broadcasting insights update', { 
        userId, 
        error: error instanceof Error ? error.message : error 
      });
    }
  }

  /**
   * Broadcast daily tip update
   */
  async broadcastDailyTipUpdate(userId: string, tip: string): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const payload: InsightUpdatePayload = {
        type: 'daily_tip_updated',
        userId,
        data: {
          tip,
          isNew: true
        },
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .channel(`insights:${userId}`)
        .send({
          type: 'broadcast',
          event: 'daily_tip_updated',
          payload
        });

      if (error) {
        logger.error('Failed to broadcast daily tip update', { userId, error });
      } else {
        logger.debug('Successfully broadcast daily tip update', { userId });
      }

    } catch (error) {
      logger.error('Error broadcasting daily tip update', { 
        userId, 
        error: error instanceof Error ? error.message : error 
      });
    }
  }

  /**
   * Broadcast pattern recognition updates
   */
  async broadcastPatternUpdate(userId: string, patterns: any[]): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const payload: InsightUpdatePayload = {
        type: 'patterns_updated',
        userId,
        data: {
          patterns: patterns.map(p => ({
            type: p.patternType,
            title: p.patternTitle,
            isPositive: p.isPositive,
            frequency: p.frequency
          })),
          detectedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .channel(`insights:${userId}`)
        .send({
          type: 'broadcast',
          event: 'patterns_updated',
          payload
        });

      if (error) {
        logger.error('Failed to broadcast pattern update', { userId, error });
      } else {
        logger.info('Successfully broadcast pattern update', { 
          userId, 
          patternCount: patterns.length 
        });
      }

    } catch (error) {
      logger.error('Error broadcasting pattern update', { 
        userId, 
        error: error instanceof Error ? error.message : error 
      });
    }
  }

  /**
   * Broadcast session completion that may trigger insight regeneration
   */
  async broadcastSessionCompletion(userId: string, sessionId: string): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const payload: InsightUpdatePayload = {
        type: 'insights_generated', // This will trigger a dashboard refresh
        userId,
        data: {
          sessionCompleted: sessionId,
          shouldRefreshInsights: true
        },
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .channel(`insights:${userId}`)
        .send({
          type: 'broadcast',
          event: 'session_completed',
          payload
        });

      if (error) {
        logger.error('Failed to broadcast session completion', { userId, sessionId, error });
      } else {
        logger.info('Successfully broadcast session completion', { userId, sessionId });
      }

    } catch (error) {
      logger.error('Error broadcasting session completion', { 
        userId, 
        sessionId,
        error: error instanceof Error ? error.message : error 
      });
    }
  }
}

// Export singleton instance
export const insightsBroadcaster = RealTimeInsightsBroadcaster.getInstance();