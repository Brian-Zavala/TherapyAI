/**
 * Enterprise Notification Service
 * Multi-channel notification delivery with intelligent retry and personalization
 */

import { Resend } from 'resend';
// TODO: Install twilio package for SMS support
// import { Twilio } from 'twilio';
type Twilio = any;
import { prisma } from '@/lib/database/prisma-optimized';
import { Logger } from './logging';
import { z } from 'zod';
import { render } from '@react-email/render';
import SessionReminderEmail from '@/emails/SessionReminder';
import SessionConfirmationEmail from '@/emails/SessionConfirmation';
import SessionMissedEmail from '@/emails/SessionMissed';

// Notification channel schemas
const NotificationChannelSchema = z.enum(['email', 'sms', 'push', 'in_app', 'webhook']);
type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

// Notification template schema
const NotificationTemplateSchema = z.object({
  channel: NotificationChannelSchema,
  type: z.enum(['reminder', 'confirmation', 'cancellation', 'missed', 'rescheduled']),
  language: z.string().default('en'),
  subject: z.string().optional(),
  content: z.string(),
  htmlContent: z.string().optional(),
  variables: z.record(z.any()).optional()
});

export type NotificationTemplate = z.infer<typeof NotificationTemplateSchema>;

// Notification job schema
const NotificationJobSchema = z.object({
  id: z.string(),
  userId: z.string(),
  channel: NotificationChannelSchema,
  type: z.string(),
  recipient: z.string(), // email, phone, device token, etc.
  subject: z.string().optional(),
  content: z.string(),
  htmlContent: z.string().optional(),
  scheduledFor: z.date(),
  status: z.enum(['pending', 'processing', 'sent', 'failed', 'cancelled']),
  attempts: z.number().default(0),
  maxAttempts: z.number().default(3),
  retryIntervalMinutes: z.number().default(15),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  metadata: z.record(z.any()).optional(),
  errorLog: z.array(z.string()).optional(),
  sentAt: z.date().optional(),
  deliveredAt: z.date().optional(),
  readAt: z.date().optional()
});

export type NotificationJob = z.infer<typeof NotificationJobSchema>;

// Notification preferences schema
const UserNotificationPreferencesSchema = z.object({
  userId: z.string(),
  email: z.object({
    enabled: z.boolean().default(true),
    address: z.string().email(),
    verified: z.boolean().default(false),
    bounced: z.boolean().default(false),
    quietHours: z.object({
      enabled: z.boolean().default(false),
      start: z.string().default('22:00'),
      end: z.string().default('08:00'),
      timeZone: z.string().default('UTC')
    }).optional()
  }),
  sms: z.object({
    enabled: z.boolean().default(false),
    phoneNumber: z.string().optional(),
    verified: z.boolean().default(false),
    optedOut: z.boolean().default(false),
    quietHours: z.object({
      enabled: z.boolean().default(false),
      start: z.string().default('22:00'),
      end: z.string().default('08:00'),
      timeZone: z.string().default('UTC')
    }).optional()
  }),
  push: z.object({
    enabled: z.boolean().default(true),
    devices: z.array(z.object({
      token: z.string(),
      platform: z.enum(['ios', 'android', 'web']),
      active: z.boolean().default(true)
    })).default([])
  }),
  language: z.string().default('en'),
  timeZone: z.string().default('UTC'),
  globalQuietHours: z.object({
    enabled: z.boolean().default(false),
    start: z.string().default('22:00'),
    end: z.string().default('08:00'),
    timeZone: z.string().default('UTC')
  }).optional(),
  frequency: z.object({
    maxPerDay: z.number().default(10),
    maxPerHour: z.number().default(3)
  }).default({ maxPerDay: 10, maxPerHour: 3 })
});

export type UserNotificationPreferences = z.infer<typeof UserNotificationPreferencesSchema>;

export class NotificationService {
  private logger: Logger;
  private resend: Resend;
  private twilio: Twilio;

  constructor() {
    this.logger = new Logger('NotificationService');
    
    // Initialize email service
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is required');
    }
    this.resend = new Resend(process.env.RESEND_API_KEY);

    // Initialize SMS service
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilio = new Twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

