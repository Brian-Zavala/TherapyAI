/**
 * Credit Reservation Manager
 * 
 * Provides atomic reservation operations to prevent double-spending.
 * Uses database-backed reservations for ACID guarantees instead of Redis.
 */

import { prisma } from '@/lib/prisma-optimized';
import { redis } from '@/lib/cache/redis-client';
import { calculateReservationExpiry, isReservationExpired } from '@/lib/utils/billing-utils';

export interface CreditReservation {
  id: string;
  userId: string;
  sessionId: string;
  minutes: number;
  creditId: string;
  expiresAt: Date;
  status: 'ACTIVE' | 'EXPIRED' | 'CONSUMED' | 'RELEASED';
  createdAt: Date;
}

export class CreditReservationManager {
  /**
   * Create a reservation atomically with proper locking
   * This prevents double-spending by using database ACID guarantees
   */
  async createReservation(
    userId: string,
    sessionId: string,
    minutes: number
  ): Promise<{ success: boolean; reservation?: CreditReservation; error?: string }> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Lock the user's credit record to prevent concurrent modifications
        const creditsResult = await tx.$queryRaw<any[]>`
          SELECT * FROM "UsageCredits"
          WHERE "userId" = ${userId}
            AND "billingPeriodStart" <= NOW()
            AND "billingPeriodEnd" >= NOW()
          ORDER BY "createdAt" DESC
          LIMIT 1
          FOR UPDATE
        `;

        if (!creditsResult || creditsResult.length === 0) {
          return { success: false, error: 'No active credits found' };
        }

        const credits = creditsResult[0];

        // Check if unlimited plan
        if (credits.planType === 'unlimited') {
          // Create tracking reservation but don't deduct
          const reservation = await this.createReservationRecord(tx, {
            userId,
            sessionId,
            minutes,
            creditId: credits.id,
            isUnlimited: true,
          });
          
          return { success: true, reservation };
        }

        // Calculate total reserved credits from database (not Redis)
        const activeReservations = await tx.$queryRaw<any[]>`
          SELECT COALESCE(SUM(minutes), 0) as total
          FROM "CreditReservation"
          WHERE "userId" = ${userId}
            AND status = 'ACTIVE'
            AND "expiresAt" > NOW()
            AND "sessionId" != ${sessionId}
        `;

        const totalReserved = Number(activeReservations[0]?.total || 0);
        const totalAvailable = credits.totalCredits + credits.bonusCredits;
        const actualAvailable = totalAvailable - credits.usedCredits - totalReserved;

        if (actualAvailable < minutes) {
          return {
            success: false,
            error: `Insufficient credits: ${actualAvailable} available (${totalReserved} reserved), ${minutes} requested`
          };
        }

        // Create the reservation
        const reservation = await this.createReservationRecord(tx, {
          userId,
          sessionId,
          minutes,
          creditId: credits.id,
          isUnlimited: false,
        });

        return { success: true, reservation };
      }, {
        maxWait: 5000,
        timeout: 10000,
        isolationLevel: 'ReadCommitted',
      });
    } catch (error: any) {
      console.error('Failed to create reservation:', error);
      
      // Handle lock timeout gracefully
      if (error.message?.includes('lock') || error.code === 'P2034') {
        return { 
          success: false, 
          error: 'System busy, please try again in a moment' 
        };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Create reservation record in database
   */
  private async createReservationRecord(
    tx: any,
    data: {
      userId: string;
      sessionId: string;
      minutes: number;
      creditId: string;
      isUnlimited: boolean;
    }
  ): Promise<CreditReservation> {
    const expiresAt = calculateReservationExpiry(data.minutes);
    
    // Check if reservation already exists
    const existing = await tx.$queryRaw<any[]>`
      SELECT * FROM "CreditReservation"
      WHERE "sessionId" = ${data.sessionId}
        AND status = 'ACTIVE'
      LIMIT 1
    `;

    if (existing && existing.length > 0) {
      return existing[0];
    }

    // Create new reservation
    const result = await tx.$executeRaw`
      INSERT INTO "CreditReservation" 
        (id, "userId", "sessionId", minutes, "creditId", "expiresAt", status, "createdAt", "updatedAt")
      VALUES 
        (${this.generateId()}, ${data.userId}, ${data.sessionId}, ${data.minutes}, 
         ${data.creditId}, ${expiresAt}, 'ACTIVE', NOW(), NOW())
      RETURNING *
    `;

    // Also set in Redis for fast lookup (non-critical)
    this.cacheReservation(data.sessionId, {
      userId: data.userId,
      minutes: data.minutes,
      expiresAt: expiresAt.toISOString(),
      isUnlimited: data.isUnlimited,
    }).catch(err => console.warn('Failed to cache reservation:', err));

    return result as any;
  }

  /**
   * Release a reservation
   */
  async releaseReservation(sessionId: string): Promise<boolean> {
    try {
      const result = await prisma.$executeRaw`
        UPDATE "CreditReservation"
        SET status = 'RELEASED', "updatedAt" = NOW()
        WHERE "sessionId" = ${sessionId}
          AND status = 'ACTIVE'
      `;

      // Clear from Redis cache
      await redis.del(`credits:reserved:${sessionId}`).catch(() => {});
      
      return result > 0;
    } catch (error) {
      console.error('Failed to release reservation:', error);
      return false;
    }
  }

  /**
   * Mark reservation as consumed when credits are deducted
   */
  async consumeReservation(sessionId: string): Promise<boolean> {
    try {
      const result = await prisma.$executeRaw`
        UPDATE "CreditReservation"
        SET status = 'CONSUMED', "updatedAt" = NOW()
        WHERE "sessionId" = ${sessionId}
          AND status = 'ACTIVE'
      `;

      // Clear from Redis cache
      await redis.del(`credits:reserved:${sessionId}`).catch(() => {});
      
      return result > 0;
    } catch (error) {
      console.error('Failed to consume reservation:', error);
      return false;
    }
  }

  /**
   * Clean up expired reservations
   */
  async cleanupExpiredReservations(): Promise<number> {
    try {
      const result = await prisma.$executeRaw`
        UPDATE "CreditReservation"
        SET status = 'EXPIRED', "updatedAt" = NOW()
        WHERE status = 'ACTIVE'
          AND "expiresAt" < NOW()
      `;

      console.log(`Cleaned up ${result} expired reservations`);
      return result;
    } catch (error) {
      console.error('Failed to cleanup reservations:', error);
      return 0;
    }
  }

  /**
   * Get active reservations for a user
   */
  async getUserActiveReservations(userId: string): Promise<CreditReservation[]> {
    try {
      const reservations = await prisma.$queryRaw<CreditReservation[]>`
        SELECT * FROM "CreditReservation"
        WHERE "userId" = ${userId}
          AND status = 'ACTIVE'
          AND "expiresAt" > NOW()
        ORDER BY "createdAt" DESC
      `;

      return reservations;
    } catch (error) {
      console.error('Failed to get user reservations:', error);
      return [];
    }
  }

  /**
   * Cache reservation in Redis for fast lookup (non-critical)
   */
  private async cacheReservation(sessionId: string, data: any): Promise<void> {
    const ttl = 3600; // 1 hour
    await redis.set(`credits:reserved:${sessionId}`, JSON.stringify(data), 'EX', ttl);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const creditReservationManager = new CreditReservationManager();