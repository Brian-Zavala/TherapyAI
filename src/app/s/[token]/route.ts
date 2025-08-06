import { NextRequest, NextResponse } from 'next/server';
import { verifyNotificationToken } from '@/lib/notification-tokens';
import { prisma } from '@/lib/database/prisma-client';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    
    // Verify the short token
    const verification = await verifyNotificationToken(token);
    
    if (!verification.valid) {
      return NextResponse.redirect(
        new URL('/dashboard?error=invalid_link', request.url)
      );
    }

    // Get the full token from the session
    const session = await prisma.session.findUnique({
      where: { id: verification.sessionId! },
      select: { notificationToken: true },
    });

    if (!session?.notificationToken) {
      return NextResponse.redirect(
        new URL('/dashboard?error=session_not_found', request.url)
      );
    }

    // Redirect to the full notification handler with instant action
    return NextResponse.redirect(
      new URL(
        `/api/sessions/start-from-notification?token=${session.notificationToken}&action=instant`,
        request.url
      )
    );
  } catch (error) {
    console.error('Error handling short URL:', error);
    return NextResponse.redirect(
      new URL('/dashboard?error=processing_failed', request.url)
    );
  }
}