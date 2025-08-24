import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { creditManager } from '@/lib/services/credit-manager.service';
import { prisma } from '@/lib/database/prisma-optimized';

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current credit details first
    let currentCredits = await creditManager.getCurrentCredits(session.user.id);
    
    // If user has no credits, initialize free tier (fallback safety net)
    if (!currentCredits) {
      console.log(`⚠️  User ${session.user.id} has no credits, initializing free tier as fallback`);
      
      // Check if user should have free tier
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { subscriptionStatus: true, email: true }
      });
      
      if (!user?.subscriptionStatus || user.subscriptionStatus === 'free') {
        const billingStart = new Date();
        const billingEnd = new Date();
        billingEnd.setMonth(billingEnd.getMonth() + 1);
        
        await creditManager.initializeBillingPeriod(
          session.user.id,
          'free',
          billingStart,
          billingEnd
        );
        
        console.log(`✓ Emergency initialized free tier for user: ${user?.email}`);
        
        // Get the newly created credits
        currentCredits = await creditManager.getCurrentCredits(session.user.id);
      }
    }
    
    // Get credit status from credit manager
    const creditStatus = await creditManager.checkCredits(session.user.id);
    
    // Calculate credits for each duration
    const durations = [15, 20, 25, 30, 60];
    const durationStatus = durations.map(duration => {
      const hasCredits = creditStatus.remainingCredits >= duration || creditStatus.isUnlimited;
      return {
        duration,
        canAfford: hasCredits,
        creditsRequired: duration,
        creditsAfterSession: Math.max(0, creditStatus.remainingCredits - duration)
      };
    });

    return NextResponse.json({
      success: true,
      credits: {
        total: currentCredits?.totalCredits || 0,
        used: currentCredits?.usedCredits || 0,
        remaining: creditStatus.remainingCredits,
        bonus: currentCredits?.bonusCredits || 0,
        isUnlimited: creditStatus.isUnlimited,
        planType: creditStatus.planType,
        maxSessionDuration: creditStatus.maxSessionDuration,
      },
      durationStatus,
      // For UI display
      displayText: creditStatus.isUnlimited 
        ? 'Unlimited' 
        : `${creditStatus.remainingCredits} minutes remaining`,
      lowCreditWarning: !creditStatus.isUnlimited && creditStatus.remainingCredits < 30,
      noCreditWarning: !creditStatus.isUnlimited && creditStatus.remainingCredits < 15,
    });
  } catch (error) {
    console.error('Error fetching user credits:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch credit status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}