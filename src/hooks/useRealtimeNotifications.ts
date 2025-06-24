'use client';

/**
 * React Hook for Real-time Notifications
 * Implements 2025 best practices for Next.js 15 with Supabase Realtime
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { notificationRealtime, RealtimeNotification } from '@/lib/realtime/notification-realtime';

interface UseRealtimeNotificationsOptions {
  playSound?: boolean;
  showBrowserNotifications?: boolean;
  autoMarkAsRead?: boolean;
  onNotificationReceived?: (notification: RealtimeNotification) => void;
}

interface NotificationState {
  notifications: RealtimeNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
}

export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const { data: session } = useSession();
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    loading: true,
    error: null,
    isConnected: false
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasInitialized = useRef(false);

  // Initialize audio for notification sounds
  useEffect(() => {
    if (options.playSound && typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/notification.mp3');
      audioRef.current.volume = 0.5;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, [options.playSound]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (audioRef.current && options.playSound) {
      audioRef.current.play().catch(err => {
        console.error('Failed to play notification sound:', err);
      });
    }
  }, [options.playSound]);

  // Trigger haptic feedback (for mobile devices)
  const triggerHapticFeedback = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]); // Vibrate pattern
    }
  }, []);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch('/api/notifications?limit=50');
      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        notifications: data.notifications || [],
        unreadCount: data.summary?.unreadCount || 0,
        loading: false
      }));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to load notifications',
        loading: false
      }));
    }
  }, [session?.user?.id]);

  // Handle real-time notification events
  const handleNotificationCreated = useCallback((notification: RealtimeNotification) => {
    setState(prev => ({
      ...prev,
      notifications: [notification, ...prev.notifications],
      unreadCount: prev.unreadCount + 1
    }));

    // Play sound and haptic feedback
    playNotificationSound();
    triggerHapticFeedback();

    // Call custom handler
    options.onNotificationReceived?.(notification);
  }, [playNotificationSound, triggerHapticFeedback, options]);

  const handleNotificationUpdated = useCallback((data: { old: RealtimeNotification; new: RealtimeNotification }) => {
    setState(prev => {
      const newNotifications = prev.notifications.map(n => 
        n.id === data.new.id ? data.new : n
      );

      // Update unread count if notification was marked as read
      let newUnreadCount = prev.unreadCount;
      if (!data.old.readAt && data.new.readAt) {
        newUnreadCount = Math.max(0, prev.unreadCount - 1);
      }

      return {
        ...prev,
        notifications: newNotifications,
        unreadCount: newUnreadCount
      };
    });
  }, []);

  const handleNotificationDeleted = useCallback((notification: RealtimeNotification) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== notification.id),
      unreadCount: notification.readAt ? prev.unreadCount : Math.max(0, prev.unreadCount - 1)
    }));
  }, []);

  // Initialize real-time connection
  useEffect(() => {
    if (!session?.user?.id || hasInitialized.current) return;

    hasInitialized.current = true;

    const initializeRealtime = async () => {
      try {
        // Request notification permission if needed
        if (options.showBrowserNotifications) {
          await notificationRealtime.constructor.requestNotificationPermission();
        }

        // Initialize real-time connection
        await notificationRealtime.initialize(session.user.id);
        setState(prev => ({ ...prev, isConnected: true }));

        // Fetch initial notifications
        await fetchNotifications();
      } catch (error) {
        console.error('Failed to initialize real-time notifications:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'Failed to connect to notification service',
          isConnected: false 
        }));
      }
    };

    initializeRealtime();

    // Subscribe to real-time events
    const unsubscribe = notificationRealtime.constructor.subscribeToEvents({
      onCreate: handleNotificationCreated,
      onUpdate: handleNotificationUpdated,
      onDelete: handleNotificationDeleted,
      onClick: (notification) => {
        if (options.autoMarkAsRead && !notification.readAt) {
          markAsRead([notification.id]);
        }
      }
    });

    return () => {
      unsubscribe();
      notificationRealtime.cleanup();
      hasInitialized.current = false;
    };
  }, [
    session?.user?.id,
    fetchNotifications,
    handleNotificationCreated,
    handleNotificationUpdated,
    handleNotificationDeleted,
    options.showBrowserNotifications,
    options.autoMarkAsRead
  ]);

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationIds: string[], markAll = false) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markRead',
          notificationIds,
          markAll
        })
      });

      if (!response.ok) throw new Error('Failed to mark as read');

      // Update local state optimistically
      if (markAll) {
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => ({ ...n, readAt: new Date().toISOString() })),
          unreadCount: 0
        }));
      } else {
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => 
            notificationIds.includes(n.id) ? { ...n, readAt: new Date().toISOString() } : n
          ),
          unreadCount: Math.max(0, prev.unreadCount - notificationIds.length)
        }));
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete notification');

      // Update local state optimistically
      setState(prev => {
        const notification = prev.notifications.find(n => n.id === notificationId);
        return {
          ...prev,
          notifications: prev.notifications.filter(n => n.id !== notificationId),
          unreadCount: notification?.readAt ? prev.unreadCount : Math.max(0, prev.unreadCount - 1)
        };
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?deleteAll=true', {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to clear notifications');

      setState(prev => ({
        ...prev,
        notifications: [],
        unreadCount: 0
      }));
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }, []);

  // Refresh notifications
  const refresh = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    loading: state.loading,
    error: state.error,
    isConnected: state.isConnected,
    markAsRead,
    deleteNotification,
    clearAll,
    refresh
  };
}