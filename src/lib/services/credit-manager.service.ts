import { prisma } from '@/lib/prisma-client';
import { UsageCredits, UsageTransaction, TransactionType, AlertType } from '@prisma/client';
import { sendEmail } from '@/lib/email';
import { redis } from '@/lib/cache/redis-client';
import crypto from 'crypto';

export interface CreditManagerConfig {
  plans: {
    free: { credits: number; maxSessionDuration: number; concurrent: number };
    essential: { credits: number; maxSessionDuration: number; concurrent: number };
    growth: { credits: number; maxSessionDuration: number; concurrent: number };
    unlimited: { credits: number; maxSessionDuration: number; concurrent: number };
  };
  overageRate: number;
  alertThresholds: number[];
}

// Pricing tiers based on PRICING-STRATEGY-ANALYSIS.md
const config: CreditManagerConfig = {
  plans: {
    free: { credits: 45, maxSessionDuration: 15, concurrent: 1 }, // 3 sessions × 15 minutes
    essential: { credits: 160, maxSessionDuration: 20, concurrent: 1 }, // 8 sessions × 20 minutes
    growth: { credits: 400, maxSessionDuration: 25, concurrent: 2 }, // 16 sessions × 25 minutes
    unlimited: { credits: 1200, maxSessionDuration: 30, concurrent: 3 }, // Soft cap at 1200 minutes
  },
  overageRate: 0.15, // $0.15 per minute
  alertThresholds: [80, 90, 100], // percentage thresholds
};

export class CreditManager {
  private config: CreditManagerConfig;
  private readonly LOCK_TIMEOUT_SECONDS = 30; // Increased from 10 to 30 seconds
  private readonly RESERVATION_TIMEOUT_SECONDS = 3600; // 1 hour for session timeout
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(customConfig?: Partial<CreditManagerConfig>) {
    this.config = { ...config, ...customConfig };
  }

