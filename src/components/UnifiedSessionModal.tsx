// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import SessionTimer from './SessionTimer'
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
  const [currentRemainingMinutes, setCurrentRemainingMinutes] = useState<number>(0)
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
          setCurrentRemainingMinutes(data.remainingMinutes)
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
          if (latestSession.status?.toUpperCase() === 'ACTIVE' && latestSession.conversationTimeSeconds !== undefined) {
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

  const modalContent = (
    <AnimatePresence>
      {showModal && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000]"
            onClick={() => !isLoading && onClose && onClose()}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.4 
            }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4 overflow-x-hidden"
          >
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-w-md w-full" 
                 data-active-session-modal={isRecoveryMode}
                 data-session-conflict-modal={isConflictMode}>
              {/* Header */}
              <div className={`px-6 py-4 ${isRecoveryMode ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'} text-white`}>
                <div className="flex items-center space-x-3">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: isRecoveryMode ? [0, 10, -10, 0] : [0, 5, -5, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    {isRecoveryMode ? (
                      <svg className="w-6 h-6 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    ) : (
                      <AlertCircle className="w-6 h-6 text-yellow-300" />
                    )}
                  </motion.div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {isRecoveryMode ? 'Active Session Found!' : 'Active Session Detected'}
                    </h3>
                    <p className="text-orange-100 text-sm">
                      {isRecoveryMode ? 'Your therapy session is still running' : 'You have an ongoing session'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-5 space-y-4">
                {/* Warning/Info message */}
                {isRecoveryMode ? (
                  (displayData?.conversationTimeSeconds || 0) > 0 ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm text-red-700">
                          <p className="font-medium">Session was in progress!</p>
                          <p>You have conversation time used. Continue to avoid losing progress.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm text-blue-700">
                          <p className="font-medium">Session is ready to continue!</p>
                          <p>No time has been used yet. Your session is paused and waiting.</p>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <p className="text-gray-600">
                    {conflictSession && (
                      <>You have an active session that started {Math.round(conflictSession.hoursAgo * 60)} minutes ago{conflictSession.remainingMinutes < 0 && ' (over time)'}:</>
                    )}
                  </p>
                )}

                {/* Session info */}
                {isRecoveryMode ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-blue-50 rounded-lg px-3 py-2">
                      <div className="text-blue-600 font-medium">Conversation Time</div>
                      <div className="text-blue-800 font-semibold">{formatTime(elapsedTimeSeconds)}</div>
                    </div>
                    <div className={`${sessionData?.isOverTime ? 'bg-amber-50' : 'bg-green-50'} rounded-lg px-3 py-2`}>
                      <div className={`${sessionData?.isOverTime ? 'text-amber-600' : 'text-green-600'} font-medium text-center mb-1`}>
                        {sessionData?.isOverTime ? 'Over Time' : 'Time Remaining'}
                      </div>
                      {sessionData?.isOverTime ? (
                        <div className="text-amber-800 font-semibold text-center">
                          +{Math.abs(sessionData.remainingMinutes || 0)}m
                          <div className="text-xs text-amber-600 mt-1">Billing continues</div>
                        </div>
                      ) : (
                        <SessionTimer
                          durationMinutes={sessionData?.sessionData.duration || 60}
                          conversationTimeSeconds={elapsedTimeSeconds}
                          isConversationActive={false}
                          className="scale-90"
                          showRecoveredIndicator={false}
                          onTimeUpdate={(remainingMinutes) => setCurrentRemainingMinutes(remainingMinutes)}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p className="font-medium text-gray-900">
                      {conflictSession?.theme || 'Therapy Session'}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Duration: {formatTime(conflictSession?.conversationTimeSeconds || 0)}</span>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <div className="text-gray-600 text-xs">Session Type</div>
                  <div className="text-gray-800 font-medium">
                    {displayData?.sessionData?.theme || 'Therapy Session'}
                  </div>
                </div>

                {isConflictMode && (
                  <p className="text-sm text-gray-600">
                    Would you like to resume this session or end it and start a new one?
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-gray-50 space-y-3">
                {/* Continue/Resume Button */}
                <motion.button
                  onClick={handleContinueSession}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {isRecoveryMode ? (
                          sessionData?.isOverTime ? 
                            `Continue Session (Over time by ${Math.abs(sessionData.remainingMinutes || 0)}m)` :
                            `Continue Session (${formatTime(currentRemainingMinutes * 60 || displayData?.remainingMinutes * 60)} left)`
                        ) : 
                          'Resume Session'
                        }
                      </span>
                    </>
                  )}
                </motion.button>

                {/* Start New Session Button */}
                <motion.button
                  onClick={handleStartNew}
                  disabled={isLoading}
                  className="w-full bg-gray-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Ending previous...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>End Previous & Start New</span>
                    </>
                  )}
                </motion.button>

                {/* Cancel button for conflict mode */}
                {isConflictMode && onClose && (
                  <button
                    onClick={() => onClose()}
                    disabled={isLoading}
                    className="w-full text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium py-2 px-4 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {/* Footer */}
              {isRecoveryMode && sessionData && (
                <div className="px-6 py-2 bg-gray-100 text-xs text-gray-600 text-center">
                  Session ID: {sessionData.sessionId.slice(-8)}...
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  const modalRoot = document.getElementById("modal-root")
  if (!modalRoot) {
    console.error("Modal root element not found")
    return null
  }

  return createPortal(modalContent, modalRoot)
}