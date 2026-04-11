import { prisma } from '../src/lib/prisma-optimized';

async function verifyCredits() {
  try {
    console.log('🔍 Verifying credit allocation for all users...\n');
    
    // Get all users with their credits
    const users = await prisma.user.findMany({
      include: {
        usageCredits: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    
    console.log(`Found ${users.length} total users\n`);
    
    for (const user of users) {
      const credits = user.usageCredits[0];
      
      console.log(`📧 ${user.email}`);
      console.log(`   Subscription: ${user.subscriptionStatus || 'null'}`);
      
      if (credits) {
        console.log(`   ✅ Credits: ${credits.totalCredits} total, ${credits.usedCredits} used, ${credits.totalCredits - credits.usedCredits} remaining`);
        console.log(`   📅 Plan: ${credits.planType}`);
        console.log(`   📅 Period: ${credits.billingPeriodStart.toISOString().split('T')[0]} → ${credits.billingPeriodEnd.toISOString().split('T')[0]}`);
        
        // Verify free tier has exactly 30 credits
        if (credits.planType === 'free' && credits.totalCredits !== 30) {
          console.log(`   ⚠️  ISSUE: Free tier should have 30 credits, but has ${credits.totalCredits}`);
        }
      } else {
        console.log(`   ❌ NO CREDITS FOUND`);
      }
      console.log('');
    }
    
    // Check edge cases
    const now = new Date();
    const expiredCredits = await prisma.usageCredits.count({
      where: {
        billingPeriodEnd: { lt: now },
        planType: 'free'
      }
    });
    
    const activeCredits = await prisma.usageCredits.count({
      where: {
        billingPeriodStart: { lte: now },
        billingPeriodEnd: { gte: now },
        planType: 'free'
      }
    });
    
    console.log('📊 SUMMARY:');
    console.log(`   Active free tier credits: ${activeCredits}`);
    console.log(`   Expired free tier credits: ${expiredCredits}`);
    
    if (expiredCredits > 0) {
      console.log('   ⚠️  Some free tier credits have expired and may need reset');
    }
    
  } catch (error) {
    console.error('Error verifying credits:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCredits();