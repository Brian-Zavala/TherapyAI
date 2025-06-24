/**
 * Google Calendar OAuth Integration
 * Based on official Google Calendar API documentation
 */

// TODO: Install googleapis package for Google Calendar integration
// import { google } from 'googleapis';
// import { OAuth2Client } from 'google-auth-library';

// Temporary placeholder types
type OAuth2Client = any;
const google = { calendar: () => ({ events: { insert: async () => null, list: async () => ({ data: { items: [] } }) } }), auth: { OAuth2: class {} } } as any;

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/calendar/callback/google`
    );
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthorizationUrl(userId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId, // Pass userId in state for security
      prompt: 'consent' // Force consent to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      throw new Error('No refresh token received');
    }

    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expiry_date!)
    };
  }

  /**
   * Get user calendar info
   */
  async getUserInfo(accessToken: string): Promise<{
    email: string;
    calendarId: string;
  }> {
    this.oauth2Client.setCredentials({ access_token: accessToken });
    
    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    return {
      email: userInfo.data.email!,
      calendarId: userInfo.data.email! // Primary calendar is usually email
    };
  }

  /**
   * Create calendar event
   */
  async createEvent(
    refreshToken: string,
    event: {
      summary: string;
      description?: string;
      start: Date;
      end: Date;
      location?: string;
      attendees?: string[];
    }
  ): Promise<{ eventId: string; htmlLink: string }> {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: 'UTC'
        },
        attendees: event.attendees?.map(email => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 60 } // 1 hour before
          ]
        }
      }
    });

    return {
      eventId: response.data.id!,
      htmlLink: response.data.htmlLink!
    };
  }

  /**
   * List calendar events
   */
  async listEvents(
    refreshToken: string,
    timeMin: Date,
    timeMax: Date
  ): Promise<Array<{
    id: string;
    summary: string;
    start: Date;
    end: Date;
    htmlLink: string;
  }>> {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    return (response.data.items || []).map(event => ({
      id: event.id!,
      summary: event.summary || 'No title',
      start: new Date(event.start?.dateTime || event.start?.date!),
      end: new Date(event.end?.dateTime || event.end?.date!),
      htmlLink: event.htmlLink!
    }));
  }

  /**
   * Delete calendar event
   */
  async deleteEvent(refreshToken: string, eventId: string): Promise<void> {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    await calendar.events.delete({
      calendarId: 'primary',
      eventId
    });
  }

  /**
   * Check for conflicts
   */
  async checkConflicts(
    refreshToken: string,
    startTime: Date,
    endTime: Date
  ): Promise<Array<{
    id: string;
    summary: string;
    start: Date;
    end: Date;
    overlapMinutes: number;
  }>> {
    const events = await this.listEvents(refreshToken, startTime, endTime);
    
    return events.filter(event => {
      const eventStart = event.start.getTime();
      const eventEnd = event.end.getTime();
      const checkStart = startTime.getTime();
      const checkEnd = endTime.getTime();
      
      // Check for overlap
      const overlaps = (eventStart < checkEnd && eventEnd > checkStart);
      
      if (overlaps) {
        const overlapStart = Math.max(eventStart, checkStart);
        const overlapEnd = Math.min(eventEnd, checkEnd);
        const overlapMinutes = Math.round((overlapEnd - overlapStart) / (1000 * 60));
        
        return {
          ...event,
          overlapMinutes
        };
      }
      
      return null;
    }).filter(Boolean) as any;
  }
}