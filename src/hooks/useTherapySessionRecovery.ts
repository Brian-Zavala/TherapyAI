'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface TherapySessionRecoveryState {
  isChecking: boolean
  hasActiveSession: boolean
  sessionData: {
    id?: string
    startTime?: string
    duration?: number
    status?: string
    theme?: string
  } | null
  shouldAutoRestart: boolean
}

export function useTherapySessionRecovery() {
  const { data: session, status } = useSession()
  
  const [recoveryState, setRecoveryState] = useState<TherapySessionRecoveryState>({
    isChecking: false,
    hasActiveSession: false,
    sessionData: null,
    shouldAutoRestart: false
  })
  
  // Deduplication tracking with session key to handle HMR/Fast Refresh
  // Use a stable session key that won't change unexpectedly
  const getStableSessionKey = useCallback((userSession: typeof session) => {
    if (!userSession?.user?.id) return 'no-session'
    // Create a stable key that won't change with object reference changes
    return `user-${userSession.user.id}`
  }, [])
  
  const sessionKey = getStableSessionKey(session)
  const [hasCheckedThisSession, setHasCheckedThisSession] = useState(false)
  const [lastSessionKey, setLastSessionKey] = useState<string | null>(null)
  
  // Reset check status when session changes (handles HMR/Fast Refresh)
  useEffect(() => {
    if (sessionKey !== lastSessionKey) {
      setHasCheckedThisSession(false)
      setLastSessionKey(sessionKey)
      // 2025 Standard: Only log during debug mode
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_RECOVERY === 'true') {
        console.log('🔄 Session key changed, resetting recovery check status')
      }
    }
  }, [sessionKey, lastSessionKey])

  const checkForActiveSession = useCallback(async () => {
    // Only check if user is authenticated and we're specifically on the therapy page
    if (status !== 'authenticated' || !session?.user?.id) {
      console.log('🔍 Session recovery: Not authenticated or no user ID')
      return null
    }
    
    // More lenient deduplication: Allow re-checking if previous attempt failed or if enough time has passed
    const timeSinceLastCheck = Date.now() - (window.sessionStorage.getItem('last-recovery-check-time') ? parseInt(window.sessionStorage.getItem('last-recovery-check-time')!) : 0)
    const RECOVERY_CHECK_COOLDOWN = 5000 // 5 seconds cooldown between checks
    
    if (hasCheckedThisSession && timeSinceLastCheck < RECOVERY_CHECK_COOLDOWN) {
      console.log('🔄 Session recovery check on cooldown - skipping duplicate check')
      return null
    }

    // Less restrictive session active check - only skip if we have a valid current session ID
    const currentSessionId = sessionStorage.getItem('current-session-id')
    const hasSessionActiveClass = document.body.classList.contains('session-active')
    if (hasSessionActiveClass && currentSessionId) {
      console.log('Session already active with valid session ID - skipping recovery check')
      return null
    }
    
    // Check if recovery is already pending, but allow if it's stale (older than 30 seconds)
    const existingRecovery = sessionStorage.getItem('session-recovery-pending')
    if (existingRecovery) {
      try {
        const recoveryData = JSON.parse(existingRecovery)
        const recoveryAge = Date.now() - new Date(recoveryData.recoveredAt).getTime()
        if (recoveryAge < 30000) { // 30 seconds
          console.log('🔄 Recent session recovery already pending - skipping duplicate check')
          // Set flag that we found pending recovery
          setRecoveryState({
            isChecking: false,
            hasActiveSession: true,
            sessionData: recoveryData.sessionData,
            shouldAutoRestart: false // Let modal handle it
          })
          return null
        } else {
          console.log('🧹 Clearing stale session recovery data (age:', Math.round(recoveryAge/1000), 'seconds)')
          sessionStorage.removeItem('session-recovery-pending')
        }
      } catch (error) {
        console.warn('Error parsing existing recovery data, clearing it:', error)
        sessionStorage.removeItem('session-recovery-pending')
      }
    }
    
    // Set flag that we're checking to prevent modal from checking simultaneously
    sessionStorage.setItem('recovery-check-in-progress', 'true')
    
    // Set a timeout to clear the flag in case something goes wrong
    const flagTimeout = setTimeout(() => {
      sessionStorage.removeItem('recovery-check-in-progress')
    }, 10000) // 10 second safety timeout

    // 2025 Standard: Reduce console noise - only log significant events
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_RECOVERY === 'true') {
      console.log('🔍 Checking for active therapy session...')
    }
    
    // CRITICAL: Check if a session just ended to prevent recovery attempts
    const justEndedData = sessionStorage.getItem('session-just-ended')
    if (justEndedData) {
      try {
        const { sessionId, timestamp } = JSON.parse(justEndedData)
        const age = Date.now() - timestamp
        
        // If session ended less than 10 seconds ago, skip recovery
        if (age < 10000) {
          console.log('🚫 Session just ended, skipping recovery check for:', sessionId)
          setRecoveryState(prev => ({ 
            ...prev, 
            isChecking: false,
            hasActiveSession: false,
            sessionData: null,
            shouldAutoRestart: false
          }))
          return null
        } else {
          // Clean up old data
          sessionStorage.removeItem('session-just-ended')
        }
      } catch (e) {
        console.warn('Failed to parse session-just-ended data:', e)
        sessionStorage.removeItem('session-just-ended')
      }
    }
    
    setRecoveryState(prev => ({ ...prev, isChecking: true }))
    setHasCheckedThisSession(true) // Mark as checked to prevent duplicate runs
    sessionStorage.setItem('last-recovery-check-time', Date.now().toString())

    try {
      const response = await fetch(`/api/sessions/active?userId=${session.user.id}`)
      
      if (response.ok) {
        const activeSession = await response.json()
        
        if (activeSession && activeSession.id) {
          console.log('🎯 Active therapy session found:', activeSession.id)
          
          // CRITICAL SAFEGUARD: Double-check session status to prevent completed sessions from being recovered
          if (activeSession.status === 'completed') {
            console.log('🚫 Session status is "completed" - cannot recover completed sessions')
            setRecoveryState(prev => ({ 
              ...prev, 
              isChecking: false,
              hasActiveSession: false,
              sessionData: null,
              shouldAutoRestart: false
            }))
            return null
          }
          
          // Calculate session timing (for display only - sessions never auto-expire)
          let remainingMinutes = 0
          let conversationTimeSeconds = 0
          let conversationTimeMinutes = 0
          let isOverTime = false
          
          if (activeSession.duration) {
            const sessionDurationMinutes = activeSession.duration
            conversationTimeSeconds = activeSession.conversationTimeSeconds || 0
            conversationTimeMinutes = Math.floor(conversationTimeSeconds / 60)
            remainingMinutes = sessionDurationMinutes - conversationTimeMinutes
            isOverTime = remainingMinutes < 0
            
            console.log(`📊 Session timing (for display): ${conversationTimeMinutes}/${sessionDurationMinutes} minutes used`)
            console.log(`🕒 Total conversation time: ${conversationTimeSeconds} seconds`)
            if (isOverTime) {
              console.log(`⏰ Session is over time by ${Math.abs(remainingMinutes)} minutes (billing continues)`)
            } else {
              console.log(`⏳ ${remainingMinutes} minutes remaining in planned duration`)
            }
          }
          
          // Sessions are always valid - only user action can end them
          if (true) {
            setRecoveryState({
              isChecking: false,
              hasActiveSession: true,
              sessionData: {
                id: activeSession.id,
                startTime: activeSession.startTime,
                duration: activeSession.duration,
                status: activeSession.status,
                theme: activeSession.theme,
                conversationTimeSeconds: conversationTimeSeconds,
                conversationTimeMinutes: conversationTimeMinutes,
                remainingMinutes: remainingMinutes,
                isOverTime: isOverTime
              },
              shouldAutoRestart: true
            })

            console.log('✅ Valid session found - ready for auto-restart')
            
            // Store recovery info for the UI to use
            const recoveryInfo = {
              sessionId: activeSession.id,
              originalStart: activeSession.startTime,
              recoveredAt: new Date().toISOString(),
              conversationTimeMinutes: conversationTimeMinutes,
              conversationTimeSeconds: conversationTimeSeconds,
              remainingMinutes: remainingMinutes,
              autoRestarted: false, // Will be updated when session actually restarts
              sessionData: {
                ...activeSession,
                conversationTimeSeconds: conversationTimeSeconds // Ensure this is included
              }
            }
            
            sessionStorage.setItem('session-recovery-pending', JSON.stringify(recoveryInfo))
            console.log('💾 Session recovery info stored for UI')
            
            // Dispatch custom event to notify ActiveSessionFoundModal immediately
            window.dispatchEvent(new Event('session-recovery-ready'))
            console.log('📢 Dispatched session-recovery-ready event')
            
            return activeSession
          } else {
            console.log('⚠️ Session expired - not recovering')
            setRecoveryState(prev => ({ 
              ...prev, 
              isChecking: false,
              hasActiveSession: false,
              sessionData: null,
              shouldAutoRestart: false
            }))
            return null
          }
        } else {
          console.log('ℹ️ No active session found')
          setRecoveryState(prev => ({ 
            ...prev, 
            isChecking: false, 
            hasActiveSession: false,
            sessionData: null,
            shouldAutoRestart: false
          }))
          return null
        }
      } else {
        console.log('⚠️ Failed to check for active sessions:', response.status)
        setRecoveryState(prev => ({ ...prev, isChecking: false }))
        return null
      }
      
    } catch (error) {
      console.error('❌ Error checking for active sessions:', error)
      setRecoveryState(prev => ({ ...prev, isChecking: false }))
      return null
    } finally {
      // Always clear the in-progress flag
      sessionStorage.removeItem('recovery-check-in-progress')
      clearTimeout(flagTimeout)
    }
  }, [session?.user?.id, status, hasCheckedThisSession])

  // Only check for sessions when component mounts on therapy page
  useEffect(() => {
    if (status === 'authenticated' && !hasCheckedThisSession) {
      // Small delay to ensure page is fully loaded AND allow ActiveSessionFoundModal to check first
      const timer = setTimeout(() => {
        checkForActiveSession()
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [status]) // Removed checkForActiveSession dependency to prevent infinite loops
  
  // Clean up old session-just-ended data periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const justEndedData = sessionStorage.getItem('session-just-ended')
      if (justEndedData) {
        try {
          const { timestamp } = JSON.parse(justEndedData)
          const age = Date.now() - timestamp
          
          // Remove if older than 30 seconds
          if (age > 30000) {
            console.log('🧹 Cleaning up old session-just-ended data')
            sessionStorage.removeItem('session-just-ended')
          }
        } catch (e) {
          sessionStorage.removeItem('session-just-ended')
        }
      }
    }, 10000) // Check every 10 seconds
    
    return () => clearInterval(cleanupInterval)
  }, [])

  // Reset state when session becomes active to avoid duplicate checking
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const hasSessionActive = document.body.classList.contains('session-active')
          if (hasSessionActive && recoveryState.isChecking) {
            console.log('Session became active - stopping recovery check')
            setRecoveryState(prev => ({ ...prev, isChecking: false }))
          }
        }
      })
    })

    observer.observe(document.body, { attributes: true })
    return () => observer.disconnect()
  }, [recoveryState.isChecking])
  
  // Listen for session end events to reset recovery state
  useEffect(() => {
    const handleSessionEnded = () => {
      console.log('🔚 Session ended event received - resetting recovery state')
      setRecoveryState({
        isChecking: false,
        hasActiveSession: false,
        sessionData: null,
        shouldAutoRestart: false
      })
      // Clear any pending recovery data
      sessionStorage.removeItem('session-recovery-pending')
      sessionStorage.removeItem('recovery-check-in-progress')
    }
    
    window.addEventListener('sessionEnded', handleSessionEnded)
    return () => window.removeEventListener('sessionEnded', handleSessionEnded)
  }, [])

  return recoveryState
}