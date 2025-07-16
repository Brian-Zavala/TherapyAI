'use client';

/**
 * Unified Notification Hook
 * Single source of truth for all notification operations
 * Handles all edge cases with production-ready resilience
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { getSupabaseClient } from '@/lib/supabase-singleton';
import { getNotificationConfig, isFeatureEnabled } from '@/lib/notifications/notification-config';
import { useNetworkState } from '@/hooks/useNetworkState';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { NotificationDeduplicator } from '@/lib/notifications/deduplicator';
import { ExponentialBackoff } from '@/lib/notifications/exponential-backoff';
import { NotificationTelemetry } from '@/lib/notifications/telemetry';

// Types
export interface Notification {
  id: string;
  type: 'reminder' | 'completion' | 'update' | 'alert';
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  userId: string;
  sessionId?: string;
  deliveryMethod?: 'email' | 'sms' | 'push' | 'in_app';
  deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'failed';
  actionUrl?: string;
  actionTaken?: string;
  createdAt: string;
  updatedAt: string;
  readAt?: string;
  metadata?: Record<string, any>;
}

export interface NotificationSummary {
  totalNotifications: number;
  unreadCount: number;
  readCount: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

export interface UseNotificationsOptions {
  enabled?: boolean;
  filter?: {
    type?: Notification['type'] | 'all';
    status?: 'unread' | 'read' | 'all';
    priority?: Notification['priority'] | 'all';
  };
  pageSize?: number;
  virtualScrolling?: boolean;
  soundEnabled?: boolean;
  browserNotificationsEnabled?: boolean;
  onNotificationReceived?: (notification: Notification) => void;
  onError?: (error: Error) => void;
}

export interface UseNotificationsReturn {
  // Data
  notifications: Notification[];
  summary: NotificationSummary;
  
  // State
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isOnline: boolean;
  isConnected: boolean;
  isInitialized: boolean;
  
  // Actions
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAll: () => Promise<void>;
  refresh: () => void;
  retry: () => void;
  
  // Pagination
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  
  // Permissions
  notificationPermission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
}

// Main hook
export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const config = getNotificationConfig();
  const queryClient = useQueryClient();
  const { data: session, status: sessionStatus } = useSession();
  const { isOnline } = useNetworkState();
  const { isVisible } = usePageVisibility();
  const { playSound } = useSoundEffects();
  const { permission, requestPermission } = useNotificationPermission();
  
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Refs for cleanup and deduplication
  const channelRef = useRef<any>(null);
  const deduplicator = useRef(new NotificationDeduplicator());
  const backoff = useRef(new ExponentialBackoff({
    initialDelay: config.api.retryDelay,
    maxDelay: config.api.maxRetryDelay,
    maxAttempts: config.api.retryAttempts,
  }));
  const telemetry = useRef(new NotificationTelemetry(config.monitoring));

  // Compute query key based on filters
  const queryKey = useMemo(() => {
    return ['notifications', session?.user?.id, options.filter];
  }, [session?.user?.id, options.filter]);

  // Fetch notifications query
  const {
    data,
    error,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useQuery({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      if (!session?.user?.id) {
        throw new Error('User not authenticated');
      }

      // Build query parameters
      const params = new URLSearchParams({
        limit: String(options.pageSize || config.ui.defaultPageSize),
        page: String(pageParam || 1),
      });

      if (options.filter?.type && options.filter.type !== 'all') {
        params.append('type', options.filter.type);
      }

      if (options.filter?.status && options.filter.status !== 'all') {
        params.append('unreadOnly', String(options.filter.status === 'unread'));
      }

      if (options.filter?.priority && options.filter.priority !== 'all') {
        params.append('priority', options.filter.priority);
      }

      // Fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.api.timeout);

      try {
        const response = await fetch(`/api/notifications?${params}`, {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication required');
          }
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            throw new Error(`Rate limited. Retry after ${retryAfter}s`);
          }
          throw new Error(`Failed to fetch notifications: ${response.status}`);
        }

        const data = await response.json();
        
        // Track success
        telemetry.current.trackSuccess('fetch');
        backoff.current.reset();

        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Track error
        telemetry.current.trackError('fetch', error as Error);
        
        // Apply backoff for retries
        const delay = backoff.current.getNextDelay();
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        throw error;
      }
    },
    enabled: !!session?.user?.id && isOnline && (options.enabled !== false),
    staleTime: config.performance.cacheStaleTime,
    gcTime: config.performance.cacheGcTime,
    refetchInterval: false, // No polling - use real-time
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error instanceof Error && error.message.includes('Authentication')) {
        return false;
      }
      // Use backoff logic
      return backoff.current.shouldRetry();
    },
  });

  // Process and deduplicate notifications
  const processedData = useMemo(() => {
    if (!data) {
      return {
        notifications: [],
        summary: {
          totalNotifications: 0,
          unreadCount: 0,
          readCount: 0,
          byType: {},
          byPriority: {},
        },
      };
    }

    // Deduplicate notifications
    const dedupedNotifications = deduplicator.current.deduplicate(
      data.notifications || []
    );

    // Sort by creation date (newest first)
    const sortedNotifications = dedupedNotifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Calculate summary
    const summary: NotificationSummary = {
      totalNotifications: sortedNotifications.length,
      unreadCount: data.summary?.unreadCount || 0,
      readCount: data.summary?.readCount || 0,
      byType: {},
      byPriority: {},
    };

    // Group by type and priority
    sortedNotifications.forEach(notification => {
      summary.byType[notification.type] = (summary.byType[notification.type] || 0) + 1;
      summary.byPriority[notification.priority] = (summary.byPriority[notification.priority] || 0) + 1;
    });

    return {
      notifications: sortedNotifications,
      summary,
    };
  }, [data]);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markRead',
          notificationIds: [notificationId],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark as read');
      }

      return response.json();
    },
    onMutate: async (notificationId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;

        return {
          ...old,
          notifications: old.notifications.map((n: Notification) =>
            n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n
          ),
          summary: {
            ...old.summary,
            unreadCount: Math.max(0, old.summary.unreadCount - 1),
            readCount: old.summary.readCount + 1,
          },
        };
      });

      return { previousData };
    },
    onError: (err, notificationId, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      
      // Track error
      telemetry.current.trackError('markAsRead', err as Error);
      
      // Call error handler
      options.onError?.(err as Error);
    },
    onSettled: () => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markRead',
          markAll: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark all as read');
      }

      return response.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;

        return {
          ...old,
          notifications: old.notifications.map((n: Notification) => ({
            ...n,
            readAt: n.readAt || new Date().toISOString(),
          })),
          summary: {
            ...old.summary,
            unreadCount: 0,
            readCount: old.summary.totalNotifications,
          },
        };
      });

      return { previousData };
    },
    onError: (err, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      telemetry.current.trackError('markAllAsRead', err as Error);
      options.onError?.(err as Error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }

      return response.json();
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;

        const notification = old.notifications.find((n: Notification) => n.id === notificationId);
        const wasUnread = notification && !notification.readAt;

        return {
          ...old,
          notifications: old.notifications.filter((n: Notification) => n.id !== notificationId),
          summary: {
            ...old.summary,
            totalNotifications: old.summary.totalNotifications - 1,
            unreadCount: wasUnread ? old.summary.unreadCount - 1 : old.summary.unreadCount,
            readCount: wasUnread ? old.summary.readCount : old.summary.readCount - 1,
          },
        };
      });

      return { previousData };
    },
    onError: (err, notificationId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      telemetry.current.trackError('deleteNotification', err as Error);
      options.onError?.(err as Error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Delete all notifications mutation
  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications?deleteAll=true', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete all notifications');
      }

      return response.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, () => ({
        notifications: [],
        summary: {
          totalNotifications: 0,
          unreadCount: 0,
          readCount: 0,
          byType: {},
          byPriority: {},
        },
      }));

      return { previousData };
    },
    onError: (err, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      telemetry.current.trackError('deleteAll', err as Error);
      options.onError?.(err as Error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!session?.user?.id || !isOnline || !isFeatureEnabled('enableRealtime')) {
      return;
    }

    const setupRealtime = async () => {
      try {
        // Get Supabase client
        const supabase = getSupabaseClient();
        
        // Clean up existing channel
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
        }

        // Create new channel
        const channel = supabase
          .channel(`${config.realtime.channel.prefix}:${session.user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'Notification',
              filter: `userId=eq.${session.user.id}`,
            },
            (payload) => {
              // Handle real-time changes
              handleRealtimeChange(payload);
            }
          )
          .subscribe((status) => {
            setIsConnected(status === 'SUBSCRIBED');
            if (status === 'SUBSCRIBED') {
              setIsInitialized(true);
              telemetry.current.trackSuccess('realtimeConnect');
            }
          });

        channelRef.current = channel;
      } catch (error) {
        console.error('Failed to setup realtime:', error);
        telemetry.current.trackError('realtimeSetup', error as Error);
        setIsConnected(false);
      }
    };

    setupRealtime();

    // Cleanup on unmount or dependency change
    return () => {
      if (channelRef.current) {
        const supabase = getSupabaseClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
      setIsInitialized(false);
    };
  }, [session?.user?.id, isOnline]);

  // Handle real-time changes
  const handleRealtimeChange = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    // Track real-time event
    telemetry.current.trackEvent('realtimeEvent', { eventType });

    // Invalidate query to refetch latest data
    queryClient.invalidateQueries({ queryKey });

    // Handle new notification
    if (eventType === 'INSERT' && newRecord) {
      // Play sound if enabled
      if (options.soundEnabled !== false && isFeatureEnabled('enableSoundEffects')) {
        playSound('notification');
      }

      // Show browser notification if enabled
      if (
        options.browserNotificationsEnabled !== false &&
        isFeatureEnabled('enableBrowserNotifications') &&
        permission === 'granted'
      ) {
        showBrowserNotification(newRecord);
      }

      // Call custom handler
      options.onNotificationReceived?.(newRecord);
    }
  }, [queryKey, options, permission, playSound]);

  // Show browser notification
  const showBrowserNotification = useCallback((notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent',
        silent: false,
      });

      browserNotification.onclick = () => {
        window.focus();
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
        browserNotification.close();
      };
    }
  }, []);

  // Action handlers
  const markAsRead = useCallback(async (notificationId: string) => {
    await markAsReadMutation.mutateAsync(notificationId);
  }, [markAsReadMutation]);

  const markAllAsRead = useCallback(async () => {
    await markAllAsReadMutation.mutateAsync();
  }, [markAllAsReadMutation]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    await deleteNotificationMutation.mutateAsync(notificationId);
  }, [deleteNotificationMutation]);

  const deleteAll = useCallback(async () => {
    await deleteAllMutation.mutateAsync();
  }, [deleteAllMutation]);

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const retry = useCallback(() => {
    backoff.current.reset();
    refetch();
  }, [refetch]);

  // Return consolidated API
  return {
    // Data
    notifications: processedData.notifications,
    summary: processedData.summary,
    
    // State
    isLoading: isLoading || sessionStatus === 'loading',
    isError,
    error: error as Error | null,
    isOnline,
    isConnected,
    isInitialized,
    
    // Actions
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAll,
    refresh,
    retry,
    
    // Pagination
    hasNextPage: hasNextPage || false,
    fetchNextPage,
    isFetchingNextPage,
    
    // Permissions
    notificationPermission: permission,
    requestPermission,
  };
}