/**
 * Calendar Conflicts API Route
 * Checks for scheduling conflicts with existing sessions and external calendars
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma-optimized';
import { z } from 'zod';
import { addMinutes, isWithinInterval, parseISO } from 'date-fns';

// Validation schema for conflict checking
const ConflictCheckSchema = z.object({
  date: z.string().datetime(),
  duration: z.number().min(15).max(240), // 15 mins to 4 hours
  timeSlots: z.array(z.string().datetime())
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = ConflictCheckSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: validation.error.errors 
      }, { status: 400 });
    }

    const { date, duration, timeSlots } = validation.data;
    const conflicts: string[] = [];

    // 1. Check conflicts with existing sessions
    const existingSessions = await prisma.session.findMany({
      where: {
        userId: session.user.id,
        status: {
          in: ['SCHEDULED', 'ACTIVE', 'PAUSED']
        },
        date: {
          gte: new Date(date),
          lt: addMinutes(new Date(date), 24 * 60) // Same day
        }
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        duration: true,
        status: true
      }
    });

    // Check each time slot for conflicts
    for (const slotTime of timeSlots) {
      const slotStart = parseISO(slotTime);
      const slotEnd = addMinutes(slotStart, duration);

      // Check against existing sessions
      for (const existingSession of existingSessions) {
        const sessionStart = existingSession.startTime || existingSession.date;
        const sessionEnd = addMinutes(sessionStart, existingSession.duration);

        // Check if times overlap
        const overlaps = 
          isWithinInterval(slotStart, { start: sessionStart, end: sessionEnd }) ||
          isWithinInterval(slotEnd, { start: sessionStart, end: sessionEnd }) ||
          isWithinInterval(sessionStart, { start: slotStart, end: slotEnd }) ||
          isWithinInterval(sessionEnd, { start: slotStart, end: slotEnd });

        if (overlaps) {
          conflicts.push(slotTime);
          break; // No need to check other sessions for this slot
        }
      }
    }

    // 2. Check conflicts with calendar integrations
    const calendarIntegrations = await prisma.calendarIntegration.findMany({
      where: {
        userId: session.user.id,
        enabled: true,
        syncStatus: 'connected'
      },
      select: {
        id: true,
        provider: true,
        accessToken: true,
        calendarId: true,
        providerMetadata: true
      }
    });

    // For each enabled calendar integration, check for conflicts
    for (const integration of calendarIntegrations) {
      try {
        // Check if access token is still valid
        if (!integration.accessToken) {
          continue;
        }

        // Provider-specific conflict checking
        switch (integration.provider) {
          case 'google':
            // In production, this would call Google Calendar API
            // For now, we'll add mock conflict checking
            // const googleConflicts = await checkGoogleCalendarConflicts(
            //   integration.accessToken,
            //   integration.calendarId,
            //   timeSlots,
            //   duration
            // );
            // conflicts.push(...googleConflicts);
            break;

          case 'outlook':
          case 'exchange':
            // In production, this would call Microsoft Graph API
            // const outlookConflicts = await checkOutlookCalendarConflicts(
            //   integration.accessToken,
            //   timeSlots,
            //   duration
            // );
            // conflicts.push(...outlookConflicts);
            break;

          default:
            console.warn(`Unknown calendar provider: ${integration.provider}`);
        }
      } catch (error) {
        console.error(`Error checking conflicts for ${integration.provider}:`, error);
        // Continue checking other integrations even if one fails
      }
    }

    // 3. Check for buffer time preferences
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        sessionPreference: true,
        providerMetadata: true
      }
    });

    // Add buffer time conflicts if user has preferences set
    // This could be expanded to include buffer times between sessions
    // For example, 15 minutes before and after each existing session

    // Remove duplicates from conflicts array
    const uniqueConflicts = [...new Set(conflicts)];

    return NextResponse.json({
      conflicts: uniqueConflicts,
      totalChecked: timeSlots.length,
      hasConflicts: uniqueConflicts.length > 0,
      integrations: calendarIntegrations.map(i => ({
        provider: i.provider,
        connected: true
      }))
    });

  } catch (error) {
    console.error('Failed to check calendar conflicts:', error);
    return NextResponse.json({
      error: 'Failed to check calendar conflicts',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function for Google Calendar conflict checking (placeholder)
async function checkGoogleCalendarConflicts(
  accessToken: string,
  calendarId: string | null,
  timeSlots: string[],
  duration: number
): Promise<string[]> {
  // Implementation would use Google Calendar API
  // This is a placeholder for the actual implementation
  const conflicts: string[] = [];
  
  // Example API call structure:
  // const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  // const events = await calendar.events.list({
  //   calendarId: calendarId || 'primary',
  //   timeMin: startTime,
  //   timeMax: endTime,
  //   singleEvents: true,
  //   orderBy: 'startTime'
  // });
  
  return conflicts;
}

// Helper function for Outlook/Exchange conflict checking (placeholder)
async function checkOutlookCalendarConflicts(
  accessToken: string,
  timeSlots: string[],
  duration: number
): Promise<string[]> {
  // Implementation would use Microsoft Graph API
  // This is a placeholder for the actual implementation
  const conflicts: string[] = [];
  
  // Example API call structure:
  // const client = Client.init({
  //   authProvider: (done) => done(null, accessToken)
  // });
  // const events = await client
  //   .api('/me/events')
  //   .filter(`start/dateTime ge '${startTime}' and end/dateTime le '${endTime}'`)
  //   .get();
  
  return conflicts;
}