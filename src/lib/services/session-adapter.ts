import { prisma } from '@/lib/prisma-optimized';
import { redis } from '@/lib/cache/redis-client';
import { SessionStatus, TherapyType } from '@prisma/client';
import { performanceMonitor } from '@/lib/monitoring/performance-monitor';

// Unified session interface that can represent both models
export interface UnifiedSession {
  id: string;
  userId: string;
  status: SessionStatus;
  duration: number;
  therapyType: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Optional fields that may exist in one model or the other
  startTime?: Date | null;
  endTime?: Date | null;
  conversationTimeSeconds?: number;
  creditsUsed?: number;
  creditsAllocated?: number;
  notes?: string | null;
  vapiCallId?: string | null;
  
  // Metadata to track which model this came from
  sourceModel: 'Session' | 'TherapySession';
  hasFullFeatures: boolean; // true for Session model, false for TherapySession
}

export interface SessionCreateInput {
  userId: string;
  therapyType: string;
  duration: number;
  scheduledFor?: Date;
  familyMembers?: Array<{
    name: string;
    age: number;
    relation: string;
  }>;
  metadata?: Record<string, any>;
  forceModel?: 'Session' | 'TherapySession'; // For testing/migration
}

export interface SessionQueryOptions {
  includeTranscripts?: boolean;
  includeMetrics?: boolean;
  includeFamilyMembers?: boolean;
  preferredModel?: 'Session' | 'TherapySession';
}

class SessionAdapter {
  // Find a session by ID, checking both models
  async findSession(
    sessionId: string, 
    options: SessionQueryOptions = {}
  ): Promise<UnifiedSession | null> {
    const startTime = Date.now();
    
    try {
      // First try the Session model (full-featured)
      const legacySession = await this.findInSessionModel(sessionId, options);
      if (legacySession) {
        performanceMonitor.trackDatabaseQuery('Session', 'findUnique', Date.now() - startTime, 1);
        return legacySession;
      }

      // Then try the TherapySession model (credit system)
      const creditSession = await this.findInTherapySessionModel(sessionId, options);
      if (creditSession) {
        performanceMonitor.trackDatabaseQuery('TherapySession', 'findUnique', Date.now() - startTime, 1);
        return creditSession;
      }

      return null;
    } catch (error) {
      performanceMonitor.trackDatabaseQuery('Unified', 'findUnique', Date.now() - startTime, 0);
      throw error;
    }
  }

  // Find sessions for a user, checking both models
  async findUserSessions(
    userId: string,
    options: {
      status?: SessionStatus[];
      limit?: number;
      includeTranscripts?: boolean;
      includeMetrics?: boolean;
    } = {}
  ): Promise<UnifiedSession[]> {
    const startTime = Date.now();
    const results: UnifiedSession[] = [];
    
    try {
      // Get sessions from Session model
      const legacySessions = await this.findUserSessionsInSessionModel(userId, options);
      results.push(...legacySessions);

      // Get sessions from TherapySession model
      const creditSessions = await this.findUserSessionsInTherapySessionModel(userId, options);
      results.push(...creditSessions);

      // Sort by creation date, newest first
      results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Apply limit after merging
      const limitedResults = options.limit ? results.slice(0, options.limit) : results;

      performanceMonitor.trackDatabaseQuery(
        'Unified', 
        'findMany', 
        Date.now() - startTime, 
        limitedResults.length
      );

      return limitedResults;
    } catch (error) {
      performanceMonitor.trackDatabaseQuery('Unified', 'findMany', Date.now() - startTime, 0);
      throw error;
    }
  }

  // Create a session using the appropriate model
  async createSession(input: SessionCreateInput): Promise<UnifiedSession> {
    const startTime = Date.now();
    
    try {
      // Determine which model to use
      const useModel = this.determineModelForCreation(input);
      
      let result: UnifiedSession;
      
      if (useModel === 'Session') {
        result = await this.createInSessionModel(input);
        performanceMonitor.trackDatabaseQuery('Session', 'create', Date.now() - startTime, 1);
      } else {
        result = await this.createInTherapySessionModel(input);
        performanceMonitor.trackDatabaseQuery('TherapySession', 'create', Date.now() - startTime, 1);
      }

      // Cache the result for fast retrieval
      await this.cacheSession(result);

      return result;
    } catch (error) {
      performanceMonitor.trackDatabaseQuery('Unified', 'create', Date.now() - startTime, 0);
      throw error;
    }
  }

