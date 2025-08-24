import { prisma } from '../src/lib/prisma';

async function checkUserCredits() {
  const userEmail = 'brian.zavala2025@gmail.com';
  
  try {
    // Check user subscription status
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
    
    console.log('User:', user);
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    // Check current credits
    const now = new Date();
    const credits = await prisma.usageCredits.findFirst({
      where: {
        userId: user.id,
        billingPeriodStart: { lte: now },
        billingPeriodEnd: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    console.log('\nCurrent Credits:', credits);
    
    // Check all credits for this user
    const allCredits = await prisma.usageCredits.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    
    console.log('\nAll Credits Records:', allCredits.length);
    allCredits.forEach((credit, index) => {
      console.log(`\nRecord ${index + 1}:`, {
        id: credit.id,
        planType: credit.planType,
        totalCredits: credit.totalCredits,
        usedCredits: credit.usedCredits,
        bonusCredits: credit.bonusCredits,
        billingPeriodStart: credit.billingPeriodStart,
        billingPeriodEnd: credit.billingPeriodEnd,
        subscriptionId: credit.subscriptionId,
        createdAt: credit.createdAt,
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserCredits();