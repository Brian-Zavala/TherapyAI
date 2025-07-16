'use client';

/**
 * Notification Provider
 * Central provider for all notification functionality
 * Manages connections, state, and provides context to child components
 */

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { NotificationErrorProvider } from '@/components/notifications/NotificationErrorBoundary';
import { useNotifications, UseNotificationsReturn, UseNotificationsOptions } from '@/hooks/useNotifications';
import { getNotificationConfig } from '@/lib/notifications/notification-config';

// Context type
interface NotificationContextValue extends UseNotificationsReturn {
  config: ReturnType<typeof getNotificationConfig>;
}

// Create context
const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

// Provider props
interface NotificationProviderProps {
  children: ReactNode;
  options?: UseNotificationsOptions;
}

// Internal provider component that uses the hook
function NotificationProviderInner({ 
  children, 
  options = {} 
}: { 
  children: ReactNode; 
  options?: UseNotificationsOptions;
}) {
  const config = getNotificationConfig();
  const notificationState = useNotifications(options);

  const contextValue = useMemo(() => ({
    ...notificationState,
    config,
  }), [notificationState, config]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

// Main provider component with all wrappers
export function NotificationProvider({ 
  children, 
  options = {},
}: NotificationProviderProps) {
  return (
    <NotificationErrorProvider>
      <NotificationProviderInner options={options}>
        <NotificationGlobalSetup />
        {children}
      </NotificationProviderInner>
    </NotificationErrorProvider>
  );
}

// Hook to use notification context
export function useNotificationContext(): NotificationContextValue {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error(
      'useNotificationContext must be used within a NotificationProvider'
    );
  }
  
  return context;
}

// Convenience hooks for specific notification operations
export function useNotificationActions() {
  const { 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    deleteAll, 
    refresh, 
    retry 
  } = useNotificationContext();

  return {
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAll,
    refresh,
    retry,
  };
}

export function useNotificationState() {
  const { 
    notifications, 
    summary, 
    isLoading, 
    isError, 
    error, 
    isOnline, 
    isConnected, 
    isInitialized 
  } = useNotificationContext();

  return {
    notifications,
    summary,
    isLoading,
    isError,
    error,
    isOnline,
    isConnected,
    isInitialized,
  };
}

export function useUnreadCount(): number {
  const { summary } = useNotificationContext();
  return summary.unreadCount;
}

// HOC for components that need notifications
export function withNotifications<P extends object>(
  Component: React.ComponentType<P & { notifications: NotificationContextValue }>
) {
  return function WithNotificationsComponent(props: P) {
    const notifications = useNotificationContext();
    
    return <Component {...props} notifications={notifications} />;
  };
}

// Render prop component for flexibility
interface NotificationConsumerProps {
  children: (notifications: NotificationContextValue) => ReactNode;
}

export function NotificationConsumer({ children }: NotificationConsumerProps) {
  const notifications = useNotificationContext();
  return <>{children(notifications)}</>;
}

// Global notification instance for imperative API
let globalNotificationInstance: NotificationContextValue | null = null;

export function setGlobalNotificationInstance(instance: NotificationContextValue) {
  globalNotificationInstance = instance;
}

// Imperative API for use outside React components
export const NotificationAPI = {
  markAsRead: async (notificationId: string) => {
    if (!globalNotificationInstance) {
      throw new Error('Notification system not initialized');
    }
    return globalNotificationInstance.markAsRead(notificationId);
  },
  
  markAllAsRead: async () => {
    if (!globalNotificationInstance) {
      throw new Error('Notification system not initialized');
    }
    return globalNotificationInstance.markAllAsRead();
  },
  
  deleteNotification: async (notificationId: string) => {
    if (!globalNotificationInstance) {
      throw new Error('Notification system not initialized');
    }
    return globalNotificationInstance.deleteNotification(notificationId);
  },
  
  refresh: () => {
    if (!globalNotificationInstance) {
      throw new Error('Notification system not initialized');
    }
    return globalNotificationInstance.refresh();
  },
  
  getUnreadCount: () => {
    if (!globalNotificationInstance) {
      return 0;
    }
    return globalNotificationInstance.summary.unreadCount;
  },
};

// Component to set up global instance
export function NotificationGlobalSetup() {
  const notifications = useNotificationContext();
  
  React.useEffect(() => {
    setGlobalNotificationInstance(notifications);
    
    return () => {
      setGlobalNotificationInstance(null);
    };
  }, [notifications]);
  
  return null;
}