import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database/prisma-optimized';
import { creditManager } from '@/lib/services/credit-manager.service';
import { redis } from '@/lib/cache/redis-client';

// Admin endpoint to sync user credits with their subscription status
export async function POST(request: NextRequest) {
  try {
    // CRITICAL FIX: Proper admin role validation
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // SECURITY: Enforce admin role requirement for credit sync operations
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, email: true }
    });
    
    if (!user || user.role !== 'admin') {
      logger.error('Non-admin attempted to access admin sync-credits endpoint', {
        userId: session.user.id,
        userEmail: user?.email,
        userRole: user?.role,
        severity: 'SECURITY_VIOLATION'
      });
      
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    const { userId, forceSync } = await request.json();
    
    // Get target user with subscription details
    const targetUser = await prisma.user.findUnique({
      where: { id: userId || session.user.id },
      select: {
        id: true,
        email: true,
        subscriptionStatus: true,
        subscriptionId: true,
        stripeCustomerId: true,
      }
    });
    
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Determine plan type based on subscription status
    let planType: 'free' | 'essential' | 'growth' | 'unlimited' = 'free';
    
    if (targetUser.subscriptionStatus === 'active' && targetUser.subscriptionId) {
      // Check if subscription ID contains plan hints
      const subId = targetUser.subscriptionId.toLowerCase();
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
    
    console.log(`[Credit Sync] User ${targetUser.email}: ${targetUser.subscriptionStatus} → ${planType}`);
    
    // Get current credits
    const now = new Date();
    const existingCredits = await prisma.usageCredits.findFirst({
      where: {
        userId: targetUser.id,
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
      targetUser.id,
      planType,
      billingStart,
      billingEnd,
      targetUser.subscriptionId || undefined
    );
    
    // Clear cache to force UI refresh
    await redis.del(`credits:${targetUser.id}:current`);
    
    // Broadcast update event
    await redis.publish(`credits:updates:${targetUser.id}`, JSON.stringify({
      type: 'manual_sync',
      userId: targetUser.id,
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