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
import { prisma } from '@/lib/database/prisma-optimized';
import { convertToBillableMinutes } from '@/lib/utils/billing-utils';

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
  sessionId: string;
  actualMinutes: number;
  confidence: number;
  source: 'client' | 'server' | 'vapi';
  discrepancy: number;
  warnings: string[];
  clientTime?: number;
  serverTime?: number;
  vapiTime?: number;
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
   * Reconcile timing from all sources with comprehensive confidence scoring
   */
  async reconcileTiming(sessionId: string): Promise<ReconciliationResult> {
    const key = `${this.TIMING_KEY_PREFIX}${sessionId}`;
    
    try {
      const data = await redis.get(key);
      
      if (!data) {
        // Handle missing timing data gracefully
        console.warn(`No timing data found for session ${sessionId}, checking database`);
        
        // Fallback to database timing
        const session = await prisma.session.findUnique({
          where: { id: sessionId },
          select: { 
            conversationTimeSeconds: true,
            totalPausedTimeSeconds: true,
            startTime: true,
            endTime: true
          }
        });
        
        if (!session) {
          throw new Error(`Session ${sessionId} not found in database`);
        }
        
        const fallbackSeconds = session.conversationTimeSeconds || 0;
        const fallbackMinutes = convertToBillableMinutes(fallbackSeconds);
        
        return {
          sessionId,
          actualMinutes: fallbackMinutes,
          confidence: 0.3, // Low confidence for database fallback
          source: 'server',
          discrepancy: 0,
          warnings: ['No Redis timing data found, used database fallback'],
          serverTime: fallbackSeconds,
        };
      }
      
      const timingData: TimingData = JSON.parse(data);
      const warnings: string[] = [];
      
      // Convert all to seconds for comparison
      const clientSeconds = Math.round(timingData.clientTime / 1000);
      const vapiSeconds = Math.round(timingData.vapiTime / 1000);
      const serverSeconds = Math.round(timingData.serverTime / 1000);
      
      // Log timing data for audit trail
      console.log(`[Timing-Reconciliation] Session ${sessionId} timing data:`, {
        client: clientSeconds,
        vapi: vapiSeconds,
        server: serverSeconds,
        pausedTime: Math.round(timingData.pausedTime / 1000)
      });
      
      // Calculate discrepancies
      const vapiClientDiff = Math.abs(vapiSeconds - clientSeconds);
      const vapiServerDiff = Math.abs(vapiSeconds - serverSeconds);
      const clientServerDiff = Math.abs(clientSeconds - serverSeconds);
      
      // Enhanced discrepancy analysis
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
      
      // Enhanced confidence scoring and source selection
      let actualSeconds: number;
      let source: 'client' | 'server' | 'vapi';
      let confidence: number;
      
      const hasVapi = vapiSeconds > 0;
      const hasServer = serverSeconds > 0;
      const hasClient = clientSeconds > 0;
      
      // Zero-minute session handling
      if (!hasVapi && !hasServer && !hasClient) {
        console.log(`[Timing-Reconciliation] Zero-minute session detected: ${sessionId}`);
        return {
          sessionId,
          actualMinutes: 0,
          confidence: 1.0,
          source: 'vapi',
          discrepancy: 0,
          warnings: ['Zero-minute session - no timing data from any source'],
          clientTime: clientSeconds,
          serverTime: serverSeconds,
          vapiTime: vapiSeconds,
        };
      }
      
      // Priority-based source selection with enhanced confidence scoring
      if (hasVapi) {
        actualSeconds = vapiSeconds;
        source = 'vapi';
        
        // Detailed confidence calculation for VAPI
        if (hasServer && hasClient) {
          // All three sources available
          if (vapiServerDiff <= 5 && vapiClientDiff <= 5) {
            confidence = 1.0; // All sources agree within 5 seconds
          } else if (vapiServerDiff <= 10 && vapiClientDiff <= 10) {
            confidence = 0.9; // All sources agree within 10 seconds
          } else if (vapiServerDiff <= 5 || vapiClientDiff <= 5) {
            confidence = 0.8; // VAPI agrees with one source
          } else {
            confidence = 0.6; // Large discrepancies, but VAPI is still preferred
            warnings.push('Large discrepancies detected, using VAPI as most authoritative');
          }
        } else if (hasServer || hasClient) {
          // Two sources available
          const otherDiff = hasServer ? vapiServerDiff : vapiClientDiff;
          if (otherDiff <= 5) {
            confidence = 0.8; // Two sources agree
          } else if (otherDiff <= 30) {
            confidence = 0.7; // Moderate agreement
          } else {
            confidence = 0.6; // Large discrepancy
          }
        } else {
          // Only VAPI available
          confidence = 0.6;
          warnings.push('Only VAPI timing available - no client or server timing for validation');
        }
      } else if (hasServer) {
        actualSeconds = serverSeconds;
        source = 'server';
        
        if (hasClient) {
          if (clientServerDiff <= 5) {
            confidence = 0.85; // Server and client agree closely
          } else if (clientServerDiff <= 10) {
            confidence = 0.75; // Moderate agreement
          } else if (clientServerDiff <= 30) {
            confidence = 0.65; // Some discrepancy but reasonable
          } else {
            confidence = 0.5; // Large discrepancy
            warnings.push('Large discrepancy between server and client timing');
          }
        } else {
          confidence = 0.7; // Only server timing
          warnings.push('Only server timing available - no VAPI or client validation');
        }
      } else if (hasClient) {
        actualSeconds = clientSeconds;
        source = 'client';
        confidence = 0.4; // Lowest confidence for client-only timing
        warnings.push('Using client timing as last resort - no server or VAPI data available');
      } else {
        // This should never happen due to earlier check, but safety fallback
        actualSeconds = 0;
        source = 'server';
        confidence = 0.1;
        warnings.push('No timing data available from any source');
      }
      
      // Enhanced pause time handling
      if (timingData.pausedTime > this.PAUSE_GRACE_PERIOD_MS) {
        const pauseSeconds = Math.round((timingData.pausedTime - this.PAUSE_GRACE_PERIOD_MS) / 1000);
        const originalSeconds = actualSeconds;
        actualSeconds = Math.max(0, actualSeconds - pauseSeconds);
        
        console.log(`[Timing-Reconciliation] Applied pause adjustment: ${originalSeconds}s -> ${actualSeconds}s (paused: ${pauseSeconds}s)`);
        
        if (pauseSeconds > 60) { // More than 1 minute of pause
          warnings.push(`Session had ${Math.round(pauseSeconds / 60)} minutes of pause time`);
        }
      }
      
      // Browser crash detection and handling
      if (hasServer && hasVapi && !hasClient && serverSeconds > 30) {
        warnings.push('Possible browser crash detected - no client timing but server/VAPI timing available');
        confidence = Math.min(confidence, 0.8); // Reduce confidence slightly
      }
      
      // Multiple pause/resume cycle detection
      if (timingData.pausedTime > actualSeconds * 1000 * 0.5) { // Pause time > 50% of session
        warnings.push('Session had extensive pause periods - may indicate technical issues');
        confidence = Math.min(confidence, 0.7);
      }
      
      // Convert to minutes (round up for billing)
      const actualMinutes = convertToBillableMinutes(actualSeconds);
      
      // Calculate maximum discrepancy for reporting
      const maxDiscrepancy = Math.max(vapiClientDiff, vapiServerDiff, clientServerDiff);
      
      // Log reconciliation decision for audit
      console.log(`[Timing-Reconciliation] Session ${sessionId} reconciliation result:`, {
        actualMinutes,
        source,
        confidence,
        discrepancy: maxDiscrepancy,
        warningCount: warnings.length
      });
      
      return {
        sessionId,
        actualMinutes,
        confidence,
        source,
        discrepancy: maxDiscrepancy,
        warnings,
        clientTime: clientSeconds,
        serverTime: serverSeconds,
        vapiTime: vapiSeconds,
      };
      
    } catch (error) {
      console.error(`[Timing-Reconciliation] Error reconciling timing for session ${sessionId}:`, error);
      
      // Graceful error handling with database fallback
      try {
        const session = await prisma.session.findUnique({
          where: { id: sessionId },
          select: { conversationTimeSeconds: true }
        });
        
        const fallbackSeconds = session?.conversationTimeSeconds || 0;
        const fallbackMinutes = convertToBillableMinutes(fallbackSeconds);
        
        return {
          sessionId,
          actualMinutes: fallbackMinutes,
          confidence: 0.2, // Very low confidence due to error
          source: 'server',
          discrepancy: 0,
          warnings: [`Error during reconciliation: ${error instanceof Error ? error.message : 'Unknown error'}`],
          serverTime: fallbackSeconds,
        };
      } catch (dbError) {
        console.error(`[Timing-Reconciliation] Database fallback failed for session ${sessionId}:`, dbError);
        throw new Error(`Unable to reconcile timing for session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
  
  /**
   * Complete session timing and get final duration with comprehensive audit logging
   */
  async completeSessionTiming(sessionId: string): Promise<ReconciliationResult> {
    console.log(`[Timing-Reconciliation] Completing session timing for ${sessionId}`);
    
    try {
      // Update final server timing
      await this.updateServerTiming(sessionId);
      
      // Perform reconciliation
      const result = await this.reconcileTiming(sessionId);
      
      // Get existing session data for notes
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { notes: true }
      });
      
      // Store comprehensive audit trail in database using existing fields
      const existingNotes = session?.notes || '';
      const reconciliationMetadata = `[Reconciliation] Source: ${result.source}, Confidence: ${result.confidence}, Discrepancy: ${result.discrepancy}s, Warnings: ${result.warnings.length}`;
      const updatedNotes = existingNotes ? `${existingNotes}\n${reconciliationMetadata}` : reconciliationMetadata;
      
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          endTime: new Date(),
          conversationTimeSeconds: result.actualMinutes * 60,
          creditsUsed: result.actualMinutes,
          // Store reconciliation metadata in notes field
          notes: updatedNotes,
        },
      });
      
      // Create audit log entry for significant decisions
      if (result.discrepancy > this.MAX_DISCREPANCY_SECONDS || result.confidence < 0.8 || result.warnings.length > 0) {
        console.warn(`[Timing-Reconciliation] Session ${sessionId} reconciliation audit:`, {
          sessionId,
          actualMinutes: result.actualMinutes,
          discrepancy: result.discrepancy,
          source: result.source,
          confidence: result.confidence,
          clientTime: result.clientTime,
          serverTime: result.serverTime,
          vapiTime: result.vapiTime,
          warnings: result.warnings,
          timestamp: new Date().toISOString()
        });
        
        // Store audit record in Redis for monitoring dashboard
        const auditKey = `timing:audit:${sessionId}`;
        const auditData = {
          sessionId,
          reconciliationResult: result,
          timestamp: new Date().toISOString(),
          requiresReview: result.confidence < 0.5 || result.discrepancy > 30
        };
        
        await redis.set(auditKey, JSON.stringify(auditData), 'EX', 604800); // 7 days
      }
      
      // Log successful completion
      console.log(`[Timing-Reconciliation] Session ${sessionId} completed successfully:`, {
        actualMinutes: result.actualMinutes,
        source: result.source,
        confidence: result.confidence
      });
      
      // Clean up Redis data
      const key = `${this.TIMING_KEY_PREFIX}${sessionId}`;
      await redis.del(key);
      
      return result;
      
    } catch (error) {
      console.error(`[Timing-Reconciliation] Error completing session ${sessionId}:`, error);
      
      // Create error audit record
      const errorAuditKey = `timing:error:${sessionId}`;
      const errorData = {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        requiresManualReview: true
      };
      
      await redis.set(errorAuditKey, JSON.stringify(errorData), 'EX', 604800); // 7 days
      
      throw error;
    }
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