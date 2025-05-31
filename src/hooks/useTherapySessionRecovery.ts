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

  const checkForActiveSession = useCallback(async () => {
    // Only check if user is authenticated and we're specifically on the therapy page
    if (status !== 'authenticated' || !session?.user?.id) {
      return null
    }

    // Check if there's already an active session indicator
    const hasSessionActiveClass = document.body.classList.contains('session-active')
    if (hasSessionActiveClass) {
      console.log('Session already active - skipping recovery check')
      return null
    }

    console.log('🔍 Checking for active therapy session on therapy page...')
    setRecoveryState(prev => ({ ...prev, isChecking: true }))

    try {
      const response = await fetch(`/api/sessions/active?userId=${session.user.id}`)
      
      if (response.ok) {
        const activeSession = await response.json()
        
        if (activeSession && activeSession.id) {
          console.log('🎯 Active therapy session found:', activeSession.id)
          
          // Check if session is still valid (within duration limits)
          let isSessionValid = false
          let remainingMinutes = 0
          
          if (activeSession.startTime && activeSession.duration) {
            const sessionStart = new Date(activeSession.startTime)
            const sessionDuration = activeSession.duration
            const now = new Date()
            const elapsedMs = now.getTime() - sessionStart.getTime()
            const elapsedMinutes = Math.floor(elapsedMs / 60000)
            remainingMinutes = sessionDuration - elapsedMinutes
            
            isSessionValid = remainingMinutes > 0
            console.log(`📊 Session timing: ${elapsedMinutes}/${sessionDuration} minutes elapsed, ${remainingMinutes} remaining`)
          }
          
          if (isSessionValid) {
            setRecoveryState({
              isChecking: false,
              hasActiveSession: true,
              sessionData: {
                id: activeSession.id,
                startTime: activeSession.startTime,
                duration: activeSession.duration,
                status: activeSession.status,
                theme: activeSession.theme
              },
              shouldAutoRestart: true
            })

            console.log('✅ Valid session found - ready for auto-restart')
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
    }
  }, [session?.user?.id, status])

  // Only check for sessions when component mounts on therapy page
  useEffect(() => {
    if (status === 'authenticated') {
      // Small delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        checkForActiveSession()
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [status, checkForActiveSession])

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

  return recoveryState
}