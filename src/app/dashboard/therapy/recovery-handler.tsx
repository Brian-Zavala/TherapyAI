'use client'

import { useEffect, useCallback } from 'react'
import ActiveSessionFoundModal from '@/components/ActiveSessionFoundModal'
import { SessionRecoveryData } from '@/types/therapy-session'

interface RecoveryHandlerProps {
  onRecoverSession: (data: SessionRecoveryData) => Promise<void>
  onStartNewSession: () => void
}

/**
 * Handles session recovery by bridging ActiveSessionFoundModal with the parent component
 * This ensures that when a session is recovered, it continues the existing session
 * instead of creating a new one
 */
export default function RecoveryHandler({ 
  onRecoverSession, 
  onStartNewSession 
}: RecoveryHandlerProps) {
  
  const handleContinueSession = useCallback(async (sessionData: any) => {
    console.log('🔄 RecoveryHandler: Continuing session with data:', sessionData)
    
    try {
      // Create recovery data from the session data
      const recoveryData: SessionRecoveryData = {
        sessionId: sessionData.id,
        originalStart: sessionData.startTime,
        recoveredAt: new Date().toISOString(),
        conversationTimeSeconds: sessionData.conversationTimeSeconds || 0,
        totalPausedTimeSeconds: sessionData.totalPausedTimeSeconds || 0,
        remainingMinutes: Math.floor((sessionData.duration * 60 - (sessionData.conversationTimeSeconds || 0)) / 60),
        autoRestarted: true,
        sessionData: sessionData,
        sessionDuration: sessionData.duration // Preserve original duration
      }
      
      // Call the parent's recovery method instead of creating a new session
      await onRecoverSession(recoveryData)
      
      // Dispatch event to notify that recovery is complete
      window.dispatchEvent(new CustomEvent('session-recovery-complete', { 
        detail: recoveryData 
      }))
      
    } catch (error) {
      console.error('Failed to recover session:', error)
      // If recovery fails, fallback to starting a new session
      onStartNewSession()
    }
  }, [onRecoverSession, onStartNewSession])
  
  const handleStartNewSession = useCallback(async () => {
    console.log('🆕 RecoveryHandler: Starting new session after ending previous')
    // This will end the previous session and start fresh
    onStartNewSession()
  }, [onStartNewSession])
  
  // Listen for recovery triggers from other components
  useEffect(() => {
    const handleRecoveryTrigger = (event: CustomEvent) => {
      console.log('📡 RecoveryHandler: Received recovery trigger:', event.detail)
      if (event.detail?.sessionData) {
        handleContinueSession(event.detail.sessionData)
      }
    }
    
    window.addEventListener('trigger-session-recovery', handleRecoveryTrigger as EventListener)
    
    return () => {
      window.removeEventListener('trigger-session-recovery', handleRecoveryTrigger as EventListener)
    }
  }, [handleContinueSession])
  
  return (
    <ActiveSessionFoundModal
      onContinueSession={handleContinueSession}
      onStartNewSession={handleStartNewSession}
    />
  )
}