  // Update a session (find which model it's in and update appropriately)
  async updateSession(
    sessionId: string, 
    updates: Partial<Pick<UnifiedSession, 'status' | 'notes' | 'conversationTimeSeconds' | 'creditsUsed'>>
  ): Promise<UnifiedSession | null> {
    const startTime = Date.now();
    
    try {
      // First, find which model the session is in
      const existingSession = await this.findSession(sessionId);
      if (!existingSession) {
        return null;
      }

      let result: UnifiedSession;

      if (existingSession.sourceModel === 'Session') {
        result = await this.updateInSessionModel(sessionId, updates);
        performanceMonitor.trackDatabaseQuery('Session', 'update', Date.now() - startTime, 1);
      } else {
        result = await this.updateInTherapySessionModel(sessionId, updates);
        performanceMonitor.trackDatabaseQuery('TherapySession', 'update', Date.now() - startTime, 1);
      }

      // Update cache
      await this.cacheSession(result);

      return result;
    } catch (error) {
      performanceMonitor.trackDatabaseQuery('Unified', 'update', Date.now() - startTime, 0);
      throw error;
    }
  }

  // Get model usage statistics
  async getModelUsageStats(): Promise<{
    Session: { count: number; activeCount: number };
    TherapySession: { count: number; activeCount: number };
    totalActive: number;
  }> {
    const [sessionStats, therapySessionStats] = await Promise.all([
      prisma.session.groupBy({
        by: ['status'],
        _count: { id: true },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      prisma.therapySession.groupBy({
        by: ['status'],
        _count: { id: true },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      })
    ]);

    const sessionCount = sessionStats.reduce((sum, stat) => sum + stat._count.id, 0);
    const sessionActiveCount = sessionStats
      .filter(stat => ['ACTIVE', 'PAUSED'].includes(stat.status))
      .reduce((sum, stat) => sum + stat._count.id, 0);

    const therapySessionCount = therapySessionStats.reduce((sum, stat) => sum + stat._count.id, 0);
    const therapySessionActiveCount = therapySessionStats
      .filter(stat => ['ACTIVE', 'PAUSED'].includes(stat.status))
      .reduce((sum, stat) => sum + stat._count.id, 0);

    return {
      Session: {
        count: sessionCount,
        activeCount: sessionActiveCount
      },
      TherapySession: {
        count: therapySessionCount,
        activeCount: therapySessionActiveCount
      },
      totalActive: sessionActiveCount + therapySessionActiveCount
    };
  }

  // Private methods for model-specific operations
  private async findInSessionModel(
    sessionId: string, 
    options: SessionQueryOptions
  ): Promise<UnifiedSession | null> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        transcriptEntries: options.includeTranscripts ? { take: 50, orderBy: { timestamp: 'desc' } } : false,
        sessionMetrics: options.includeMetrics ? true : false,
        sessionFamilyMembers: options.includeFamilyMembers ? { include: { familyMember: true } } : false
      }
    });

    if (!session) return null;

    return this.mapSessionToUnified(session, 'Session');
  }

  private async findInTherapySessionModel(
    sessionId: string, 
    options: SessionQueryOptions
  ): Promise<UnifiedSession | null> {
    const session = await prisma.therapySession.findUnique({
      where: { id: sessionId }
    });

    if (!session) return null;

    return this.mapTherapySessionToUnified(session, 'TherapySession');
  }

  private async findUserSessionsInSessionModel(
    userId: string,
    options: any
  ): Promise<UnifiedSession[]> {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        ...(options.status && { status: { in: options.status } })
      },
      take: options.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        transcriptEntries: options.includeTranscripts ? { take: 10 } : false,
        sessionMetrics: options.includeMetrics ? true : false
      }
    });

    return sessions.map(session => this.mapSessionToUnified(session, 'Session'));
  }

  private async findUserSessionsInTherapySessionModel(
    userId: string,
    options: any
  ): Promise<UnifiedSession[]> {
    const sessions = await prisma.therapySession.findMany({
      where: {
        userId,
        ...(options.status && { status: { in: options.status } })
      },
      take: options.limit,
      orderBy: { createdAt: 'desc' }
    });

    return sessions.map(session => this.mapTherapySessionToUnified(session, 'TherapySession'));
  }

  private async createInSessionModel(input: SessionCreateInput): Promise<UnifiedSession> {
    const session = await prisma.session.create({
      data: {
        userId: input.userId,
        date: input.scheduledFor || new Date(),
        duration: input.duration,
        theme: `${input.therapyType.charAt(0).toUpperCase() + input.therapyType.slice(1)} Therapy Session`,
        status: SessionStatus.SCHEDULED,
        sessionType: this.mapTherapyTypeToSessionType(input.therapyType),
        creditsAllocated: input.duration,
        notes: ''
      }
    });

    return this.mapSessionToUnified(session, 'Session');
  }

  private async createInTherapySessionModel(input: SessionCreateInput): Promise<UnifiedSession> {
    const session = await prisma.therapySession.create({
      data: {
        userId: input.userId,
        sessionDate: input.scheduledFor || new Date(),
        duration: input.duration,
        status: 'scheduled',
        notes: '',
        notificationPrefs: 'email'
      }
    });

    return this.mapTherapySessionToUnified(session, 'TherapySession');
  }

  private async updateInSessionModel(
    sessionId: string,
    updates: any
  ): Promise<UnifiedSession> {
    const session = await prisma.session.update({
      where: { id: sessionId },
      data: {
        ...(updates.status && { status: updates.status }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
        ...(updates.conversationTimeSeconds !== undefined && { conversationTimeSeconds: updates.conversationTimeSeconds }),
        ...(updates.creditsUsed !== undefined && { creditsUsed: updates.creditsUsed })
      }
    });

    return this.mapSessionToUnified(session, 'Session');
  }

  private async updateInTherapySessionModel(
    sessionId: string,
    updates: any
  ): Promise<UnifiedSession> {
    const session = await prisma.therapySession.update({
      where: { id: sessionId },
      data: {
        ...(updates.status && { status: updates.status.toLowerCase() }),
        ...(updates.notes !== undefined && { notes: updates.notes })
      }
    });

    return this.mapTherapySessionToUnified(session, 'TherapySession');
  }

  private mapSessionToUnified(session: any, sourceModel: 'Session'): UnifiedSession {
    return {
      id: session.id,
      userId: session.userId,
      status: session.status,
      duration: session.duration,
      therapyType: session.sessionType || 'SOLO',
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      startTime: session.startTime,
      endTime: session.endTime,
      conversationTimeSeconds: session.conversationTimeSeconds,
      creditsUsed: session.creditsUsed,
      creditsAllocated: session.creditsAllocated,
      notes: session.notes,
      vapiCallId: session.vapiCallId,
      sourceModel,
      hasFullFeatures: true
    };
  }

  private mapTherapySessionToUnified(session: any, sourceModel: 'TherapySession'): UnifiedSession {
    return {
      id: session.id,
      userId: session.userId,
      status: this.mapStringToSessionStatus(session.status),
      duration: session.duration,
      therapyType: 'SOLO', // TherapySession doesn't have therapy type
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      notes: session.notes,
      sourceModel,
      hasFullFeatures: false
    };
  }

  private determineModelForCreation(input: SessionCreateInput): 'Session' | 'TherapySession' {
    // Force model if specified (for testing/migration)
    if (input.forceModel) {
      return input.forceModel;
    }

    // For now, prefer Session model for full features
    // In the future, this logic can be updated based on migration progress
    return 'Session';
  }

  private mapTherapyTypeToSessionType(therapyType: string): any {
    const mapping: Record<string, any> = {
      'individual': 'SOLO',
      'couple': 'COUPLE', 
      'family': 'FAMILY'
    };
    return mapping[therapyType] || 'SOLO';
  }

  private mapStringToSessionStatus(status: string): SessionStatus {
    const statusMap: Record<string, SessionStatus> = {
      'scheduled': SessionStatus.SCHEDULED,
      'active': SessionStatus.ACTIVE,
      'paused': SessionStatus.PAUSED,
      'completed': SessionStatus.COMPLETED,
      'cancelled': SessionStatus.CANCELLED
    };
    return statusMap[status] || SessionStatus.SCHEDULED;
  }

  private async cacheSession(session: UnifiedSession): Promise<void> {
    try {
      const cacheKey = `session:unified:${session.id}`;
      await redis.set(cacheKey, JSON.stringify(session), 'EX', 300); // 5 minute cache
    } catch (error) {
      console.error('[SessionAdapter] Failed to cache session:', error);
    }
  }
}

export const sessionAdapter = new SessionAdapter();