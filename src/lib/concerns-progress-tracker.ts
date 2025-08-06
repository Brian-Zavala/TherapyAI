/**
 * Real-Time Concerns Progress Tracking System
 * Manages live progress updates and synchronization across all touchpoints
 */

import { prisma } from '@/lib/prisma-optimized';
import { THERAPY_CONCERNS, getConcernById } from '@/data/therapy-concerns';
import type { 
  UserConcern, 
  ConcernInsight, 
  ConcernsSyncEvent,
  ConcernsProgressResponse 
} from '@/types/concerns-synchronization';

export class ConcernsProgressTracker {
  private static instance: ConcernsProgressTracker;
  private activeTracking = new Map<string, UserConcern[]>();
  private progressCache = new Map<string, ConcernsProgressResponse>();
  private syncEvents: ConcernsSyncEvent[] = [];

  static getInstance(): ConcernsProgressTracker {
    if (!ConcernsProgressTracker.instance) {
      ConcernsProgressTracker.instance = new ConcernsProgressTracker();
    }
    return ConcernsProgressTracker.instance;
  }

  /**
   * Initialize tracking for a user's concerns
   */
  async initializeUserTracking(userId: string): Promise<UserConcern[]> {
    try {
      // Get user's current concerns from profile
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
        select: { currentConcerns: true }
      });

      if (!profile?.currentConcerns) return [];

      const concernIds = profile.currentConcerns as string[];
      const userConcerns = await this.buildUserConcerns(userId, concernIds);
      
      // Cache active tracking
      this.activeTracking.set(userId, userConcerns);
      
      return userConcerns;
    } catch (error) {
      console.error('Error initializing user tracking:', error);
      return [];
    }
  }

  /**
   * Update progress for a specific concern in real-time
   */
  async updateConcernProgress(
    userId: string,
    concernId: string,
    insight: Omit<ConcernInsight, 'extractedAt'>,
    source: 'session' | 'profile' | 'webhook' = 'session'
  ): Promise<void> {
    try {
      // Get current user concerns
      let userConcerns = this.activeTracking.get(userId);
      if (!userConcerns) {
        userConcerns = await this.initializeUserTracking(userId);
      }

      // Find the concern to update
      const concernIndex = userConcerns.findIndex(c => c.id === concernId);
      if (concernIndex === -1) return;

      const concern = userConcerns[concernIndex];
      
      // Add new insight
      const newInsight: ConcernInsight = {
        ...insight,
        extractedAt: new Date()
      };

      concern.insights.push(newInsight);
      concern.lastDiscussed = new Date();

      // Recalculate progress score
      concern.progressScore = this.calculateProgressScore(concern.insights);

      // Update cache
      this.activeTracking.set(userId, userConcerns);
      
      // Clear progress cache to force recalculation
      this.progressCache.delete(userId);

      // Create sync event
      const syncEvent: ConcernsSyncEvent = {
        eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        timestamp: new Date(),
        type: 'progress_scored',
        data: {
          concernIds: [concernId],
          changes: {
            progressScore: concern.progressScore,
            newInsight: newInsight
          },
          source,
          sessionId: insight.sessionId
        }
      };

      this.syncEvents.push(syncEvent);
      
      // Broadcast update to connected clients
      await this.broadcastProgressUpdate(userId, syncEvent);
      
      // Persist to database
      await this.persistProgressUpdate(userId, concernId, concern);
      
    } catch (error) {
      console.error('Error updating concern progress:', error);
    }
  }

  /**
   * Get real-time progress for all user concerns
   */
  async getUserProgress(userId: string, forceRefresh = false): Promise<ConcernsProgressResponse> {
    try {
      // Check cache first
      if (!forceRefresh && this.progressCache.has(userId)) {
        return this.progressCache.get(userId)!;
      }

      const userConcerns = await this.initializeUserTracking(userId);
      
      if (userConcerns.length === 0) {
        return {
          concerns: [],
          overallProgress: {
            score: 0,
            trend: 'stable',
            milestones: []
          }
        };
      }

      // Build progress response
      const concernsWithProgress = userConcerns.map(concern => ({
        id: concern.id,
        label: concern.label,
        progressScore: concern.progressScore,
        recentInsights: concern.insights.slice(-3), // Last 3 insights
        trend: this.calculateTrend(concern.insights),
        nextSteps: this.generateNextSteps(concern)
      }));

      const overallScore = concernsWithProgress.reduce((sum, c) => sum + c.progressScore, 0) / concernsWithProgress.length;
      const overallTrend = this.calculateOverallTrend(concernsWithProgress);
      const milestones = await this.generateMilestones(userId, userConcerns);

      const response: ConcernsProgressResponse = {
        concerns: concernsWithProgress,
        overallProgress: {
          score: overallScore,
          trend: overallTrend,
          milestones
        }
      };

      // Cache the response
      this.progressCache.set(userId, response);
      
      return response;
      
    } catch (error) {
      console.error('Error getting user progress:', error);
      return {
        concerns: [],
        overallProgress: { score: 0, trend: 'stable', milestones: [] }
      };
    }
  }

  /**
   * Handle real-time session updates
   */
  async handleSessionUpdate(
    sessionId: string,
    updateType: 'start' | 'progress' | 'end',
    data: any
  ): Promise<void> {
    try {
      // Get session details
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { userId: true, metadata: true }
      });

      if (!session) return;

      const userId = session.userId;
      const concernsContext = (session.metadata as any)?.concernsContext;

      if (!concernsContext) return;

      switch (updateType) {
        case 'start':
          await this.handleSessionStart(userId, sessionId, concernsContext);
          break;
          
        case 'progress':
          await this.handleSessionProgress(userId, sessionId, data);
          break;
          
        case 'end':
          await this.handleSessionEnd(userId, sessionId, data);
          break;
      }
      
    } catch (error) {
      console.error('Error handling session update:', error);
    }
  }

  /**
   * Sync concerns updates across all touchpoints
   */
  async syncConcernsUpdate(
    userId: string,
    updateSource: 'profile' | 'onboarding' | 'session',
    newConcerns: string[],
    sessionId?: string
  ): Promise<void> {
    try {
      // Update profile
      await prisma.userProfile.update({
        where: { userId },
        data: { 
          currentConcerns: newConcerns,
          updatedAt: new Date()
        }
      });

      // Reinitialize tracking with new concerns
      await this.initializeUserTracking(userId);

      // Create sync event
      const syncEvent: ConcernsSyncEvent = {
        eventId: `sync-${Date.now()}`,
        userId,
        timestamp: new Date(),
        type: 'concerns_updated',
        data: {
          concernIds: newConcerns,
          changes: { source: updateSource },
          source: updateSource,
          sessionId
        }
      };

      this.syncEvents.push(syncEvent);

      // Update active session context if applicable
      if (sessionId && updateSource === 'session') {
        await this.updateSessionConcernsContext(sessionId, newConcerns);
      }

      // Broadcast update
      await this.broadcastConcernsUpdate(userId, syncEvent);
      
    } catch (error) {
      console.error('Error syncing concerns update:', error);
    }
  }