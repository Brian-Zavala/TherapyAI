// src/hooks/useThrottle.ts
"use client";

import { useCallback, useRef } from 'react';

/**
 * Hook that throttles a callback function
 * @param callback - The callback to throttle
 * @param delay - The minimum delay between calls in milliseconds
 * @returns The throttled callback
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRunRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const throttledCallback = useCallback(((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRunRef.current;
    
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (timeSinceLastRun >= delay) {
      // Enough time has passed, execute immediately
      lastRunRef.current = now;
      callback(...args);
    } else {
      // Not enough time has passed, schedule for later
      const remainingTime = delay - timeSinceLastRun;
      timeoutRef.current = setTimeout(() => {
        lastRunRef.current = Date.now();
        callback(...args);
      }, remainingTime);
    }
  }) as T, [callback, delay]);
  
  return throttledCallback;
}