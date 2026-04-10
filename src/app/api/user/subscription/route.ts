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

    // Map database subscription status to our tier system
    const subscriptionTier = user.subscriptionStatus || 'free';
    
    // Two-tier plan info
    const tierInfo = {
      free: {
        name: 'Free',
        slug: 'free',
        price: 0,
        sessionsPerMonth: 3,
        minutesPerSession: 15,
        totalMinutes: 45,
        features: [
          '3 therapy sessions per month',
          '15 minutes per session',
          'Analytics dashboard',
          'Crisis detection & support',
          'Email summaries'
        ]
      },
      pro: {
        name: 'Pro',
        slug: 'pro',
        price: 5,
        sessionsPerMonth: 4,
        minutesPerSession: 30,
        totalMinutes: 120,
        features: [
          '4 therapy sessions per month',
          '30 minutes per session',
          'Full analytics dashboard',
          'Progress tracking',
          'Email & SMS notifications',
          'Session transcripts'
        ]
      },
    };

    const currentTier = tierInfo[subscriptionTier as keyof typeof tierInfo] || tierInfo.free;

    return NextResponse.json({
      currentTier: {
        ...currentTier,
        isActive: true,
        hasSubscription: subscriptionTier !== 'free'
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