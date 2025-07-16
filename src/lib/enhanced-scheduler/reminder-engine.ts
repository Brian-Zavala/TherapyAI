/**
 * Enterprise-Grade Reminder Engine
 * Handles sophisticated reminder timing based on user preferences
 * Supports multiple notification channels with retry mechanisms
 */

import { prisma } from '@/lib/prisma-optimized';
import { Logger } from './logging';
import { NotificationService } from './notification-service';
import { CalendarIntegrationService } from './calendar-integration';
import { z } from 'zod';

// Enhanced reminder timing configuration schema
const ReminderTimingSchema = z.object({
  type: z.enum(['24_hours', '48_hours', '1_week', '1_hour', 'custom']),
  offsetMinutes: z.number().optional(),
  channels: z.array(z.enum(['email', 'sms', 'push', 'calendar'])),
  retryAttempts: z.number().default(3),
  retryIntervalMinutes: z.number().default(15),
  timeZone: z.string().default('UTC'),
  businessHoursOnly: z.boolean().default(false)
});

export type ReminderTiming = z.infer<typeof ReminderTimingSchema>;

// User notification preferences schema
const NotificationPreferencesSchema = z.object({
  enabled: z.boolean().default(true),
  email: z.boolean().default(true),
  sms: z.boolean().default(false),
  push: z.boolean().default(true),
  calendar: z.boolean().default(true),
  quietHours: z.object({
    start: z.string().default('22:00'),
    end: z.string().default('08:00'),
    timeZone: z.string().default('UTC')
  }).optional(),
  businessHoursOnly: z.boolean().default(false),
  language: z.string().default('en'),
  customTimings: z.array(ReminderTimingSchema).optional()
});

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

// Session reminder job schema
const ReminderJobSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  userId: z.string(),
  scheduledFor: z.date(),
  type: z.enum(['24_hours', '48_hours', '1_week', '1_hour', 'custom']),
  channels: z.array(z.string()),
  status: z.enum(['pending', 'processing', 'sent', 'failed', 'cancelled']),
  attempts: z.number().default(0),
  maxAttempts: z.number().default(3),
  lastAttempt: z.date().optional(),
  errorLog: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

export type ReminderJob = z.infer<typeof ReminderJobSchema>;

export class EnhancedReminderEngine {
  private logger: Logger;
  private notificationService: NotificationService;
  private calendarService: CalendarIntegrationService;

  constructor() {
    this.logger = new Logger('ReminderEngine');
    this.notificationService = new NotificationService();
    this.calendarService = new CalendarIntegrationService();
  }

  /**
   * Enhanced reminder timing calculation based on user preferences
   */
  public calculateReminderTimings(
    sessionDate: Date,
    userPreferences: NotificationPreferences,
    sessionTimeZone: string = 'UTC'
  ): ReminderTiming[] {
    const timings: ReminderTiming[] = [];
    
    // Parse user's reminder timing preference from onboarding
    const reminderPreference = userPreferences.customTimings || [];
    
    // Default enterprise-grade reminder schedule if no custom preferences
    if (reminderPreference.length === 0) {
      // Standard business reminders
      timings.push(
        {
          type: '1_week',
          offsetMinutes: 7 * 24 * 60, // 1 week
          channels: userPreferences.email ? ['email'] : [],
          retryAttempts: 2,
          retryIntervalMinutes: 60,
          timeZone: sessionTimeZone,
          businessHoursOnly: userPreferences.businessHoursOnly
        },
        {
          type: '48_hours',
          offsetMinutes: 48 * 60, // 48 hours
          channels: this.getActiveChannels(userPreferences),
          retryAttempts: 3,
          retryIntervalMinutes: 30,
          timeZone: sessionTimeZone,
          businessHoursOnly: userPreferences.businessHoursOnly
        },
        {
          type: '24_hours',
          offsetMinutes: 24 * 60, // 24 hours
          channels: this.getActiveChannels(userPreferences),
          retryAttempts: 3,
          retryIntervalMinutes: 15,
          timeZone: sessionTimeZone,
          businessHoursOnly: userPreferences.businessHoursOnly
        },
        {
          type: '1_hour',
          offsetMinutes: 60, // 1 hour
          channels: userPreferences.sms ? ['sms', 'push'] : ['push'],
          retryAttempts: 2,
          retryIntervalMinutes: 5,
          timeZone: sessionTimeZone,
          businessHoursOnly: false // Critical reminder, always send
        }
      );
    } else {
      // Use custom user preferences
      timings.push(...reminderPreference);
    }

    // Filter based on quiet hours
    return timings.filter(timing => 
      this.isWithinAllowedHours(
        this.calculateReminderTime(sessionDate, timing.offsetMinutes!),
        userPreferences,
        timing.timeZone
      )
    );
  }

