import { prisma } from '../src/lib/prisma';
import { creditManager } from '../src/lib/services/credit-manager.service';

async function fixUserCredits() {
  const userEmail = 'brian.zavala2025@gmail.com';
  
  try {
    // Get user details
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        email: true,
        subscriptionStatus: true,
        subscriptionId: true,
        stripeCustomerId: true,
      }
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('User found:', user);
    
    // Determine plan type based on subscription ID or status
    let planType: 'free' | 'essential' | 'growth' | 'unlimited' = 'free';
    
    if (user.subscriptionStatus === 'active' && user.subscriptionId) {
      // For testing, let's set this to 'essential' since user has active subscription
      // In production, this would be determined from Stripe
      planType = 'essential';
      console.log(`\nSetting plan type to: ${planType}`);
    }
    
    // Calculate billing period (monthly)
    const now = new Date();
    const billingStart = new Date(now);
    billingStart.setHours(0, 0, 0, 0);
    billingStart.setDate(1); // Start of current month
    
    const billingEnd = new Date(billingStart);
    billingEnd.setMonth(billingEnd.getMonth() + 1);
    billingEnd.setDate(0); // Last day of current month
    billingEnd.setHours(23, 59, 59, 999);
    
    console.log('\nBilling Period:', {
      start: billingStart,
      end: billingEnd
    });
    
    // Delete existing free tier credits
    const deleted = await prisma.usageCredits.deleteMany({
      where: { 
        userId: user.id,
        planType: 'free'
      }
    });
    
    console.log(`\nDeleted ${deleted.count} free tier credit records`);
    
    // Initialize credits for the correct plan
    const credits = await creditManager.initializeBillingPeriodWithNotification(
      user.id,
      planType,
      billingStart,
      billingEnd,
      user.subscriptionId || undefined
    );
    
    console.log('\nNew credits initialized:', {
      id: credits.id,
      planType: credits.planType,
      totalCredits: credits.totalCredits,
      usedCredits: credits.usedCredits,
      bonusCredits: credits.bonusCredits,
      billingPeriodStart: credits.billingPeriodStart,
      billingPeriodEnd: credits.billingPeriodEnd,
      subscriptionId: credits.subscriptionId,
    });
    
    // Clear cache to force refresh
    const { redis } = await import('../src/lib/cache/redis-client');
    await redis.del(`credits:${user.id}:current`);
    console.log('\nCache cleared for user');
    
    // Trigger a window event for frontend update
    console.log('\nCredits fixed successfully! The UI should update shortly.');
    
  } catch (error) {
    console.error('Error fixing credits:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserCredits();