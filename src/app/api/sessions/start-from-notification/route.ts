import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database/prisma';
import { 
  verifyNotificationToken, 
  trackNotificationInteraction 
} from '@/lib/notifications/notification-tokens';
import { z } from 'zod';

const querySchema = z.object({
  token: z.string(),
  action: z.enum(['instant', 'regular']).optional().default('regular'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;
    
    // Parse and validate query parameters
    const query = querySchema.parse({
      token: searchParams.get('token'),
      action: searchParams.get('action'),
    });

    // Verify the notification token
    const verification = await verifyNotificationToken(query.token);
    
    if (!verification.valid) {
      // Redirect to dashboard with error
      return NextResponse.redirect(
        new URL(
          `/dashboard?error=${verification.expired ? 'token_expired' : 'invalid_token'}`,
          request.url
        )
      );
    }

    // Track the click
    await trackNotificationInteraction(query.token, 'clicked');

    // Get the session details
    const therapySession = await prisma.session.findUnique({
      where: { id: verification.sessionId! },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!therapySession) {
      return NextResponse.redirect(
        new URL('/dashboard?error=session_not_found', request.url)
      );
    }

    // Check if user is authorized (either logged in as the session owner or clicking their own link)
    if (session?.user?.id !== therapySession.userId) {
      // Store the intended session for after login
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set(
        'callbackUrl',
        `/api/sessions/start-from-notification?token=${query.token}&action=${query.action}`
      );
      return NextResponse.redirect(redirectUrl);
    }

    if (query.action === 'instant') {
      // Instant start - reschedule session to now
      const now = new Date();
      
      // Update session to start now
      await prisma.session.update({
        where: { id: therapySession.id },
        data: {
          date: now,
          startTime: now,
          status: 'SCHEDULED', // Keep as scheduled so it can be started normally
          startedViaNotification: true,
          notificationStartedAt: now,
        },
      });

      // Track the instant start
      await trackNotificationInteraction(query.token, 'started');

      // Redirect to therapy page with sessionId
      return NextResponse.redirect(
        new URL(`/dashboard/therapy?sessionId=${therapySession.id}`, request.url)
      );
    } else {
      // Regular click - just go to dashboard
      return NextResponse.redirect(
        new URL(
          `/dashboard?sessionId=${therapySession.id}&highlight=true`,
          request.url
        )
      );
    }
  } catch (error) {
    console.error('Error handling notification click:', error);
    return NextResponse.redirect(
      new URL('/dashboard?error=processing_failed', request.url)
    );
  }
}