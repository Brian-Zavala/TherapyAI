import { prisma } from '@/lib/prisma-client';
import { UsageCredits, UsageTransaction, TransactionType, AlertType } from '@prisma/client';
import { sendEmail } from '@/lib/email';
import { redis } from '@/lib/cache/redis-client';

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

  constructor(customConfig?: Partial<CreditManagerConfig>) {
    this.config = { ...config, ...customConfig };
  }

  /**
   * Initialize credits for a new billing period
   */
  async initializeBillingPeriod(
    userId: string,
    planType: keyof typeof config.plans,
    billingStart: Date,
    billingEnd: Date,
    subscriptionId?: string
  ): Promise<UsageCredits> {
    const credits = this.config.plans[planType].credits;

    // Check if credits already exist for this billing period
    const existingCredits = await prisma.usageCredits.findFirst({
      where: {
        userId,
        billingPeriodStart: billingStart,
        billingPeriodEnd: billingEnd,
      },
    });

    if (existingCredits) {
      // Update existing credits if plan changed
      return await prisma.usageCredits.update({
        where: { id: existingCredits.id },
        data: {
          totalCredits: credits,
          planType,
          subscriptionId,
        },
      });
    }

    // Create new credits for billing period
    return await prisma.usageCredits.create({
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
  }

  /**
   * Handle subscription upgrade - preserves existing credits and adds new tier credits
   */
  async handleSubscriptionUpgrade(
    userId: string,
    newPlanType: keyof typeof config.plans,
    oldPlanType: keyof typeof config.plans,
    billingStart: Date,
    billingEnd: Date,
    subscriptionId?: string
  ): Promise<UsageCredits> {
    const newPlanCredits = this.config.plans[newPlanType].credits;
    const oldPlanCredits = this.config.plans[oldPlanType].credits;
    
    // Calculate additional credits from upgrade
    const additionalCredits = Math.max(0, newPlanCredits - oldPlanCredits);
    
    // Get current credits
    const currentCredits = await this.getCurrentCredits(userId);
    
    if (currentCredits) {
      // Calculate remaining credits
      const remainingCredits = currentCredits.totalCredits + currentCredits.bonusCredits - currentCredits.usedCredits;
      
      // Update with new plan and add upgrade bonus
      return await prisma.usageCredits.update({
        where: { id: currentCredits.id },
        data: {
          totalCredits: newPlanCredits,
          bonusCredits: currentCredits.bonusCredits + additionalCredits, // Add upgrade bonus to existing bonus
          planType: newPlanType,
          subscriptionId,
        },
      });
    }
    
    // If no current credits, initialize with new plan
    return this.initializeBillingPeriod(userId, newPlanType, billingStart, billingEnd, subscriptionId);
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
   * Reserve credits for a session (prevents race conditions)
   */
  async reserveCredits(
    userId: string,
    sessionId: string,
    minutes: number
  ): Promise<boolean> {
    const lockKey = `credits:lock:${userId}`;
    const acquired = await redis.set(lockKey, '1', 'EX', 10, 'NX');
    
    if (!acquired) {
      // Another operation in progress
      return false;
    }

    try {
      const credits = await this.getCurrentCredits(userId);
      if (!credits) return false;

      const planType = credits.planType as keyof typeof config.plans;
      if (planType === 'unlimited') return true;

      const totalAvailable = credits.totalCredits + credits.bonusCredits;
      const remaining = totalAvailable - credits.usedCredits;

      if (remaining < minutes) {
        return false;
      }

      // Reserve credits in Redis for 1 hour (session timeout)
      const reservationKey = `credits:reserved:${sessionId}`;
      await redis.set(
        reservationKey,
        JSON.stringify({ userId, minutes, creditId: credits.id }),
        'EX',
        3600
      );

      return true;
    } finally {
      await redis.del(lockKey);
    }
  }

  /**
   * Deduct credits after session completion
   */
  async deductCredits(
    userId: string,
    sessionId: string,
    vapiCallId: string,
    minutesUsed: number,
    metadata?: Record<string, any>
  ): Promise<UsageTransaction> {
    const credits = await this.getCurrentCredits(userId);
    
    if (!credits) {
      throw new Error('No active credits found for user');
    }

    // Remove reservation if exists
    const reservationKey = `credits:reserved:${sessionId}`;
    await redis.del(reservationKey);

    // Calculate actual deduction (round up to nearest minute)
    const actualMinutes = Math.ceil(minutesUsed);

    // For unlimited plans, just track usage without deducting
    if (credits.planType === 'unlimited') {
      return await prisma.usageTransaction.create({
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

    // Update credits with atomic operation
    const updatedCredits = await prisma.usageCredits.update({
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
    const transaction = await prisma.usageTransaction.create({
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

    // Invalidate cache
    const cacheKey = `credits:${userId}:current`;
    await redis.del(cacheKey);

    // Check for alerts
    await this.checkAndSendAlerts(userId, updatedCredits, newBalance);

    return transaction;
  }

  /**
   * Add bonus credits to user account
   */
  async addBonusCredits(
    userId: string,
    amount: number,
    reason: string
  ): Promise<UsageTransaction> {
    const credits = await this.getCurrentCredits(userId);
    
    if (!credits) {
      throw new Error('No active credits found for user');
    }

    const updatedCredits = await prisma.usageCredits.update({
      where: { id: credits.id },
      data: {
        bonusCredits: {
          increment: amount,
        },
      },
    });

    const totalAvailable = updatedCredits.totalCredits + updatedCredits.bonusCredits;
    const newBalance = totalAvailable - updatedCredits.usedCredits;

    // Invalidate cache
    const cacheKey = `credits:${userId}:current`;
    await redis.del(cacheKey);

    return await prisma.usageTransaction.create({
      data: {
        userId,
        creditId: credits.id,
        type: TransactionType.BONUS,
        amount,
        balance: newBalance,
        description: reason,
      },
    });
  }

  /**
   * Handle credit refunds (e.g., for technical issues)
   */
  async refundCredits(
    userId: string,
    sessionId: string,
    amount: number,
    reason: string
  ): Promise<UsageTransaction> {
    const credits = await this.getCurrentCredits(userId);
    
    if (!credits) {
      throw new Error('No active credits found for user');
    }

    // Don't refund for unlimited plans
    if (credits.planType === 'unlimited') {
      return await prisma.usageTransaction.create({
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

    const updatedCredits = await prisma.usageCredits.update({
      where: { id: credits.id },
      data: {
        usedCredits: {
          decrement: Math.min(amount, credits.usedCredits), // Don't go negative
        },
      },
    });

    const totalAvailable = updatedCredits.totalCredits + updatedCredits.bonusCredits;
    const newBalance = totalAvailable - updatedCredits.usedCredits;

    // Invalidate cache
    const cacheKey = `credits:${userId}:current`;
    await redis.del(cacheKey);

    return await prisma.usageTransaction.create({
      data: {
        userId,
        creditId: credits.id,
        type: TransactionType.REFUND,
        amount,
        balance: newBalance,
        sessionId,
        description: reason,
      },
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
   * Reset credits for new billing period
   */
  async resetBillingPeriod(
    userId: string,
    newPlanType: keyof typeof config.plans,
    billingStart: Date,
    billingEnd: Date,
    subscriptionId?: string
  ): Promise<UsageCredits> {
    // Mark old credits as expired
    await prisma.usageCredits.updateMany({
      where: {
        userId,
        billingPeriodEnd: { lt: billingStart },
      },
      data: {
        updatedAt: new Date(),
      },
    });

    // Create new billing period
    return await this.initializeBillingPeriod(
      userId,
      newPlanType,
      billingStart,
      billingEnd,
      subscriptionId
    );
  }

  /**
   * Downgrade user to free tier
   */
  async downgradeToFree(userId: string): Promise<UsageCredits> {
    const now = new Date();
    const billingEnd = new Date(now);
    billingEnd.setMonth(billingEnd.getMonth() + 1);

    return await this.initializeBillingPeriod(
      userId,
      'free',
      now,
      billingEnd
    );
  }
}

// Export singleton instance
export const creditManager = new CreditManager();