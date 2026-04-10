import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-optimized';
import { creditManager } from '@/lib/services/credit-manager.service';
import { redis } from '@/lib/cache/redis-client';

// Admin endpoint to sync user credits with their subscription status
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication (you may want to add proper admin role checking)
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { userId, forceSync } = await request.json();
    
    // Get user with subscription details
    const user = await prisma.user.findUnique({
      where: { id: userId || session.user.id },
      select: {
        id: true,
        email: true,
        subscriptionStatus: true,
        subscriptionId: true,
        stripeCustomerId: true,
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Determine plan type based on subscription status
    let planType: 'free' | 'essential' | 'growth' | 'unlimited' = 'free';
    
    if (user.subscriptionStatus === 'active' && user.subscriptionId) {
      // Check if subscription ID contains plan hints
      const subId = user.subscriptionId.toLowerCase();
      if (subId.includes('unlimited')) {
        planType = 'unlimited';
      } else if (subId.includes('growth')) {
        planType = 'growth';
      } else if (subId.includes('essential')) {
        planType = 'essential';
      } else {
        // Default to essential for active subscriptions
        planType = 'essential';
      }
    }
    
    console.log(`[Credit Sync] User ${user.email}: ${user.subscriptionStatus} → ${planType}`);
    
    // Get current credits
    const now = new Date();
    const existingCredits = await prisma.usageCredits.findFirst({
      where: {
        userId: user.id,
        billingPeriodStart: { lte: now },
        billingPeriodEnd: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Check if credits need updating
    if (existingCredits && existingCredits.planType === planType && !forceSync) {
      return NextResponse.json({
        message: 'Credits already synced',
        credits: {
          planType: existingCredits.planType,
          totalCredits: existingCredits.totalCredits,
          usedCredits: existingCredits.usedCredits,
          available: existingCredits.totalCredits + existingCredits.bonusCredits - existingCredits.usedCredits,
        }
      });
    }
    
    // Calculate billing period (monthly)
    const billingStart = new Date(now);
    billingStart.setHours(0, 0, 0, 0);
    billingStart.setDate(1); // Start of current month
    
    const billingEnd = new Date(billingStart);
    billingEnd.setMonth(billingEnd.getMonth() + 1);
    billingEnd.setDate(0); // Last day of current month
    billingEnd.setHours(23, 59, 59, 999);
    
    // Update or create credits
    const credits = await creditManager.initializeBillingPeriodWithNotification(
      user.id,
      planType as 'free' | 'pro',
      billingStart,
      billingEnd,
      user.subscriptionId || undefined
    );
    
    // Clear cache to force UI refresh
    await redis.del(`credits:${user.id}:current`);
    
    // Broadcast update event
    await redis.publish(`credits:updates:${user.id}`, JSON.stringify({
      type: 'manual_sync',
      userId: user.id,
      timestamp: new Date().toISOString()
    }));
    
    return NextResponse.json({
      success: true,
      message: `Credits synced to ${planType} plan`,
      credits: {
        planType: credits.planType,
        totalCredits: credits.totalCredits,
        usedCredits: credits.usedCredits,
        available: credits.totalCredits + credits.bonusCredits - credits.usedCredits,
        billingPeriodStart: credits.billingPeriodStart,
        billingPeriodEnd: credits.billingPeriodEnd,
      }
    });
    
  } catch (error: any) {
    console.error('[Credit Sync] Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync credits', details: error.message },
      { status: 500 }
    );
  }
}