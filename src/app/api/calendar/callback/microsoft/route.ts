/**
 * Microsoft Calendar OAuth Callback Route
 * Handles OAuth2 callback from Microsoft after user authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MicrosoftCalendarService } from '@/lib/calendar-oauth/microsoft-calendar';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Contains userId
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle authorization errors
    if (error) {
      console.error('Microsoft OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings/integrations?error=microsoft_auth_failed`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings/integrations?error=invalid_callback`
      );
    }

    // Verify the user is authenticated and matches the state
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.id !== state) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/api/auth/signin?callbackUrl=/settings/integrations`
      );
    }

    // Exchange code for tokens
    const microsoftService = new MicrosoftCalendarService();
    const tokens = await microsoftService.getTokens(code);

    // Get user info
    const userInfo = await microsoftService.getUserInfo(tokens.accessToken);

    // Save or update calendar integration
    await prisma.calendarIntegration.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: 'outlook'
        }
      },
      update: {
        enabled: true,
        accountEmail: userInfo.email,
        calendarId: userInfo.calendarId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        syncStatus: 'connected',
        lastSync: new Date(),
        errorMessage: null
      },
      create: {
        userId: session.user.id,
        provider: 'outlook',
        enabled: true,
        accountEmail: userInfo.email,
        calendarId: userInfo.calendarId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        syncStatus: 'connected',
        lastSync: new Date()
      }
    });

    // Log the successful connection
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CALENDAR_CONNECTED',
        entityType: 'CalendarIntegration',
        entityId: 'outlook',
        metadata: {
          provider: 'outlook',
          accountEmail: userInfo.email
        }
      }
    });

    // Sync existing future sessions to Outlook Calendar
    try {
      const futureSessions = await prisma.session.findMany({
        where: {
          userId: session.user.id,
          date: { gte: new Date() },
          status: { in: ['scheduled', 'active'] }
        }
      });

      for (const sessionData of futureSessions) {
        try {
          const event = await microsoftService.createEvent(tokens.accessToken, {
            summary: sessionData.theme,
            description: `AI Therapy Session\n\n${sessionData.notes || ''}`,
            start: sessionData.date,
            end: new Date(sessionData.date.getTime() + (sessionData.duration * 60 * 1000)),
            location: 'Online Therapy Platform',
            attendees: [session.user.email!]
          });

          console.log(`Created Outlook event for session ${sessionData.id}:`, event.eventId);
        } catch (err) {
          console.error(`Failed to sync session ${sessionData.id} to Outlook:`, err);
        }
      }
    } catch (syncError) {
      console.error('Failed to sync sessions to Outlook:', syncError);
      // Don't fail the connection, just log the error
    }

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings/integrations?success=microsoft_connected`
    );

  } catch (error) {
    console.error('Failed to handle Microsoft OAuth callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings/integrations?error=connection_failed`
    );
  }
}