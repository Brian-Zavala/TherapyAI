/**
 * Real-Time Concerns Progress Tracking System
 * Manages live progress updates and synchronization across all touchpoints
 */

import { prisma } from '@/lib/database/prisma-optimized';
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
        select: { userId: true, notes: true }
      });

      if (!session) return;

      const userId = session.userId;
      let concernsContext: any = null;

      // Parse concerns context from notes
      if (session.notes) {
        try {
          const notesData = JSON.parse(session.notes);
          concernsContext = notesData?.concernsContext;
        } catch {
          // Notes is not JSON or doesn't contain concerns context
          concernsContext = null;
        }
      }

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
  }  // Private helper methods
  private async buildUserConcerns(userId: string, concernIds: string[]): Promise<UserConcern[]> {
    const userConcerns: UserConcern[] = [];

    for (const concernId of concernIds) {
      const concern = getConcernById(concernId);
      if (!concern) continue;

      // Get existing insights from recent sessions
      const insights = await this.getConcernInsights(userId, concernId);
      
      // Calculate initial progress score
      const progressScore = this.calculateProgressScore(insights);
      
      // Find when this concern was first selected
      // Note: Since we moved to notes field, we'll need to search differently
      // For now, we'll use a simpler approach and can enhance later
      const firstSession = await prisma.session.findFirst({
        where: { 
          userId,
          notes: {
            contains: concernId
          }
        },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
      });

      const userConcern: UserConcern = {
        ...concern,
        priority: 'medium', // Default priority, could be enhanced
        selectedAt: firstSession?.createdAt || new Date(),
        lastDiscussed: insights.length > 0 ? insights[0].extractedAt : undefined,
        progressScore,
        insights,
        metadata: {
          source: 'profile',
          confidence: 0.8,
          sessionCount: insights.length
        }
      };

      userConcerns.push(userConcern);
    }

    return userConcerns;
  }

  private async getConcernInsights(userId: string, concernId: string): Promise<ConcernInsight[]> {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        insights: {
          path: '$[*].concernId',
          array_contains: concernId
        }
      },
      orderBy: { endedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        endedAt: true,
        insights: true
      }
    });

    const insights: ConcernInsight[] = [];

    sessions.forEach(session => {
      const sessionInsights = (session.insights as any[]) || [];
      sessionInsights.forEach(insight => {
        if (insight.concernId === concernId) {
          insights.push({
            sessionId: session.id,
            extractedAt: session.endedAt!,
            type: insight.type || 'pattern',
            description: insight.content || insight.description,
            confidence: insight.confidence || 0.7,
            metadata: {
              transcriptSegments: insight.evidence || [],
              aiModel: insight.model || 'claude-3',
              processingVersion: insight.version || '1.0'
            }
          });
        }
      });
    });

    return insights;
  }

  private calculateProgressScore(insights: ConcernInsight[]): number {
    if (insights.length === 0) return 50; // Neutral baseline

    let score = 50;
    const recentInsights = insights.slice(0, 5); // Focus on recent insights

    recentInsights.forEach(insight => {
      switch (insight.type) {
        case 'progress':
        case 'breakthrough':
          score += 15 * insight.confidence;
          break;
        case 'goal_achieved':
          score += 25 * insight.confidence;
          break;
        case 'setback':
          score -= 10 * insight.confidence;
          break;
        case 'pattern':
          score += 5 * insight.confidence; // Patterns are neutral to positive
          break;
        default:
          score += 2 * insight.confidence;
      }
    });

    // Bonus for consistency (having regular insights)
    if (insights.length >= 3) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateTrend(insights: ConcernInsight[]): 'improving' | 'stable' | 'declining' {
    if (insights.length < 3) return 'stable';

    const recent = insights.slice(0, 3);
    const older = insights.slice(3, 6);

    const recentScore = this.calculateProgressScore(recent);
    const olderScore = this.calculateProgressScore(older);

    const difference = recentScore - olderScore;

    if (difference > 10) return 'improving';
    if (difference < -10) return 'declining';
    return 'stable';
  }

  private calculateOverallTrend(concerns: any[]): 'improving' | 'stable' | 'declining' {
    const improvingCount = concerns.filter(c => c.trend === 'improving').length;
    const decliningCount = concerns.filter(c => c.trend === 'declining').length;
    
    if (improvingCount > decliningCount) return 'improving';
    if (decliningCount > improvingCount) return 'declining';
    return 'stable';
  }

  private generateNextSteps(concern: UserConcern): string[] {
    const steps: string[] = [];
    const { progressScore, insights } = concern;

    if (progressScore < 40) {
      steps.push(`Build foundational understanding of ${concern.label.toLowerCase()}`);
      steps.push('Focus on identifying patterns and triggers');
    } else if (progressScore > 70) {
      steps.push(`Continue strengthening progress in ${concern.label.toLowerCase()}`);
      steps.push('Practice new skills in daily situations');
    } else {
      steps.push(`Maintain consistent work on ${concern.label.toLowerCase()}`);
      steps.push('Explore deeper underlying factors');
    }

    // Add specific suggestions based on recent insights
    const recentInsights = insights.slice(0, 2);
    if (recentInsights.some(i => i.type === 'setback')) {
      steps.push('Address recent challenges with targeted strategies');
    }

    if (recentInsights.some(i => i.type === 'breakthrough')) {
      steps.push('Build on recent breakthroughs with reinforcement');
    }

    return steps.slice(0, 3); // Limit to 3 most relevant steps
  }

  private async generateMilestones(userId: string, concerns: UserConcern[]) {
    const milestones: any[] = [];

    // Milestone: Initial concerns assessment
    const oldestConcern = concerns.reduce((oldest, current) => 
      current.selectedAt < oldest.selectedAt ? current : oldest
    );

    if (oldestConcern) {
      milestones.push({
        description: 'Completed initial concerns assessment',
        achievedAt: oldestConcern.selectedAt
      });
    }

    // Milestone: First major breakthrough
    const firstBreakthrough = concerns
      .flatMap(c => c.insights)
      .filter(i => i.type === 'breakthrough')
      .sort((a, b) => a.extractedAt.getTime() - b.extractedAt.getTime())[0];

    if (firstBreakthrough) {
      milestones.push({
        description: 'Achieved first major breakthrough',
        achievedAt: firstBreakthrough.extractedAt
      });
    }

    // Future milestone: Overall progress target
    const averageProgress = concerns.reduce((sum, c) => sum + c.progressScore, 0) / concerns.length;
    if (averageProgress < 75) {
      milestones.push({
        description: 'Reach 75% average progress across all concerns',
        targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 2 months
      });
    }

    return milestones;
  }

  // Session handling methods
  private async handleSessionStart(userId: string, sessionId: string, concernsContext: any) {
    // Mark concerns as being actively discussed
    const primaryConcerns = concernsContext.primary || [];
    
    for (const concernId of primaryConcerns) {
      await this.updateConcernProgress(userId, concernId, {
        sessionId,
        type: 'pattern',
        description: 'Session started with focus on this concern',
        confidence: 0.8,
        metadata: {
          transcriptSegments: [],
          aiModel: 'system',
          processingVersion: '1.0'
        }
      }, 'session');
    }
  }

  private async handleSessionProgress(userId: string, sessionId: string, data: any) {
    // Real-time progress updates during session
    if (data.mentionedConcerns) {
      for (const mention of data.mentionedConcerns) {
        await this.updateConcernProgress(userId, mention.concernId, {
          sessionId,
          type: 'pattern',
          description: `Real-time discussion detected`,
          confidence: mention.confidence,
          metadata: {
            transcriptSegments: [mention.transcript],
            aiModel: 'real-time',
            processingVersion: '1.0'
          }
        }, 'session');
      }
    }
  }

  private async handleSessionEnd(userId: string, sessionId: string, data: any) {
    // Process final session insights
    if (data.finalInsights) {
      for (const insight of data.finalInsights) {
        await this.updateConcernProgress(userId, insight.concernId, {
          sessionId,
          type: insight.type,
          description: insight.description,
          confidence: insight.confidence,
          metadata: {
            transcriptSegments: insight.evidence || [],
            aiModel: insight.model || 'claude-3',
            processingVersion: '1.0'
          }
        }, 'session');
      }
    }
  }

  // Communication methods
  private async broadcastProgressUpdate(userId: string, syncEvent: ConcernsSyncEvent) {
    // This would integrate with your real-time communication system (WebSockets, SSE, etc.)
    console.log(`[Progress Broadcast] User ${userId}: ${syncEvent.type} for concerns: ${syncEvent.data.concernIds.join(', ')}`);
    
    // Example WebSocket broadcast
    // this.webSocketManager.broadcast(userId, {
    //   type: 'concerns_progress_update',
    //   data: syncEvent
    // });
  }

  private async broadcastConcernsUpdate(userId: string, syncEvent: ConcernsSyncEvent) {
    // Broadcast concerns list changes
    console.log(`[Concerns Broadcast] User ${userId}: ${syncEvent.type}`);
  }

  private async persistProgressUpdate(userId: string, concernId: string, concern: UserConcern) {
    // Persist progress data to database
    // This could be a separate concerns_progress table or metadata in user profile
    console.log(`[Persist Progress] User ${userId}, Concern ${concernId}: Score ${concern.progressScore}`);
  }

  private async updateSessionConcernsContext(sessionId: string, newConcerns: string[]) {
    // Get existing notes
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { notes: true }
    });

    let existingNotes: any = {};
    if (session?.notes) {
      try {
        existingNotes = JSON.parse(session.notes);
      } catch {
        existingNotes = { originalNotes: session.notes };
      }
    }

    // Update concerns context in notes
    const updatedNotes = {
      ...existingNotes,
      concernsContext: {
        primary: newConcerns,
        updatedAt: new Date().toISOString(),
        source: 'real_time_update'
      }
    };

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        notes: JSON.stringify(updatedNotes)
      }
    });
  }

  // Utility methods
  public getActiveSyncEvents(userId: string, limit = 50): ConcernsSyncEvent[] {
    return this.syncEvents
      .filter(event => event.userId === userId)
      .slice(-limit)
      .reverse(); // Most recent first
  }

  public clearUserCache(userId: string): void {
    this.activeTracking.delete(userId);
    this.progressCache.delete(userId);
  }

  public getTrackingStats(): { activeUsers: number; totalEvents: number; cacheSize: number } {
    return {
      activeUsers: this.activeTracking.size,
      totalEvents: this.syncEvents.length,
      cacheSize: this.progressCache.size
    };
  }
}