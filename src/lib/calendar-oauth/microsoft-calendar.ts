/**
 * Microsoft Graph Calendar OAuth Integration
 * Based on official Microsoft Graph API documentation
 */

// TODO: Install @microsoft/microsoft-graph-client package for Microsoft Calendar integration
// import { Client } from '@microsoft/microsoft-graph-client';
// import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';

// Temporary placeholder types
type Client = any;
interface AuthenticationProvider {
  getAccessToken(): Promise<string>;
}

// Custom authentication provider for Microsoft Graph
class TokenAuthProvider implements AuthenticationProvider {
  constructor(private accessToken: string) {}

  async getAccessToken(): Promise<string> {
    return this.accessToken;
  }
}

export class MicrosoftCalendarService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private tenantId: string;

  constructor() {
    this.clientId = process.env.MICROSOFT_CLIENT_ID!;
    this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
    this.redirectUri = `${process.env.NEXTAUTH_URL}/api/calendar/callback/microsoft`;
    this.tenantId = 'common'; // Supports both personal and work accounts
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthorizationUrl(userId: string): string {
    const scopes = [
      'openid',
      'profile',
      'email',
      'User.Read',
      'Calendars.ReadWrite',
      'Calendars.ReadWrite.Shared'
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      response_mode: 'query',
      scope: scopes.join(' '),
      state: userId
    });

    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize?${params}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code'
    });

    const response = await fetch(
      `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get tokens: ${error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000)
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresAt: Date;
  }> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    const response = await fetch(
      `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      }
    );

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000)
    };
  }

  /**
   * Get user info and primary calendar
   */
  async getUserInfo(accessToken: string): Promise<{
    email: string;
    calendarId: string;
  }> {
    const client = Client.initWithMiddleware({
      authProvider: new TokenAuthProvider(accessToken)
    });

    const user = await client.api('/me').get();
    
    // Get default calendar
    const calendar = await client.api('/me/calendar').get();

    return {
      email: user.mail || user.userPrincipalName,
      calendarId: calendar.id
    };
  }

  /**
   * Create calendar event
   */
  async createEvent(
    accessToken: string,
    event: {
      summary: string;
      description?: string;
      start: Date;
      end: Date;
      location?: string;
      attendees?: string[];
    }
  ): Promise<{ eventId: string; webLink: string }> {
    const client = Client.initWithMiddleware({
      authProvider: new TokenAuthProvider(accessToken)
    });

    const eventData = {
      subject: event.summary,
      body: {
        contentType: 'HTML',
        content: event.description || ''
      },
      start: {
        dateTime: event.start.toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: event.end.toISOString(),
        timeZone: 'UTC'
      },
      location: event.location ? { displayName: event.location } : undefined,
      attendees: event.attendees?.map(email => ({
        emailAddress: { address: email },
        type: 'required'
      })),
      reminderMinutesBeforeStart: 60,
      isReminderOn: true
    };

    const createdEvent = await client
      .api('/me/events')
      .post(eventData);

    return {
      eventId: createdEvent.id,
      webLink: createdEvent.webLink
    };
  }

  /**
   * List calendar events
   */
  async listEvents(
    accessToken: string,
    timeMin: Date,
    timeMax: Date
  ): Promise<Array<{
    id: string;
    summary: string;
    start: Date;
    end: Date;
    webLink: string;
  }>> {
    const client = Client.initWithMiddleware({
      authProvider: new TokenAuthProvider(accessToken)
    });

    const events = await client
      .api('/me/calendarview')
      .query({
        startDateTime: timeMin.toISOString(),
        endDateTime: timeMax.toISOString(),
        $orderby: 'start/dateTime',
        $select: 'id,subject,start,end,webLink'
      })
      .get();

    return events.value.map((event: any) => ({
      id: event.id,
      summary: event.subject,
      start: new Date(event.start.dateTime),
      end: new Date(event.end.dateTime),
      webLink: event.webLink
    }));
  }

  /**
   * Delete calendar event
   */
  async deleteEvent(accessToken: string, eventId: string): Promise<void> {
    const client = Client.initWithMiddleware({
      authProvider: new TokenAuthProvider(accessToken)
    });

    await client.api(`/me/events/${eventId}`).delete();
  }

  /**
   * Check for conflicts
   */
  async checkConflicts(
    accessToken: string,
    startTime: Date,
    endTime: Date
  ): Promise<Array<{
    id: string;
    summary: string;
    start: Date;
    end: Date;
    overlapMinutes: number;
  }>> {
    const events = await this.listEvents(accessToken, startTime, endTime);
    
    return events.map(event => {
      const eventStart = event.start.getTime();
      const eventEnd = event.end.getTime();
      const checkStart = startTime.getTime();
      const checkEnd = endTime.getTime();
      
      const overlapStart = Math.max(eventStart, checkStart);
      const overlapEnd = Math.min(eventEnd, checkEnd);
      const overlapMinutes = Math.round((overlapEnd - overlapStart) / (1000 * 60));
      
      return {
        ...event,
        overlapMinutes
      };
    });
  }
}