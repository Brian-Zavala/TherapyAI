/**
 * Notification Worker
 * Background processing for scheduled notifications using Next.js API routes
 * This would typically run as a cron job or scheduled task
 */

import { prisma } from '@/lib/prisma';
import { EnhancedReminderEngine } from '@/lib/enhanced-scheduler/reminder-engine';

interface ProcessResult {
  processedCount: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ notificationId: string; error: string }>;
}

export class NotificationWorker {
  private reminderEngine: EnhancedReminderEngine;

  constructor() {
    this.reminderEngine = new EnhancedReminderEngine();
  }

  /**
   * Process all pending notifications
   */
  async processPendingNotifications(): Promise<ProcessResult> {
    const result: ProcessResult = {
      processedCount: 0,
      successCount: 0,
      failureCount: 0,
      errors: []
    };

    try {
      // Find all pending notifications that should be sent now
      const pendingNotifications = await prisma.notification.findMany({
        where: {
          deliveryStatus: 'pending',
          scheduledFor: {
            lte: new Date() // Scheduled for now or past
          }
        },
        include: {
          user: {
            include: {
              profile: true
            }
          },
          session: true
        },
        orderBy: [
          { priority: 'desc' }, // Process urgent/high priority first
          { scheduledFor: 'asc' }
        ],
        take: 100 // Process in batches
      });

      console.log(`Found ${pendingNotifications.length} pending notifications to process`);

      // Process each notification
      for (const notification of pendingNotifications) {
        result.processedCount++;

        try {
          await this.processNotification(notification);
          result.successCount++;
        } catch (error: any) {
          result.failureCount++;
          result.errors.push({
            notificationId: notification.id,
            error: error.message
          });
          console.error(`Failed to process notification ${notification.id}:`, error);
        }
      }

      // Process reminder checks for upcoming sessions
      await this.checkUpcomingSessionReminders();

    } catch (error) {
      console.error('Failed to process pending notifications:', error);
      throw error;
    }

    return result;
  }

  /**
   * Process a single notification
   */
  private async processNotification(notification: any): Promise<void> {
    const { user, session } = notification;

    if (!user) {
      throw new Error('User not found for notification');
    }

    // Determine delivery method based on user preferences
    const notificationPrefs = user.profile?.notificationPrefs || 'email';
    const deliveryMethods = notificationPrefs.split(',').map((m: string) => m.trim());

    // Try each delivery method in order of preference
    let delivered = false;
    let lastError = null;

    for (const method of deliveryMethods) {
      try {
        await this.sendNotification(notification, method);
        delivered = true;
        break;
      } catch (error: any) {
        lastError = error;
        console.error(`Failed to send via ${method}:`, error.message);
      }
    }

    if (!delivered && lastError) {
      throw lastError;
    }

    // Update notification status
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        deliveryStatus: delivered ? 'sent' : 'failed',
        sentAt: delivered ? new Date() : null,
        deliveryAttempts: { increment: 1 }
      }
    });
  }

  /**
   * Send notification via specified method
   */
  private async sendNotification(notification: any, method: string): Promise<void> {
    const apiUrl = `${process.env.NEXTAUTH_URL}/api/reminders/send`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}` // Internal API key for worker
      },
      body: JSON.stringify({
        notificationId: notification.id,
        userId: notification.userId,
        sessionId: notification.sessionId,
        method,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send notification: ${error}`);
    }
  }

  /**
   * Check for upcoming sessions that need reminders
   */
  private async checkUpcomingSessionReminders(): Promise<void> {
    try {
      // Find sessions that need reminders
      const upcomingSessions = await prisma.session.findMany({
        where: {
          status: 'scheduled',
          date: {
            gte: new Date(),
            lte: new Date(Date.now() + 48 * 60 * 60 * 1000) // Next 48 hours
          },
          reminderSent: false
        },
        include: {
          user: {
            include: {
              profile: true
            }
          }
        }
      });

      console.log(`Found ${upcomingSessions.length} upcoming sessions to check for reminders`);

      for (const session of upcomingSessions) {
        try {
          const userPrefs = session.user.profile;
          if (!userPrefs?.reminderTiming) continue;

          // Calculate reminder timings
          const reminderTimings = this.reminderEngine.calculateReminderTimings(
            session.date,
            {
              sessionPreference: userPrefs.sessionPreference || 'couple',
              preferredDays: userPrefs.preferredDays || [],
              sessionFrequency: userPrefs.sessionFrequency || 'weekly',
              recurringSession: userPrefs.recurringSession || 'no',
              reminderTiming: userPrefs.reminderTiming,
              timeZone: userPrefs.timeZone || 'UTC',
              communicationStyle: userPrefs.communicationStyle || 'supportive',
              therapyType: userPrefs.therapyType || 'couple'
            }
          );

          // Check if any reminder should be sent now
          const now = new Date();
          for (const timing of reminderTimings) {
            if (timing.sendAt <= now && !timing.sent) {
              // Create notification for this reminder
              await prisma.notification.create({
                data: {
                  userId: session.userId,
                  sessionId: session.id,
                  type: 'reminder',
                  title: timing.title,
                  message: timing.message,
                  priority: timing.priority as any,
                  deliveryMethod: userPrefs.notificationPrefs || 'email',
                  deliveryStatus: 'pending',
                  scheduledFor: timing.sendAt
                }
              });

              console.log(`Created reminder notification for session ${session.id} at ${timing.type}`);
            }
          }

          // Mark session as having reminders scheduled
          await prisma.session.update({
            where: { id: session.id },
            data: { reminderSent: true }
          });

        } catch (error) {
          console.error(`Failed to process reminders for session ${session.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to check upcoming session reminders:', error);
    }
  }

  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.notification.deleteMany({
        where: {
          AND: [
            { createdAt: { lt: cutoffDate } },
            { deliveryStatus: { in: ['delivered', 'failed'] } },
            { readAt: { not: null } }
          ]
        }
      });

      console.log(`Cleaned up ${result.count} old notifications`);
      return result.count;
    } catch (error) {
      console.error('Failed to cleanup old notifications:', error);
      throw error;
    }
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotifications(maxRetries: number = 3): Promise<ProcessResult> {
    const result: ProcessResult = {
      processedCount: 0,
      successCount: 0,
      failureCount: 0,
      errors: []
    };

    try {
      const failedNotifications = await prisma.notification.findMany({
        where: {
          deliveryStatus: 'failed',
          deliveryAttempts: { lt: maxRetries }
        },
        include: {
          user: {
            include: {
              profile: true
            }
          },
          session: true
        },
        orderBy: {
          priority: 'desc'
        },
        take: 50
      });

      console.log(`Found ${failedNotifications.length} failed notifications to retry`);

      for (const notification of failedNotifications) {
        result.processedCount++;

        try {
          await this.processNotification(notification);
          result.successCount++;
        } catch (error: any) {
          result.failureCount++;
          result.errors.push({
            notificationId: notification.id,
            error: error.message
          });
        }
      }
    } catch (error) {
      console.error('Failed to retry notifications:', error);
      throw error;
    }

    return result;
  }
}

// Export singleton instance
export const notificationWorker = new NotificationWorker();