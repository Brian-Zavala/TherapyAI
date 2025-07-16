/**
 * Notification Service - Wrapper for enhanced scheduler notification service
 * Re-exports the notification service from enhanced-scheduler for backward compatibility
 */

import { NotificationService } from '@/lib/enhanced-scheduler/notification-service';

// Create singleton instance
export const notificationService = new NotificationService();

// Re-export types and class for imports that need them
export { NotificationService } from '@/lib/enhanced-scheduler/notification-service';
export type { 
  NotificationTemplate, 
  NotificationJob, 
  UserNotificationPreferences 
} from '@/lib/enhanced-scheduler/notification-service';