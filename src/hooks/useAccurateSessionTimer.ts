import { useEffect, useRef, useState } from 'react';
import { useStopwatch, useTimer } from 'react-timer-hook';

export interface SessionTimerState {
  // Core time values
  totalElapsedSeconds: number;
  remainingSeconds: number;
  conversationTimeSeconds: number;
  pausedTimeSeconds: number;
  
  // Formatted display values
  formattedRemaining: string;
  formattedElapsed: string;
  formattedConversation: string;
  
  // State flags
  isRunning: boolean;
  isPaused: boolean;
  isExpired: boolean;
  
  // Progress percentage (0-100)
  progressPercentage: number;
}

export interface UseAccurateSessionTimerProps {
  sessionDurationMinutes: number;
  initialConversationTimeSeconds: number;
  initialPausedTimeSeconds: number;
  isConversationActive: boolean;
  isPaused: boolean;
  onTimeUpdate?: (conversationTime: number) => void;
  onExpire?: () => void;
  updateIntervalMs?: number; // How often to call onTimeUpdate
}

export function useAccurateSessionTimer({
  sessionDurationMinutes,
  initialConversationTimeSeconds,
  initialPausedTimeSeconds,
  isConversationActive,
  isPaused,
  onTimeUpdate,
  onExpire,
  updateIntervalMs = 5000, // Default 5 seconds
}: UseAccurateSessionTimerProps): SessionTimerState {
  const totalSessionSeconds = sessionDurationMinutes * 60;
  
  // Track conversation time with a stopwatch
  const conversationStopwatch = useStopwatch({
    autoStart: false,
    offsetTimestamp: (() => {
      const offset = new Date();
      offset.setSeconds(offset.getSeconds() + initialConversationTimeSeconds);
      return offset;
    })(),
  });
  
  // Track pause time with a separate stopwatch
  const pauseStopwatch = useStopwatch({
    autoStart: false,
    offsetTimestamp: (() => {
      const offset = new Date();
      offset.setSeconds(offset.getSeconds() + initialPausedTimeSeconds);
      return offset;
    })(),
  });
  
  // Track overall session countdown
  const sessionTimer = useTimer({
    expiryTimestamp: (() => {
      const expiry = new Date();
      // Remaining time = total session time - conversation time
      const remainingSeconds = totalSessionSeconds - initialConversationTimeSeconds;
      expiry.setSeconds(expiry.getSeconds() + remainingSeconds);
      return expiry;
    })(),
    onExpire: () => {
      conversationStopwatch.pause();
      pauseStopwatch.pause();
      onExpire?.();
    },
    autoStart: isConversationActive && !isPaused,
  });
  
  // References for tracking state changes
  const lastUpdateTime = useRef(Date.now());
  const lastConversationTime = useRef(initialConversationTimeSeconds);
  const isActiveRef = useRef(isConversationActive);
  const isPausedRef = useRef(isPaused);
  
  // Handle conversation active state changes
  useEffect(() => {
    if (isConversationActive && !isPaused) {
      // Start conversation tracking
      conversationStopwatch.start();
      pauseStopwatch.pause();
      sessionTimer.start();
      isActiveRef.current = true;
      isPausedRef.current = false;
    } else if (isPaused && isActiveRef.current) {
      // Pause conversation, start tracking pause time
      conversationStopwatch.pause();
      pauseStopwatch.start();
      sessionTimer.pause();
      isPausedRef.current = true;
    } else if (!isConversationActive) {
      // Stop everything
      conversationStopwatch.pause();
      pauseStopwatch.pause();
      sessionTimer.pause();
      isActiveRef.current = false;
    }
  }, [isConversationActive, isPaused, conversationStopwatch, pauseStopwatch, sessionTimer]);
  
  // Periodic time updates to server
  useEffect(() => {
    if (!onTimeUpdate || !isConversationActive) return;
    
    const updateInterval = setInterval(() => {
      const currentConversationTime = conversationStopwatch.totalSeconds;
      const timeDiff = currentConversationTime - lastConversationTime.current;
      
      // Only update if time has actually changed
      if (timeDiff > 0) {
        onTimeUpdate(currentConversationTime);
        lastConversationTime.current = currentConversationTime;
        lastUpdateTime.current = Date.now();
      }
    }, updateIntervalMs);
    
    return () => clearInterval(updateInterval);
  }, [conversationStopwatch.totalSeconds, isConversationActive, onTimeUpdate, updateIntervalMs]);
  
  // Calculate derived values
  const conversationTimeSeconds = conversationStopwatch.totalSeconds;
  const pausedTimeSeconds = pauseStopwatch.totalSeconds;
  const totalElapsedSeconds = conversationTimeSeconds + pausedTimeSeconds;
  const remainingSeconds = Math.max(0, totalSessionSeconds - conversationTimeSeconds);
  const progressPercentage = Math.min(100, (conversationTimeSeconds / totalSessionSeconds) * 100);
  
  // Format time values
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };
  
  return {
    // Core time values
    totalElapsedSeconds,
    remainingSeconds,
    conversationTimeSeconds,
    pausedTimeSeconds,
    
    // Formatted display values
    formattedRemaining: formatTime(remainingSeconds),
    formattedElapsed: formatTime(totalElapsedSeconds),
    formattedConversation: formatTime(conversationTimeSeconds),
    
    // State flags
    isRunning: conversationStopwatch.isRunning,
    isPaused: isPausedRef.current,
    isExpired: remainingSeconds === 0,
    
    // Progress
    progressPercentage,
  };
}

