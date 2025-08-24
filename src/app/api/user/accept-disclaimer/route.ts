import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database/prisma-optimized';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { version } = body;

    if (!version) {
      return NextResponse.json({ error: 'Version is required' }, { status: 400 });
    }

    logger.info('Accepting disclaimer', { 
      userId: session.user.id, 
      version 
    });

    // Update or create user profile with disclaimer acceptance
    // Using try-catch to handle missing fields during migration
    let updatedProfile: any;
    try {
      updatedProfile = await prisma.userProfile.upsert({
        where: { userId: session.user.id },
        update: {
          aiDisclaimerAccepted: true,
          aiDisclaimerDate: new Date(),
          aiDisclaimerVersion: version
        },
        create: {
          userId: session.user.id,
          aiDisclaimerAccepted: true,
          aiDisclaimerDate: new Date(),
          aiDisclaimerVersion: version
        }
      });
    } catch (error) {
      // If fields don't exist, try without them
      logger.warn('Cannot save disclaimer acceptance - database migration needed', { 
        userId: session.user.id,
        error: error instanceof Error ? error.message : error 
      });
      
      // Still return success to allow user to continue
      // The disclaimer will show again next time until migration is complete
      return NextResponse.json({
        success: false,
        message: 'Database migration needed. Please contact administrator.',
        migrationNeeded: true
      });
    }

    logger.info('Disclaimer accepted successfully', { 
      userId: session.user.id,
      version
    });

    return NextResponse.json({
      success: true,
      acceptedAt: updatedProfile.aiDisclaimerDate,
      version: updatedProfile.aiDisclaimerVersion
    });

  } catch (error) {
    logger.error('Failed to accept disclaimer', { 
      error: error instanceof Error ? error.message : error 
    });
    
    return NextResponse.json(
      { error: 'Failed to save disclaimer acceptance' }, 
      { status: 500 }
    );
  }
}