  /**
   * Generate idempotency key for operations
   */
  private generateIdempotencyKey(operation: string, params: string[]): string {
    const data = `${operation}:${params.join(':')}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Acquire distributed lock with retry mechanism
   */
  private async acquireLock(key: string, ttlSeconds = this.LOCK_TIMEOUT_SECONDS): Promise<string | null> {
    const lockValue = crypto.randomUUID();
    
    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      const acquired = await redis.set(key, lockValue, 'EX', ttlSeconds, 'NX');
      
      if (acquired) {
        return lockValue;
      }
      
      // Exponential backoff: 100ms, 200ms, 400ms
      if (attempt < this.MAX_RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
      }
    }
    
    return null;
  }

  /**
   * Release distributed lock safely
   */
  private async releaseLock(key: string, lockValue: string): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    
    try {
      const result = await redis.eval(script, 1, key, lockValue) as number;
      return result === 1;
    } catch (error) {
      console.error(`Failed to release lock ${key}:`, error);
      return false;
    }
  }

  /**
   * Execute operation with idempotency protection
   */
  private async withIdempotency<T>(
    idempotencyKey: string,
    operation: () => Promise<T>,
    ttlSeconds = 300
  ): Promise<T> {
    const resultKey = `idempotent:result:${idempotencyKey}`;
    const lockKey = `idempotent:lock:${idempotencyKey}`;
    
    // Check if operation already completed
    const existingResult = await redis.get(resultKey);
    if (existingResult) {
      return JSON.parse(existingResult);
    }
    
    // Acquire lock for this operation
    const lockValue = await this.acquireLock(lockKey, 30);
    if (!lockValue) {
      throw new Error('Unable to acquire idempotency lock after retries');
    }
    
    try {
      // Double-check result after acquiring lock
      const doubleCheckResult = await redis.get(resultKey);
      if (doubleCheckResult) {
        return JSON.parse(doubleCheckResult);
      }
      
      // Execute operation
      const result = await operation();
      
      // Store result
      await redis.set(resultKey, JSON.stringify(result), 'EX', ttlSeconds);
      
      return result;
    } finally {
      await this.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * Initialize credits for a new billing period with atomic transaction
   */
  async initializeBillingPeriod(
    userId: string,
    planType: keyof typeof config.plans,
    billingStart: Date,
    billingEnd: Date,
    subscriptionId?: string
  ): Promise<UsageCredits> {
    const idempotencyKey = this.generateIdempotencyKey('initializeBillingPeriod', [
      userId,
      planType,
      billingStart.toISOString(),
      billingEnd.toISOString(),
      subscriptionId || '',
    ]);

    return this.withIdempotency(idempotencyKey, async () => {
      const credits = this.config.plans[planType].credits;

      return await prisma.$transaction(async (tx) => {
        // Check if credits already exist for this billing period
        const existingCredits = await tx.usageCredits.findFirst({
          where: {
            userId,
            billingPeriodStart: billingStart,
            billingPeriodEnd: billingEnd,
          },
        });

        if (existingCredits) {
          // Update existing credits if plan changed
          return await tx.usageCredits.update({
            where: { id: existingCredits.id },
            data: {
              totalCredits: credits,
              planType,
              subscriptionId,
            },
          });
        }

        // Create new credits for billing period
        return await tx.usageCredits.create({
          data: {
            userId,
            totalCredits: credits,
            usedCredits: 0,
            bonusCredits: 0,
            billingPeriodStart: billingStart,
            billingPeriodEnd: billingEnd,
            planType,
            subscriptionId,
          },
        });
      });
    });
  }

  /**
   * Handle subscription upgrade with atomic transaction and lock
   */
  async handleSubscriptionUpgrade(
    userId: string,
    newPlanType: keyof typeof config.plans,
    oldPlanType: keyof typeof config.plans,
    billingStart: Date,
    billingEnd: Date,
    subscriptionId?: string
  ): Promise<UsageCredits> {
    const lockKey = `credits:upgrade:${userId}`;
    const lockValue = await this.acquireLock(lockKey);
    
    if (!lockValue) {
      throw new Error('Unable to acquire upgrade lock after retries');
    }

    try {
      const idempotencyKey = this.generateIdempotencyKey('handleSubscriptionUpgrade', [
        userId,
        newPlanType,
        oldPlanType,
        billingStart.toISOString(),
        billingEnd.toISOString(),
        subscriptionId || '',
      ]);

      return await this.withIdempotency(idempotencyKey, async () => {
        const newPlanCredits = this.config.plans[newPlanType].credits;
        const oldPlanCredits = this.config.plans[oldPlanType].credits;
        const additionalCredits = Math.max(0, newPlanCredits - oldPlanCredits);

        return await prisma.$transaction(async (tx) => {
          // Get current credits within transaction
          const currentCredits = await tx.usageCredits.findFirst({
            where: {
              userId,
              billingPeriodStart: { lte: new Date() },
              billingPeriodEnd: { gte: new Date() },
            },
            orderBy: { createdAt: 'desc' },
          });

          if (currentCredits) {
            // Update with new plan and add upgrade bonus
            const updatedCredits = await tx.usageCredits.update({
              where: { id: currentCredits.id },
              data: {
                totalCredits: newPlanCredits,
                bonusCredits: currentCredits.bonusCredits + additionalCredits,
                planType: newPlanType,
                subscriptionId,
              },
            });

            // Create upgrade transaction record
            await tx.usageTransaction.create({
              data: {
                userId,
                creditId: currentCredits.id,
                type: TransactionType.BONUS,
                amount: additionalCredits,
                balance: newPlanCredits + updatedCredits.bonusCredits - updatedCredits.usedCredits,
                description: `Plan upgrade from ${oldPlanType} to ${newPlanType} - bonus credits`,
              },
            });

            return updatedCredits;
          }

          // If no current credits, initialize with new plan
          return await tx.usageCredits.create({
            data: {
              userId,
              totalCredits: newPlanCredits,
              usedCredits: 0,
              bonusCredits: 0,
              billingPeriodStart: billingStart,
              billingPeriodEnd: billingEnd,
              planType: newPlanType,
              subscriptionId,
            },
          });
        });
      });
    } finally {
      await this.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * Get current active credits for a user
   */
  async getCurrentCredits(userId: string): Promise<UsageCredits | null> {
    const now = new Date();
    
    // Try to get from cache first
    const cacheKey = `credits:${userId}:current`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as UsageCredits;
    }

    const credits = await prisma.usageCredits.findFirst({
      where: {
        userId,
        billingPeriodStart: { lte: now },
        billingPeriodEnd: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (credits) {
      // Cache for 5 minutes
      await redis.set(cacheKey, JSON.stringify(credits), 'EX', 300);
    }

    return credits;
  }

  /**
   * Check if user has sufficient credits for a session
   */
  async checkCredits(
    userId: string,
    requestedMinutes?: number
  ): Promise<{
    hasCredits: boolean;
    availableMinutes: number;
    remainingCredits: number;
    isUnlimited: boolean;
    planType: string;
    maxSessionDuration: number;
  }> {
    const credits = await this.getCurrentCredits(userId);

    // If no credits found, default to free tier
    if (!credits) {
      return {
        hasCredits: false,
        availableMinutes: 0,
        remainingCredits: 0,
        isUnlimited: false,
        planType: 'free',
        maxSessionDuration: this.config.plans.free.maxSessionDuration,
      };
    }

    const planType = credits.planType as keyof typeof config.plans;
    const planConfig = this.config.plans[planType];

    // Handle unlimited plan
    if (planType === 'unlimited') {
      return {
        hasCredits: true,
        availableMinutes: planConfig.maxSessionDuration,
        remainingCredits: -1,
        isUnlimited: true,
        planType,
        maxSessionDuration: planConfig.maxSessionDuration,
      };
    }

    // Calculate remaining credits
    const totalAvailable = credits.totalCredits + credits.bonusCredits;
    const remaining = totalAvailable - credits.usedCredits;
    const availableMinutes = Math.min(
      remaining,
      planConfig.maxSessionDuration,
      requestedMinutes || planConfig.maxSessionDuration
    );

    return {
      hasCredits: remaining > 0,
      availableMinutes: Math.max(0, availableMinutes),
      remainingCredits: Math.max(0, remaining),
      isUnlimited: false,
      planType,
      maxSessionDuration: planConfig.maxSessionDuration,
    };
  }

  /**
   * Reserve credits for a session with improved concurrency control
   */
  async reserveCredits(
    userId: string,
    sessionId: string,
    minutes: number
  ): Promise<{ success: boolean; reservationId?: string; error?: string }> {
    const idempotencyKey = this.generateIdempotencyKey('reserveCredits', [
      userId,
      sessionId,
      minutes.toString(),
    ]);

    return await this.withIdempotency(idempotencyKey, async () => {
      const lockKey = `credits:reserve:${userId}`;
      const lockValue = await this.acquireLock(lockKey);
      
      if (!lockValue) {
        return { success: false, error: 'Unable to acquire reservation lock' };
      }

      try {
        // Check if already reserved
        const existingReservation = await redis.get(`credits:reserved:${sessionId}`);
        if (existingReservation) {
          return { success: true, reservationId: sessionId };
        }

        return await prisma.$transaction(
          async (tx) => {
            const credits = await tx.usageCredits.findFirst({
              where: {
                userId,
                billingPeriodStart: { lte: new Date() },
                billingPeriodEnd: { gte: new Date() },
              },
              orderBy: { createdAt: 'desc' },
            });

            if (!credits) {
              return { success: false, error: 'No active credits found' };
            }

            const planType = credits.planType as keyof typeof config.plans;
            if (planType === 'unlimited') {
              // Still create reservation for tracking
              const reservationData = {
                userId,
                sessionId,
                minutes,
                creditId: credits.id,
                isUnlimited: true,
                timestamp: Date.now(),
              };

              await redis.set(
                `credits:reserved:${sessionId}`,
                JSON.stringify(reservationData),
                'EX',
                this.RESERVATION_TIMEOUT_SECONDS
              );

              return { success: true, reservationId: sessionId };
            }

            const totalAvailable = credits.totalCredits + credits.bonusCredits;
            const remaining = totalAvailable - credits.usedCredits;

            if (remaining < minutes) {
              return { 
                success: false, 
                error: `Insufficient credits: ${remaining} available, ${minutes} requested` 
              };
            }

            // Create reservation record
            const reservationData = {
              userId,
              sessionId,
              minutes,
              creditId: credits.id,
              isUnlimited: false,
              timestamp: Date.now(),
            };

            await redis.set(
              `credits:reserved:${sessionId}`,
              JSON.stringify(reservationData),
              'EX',
              this.RESERVATION_TIMEOUT_SECONDS
            );

            // Track reservation count for monitoring
            await redis.incr(`credits:reservations:${userId}:${new Date().toISOString().split('T')[0]}`);

            return { success: true, reservationId: sessionId };
          },
          {
            maxWait: 5000, // 5 seconds max wait time
            timeout: 10000, // 10 seconds timeout for the transaction
            isolationLevel: 'Serializable', // Highest isolation level for credit operations
          }
        );
      } finally {
        await this.releaseLock(lockKey, lockValue);
      }
    });
  }

  /**
   * Deduct credits after session completion with idempotency and atomic transaction
   */
  async deductCredits(
    userId: string,
    sessionId: string,
    vapiCallId: string,
    minutesUsed: number,
    metadata?: Record<string, any>
  ): Promise<UsageTransaction> {
    const idempotencyKey = this.generateIdempotencyKey('deductCredits', [
      userId,
      sessionId,
      vapiCallId,
      minutesUsed.toString(),
    ]);

    return await this.withIdempotency(idempotencyKey, async () => {
      const lockKey = `credits:deduct:${userId}:${sessionId}`;
      const lockValue = await this.acquireLock(lockKey);
      
      if (!lockValue) {
        throw new Error('Unable to acquire deduction lock after retries');
      }

      try {
        return await prisma.$transaction(async (tx) => {
          // Get current credits within transaction
          const credits = await tx.usageCredits.findFirst({
            where: {
              userId,
              billingPeriodStart: { lte: new Date() },
              billingPeriodEnd: { gte: new Date() },
            },
            orderBy: { createdAt: 'desc' },
          });

          if (!credits) {
            throw new Error('No active credits found for user');
          }

          // Check for duplicate transaction
          const existingTransaction = await tx.usageTransaction.findFirst({
            where: {
              userId,
              sessionId,
              vapiCallId,
              type: TransactionType.DEBIT,
            },
          });

          if (existingTransaction) {
            return existingTransaction; // Return existing transaction if found
          }

          // Calculate actual deduction (round up to nearest minute)
          const actualMinutes = Math.ceil(minutesUsed);

          // For unlimited plans, just track usage without deducting
          if (credits.planType === 'unlimited') {
            return await tx.usageTransaction.create({
              data: {
                userId,
                creditId: credits.id,
                type: TransactionType.DEBIT,
                amount: actualMinutes,
                balance: -1, // Unlimited balance
                sessionId,
                vapiCallId,
                description: `Therapy session - ${actualMinutes} minutes (unlimited)`,
                metadata,
              },
            });
          }

          // Update credits atomically
          const updatedCredits = await tx.usageCredits.update({
            where: { id: credits.id },
            data: {
              usedCredits: {
                increment: actualMinutes,
              },
            },
          });

          // Calculate new balance
          const totalAvailable = updatedCredits.totalCredits + updatedCredits.bonusCredits;
          const newBalance = totalAvailable - updatedCredits.usedCredits;

          // Create transaction record
          const transaction = await tx.usageTransaction.create({
            data: {
              userId,
              creditId: credits.id,
              type: TransactionType.DEBIT,
              amount: actualMinutes,
              balance: Math.max(0, newBalance),
              sessionId,
              vapiCallId,
              description: `Therapy session - ${actualMinutes} minutes`,
              metadata,
            },
          });

          // Store for post-transaction cleanup
          return { transaction, updatedCredits, newBalance };
        }).then(async (result) => {
          if ('transaction' in result) {
            // Post-transaction cleanup
            const { transaction, updatedCredits, newBalance } = result;
            
            // Remove reservation if exists
            const reservationKey = `credits:reserved:${sessionId}`;
            await redis.del(reservationKey);

            // Invalidate cache
            const cacheKey = `credits:${userId}:current`;
            await redis.del(cacheKey);

            // Check for alerts (fire and forget)
            this.checkAndSendAlerts(userId, updatedCredits, newBalance).catch(error => {
              console.error('Failed to send usage alerts:', error);
            });

            return transaction;
          }
          
          return result; // Return existing transaction
        });
      } finally {
        await this.releaseLock(lockKey, lockValue);
      }
    });
  }

  /**
   * Add bonus credits with atomic transaction and idempotency
   */
  async addBonusCredits(
    userId: string,
    amount: number,
    reason: string
  ): Promise<UsageTransaction> {
    const idempotencyKey = this.generateIdempotencyKey('addBonusCredits', [
      userId,
      amount.toString(),
      reason,
    ]);

    return await this.withIdempotency(idempotencyKey, async () => {
      const lockKey = `credits:bonus:${userId}`;
      const lockValue = await this.acquireLock(lockKey);
      
      if (!lockValue) {
        throw new Error('Unable to acquire bonus credits lock after retries');
      }

      try {
        return await prisma.$transaction(async (tx) => {
          const credits = await tx.usageCredits.findFirst({
            where: {
              userId,
              billingPeriodStart: { lte: new Date() },
              billingPeriodEnd: { gte: new Date() },
            },
            orderBy: { createdAt: 'desc' },
          });

          if (!credits) {
            throw new Error('No active credits found for user');
          }

          const updatedCredits = await tx.usageCredits.update({
            where: { id: credits.id },
            data: {
              bonusCredits: {
                increment: amount,
              },
            },
          });

          const totalAvailable = updatedCredits.totalCredits + updatedCredits.bonusCredits;
          const newBalance = totalAvailable - updatedCredits.usedCredits;

          return await tx.usageTransaction.create({
            data: {
              userId,
              creditId: credits.id,
              type: TransactionType.BONUS,
              amount,
              balance: newBalance,
              description: reason,
            },
          });
        }).then(async (transaction) => {
          // Invalidate cache after successful transaction
          const cacheKey = `credits:${userId}:current`;
          await redis.del(cacheKey);
          return transaction;
        });
      } finally {
        await this.releaseLock(lockKey, lockValue);
      }
    });
  }

  /**
   * Handle credit refunds with atomic transaction and idempotency
   */
  async refundCredits(
    userId: string,
    sessionId: string,
    amount: number,
    reason: string
  ): Promise<UsageTransaction> {
    const idempotencyKey = this.generateIdempotencyKey('refundCredits', [
      userId,
      sessionId,
      amount.toString(),
      reason,
    ]);

    return await this.withIdempotency(idempotencyKey, async () => {
      const lockKey = `credits:refund:${userId}:${sessionId}`;
      const lockValue = await this.acquireLock(lockKey);
      
      if (!lockValue) {
        throw new Error('Unable to acquire refund lock after retries');
      }

      try {
        return await prisma.$transaction(async (tx) => {
          const credits = await tx.usageCredits.findFirst({
            where: {
              userId,
              billingPeriodStart: { lte: new Date() },
              billingPeriodEnd: { gte: new Date() },
            },
            orderBy: { createdAt: 'desc' },
          });

          if (!credits) {
            throw new Error('No active credits found for user');
          }

          // Check for duplicate refund
          const existingRefund = await tx.usageTransaction.findFirst({
            where: {
              userId,
              sessionId,
              type: TransactionType.REFUND,
              description: reason,
            },
          });

          if (existingRefund) {
            return existingRefund; // Return existing refund if found
          }

          // Don't refund for unlimited plans
          if (credits.planType === 'unlimited') {
            return await tx.usageTransaction.create({
              data: {
                userId,
                creditId: credits.id,
                type: TransactionType.REFUND,
                amount: 0,
                balance: -1,
                sessionId,
                description: `Refund not applicable for unlimited plan: ${reason}`,
              },
            });
          }

          const actualRefund = Math.min(amount, credits.usedCredits); // Don't go negative
          
          const updatedCredits = await tx.usageCredits.update({
            where: { id: credits.id },
            data: {
              usedCredits: {
                decrement: actualRefund,
              },
            },
          });

          const totalAvailable = updatedCredits.totalCredits + updatedCredits.bonusCredits;
          const newBalance = totalAvailable - updatedCredits.usedCredits;

          return await tx.usageTransaction.create({
            data: {
              userId,
              creditId: credits.id,
              type: TransactionType.REFUND,
              amount: actualRefund,
              balance: newBalance,
              sessionId,
              description: reason,
            },
          });
        }).then(async (transaction) => {
          // Invalidate cache after successful transaction
          const cacheKey = `credits:${userId}:current`;
          await redis.del(cacheKey);
          return transaction;
        });
      } finally {
        await this.releaseLock(lockKey, lockValue);
      }
    });
  }

  /**
   * Check and send usage alerts
   */
  private async checkAndSendAlerts(
    userId: string,
    credits: UsageCredits,
    currentBalance: number
  ): Promise<void> {
    // Don't send alerts for unlimited plans
    if (credits.planType === 'unlimited') return;

    const percentageUsed = (credits.usedCredits / credits.totalCredits) * 100;

    for (const threshold of this.config.alertThresholds) {
      if (percentageUsed >= threshold) {
        // Check if alert was already sent
        const alertKey = `alert:${userId}:${credits.id}:${threshold}`;
        const alreadySent = await redis.get(alertKey);
        
        if (!alreadySent) {
          await this.sendUsageAlert(userId, threshold, currentBalance);
          
          // Mark as sent (expires at end of billing period)
          const ttl = Math.floor(
            (credits.billingPeriodEnd.getTime() - Date.now()) / 1000
          );
          await redis.set(alertKey, '1', 'EX', ttl);
        }
      }
    }
  }

  /**
   * Send usage alert to user
   */
  private async sendUsageAlert(
    userId: string,
    threshold: number,
    currentBalance: number
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) return;

    let alertType: AlertType;
    let subject: string;
    let message: string;

    if (threshold === 100) {
      alertType = AlertType.CREDITS_EXHAUSTED;
      subject = 'Your therapy credits have been exhausted';
      message = `Your monthly therapy credits have been fully used. Consider upgrading your plan to continue using our services.`;
    } else if (threshold >= 90) {
      alertType = AlertType.LOW_CREDITS;
      subject = `Low credit alert - ${100 - threshold}% remaining`;
      message = `You have ${currentBalance} minutes remaining in your current billing period. Consider upgrading to avoid interruptions.`;
    } else {
      alertType = AlertType.BILLING_REMINDER;
      subject = `Credit usage update - ${threshold}% used`;
      message = `You've used ${threshold}% of your monthly therapy credits. You have ${currentBalance} minutes remaining.`;
    }

