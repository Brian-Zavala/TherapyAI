/**
 * Enterprise Calendar Integration Service
 * Supports Google Calendar, Microsoft Outlook, and iCal
 */

// TODO: Install googleapis and @microsoft/microsoft-graph-client packages
// import { google, calendar_v3 } from 'googleapis';
// import { Client } from '@microsoft/microsoft-graph-client';
// import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';

// Temporary placeholder types
type calendar_v3 = any;
const google = { calendar: () => ({ events: { insert: async () => null, list: async () => ({ data: { items: [] } }) } }), auth: { OAuth2: class {} } } as any;
type Client = any;
interface AuthenticationProvider {
  getAccessToken(): Promise<string>;
}
import { prisma } from '@/lib/prisma';
import { Logger } from './logging';
// TODO: Install ical-generator package
// import ical from 'ical-generator';
const ical = () => ({ createEvent: () => null, toString: () => '' }) as any;
import { z } from 'zod';

// Calendar provider schemas
const CalendarProviderSchema = z.enum(['google', 'outlook', 'exchange', 'ical', 'caldav']);
type CalendarProvider = z.infer<typeof CalendarProviderSchema>;

// Calendar credentials schema
const CalendarCredentialsSchema = z.object({
  provider: CalendarProviderSchema,
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.date().optional(),
  email: z.string().email(),
  calendarId: z.string().optional(),
  timeZone: z.string().default('UTC')
});

export type CalendarCredentials = z.infer<typeof CalendarCredentialsSchema>;

// Calendar event schema
const CalendarEventSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  startTime: z.date(),
  endTime: z.date(),
  timeZone: z.string().default('UTC'),
  location: z.string().optional(),
  attendees: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
    responseStatus: z.enum(['accepted', 'declined', 'tentative', 'needsAction']).optional()
  })).optional(),
  reminders: z.array(z.object({
    method: z.enum(['email', 'popup']),
    minutes: z.number()
  })).optional(),
  recurrence: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    interval: z.number().default(1),
    count: z.number().optional(),
    until: z.date().optional()
  }).optional(),
  metadata: z.record(z.any()).optional()
});

export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

// Microsoft Graph authentication provider
class GraphAuthProvider implements AuthenticationProvider {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getAccessToken(): Promise<string> {
    return this.accessToken;
  }
}

