/**
 * Credit Timing Reconciliation Service
 * 
 * Ensures accurate credit tracking by reconciling timing differences between:
 * - Client-side timers
 * - VAPI webhook events
 * - Server-side tracking
 * 
 * Prevents billing discrepancies and ensures users are charged correctly.
 */

import { redis } from '@/lib/cache/redis-client';
import { prisma } from '@/lib/prisma-optimized';

export interface TimingData {
  sessionId: string;
  clientTime: number; // Milliseconds from client timer
  vapiTime: number; // Milliseconds from VAPI webhook
  serverTime: number; // Milliseconds from server tracking
  pausedTime: number; // Total paused time
  startTime: Date;
  endTime?: Date;
}

export interface ReconciliationResult {
  actualMinutes: number;
  discrepancy: number;
  source: 'vapi' | 'server' | 'client';
  confidence: number;
  warnings: string[];
}

export class CreditTimingReconciliation {
  private readonly TIMING_KEY_PREFIX = 'timing:session:';
  private readonly MAX_DISCREPANCY_SECONDS = 10; // 10 seconds max difference
  private readonly PAUSE_GRACE_PERIOD_MS = 5000; // 5 seconds for pause/resume lag
  
  /**
   * Start tracking session timing
   */
  async startSessionTiming(sessionId: string): Promise<void> {
    const timingData: Partial<TimingData> = {
      sessionId,
      startTime: new Date(),
      clientTime: 0,
      vapiTime: 0,
      serverTime: 0,
      pausedTime: 0,
    };
    
    await redis.set(
      `${this.TIMING_KEY_PREFIX}${sessionId}`,
      JSON.stringify(timingData),
      'EX',
      7200 // 2 hours TTL
    );
    
    // Also track in database for audit
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        startTime: timingData.startTime,
        lastConversationStart: timingData.startTime,
      },
    });
  }
  
  /**
   * Update client-side timing
   */
  async updateClientTiming(
    sessionId: string,
    clientMilliseconds: number
  ): Promise<void> {
    const key = `${this.TIMING_KEY_PREFIX}${sessionId}`;
    const data = await redis.get(key);
    
    if (!data) {
      console.warn(`No timing data found for session ${sessionId}`);
      return;
    }
    
    const timingData: TimingData = JSON.parse(data);
    timingData.clientTime = clientMilliseconds;
    
    await redis.set(key, JSON.stringify(timingData), 'EX', 7200);
  }
  
  /**
   * Update VAPI webhook timing
   */
  async updateVapiTiming(
    sessionId: string,
    vapiDurationSeconds: number
  ): Promise<void> {
    const key = `${this.TIMING_KEY_PREFIX}${sessionId}`;
    const data = await redis.get(key);
    
    if (!data) {
      console.warn(`No timing data found for session ${sessionId}`);
      return;
    }
    
    const timingData: TimingData = JSON.parse(data);
    timingData.vapiTime = vapiDurationSeconds * 1000; // Convert to milliseconds
    
    await redis.set(key, JSON.stringify(timingData), 'EX', 7200);
  }
  
  /**
   * Update server-side timing
   */
  async updateServerTiming(sessionId: string): Promise<void> {
    const key = `${this.TIMING_KEY_PREFIX}${sessionId}`;
    const data = await redis.get(key);
    
    if (!data) {
      console.warn(`No timing data found for session ${sessionId}`);
      return;
    }
    
    const timingData: TimingData = JSON.parse(data);
    const now = new Date();
    
    if (timingData.startTime) {
      const elapsed = now.getTime() - new Date(timingData.startTime).getTime();
      timingData.serverTime = elapsed - timingData.pausedTime;
    }
    
    await redis.set(key, JSON.stringify(timingData), 'EX', 7200);
  }
  
  /**
   * Track pause time
   */
  async trackPauseTime(
    sessionId: string,
    pauseMilliseconds: number
  ): Promise<void> {
    const key = `${this.TIMING_KEY_PREFIX}${sessionId}`;
    const data = await redis.get(key);
    
    if (!data) {
      console.warn(`No timing data found for session ${sessionId}`);
      return;
    }
    
    const timingData: TimingData = JSON.parse(data);
    timingData.pausedTime += pauseMilliseconds;
    
    await redis.set(key, JSON.stringify(timingData), 'EX', 7200);
  }
  
  /**
   * Reconcile timing from all sources
   */
  async reconcileTiming(sessionId: string): Promise<ReconciliationResult> {
    const key = `${this.TIMING_KEY_PREFIX}${sessionId}`;
    const data = await redis.get(key);
    
    if (!data) {
      throw new Error(`No timing data found for session ${sessionId}`);
    }
    
    const timingData: TimingData = JSON.parse(data);
    const warnings: string[] = [];
    
    // Convert all to seconds for comparison
    const clientSeconds = Math.round(timingData.clientTime / 1000);
    const vapiSeconds = Math.round(timingData.vapiTime / 1000);
    const serverSeconds = Math.round(timingData.serverTime / 1000);
    
    // Calculate discrepancies
    const vapiClientDiff = Math.abs(vapiSeconds - clientSeconds);
    const vapiServerDiff = Math.abs(vapiSeconds - serverSeconds);
    const clientServerDiff = Math.abs(clientSeconds - serverSeconds);
    
    // Check for significant discrepancies
    if (vapiClientDiff > this.MAX_DISCREPANCY_SECONDS) {
      warnings.push(
        `Large discrepancy between VAPI (${vapiSeconds}s) and client (${clientSeconds}s): ${vapiClientDiff}s difference`
      );
    }
    
    if (vapiServerDiff > this.MAX_DISCREPANCY_SECONDS) {
      warnings.push(
        `Large discrepancy between VAPI (${vapiSeconds}s) and server (${serverSeconds}s): ${vapiServerDiff}s difference`
      );
    }
    
    if (clientServerDiff > this.MAX_DISCREPANCY_SECONDS) {
      warnings.push(
        `Large discrepancy between client (${clientSeconds}s) and server (${serverSeconds}s): ${clientServerDiff}s difference`
      );
    }
    
    // Determine most reliable source
    let actualSeconds: number;
    let source: 'vapi' | 'server' | 'client';
    let confidence: number;
    
    // Priority: VAPI > Server > Client
    if (vapiSeconds > 0) {
      // VAPI is most authoritative
      actualSeconds = vapiSeconds;
      source = 'vapi';
      
      // Calculate confidence based on agreement with other sources
      if (vapiServerDiff <= 5 && vapiClientDiff <= 5) {
        confidence = 1.0; // All sources agree
      } else if (vapiServerDiff <= 5 || vapiClientDiff <= 5) {
        confidence = 0.8; // Two sources agree
      } else {
        confidence = 0.6; // Only VAPI data
      }
    } else if (serverSeconds > 0) {
      // Fall back to server timing
      actualSeconds = serverSeconds;
      source = 'server';
      
      if (clientServerDiff <= 5) {
        confidence = 0.9; // Server and client agree
      } else {
        confidence = 0.7; // Only server data
      }
    } else {
      // Last resort: client timing
      actualSeconds = clientSeconds;
      source = 'client';
      confidence = 0.5; // Least reliable
      
      warnings.push('Using client timing as last resort - no server or VAPI data available');
    }
    
    // Apply pause time adjustment
    if (timingData.pausedTime > this.PAUSE_GRACE_PERIOD_MS) {
      const pauseSeconds = Math.round((timingData.pausedTime - this.PAUSE_GRACE_PERIOD_MS) / 1000);
      actualSeconds = Math.max(0, actualSeconds - pauseSeconds);
    }
    
    // Convert to minutes (round up for billing)
    const actualMinutes = Math.ceil(actualSeconds / 60);
    
    // Calculate maximum discrepancy for reporting
    const maxDiscrepancy = Math.max(vapiClientDiff, vapiServerDiff, clientServerDiff);
    
    return {
      actualMinutes,
      discrepancy: maxDiscrepancy,
      source,
      confidence,
      warnings,
    };
  }
  
  /**
   * Complete session timing and get final duration
   */
  async completeSessionTiming(sessionId: string): Promise<ReconciliationResult> {
    // Update final server timing
    await this.updateServerTiming(sessionId);
    
    // Perform reconciliation
    const result = await this.reconcileTiming(sessionId);
    
    // Store audit trail
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        endTime: new Date(),
        conversationTimeSeconds: result.actualMinutes * 60,
        creditsUsed: result.actualMinutes,
      },
    });
    
    // Log significant discrepancies for monitoring
    if (result.discrepancy > this.MAX_DISCREPANCY_SECONDS) {
      console.warn(`Session ${sessionId} timing reconciliation:`, {
        actualMinutes: result.actualMinutes,
        discrepancy: result.discrepancy,
        source: result.source,
        confidence: result.confidence,
        warnings: result.warnings,
      });
    }
    
    // Clean up Redis data
    const key = `${this.TIMING_KEY_PREFIX}${sessionId}`;
    await redis.del(key);
    
    return result;
  }
  
  /**
   * Get current timing status (for debugging/monitoring)
   */
  async getTimingStatus(sessionId: string): Promise<TimingData | null> {
    const key = `${this.TIMING_KEY_PREFIX}${sessionId}`;
    const data = await redis.get(key);
    
    if (!data) {
      return null;
    }
    
    return JSON.parse(data);
  }
}

// Export singleton instance
export const timingReconciliation = new CreditTimingReconciliation();