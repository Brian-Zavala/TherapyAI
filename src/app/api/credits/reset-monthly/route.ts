import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma-optimized';
import { creditManager } from '@/lib/services/credit-manager.service';

export async function POST(request: NextRequest) {
  try {
    // Verify this is called from a cron job or internal service
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || process.env.INTERNAL_API_KEY;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron token' },
        { status: 401 }
      );
    }

    console.log('🔄 Starting monthly credit reset for free tier users...');

    const now = new Date();
    
    // Find all users with free tier credits that need resetting (billing period ended)
    const expiredCredits = await prisma.usageCredits.findMany({
      where: {
        planType: 'free',
        billingPeriodEnd: {
          lte: now
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            subscriptionStatus: true
          }
        }
      }
    });

    console.log(`Found ${expiredCredits.length} free tier users needing credit reset`);

    let successCount = 0;
    let errorCount = 0;

    for (const credits of expiredCredits) {
      try {
        // Only reset for users who are still on free tier (no active subscription)
        if (credits.user.subscriptionStatus === 'free' || !credits.user.subscriptionStatus) {
          const newBillingStart = new Date(credits.billingPeriodEnd);
          const newBillingEnd = new Date(newBillingStart);
          newBillingEnd.setMonth(newBillingEnd.getMonth() + 1);

          await creditManager.resetBillingPeriod(
            credits.user.id,
            'free',
            newBillingStart,
            newBillingEnd
          );

          console.log(`✓ Reset credits for free user: ${credits.user.email}`);
          successCount++;
        } else {
          console.log(`⏭️  Skipping user with active subscription: ${credits.user.email} (${credits.user.subscriptionStatus})`);
        }
      } catch (error) {
        console.error(`❌ Failed to reset credits for user ${credits.user.email}:`, error);
        errorCount++;
      }
    }

    // Also check for users who have no credits at all (edge case)
    const usersWithoutCredits = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { subscriptionStatus: 'free' },
              { subscriptionStatus: null }
            ]
          },
          {
            usageCredits: {
              none: {}
            }
          }
        ]
      },
      select: {
        id: true,
        email: true,
        createdAt: true
      }
    });

    console.log(`Found ${usersWithoutCredits.length} users without any credits`);

    for (const user of usersWithoutCredits) {
      try {
        const billingStart = new Date();
        const billingEnd = new Date();
        billingEnd.setMonth(billingEnd.getMonth() + 1);

        await creditManager.initializeBillingPeriod(
          user.id,
          'free',
          billingStart,
          billingEnd
        );

        console.log(`✓ Initialized credits for user without credits: ${user.email}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to initialize credits for user ${user.email}:`, error);
        errorCount++;
      }
    }

    const summary = {
      totalProcessed: expiredCredits.length + usersWithoutCredits.length,
      successful: successCount,
      errors: errorCount,
      timestamp: now.toISOString()
    };

    console.log('🎉 Monthly credit reset completed:', summary);

    return NextResponse.json({
      success: true,
      message: 'Monthly credit reset completed',
      ...summary
    });

  } catch (error) {
    console.error('❌ Monthly credit reset failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reset monthly credits',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also support GET for health checks
export async function GET() {
  return NextResponse.json({
    message: 'Monthly credit reset endpoint is healthy',
    timestamp: new Date().toISOString()
  });
}