  /**
   * Create reminder jobs for a session
   */
  public async createReminderJobs(
    sessionId: string,
    userId: string,
    sessionDate: Date,
    sessionTimeZone: string = 'UTC'
  ): Promise<ReminderJob[]> {
    try {
      // Get user's notification preferences
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true }
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Parse user preferences
      const preferences: NotificationPreferences = {
        enabled: user.profile?.notificationPrefs !== 'no',
        email: user.profile?.notificationPrefs === 'email' || user.profile?.notificationPrefs === 'both',
        sms: user.profile?.notificationPrefs === 'sms' || user.profile?.notificationPrefs === 'both',
        push: true, // Default enabled
        calendar: true, // Default enabled
        quietHours: {
          start: '22:00',
          end: '08:00',
          timeZone: sessionTimeZone
        },
        businessHoursOnly: user.profile?.sessionPreference === 'business_hours',
        language: 'en', // TODO: Add language preference to profile
        customTimings: this.parseCustomReminderTimings(user.profile?.reminderTiming)
      };

      if (!preferences.enabled) {
        this.logger.info(`Notifications disabled for user ${userId}`);
        return [];
      }

      // Calculate reminder timings
      const timings = this.calculateReminderTimings(sessionDate, preferences, sessionTimeZone);
      
      // Create reminder jobs
      const jobs: ReminderJob[] = [];
      
      for (const timing of timings) {
        const reminderTime = this.calculateReminderTime(sessionDate, timing.offsetMinutes!);
        
        // Only create jobs for future reminders
        if (reminderTime > new Date()) {
          const job: ReminderJob = {
            id: `reminder_${sessionId}_${timing.type}_${Date.now()}`,
            sessionId,
            userId,
            scheduledFor: reminderTime,
            type: timing.type,
            channels: timing.channels,
            status: 'pending',
            attempts: 0,
            maxAttempts: timing.retryAttempts,
            metadata: {
              timeZone: timing.timeZone,
              businessHoursOnly: timing.businessHoursOnly,
              originalSessionDate: sessionDate.toISOString(),
              language: preferences.language
            }
          };

          jobs.push(job);
        }
      }

      // Store jobs in database
      await this.storeReminderJobs(jobs);
      
      this.logger.info(`Created ${jobs.length} reminder jobs for session ${sessionId}`);
      return jobs;
      
    } catch (error) {
      this.logger.error(`Failed to create reminder jobs for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Process pending reminder jobs
   */
  public async processReminderJobs(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: Array<{ jobId: string; error: string }>;
  }> {
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ jobId: string; error: string }>
    };

    try {
      // Get pending jobs that are due
      const currentTime = new Date();
      const dueJobs = await this.getPendingReminderJobs(currentTime);
      
      this.logger.info(`Processing ${dueJobs.length} due reminder jobs`);
      
      for (const job of dueJobs) {
        results.processed++;
        
        try {
          await this.processReminderJob(job);
          results.successful++;
          
        } catch (error) {
          results.failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push({ jobId: job.id, error: errorMessage });
          
          // Update job with failure
          await this.updateReminderJobStatus(job.id, 'failed', errorMessage);
        }
      }
      
      this.logger.info(`Reminder processing complete:`, results);
      return results;
      
    } catch (error) {
      this.logger.error('Failed to process reminder jobs:', error);
      throw error;
    }
  }

  /**
   * Process individual reminder job
   */
  private async processReminderJob(job: ReminderJob): Promise<void> {
    try {
      // Update job status to processing
      await this.updateReminderJobStatus(job.id, 'processing');
      
      // Get session and user details
      const session = await prisma.session.findUnique({
        where: { id: job.sessionId },
        include: { user: true }
      });

      if (!session) {
        throw new Error(`Session ${job.sessionId} not found`);
      }

      // Check if session is still valid for reminders
      if (['cancelled', 'completed'].includes(session.status)) {
        await this.updateReminderJobStatus(job.id, 'cancelled', 'Session no longer active');
        return;
      }

      // Send notifications through specified channels
      const notificationResults = await Promise.allSettled(
        job.channels.map(channel => 
          this.sendNotification(channel, session, job)
        )
      );

      // Check if any notifications succeeded
      const hasSuccess = notificationResults.some(result => result.status === 'fulfilled');
      
      if (hasSuccess) {
        await this.updateReminderJobStatus(job.id, 'sent');
        
        // Update session reminder flags for backward compatibility
        await this.updateSessionReminderFlags(session.id, job.type);
        
      } else {
        // All notifications failed, schedule retry if attempts remaining
        if (job.attempts < job.maxAttempts) {
          await this.scheduleRetry(job);
        } else {
          const errors = notificationResults
            .filter(r => r.status === 'rejected')
            .map(r => (r as PromiseRejectedResult).reason.message)
            .join('; ');
          
          await this.updateReminderJobStatus(job.id, 'failed', `All channels failed: ${errors}`);
        }
      }
      
    } catch (error) {
      this.logger.error(`Failed to process reminder job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Send notification through specific channel
   */
  private async sendNotification(
    channel: string,
    session: any,
    job: ReminderJob
  ): Promise<void> {
    const user = session.user;
    const metadata = job.metadata || {};
    
    switch (channel) {
      case 'email':
        await this.notificationService.sendEmailReminder(
          user.email,
          user.name || 'Valued Client',
          session,
          job.type,
          metadata.language || 'en'
        );
        break;
        
      case 'sms':
        if (user.profile?.phone) {
          await this.notificationService.sendSMSReminder(
            user.profile.phone,
            user.name || 'Client',
            session,
            job.type,
            metadata.language || 'en'
          );
        }
        break;
        
      case 'push':
        await this.notificationService.sendPushNotification(
          user.id,
          session,
          job.type,
          metadata.language || 'en'
        );
        break;
        
      case 'calendar':
        await this.calendarService.updateCalendarEvent(
          user.id,
          session,
          job.type
        );
        break;
        
      default:
        throw new Error(`Unknown notification channel: ${channel}`);
    }
  }

  /**
   * Helper methods
   */
  private getActiveChannels(preferences: NotificationPreferences): string[] {
    const channels: string[] = [];
    
    if (preferences.email) channels.push('email');
    if (preferences.sms) channels.push('sms');
    if (preferences.push) channels.push('push');
    if (preferences.calendar) channels.push('calendar');
    
    return channels;
  }

  private calculateReminderTime(sessionDate: Date, offsetMinutes: number): Date {
    return new Date(sessionDate.getTime() - (offsetMinutes * 60 * 1000));
  }

  private isWithinAllowedHours(
    reminderTime: Date,
    preferences: NotificationPreferences,
    timeZone: string
  ): boolean {
    if (!preferences.quietHours) return true;
    
    // TODO: Implement proper time zone checking
    // For now, assume UTC
    const hour = reminderTime.getUTCHours();
    const quietStart = parseInt(preferences.quietHours.start.split(':')[0]);
    const quietEnd = parseInt(preferences.quietHours.end.split(':')[0]);
    
    if (quietStart < quietEnd) {
      return hour < quietStart || hour >= quietEnd;
    } else {
      return hour >= quietEnd && hour < quietStart;
    }
  }

  private parseCustomReminderTimings(reminderTiming: string | null): ReminderTiming[] {
    if (!reminderTiming) return [];
    
    // Map onboarding preferences to reminder timings
    switch (reminderTiming) {
      case '24 hours before':
        return [{
          type: '24_hours',
          offsetMinutes: 24 * 60,
          channels: ['email'],
          retryAttempts: 3,
          retryIntervalMinutes: 15,
          timeZone: 'UTC',
          businessHoursOnly: false
        }];
        
      case '48 hours before':
        return [{
          type: '48_hours',
          offsetMinutes: 48 * 60,
          channels: ['email'],
          retryAttempts: 3,
          retryIntervalMinutes: 30,
          timeZone: 'UTC',
          businessHoursOnly: false
        }];
        
      case '1 week before':
        return [{
          type: '1_week',
          offsetMinutes: 7 * 24 * 60,
          channels: ['email'],
          retryAttempts: 2,
          retryIntervalMinutes: 60,
          timeZone: 'UTC',
          businessHoursOnly: false
        }];
        
      case 'Both 24 hours and 1 hour before':
        return [
          {
            type: '24_hours',
            offsetMinutes: 24 * 60,
            channels: ['email'],
            retryAttempts: 3,
            retryIntervalMinutes: 15,
            timeZone: 'UTC',
            businessHoursOnly: false
          },
          {
            type: '1_hour',
            offsetMinutes: 60,
            channels: ['sms', 'push'],
            retryAttempts: 2,
            retryIntervalMinutes: 5,
            timeZone: 'UTC',
            businessHoursOnly: false
          }
        ];
        
      default:
        return [];
    }
  }

  // Database operations
  private async storeReminderJobs(jobs: ReminderJob[]): Promise<void> {
    // Store in a dedicated reminder_jobs table
    // Implementation depends on your database schema
    // For now, we'll extend the existing session model or create a new table
    
    for (const job of jobs) {
      await prisma.$executeRaw`
        INSERT INTO reminder_jobs (
          id, session_id, user_id, scheduled_for, type, channels, 
          status, attempts, max_attempts, metadata, created_at
        ) VALUES (
          ${job.id}, ${job.sessionId}, ${job.userId}, ${job.scheduledFor},
          ${job.type}, ${JSON.stringify(job.channels)}, ${job.status},
          ${job.attempts}, ${job.maxAttempts}, ${JSON.stringify(job.metadata)},
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          scheduled_for = EXCLUDED.scheduled_for,
          channels = EXCLUDED.channels,
          metadata = EXCLUDED.metadata
      `;
    }
  }

  private async getPendingReminderJobs(currentTime: Date): Promise<ReminderJob[]> {
    // Get jobs that are due for processing
    const results = await prisma.$queryRaw<any[]>`
      SELECT * FROM reminder_jobs 
      WHERE status IN ('pending', 'processing') 
      AND scheduled_for <= ${currentTime}
      AND attempts < max_attempts
      ORDER BY scheduled_for ASC
      LIMIT 100
    `;

    return results.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      userId: row.user_id,
      scheduledFor: new Date(row.scheduled_for),
      type: row.type,
      channels: JSON.parse(row.channels),
      status: row.status,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      lastAttempt: row.last_attempt ? new Date(row.last_attempt) : undefined,
      errorLog: row.error_log ? JSON.parse(row.error_log) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));
  }

