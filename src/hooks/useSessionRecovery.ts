'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

interface RecoveryData {
  sessionId: string
  vapiCallId: string
  assistantId: string
  startTime: string
  creditsUsed: number
  therapyType: 'solo' | 'couple' | 'family'
  sessionLength: number
  familyMembers?: Array<{ name: string; age: number; relation: string }>
}

interface UseSessionRecoveryOptions {
  checkInterval?: number
  gracePeriodMinutes?: number
  onRecoveryFound?: (data: RecoveryData) => void
  onRecoveryFailed?: (error: Error) => void
  autoRecover?: boolean
}

export function useSessionRecovery(options: UseSessionRecoveryOptions = {}) {
  const {
    checkInterval = 5000,
    gracePeriodMinutes = 5,
    onRecoveryFound,
    onRecoveryFailed,
    autoRecover = true
  } = options

  const { data: session } = useSession()
  const [isChecking, setIsChecking] = useState(false)
  const [recoveryData, setRecoveryData] = useState<RecoveryData | null>(null)
  const [hasChecked, setHasChecked] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  const checkTimeoutRef = useRef<NodeJS.Timeout>()
  const hasAttemptedRecoveryRef = useRef(false)

  const checkForRecoverableSession = useCallback(async () => {
    if (!session?.user?.id || isChecking || hasChecked) {
      return null
    }

    setIsChecking(true)
    
    try {
      const response = await fetch('/api/sessions/check-recovery', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 404) {
          // No recoverable session found
          setHasChecked(true)
          return null
        }
        throw new Error(`Recovery check failed: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.recoverable && data.session) {
        const recovery: RecoveryData = {
          sessionId: data.session.id,
          vapiCallId: data.session.vapiCallId || '',
          assistantId: data.session.assistantId || '',
          startTime: data.session.startTime || new Date().toISOString(),
          creditsUsed: data.session.creditsUsed || 0,
          therapyType: data.session.therapyType || 'solo',
          sessionLength: data.session.sessionLength || 30,
          familyMembers: data.session.familyMembers
        }

        setRecoveryData(recovery)
        
        if (onRecoveryFound) {
          onRecoveryFound(recovery)
        }

        if (autoRecover && !hasAttemptedRecoveryRef.current) {
          hasAttemptedRecoveryRef.current = true
          await attemptRecovery(recovery)
        }

        return recovery
      }

      setHasChecked(true)
      return null
    } catch (error) {
      console.error('[SessionRecovery] Check failed:', error)
      
      if (onRecoveryFailed) {
        onRecoveryFailed(error as Error)
      }
      
      setHasChecked(true)
      return null
    } finally {
      setIsChecking(false)
    }
  }, [session?.user?.id, isChecking, hasChecked, onRecoveryFound, onRecoveryFailed, autoRecover])

  const attemptRecovery = useCallback(async (data: RecoveryData) => {
    if (isRecovering) {
      console.log('[SessionRecovery] Already recovering, skipping')
      return false
    }

    setIsRecovering(true)

    try {
      console.log('[SessionRecovery] Attempting recovery for session:', data.sessionId)
      
      // Update session status to mark as recovering
      const updateResponse = await fetch(`/api/sessions/${data.sessionId}/update-recovery`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isRecovering: true,
          recoveryStartedAt: new Date().toISOString()
        })
      })

      if (!updateResponse.ok) {
        throw new Error('Failed to update recovery status')
      }

      toast.success('Session recovered! Reconnecting...', {
        description: 'Your previous session has been restored.',
        duration: 5000
      })

      setHasChecked(true)
      return true
    } catch (error) {
      console.error('[SessionRecovery] Recovery failed:', error)
      
      toast.error('Recovery failed', {
        description: 'Unable to restore your previous session. Please start a new one.',
        duration: 5000
      })

      if (onRecoveryFailed) {
        onRecoveryFailed(error as Error)
      }

      return false
    } finally {
      setIsRecovering(false)
    }
  }, [isRecovering, onRecoveryFailed])

  const dismissRecovery = useCallback(async () => {
    if (!recoveryData) return

    try {
      // Mark session as abandoned
      await fetch(`/api/sessions/${recoveryData.sessionId}/abandon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      setRecoveryData(null)
      setHasChecked(true)
      hasAttemptedRecoveryRef.current = false
      
      toast.info('Previous session dismissed', {
        description: 'You can start a new session whenever you're ready.'
      })
    } catch (error) {
      console.error('[SessionRecovery] Failed to dismiss recovery:', error)
    }
  }, [recoveryData])

  // Check for recoverable session on mount and when session changes
  useEffect(() => {
    if (session?.user?.id && !hasChecked && !isChecking) {
      // Initial check after a short delay
      const initialTimeout = setTimeout(() => {
        checkForRecoverableSession()
      }, 1000)

      return () => clearTimeout(initialTimeout)
    }
  }, [session?.user?.id, hasChecked, isChecking, checkForRecoverableSession])

  // Periodic check if configured
  useEffect(() => {
    if (checkInterval > 0 && session?.user?.id && !hasChecked && !recoveryData) {
      const interval = setInterval(() => {
        checkForRecoverableSession()
      }, checkInterval)

      return () => clearInterval(interval)
    }
  }, [checkInterval, session?.user?.id, hasChecked, recoveryData, checkForRecoverableSession])

  return {
    recoveryData,
    isChecking,
    isRecovering,
    hasChecked,
    checkForRecoverableSession,
    attemptRecovery: () => recoveryData ? attemptRecovery(recoveryData) : Promise.resolve(false),
    dismissRecovery
  }
}