// Helper hook for session recovery scenarios
export function useSessionRecoveryTimer({
  sessionId,
  onRecoveryComplete,
}: {
  sessionId: string | null;
  onRecoveryComplete?: (conversationTime: number) => void;
}) {
  const [recoveryState, setRecoveryState] = useState<{
    isRecovering: boolean;
    conversationTime: number;
    pausedTime: number;
    sessionDuration: number;
  }>({
    isRecovering: false,
    conversationTime: 0,
    pausedTime: 0,
    sessionDuration: 30,
  });
  
  useEffect(() => {
    if (!sessionId) return;
    
    const fetchSessionData = async () => {
      try {
        setRecoveryState(prev => ({ ...prev, isRecovering: true }));
        
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (!response.ok) throw new Error('Failed to fetch session');
        
        const session = await response.json();
        
        // Calculate current conversation time if session is active
        let conversationTime = session.conversationTimeSeconds || 0;
        if (session.lastConversationStart && !session.isPaused) {
          const activeTime = Math.floor(
            (Date.now() - new Date(session.lastConversationStart).getTime()) / 1000
          );
          conversationTime += activeTime;
        }
        
        setRecoveryState({
          isRecovering: false,
          conversationTime,
          pausedTime: session.totalPausedTimeSeconds || 0,
          sessionDuration: session.sessionDuration || 30,
        });
        
        onRecoveryComplete?.(conversationTime);
      } catch (error) {
        console.error('Session recovery failed:', error);
        setRecoveryState(prev => ({ ...prev, isRecovering: false }));
      }
    };
    
    fetchSessionData();
  }, [sessionId, onRecoveryComplete]);
  
  return recoveryState;
}

// Utility hook for time-based warnings and alerts
export function useSessionTimeAlerts({
  remainingSeconds,
  onTenMinuteWarning,
  onFiveMinuteWarning,
  onOneMinuteWarning,
  onThirtySecondWarning,
}: {
  remainingSeconds: number;
  onTenMinuteWarning?: () => void;
  onFiveMinuteWarning?: () => void;
  onOneMinuteWarning?: () => void;
  onThirtySecondWarning?: () => void;
}) {
  const tenMinuteWarningShown = useRef(false);
  const fiveMinuteWarningShown = useRef(false);
  const oneMinuteWarningShown = useRef(false);
  const thirtySecondWarningShown = useRef(false);
  const previousRemainingSeconds = useRef(remainingSeconds);
  
  useEffect(() => {
    // Track threshold crossings for precise warning triggers
    const prevSeconds = previousRemainingSeconds.current;
    const currSeconds = remainingSeconds;
    
    // Reset warnings if time increases (session extended)
    if (currSeconds > prevSeconds) {
      if (currSeconds > 600) tenMinuteWarningShown.current = false;
      if (currSeconds > 300) fiveMinuteWarningShown.current = false;
      if (currSeconds > 60) oneMinuteWarningShown.current = false;
      if (currSeconds > 30) thirtySecondWarningShown.current = false;
    }
    
    // Check for threshold crossings - trigger when we cross from above to at/below threshold
    if (prevSeconds > 600 && currSeconds <= 600 && !tenMinuteWarningShown.current) {
      tenMinuteWarningShown.current = true;
      onTenMinuteWarning?.();
    }
    
    if (prevSeconds > 300 && currSeconds <= 300 && !fiveMinuteWarningShown.current) {
      fiveMinuteWarningShown.current = true;
      onFiveMinuteWarning?.();
    }
    
    if (prevSeconds > 60 && currSeconds <= 60 && !oneMinuteWarningShown.current) {
      oneMinuteWarningShown.current = true;
      onOneMinuteWarning?.();
    }
    
    if (prevSeconds > 30 && currSeconds <= 30 && !thirtySecondWarningShown.current) {
      thirtySecondWarningShown.current = true;
      onThirtySecondWarning?.();
    }
    
    // Update previous value for next render
    previousRemainingSeconds.current = currSeconds;
  }, [remainingSeconds, onTenMinuteWarning, onFiveMinuteWarning, onOneMinuteWarning, onThirtySecondWarning]);
}