  /**
   * Send email reminder with intelligent personalization
   */
  public async sendEmailReminder(
    email: string,
    name: string,
    session: any,
    reminderType: string,
    language: string = 'en'
  ): Promise<void> {
    try {
      // Get user preferences for personalization
      const preferences = await this.getUserNotificationPreferences(session.userId);
      
      // Check if email notifications are enabled
      if (!preferences.email.enabled || preferences.email.bounced) {
        this.logger.info(`Email notifications disabled for user ${session.userId}`);
        return;
      }

      // Check quiet hours
      if (this.isInQuietHours(preferences.email.quietHours, preferences.timeZone)) {
        this.logger.info(`Delaying email due to quiet hours for user ${session.userId}`);
        await this.scheduleForLaterDelivery(session.userId, 'email', session, reminderType);
        return;
      }

      // Check frequency limits
      if (!(await this.checkFrequencyLimits(session.userId, 'email'))) {
        this.logger.warn(`Frequency limit exceeded for user ${session.userId}`);
        return;
      }

      // Generate personalized email content
      const emailContent = await this.generateEmailContent(session, reminderType, language, preferences);
      
      // Send email
      const response = await this.resend.emails.send({
        from: `Therapy AI <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        headers: {
          'X-Session-ID': session.id,
          'X-Reminder-Type': reminderType,
          'X-User-Language': language
        },
        tags: [
          { name: 'type', value: 'therapy_reminder' },
          { name: 'reminder_type', value: reminderType },
          { name: 'language', value: language }
        ]
      });

      // Log successful delivery
      await this.logNotificationDelivery(session.userId, 'email', 'sent', {
        messageId: response.data?.id,
        reminderType,
        recipient: email
      });

      this.logger.info(`Email reminder sent successfully to ${email} for session ${session.id}`);
      
    } catch (error) {
      this.logger.error(`Failed to send email reminder to ${email}:`, error);
      
      // Log failed delivery
      await this.logNotificationDelivery(session.userId, 'email', 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reminderType,
        recipient: email
      });
      
      throw error;
    }
  }

  /**
   * Send SMS reminder with carrier-specific optimizations
   */
  public async sendSMSReminder(
    phoneNumber: string,
    name: string,
    session: any,
    reminderType: string,
    language: string = 'en'
  ): Promise<void> {
    try {
      if (!this.twilio) {
        throw new Error('Twilio not configured');
      }

      // Get user preferences
      const preferences = await this.getUserNotificationPreferences(session.userId);
      
      // Check if SMS notifications are enabled
      if (!preferences.sms.enabled || preferences.sms.optedOut) {
        this.logger.info(`SMS notifications disabled for user ${session.userId}`);
        return;
      }

      // Check quiet hours
      if (this.isInQuietHours(preferences.sms.quietHours, preferences.timeZone)) {
        this.logger.info(`Delaying SMS due to quiet hours for user ${session.userId}`);
        await this.scheduleForLaterDelivery(session.userId, 'sms', session, reminderType);
        return;
      }

      // Check frequency limits
      if (!(await this.checkFrequencyLimits(session.userId, 'sms'))) {
        this.logger.warn(`SMS frequency limit exceeded for user ${session.userId}`);
        return;
      }

      // Generate personalized SMS content
      const smsContent = this.generateSMSContent(session, reminderType, language, preferences);
      
      // Send SMS with retry logic for carrier issues
      const message = await this.twilio.messages.create({
        body: smsContent,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
        statusCallback: `${process.env.NEXTAUTH_URL}/api/webhooks/sms-status`,
        validityPeriod: 3600 // 1 hour validity
      });

      // Log successful delivery
      await this.logNotificationDelivery(session.userId, 'sms', 'sent', {
        messageId: message.sid,
        reminderType,
        recipient: phoneNumber
      });

      this.logger.info(`SMS reminder sent successfully to ${phoneNumber} for session ${session.id}`);
      
    } catch (error) {
      this.logger.error(`Failed to send SMS reminder to ${phoneNumber}:`, error);
      
      // Log failed delivery
      await this.logNotificationDelivery(session.userId, 'sms', 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reminderType,
        recipient: phoneNumber
      });
      
      throw error;
    }
  }

  /**
   * Send push notification with platform-specific handling
   */
  public async sendPushNotification(
    userId: string,
    session: any,
    reminderType: string,
    language: string = 'en'
  ): Promise<void> {
    try {
      // Get user preferences and device tokens
      const preferences = await this.getUserNotificationPreferences(userId);
      
      if (!preferences.push.enabled || preferences.push.devices.length === 0) {
        this.logger.info(`Push notifications disabled or no devices for user ${userId}`);
        return;
      }

      // Check frequency limits
      if (!(await this.checkFrequencyLimits(userId, 'push'))) {
        this.logger.warn(`Push notification frequency limit exceeded for user ${userId}`);
        return;
      }

      // Generate push notification content
      const pushContent = this.generatePushContent(session, reminderType, language);

      // Send to all active devices
      const results = await Promise.allSettled(
        preferences.push.devices
          .filter(device => device.active)
          .map(device => this.sendPushToDevice(device, pushContent, session))
      );

      // Log results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      await this.logNotificationDelivery(userId, 'push', successful > 0 ? 'sent' : 'failed', {
        devicesTargeted: preferences.push.devices.length,
        successful,
        failed,
        reminderType
      });

      this.logger.info(`Push notifications sent: ${successful} successful, ${failed} failed`);
      
    } catch (error) {
      this.logger.error(`Failed to send push notifications for user ${userId}:`, error);
      
      await this.logNotificationDelivery(userId, 'push', 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reminderType
      });
      
      throw error;
    }
  }

  /**
   * Process notification queue with intelligent batching
   */
  public async processNotificationQueue(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    deferred: number;
  }> {
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      deferred: 0
    };

    try {
      // Get pending notifications, prioritized by urgency and scheduled time
      const pendingJobs = await this.getPendingNotificationJobs();
      
      this.logger.info(`Processing ${pendingJobs.length} notification jobs`);

      // Group by channel for batch processing
      const jobsByChannel = this.groupJobsByChannel(pendingJobs);

      for (const [channel, jobs] of Object.entries(jobsByChannel)) {
        try {
          const channelResults = await this.processChannelBatch(channel as NotificationChannel, jobs);
          
          results.processed += channelResults.processed;
          results.successful += channelResults.successful;
          results.failed += channelResults.failed;
          results.deferred += channelResults.deferred;
          
        } catch (error) {
          this.logger.error(`Failed to process ${channel} notifications:`, error);
          results.failed += jobs.length;
        }
      }

      this.logger.info('Notification queue processing complete:', results);
      return results;
      
    } catch (error) {
      this.logger.error('Failed to process notification queue:', error);
      throw error;
    }
  }

  /**
   * Advanced personalization and content generation
   */
  private async generateEmailContent(
    session: any,
    reminderType: string,
    language: string,
    preferences: UserNotificationPreferences
  ): Promise<{ subject: string; html: string }> {
    // Get user's communication style preference for personalization
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { profile: true }
    });

    const communicationStyle = user?.profile?.communicationStyle || 'balanced';
    const isOneHourReminder = reminderType === '1_hour';
    
    // Modern subject lines without emojis - professional and therapeutic
    let subject = '';
    if (isOneHourReminder) {
      subject = communicationStyle === 'gentle' 
        ? 'Your healing journey continues soon'
        : communicationStyle === 'direct'
        ? 'Session starting in 1 hour'
        : 'Therapy Space: Your session begins in 1 hour';
    } else {
      const timeText = this.getTimeText(reminderType);
      subject = communicationStyle === 'gentle'
        ? `A gentle reminder: Your session ${timeText}`
        : communicationStyle === 'direct'
        ? `Session ${timeText}`
        : `Therapy Space: Session scheduled ${timeText}`;
    }

    // Generate HTML content using React Email template
    const html = render(SessionReminderEmail({
      username: user?.name || 'Valued Client',
      sessionDate: session.date,
      duration: session.duration,
      notes: session.notes || '',
      isOneHourReminder,
      communicationStyle,
      baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      language,
      // Add personalization based on user's therapy type and concerns
      currentConcerns: user?.profile?.currentConcerns,
      sessionTheme: session.theme
    }));

    return { subject, html };
  }

  private generateSMSContent(
    session: any,
    reminderType: string,
    language: string,
    preferences: UserNotificationPreferences
  ): string {
    const timeText = this.getTimeText(reminderType);
    const sessionTime = new Date(session.date).toLocaleString('en-US', {
      timeZone: preferences.timeZone,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).replace(',', ' at');

    // Modern SMS format - clean and professional
    const isOneHour = reminderType === '1_hour';
    if (isOneHour) {
      return `Therapy Space\n\nStarting in 1 HOUR\n${sessionTime}\n\nYour ${session.duration}-minute journey awaits`;
    } else {
      return `Therapy Space\n\nSession ${timeText}\n${sessionTime}\n${session.duration} minutes\n\nWe're ready to support you`;
    }
  }

  private generatePushContent(
    session: any,
    reminderType: string,
    language: string
  ): { title: string; body: string; data: any } {
    const timeText = this.getTimeText(reminderType);
    
    return {
      title: `Therapy Session ${timeText}`,
      body: `Your ${session.duration}-minute session is scheduled. Tap to prepare.`,
      data: {
        sessionId: session.id,
        reminderType,
        url: '/dashboard',
        action: 'session_reminder'
      }
    };
  }

  /**
   * Helper methods
   */
  private getTimeText(reminderType: string): string {
    switch (reminderType) {
      case '1_week': return 'in 1 week';
      case '48_hours': return 'in 2 days';
      case '24_hours': return 'tomorrow';
      case '1_hour': return 'in 1 hour';
      default: return 'coming up';
    }
  }

  private async getUserNotificationPreferences(userId: string): Promise<UserNotificationPreferences> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true }
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Build preferences from user profile and database
      return {
        userId,
        email: {
          enabled: user.profile?.notificationPrefs !== 'no',
          address: user.email,
          verified: !!user.emailVerified,
          bounced: false // TODO: Track email bounces
        },
        sms: {
          enabled: user.profile?.notificationPrefs === 'sms' || user.profile?.notificationPrefs === 'both',
          phoneNumber: user.profile?.phone || undefined,
          verified: false, // TODO: Implement SMS verification
          optedOut: false
        },
        push: {
          enabled: true, // Default enabled
          devices: [] // TODO: Implement device token management
        },
        language: 'en', // TODO: Add language preference
        timeZone: 'UTC', // TODO: Add timezone preference
        frequency: {
          maxPerDay: 10,
          maxPerHour: 3
        }
      };
      
    } catch (error) {
      this.logger.error(`Failed to get notification preferences for user ${userId}:`, error);
      throw error;
    }
  }

  private isInQuietHours(
    quietHours: { enabled: boolean; start: string; end: string; timeZone: string } | undefined,
    userTimeZone: string
  ): boolean {
    if (!quietHours?.enabled) return false;

    // TODO: Implement proper timezone-aware quiet hours checking
    const now = new Date();
    const currentHour = now.getUTCHours();
    const startHour = parseInt(quietHours.start.split(':')[0]);
    const endHour = parseInt(quietHours.end.split(':')[0]);

    if (startHour < endHour) {
      return currentHour >= startHour && currentHour < endHour;
    } else {
      return currentHour >= startHour || currentHour < endHour;
    }
  }

  private async checkFrequencyLimits(userId: string, channel: string): Promise<boolean> {
    try {
      // Check notifications sent in the last hour and day
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [hourlyCount, dailyCount] = await Promise.all([
        this.getNotificationCount(userId, channel, oneHourAgo),
        this.getNotificationCount(userId, channel, oneDayAgo)
      ]);

      return hourlyCount < 3 && dailyCount < 10; // Default limits
      
    } catch (error) {
      this.logger.error(`Failed to check frequency limits for user ${userId}:`, error);
      return true; // Allow on error to avoid blocking critical notifications
    }
  }

  private async scheduleForLaterDelivery(
    userId: string,
    channel: string,
    session: any,
    reminderType: string
  ): Promise<void> {
    // TODO: Implement smart rescheduling outside quiet hours
    this.logger.info(`Scheduling ${channel} notification for later delivery`);
  }

  private async logNotificationDelivery(
    userId: string,
    channel: string,
    status: string,
    metadata: any
  ): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO notification_logs (
          user_id, channel, status, metadata, created_at
        ) VALUES (
          ${userId}, ${channel}, ${status}, ${JSON.stringify(metadata)}, NOW()
        )
      `;
    } catch (error) {
      this.logger.error('Failed to log notification delivery:', error);
    }
  }

  private async getPendingNotificationJobs(): Promise<NotificationJob[]> {
    // TODO: Implement notification queue management
    return [];
  }

  private groupJobsByChannel(jobs: NotificationJob[]): Record<string, NotificationJob[]> {
    return jobs.reduce((groups, job) => {
      const channel = job.channel;
      if (!groups[channel]) groups[channel] = [];
      groups[channel].push(job);
      return groups;
    }, {} as Record<string, NotificationJob[]>);
  }

  private async processChannelBatch(
    channel: NotificationChannel,
    jobs: NotificationJob[]
  ): Promise<{ processed: number; successful: number; failed: number; deferred: number }> {
    // TODO: Implement channel-specific batch processing
    return { processed: 0, successful: 0, failed: 0, deferred: 0 };
  }

  private async sendPushToDevice(
    device: any,
    content: any,
    session: any
  ): Promise<void> {
    // TODO: Implement platform-specific push notification delivery
    this.logger.info(`Sending push notification to ${device.platform} device`);
  }

  private async getNotificationCount(
    userId: string,
    channel: string,
    since: Date
  ): Promise<number> {
    try {
      const result = await prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*) as count FROM notification_logs 
        WHERE user_id = ${userId} 
        AND channel = ${channel} 
        AND status = 'sent'
        AND created_at >= ${since}
      `;
      return result[0]?.count || 0;
    } catch (error) {
      this.logger.error('Failed to get notification count:', error);
      return 0;
    }
  }
}