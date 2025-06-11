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
import { isSessionExpired } from '@/lib/therapy-session/utils'

// Hook configuration interface
interface UseSessionManagementOptions {
  userId: string
  therapyType: string
  onSessionCreated?: (sessionId: string) => void
  onSessionRecovered?: (data: SessionRecoveryData) => void
  onSessionCompleted?: (data: SessionCompletionData) => void
  onError?: (error: Error) => void
}

// Hook return type
interface UseSessionManagementReturn {
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
  
  // Conversation time
  conversationTimeSeconds: number
  conversationStartTime: Date | null
  
  // Methods
  createSession: (duration: SessionDuration, familyMembers?: FamilyMember[]) => Promise<string | null>
  checkForActiveSession: () => Promise<SessionRecoveryData | null>
  recoverSession: (recoveryData: SessionRecoveryData) => Promise<void>
  pauseSession: () => Promise<void>
  resumeSession: () => Promise<void>
  endSession: (reason?: string) => Promise<void>
  updateConversationTime: (additionalSeconds: number) => void
  saveSessionBackup: () => void
  startConversationTimer: () => void
  
  // Guards
  isSessionCreationInProgress: () => boolean
}

/**
 * Custom hook for managing therapy session lifecycle
 * Handles session creation, recovery, pause/resume, and completion
 */
