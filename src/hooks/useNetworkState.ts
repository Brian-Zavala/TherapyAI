'use client';

/**
 * Network State Hook
 * Monitors online/offline status with proper event handling
 */

import { useEffect, useState, useCallback } from 'react';

export interface NetworkState {
  isOnline: boolean;
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export function useNetworkState(): NetworkState {
  const [networkState, setNetworkState] = useState<NetworkState>(() => {
    if (typeof window === 'undefined') {
      return { isOnline: true };
    }

    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    return {
      isOnline: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData: connection?.saveData,
    };
  });

  const updateNetworkState = useCallback(() => {
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    setNetworkState({
      isOnline: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData: connection?.saveData,
    });
  }, []);

  useEffect(() => {
    // Add event listeners
    window.addEventListener('online', updateNetworkState);
    window.addEventListener('offline', updateNetworkState);

    // Listen to connection changes if available
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', updateNetworkState);
    }

    return () => {
      window.removeEventListener('online', updateNetworkState);
      window.removeEventListener('offline', updateNetworkState);
      
      if (connection) {
        connection.removeEventListener('change', updateNetworkState);
      }
    };
  }, [updateNetworkState]);

  return networkState;
}