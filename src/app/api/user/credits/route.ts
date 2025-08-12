import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { creditManager } from '@/lib/services/credit-manager.service';

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

    // Get credit status from credit manager
    const creditStatus = await creditManager.checkCredits(session.user.id);
    
    // Get current credit details
    const currentCredits = await creditManager.getCurrentCredits(session.user.id);
    
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