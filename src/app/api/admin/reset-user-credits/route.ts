import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-optimized';
import { creditManager } from '@/lib/services/credit-manager.service';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET || process.env.INTERNAL_API_KEY;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { userId, email, reason } = await request.json();

    if (!userId && !email) {
      return NextResponse.json(
        { error: 'Provide userId or email' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: userId ? { id: userId } : { email },
      select: { id: true, email: true, subscriptionStatus: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const credits = await creditManager.resetUserCredits(
      user.id,
      reason || 'Manual admin reset'
    );

    console.log(`[Reset User Credits] ${user.email} — reset to 0 used (${reason || 'no reason given'})`);

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
      credits: {
        planType: credits.planType,
        totalCredits: credits.totalCredits,
        bonusCredits: credits.bonusCredits,
        usedCredits: credits.usedCredits,
        available: credits.totalCredits + credits.bonusCredits - credits.usedCredits,
        billingPeriodEnd: credits.billingPeriodEnd,
      },
    });
  } catch (error: any) {
    console.error('[Reset User Credits] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset credits' },
      { status: 500 }
    );
  }
}
