// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Clock, AlertCircle } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type SessionModalMode = 'recovery' | 'conflict' | null

interface SessionData {
  sessionId: string
  originalStart: string
  recoveredAt: string
  conversationTimeMinutes?: number
  conversationTimeSeconds?: number
  elapsedMinutes?: number
  remainingMinutes: number
  autoRestarted: boolean
  sessionData: {
    id: string
    startTime: string
    duration: number
    status: string
    theme: string
    therapyType?: string
  }
}

interface UnifiedSessionModalProps {
  mode: SessionModalMode
  sessionData: SessionData | null
  conflictSession?: {
    theme: string
    conversationTimeSeconds: number
    startTime: string
  } | null
  onContinueSession: (sessionData: any) => void
  onStartNewSession: () => void
  onResume?: () => void
  onEndAndStartNew?: () => void
  onClose?: () => void
  formatTime?: (seconds: number) => string
}

export default function UnifiedSessionModal({ 
  mode,
  sessionData,
  conflictSession,
  onContinueSession, 
  onStartNewSession,
  onResume,
  onEndAndStartNew,
  onClose,
  formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }
}: UnifiedSessionModalProps) {
  const [showModal, setShowModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [elapsedTimeSeconds, setElapsedTimeSeconds] = useState<number>(0)
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fetchControllerRef = useRef<AbortController | null>(null)
  
  // Track last recovery check state to reduce logging
  const lastRecoveryCheckState = useRef<string | null>(null)
  const hasProcessedRecovery = useRef(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Handle recovery mode detection
  useEffect(() => {
    if (mode !== 'recovery') {
      hasProcessedRecovery.current = false
      return
    }

    let checkInterval: NodeJS.Timeout | null = null
    
    const checkForPendingRecovery = () => {
      try {
        const pendingRecovery = sessionStorage.getItem('session-recovery-pending')
        const recoveryCheckInProgress = sessionStorage.getItem('recovery-check-in-progress')
        
        if (recoveryCheckInProgress !== lastRecoveryCheckState.current) {
          lastRecoveryCheckState.current = recoveryCheckInProgress
        }
        
        if (pendingRecovery && !hasProcessedRecovery.current) {
          const data: SessionData = JSON.parse(pendingRecovery)
          
          // Check if recovery data is stale (older than 60 seconds)
          const recoveryAge = Date.now() - new Date(data.recoveredAt).getTime()
          if (recoveryAge > 60000) {
            console.log('🧹 Recovery data is stale, clearing')
            sessionStorage.removeItem('session-recovery-pending')
            return
          }
          
          hasProcessedRecovery.current = true
          console.log('🔔 Unified modal triggered for recovery')
          
          setShowModal(true)
          setElapsedTimeSeconds(data.conversationTimeSeconds || 0)
        }
      } catch (error) {
        console.warn('Error checking for pending session recovery:', error)
        sessionStorage.removeItem('session-recovery-pending')
      }
    }

    // Check immediately
    checkForPendingRecovery()
    
    // Set up interval
    checkInterval = setInterval(() => {
      if (!hasProcessedRecovery.current) {
        const shouldCheck = sessionStorage.getItem('recovery-check-in-progress') === 'true' || 
                          sessionStorage.getItem('session-recovery-pending')
        if (shouldCheck) {
          checkForPendingRecovery()
        }
      } else if (checkInterval) {
        clearInterval(checkInterval)
        checkInterval = null
      }
    }, 500)
    
    // Clear interval after 3 seconds
    const timeoutId = setTimeout(() => {
      if (checkInterval) {
        clearInterval(checkInterval)
        checkInterval = null
      }
    }, 3000)
    
    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'session-recovery-pending' && e.newValue && !hasProcessedRecovery.current) {
        checkForPendingRecovery()
      }
    }
    
    // Listen for custom events
    const handleCustomEvent = () => {
      if (!hasProcessedRecovery.current) {
        checkForPendingRecovery()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('session-recovery-ready', handleCustomEvent)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('session-recovery-ready', handleCustomEvent)
      if (checkInterval) {
        clearInterval(checkInterval)
      }
      clearTimeout(timeoutId)
    }
  }, [mode])

  // Handle conflict mode
  useEffect(() => {
    if (mode === 'conflict' && conflictSession) {
      setShowModal(true)
    } else if (mode === null) {
      setShowModal(false)
    }
  }, [mode, conflictSession])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showModal])

  const handleContinueSession = async () => {
    if (!sessionData && mode !== 'conflict') return
    
    setIsLoading(true)
    console.log('🔄 User chose to continue session')
    
    try {
      if (mode === 'recovery' && sessionData) {
        // Recovery flow - similar to ActiveSessionFoundModal
        const updatedRecoveryInfo = {
          ...sessionData,
          autoRestarted: true,
          recoveredAt: new Date().toISOString()
        }
        
        sessionStorage.setItem('session-recovered', JSON.stringify(updatedRecoveryInfo))
        sessionStorage.removeItem('session-recovery-pending')
        sessionStorage.setItem('current-session-id', sessionData.sessionId)
        sessionStorage.setItem('session-continue-trigger', JSON.stringify({
          sessionId: sessionData.sessionId,
          sessionData: sessionData.sessionData
        }))
        
        await onContinueSession(sessionData.sessionData)
        
        // Show success indicator
        showSuccessIndicator('Reconnecting to your session...')
        
        setTimeout(() => {
          setShowModal(false)
        }, 1500)
      } else if (mode === 'conflict' && onResume) {
        // Conflict flow - similar to SessionConflictDialog
        onResume()
        setShowModal(false)
      }
    } catch (error) {
      console.error('❌ Error continuing session:', error)
      setIsLoading(false)
      alert(`Failed to continue session: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleStartNew = async () => {
    setIsLoading(true)
    console.log('🆕 User chose to start new session')
    
    try {
      if (mode === 'recovery' && sessionData?.sessionId) {
        // End previous session properly
        console.log('🔚 Ending previous session:', sessionData.sessionId)
        const endResponse = await fetch(`/api/sessions/${sessionData.sessionId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            reason: 'User started new session',
            forceComplete: true 
          })
        })
        
        if (!endResponse.ok) {
          console.error('Failed to end previous session:', endResponse.status)
          // Continue anyway - user wants new session
        } else {
          console.log('✅ Previous session ended successfully')
        }
        
        // Clean up all recovery-related storage
        sessionStorage.removeItem('session-recovery-pending')
        sessionStorage.removeItem('current-session-id')
        sessionStorage.removeItem('session-recovered')
        sessionStorage.removeItem('recovery-check-in-progress')
        sessionStorage.removeItem('active-session-id')
        
        // Mark session as just ended for UI feedback
        if (sessionData?.sessionId) {
          sessionStorage.setItem('session-just-ended', JSON.stringify({
            sessionId: sessionData.sessionId,
            timestamp: Date.now(),
            reason: 'user-started-new'
          }))
        }
      }
      
      setShowModal(false)
      setIsLoading(false)
      
      // Small delay to ensure modal closes before triggering new session
      setTimeout(() => {
        if (mode === 'conflict' && onEndAndStartNew) {
          onEndAndStartNew()
        } else {
          onStartNewSession()
        }
      }, 200)
      
    } catch (error) {
      console.error('Error ending previous session:', error)
      setIsLoading(false)
      // Still proceed with new session - don't block user
      setTimeout(() => {
        onStartNewSession()
      }, 200)
    }
  }

  const showSuccessIndicator = (message: string) => {
    const successIndicator = document.createElement('div')
    successIndicator.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
      z-index: 10001;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: fadeInScale 0.3s ease-out;
    `
    successIndicator.innerHTML = `
      <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
      ${message}
    `
    
    const style = document.createElement('style')
    style.textContent = `
      @keyframes fadeInScale {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
    `
    document.head.appendChild(style)
    document.body.appendChild(successIndicator)
    
    setTimeout(() => {
      if (successIndicator.parentNode) {
        successIndicator.remove()
      }
      if (style.parentNode) {
        style.remove()
      }
    }, 2000)
  }

  // Update session data using Supabase Realtime
  useEffect(() => {
    let supabaseChannel: RealtimeChannel | null = null
    
    if (!sessionData || !showModal || mode !== 'recovery') {
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort()
        fetchControllerRef.current = null
      }
      return
    }

    const supabase = createClient()
    
    // Fetch latest session data once
    const fetchLatestSessionData = async () => {
      try {
        if (fetchControllerRef.current) {
          fetchControllerRef.current.abort()
        }
        
        fetchControllerRef.current = new AbortController()
        
        const response = await fetch(`/api/sessions/${sessionData.sessionId}`, {
          signal: fetchControllerRef.current.signal
        })
        
        if (response.ok) {
          const latestSession = await response.json()
          const status = latestSession.status?.toUpperCase()
          // Accept ACTIVE, PAUSED, and SCHEDULED — the API now returns adjusted conversationTimeSeconds
          // that includes unsaved active segment time from lastConversationStart
          if (['ACTIVE', 'PAUSED', 'SCHEDULED'].includes(status) && latestSession.conversationTimeSeconds !== undefined) {
            setElapsedTimeSeconds(latestSession.conversationTimeSeconds)
          }
        } else if (response.status === 404) {
          console.log('Session no longer exists, closing modal')
          setShowModal(false)
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn('Failed to fetch latest session data:', error)
        }
      }
    }

    fetchLatestSessionData()

    // Set up Supabase Realtime subscription
    supabaseChannel = supabase
      .channel(`session-updates-${sessionData.sessionId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'sessions',
          filter: `id=eq.${sessionData.sessionId}`
        },
        (payload) => {
          console.log('Real-time session update received:', payload)
          const updatedSession = payload.new
          
          if (updatedSession.status?.toUpperCase() === 'ACTIVE' && updatedSession.conversationTimeSeconds !== undefined) {
            setElapsedTimeSeconds(updatedSession.conversationTimeSeconds)
          }

          if (updatedSession.status?.toUpperCase() === 'COMPLETED' || updatedSession.status?.toUpperCase() === 'ERROR') {
            console.log('Session completed or errored, closing modal')
            setShowModal(false)
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'sessions',
          filter: `id=eq.${sessionData.sessionId}`
        },
        () => {
          console.log('Session deleted, closing modal')
          setShowModal(false)
        }
      )
      .subscribe()

    return () => {
      if (supabaseChannel) {
        supabase.removeChannel(supabaseChannel)
      }
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort()
        fetchControllerRef.current = null
      }
    }
  }, [sessionData, showModal, mode])

  if (!isClient || (!sessionData && !conflictSession)) {
    return null
  }

  // Determine content based on mode
  const isRecoveryMode = mode === 'recovery'
  const isConflictMode = mode === 'conflict'
  
  const displayData = isRecoveryMode ? sessionData : {
    sessionData: {
      theme: conflictSession?.theme || '',
      duration: 60,
    },
    conversationTimeSeconds: conflictSession?.conversationTimeSeconds || 0,
    remainingMinutes: 60 - Math.floor((conflictSession?.conversationTimeSeconds || 0) / 60)
  }

  // Resolve human-readable session type from DB enum
  const rawSessionType = (displayData?.sessionData as any)?.sessionType
    || (displayData?.sessionData as any)?.therapyType
    || ''
  const sessionTypeLabel = rawSessionType
    ? ({ SOLO: 'Solo Therapy', COUPLE: 'Couples Therapy', FAMILY: 'Family Therapy' } as Record<string, string>)[rawSessionType.toUpperCase()]
      ?? rawSessionType.charAt(0).toUpperCase() + rawSessionType.slice(1).toLowerCase() + ' Therapy'
    : 'AI Therapy Session'

  // Accurate time computation — single source of truth
  const totalSeconds = Math.max(1, (sessionData?.sessionData?.duration || 15) * 60)
  const usedSeconds = Math.max(0, Math.min(elapsedTimeSeconds, totalSeconds))
  const remainingSeconds = totalSeconds - usedSeconds

  const formatMMSS = (s: number) => {
    const m = Math.floor(Math.abs(s) / 60)
    const sec = Math.abs(s) % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }
  const formatMinutes = (s: number) => {
    const m = Math.floor(s / 60)
    return m === 1 ? '1 min' : `${m} min`
  }

  const hasConversationTime = usedSeconds > 0
  const remainingLabel = remainingSeconds > 0 ? `${formatMinutes(remainingSeconds)} left` : ''

  const modalContent = (
    <AnimatePresence>
      {showModal && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md z-[10000]"
            onClick={() => !isLoading && onClose && onClose()}
          />

          {/* ── Mobile: slides up from bottom  ── Tablet+: centered card ── */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.9 }}
            className="fixed inset-x-0 bottom-0 z-[10001] sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ delay: 0.05, duration: 0.2 }}
              className={[
                /* shared */
                'relative bg-white w-full overflow-hidden flex flex-col',
                /* mobile: bottom sheet feel */
                'rounded-t-3xl max-h-[92dvh]',
                /* tablet+: floating card */
                'sm:rounded-2xl sm:max-w-md sm:max-h-none sm:shadow-2xl',
                /* desktop: slightly wider */
                'lg:max-w-lg',
              ].join(' ')}
              data-active-session-modal={isRecoveryMode}
              data-session-conflict-modal={isConflictMode}
              onClick={e => e.stopPropagation()}
            >
              {/* ── Pull handle (mobile only) ── */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden" aria-hidden>
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              </div>

              {/* ── Hero header ── */}
              <div className={[
                'relative px-6 pt-5 pb-6 sm:pt-6 sm:pb-7',
                isRecoveryMode
                  ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800'
                  : 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500',
              ].join(' ')}>
                {/* Decorative glow */}
                <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden rounded-t-3xl sm:rounded-t-2xl">
                  <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/30 blur-2xl" />
                  <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/20 blur-xl" />
                </div>

                <div className="relative flex items-start gap-4">
                  {/* Pulse icon */}
                  <div className="relative flex-shrink-0 mt-0.5">
                    <div className={[
                      'absolute inset-0 rounded-full animate-ping opacity-40',
                      isRecoveryMode ? 'bg-blue-400' : 'bg-amber-300',
                    ].join(' ')} />
                    <div className={[
                      'relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center',
                      isRecoveryMode ? 'bg-white/20' : 'bg-white/25',
                    ].join(' ')}>
                      {isRecoveryMode ? (
                        /* Waveform / mic icon for therapy context */
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" />
                        </svg>
                      ) : (
                        <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="text-white font-bold text-xl sm:text-2xl leading-tight">
                      {isRecoveryMode ? 'Session Waiting' : 'Active Session'}
                    </h2>
                    <p className="text-white/75 text-sm sm:text-base mt-0.5 leading-snug">
                      {isRecoveryMode
                        ? hasConversationTime
                          ? 'Pick up right where you left off'
                          : 'Your session is reserved and ready'
                        : 'You have an ongoing therapy session'}
                    </p>
                  </div>

                  {/* Close button */}
                  {onClose && (
                    <button
                      onClick={() => !isLoading && onClose()}
                      className="flex-shrink-0 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                      aria-label="Close"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* ── Stat pills ── */}
                {isRecoveryMode && (
                  <div className="relative flex gap-3 mt-5">
                    {/* Elapsed */}
                    <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 text-center">
                      <p className="text-white/60 text-xs font-medium uppercase tracking-wide mb-1">Used</p>
                      <p className="text-white font-bold text-xl sm:text-2xl leading-none tabular-nums">
                        {formatMMSS(usedSeconds)}
                      </p>
                    </div>
                    {/* Remaining */}
                    <div className={[
                      'flex-1 rounded-2xl px-4 py-3 text-center',
                      remainingSeconds <= 0
                        ? 'bg-red-400/30 backdrop-blur-sm'
                        : remainingSeconds <= totalSeconds * 0.25
                          ? 'bg-amber-400/30 backdrop-blur-sm'
                          : 'bg-white/15 backdrop-blur-sm',
                    ].join(' ')}>
                      <p className="text-white/60 text-xs font-medium uppercase tracking-wide mb-1">
                        {remainingSeconds <= 0 ? 'Over time' : 'Remaining'}
                      </p>
                      <p className={[
                        'font-bold text-xl sm:text-2xl leading-none tabular-nums',
                        remainingSeconds <= 0 ? 'text-red-200' : 'text-white',
                      ].join(' ')}>
                        {remainingSeconds <= 0
                          ? `+${formatMMSS(usedSeconds - totalSeconds)}`
                          : formatMMSS(remainingSeconds)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Conflict mode duration */}
                {isConflictMode && conflictSession && (
                  <div className="relative flex gap-3 mt-5">
                    <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 text-center">
                      <p className="text-white/60 text-xs font-medium uppercase tracking-wide mb-1">Duration</p>
                      <p className="text-white font-bold text-lg sm:text-xl leading-none">
                        {formatTime(conflictSession.conversationTimeSeconds || 0)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Body ── */}
              <div className="px-5 py-4 sm:px-6 sm:py-5 flex-1 overflow-y-auto">
                {/* Session name row */}
                <div className="flex items-center gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className={[
                    'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    isRecoveryMode ? 'bg-blue-100' : 'bg-amber-100',
                  ].join(' ')}>
                    <svg className={['w-5 h-5', isRecoveryMode ? 'text-blue-600' : 'text-amber-600'].join(' ')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Session</p>
                    <p className="text-gray-900 font-semibold text-sm sm:text-base truncate">
                      {sessionTypeLabel}
                    </p>
                  </div>
                  {/* Status badge */}
                  <div className="ml-auto flex-shrink-0">
                    <span className={[
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
                      hasConversationTime
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700',
                    ].join(' ')}>
                      <span className={[
                        'w-1.5 h-1.5 rounded-full',
                        hasConversationTime ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500',
                      ].join(' ')} />
                      {hasConversationTime ? 'Paused' : 'Ready'}
                    </span>
                  </div>
                </div>

                {/* Contextual message */}
                <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-500 leading-relaxed px-0.5">
                  {isRecoveryMode
                    ? hasConversationTime
                      ? 'Your session was interrupted. Continue to reconnect with your therapist — your progress is saved.'
                      : 'A session is reserved for you. Continue to start talking, or discard it to begin fresh.'
                    : 'Would you like to resume your existing session or end it and start a new one?'}
                </p>
              </div>

              {/* ── Actions ── */}
              <div className="px-5 pb-6 pt-3 sm:px-6 sm:pb-6 space-y-3 bg-white">
                {/* Primary: Continue */}
                <motion.button
                  onClick={handleContinueSession}
                  disabled={isLoading}
                  whileTap={{ scale: 0.975 }}
                  className={[
                    'w-full flex items-center justify-center gap-2.5',
                    'py-4 sm:py-3.5 px-5 rounded-2xl sm:rounded-xl',
                    'font-semibold text-base sm:text-sm text-white',
                    'transition-all duration-150 active:scale-[0.98]',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                    isRecoveryMode ? 'shadow-lg shadow-blue-500/30' : 'shadow-lg shadow-amber-500/25',
                    isRecoveryMode
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                      : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700',
                  ].join(' ')}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Connecting…</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {isRecoveryMode
                          ? sessionData?.isOverTime
                            ? 'Continue Session'
                            : remainingLabel
                              ? `Continue Session · ${remainingLabel}`
                              : 'Continue Session'
                          : 'Resume Session'}
                      </span>
                    </>
                  )}
                </motion.button>

                {/* Secondary: End & Start New */}
                <motion.button
                  onClick={handleStartNew}
                  disabled={isLoading}
                  whileTap={{ scale: 0.975 }}
                  className={[
                    'w-full flex items-center justify-center gap-2.5',
                    'py-4 sm:py-3.5 px-5 rounded-2xl sm:rounded-xl',
                    'font-semibold text-base sm:text-sm',
                    'border-2 border-gray-200 bg-white text-gray-600',
                    'hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800',
                    'transition-all duration-150 active:scale-[0.98]',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                  ].join(' ')}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400/40 border-t-gray-500 rounded-full animate-spin" />
                      <span>Ending…</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>
                        {isConflictMode ? 'End & Start New' : 'Discard & Start Fresh'}
                      </span>
                    </>
                  )}
                </motion.button>

                {/* Cancel (conflict mode only) */}
                {isConflictMode && onClose && (
                  <button
                    onClick={() => !isLoading && onClose()}
                    disabled={isLoading}
                    className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}

                {/* Safe area spacer (iOS home indicator) */}
                <div className="h-safe-bottom sm:hidden" style={{ height: 'env(safe-area-inset-bottom)' }} />
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  let modalRoot = document.getElementById("modal-root")
  if (!modalRoot) {
    modalRoot = document.createElement("div")
    modalRoot.id = "modal-root"
    document.body.appendChild(modalRoot)
  }

  return createPortal(modalContent, modalRoot)
}