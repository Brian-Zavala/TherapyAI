'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import SessionTimer from './SessionTimer'
import { createClient } from '@/utils/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { REALTIME_CHANNEL_STATES } from '@supabase/supabase-js'
import type { SessionData } from '@/types/therapy-session'

interface ActiveSessionData {
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

interface ActiveSessionFoundModalProps {
  onContinueSession: (sessionData: any) => void
  onStartNewSession: () => void
}

// Type for the real-time session update payload
interface SessionRealtimePayload {
  id: string
  status: string
  conversationTimeSeconds?: number
  pausedDuration?: number
  endTime?: string | null
  [key: string]: any
}

// Session statuses that should close the modal
const CLOSING_STATUSES = ['completed', 'error', 'cancelled', 'missed']

// Session statuses that are considered active
const ACTIVE_STATUSES = ['active', 'paused']

export default function ActiveSessionFoundModal({ 
  onContinueSession, 
  onStartNewSession 
}: ActiveSessionFoundModalProps) {
  const [showModal, setShowModal] = useState(false)
  const [sessionData, setSessionData] = useState<ActiveSessionData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentRemainingMinutes, setCurrentRemainingMinutes] = useState<number>(0)
  const [isClient, setIsClient] = useState(false)
  const [elapsedTimeSeconds, setElapsedTimeSeconds] = useState<number>(0)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [subscriptionState, setSubscriptionState] = useState<string>('closed')
  
  // Refs for cleanup and state tracking
  const fetchControllerRef = useRef<AbortController | null>(null)
  const supabaseChannelRef = useRef<RealtimeChannel | null>(null)
  const lastRecoveryCheckState = useRef<string | null>(null)
  const lastUpdateTimestampRef = useRef<number>(0)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fallbackPollingRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Session recovery check (same as original)
  useEffect(() => {
    let hasProcessedRecovery = false
    let checkInterval: NodeJS.Timeout | null = null
    
    const checkForPendingRecovery = () => {
      try {
        const pendingRecovery = sessionStorage.getItem('session-recovery-pending')
        const recoveryCheckInProgress = sessionStorage.getItem('recovery-check-in-progress')
        
        if (recoveryCheckInProgress !== lastRecoveryCheckState.current) {
          lastRecoveryCheckState.current = recoveryCheckInProgress
        }
        
        if (pendingRecovery && !hasProcessedRecovery) {
          const data: ActiveSessionData = JSON.parse(pendingRecovery)
          
          const recoveryAge = Date.now() - new Date(data.recoveredAt).getTime()
          if (recoveryAge > 60000) {
            console.log('🧹 Recovery data is stale (age:', Math.round(recoveryAge/1000), 'seconds), clearing')
            sessionStorage.removeItem('session-recovery-pending')
            return
          }
          
          hasProcessedRecovery = true
          
          console.log('🔔 Active session found modal triggered:', {
            sessionId: data.sessionId,
            conversationTime: data.conversationTimeMinutes,
            remaining: data.remainingMinutes,
            theme: data.sessionData?.theme
          })
          
          setSessionData(data)
          setShowModal(true)
          setCurrentRemainingMinutes(data.remainingMinutes)
          setElapsedTimeSeconds(data.conversationTimeSeconds || 0)
          
          if (checkInterval) {
            clearInterval(checkInterval)
            checkInterval = null
          }
          
          sessionStorage.removeItem('session-recovery-pending')
        }
      } catch (error) {
        console.error('Error checking for pending recovery:', error)
      }
    }
    
    checkForPendingRecovery()
    checkInterval = setInterval(checkForPendingRecovery, 100)
    
    const timeout = setTimeout(() => {
      if (checkInterval) {
        clearInterval(checkInterval)
        checkInterval = null
      }
    }, 5000)
    
    return () => {
      if (checkInterval) clearInterval(checkInterval)
      clearTimeout(timeout)
    }
  }, [])

