'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { 
  SessionRecoveryData,
  FamilyMember,
  UserProfile,
  SessionCompletionData
} from '@/types/therapy-session'
import { 
  STORAGE_KEYS, 
  API_ENDPOINTS,
  DEFAULT_SESSION_DURATION,
  SessionDuration
} from '@/lib/therapy-session/constants'
import { useAccurateSessionTimer, useSessionRecoveryTimer, useSessionTimeAlerts } from './useAccurateSessionTimer'
import { flushSessionTranscripts } from '@/lib/transcript-service-optimized'

// Hook configuration interface
interface UseSessionManagementV2Options {
  userId: string
  therapyType: string
  onSessionCreated?: (sessionId: string) => void
  onSessionRecovered?: (data: SessionRecoveryData) => void
  onSessionCompleted?: (data: SessionCompletionData) => void
  onError?: (error: Error) => void
  onTimeWarning?: (remainingMinutes: number) => void
}

// Hook return type
interface UseSessionManagementV2Return {
  // Session state
  sessionId: string | null
  sessionStartTime: Date | null
  sessionDuration: SessionDuration
  sessionRecovered: boolean
  isEndingSession: boolean
  
  // Pause state
  isSessionPaused: boolean
  pauseStartTime: Date | null
  totalPausedTimeSeconds: number
  
  // Conversation time (from react-timer-hook)
  conversationTimeSeconds: number
  conversationStartTime: Date | null
  
  // Timer state from react-timer-hook
  timerState: {
    remainingSeconds: number
    formattedRemaining: string
    formattedElapsed: string
    formattedConversation: string
    progressPercentage: number
    isExpired: boolean
  }
  
  // Methods
  createSession: (duration: SessionDuration, familyMembers?: FamilyMember[]) => Promise<string | null>
  checkForActiveSession: () => Promise<SessionRecoveryData | null>
  recoverSession: (recoveryData: SessionRecoveryData) => Promise<void>
  pauseSession: () => Promise<void>
  resumeSession: () => Promise<void>
  endSession: (reason?: string) => Promise<void>
  startConversationTimer: (overrideSessionId?: string) => void
  
  // Guards
  isSessionCreationInProgress: () => boolean
}

/**
 * Enhanced session management hook using react-timer-hook for accurate time tracking
 * Updates server every 5-10 seconds for billing accuracy
 */
