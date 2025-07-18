import { prisma } from '@/lib/prisma-optimized';
import { SessionStatus } from '@prisma/client';
import { sessionCache } from '@/lib/session-cache';
import { profileCache } from '@/lib/cache/profile-cache';
import { logger } from '@/lib/logger';
import { AxiosError } from 'axios';

export type SessionLifecycleState = 
  | 'ACTIVE'
  | 'ENDING'
  | 'COMPLETING'
  | 'CALCULATING_METRICS'
  | 'COMPLETED'
  | 'FAILED';

interface SessionTransition {
  fromStates: SessionLifecycleState[];
  toState: SessionLifecycleState;
  action: (sessionId: string) => Promise<void>;
}

export class SessionLifecycleManager {
  private static instance: SessionLifecycleManager;
  private sessionStates: Map<string, SessionLifecycleState> = new Map();
  private processingLocks: Map<string, Promise<void>> = new Map();
  
  private constructor() {}
  
  static getInstance(): SessionLifecycleManager {
    if (!SessionLifecycleManager.instance) {
      SessionLifecycleManager.instance = new SessionLifecycleManager();
    }
    return SessionLifecycleManager.instance;
  }

  /**
   * Get current lifecycle state for a session
   */
  async getSessionState(sessionId: string): Promise<SessionLifecycleState> {
    // Check in-memory state first
    const memoryState = this.sessionStates.get(sessionId);
    if (memoryState) return memoryState;

    // Check database state
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { status: true }
    });

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Map database status to lifecycle state
    const state = this.mapStatusToState(session.status);
    this.sessionStates.set(sessionId, state);
    return state;
  }

  /**
   * Transition session to a new state with proper validation
   */
  async transitionSession(
    sessionId: string,
    toState: SessionLifecycleState,
    action?: () => Promise<void>
  ): Promise<void> {
    // Prevent concurrent transitions
    const existingLock = this.processingLocks.get(sessionId);
    if (existingLock) {
      logger.warn('Session transition already in progress', { sessionId, toState });
      // Wait for existing transition and check if we still need to transition
      await existingLock;
      const currentState = await this.getSessionState(sessionId);
      if (currentState === toState || !this.isValidTransition(currentState, toState)) {
        return;
      }
    }

    const transitionPromise = this.performTransition(sessionId, toState, action);
    this.processingLocks.set(sessionId, transitionPromise);

    try {
      await transitionPromise;
    } finally {
      this.processingLocks.delete(sessionId);
    }
  }

  private async performTransition(
    sessionId: string,
    toState: SessionLifecycleState,
    action?: () => Promise<void>
  ): Promise<void> {
    const currentState = await this.getSessionState(sessionId);

    // Validate transition
    if (!this.isValidTransition(currentState, toState)) {
      throw new Error(
        `Invalid transition from ${currentState} to ${toState} for session ${sessionId}`
      );
    }

    logger.info('Session state transition', {
      sessionId,
      fromState: currentState,
      toState
    });

    // Update in-memory state
    this.sessionStates.set(sessionId, toState);

    try {
      // Execute transition action if provided
      if (action) {
        await action();
      }

      // Update database state
      await this.updateDatabaseState(sessionId, toState);

      // Clear caches
      await this.clearSessionCaches(sessionId);
    } catch (error) {
      // Rollback in-memory state on failure
      this.sessionStates.set(sessionId, currentState);
      logger.error('Session transition failed', {
        sessionId,
        fromState: currentState,
        toState,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // For certain transitions, mark as failed instead of throwing
      if (toState === 'COMPLETING' || toState === 'CALCULATING_METRICS') {
        try {
          this.sessionStates.set(sessionId, 'FAILED');
          await this.updateDatabaseState(sessionId, 'FAILED');
        } catch (failError) {
          logger.error('Failed to mark session as failed', { sessionId, error: failError });
        }
      }
      
      throw error;
    }
  }

  /**
   * Complete a session with proper state transitions
   */
  async completeSession(sessionId: string, userId: string): Promise<void> {
    const currentState = await this.getSessionState(sessionId);

    if (currentState === 'COMPLETED') {
      logger.info('Session already completed', { sessionId });
      return;
    }

    // Transition through states
    await this.transitionSession(sessionId, 'ENDING');
    await this.transitionSession(sessionId, 'COMPLETING');
    
    try {
      // Ensure VAPI call is terminated
      await this.terminateVapiCall(sessionId);
      
      // Calculate metrics (deduplication handled internally)
      await this.transitionSession(sessionId, 'CALCULATING_METRICS', async () => {
        const { calculateMetrics } = await import('@/lib/metrics/metrics-deduplication');
        await calculateMetrics(sessionId, userId);
      });

      // Final transition to completed
      await this.transitionSession(sessionId, 'COMPLETED');
      
    } catch (error) {
      logger.error('Error completing session', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Try to mark as failed, but don't throw if this fails
      try {
        await this.transitionSession(sessionId, 'FAILED');
      } catch (failError) {
        logger.error('Failed to transition to failed state', { sessionId, error: failError });
      }
      
      throw error;
    }
  }

  /**
   * Check if session can accept webhook events
   */
  async canProcessWebhook(sessionId: string): Promise<boolean> {
    try {
      const state = await this.getSessionState(sessionId);
      // Only process webhooks for active sessions
      return state === 'ACTIVE';
    } catch (error) {
      logger.error('Error checking webhook processability', { sessionId, error });
      return false;
    }
  }

  /**
   * Terminate VAPI call if active
   */
  private async terminateVapiCall(sessionId: string): Promise<void> {
    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { vapiCallId: true }
      });

      if (!session?.vapiCallId) {
        logger.info('No VAPI call to terminate', { sessionId });
        return;
      }

      const vapi = (await import('@/lib/vapi')).default;
      await vapi.calls.update(session.vapiCallId, { 
        endCallNow: true 
      });

      logger.info('VAPI call terminated', {
        sessionId,
        vapiCallId: session.vapiCallId
      });
    } catch (error) {
      // Log but don't throw - call might already be ended
      if (error instanceof AxiosError && error.response?.status === 404) {
        logger.info('VAPI call already ended', { sessionId });
      } else {
        logger.error('Failed to terminate VAPI call', { sessionId, error });
      }
    }
  }

  private isValidTransition(
    from: SessionLifecycleState,
    to: SessionLifecycleState
  ): boolean {
    const validTransitions: Record<SessionLifecycleState, SessionLifecycleState[]> = {
      ACTIVE: ['ENDING', 'FAILED'],
      ENDING: ['COMPLETING', 'FAILED'],
      COMPLETING: ['CALCULATING_METRICS', 'FAILED'],
      CALCULATING_METRICS: ['COMPLETED', 'FAILED'],
      COMPLETED: [], // Terminal state
      FAILED: [] // Terminal state
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  private mapStatusToState(status: SessionStatus): SessionLifecycleState {
    switch (status) {
      case SessionStatus.ACTIVE:
        return 'ACTIVE';
      case SessionStatus.COMPLETED:
        return 'COMPLETED';
      case SessionStatus.ABANDONED:
      case SessionStatus.TECHNICAL_ISSUE:
        return 'FAILED';
      default:
        return 'ACTIVE';
    }
  }

  private async updateDatabaseState(
    sessionId: string,
    state: SessionLifecycleState
  ): Promise<void> {
    const status = this.mapStateToStatus(state);
    
    await prisma.session.update({
      where: { id: sessionId },
      data: { 
        status,
        ...(state === 'COMPLETED' && { completedAt: new Date() })
      }
    });
  }

  private mapStateToStatus(state: SessionLifecycleState): SessionStatus {
    switch (state) {
      case 'ACTIVE':
      case 'ENDING':
      case 'COMPLETING':
      case 'CALCULATING_METRICS':
        return SessionStatus.ACTIVE;
      case 'COMPLETED':
        return SessionStatus.COMPLETED;
      case 'FAILED':
        return SessionStatus.TECHNICAL_ISSUE;
      default:
        return SessionStatus.ACTIVE;
    }
  }

  private async clearSessionCaches(sessionId: string): Promise<void> {
    await sessionCache.invalidate(sessionId);
    
    // Also clear user profile cache
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true }
    });
    
    if (session?.userId) {
      await profileCache.invalidate(session.userId);
    }
  }

  /**
   * Clean up old session states from memory
   */
  cleanupOldStates(maxAgeMs: number = 3600000): void {
    // This would be called periodically to prevent memory leaks
    // For now, we'll just clear completed/failed sessions older than maxAge
    const cutoffTime = Date.now() - maxAgeMs;
    
    for (const [sessionId, state] of this.sessionStates.entries()) {
      if (state === 'COMPLETED' || state === 'FAILED') {
        // In production, we'd track timestamps
        this.sessionStates.delete(sessionId);
      }
    }
  }
}