export function useSessionManagement(options: UseSessionManagementOptions): UseSessionManagementReturn {
  const { therapyType, onSessionCreated, onSessionRecovered, onSessionCompleted, onError } = options
  
  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [sessionDuration, setSessionDuration] = useState<SessionDuration>(DEFAULT_SESSION_DURATION)
  const [sessionRecovered, setSessionRecovered] = useState(false)
  const [isEndingSession, setIsEndingSession] = useState(false)
  
  // Pause state
  const [isSessionPaused, setIsSessionPaused] = useState(false)
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null)
  const [totalPausedTimeSeconds, setTotalPausedTimeSeconds] = useState(0)
  
  // Conversation time tracking
  const [conversationTimeSeconds, setConversationTimeSeconds] = useState(0)
  const [conversationStartTime, setConversationStartTime] = useState<Date | null>(null)
  
  // Guards to prevent duplicate operations
  const sessionCreationInProgress = useRef(false)
  const sessionCheckInProgress = useRef(false)
  
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
        throw new Error('Failed to create session')
      }
      
      const session = await response.json()
      const newSessionId = session.id
      
      // Update state
      setSessionId(newSessionId)
      setSessionDuration(duration)
      setSessionStartTime(new Date())
      setConversationTimeSeconds(0)
      setTotalPausedTimeSeconds(0)
      
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
      if (!activeSession || activeSession.status !== 'active') {
        return null
      }
      
      // Check if session has expired
      const startTime = new Date(activeSession.startTime)
      const duration = activeSession.duration || DEFAULT_SESSION_DURATION
      const conversationMinutes = (activeSession.conversationTimeSeconds || 0) / 60
      
      if (isSessionExpired(startTime, duration, conversationMinutes)) {
        console.log('⏰ Active session has expired')
        return null
      }
      
      // Build recovery data
      const recoveryData: SessionRecoveryData = {
        sessionId: activeSession.id,
        originalStart: activeSession.startTime,
        recoveredAt: new Date().toISOString(),
        conversationTimeMinutes: conversationMinutes,
        conversationTimeSeconds: activeSession.conversationTimeSeconds || 0,
        remainingMinutes: duration - conversationMinutes,
        autoRestarted: false,
        sessionData: activeSession,
        pauseInfo: activeSession.isPaused ? {
          isPaused: true,
          pauseStartTime: activeSession.pauseStartTime,
          totalPausedTime: activeSession.totalPausedTime || 0
        } : undefined
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
      // Update state with recovered session
      setSessionId(recoveryData.sessionId)
      setSessionStartTime(new Date(recoveryData.originalStart))
      setSessionDuration(recoveryData.sessionData.duration || DEFAULT_SESSION_DURATION)
      setConversationTimeSeconds(recoveryData.conversationTimeSeconds)
      setSessionRecovered(true)
      
      // Restore pause state if applicable
      if (recoveryData.pauseInfo?.isPaused) {
        setIsSessionPaused(true)
        setPauseStartTime(recoveryData.pauseInfo.pauseStartTime ? new Date(recoveryData.pauseInfo.pauseStartTime) : null)
        setTotalPausedTimeSeconds(recoveryData.pauseInfo.totalPausedTime || 0)
      }
      
      // Update storage
      sessionStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_ID, recoveryData.sessionId)
      sessionStorage.setItem(STORAGE_KEYS.SESSION_RECOVERED, JSON.stringify(recoveryData))
      
      console.log(`✅ Recovered session: ${recoveryData.sessionId}`)
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
      
      // Save pause state
      const pauseState = {
        pausedAt: pauseTime.toISOString(),
        conversationTimeSeconds,
        totalPausedTimeSeconds,
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
          pauseStartTime: pauseTime.toISOString()
        })
      })
      
      console.log('✅ Session paused successfully')
      
    } catch (error) {
      console.error('Error pausing session:', error)
      onError?.(error as Error)
    }
  }, [sessionId, isSessionPaused, conversationTimeSeconds, totalPausedTimeSeconds, therapyType, sessionDuration, onError])
  
  // Resume the session
  const resumeSession = useCallback(async (): Promise<void> => {
    if (!sessionId || !isSessionPaused) return
    
    try {
      // Calculate pause duration
      if (pauseStartTime) {
        const pauseDuration = Math.floor((Date.now() - pauseStartTime.getTime()) / 1000)
        setTotalPausedTimeSeconds(prev => prev + pauseDuration)
      }
      
      setIsSessionPaused(false)
      setPauseStartTime(null)
      setConversationStartTime(new Date())
      
      // Clear pause state
      sessionStorage.removeItem(`session-${sessionId}-pause-state`)
      
      // Update session in database
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPaused: false,
          pauseStartTime: null,
          lastConversationStart: new Date().toISOString()
        })
      })
      
      console.log('✅ Session resumed successfully')
      
    } catch (error) {
      console.error('Error resuming session:', error)
      onError?.(error as Error)
    }
  }, [sessionId, isSessionPaused, pauseStartTime, onError])
  
  // End the session
  const endSession = useCallback(async (reason: string = 'normal'): Promise<void> => {
    if (!sessionId || isEndingSession) return
    
    setIsEndingSession(true)
    
    try {
      // Calculate final metrics
      const actualDurationMinutes = Math.ceil(conversationTimeSeconds / 60)
      const totalPausedMinutes = Math.floor(totalPausedTimeSeconds / 60)
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
      
      // Complete session via API
      const response = await fetch(API_ENDPOINTS.SESSION_COMPLETE(sessionId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualDurationMinutes,
          totalConversationMinutes: actualDurationMinutes,
          totalPausedMinutes,
          billableMinutes,
          completionNotes: completionData.completionNotes
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to complete session')
      }
      
      console.log(`✅ Session ${sessionId} completed successfully`)
      onSessionCompleted?.(completionData)
      
      // Clear session state
      clearSessionState()
      
    } catch (error) {
      console.error('Error ending session:', error)
      onError?.(error as Error)
    } finally {
      setIsEndingSession(false)
    }
  }, [sessionId, isEndingSession, conversationTimeSeconds, totalPausedTimeSeconds, onSessionCompleted, onError])
  
  // Update conversation time
  const updateConversationTime = useCallback((additionalSeconds: number) => {
    setConversationTimeSeconds(prev => {
      const newTotal = prev + additionalSeconds
      console.log(`📊 Updated conversation time: +${additionalSeconds}s, total: ${newTotal}s`)
      return newTotal
    })
  }, [])
  
  // Save session backup
  const saveSessionBackup = useCallback(() => {
    if (!sessionId) return
    
    const backupData = {
      sessionId,
      timestamp: new Date().toISOString(),
      conversationTimeSeconds,
      totalPausedTimeSeconds,
      isPaused: isSessionPaused,
      therapyType
    }
    
    const backupKey = `session-${sessionId}-backup-time`
    sessionStorage.setItem(backupKey, JSON.stringify(backupData))
    
    console.log('💾 Session backup saved')
  }, [sessionId, conversationTimeSeconds, totalPausedTimeSeconds, isSessionPaused, therapyType])
  
  // Start conversation timer (when VAPI connects)
  const startConversationTimer = useCallback(() => {
    if (!sessionId || conversationStartTime) {
      console.log('⚠️ Conversation timer not started:', {
        sessionId: !!sessionId,
        conversationStartTime: !!conversationStartTime
      })
      return
    }
    
    const now = new Date()
    setConversationStartTime(now)
    
    console.log('⏱️ Conversation timer started at:', now.toISOString())
    
    // Update session in database
    if (sessionId) {
      fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationStartTime: now.toISOString()
        })
      }).then(response => {
        // Validate session still exists after async operation
        if (!response.ok && response.status === 404) {
          console.error('Session no longer exists, clearing state')
          clearSessionState()
        }
      }).catch(error => {
        console.error('Failed to update conversation start time:', error)
      })
    }
  }, [sessionId, conversationStartTime])
  
  // Clear session state
  const clearSessionState = () => {
    setSessionId(null)
    setSessionStartTime(null)
    setSessionDuration(DEFAULT_SESSION_DURATION)
    setSessionRecovered(false)
    setIsSessionPaused(false)
    setPauseStartTime(null)
    setTotalPausedTimeSeconds(0)
    setConversationTimeSeconds(0)
    setConversationStartTime(null)
    
    // Clear storage
    sessionStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION_ID)
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_RECOVERED)
    sessionStorage.removeItem('active-session-id')
    sessionStorage.removeItem('session-start-time')
  }
  
  // Check if session creation is in progress
  const isSessionCreationInProgress = useCallback(() => {
    return sessionCreationInProgress.current
  }, [])
  
  // Restore pause state on mount
  useEffect(() => {
    if (sessionId) {
      const pauseStateKey = `session-${sessionId}-pause-state`
      const pauseState = sessionStorage.getItem(pauseStateKey)
      
      if (pauseState) {
        try {
          const parsed = JSON.parse(pauseState)
          if (parsed.pausedAt && !parsed.resumedAt) {
            setIsSessionPaused(true)
            setPauseStartTime(new Date(parsed.pausedAt))
            setConversationTimeSeconds(parsed.conversationTimeSeconds || 0)
            setTotalPausedTimeSeconds(parsed.totalPausedTimeSeconds || 0)
          }
        } catch (error) {
          console.warn('Error parsing pause state:', error)
        }
      }
    }
  }, [sessionId])
  
  // Periodic session backup
  useEffect(() => {
    if (!sessionId || !sessionStartTime) return
    
    const backupInterval = setInterval(saveSessionBackup, 30000) // Every 30 seconds
    
    return () => clearInterval(backupInterval)
  }, [sessionId, sessionStartTime, saveSessionBackup])
  
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
    totalPausedTimeSeconds,
    
    // Conversation time
    conversationTimeSeconds,
    conversationStartTime,
    
    // Methods
    createSession,
    checkForActiveSession,
    recoverSession,
    pauseSession,
    resumeSession,
    endSession,
    updateConversationTime,
    saveSessionBackup,
    startConversationTimer,
    
    // Guards
    isSessionCreationInProgress
  }
}