export function useSessionManagementV2(options: UseSessionManagementV2Options): UseSessionManagementV2Return {
  const { userId, therapyType, onSessionCreated, onSessionRecovered, onSessionCompleted, onError, onTimeWarning } = options
  
  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [sessionDuration, setSessionDuration] = useState<SessionDuration>(DEFAULT_SESSION_DURATION)
  const [sessionRecovered, setSessionRecovered] = useState(false)
  const [isEndingSession, setIsEndingSession] = useState(false)
  
  // Pause state
  const [isSessionPaused, setIsSessionPaused] = useState(false)
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null)
  
  // Conversation state
  const [isConversationActive, setIsConversationActive] = useState(false)
  const [conversationStartTime, setConversationStartTime] = useState<Date | null>(null)
  
  // Initial time values for timer
  const [initialConversationTime, setInitialConversationTime] = useState(0)
  const [initialPausedTime, setInitialPausedTime] = useState(0)
  
  // Guards to prevent duplicate operations
  const sessionCreationInProgress = useRef(false)
  const sessionCheckInProgress = useRef(false)
  const lastServerUpdateTime = useRef(0)
  
  // Use the accurate timer hook
  const timer = useAccurateSessionTimer({
    sessionDurationMinutes: sessionDuration,
    initialConversationTimeSeconds: initialConversationTime,
    initialPausedTimeSeconds: initialPausedTime,
    isConversationActive,
    isPaused: isSessionPaused,
    updateIntervalMs: 5000, // Update server every 5 seconds
    onTimeUpdate: useCallback(async (conversationTime: number) => {
      if (!sessionId) return
      
      // Prevent too frequent updates
      const now = Date.now()
      if (now - lastServerUpdateTime.current < 4000) return
      lastServerUpdateTime.current = now
      
      try {
        // Update conversation time in database
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationTimeSeconds: Math.floor(conversationTime),
            lastConversationStart: conversationStartTime?.toISOString()
          })
        })
        
        if (!response.ok) {
          console.error('❌ Failed to update conversation time:', response.status)
        } else {
          // Log milestone updates
          if (conversationTime % 300 === 0 && conversationTime > 0) {
            console.log(`💰 Billing milestone: ${Math.floor(conversationTime / 60)}min`)
          }
        }
      } catch (error) {
        console.error('❌ Error updating conversation time:', error)
      }
    }, [sessionId, conversationStartTime]),
    onExpire: useCallback(() => {
      console.log('⏰ Session timer expired')
      // Will be handled after endSession is defined
    }, [])
  })
  
  // Use time alerts
  useSessionTimeAlerts({
    remainingSeconds: timer.remainingSeconds,
    onTenMinuteWarning: useCallback(() => {
      console.log('⚠️ 10 minutes remaining')
      onTimeWarning?.(10)
    }, [onTimeWarning]),
    onFiveMinuteWarning: useCallback(() => {
      console.log('⚠️ 5 minutes remaining')
      onTimeWarning?.(5)
    }, [onTimeWarning]),
    onOneMinuteWarning: useCallback(() => {
      console.log('⚠️ 1 minute remaining')
      onTimeWarning?.(1)
    }, [onTimeWarning]),
    onThirtySecondWarning: useCallback(() => {
      console.log('⚠️ 30 seconds remaining')
      onTimeWarning?.(0.5)
    }, [onTimeWarning])
  })
  
  // Recovery timer for session restoration
  useSessionRecoveryTimer({
    sessionId: sessionRecovered ? sessionId : null,
    onRecoveryComplete: useCallback((conversationTime: number) => {
      setInitialConversationTime(conversationTime)
    }, [])
  })
  
  // Create a new session
  const createSession = useCallback(async (duration: SessionDuration, familyMembers?: FamilyMember[]): Promise<string | null> => {
    if (sessionCreationInProgress.current) {
      console.log('⚠️ Session creation already in progress')
      return null
    }
    
    sessionCreationInProgress.current = true
    
    try {
      // Get user profile for personalization
      let userProfile: UserProfile | null = null
      try {
        const profileResponse = await fetch('/api/user/profile')
        if (profileResponse.ok) {
          userProfile = await profileResponse.json()
        }
      } catch (error) {
        console.warn('Failed to fetch user profile:', error)
      }
      
      // Create session with API
      const sessionData = {
        date: new Date().toISOString(),
        duration,
        theme: `${therapyType.charAt(0).toUpperCase() + therapyType.slice(1)} Therapy Session`,
        status: 'active',
        forceNew: false,
        // These fields are not in the API validation schema but kept for backward compatibility
        familyMembers: familyMembers || [],
        therapyType,
        userName: userProfile?.name || 'Guest',
        partnerName: userProfile?.partnerName,
        familyMemberCount: familyMembers?.length || 0
      }
      
      const response = await fetch(API_ENDPOINTS.SESSIONS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      })
      
      if (!response.ok) {
        // Handle session conflict
        if (response.status === 409) {
          const errorData = await response.json()
          if (errorData.code === 'EXISTING_ACTIVE_SESSION') {
            // Throw with the conflict data so caller can handle it
            const conflictError = new Error('SESSION_CONFLICT')
            ;(conflictError as any).conflictData = errorData
            throw conflictError
          }
        }
        throw new Error('Failed to create session')
      }
      
      const data = await response.json()
      const newSessionId = data.session.id
      
      // Clean up any pending session data after successful creation
      sessionStorage.removeItem('pending-session-duration')
      sessionStorage.removeItem('pending-family-members')
      
      // Update state
      setSessionId(newSessionId)
      setSessionDuration(duration)
      setSessionStartTime(new Date())
      setInitialConversationTime(0)
      setInitialPausedTime(0)
      
      // Save to storage for recovery
      sessionStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_ID, newSessionId)
      sessionStorage.setItem(`session-${newSessionId}-start-time`, new Date().toISOString())
      sessionStorage.setItem('active-session-id', newSessionId)
      
      console.log(`✅ Created new session: ${newSessionId}`)
      onSessionCreated?.(newSessionId)
      
      return newSessionId
      
    } catch (error) {
      console.error('Error creating session:', error)
      onError?.(error as Error)
      return null
    } finally {
      sessionCreationInProgress.current = false
    }
  }, [therapyType, onSessionCreated, onError])
  
  // Check for active sessions
  const checkForActiveSession = useCallback(async (): Promise<SessionRecoveryData | null> => {
    if (sessionCheckInProgress.current) {
      return null
    }
    
    sessionCheckInProgress.current = true
    
    try {
      const response = await fetch(API_ENDPOINTS.SESSION_ACTIVE)
      if (!response.ok) {
        return null
      }
      
      const activeSession = await response.json()
      if (!activeSession || activeSession.status !== 'ACTIVE') {
        return null
      }
      
      // Check if session has expired based on conversation time
      const duration = activeSession.duration || DEFAULT_SESSION_DURATION
      const conversationMinutes = (activeSession.conversationTimeSeconds || 0) / 60
      
      if (conversationMinutes >= duration) {
        console.log('⏰ Active session has expired based on conversation time')
        return null
      }
      
      // Calculate current conversation time if session is active
      let currentConversationTime = activeSession.conversationTimeSeconds || 0
      if (activeSession.lastConversationStart && !activeSession.isPaused) {
        const activeTime = Math.floor(
          (Date.now() - new Date(activeSession.lastConversationStart).getTime()) / 1000
        )
        currentConversationTime += activeTime
      }
      
      // Build recovery data
      const recoveryData: SessionRecoveryData = {
        sessionId: activeSession.id,
        originalStart: activeSession.startTime,
        recoveredAt: new Date().toISOString(),
        conversationTimeMinutes: currentConversationTime / 60,
        conversationTimeSeconds: currentConversationTime,
        remainingMinutes: duration - (currentConversationTime / 60),
        elapsedTimeSeconds: currentConversationTime,
        totalPausedTimeSeconds: activeSession.totalPausedTimeSeconds || 0,
        therapyType: activeSession.therapyType,
        sessionDuration: activeSession.duration,
        autoRestarted: false,
        sessionData: {
          id: activeSession.id,
          startTime: activeSession.startTime,
          duration: activeSession.duration,
          status: activeSession.status,
          theme: activeSession.theme || activeSession.therapyType,
          therapyType: activeSession.therapyType,
          isPaused: activeSession.isPaused
        }
      }
      
      return recoveryData
      
    } catch (error) {
      console.error('Error checking for active session:', error)
      return null
    } finally {
      sessionCheckInProgress.current = false
    }
  }, [])
  
  // Recover an existing session
  const recoverSession = useCallback(async (recoveryData: SessionRecoveryData): Promise<void> => {
    try {
      console.log('🔄 Recovering session:', recoveryData.sessionId)
      
      setSessionId(recoveryData.sessionId)
      setSessionStartTime(new Date(recoveryData.originalStart))
      setSessionDuration((recoveryData.sessionDuration || DEFAULT_SESSION_DURATION) as 30 | 60)
      setInitialConversationTime(recoveryData.conversationTimeSeconds)
      setInitialPausedTime(recoveryData.totalPausedTimeSeconds || 0)
      setSessionRecovered(true)
      
      // Save recovery state
      sessionStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_ID, recoveryData.sessionId)
      sessionStorage.setItem('active-session-id', recoveryData.sessionId)
      
      onSessionRecovered?.(recoveryData)
      
    } catch (error) {
      console.error('Error recovering session:', error)
      onError?.(error as Error)
    }
  }, [onSessionRecovered, onError])
  
  // Pause the session
  const pauseSession = useCallback(async (): Promise<void> => {
    if (!sessionId || isSessionPaused) return
    
    try {
      const pauseTime = new Date()
      setIsSessionPaused(true)
      setPauseStartTime(pauseTime)
      setIsConversationActive(false)
      
      // Save pause state for recovery
      const pauseState = {
        pausedAt: pauseTime.toISOString(),
        conversationTimeSeconds: timer.conversationTimeSeconds,
        totalPausedTimeSeconds: timer.pausedTimeSeconds,
        sessionId,
        therapyType,
        selectedSessionDuration: sessionDuration
      }
      
      sessionStorage.setItem(`session-${sessionId}-pause-state`, JSON.stringify(pauseState))
      
      // Update session in database
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPaused: true,
          pauseStartTime: pauseTime.toISOString(),
          conversationTimeSeconds: timer.conversationTimeSeconds
        })
      })
      
      console.log('✅ Session paused successfully')
      
    } catch (error) {
      console.error('Error pausing session:', error)
      onError?.(error as Error)
    }
  }, [sessionId, isSessionPaused, timer.conversationTimeSeconds, timer.pausedTimeSeconds, therapyType, sessionDuration, onError])
  
  // Resume the session
  const resumeSession = useCallback(async (): Promise<void> => {
    if (!sessionId || !isSessionPaused) return
    
    try {
      setIsSessionPaused(false)
      setPauseStartTime(null)
      setConversationStartTime(new Date())
      setIsConversationActive(true)
      
      // Clear pause state
      sessionStorage.removeItem(`session-${sessionId}-pause-state`)
      
      // Update session in database
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPaused: false,
          pauseStartTime: null,
          lastConversationStart: new Date().toISOString(),
          totalPausedTimeSeconds: timer.pausedTimeSeconds
        })
      })
      
      console.log('✅ Session resumed successfully')
      
    } catch (error) {
      console.error('Error resuming session:', error)
      onError?.(error as Error)
    }
  }, [sessionId, isSessionPaused, timer.pausedTimeSeconds, onError])
  
  // End the session
  const endSession = useCallback(async (reason: string = 'normal'): Promise<void> => {
    if (!sessionId || isEndingSession) return
    
    setIsEndingSession(true)
    
    try {
      // Get final time values from timer
      const finalConversationTime = timer.conversationTimeSeconds
      const finalPausedTime = timer.pausedTimeSeconds
      
      // Calculate final metrics
      const actualDurationMinutes = Math.ceil(finalConversationTime / 60)
      const totalPausedMinutes = Math.floor(finalPausedTime / 60)
      const billableMinutes = actualDurationMinutes
      
      const completionData: SessionCompletionData = {
        actualDurationMinutes,
        totalConversationMinutes: actualDurationMinutes,
        totalPausedMinutes,
        billableMinutes,
        transcriptCount: 0, // Will be calculated by the API
        completedAt: new Date().toISOString(),
        completionNotes: reason !== 'normal' ? reason : undefined
      }
      
      // Flush any pending transcripts before completing the session
      console.log('💾 Flushing pending transcripts before session completion...')
      await flushSessionTranscripts(sessionId)
      
      // Complete session via API
      const response = await fetch(API_ENDPOINTS.SESSION_COMPLETE(sessionId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualDurationMinutes,
          totalConversationMinutes: actualDurationMinutes,
          totalPausedMinutes,
          billableMinutes,
          completionNotes: completionData.completionNotes,
          conversationTimeSeconds: finalConversationTime,
          totalPausedTimeSeconds: finalPausedTime
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to complete session')
      }
      
      console.log(`✅ Session ${sessionId} completed successfully`)
      console.log(`📊 Final billing: ${billableMinutes} minutes`)
      onSessionCompleted?.(completionData)
      
      // Clear session state
      clearSessionState()
      
    } catch (error) {
      console.error('Error ending session:', error)
      onError?.(error as Error)
    } finally {
      setIsEndingSession(false)
    }
  }, [sessionId, isEndingSession, timer.conversationTimeSeconds, timer.pausedTimeSeconds, onSessionCompleted, onError])
  
  // Start conversation timer
  const startConversationTimer = useCallback((overrideSessionId?: string) => {
    const activeSessionId = overrideSessionId || sessionId
    if (!activeSessionId) return
    
    setConversationStartTime(new Date())
    setIsConversationActive(true)
    console.log(`⏱️ Started conversation timer for session: ${activeSessionId}`)
  }, [sessionId])
  
  // Clear all session state
  const clearSessionState = useCallback(() => {
    setSessionId(null)
    setSessionStartTime(null)
    setSessionRecovered(false)
    setIsSessionPaused(false)
    setPauseStartTime(null)
    setConversationStartTime(null)
    setIsConversationActive(false)
    setInitialConversationTime(0)
    setInitialPausedTime(0)
    
    // Clear storage
    sessionStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION_ID)
    sessionStorage.removeItem('active-session-id')
  }, [])
  
  // Save session backup periodically
  useEffect(() => {
    if (!sessionId || !sessionStartTime) return
    
    const saveBackup = () => {
      const backup = {
        sessionId,
        conversationTimeSeconds: timer.conversationTimeSeconds,
        totalPausedTimeSeconds: timer.pausedTimeSeconds,
        isSessionPaused,
        sessionStartTime: sessionStartTime.toISOString(),
        savedAt: new Date().toISOString()
      }
      
      sessionStorage.setItem(`session-${sessionId}-backup`, JSON.stringify(backup))
    }
    
    const backupInterval = setInterval(saveBackup, 30000) // Every 30 seconds
    
    return () => clearInterval(backupInterval)
  }, [sessionId, sessionStartTime, timer.conversationTimeSeconds, timer.pausedTimeSeconds, isSessionPaused])

  // Set up timer expiration handler after endSession is defined
  useEffect(() => {
    if (timer.isExpired) {
      endSession('timer_expired')
    }
  }, [timer.isExpired, endSession])
  
  // Restore pause state on mount
  useEffect(() => {
    if (!sessionId) return
    
    const pauseStateKey = `session-${sessionId}-pause-state`
    const pauseState = sessionStorage.getItem(pauseStateKey)
    
    if (pauseState) {
      try {
        const parsed = JSON.parse(pauseState)
        if (parsed.pausedAt && !parsed.resumedAt) {
          setIsSessionPaused(true)
          setPauseStartTime(new Date(parsed.pausedAt))
        }
      } catch (error) {
        console.warn('Error parsing pause state:', error)
      }
    }
  }, [sessionId])
  
  return {
    // Session state
    sessionId,
    sessionStartTime,
    sessionDuration,
    sessionRecovered,
    isEndingSession,
    
    // Pause state
    isSessionPaused,
    pauseStartTime,
    totalPausedTimeSeconds: timer.pausedTimeSeconds,
    
    // Conversation time
    conversationTimeSeconds: timer.conversationTimeSeconds,
    conversationStartTime,
    
    // Timer state
    timerState: {
      remainingSeconds: timer.remainingSeconds,
      formattedRemaining: timer.formattedRemaining,
      formattedElapsed: timer.formattedElapsed,
      formattedConversation: timer.formattedConversation,
      progressPercentage: timer.progressPercentage,
      isExpired: timer.isExpired
    },
    
    // Methods
    createSession,
    checkForActiveSession,
    recoverSession,
    pauseSession,
    resumeSession,
    endSession,
    startConversationTimer,
    
    // Guards
    isSessionCreationInProgress: () => sessionCreationInProgress.current
  }
}