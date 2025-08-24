/**
 * Hook to get the currently active session ID
 * Used for real-time dashboard updates
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { safeSessionStorage } from '@/lib/session/safe-session-storage';

export function useActiveSession() {
  const { data: session } = useSession();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  useEffect(() => {
    if (!session?.user?.id) {
      setActiveSessionId(null);
      return;
    }
    
    // Check for active session in storage
    const storedSessionId = safeSessionStorage.getItem('activeSessionId');
    const sessionRecoveryData = safeSessionStorage.getItem('sessionRecovery');
    
    if (storedSessionId) {
      setActiveSessionId(storedSessionId);
    } else if (sessionRecoveryData) {
      // Check if there's a recoverable session
      const recoveryData = JSON.parse(sessionRecoveryData);
      if (recoveryData.sessionId && recoveryData.userId === session.user.id) {
        setActiveSessionId(recoveryData.sessionId);
      }
    }
    
    // Listen for storage changes (when session starts/ends in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'activeSessionId') {
        setActiveSessionId(e.newValue);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [session?.user?.id]);
  
  return {
    activeSessionId,
    hasActiveSession: !!activeSessionId
  };
}