    // Save alert to database
    await prisma.usageAlert.create({
      data: {
        userId,
        alertType,
        threshold,
        message,
      },
    });

    // Send email notification
    await sendEmail({
      to: user.email,
      subject,
      html: `
        <h2>Credit Usage Alert</h2>
        <p>Hi ${user.name || 'there'},</p>
        <p>${message}</p>
        <p>View your usage details and upgrade options in your dashboard.</p>
        <br>
        <a href="${process.env.NEXTAUTH_URL}/dashboard/billing">View Billing</a>
      `,
    });
  }

  /**
   * Get usage statistics for a period
   */
  async getUsageStats(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalUsed: number;
    totalRefunded: number;
    totalBonus: number;
    sessionCount: number;
    averageSessionLength: number;
  }> {
    const credits = await this.getCurrentCredits(userId);
    const start = startDate || credits?.billingPeriodStart || new Date(0);
    const end = endDate || credits?.billingPeriodEnd || new Date();

    const transactions = await prisma.usageTransaction.findMany({
      where: {
        userId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const debits = transactions.filter(t => t.type === TransactionType.DEBIT);
    const refunds = transactions.filter(t => t.type === TransactionType.REFUND);
    const bonuses = transactions.filter(t => t.type === TransactionType.BONUS);

    return {
      totalUsed: debits.reduce((sum, t) => sum + t.amount, 0),
      totalRefunded: refunds.reduce((sum, t) => sum + t.amount, 0),
      totalBonus: bonuses.reduce((sum, t) => sum + t.amount, 0),
      sessionCount: debits.length,
      averageSessionLength: debits.length > 0 
        ? debits.reduce((sum, t) => sum + t.amount, 0) / debits.length
        : 0,
    };
  }

  /**
   * Cleanup expired reservations and monitor locks
   */
  async cleanupExpiredReservations(): Promise<void> {
    const lockKey = 'credits:cleanup:global';
    const lockValue = await this.acquireLock(lockKey, 60); // 1 minute cleanup lock
    
    if (!lockValue) {
      console.warn('Cleanup already in progress, skipping');
      return;
    }

    try {
      const keys = await redis.keys('credits:reserved:*');
      const now = Date.now();
      const expired = [];

      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const reservation = JSON.parse(data);
          const age = now - (reservation.timestamp || 0);
          
          // Remove reservations older than 2 hours (double the timeout)
          if (age > 7200000) { // 2 hours in milliseconds
            expired.push(key);
          }
        }
      }

      if (expired.length > 0) {
        await redis.del(...expired);
        console.log(`Cleaned up ${expired.length} expired credit reservations`);
      }
    } finally {
      await this.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * Release specific credit reservation (for session cancellation)
   */
  async releaseReservation(sessionId: string): Promise<boolean> {
    const reservationKey = `credits:reserved:${sessionId}`;
    const data = await redis.get(reservationKey);
    
    if (data) {
      await redis.del(reservationKey);
      console.log(`Released credit reservation for session ${sessionId}`);
      return true;
    }
    
    return false;
  }

  /**
   * Atomic session creation with credit reservation
   */
  async createSessionWithCreditReservation(
    userId: string,
    sessionData: {
      therapyType?: string;
      maxDuration?: number;
      scheduledAt?: Date;
      notes?: string;
    }
  ): Promise<{ 
    session: any; 
    reservation: { success: boolean; reservationId?: string; error?: string } 
  }> {
    const lockKey = `credits:session-create:${userId}`;
    const lockValue = await this.acquireLock(lockKey);
    
    if (!lockValue) {
      throw new Error('Unable to acquire session creation lock after retries');
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // Check credit availability
        const creditCheck = await this.checkCredits(userId, sessionData.maxDuration);
        
        if (!creditCheck.hasCredits) {
          throw new Error(`Insufficient credits: ${creditCheck.remainingCredits} available`);
        }

        // Create session
        const session = await tx.therapySession.create({
          data: {
            userId,
            therapyType: sessionData.therapyType || 'individual',
            maxDuration: Math.min(
              sessionData.maxDuration || creditCheck.maxSessionDuration,
              creditCheck.maxSessionDuration
            ),
            status: SessionStatus.SCHEDULED,
            scheduledAt: sessionData.scheduledAt || new Date(),
            notes: sessionData.notes || '',
            creditsReserved: creditCheck.isUnlimited ? 0 : sessionData.maxDuration || creditCheck.maxSessionDuration,
          },
        });

        // Reserve credits outside the DB transaction but within our application lock
        const reservation = await this.reserveCredits(
          userId,
          session.id,
          session.creditsReserved || session.maxDuration
        );

        if (!reservation.success) {
          throw new Error(`Credit reservation failed: ${reservation.error}`);
        }

        return { session, reservation };
      });
    } finally {
      await this.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * Get active reservations for monitoring
   */
  async getActiveReservations(userId?: string): Promise<Array<{
    sessionId: string;
    userId: string;
    minutes: number;
    timestamp: number;
    isUnlimited: boolean;
  }>> {
    const pattern = userId ? `credits:reserved:*` : 'credits:reserved:*';
    const keys = await redis.keys(pattern);
    const reservations = [];

    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        const reservation = JSON.parse(data);
        if (!userId || reservation.userId === userId) {
          reservations.push({
            sessionId: reservation.sessionId,
            userId: reservation.userId,
            minutes: reservation.minutes,
            timestamp: reservation.timestamp,
            isUnlimited: reservation.isUnlimited || false,
          });
        }
      }
    }

    return reservations.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Reset credits for new billing period with improved error handling
   */
  async resetBillingPeriod(
    userId: string,
    newPlanType: keyof typeof config.plans,
    billingStart: Date,
    billingEnd: Date,
    subscriptionId?: string
  ): Promise<UsageCredits> {
    const lockKey = `credits:reset:${userId}`;
    const lockValue = await this.acquireLock(lockKey);
    
    if (!lockValue) {
      throw new Error('Unable to acquire reset lock after retries');
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // Mark old credits as expired
        await tx.usageCredits.updateMany({
          where: {
            userId,
            billingPeriodEnd: { lt: billingStart },
          },
          data: {
            updatedAt: new Date(),
          },
        });

        // Create new billing period
        return await tx.usageCredits.create({
          data: {
            userId,
            totalCredits: this.config.plans[newPlanType].credits,
            usedCredits: 0,
            bonusCredits: 0,
            billingPeriodStart: billingStart,
            billingPeriodEnd: billingEnd,
            planType: newPlanType,
            subscriptionId,
          },
        });
      }).then(async (newCredits) => {
        // Invalidate cache after successful reset
        const cacheKey = `credits:${userId}:current`;
        await redis.del(cacheKey);
        return newCredits;
      });
    } finally {
      await this.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * Rollback failed transaction with compensation
   */
  async rollbackTransaction(
    userId: string,
    sessionId: string,
    transactionType: 'debit' | 'reservation' | 'upgrade',
    reason: string
  ): Promise<void> {
    const lockKey = `credits:rollback:${userId}:${sessionId}`;
    const lockValue = await this.acquireLock(lockKey);
    
    if (!lockValue) {
      console.error(`Unable to acquire rollback lock for ${sessionId}`);
      return;
    }

    try {
      await prisma.$transaction(async (tx) => {
        switch (transactionType) {
          case 'debit':
            // Find the original debit transaction
            const debitTransaction = await tx.usageTransaction.findFirst({
              where: {
                userId,
                sessionId,
                type: TransactionType.DEBIT,
              },
              orderBy: { createdAt: 'desc' },
            });

            if (debitTransaction) {
              // Create compensating refund
              await this.refundCredits(userId, sessionId, debitTransaction.amount, 
                `Rollback: ${reason}`);
            }
            break;

          case 'reservation':
            // Release reservation
            await this.releaseReservation(sessionId);
            break;

          case 'upgrade':
            // More complex rollback - would need original plan info
            console.warn(`Upgrade rollback not fully implemented for session ${sessionId}`);
            break;
        }

        // Log rollback event
        await tx.usageTransaction.create({
          data: {
            userId,
            creditId: 'rollback', // Special marker for rollback transactions
            type: TransactionType.REFUND,
            amount: 0,
            balance: -999, // Special marker for rollback
            sessionId,
            description: `Transaction rollback: ${transactionType} - ${reason}`,
            metadata: {
              rollbackType: transactionType,
              originalReason: reason,
              timestamp: new Date().toISOString(),
            },
          },
        });
      });

      // Invalidate relevant caches
      await Promise.all([
        redis.del(`credits:${userId}:current`),
        redis.del(`session:config:${sessionId}`),
      ]);

      console.log(`Successfully rolled back ${transactionType} for session ${sessionId}`);
    } catch (error) {
      console.error(`Rollback failed for session ${sessionId}:`, error);
    } finally {
      await this.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * Health check for credit system integrity
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      redisConnected: boolean;
      prismaConnected: boolean;
      activeReservations: number;
      staleLocks: number;
      avgLockAcquisitionTime?: number;
    };
  }> {
    const startTime = Date.now();
    const details = {
      redisConnected: false,
      prismaConnected: false,
      activeReservations: 0,
      staleLocks: 0,
      avgLockAcquisitionTime: 0,
    };

    try {
      // Test Redis connectivity
      await redis.ping();
      details.redisConnected = true;

      // Test Prisma connectivity
      await prisma.$queryRaw`SELECT 1`;
      details.prismaConnected = true;

      // Count active reservations
      const reservations = await this.getActiveReservations();
      details.activeReservations = reservations.length;

      // Check for stale locks (older than 2x timeout)
      const lockKeys = await redis.keys('credits:*:lock:*');
      const staleThreshold = Date.now() - (this.LOCK_TIMEOUT_SECONDS * 2 * 1000);
      let staleLocks = 0;

      for (const key of lockKeys) {
        const ttl = await redis.ttl(key);
        if (ttl > 0 && ttl < this.LOCK_TIMEOUT_SECONDS / 2) {
          staleLocks++;
        }
      }
      details.staleLocks = staleLocks;

      // Test lock acquisition time
      const testLockKey = `credits:health-test:${Date.now()}`;
      const lockStart = Date.now();
      const testLockValue = await this.acquireLock(testLockKey, 5);
      const lockTime = Date.now() - lockStart;
      
      if (testLockValue) {
        await this.releaseLock(testLockKey, testLockValue);
        details.avgLockAcquisitionTime = lockTime;
      }

      // Determine overall health
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (!details.redisConnected || !details.prismaConnected) {
        status = 'unhealthy';
      } else if (details.staleLocks > 5 || lockTime > 1000) {
        status = 'degraded';
      }

      return { status, details };
    } catch (error) {
      console.error('Credit system health check failed:', error);
      return {
        status: 'unhealthy',
        details: {
          ...details,
          error: error.message,
        } as any,
      };
    }
  }

  /**
   * Downgrade user to free tier with proper cleanup
   */
  async downgradeToFree(userId: string): Promise<UsageCredits> {
    const lockKey = `credits:downgrade:${userId}`;
    const lockValue = await this.acquireLock(lockKey);
    
    if (!lockValue) {
      throw new Error('Unable to acquire downgrade lock after retries');
    }

    try {
      // Cancel any active reservations
      const activeReservations = await this.getActiveReservations(userId);
      for (const reservation of activeReservations) {
        await this.releaseReservation(reservation.sessionId);
      }

      const now = new Date();
      const billingEnd = new Date(now);
      billingEnd.setMonth(billingEnd.getMonth() + 1);

      return await this.initializeBillingPeriod(
        userId,
        'free',
        now,
        billingEnd
      );
    } finally {
      await this.releaseLock(lockKey, lockValue);
    }
  }
}

// Export singleton instance
export const creditManager = new CreditManager();