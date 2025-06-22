'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import SessionTimer from '@/components/SessionTimer'
import { createClient } from '@/utils/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

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

/**
 * Optimized Active Session Found Modal with enhanced UI/UX
 * - Responsive mobile-first design
 * - Smooth animations with proper timing
 * - Performance optimized with memo and callbacks
 * - Accessible with proper ARIA attributes
 * - Real-time session updates
 */
export const ActiveSessionFoundModalOptimized = memo(function ActiveSessionFoundModalOptimized({ 
  onContinueSession, 
  onStartNewSession 
}: ActiveSessionFoundModalProps) {
  const [showModal, setShowModal] = useState(false)
  const [sessionData, setSessionData] = useState<ActiveSessionData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentRemainingMinutes, setCurrentRemainingMinutes] = useState<number>(0)
  const [isClient, setIsClient] = useState(false)
  const [elapsedTimeSeconds, setElapsedTimeSeconds] = useState<number>(0)
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fetchControllerRef = useRef<AbortController | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastRecoveryCheckState = useRef<string | null>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Recovery check effect (same logic, just formatted)
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
            console.log('🧹 Recovery data is stale, clearing')
            sessionStorage.removeItem('session-recovery-pending')
            return
          }
          
          hasProcessedRecovery = true
          console.log('🔔 Active session found modal triggered')
          
          setSessionData(data)
          setShowModal(true)
          setCurrentRemainingMinutes(data.remainingMinutes)
          setElapsedTimeSeconds(data.conversationTimeSeconds || 0)
          
          if (checkInterval) {
            clearInterval(checkInterval)
            checkInterval = null
          }
          
          sessionStorage.setItem('modal-shown', 'true')
          sessionStorage.setItem('recovery-flow-active', 'true')
          console.log('💾 Keeping session-recovery-pending until user action, modal should now be visible')
        }
      } catch (error) {
        console.error('Error checking for pending recovery:', error)
      }
    }
    
    checkInterval = setInterval(checkForPendingRecovery, 100)
    checkForPendingRecovery()
    
    return () => {
      if (checkInterval) clearInterval(checkInterval)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort()
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
    }
  }, [])

  const handleContinue = useCallback(async () => {
    if (!sessionData || isLoading) return
    
    try {
      setIsLoading(true)
      console.log('🔄 User chose to continue existing session:', sessionData.sessionId)
      
      sessionStorage.removeItem('session-recovery-pending')
      sessionStorage.removeItem('recovery-flow-active')
      sessionStorage.removeItem('modal-shown')
      sessionStorage.removeItem('recovery-check-in-progress')
      sessionStorage.setItem('continuing-session', 'true')
      
      const sessionPayload = {
        ...sessionData.sessionData,
        isRecovery: true,
        recoveredAt: new Date().toISOString(),
        conversationTimeSeconds: elapsedTimeSeconds,
        remainingMinutes: currentRemainingMinutes
      }
      
      await onContinueSession(sessionPayload)
      setShowModal(false)
    } catch (error) {
      console.error('Error continuing session:', error)
    } finally {
      setIsLoading(false)
    }
  }, [sessionData, isLoading, elapsedTimeSeconds, currentRemainingMinutes, onContinueSession])

  const handleStartNew = useCallback(async () => {
    if (isLoading || !sessionData) return
    
    try {
      setIsLoading(true)
      console.log('🆕 User chose to start new session, ending previous session:', sessionData.sessionId)
      
      sessionStorage.removeItem('session-recovery-pending')
      sessionStorage.removeItem('recovery-flow-active')
      sessionStorage.removeItem('modal-shown')
      sessionStorage.removeItem('recovery-check-in-progress')
      sessionStorage.setItem('starting-new-session', 'true')
      
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort()
      }
      fetchControllerRef.current = new AbortController()
      
      await fetch('/api/sessions/end-abandoned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionData.sessionId }),
        signal: fetchControllerRef.current.signal
      })
      
      await onStartNewSession()
      setShowModal(false)
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error starting new session:', error)
      }
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, sessionData, onStartNewSession])

  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    }
  }

  const modalVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.95,
      y: 20
    },
    visible: { 
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.34, 1.56, 0.64, 1],
        staggerChildren: 0.1
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: { duration: 0.2 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    }
  }

  if (!isClient || !showModal || !sessionData) return null

  const modalContent = (
    <AnimatePresence>
      {showModal && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className={`
            fixed inset-0 z-[10000]
            bg-black/80 backdrop-blur-md
            flex items-center justify-center
            p-4 sm:p-6 lg:p-8
          `}
          onClick={(e) => e.target === e.currentTarget && !isLoading && handleStartNew()}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`
              relative
              bg-gradient-to-br from-gray-900 via-gray-900/95 to-gray-800
              border border-purple-500/30
              w-full max-w-sm sm:max-w-md lg:max-w-lg
              rounded-2xl sm:rounded-3xl
              shadow-2xl shadow-purple-500/20
              p-6 sm:p-8 lg:p-10
              overflow-hidden
            `}
            role="dialog"
            aria-modal="true"
            aria-labelledby="recovery-title"
          >
            {/* Animated background effect */}
            <div className="absolute inset-0 pointer-events-none">
              <motion.div
                className="absolute inset-0 opacity-20"
                animate={{
                  background: [
                    'radial-gradient(circle at 0% 0%, rgba(168, 85, 247, 0.3) 0%, transparent 50%)',
                    'radial-gradient(circle at 100% 100%, rgba(168, 85, 247, 0.3) 0%, transparent 50%)',
                    'radial-gradient(circle at 0% 0%, rgba(168, 85, 247, 0.3) 0%, transparent 50%)'
                  ]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
            </div>

            <div className="relative">
              <motion.h2 
                id="recovery-title"
                variants={itemVariants}
                className={`
                  text-2xl sm:text-3xl lg:text-4xl
                  font-bold text-white
                  mb-4 sm:mb-6
                  text-center
                  [text-shadow:_0_2px_20px_rgb(168_85_247_/_50%)]
                `}
              >
                Active Session Found
              </motion.h2>
              
              <motion.div 
                variants={itemVariants}
                className={`
                  bg-purple-500/10 border border-purple-500/30
                  rounded-xl sm:rounded-2xl
                  p-4 sm:p-6
                  mb-4 sm:mb-6
                  backdrop-blur-sm
                `}
              >
                <h3 className="text-lg sm:text-xl font-semibold text-purple-300 mb-2">
                  {sessionData.sessionData.theme}
                </h3>
                <div className="space-y-2 text-sm sm:text-base">
                  <p className="text-gray-300">
                    <span className="text-gray-400">Duration:</span>{' '}
                    <span className="font-medium">{sessionData.sessionData.duration} minutes</span>
                  </p>
                  <p className="text-gray-300">
                    <span className="text-gray-400">Time used:</span>{' '}
                    <span className="font-medium text-purple-300">
                      {sessionData.conversationTimeMinutes || Math.floor(elapsedTimeSeconds / 60)} minutes
                    </span>
                  </p>
                  <p className="text-gray-300">
                    <span className="text-gray-400">Time remaining:</span>{' '}
                    <span className="font-medium text-green-400">
                      {currentRemainingMinutes} minutes
                    </span>
                  </p>
                </div>
              </motion.div>

              <motion.div 
                variants={itemVariants}
                className="space-y-3"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleContinue}
                  disabled={isLoading}
                  className={`
                    w-full
                    py-3 sm:py-4 px-6
                    bg-gradient-to-r from-purple-600 to-purple-700
                    hover:from-purple-500 hover:to-purple-600
                    text-white font-semibold
                    text-base sm:text-lg
                    rounded-xl sm:rounded-2xl
                    shadow-lg hover:shadow-xl
                    transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                    focus:outline-none focus:ring-4 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900
                  `}
                >
                  {isLoading ? 'Loading...' : 'Continue Session'}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartNew}
                  disabled={isLoading}
                  className={`
                    w-full
                    py-3 sm:py-4 px-6
                    bg-gray-800 hover:bg-gray-700
                    border border-gray-700 hover:border-gray-600
                    text-gray-300 hover:text-white
                    font-medium
                    text-base sm:text-lg
                    rounded-xl sm:rounded-2xl
                    transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                    focus:outline-none focus:ring-4 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900
                  `}
                >
                  Start New Session
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(modalContent, document.body)
})