  // Cleanup function for all resources
  const cleanup = useCallback(() => {
    // Cancel fetch
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort()
      fetchControllerRef.current = null
    }
    
    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    
    // Clear fallback polling
    if (fallbackPollingRef.current) {
      clearInterval(fallbackPollingRef.current)
      fallbackPollingRef.current = null
    }
    
    // Remove Supabase channel
    if (supabaseChannelRef.current) {
      const supabase = createClient()
      supabase.removeChannel(supabaseChannelRef.current)
      supabaseChannelRef.current = null
    }
  }, [])

  // Validate and update session data from real-time payload
  const updateSessionFromRealtime = useCallback((payload: SessionRealtimePayload) => {
    const updateTimestamp = Date.now()
    
    // Prevent processing stale updates
    if (updateTimestamp <= lastUpdateTimestampRef.current) {
      console.log('Ignoring stale real-time update')
      return
    }
    
    lastUpdateTimestampRef.current = updateTimestamp
    
    // Validate payload has required fields
    if (!payload.id || !payload.status) {
      console.error('Invalid real-time payload:', payload)
      return
    }
    
    // Update conversation time if session is active
    if (ACTIVE_STATUSES.includes(payload.status) && typeof payload.conversationTimeSeconds === 'number') {
      setElapsedTimeSeconds(payload.conversationTimeSeconds)
    }
    
    // Close modal if session reaches a closing status
    if (CLOSING_STATUSES.includes(payload.status)) {
      console.log(`Session ${payload.status}, closing modal`)
      setShowModal(false)
      cleanup()
    }
    
    // Handle paused session state
    if (payload.status === 'paused') {
      console.log('Session paused, updating UI')
      // Update any pause-specific UI state here
    }
  }, [cleanup])

  // Fallback polling function for when real-time fails
  const startFallbackPolling = useCallback(() => {
    if (!sessionData || fallbackPollingRef.current) return
    
    console.log('Starting fallback polling due to real-time connection issues')
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionData.sessionId}`)
        
        if (response.ok) {
          const latestSession = await response.json()
          updateSessionFromRealtime({
            id: latestSession.id,
            status: latestSession.status,
            conversationTimeSeconds: latestSession.conversationTimeSeconds,
            pausedDuration: latestSession.pausedDuration
          })
        } else if (response.status === 404) {
          console.log('Session no longer exists, closing modal')
          setShowModal(false)
          cleanup()
        }
      } catch (error) {
        console.error('Fallback polling error:', error)
      }
    }
    
    // Poll every 10 seconds as fallback
    fallbackPollingRef.current = setInterval(poll, 10000)
  }, [sessionData, updateSessionFromRealtime, cleanup])

  // Main effect for session data updates with Supabase Realtime
  useEffect(() => {
    if (!sessionData || !showModal) {
      cleanup()
      return
    }

    const supabase = createClient()
    let isSubscribed = true
    
    // Fetch latest session data once
    const fetchLatestSessionData = async () => {
      try {
        if (fetchControllerRef.current) {
          fetchControllerRef.current.abort()
        }
        
        fetchControllerRef.current = new AbortController()
        
        const response = await fetch(`/api/sessions/${sessionData.sessionId}`, {
          signal: fetchControllerRef.current.signal,
          credentials: 'include'
        })
        
        if (!isSubscribed) return
        
        if (response.ok) {
          const latestSession = await response.json()
          
          // Only update if we haven't received real-time updates yet
          if (lastUpdateTimestampRef.current === 0) {
            updateSessionFromRealtime({
              id: latestSession.id,
              status: latestSession.status,
              conversationTimeSeconds: latestSession.conversationTimeSeconds,
              pausedDuration: latestSession.pausedDuration
            })
          }
        } else if (response.status === 404) {
          console.log('Session not found, closing modal')
          setShowModal(false)
        } else if (response.status === 401) {
          setConnectionError('Unauthorized to access session')
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn('Failed to fetch session data:', error)
          setConnectionError('Failed to load session data')
        }
      }
    }

    // Set up Supabase Realtime subscription with error handling
    const setupRealtimeSubscription = () => {
      const channel = supabase
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
            if (!isSubscribed) return
            console.log('Real-time session update received')
            updateSessionFromRealtime(payload.new as SessionRealtimePayload)
            
            // Clear any fallback polling since real-time is working
            if (fallbackPollingRef.current) {
              clearInterval(fallbackPollingRef.current)
              fallbackPollingRef.current = null
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
            if (!isSubscribed) return
            console.log('Session deleted, closing modal')
            setShowModal(false)
          }
        )
        .subscribe((status, error) => {
          if (!isSubscribed) return
          
          console.log('Supabase subscription status:', status)
          setSubscriptionState(status)
          
          if (error) {
            console.error('Supabase subscription error:', error)
            setConnectionError('Real-time connection error')
            
            // Start fallback polling if subscription fails
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              startFallbackPolling()
            }
          } else if (status === 'SUBSCRIBED') {
            setConnectionError(null)
            // Clear fallback polling if subscription succeeds
            if (fallbackPollingRef.current) {
              clearInterval(fallbackPollingRef.current)
              fallbackPollingRef.current = null
            }
          }
        })
      
      supabaseChannelRef.current = channel
      
      // Handle channel errors
      channel.on('system', {}, (payload) => {
        console.log('Supabase system event:', payload)
      })
    }

    // Initial fetch
    fetchLatestSessionData()
    
    // Set up real-time subscription with a small delay to ensure auth is ready
    const subscriptionTimeout = setTimeout(() => {
      if (isSubscribed) {
        setupRealtimeSubscription()
      }
    }, 100)

    return () => {
      isSubscribed = false
      clearTimeout(subscriptionTimeout)
      cleanup()
    }
  }, [sessionData?.sessionId, showModal, cleanup, updateSessionFromRealtime, startFallbackPolling])

  // Handle continue session
  const handleContinueSession = async () => {
    if (!sessionData) return
    setIsLoading(true)
    
    try {
      await onContinueSession({
        ...sessionData.sessionData,
        isRecovery: true,
        recoveredAt: new Date().toISOString(),
        conversationTimeSeconds: elapsedTimeSeconds,
        remainingMinutes: currentRemainingMinutes
      })
      
      sessionStorage.removeItem('recovery-check-in-progress')
      setShowModal(false)
    } catch (error) {
      console.error('Error continuing session:', error)
      setIsLoading(false)
    }
  }

  // Handle end and start new
  const handleEndAndStartNew = async () => {
    if (!sessionData) return
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/sessions/${sessionData.sessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          endReason: 'user_ended',
          actualDurationMinutes: Math.ceil(elapsedTimeSeconds / 60)
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to end session')
      }
      
      sessionStorage.removeItem('recovery-check-in-progress')
      setShowModal(false)
      onStartNewSession()
    } catch (error) {
      console.error('Error ending previous session:', error)
      setIsLoading(false)
    }
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  if (!sessionData || !isClient) {
    return null
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
            onClick={() => !isLoading && setShowModal(false)}
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
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-w-md w-full">
              {/* Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <div className="flex items-center space-x-3">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <svg className="w-6 h-6 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </motion.div>
                  <div>
                    <h3 className="text-lg font-semibold">Active Session Found!</h3>
                    <p className="text-orange-100 text-sm">Your therapy session is still running</p>
                  </div>
                </div>
              </div>

              {/* Connection status */}
              {(connectionError || subscriptionState !== 'subscribed') && (
                <div className="px-6 py-2 bg-yellow-50 border-b border-yellow-200">
                  <div className="flex items-center space-x-2 text-sm text-yellow-700">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      {connectionError || `Connection status: ${subscriptionState}`}
                    </span>
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="px-6 py-5 space-y-4">
                {/* Session info */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Session Type</span>
                    <span className="text-sm font-medium capitalize">
                      {sessionData.sessionData.therapyType || 'Therapy'}
                    </span>
                  </div>
                  
                  {sessionData.sessionData.theme && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Theme</span>
                      <span className="text-sm font-medium">{sessionData.sessionData.theme}</span>
                    </div>
                  )}
                  
                  <div className="border-t pt-3">
                    <SessionTimer
                      durationMinutes={sessionData.sessionData.duration}
                      conversationTimeSeconds={elapsedTimeSeconds}
                      isConversationActive={true}
                      conversationStartTime={new Date(sessionData.originalStart)}
                      onTimeUpdate={(remainingMinutes, remainingSeconds) => setCurrentRemainingMinutes(remainingMinutes)}
                    />
                  </div>
                </div>

                {/* Warning for active conversation */}
                {elapsedTimeSeconds > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-red-700">
                        <p className="font-medium">Session in progress!</p>
                        <p>You have {formatTime(Math.ceil(elapsedTimeSeconds / 60))} of conversation time. Continue to avoid losing progress.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleContinueSession}
                    disabled={isLoading}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Continue Session ({currentRemainingMinutes}m left)</span>
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleEndAndStartNew}
                    disabled={isLoading}
                    className="w-full bg-white text-gray-700 py-3 px-4 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    End & Start New Session
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  // Create portal for modal
  const modalRoot = document.getElementById('modal-root')
  if (!modalRoot) return null
  
  return createPortal(modalContent, modalRoot)
}