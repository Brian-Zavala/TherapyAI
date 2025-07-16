'use client';

/**
 * Notification Permission Hook
 * Manages browser notification permissions with proper state tracking
 */

import { useCallback, useEffect, useState } from 'react';

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  });

  // Track permission changes
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    // Check if permission has changed (user changed it in browser settings)
    const checkPermission = () => {
      if (Notification.permission !== permission) {
        setPermission(Notification.permission);
      }
    };

    // Check periodically (no native event for permission changes)
    const interval = setInterval(checkPermission, 1000);

    return () => clearInterval(interval);
  }, [permission]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    // Already granted or denied
    if (Notification.permission !== 'default') {
      return Notification.permission;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }, []);

  const checkSupport = useCallback(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return 'Notification' in window && 
           'serviceWorker' in navigator &&
           'PushManager' in window;
  }, []);

  return {
    permission,
    requestPermission,
    isSupported: checkSupport(),
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    isDefault: permission === 'default',
  };
}