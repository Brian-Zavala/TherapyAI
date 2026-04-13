// @ts-nocheck
import { prisma } from '@/lib/prisma-optimized';
import { SessionStatus } from '@prisma/client';
import { sessionCache } from '@/lib/session-cache';
import { profileCache } from '@/lib/cache/profile-cache';
import { logger } from '@/lib/logger';
import { AxiosError } from 'axios';
import { CreditManager } from '@/lib/services/credit-manager.service';
import { timingReconciliation } from '@/lib/services/credit-timing-reconciliation';
import { calculateMetrics } from '@/lib/metrics/metrics-deduplication';

export type SessionLifecycleState = 
  | 'ACTIVE'
  | 'ENDING'
  | 'COMPLETING'
  | 'DEDUCTING_CREDITS'  // NEW STATE
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
    action?: () => Promise<void>,
    userId?: string
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

    const transitionPromise = this.performTransition(sessionId, toState, action, userId);
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
    action?: () => Promise<void>,
    userId?: string
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

      // Update database state (skips no-op intermediate writes)
      await this.updateDatabaseState(sessionId, toState);

      // Clear caches only on terminal states — intermediate transitions don't
      // change what's visible to the user, so cache invalidation can wait.
      if (toState === 'COMPLETED' || toState === 'FAILED') {
        await this.clearSessionCaches(sessionId, userId);
      }
    } catch (error) {
      // Rollback in-memory state on failure
      this.sessionStates.set(sessionId, currentState);
      logger.error('Session transition failed', {
        sessionId,
        fromState: currentState,
        toState,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // For certain transitions, handle errors more gracefully
      if (toState === 'DEDUCTING_CREDITS') {
        // Credit deduction failures shouldn't prevent session completion
        logger.warn('Credit deduction failed, but session can still complete', {
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Don't throw for credit deduction failures - session completion should succeed
        return;
      } else if (toState === 'COMPLETING' || toState === 'CALCULATING_METRICS') {
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
   * Complete a session with proper state transitions and distributed locking
   */
  async completeSession(sessionId: string, userId: string): Promise<void> {
    // CRITICAL FIX: Use Redis distributed lock to prevent race conditions across server instances
    const { redis } = await import('@/lib/cache/redis-client');
    const lockKey = `session_completion_lock:${sessionId}`;
    const lockTTL = 60; // 60 seconds
    
    try {
      // Try to acquire distributed lock
      const lockAcquired = await redis.set(lockKey, '1', {
        nx: true, // Only set if not exists
        ex: lockTTL // Expire after 60 seconds
      });

      if (!lockAcquired) {
        logger.warn('Could not acquire session completion lock - completion already in progress', { 
          sessionId, 
          userId 
        });
        
        // Wait a bit and check if completion finished
        await new Promise(resolve => setTimeout(resolve, 2000));
        const finalState = await this.getSessionState(sessionId);
        
        if (finalState === 'COMPLETED') {
          logger.info('Session completed by another process', { sessionId });
          return;
        }
        
        throw new Error(`Session completion already in progress for ${sessionId}`);
      }

      const currentState = await this.getSessionState(sessionId);

      if (currentState === 'COMPLETED') {
        logger.info('Session already completed', { sessionId });
        return;
      }

      logger.info('Starting distributed session completion', {
        sessionId,
        userId,
        currentState,
        lockAcquired: true
      });

      // Transition through states
      await this.transitionSession(sessionId, 'ENDING');
      await this.transitionSession(sessionId, 'COMPLETING');

    try {
      // Single pre-fetch: get all fields needed by terminateVapiCall + credit deduction
      const sessionData = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { vapiCallId: true, sessionType: true }
      });

      if (!sessionData) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Ensure VAPI call is terminated (uses pre-fetched vapiCallId)
      await this.terminateVapiCall(sessionId, sessionData.vapiCallId);

      // Deduct credits with timing reconciliation
      await this.transitionSession(sessionId, 'DEDUCTING_CREDITS', async () => {
        const creditManager = new CreditManager();

        // Reconcile timing from all sources for accurate billing
        const reconciliation = await timingReconciliation.reconcileTiming(sessionId);

        if (reconciliation.actualMinutes > 0) {
          await creditManager.deductCredits(
            userId,
            sessionId,
            sessionData.vapiCallId || `lifecycle-${sessionId}`,
            reconciliation.actualMinutes,
            {
              source: 'lifecycle_manager',
              reconciliationData: reconciliation,
              sessionType: sessionData.sessionType,
              completionState: 'unified_deduction',
              timingSource: reconciliation.source,
              confidence: reconciliation.confidence
            }
          );

          logger.info('Credits deducted via lifecycle manager', {
            sessionId,
            userId,
            minutes: reconciliation.actualMinutes,
            timingSource: reconciliation.source,
            confidence: reconciliation.confidence,
            warnings: reconciliation.warnings
          });
        } else {
          logger.info('No credits deducted - zero minute session', {
            sessionId,
            userId,
            reconciliation
          });
        }
      });
      
      // Calculate metrics (deduplication handled internally)
      await this.transitionSession(sessionId, 'CALCULATING_METRICS', async () => {
        await calculateMetrics(sessionId, userId);
      });

      // Final transition to completed — pass userId for cache invalidation
      await this.transitionSession(sessionId, 'COMPLETED', undefined, userId);
      
      logger.info('Session completion finished successfully', {
        sessionId,
        userId
      });
      
    } catch (error) {
      logger.error('Error completing session', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Try to mark as failed, but don't throw if this fails
      try {
        await this.transitionSession(sessionId, 'FAILED', undefined, userId);
      } catch (failError) {
        logger.error('Failed to transition to failed state', { sessionId, error: failError });
      }
      
      throw error;
    } finally {
      // CRITICAL: Always release the distributed lock, even on failure
      try {
        await redis.del(lockKey);
        logger.info('Released session completion lock', { sessionId });
      } catch (lockError) {
        logger.error('Failed to release session completion lock', {
          sessionId,
          error: lockError
        });
      }
    }
    
    } catch (lockAcquisitionError) {
      // This catch handles the initial lock acquisition failure
      logger.error('Failed to acquire or process session completion lock', {
        sessionId,
        userId,
        error: lockAcquisitionError
      });
      throw lockAcquisitionError;
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
  private async terminateVapiCall(sessionId: string, vapiCallId?: string | null): Promise<void> {
    try {
      if (!vapiCallId) {
        logger.info('No VAPI call to terminate', { sessionId });
        return;
      }

      const vapi = (await import('@/lib/vapi')).default;
      await vapi.calls.update(vapiCallId, {
        endCallNow: true
      });

      logger.info('VAPI call terminated', {
        sessionId,
        vapiCallId
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
      COMPLETING: ['DEDUCTING_CREDITS', 'FAILED'],
      DEDUCTING_CREDITS: ['CALCULATING_METRICS', 'FAILED'],
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

    // Intermediate states (ENDING → CALCULATING_METRICS) all map to ACTIVE in the DB,
    // so writing them is a no-op. Only write when the DB status actually changes.
    const isTerminalWrite = state === 'COMPLETED' || state === 'FAILED';
    if (!isTerminalWrite) return;

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
      case 'DEDUCTING_CREDITS':
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

  private async clearSessionCaches(sessionId: string, userId?: string): Promise<void> {
    await sessionCache.invalidate(sessionId);

    if (userId) {
      await profileCache.invalidate(userId);
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