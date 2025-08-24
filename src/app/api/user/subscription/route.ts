import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
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
    
    // Define tier information based on PRICING-STRATEGY-ANALYSIS.md
    const tierInfo = {
      free: {
        name: 'Free',
        slug: 'free',
        price: 0,
        sessionsPerMonth: 3,
        minutesPerSession: 15,
        totalMinutes: 45,
        features: [
          'Full analytics dashboard',
          'Basic mood tracking', 
          'Crisis detection & support',
          'Email summaries'
        ]
      },
      essential: {
        name: 'Essential',
        slug: 'essential',
        price: 12.99,
        sessionsPerMonth: 8,
        minutesPerSession: 20,
        totalMinutes: 160,
        features: [
          '8 therapy sessions per month',
          '20 minutes per session',
          'Advanced analytics dashboard',
          'Progress tracking',
          'Email & SMS notifications',
          'Session recordings'
        ]
      },
      growth: {
        name: 'Growth',
        slug: 'growth', 
        price: 24.99,
        sessionsPerMonth: 16,
        minutesPerSession: 25,
        totalMinutes: 400,
        features: [
          '16 therapy sessions per month',
          '25 minutes per session',
          'All Essential features',
          'Advanced CBT modules',
          'Priority support',
          'Session transcripts',
          'Custom therapy plans'
        ]
      },
      unlimited: {
        name: 'Unlimited',
        slug: 'unlimited',
        price: 44.99,
        sessionsPerMonth: 40,
        minutesPerSession: 30,
        totalMinutes: 1200,
        features: [
          '40 therapy sessions per month',
          '30 minutes per session',
          'All Growth features',
          'Priority queue (no waiting)',
          'Voice customization',
          'Downloadable transcripts',
          'Partner/family sub-accounts (2)',
          'Dedicated support'
        ]
      }
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