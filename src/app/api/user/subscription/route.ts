import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's subscription status from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscriptionStatus: true,
        subscriptionId: true,
        stripeCustomerId: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Map database subscription status to plan tier
    // subscriptionStatus is 'active'/'past_due'/'canceled'/null — NOT 'free'/'pro'
    const isProUser = user.subscriptionStatus === 'active' && !!user.subscriptionId;
    const planSlug = isProUser ? 'pro' : 'free';

    // Two-tier plan info
    const tierInfo = {
      free: {
        name: 'Free',
        slug: 'free',
        price: 0,
        sessionsPerMonth: 2,
        minutesPerSession: 15,
        totalMinutes: 30,
        features: [
          '2 therapy sessions per month',
          '15 minutes per session',
          'Analytics dashboard',
          'Crisis detection & support',
          'Email summaries'
        ]
      },
      pro: {
        name: 'Pro',
        slug: 'pro',
        price: 10,
        sessionsPerMonth: 'Unlimited',
        minutesPerSession: 30,
        totalMinutes: 'Unlimited',
        features: [
          'Unlimited sessions per month',
          '30 minutes per session',
          'Full analytics dashboard',
          'Session transcripts',
          'Advanced CBT modules',
          'Personalized therapy plans',
          'Priority support',
        ]
      },
    };

    const currentTier = tierInfo[planSlug];

    return NextResponse.json({
      currentTier: {
        ...currentTier,
        isActive: true,
        subscriptionStatus: user.subscriptionStatus || 'free',
        hasSubscription: isProUser,
      },
      allTiers: tierInfo
    });

  } catch (error) {
    console.error('Error fetching subscription data:', error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}