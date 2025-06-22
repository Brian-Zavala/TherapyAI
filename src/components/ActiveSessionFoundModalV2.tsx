'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import SessionTimerV2 from './SessionTimerV2'

interface ActiveSessionData {
  sessionId: string
  originalStart: string
  recoveredAt: string
  conversationTimeSeconds: number
  totalPausedTimeSeconds: number
  remainingMinutes: number
  autoRestarted: boolean
  sessionData: {
    id: string
    startTime: string
    duration: number
    status: string
    theme: string
    therapyType?: string
    isPaused?: boolean
  }
}

interface ActiveSessionFoundModalV2Props {
  onContinueSession: (sessionData: any) => void
  onStartNewSession: () => void
}

export default function ActiveSessionFoundModalV2({ 
  onContinueSession, 
  onStartNewSession 
}: ActiveSessionFoundModalV2Props) {
  const [showModal, setShowModal] = useState(false)
  const [sessionData, setSessionData] = useState<ActiveSessionData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [liveConversationTime, setLiveConversationTime] = useState<number>(0)
  const [liveRemainingMinutes, setLiveRemainingMinutes] = useState<number>(0)
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fetchControllerRef = useRef<AbortController | null>(null)
  
  // Track last recovery check state to reduce logging
  const lastRecoveryCheckState = useRef<string | null>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    let hasProcessedRecovery = false
    let checkInterval: NodeJS.Timeout | null = null
    
    const checkForPendingRecovery = () => {
      try {
        const pendingRecovery = sessionStorage.getItem('session-recovery-pending')
        const recoveryCheckInProgress = sessionStorage.getItem('recovery-check-in-progress')
        
        // Track state change without logging
        if (recoveryCheckInProgress !== lastRecoveryCheckState.current) {
          lastRecoveryCheckState.current = recoveryCheckInProgress
        }
        
        if (pendingRecovery && !hasProcessedRecovery) {
          const data: ActiveSessionData = JSON.parse(pendingRecovery)
          
          // Check if recovery data is stale (older than 60 seconds)
          const recoveryAge = Date.now() - new Date(data.recoveredAt).getTime()
          if (recoveryAge > 60000) {
            console.log('🧹 Recovery data is stale, clearing')
            sessionStorage.removeItem('session-recovery-pending')
            return
          }
          
          // Prevent duplicate processing
          hasProcessedRecovery = true
          
          console.log('🔔 Active session found modal triggered:', {
            sessionId: data.sessionId,
            conversationTime: Math.floor(data.conversationTimeSeconds / 60),
            remaining: data.remainingMinutes,
            theme: data.sessionData?.theme
          })
          
          setSessionData(data)
          setShowModal(true)
          setLiveConversationTime(data.conversationTimeSeconds)
          setLiveRemainingMinutes(data.remainingMinutes)
          
          // Clear the check interval once we've found and processed the recovery
          if (checkInterval) {
            clearInterval(checkInterval)
            checkInterval = null
          }
        }
      } catch (error) {
        console.warn('Error checking for pending session recovery:', error)
        sessionStorage.removeItem('session-recovery-pending')
      }
    }

    // Check immediately
    checkForPendingRecovery()
    
    // Set up a regular interval to check for recovery data
    checkInterval = setInterval(() => {
      if (!hasProcessedRecovery) {
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
    
    // Clear interval after 3 seconds to prevent indefinite checking
    const timeoutId = setTimeout(() => {
      if (checkInterval) {
        clearInterval(checkInterval)
        checkInterval = null
        
        // Final cleanup of any stuck flags
        const finalCheck = sessionStorage.getItem('session-recovery-pending')
        const stillInProgress = sessionStorage.getItem('recovery-check-in-progress') === 'true'
        if (!finalCheck && stillInProgress) {
          sessionStorage.removeItem('recovery-check-in-progress')
        }
      }
    }, 3000)
    
    // Listen for storage changes (works across tabs but not same-tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'session-recovery-pending' && e.newValue && !hasProcessedRecovery) {
        checkForPendingRecovery()
      }
    }
    
    // Also listen for custom events dispatched within the same tab
    const handleCustomEvent = () => {
      if (!hasProcessedRecovery) {
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
  }, [])

  const handleContinueSession = async () => {
    if (!sessionData) return
    
    setIsLoading(true)
    console.log('🔄 User chose to continue active session:', sessionData.sessionId)
    
    try {
      // Mark session as auto-restarted
      const updatedRecoveryInfo = {
        ...sessionData,
        autoRestarted: true,
        recoveredAt: new Date().toISOString(),
        conversationTimeSeconds: liveConversationTime // Use latest time
      }
      
      // Store for the recovery notification
      sessionStorage.setItem('session-recovered', JSON.stringify(updatedRecoveryInfo))
      
      // Clear the pending recovery
      sessionStorage.removeItem('session-recovery-pending')
      
      // Set current session ID for immediate access
      sessionStorage.setItem('current-session-id', sessionData.sessionId)
      
      // Set trigger for TherapyButton to pick up
      sessionStorage.setItem('session-continue-trigger', JSON.stringify({
        sessionId: sessionData.sessionId,
        sessionData: {
          ...sessionData.sessionData,
          conversationTimeSeconds: liveConversationTime
        }
      }))
      
      // Trigger continue session callback first
      await onContinueSession({
        ...sessionData.sessionData,
        conversationTimeSeconds: liveConversationTime
      })
      
      // Success - show brief success feedback before closing
      setIsLoading(false)
      
      // Show success state briefly
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
        Reconnecting to your session...
      `
      
      // Add animation styles
      const style = document.createElement('style')
      style.textContent = `
        @keyframes fadeInScale {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `
      document.head.appendChild(style)
      document.body.appendChild(successIndicator)
      
      // Remove after 2 seconds
      setTimeout(() => {
        if (successIndicator.parentNode) {
          successIndicator.remove()
        }
        if (style.parentNode) {
          style.remove()
        }
      }, 2000)
      
      // Close modal with smoother transition after success feedback
      setTimeout(() => {
        setShowModal(false)
        console.log('✅ Session continuation initiated successfully')
      }, 1500)
      
    } catch (error) {
      console.error('❌ Error continuing session:', error)
      setIsLoading(false)
      
      // Show error state but keep modal open for retry
      alert(`Failed to continue session: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or start a new session.`)
    }
  }

  const handleStartNewSession = async () => {
    setIsLoading(true)
    console.log('🆕 User chose to start new session, ending previous session:', sessionData?.sessionId)
    
    try {
      // Mark previous session as completed
      if (sessionData?.sessionId) {
        await fetch(`/api/sessions/${sessionData.sessionId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            reason: 'User started new session',
            forceComplete: true 
          })
        })
      }
      
      // Clear all session storage
      sessionStorage.removeItem('session-recovery-pending')
      sessionStorage.removeItem('current-session-id')
      sessionStorage.removeItem('session-recovered')
      
      // Close modal
      setShowModal(false)
      
      // Trigger new session callback
      onStartNewSession()
      
    } catch (error) {
      console.error('Error ending previous session:', error)
      setIsLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  // Update session data periodically
  useEffect(() => {
    if (!sessionData || !showModal) {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
        updateIntervalRef.current = null
      }
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort()
        fetchControllerRef.current = null
      }
      return
    }

    // Fetch latest session data periodically
    const fetchLatestSessionData = async () => {
      try {
        // Cancel previous fetch if still pending
        if (fetchControllerRef.current) {
          fetchControllerRef.current.abort()
        }
        
        fetchControllerRef.current = new AbortController()
        
        const response = await fetch(`/api/sessions/${sessionData.sessionId}`, {
          signal: fetchControllerRef.current.signal
        })
        
        if (response.ok) {
          const latestSession = await response.json()
          // Validate session is still active before updating
          if (latestSession.status === 'active') {
            // Calculate current conversation time if session is active
            let currentConversationTime = latestSession.conversationTimeSeconds || 0
            if (latestSession.lastConversationStart && !latestSession.isPaused) {
              const activeTime = Math.floor(
                (Date.now() - new Date(latestSession.lastConversationStart).getTime()) / 1000
              )
              currentConversationTime += activeTime
            }
            
            setLiveConversationTime(currentConversationTime)
            
            // Calculate remaining minutes
            const totalMinutes = latestSession.duration || 30
            const remainingMinutes = Math.max(0, totalMinutes - (currentConversationTime / 60))
            setLiveRemainingMinutes(remainingMinutes)
          }
        } else if (response.status === 404) {
          // Session no longer exists, close modal
          console.log('Session no longer exists, closing modal')
          setShowModal(false)
        }
      } catch (error) {
        // Only log non-abort errors
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn('Failed to fetch latest session data:', error)
        }
      }
    }

    // Initial fetch
    fetchLatestSessionData()

    // Set up periodic updates
    updateIntervalRef.current = setInterval(fetchLatestSessionData, 5000) // Update every 5 seconds

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
        updateIntervalRef.current = null
      }
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort()
        fetchControllerRef.current = null
      }
    }
  }, [sessionData, showModal])

  if (!sessionData) {
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
          
          {/* Modal - Mobile First Centered Design */}
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

              {/* Content */}
              <div className="px-6 py-5 space-y-4">
                {/* Warning message - conditional based on conversation activity */}
                {liveConversationTime > 0 ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-red-700">
                        <p className="font-medium">Session was in progress!</p>
                        <p>You have {formatTime(liveConversationTime)} of conversation time used. Continue to avoid losing progress.</p>
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
                )}

                {/* Session info with live timer */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-blue-50 rounded-lg px-3 py-2">
                    <div className="text-blue-600 font-medium">Conversation Time</div>
                    <div className="text-blue-800 font-semibold">{formatTime(liveConversationTime)}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg px-3 py-2">
                    <div className="text-green-600 font-medium text-center mb-1">Time Remaining</div>
                    <SessionTimerV2
                      sessionId={sessionData.sessionId}
                      durationMinutes={sessionData.sessionData.duration}
                      conversationTimeSeconds={liveConversationTime}
                      isConversationActive={false} // Session is paused while modal is open
                      isPaused={sessionData.sessionData.isPaused || false}
                      className="scale-90"
                      showRecoveredIndicator={false}
                      onTimeUpdate={(remainingMinutes) => setLiveRemainingMinutes(remainingMinutes)}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <div className="text-gray-600 text-xs">Session Type</div>
                  <div className="text-gray-800 font-medium">{sessionData.sessionData.theme}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-gray-50 space-y-3">
                {/* Continue Session Button */}
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
                      <span>Continue Session ({formatTime(liveRemainingMinutes * 60)} left)</span>
                    </>
                  )}
                </motion.button>

                {/* Start New Session Button */}
                <motion.button
                  onClick={handleStartNewSession}
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
              </div>

              {/* Footer */}
              <div className="px-6 py-2 bg-gray-100 text-xs text-gray-600 text-center">
                Session ID: {sessionData.sessionId.slice(-8)}...
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Render portal only on client side
  if (!isClient) {
    return null;
  }

  const modalRoot = document.getElementById("modal-root");
  if (!modalRoot) {
    console.error("Modal root element not found");
    return null;
  }

  return createPortal(modalContent, modalRoot);
}