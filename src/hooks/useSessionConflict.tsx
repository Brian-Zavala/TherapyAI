import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface ExistingSession {
  id: string;
  theme: string;
  startTime: string;
  duration: number;
  conversationTimeSeconds: number;
}

interface SessionConflictResponse {
  error: string;
  code: string;
  existingSession: ExistingSession;
  message: string;
}

/**
 * useSessionConflict - Handles conflicts when user tries to start a new session
 * while one is already active (not from page refresh/recovery scenarios)
 * 
 * This hook works alongside ActiveSessionFoundModal to prevent modal conflicts:
 * - ActiveSessionFoundModal: Handles session recovery after page refresh
 * - SessionConflictDialog: Handles conflicts during active session creation
 */
export function useSessionConflict() {
  const [conflictSession, setConflictSession] = useState<ExistingSession | null>(null);
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);

  const handleSessionConflict = useCallback((error: any) => {
    if (error?.code === 'EXISTING_ACTIVE_SESSION' && error.existingSession) {
      // Check if ActiveSessionFoundModal is already handling this
      const hasRecoveryPending = sessionStorage.getItem('session-recovery-pending');
      const hasActiveSessionModal = document.querySelector('[data-active-session-modal]');
      
      if (hasRecoveryPending || hasActiveSessionModal) {
        // Let the existing recovery modal handle it
        console.log('🔄 ActiveSessionFoundModal already handling session conflict');
        return false;
      }
      
      setConflictSession(error.existingSession);
      setIsConflictDialogOpen(true);
      return true;
    }
    return false;
  }, []);

  const resumeExistingSession = useCallback(() => {
    if (conflictSession) {
      // Dispatch recovery event so TherapyButton picks it up
      const recoveryEvent = new CustomEvent('session-recovery-auto-start', {
        detail: {
          sessionId: conflictSession.id,
          conversationTimeSeconds: conflictSession.conversationTimeSeconds || 0,
          duration: conflictSession.duration,
          therapyType: conflictSession.theme || 'solo',
        }
      });
      window.dispatchEvent(recoveryEvent);
      toast.success('Resuming existing session');
    }
    setIsConflictDialogOpen(false);
  }, [conflictSession]);

  const formatSessionTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes} minutes`;
  }, []);

  return {
    conflictSession,
    isConflictDialogOpen,
    setIsConflictDialogOpen,
    handleSessionConflict,
    resumeExistingSession,
    formatSessionTime
  };
}