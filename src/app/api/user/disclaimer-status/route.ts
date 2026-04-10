import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-optimized';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Fetching disclaimer status', { userId: session.user.id });

    // Get user profile with disclaimer status
    // Using try-catch to handle missing fields during migration
    let userProfile: any;
    try {
      userProfile = await prisma.userProfile.findUnique({
        where: { userId: session.user.id },
        select: {
          aiDisclaimerAccepted: true,
          aiDisclaimerDate: true,
          aiDisclaimerVersion: true
        }
      });
    } catch (error) {
      // If fields don't exist yet, return safe defaults
      logger.warn('Disclaimer fields not found in database - migration may be needed', { 
        userId: session.user.id,
        error: error instanceof Error ? error.message : error 
      });
      
      // Return default values to show disclaimer
      return NextResponse.json({
        hasAccepted: false,
        acceptedVersion: null,
        acceptedDate: null,
        migrationNeeded: true
      });
    }

    // If no profile exists yet, create one with default values
    if (!userProfile) {
      logger.info('Creating user profile for disclaimer tracking', { userId: session.user.id });
      
      const newProfile = await prisma.userProfile.create({
        data: {
          userId: session.user.id,
          aiDisclaimerAccepted: false
        },
        select: {
          aiDisclaimerAccepted: true,
          aiDisclaimerDate: true,
          aiDisclaimerVersion: true
        }
      });

      return NextResponse.json({
        hasAccepted: false,
        acceptedVersion: null,
        acceptedDate: null
      });
    }

    return NextResponse.json({
      hasAccepted: userProfile.aiDisclaimerAccepted,
      acceptedVersion: userProfile.aiDisclaimerVersion,
      acceptedDate: userProfile.aiDisclaimerDate
    });

  } catch (error) {
    logger.error('Failed to fetch disclaimer status', { 
      error: error instanceof Error ? error.message : error 
    });
    
    return NextResponse.json(
      { error: 'Failed to fetch disclaimer status' }, 
      { status: 500 }
    );
  }
}