export class CalendarIntegrationService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('CalendarIntegration');
  }

  /**
   * Get user's calendar credentials
   */
  public async getUserCalendarCredentials(userId: string): Promise<CalendarCredentials[]> {
    try {
      const credentials = await prisma.$queryRaw<any[]>`
        SELECT * FROM calendar_credentials 
        WHERE user_id = ${userId} 
        AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC
      `;

      return credentials.map(cred => ({
        provider: cred.provider as CalendarProvider,
        accessToken: cred.access_token,
        refreshToken: cred.refresh_token,
        expiresAt: cred.expires_at ? new Date(cred.expires_at) : undefined,
        email: cred.email,
        calendarId: cred.calendar_id,
        timeZone: cred.time_zone || 'UTC'
      }));
    } catch (error) {
      this.logger.error(`Failed to get calendar credentials for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Create calendar event across all connected calendars
   */
  public async createCalendarEvent(
    userId: string,
    event: CalendarEvent,
    providers?: CalendarProvider[]
  ): Promise<{ [provider: string]: { success: boolean; eventId?: string; error?: string } }> {
    const results: { [provider: string]: { success: boolean; eventId?: string; error?: string } } = {};
    
    try {
      const credentials = await this.getUserCalendarCredentials(userId);
      const filteredCredentials = providers 
        ? credentials.filter(cred => providers.includes(cred.provider))
        : credentials;

      for (const cred of filteredCredentials) {
        try {
          const eventId = await this.createEventForProvider(cred, event);
          results[cred.provider] = { success: true, eventId };
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Failed to create event in ${cred.provider}:`, error);
          results[cred.provider] = { success: false, error: errorMessage };
        }
      }
      
      return results;
      
    } catch (error) {
      this.logger.error(`Failed to create calendar events for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update calendar event
   */
  public async updateCalendarEvent(
    userId: string,
    session: any,
    reminderType: string
  ): Promise<void> {
    try {
      const credentials = await this.getUserCalendarCredentials(userId);
      
      // Update event with reminder information
      const updatedEvent: CalendarEvent = {
        title: `${session.theme || 'Therapy Session'} - Reminder (${reminderType})`,
        description: this.generateEventDescription(session, reminderType),
        startTime: new Date(session.date),
        endTime: new Date(new Date(session.date).getTime() + (session.duration * 60 * 1000)),
        timeZone: session.timeZone || 'UTC',
        reminders: this.generateReminders(reminderType),
        metadata: {
          sessionId: session.id,
          reminderType,
          updatedAt: new Date().toISOString()
        }
      };

      // Find existing calendar events for this session
      const existingEvents = await this.findCalendarEventsBySessionId(userId, session.id);
      
      for (const existingEvent of existingEvents) {
        try {
          await this.updateEventForProvider(existingEvent.credentials, existingEvent.eventId, updatedEvent);
        } catch (error) {
          this.logger.error(`Failed to update calendar event ${existingEvent.eventId}:`, error);
        }
      }
      
    } catch (error) {
      this.logger.error(`Failed to update calendar events for session ${session.id}:`, error);
    }
  }

  /**
   * Get calendar availability
   */
  public async getCalendarAvailability(
    userId: string,
    startDate: Date,
    endDate: Date,
    providers?: CalendarProvider[]
  ): Promise<{ [provider: string]: CalendarEvent[] }> {
    const availability: { [provider: string]: CalendarEvent[] } = {};
    
    try {
      const credentials = await this.getUserCalendarCredentials(userId);
      const filteredCredentials = providers 
        ? credentials.filter(cred => providers.includes(cred.provider))
        : credentials;

      for (const cred of filteredCredentials) {
        try {
          const events = await this.getEventsForProvider(cred, startDate, endDate);
          availability[cred.provider] = events;
          
        } catch (error) {
          this.logger.error(`Failed to get availability from ${cred.provider}:`, error);
          availability[cred.provider] = [];
        }
      }
      
      return availability;
      
    } catch (error) {
      this.logger.error(`Failed to get calendar availability for user ${userId}:`, error);
      return {};
    }
  }

  /**
   * Detect scheduling conflicts
   */
  public async detectConflicts(
    userId: string,
    proposedEvent: CalendarEvent,
    providers?: CalendarProvider[]
  ): Promise<{
    hasConflict: boolean;
    conflicts: Array<{
      provider: string;
      event: CalendarEvent;
      overlapMinutes: number;
    }>;
  }> {
    try {
      const availability = await this.getCalendarAvailability(
        userId,
        new Date(proposedEvent.startTime.getTime() - (24 * 60 * 60 * 1000)), // 1 day before
        new Date(proposedEvent.endTime.getTime() + (24 * 60 * 60 * 1000)), // 1 day after
        providers
      );

      const conflicts: Array<{
        provider: string;
        event: CalendarEvent;
        overlapMinutes: number;
      }> = [];

      for (const [provider, events] of Object.entries(availability)) {
        for (const event of events) {
          const overlap = this.calculateTimeOverlap(proposedEvent, event);
          if (overlap > 0) {
            conflicts.push({
              provider,
              event,
              overlapMinutes: overlap
            });
          }
        }
      }

      return {
        hasConflict: conflicts.length > 0,
        conflicts
      };
      
    } catch (error) {
      this.logger.error(`Failed to detect conflicts for user ${userId}:`, error);
      return { hasConflict: false, conflicts: [] };
    }
  }

  /**
   * Generate iCal file
   */
  public generateICalFile(events: CalendarEvent[]): string {
    const cal = ical({
      domain: process.env.NEXTAUTH_URL || 'localhost',
      name: 'Therapy Sessions',
      description: 'Your scheduled therapy sessions'
    });

    for (const event of events) {
      cal.createEvent({
        start: event.startTime,
        end: event.endTime,
        summary: event.title,
        description: event.description,
        location: event.location,
        timezone: event.timeZone,
        organizer: {
          name: 'Therapy AI',
          email: process.env.EMAIL_FROM || 'noreply@therapyai.com'
        },
        attendees: event.attendees?.map(attendee => ({
          name: attendee.name,
          email: attendee.email,
          status: attendee.responseStatus
        })),
        alarms: event.reminders?.map(reminder => ({
          type: reminder.method === 'email' ? 'email' : 'display',
          trigger: reminder.minutes * 60 // Convert to seconds
        }))
      });
    }

    return cal.toString();
  }

  /**
   * Provider-specific implementations
   */
  private async createEventForProvider(
    credentials: CalendarCredentials,
    event: CalendarEvent
  ): Promise<string> {
    switch (credentials.provider) {
      case 'google':
        return this.createGoogleCalendarEvent(credentials, event);
      case 'outlook':
        return this.createOutlookCalendarEvent(credentials, event);
      default:
        throw new Error(`Unsupported calendar provider: ${credentials.provider}`);
    }
  }

  private async createGoogleCalendarEvent(
    credentials: CalendarCredentials,
    event: CalendarEvent
  ): Promise<string> {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth });

    const googleEvent: calendar_v3.Schema$Event = {
      summary: event.title,
      description: event.description,
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: event.timeZone
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: event.timeZone
      },
      location: event.location,
      attendees: event.attendees?.map(attendee => ({
        email: attendee.email,
        displayName: attendee.name,
        responseStatus: attendee.responseStatus
      })),
      reminders: {
        useDefault: false,
        overrides: event.reminders?.map(reminder => ({
          method: reminder.method,
          minutes: reminder.minutes
        }))
      }
    };

    // Add recurrence if specified
    if (event.recurrence) {
      googleEvent.recurrence = [this.buildGoogleRecurrenceRule(event.recurrence)];
    }

    const response = await calendar.events.insert({
      calendarId: credentials.calendarId || 'primary',
      requestBody: googleEvent
    });

    if (!response.data.id) {
      throw new Error('Failed to create Google Calendar event');
    }

    return response.data.id;
  }

  private async createOutlookCalendarEvent(
    credentials: CalendarCredentials,
    event: CalendarEvent
  ): Promise<string> {
    const authProvider = new GraphAuthProvider(credentials.accessToken);
    const graphClient = Client.initWithMiddleware({ authProvider });

    const outlookEvent = {
      subject: event.title,
      body: {
        contentType: 'HTML',
        content: event.description || ''
      },
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: event.timeZone
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: event.timeZone
      },
      location: {
        displayName: event.location || ''
      },
      attendees: event.attendees?.map(attendee => ({
        emailAddress: {
          address: attendee.email,
          name: attendee.name
        },
        type: 'required'
      })),
      reminderMinutesBeforeStart: event.reminders?.[0]?.minutes || 15
    };

    // Add recurrence if specified
    if (event.recurrence) {
      (outlookEvent as any).recurrence = this.buildOutlookRecurrencePattern(event.recurrence);
    }

    const response = await graphClient
      .api('/me/events')
      .post(outlookEvent);

    return response.id;
  }

  private async updateEventForProvider(
    credentials: CalendarCredentials,
    eventId: string,
    event: CalendarEvent
  ): Promise<void> {
    switch (credentials.provider) {
      case 'google':
        await this.updateGoogleCalendarEvent(credentials, eventId, event);
        break;
      case 'outlook':
        await this.updateOutlookCalendarEvent(credentials, eventId, event);
        break;
      default:
        throw new Error(`Unsupported calendar provider: ${credentials.provider}`);
    }
  }

  private async updateGoogleCalendarEvent(
    credentials: CalendarCredentials,
    eventId: string,
    event: CalendarEvent
  ): Promise<void> {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth });

    const googleEvent: calendar_v3.Schema$Event = {
      summary: event.title,
      description: event.description,
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: event.timeZone
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: event.timeZone
      },
      location: event.location,
      reminders: {
        useDefault: false,
        overrides: event.reminders?.map(reminder => ({
          method: reminder.method,
          minutes: reminder.minutes
        }))
      }
    };

    await calendar.events.update({
      calendarId: credentials.calendarId || 'primary',
      eventId: eventId,
      requestBody: googleEvent
    });
  }

  private async updateOutlookCalendarEvent(
    credentials: CalendarCredentials,
    eventId: string,
    event: CalendarEvent
  ): Promise<void> {
    const authProvider = new GraphAuthProvider(credentials.accessToken);
    const graphClient = Client.initWithMiddleware({ authProvider });

    const outlookEvent = {
      subject: event.title,
      body: {
        contentType: 'HTML',
        content: event.description || ''
      },
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: event.timeZone
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: event.timeZone
      },
      location: {
        displayName: event.location || ''
      },
      reminderMinutesBeforeStart: event.reminders?.[0]?.minutes || 15
    };

    await graphClient
      .api(`/me/events/${eventId}`)
      .patch(outlookEvent);
  }

  private async getEventsForProvider(
    credentials: CalendarCredentials,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    switch (credentials.provider) {
      case 'google':
        return this.getGoogleCalendarEvents(credentials, startDate, endDate);
      case 'outlook':
        return this.getOutlookCalendarEvents(credentials, startDate, endDate);
      default:
        return [];
    }
  }

  private async getGoogleCalendarEvents(
    credentials: CalendarCredentials,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.list({
      calendarId: credentials.calendarId || 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    return (response.data.items || []).map(item => ({
      id: item.id || '',
      title: item.summary || '',
      description: item.description,
      startTime: new Date(item.start?.dateTime || item.start?.date || ''),
      endTime: new Date(item.end?.dateTime || item.end?.date || ''),
      timeZone: item.start?.timeZone || credentials.timeZone,
      location: item.location,
      attendees: item.attendees?.map(attendee => ({
        email: attendee.email || '',
        name: attendee.displayName,
        responseStatus: attendee.responseStatus as any
      }))
    }));
  }

  private async getOutlookCalendarEvents(
    credentials: CalendarCredentials,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const authProvider = new GraphAuthProvider(credentials.accessToken);
    const graphClient = Client.initWithMiddleware({ authProvider });

    const response = await graphClient
      .api('/me/events')
      .filter(`start/dateTime ge '${startDate.toISOString()}' and end/dateTime le '${endDate.toISOString()}'`)
      .orderby('start/dateTime')
      .get();

    return response.value.map((item: any) => ({
      id: item.id,
      title: item.subject,
      description: item.body?.content,
      startTime: new Date(item.start.dateTime),
      endTime: new Date(item.end.dateTime),
      timeZone: item.start.timeZone,
      location: item.location?.displayName,
      attendees: item.attendees?.map((attendee: any) => ({
        email: attendee.emailAddress.address,
        name: attendee.emailAddress.name,
        responseStatus: attendee.status?.response
      }))
    }));
  }

  /**
   * Helper methods
   */
  private generateEventDescription(session: any, reminderType: string): string {
    return `
Therapy Session - ${session.theme || 'AI Therapy Session'}

Duration: ${session.duration} minutes
Notes: ${session.notes || 'No additional notes'}

Reminder Type: ${reminderType}

Join your session from the dashboard at the scheduled time.
Platform: Therapy AI
    `.trim();
  }

  private generateReminders(reminderType: string): Array<{ method: 'email' | 'popup'; minutes: number }> {
    const reminders = [];
    
    switch (reminderType) {
      case '1_week':
        reminders.push({ method: 'email' as const, minutes: 7 * 24 * 60 });
        break;
      case '48_hours':
        reminders.push({ method: 'email' as const, minutes: 48 * 60 });
        break;
      case '24_hours':
        reminders.push({ method: 'email' as const, minutes: 24 * 60 });
        break;
      case '1_hour':
        reminders.push({ method: 'popup' as const, minutes: 60 });
        break;
    }
    
    return reminders;
  }

  private calculateTimeOverlap(event1: CalendarEvent, event2: CalendarEvent): number {
    const start1 = event1.startTime.getTime();
    const end1 = event1.endTime.getTime();
    const start2 = event2.startTime.getTime();
    const end2 = event2.endTime.getTime();

    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);

    if (overlapStart >= overlapEnd) {
      return 0; // No overlap
    }

    return (overlapEnd - overlapStart) / (1000 * 60); // Return overlap in minutes
  }

  private buildGoogleRecurrenceRule(recurrence: any): string {
    let rule = `RRULE:FREQ=${recurrence.frequency.toUpperCase()}`;
    
    if (recurrence.interval > 1) {
      rule += `;INTERVAL=${recurrence.interval}`;
    }
    
    if (recurrence.count) {
      rule += `;COUNT=${recurrence.count}`;
    } else if (recurrence.until) {
      rule += `;UNTIL=${recurrence.until.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
    }
    
    return rule;
  }

  private buildOutlookRecurrencePattern(recurrence: any): any {
    return {
      pattern: {
        type: recurrence.frequency,
        interval: recurrence.interval || 1
      },
      range: recurrence.count ? {
        type: 'numbered',
        numberOfOccurrences: recurrence.count
      } : recurrence.until ? {
        type: 'endDate',
        endDate: recurrence.until.toISOString().split('T')[0]
      } : {
        type: 'noEnd'
      }
    };
  }

  private async findCalendarEventsBySessionId(userId: string, sessionId: string): Promise<Array<{
    credentials: CalendarCredentials;
    eventId: string;
  }>> {
    // Implementation would query a calendar_events table that maps sessions to calendar events
    // For now, return empty array
    return [];
  }
}