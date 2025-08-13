import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { creditManager } from '@/lib/services/credit-manager.service';
import { vapiSessionManager } from '@/lib/services/vapi-session-manager';
import { prisma } from '@/lib/prisma';

// GET /api/credits - Get current credit balance and usage
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get current credits
    const creditStatus = await creditManager.checkCredits(session.user.id);
    
    // Get current billing period
    const currentCredits = await creditManager.getCurrentCredits(session.user.id);
    
    // Get usage statistics
    const usageStats = await creditManager.getUsageStats(session.user.id);
    
    // Get session statistics
    const sessionStats = await vapiSessionManager.getSessionStats(session.user.id);
    
    // Calculate percentage used
    let percentageUsed = 0;
    if (currentCredits && currentCredits.totalCredits > 0) {
      percentageUsed = Math.round((currentCredits.usedCredits / currentCredits.totalCredits) * 100);
    }
    
    return NextResponse.json({
      credits: {
        available: creditStatus.remainingCredits,
        total: currentCredits?.totalCredits || 0,
        used: currentCredits?.usedCredits || 0,
        bonus: currentCredits?.bonusCredits || 0,
        isUnlimited: creditStatus.isUnlimited,
        percentageUsed,
        planType: creditStatus.planType,
        maxSessionDuration: creditStatus.maxSessionDuration,
      },
      billing: {
        periodStart: currentCredits?.billingPeriodStart || null,
        periodEnd: currentCredits?.billingPeriodEnd || null,
        daysRemaining: currentCredits?.billingPeriodEnd 
          ? Math.ceil((new Date(currentCredits.billingPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
      },
      usage: {
        totalMinutesUsed: usageStats.totalUsed,
        totalMinutesRefunded: usageStats.totalRefunded,
        totalBonusMinutes: usageStats.totalBonus,
        sessionCount: usageStats.sessionCount,
        averageSessionLength: Math.round(usageStats.averageSessionLength),
      },
      sessions: sessionStats,
    });
  } catch (error) {
    console.error('[Credits API] Error fetching credits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit information' },
      { status: 500 }
    );
  }
}

// POST /api/credits/purchase - Purchase additional credits (one-time)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { amount } = await request.json();
    
    if (!amount || amount < 10 || amount > 1000) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be between 10 and 1000 minutes.' },
        { status: 400 }
      );
    }
    
    // TODO: Create Stripe checkout session for one-time credit purchase
    // Price: $0.15 per minute
    const priceInCents = Math.round(amount * 15); // $0.15 per minute
    
    return NextResponse.json({
      message: 'Credit purchase endpoint - Coming soon',
      amount,
      price: priceInCents / 100,
    });
  } catch (error) {
    console.error('[Credits API] Error purchasing credits:', error);
    return NextResponse.json(
      { error: 'Failed to process credit purchase' },
      { status: 500 }
    );
  }
}

// GET /api/credits/usage - Get detailed usage history
export async function GET_USAGE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Get usage transactions
    const transactions = await prisma.usageTransaction.findMany({
      where: {
        userId: session.user.id,
        ...(startDate && endDate && {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      },
      include: {
        session: {
          select: {
            id: true,
            therapyType: true,
            sessionDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    
    // Get usage alerts
    const alerts = await prisma.usageAlert.findMany({
      where: {
        userId: session.user.id,
        acknowledged: false,
      },
      orderBy: { sentAt: 'desc' },
      take: 5,
    });
    
    return NextResponse.json({
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        balance: t.balance,
        description: t.description,
        sessionId: t.sessionId,
        therapyType: t.session?.therapyType,
        date: t.createdAt,
      })),
      alerts: alerts.map(a => ({
        id: a.id,
        type: a.alertType,
        message: a.message,
        sentAt: a.sentAt,
        threshold: a.threshold,
      })),
    });
  } catch (error) {
    console.error('[Credits API] Error fetching usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage history' },
      { status: 500 }
    );
  }
}