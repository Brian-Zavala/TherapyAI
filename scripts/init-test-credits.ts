import { prisma } from '../src/lib/prisma';
import { creditManager } from '../src/lib/services/credit-manager.service';

async function initTestCredits() {
  try {
    console.log('Initializing test credits for all users...');
    
    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true, email: true }
    });
    
    console.log(`Found ${users.length} users`);
    
    for (const user of users) {
      console.log(`Checking credits for user: ${user.email}`);
      
      // Check if user already has credits
      const existingCredits = await creditManager.getCurrentCredits(user.id);
      
      if (!existingCredits) {
        console.log(`  No credits found, initializing free tier...`);
        
        // Initialize with free tier
        const billingStart = new Date();
        const billingEnd = new Date();
        billingEnd.setMonth(billingEnd.getMonth() + 1);
        
        await creditManager.initializeCredits(
          user.id,
          'free',
          billingStart,
          billingEnd
        );
        
        console.log(`  ✓ Initialized free tier credits for ${user.email}`);
      } else {
        console.log(`  ✓ User already has credits: ${existingCredits.totalCredits} total, ${existingCredits.usedCredits} used`);
      }
    }
    
    console.log('✅ Credit initialization complete!');
  } catch (error) {
    console.error('Error initializing credits:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initTestCredits();