  private async updateReminderJobStatus(
    jobId: string, 
    status: ReminderJob['status'], 
    error?: string
  ): Promise<void> {
    await prisma.$executeRaw`
      UPDATE reminder_jobs 
      SET 
        status = ${status},
        attempts = attempts + 1,
        last_attempt = NOW(),
        error_log = CASE 
          WHEN ${error} IS NOT NULL THEN 
            COALESCE(error_log, '[]'::jsonb) || ${JSON.stringify([error])}::jsonb
          ELSE error_log
        END,
        updated_at = NOW()
      WHERE id = ${jobId}
    `;
  }

  private async scheduleRetry(job: ReminderJob): Promise<void> {
    const retryTime = new Date(Date.now() + (15 * 60 * 1000)); // 15 minutes from now
    
    await prisma.$executeRaw`
      UPDATE reminder_jobs 
      SET 
        status = 'pending',
        scheduled_for = ${retryTime},
        updated_at = NOW()
      WHERE id = ${job.id}
    `;
  }

  private async updateSessionReminderFlags(sessionId: string, reminderType: string): Promise<void> {
    // Update legacy reminder flags for backward compatibility
    const updates: Record<string, boolean> = {};
    
    switch (reminderType) {
      case '24_hours':
        updates.emailReminderSent = true;
        break;
      case '1_hour':
        updates.oneHourReminderSent = true;
        break;
    }
    
    if (Object.keys(updates).length > 0) {
      await prisma.session.update({
        where: { id: sessionId },
        data: updates
      });
    }
  }
}