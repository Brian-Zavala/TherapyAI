/**
 * Client-Side Duration Enforcement Hook
 * Ensures sessions end at maxDurationSeconds with visual feedback
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useVapiSession } from './useVapiSession';
import { useSessionState } from './useSessionState';

export interface DurationEnforcementOptions {
  durationMinutes: number;
  onWarning?: (minutesRemaining: number) => void;
  onUrgentWarning?: (minutesRemaining: number) => void;
  onFinalWarning?: () => void;
  onForceEnd?: () => void;
  showVisualTimer?: boolean;
}

export interface DurationState {
  minutesRemaining: number;
  secondsRemaining: number;
  percentageUsed: number;
  warningLevel: 'none' | 'approaching' | 'urgent' | 'critical';
  isEnding: boolean;
}

export const useSessionDurationEnforcement = (options: DurationEnforcementOptions) => {
  const vapi = useVapiSession();
  const session = useSessionState();
  
  const [durationState, setDurationState] = useState<DurationState>({
    minutesRemaining: options.durationMinutes,
    secondsRemaining: 0,
    percentageUsed: 0,
    warningLevel: 'none',
    isEnding: false
  });
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const hardStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningsIssuedRef = useRef<Set<string>>(new Set());
  const isEndingRef = useRef(false);
  
  // Calculate time remaining
  const calculateTimeRemaining = useCallback(() => {
    if (!startTimeRef.current) return durationState;
    
    const now = Date.now();
    const elapsedMs = now - startTimeRef.current;
    const totalMs = options.durationMinutes * 60 * 1000;
    const remainingMs = Math.max(0, totalMs - elapsedMs);
    
    const minutesRemaining = Math.floor(remainingMs / 60000);
    const secondsRemaining = Math.floor((remainingMs % 60000) / 1000);
    const percentageUsed = Math.min(100, (elapsedMs / totalMs) * 100);
    
    // Determine warning level
    let warningLevel: DurationState['warningLevel'] = 'none';
    if (percentageUsed >= 95) {
      warningLevel = 'critical';
    } else if (percentageUsed >= 90) {
      warningLevel = 'urgent';
    } else if (percentageUsed >= 80) {
      warningLevel = 'approaching';
    }
    
    return {
      minutesRemaining,
      secondsRemaining,
      percentageUsed,
      warningLevel,
      isEnding: isEndingRef.current
    };
  }, [options.durationMinutes]);
  
  // Handle warning notifications
  const handleWarnings = useCallback((state: DurationState) => {
    const { percentageUsed, minutesRemaining, warningLevel } = state;
    
    // 80% warning (approaching)
    if (percentageUsed >= 80 && percentageUsed < 90 && !warningsIssuedRef.current.has('80')) {
      warningsIssuedRef.current.add('80');
      options.onWarning?.(minutesRemaining);
      console.log(`⏰ Session warning: ${minutesRemaining} minutes remaining (80% used)`);
    }
    
    // 90% warning (urgent)
    if (percentageUsed >= 90 && percentageUsed < 95 && !warningsIssuedRef.current.has('90')) {
      warningsIssuedRef.current.add('90');
      options.onUrgentWarning?.(minutesRemaining);
      console.log(`🚨 Urgent warning: ${minutesRemaining} minutes remaining (90% used)`);
      
      // Send message to VAPI to trigger wrap-up
      if (vapi.vapiState.isActive) {
        console.log('📢 Notifying assistant to begin wrap-up sequence');
        // This would trigger the assistant's wrap-up protocol
        // The assistant will check getSessionTimeRemaining and see shouldWrapUp = true
      }
    }
    
    // 95% warning (critical - final warning)
    if (percentageUsed >= 95 && !warningsIssuedRef.current.has('95')) {
      warningsIssuedRef.current.add('95');
      options.onFinalWarning?.();
      console.log('⚠️ FINAL WARNING: Session ending in less than 1 minute!');
    }
    
    // 100% - Force end
    if (percentageUsed >= 100 && !isEndingRef.current) {
      handleForceEnd();
    }
  }, [options, vapi.vapiState.isActive]);
  
  // Force end the session
  const handleForceEnd = useCallback(async () => {
    if (isEndingRef.current) return;
    
    isEndingRef.current = true;
    setDurationState(prev => ({ ...prev, isEnding: true }));
    
    console.log('⏹️ HARD STOP: Maximum duration reached, ending session');
    
    // Stop VAPI if active
    if (vapi.vapiState.isActive) {
      try {
        await vapi.stopCall();
        console.log('✅ VAPI session stopped due to time limit');
      } catch (error) {
        console.error('❌ Error stopping VAPI:', error);
      }
    }
    
    // End session in state
    if (session.sessionId) {
      try {
        await session.endSession();
        console.log('✅ Session ended in database');
      } catch (error) {
        console.error('❌ Error ending session:', error);
      }
    }
    
    // Notify parent component
    options.onForceEnd?.();
    
    // Clean up timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (hardStopTimeoutRef.current) {
      clearTimeout(hardStopTimeoutRef.current);
      hardStopTimeoutRef.current = null;
    }
  }, [vapi, session, options]);
  
  // Start the duration timer
  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    
    console.log(`⏱️ Starting duration enforcement timer for ${options.durationMinutes} minutes`);
    startTimeRef.current = Date.now();
    warningsIssuedRef.current.clear();
    isEndingRef.current = false;
    
    // Update every second
    timerRef.current = setInterval(() => {
      const newState = calculateTimeRemaining();
      setDurationState(newState);
      handleWarnings(newState);
    }, 1000);
    
    // Set hard stop timeout as backup
    const totalMs = options.durationMinutes * 60 * 1000;
    hardStopTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Hard stop timeout triggered');
      handleForceEnd();
    }, totalMs);
  }, [options.durationMinutes, calculateTimeRemaining, handleWarnings, handleForceEnd]);
  
  // Stop the timer
  const stopTimer = useCallback(() => {
    console.log('⏹️ Stopping duration enforcement timer');
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (hardStopTimeoutRef.current) {
      clearTimeout(hardStopTimeoutRef.current);
      hardStopTimeoutRef.current = null;
    }
    
    startTimeRef.current = null;
    isEndingRef.current = false;
    warningsIssuedRef.current.clear();
    
    // Reset state
    setDurationState({
      minutesRemaining: options.durationMinutes,
      secondsRemaining: 0,
      percentageUsed: 0,
      warningLevel: 'none',
      isEnding: false
    });
  }, [options.durationMinutes]);
  
  // Pause the timer (for session pauses)
  const pauseTimer = useCallback(() => {
    if (!timerRef.current || !startTimeRef.current) return;
    
    console.log('⏸️ Pausing duration timer');
    
    // Calculate elapsed time and store it
    const now = Date.now();
    const elapsedMs = now - startTimeRef.current;
    
    // Clear intervals but keep the elapsed time
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (hardStopTimeoutRef.current) {
      clearTimeout(hardStopTimeoutRef.current);
      hardStopTimeoutRef.current = null;
    }
    
    // Store elapsed time for resume
    (pauseTimer as any)._pausedElapsed = elapsedMs;
  }, []);
  
  // Resume the timer
  const resumeTimer = useCallback(() => {
    const pausedElapsed = (pauseTimer as any)._pausedElapsed;
    if (!pausedElapsed) return;
    
    console.log('▶️ Resuming duration timer');
    
    // Adjust start time to account for paused duration
    startTimeRef.current = Date.now() - pausedElapsed;
    delete (pauseTimer as any)._pausedElapsed;
    
    // Restart intervals
    timerRef.current = setInterval(() => {
      const newState = calculateTimeRemaining();
      setDurationState(newState);
      handleWarnings(newState);
    }, 1000);
    
    // Recalculate remaining time for hard stop
    const totalMs = options.durationMinutes * 60 * 1000;
    const remainingMs = totalMs - pausedElapsed;
    
    hardStopTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Hard stop timeout triggered after resume');
      handleForceEnd();
    }, remainingMs);
  }, [options.durationMinutes, calculateTimeRemaining, handleWarnings, handleForceEnd, pauseTimer]);
  
  // Watch for session start
  useEffect(() => {
    if (vapi.vapiState.isActive && !timerRef.current) {
      startTimer();
    } else if (!vapi.vapiState.isActive && timerRef.current) {
      stopTimer();
    }
  }, [vapi.vapiState.isActive, startTimer, stopTimer]);
  
  // Watch for session pause/resume
  useEffect(() => {
    if (session.isPaused && timerRef.current) {
      pauseTimer();
    } else if (!session.isPaused && (pauseTimer as any)._pausedElapsed) {
      resumeTimer();
    }
  }, [session.isPaused, pauseTimer, resumeTimer]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (hardStopTimeoutRef.current) clearTimeout(hardStopTimeoutRef.current);
    };
  }, []);
  
  return {
    durationState,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    forceEnd: handleForceEnd
  };
};