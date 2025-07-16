/**
 * Real-time Notification System using Supabase Realtime
 * Based on 2024 best practices for Next.js and Supabase integration
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase-singleton';

export interface RealtimeNotification {
  id: string;
  type: 'reminder' | 'completion' | 'update' | 'alert';
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  userId: string;
  sessionId?: string;
  createdAt: string;
  readAt?: string;
}

export class NotificationRealtimeService {
  private channel: RealtimeChannel | null = null;
  private userId: string | null = null;

  /**
   * Initialize real-time notifications for a user
   */
  async initialize(userId: string) {
    this.userId = userId;

    // Clean up existing channel if any
    if (this.channel) {
      await this.cleanup();
    }

    // Create a new channel for this user's notifications
    const supabase = getSupabaseClient();
    this.channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'Notification',
          filter: `userId=eq.${userId}`
        },
        (payload: RealtimePostgresChangesPayload<RealtimeNotification>) => {
          this.handleNotificationChange(payload);
        }
      )
      .subscribe();

    return this.channel;
  }

  /**
   * Handle real-time notification changes
   */
  private handleNotificationChange(
    payload: RealtimePostgresChangesPayload<RealtimeNotification>
  ) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
        this.onNotificationCreated(newRecord as RealtimeNotification);
        break;
      case 'UPDATE':
        this.onNotificationUpdated(
          newRecord as RealtimeNotification,
          oldRecord as RealtimeNotification
        );
        break;
      case 'DELETE':
        this.onNotificationDeleted(oldRecord as RealtimeNotification);
        break;
    }
  }

  /**
   * Callback handlers for notification events
   */
  private onNotificationCreated(notification: RealtimeNotification) {
    // Emit custom event for the UI to handle
    window.dispatchEvent(
      new CustomEvent('notification:created', {
        detail: notification
      })
    );

    // Show browser notification if permitted and high priority
    if (notification.priority === 'urgent' || notification.priority === 'high') {
      this.showBrowserNotification(notification);
    }
  }

  private onNotificationUpdated(
    newNotification: RealtimeNotification,
    oldNotification: RealtimeNotification
  ) {
    // Check if notification was just read
    if (!oldNotification.readAt && newNotification.readAt) {
      window.dispatchEvent(
        new CustomEvent('notification:read', {
          detail: newNotification
        })
      );
    }

    // General update event
    window.dispatchEvent(
      new CustomEvent('notification:updated', {
        detail: { old: oldNotification, new: newNotification }
      })
    );
  }

  private onNotificationDeleted(notification: RealtimeNotification) {
    window.dispatchEvent(
      new CustomEvent('notification:deleted', {
        detail: notification
      })
    );
  }

  /**
   * Show browser notification (requires permission)
   */
  private async showBrowserNotification(notification: RealtimeNotification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent',
        silent: false,
        data: { notificationId: notification.id }
      });

      browserNotification.onclick = () => {
        window.focus();
        // Emit click event
        window.dispatchEvent(
          new CustomEvent('notification:clicked', {
            detail: notification
          })
        );
        browserNotification.close();
      };
    }
  }

  /**
   * Request browser notification permission
   */
  static async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window && Notification.permission === 'default') {
      return await Notification.requestPermission();
    }
    return Notification.permission;
  }

  /**
   * Subscribe to notification events in React components
   */
  static subscribeToEvents(
    eventHandlers: {
      onCreate?: (notification: RealtimeNotification) => void;
      onUpdate?: (data: { old: RealtimeNotification; new: RealtimeNotification }) => void;
      onDelete?: (notification: RealtimeNotification) => void;
      onClick?: (notification: RealtimeNotification) => void;
      onRead?: (notification: RealtimeNotification) => void;
    }
  ): () => void {
    const handlers: Array<{ event: string; handler: EventListener }> = [];

    if (eventHandlers.onCreate) {
      const handler = (e: Event) => {
        const customEvent = e as CustomEvent<RealtimeNotification>;
        eventHandlers.onCreate!(customEvent.detail);
      };
      handlers.push({ event: 'notification:created', handler });
      window.addEventListener('notification:created', handler);
    }

    if (eventHandlers.onUpdate) {
      const handler = (e: Event) => {
        const customEvent = e as CustomEvent<{ old: RealtimeNotification; new: RealtimeNotification }>;
        eventHandlers.onUpdate!(customEvent.detail);
      };
      handlers.push({ event: 'notification:updated', handler });
      window.addEventListener('notification:updated', handler);
    }

    if (eventHandlers.onDelete) {
      const handler = (e: Event) => {
        const customEvent = e as CustomEvent<RealtimeNotification>;
        eventHandlers.onDelete!(customEvent.detail);
      };
      handlers.push({ event: 'notification:deleted', handler });
      window.addEventListener('notification:deleted', handler);
    }

    if (eventHandlers.onClick) {
      const handler = (e: Event) => {
        const customEvent = e as CustomEvent<RealtimeNotification>;
        eventHandlers.onClick!(customEvent.detail);
      };
      handlers.push({ event: 'notification:clicked', handler });
      window.addEventListener('notification:clicked', handler);
    }

    if (eventHandlers.onRead) {
      const handler = (e: Event) => {
        const customEvent = e as CustomEvent<RealtimeNotification>;
        eventHandlers.onRead!(customEvent.detail);
      };
      handlers.push({ event: 'notification:read', handler });
      window.addEventListener('notification:read', handler);
    }

    // Return cleanup function
    return () => {
      handlers.forEach(({ event, handler }) => {
        window.removeEventListener(event, handler);
      });
    };
  }

  /**
   * Clean up real-time subscription
   */
  async cleanup() {
    if (this.channel) {
      const supabase = getSupabaseClient();
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  /**
   * Get channel status
   */
  getStatus() {
    return this.channel?.state;
  }
}

// Export singleton instance
export const notificationRealtime = new NotificationRealtimeService();