'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SessionRecoveryInfo {
  sessionId: string
  originalStart: string
  recoveredAt: string
  elapsedMinutes: number
  remainingMinutes: number
  autoRestarted: boolean
}

export default function SessionRecoveryNotification() {
  const [recoveryInfo, setRecoveryInfo] = useState<SessionRecoveryInfo | null>(null)
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    // Check for session recovery info
    const checkRecoveryInfo = () => {
      try {
        const storedInfo = sessionStorage.getItem('session-recovered')
        if (storedInfo) {
          const info: SessionRecoveryInfo = JSON.parse(storedInfo)
          setRecoveryInfo(info)
          setShowNotification(true)
          
          // Auto-hide notification after 8 seconds
          setTimeout(() => {
            setShowNotification(false)
          }, 8000)
          
          // Clean up recovery info after showing
          setTimeout(() => {
            sessionStorage.removeItem('session-recovered')
            setRecoveryInfo(null)
          }, 10000)
        }
      } catch (error) {
        console.warn('Error checking session recovery info:', error)
      }
    }

    // Check immediately
    checkRecoveryInfo()
    
    // Also check periodically in case recovery info is added later
    const interval = setInterval(checkRecoveryInfo, 1000)
    
    return () => clearInterval(interval)
  }, [])

  const handleDismiss = () => {
    setShowNotification(false)
    setTimeout(() => {
      sessionStorage.removeItem('session-recovered')
      setRecoveryInfo(null)
    }, 300)
  }

  if (!recoveryInfo) return null

  return (
    <AnimatePresence>
      {showNotification && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.9 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25,
            duration: 0.5 
          }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999] max-w-md w-full mx-4"
        >
          <div className="bg-gradient-to-br from-green-500 to-blue-600 text-white rounded-lg shadow-2xl border border-white/20 backdrop-blur-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-black/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
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
                    <svg className="w-5 h-5 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </motion.div>
                  <span className="font-semibold text-sm">Session Recovered</span>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 py-3 space-y-2">
              <div className="text-sm">
                Your therapy session has been successfully restored after page refresh.
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white/10 rounded px-2 py-1">
                  <div className="text-white/70">Session Time</div>
                  <div className="font-semibold">{recoveryInfo.elapsedMinutes} min elapsed</div>
                </div>
                <div className="bg-white/10 rounded px-2 py-1">
                  <div className="text-white/70">Remaining</div>
                  <div className="font-semibold">{recoveryInfo.remainingMinutes} min left</div>
                </div>
              </div>

              {recoveryInfo.autoRestarted && (
                <div className="bg-yellow-400/20 border border-yellow-400/30 rounded px-2 py-1">
                  <div className="text-xs text-yellow-100">
                    ✨ Session automatically restarted - you can continue where you left off
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-black/10 text-xs text-white/70">
              Session ID: {recoveryInfo.sessionId.slice(-8)}...
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}