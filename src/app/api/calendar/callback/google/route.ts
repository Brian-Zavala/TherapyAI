/**
 * Google Calendar OAuth Callback Route
 * Handles OAuth2 callback from Google after user authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma-optimized';
import { GoogleCalendarService } from '@/lib/calendar-oauth/google-calendar';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Contains userId
    const error = searchParams.get('error');

    // Handle authorization errors
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings/integrations?error=google_auth_failed`
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
    const googleService = new GoogleCalendarService();
    const tokens = await googleService.getTokens(code);

    // Get user info
    const userInfo = await googleService.getUserInfo(tokens.accessToken);

    // Save or update calendar integration
    await prisma.calendarIntegration.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: 'google'
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
        provider: 'google',
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
        entityId: 'google',
        metadata: {
          provider: 'google',
          accountEmail: userInfo.email
        }
      }
    });

    // Sync existing future sessions to Google Calendar
    try {
      const futureSessions = await prisma.session.findMany({
        where: {
          userId: session.user.id,
          date: { gte: new Date() },
          status: { in: ['SCHEDULED', 'ACTIVE'] }
        }
      });

      for (const sessionData of futureSessions) {
        try {
          const event = await googleService.createEvent(tokens.refreshToken, {
            summary: sessionData.theme,
            description: `AI Therapy Session\n\n${sessionData.notes || ''}`,
            start: sessionData.date,
            end: new Date(sessionData.date.getTime() + (sessionData.duration * 60 * 1000)),
            location: 'Online Therapy Platform',
            attendees: [session.user.email!]
          });

          console.log(`Created Google Calendar event for session ${sessionData.id}:`, event.eventId);
        } catch (err) {
          console.error(`Failed to sync session ${sessionData.id} to Google Calendar:`, err);
        }
      }
    } catch (syncError) {
      console.error('Failed to sync sessions to Google Calendar:', syncError);
      // Don't fail the connection, just log the error
    }

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings/integrations?success=google_connected`
    );

  } catch (error) {
    console.error('Failed to handle Google OAuth callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings/integrations?error=connection_failed`
    );
  }
}