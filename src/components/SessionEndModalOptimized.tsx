'use client'
import { useState, useEffect, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import confetti from 'canvas-confetti'

interface SessionEndModalProps {
  isOpen: boolean
  onClose: () => void
  sessionData?: {
    duration: number
    theme: string
    conversationTime: number
    pausedTime?: number
  }
  onContinue?: () => void
  onViewDashboard?: () => void
}

/**
 * Optimized Session End Modal with celebration animations
 * - Mobile-first responsive design
 * - Smooth animations with confetti effect
 * - Performance optimized with lazy confetti
 * - Accessible with proper ARIA attributes
 */
export const SessionEndModalOptimized = memo(function SessionEndModalOptimized({
  isOpen,
  onClose,
  sessionData,
  onContinue,
  onViewDashboard
}: SessionEndModalProps) {
  const [isClient, setIsClient] = useState(false)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Trigger confetti when modal opens
  useEffect(() => {
    if (isOpen && isClient) {
      setShowContent(true)
      
      // Trigger confetti with therapeutic colors
      const duration = 3 * 1000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10001 }

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min
      }

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          return clearInterval(interval)
        }

        const particleCount = 50 * (timeLeft / duration)
        
        // Therapeutic purple and green colors
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#a855f7', '#22c55e', '#8b5cf6', '#10b981']
        })
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#a855f7', '#22c55e', '#8b5cf6', '#10b981']
        })
      }, 250)

      return () => clearInterval(interval)
    } else {
      setShowContent(false)
    }
  }, [isOpen, isClient])

  const handleClose = useCallback(() => {
    setShowContent(false)
    setTimeout(onClose, 200)
  }, [onClose])

  const handleContinue = useCallback(() => {
    handleClose()
    onContinue?.()
  }, [handleClose, onContinue])

  const handleViewDashboard = useCallback(() => {
    handleClose()
    onViewDashboard?.()
  }, [handleClose, onViewDashboard])

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
      scale: 0.8,
      y: 50
    },
    visible: { 
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300,
        staggerChildren: 0.1
      }
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: 20,
      transition: { duration: 0.2 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring",
        damping: 20,
        stiffness: 300
      }
    }
  }

  const statsVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: (i: number) => ({
      scale: 1,
      opacity: 1,
      transition: {
        delay: 0.1 * i,
        type: "spring",
        damping: 15,
        stiffness: 300
      }
    })
  }

  if (!isClient) return null

  const modalContent = (
    <AnimatePresence>
      {isOpen && showContent && (
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
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`
              relative
              bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900
              border border-purple-500/30
              w-full max-w-sm sm:max-w-md lg:max-w-lg
              rounded-2xl sm:rounded-3xl
              shadow-2xl shadow-purple-500/20
              p-6 sm:p-8 lg:p-10
              overflow-hidden
            `}
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-end-title"
          >
            {/* Animated background */}
            <div className="absolute inset-0 pointer-events-none">
              <motion.div
                className="absolute inset-0 opacity-30"
                animate={{
                  background: [
                    'radial-gradient(circle at 20% 50%, rgba(168, 85, 247, 0.3) 0%, transparent 50%)',
                    'radial-gradient(circle at 80% 50%, rgba(34, 197, 94, 0.3) 0%, transparent 50%)',
                    'radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.3) 0%, transparent 50%)'
                  ]
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              />
            </div>

            <div className="relative">
              {/* Success Icon */}
              <motion.div 
                variants={itemVariants}
                className="flex justify-center mb-4 sm:mb-6"
              >
                <motion.div 
                  className={`
                    w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28
                    bg-gradient-to-br from-green-500/20 to-green-600/20
                    rounded-full flex items-center justify-center
                    shadow-lg shadow-green-500/20
                  `}
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <svg 
                    className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 text-green-500"
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      d="M5 13l4 4L19 7" 
                    />
                  </svg>
                </motion.div>
              </motion.div>

              {/* Title */}
              <motion.h2 
                id="session-end-title"
                variants={itemVariants}
                className={`
                  text-2xl sm:text-3xl lg:text-4xl
                  font-bold text-white
                  text-center mb-2 sm:mb-3
                  [text-shadow:_0_2px_20px_rgb(168_85_247_/_50%)]
                `}
              >
                Session Complete!
              </motion.h2>

              {/* Subtitle */}
              <motion.p 
                variants={itemVariants}
                className={`
                  text-base sm:text-lg text-gray-300
                  text-center mb-6 sm:mb-8
                `}
              >
                Great job on completing your therapy session
              </motion.p>

              {/* Session Stats */}
              {sessionData && (
                <motion.div 
                  variants={itemVariants}
                  className={`
                    grid grid-cols-2 gap-3 sm:gap-4
                    mb-6 sm:mb-8
                  `}
                >
                  <motion.div 
                    custom={0}
                    variants={statsVariants}
                    className={`
                      bg-purple-500/10 border border-purple-500/30
                      rounded-xl sm:rounded-2xl p-3 sm:p-4
                      text-center backdrop-blur-sm
                    `}
                  >
                    <p className="text-xs sm:text-sm text-gray-400 mb-1">Session Type</p>
                    <p className="text-sm sm:text-base font-semibold text-purple-300">
                      {sessionData.theme}
                    </p>
                  </motion.div>

                  <motion.div 
                    custom={1}
                    variants={statsVariants}
                    className={`
                      bg-green-500/10 border border-green-500/30
                      rounded-xl sm:rounded-2xl p-3 sm:p-4
                      text-center backdrop-blur-sm
                    `}
                  >
                    <p className="text-xs sm:text-sm text-gray-400 mb-1">Duration</p>
                    <p className="text-sm sm:text-base font-semibold text-green-400">
                      {sessionData.conversationTime} min
                    </p>
                  </motion.div>

                  {sessionData.pausedTime && sessionData.pausedTime > 0 && (
                    <motion.div 
                      custom={2}
                      variants={statsVariants}
                      className={`
                        bg-orange-500/10 border border-orange-500/30
                        rounded-xl sm:rounded-2xl p-3 sm:p-4
                        text-center backdrop-blur-sm
                        col-span-2
                      `}
                    >
                      <p className="text-xs sm:text-sm text-gray-400 mb-1">Time Saved</p>
                      <p className="text-sm sm:text-base font-semibold text-orange-400">
                        💰 {Math.floor(sessionData.pausedTime / 60)} minutes
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Action Buttons */}
              <motion.div 
                variants={itemVariants}
                className="space-y-3"
              >
                {onViewDashboard && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleViewDashboard}
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
                      focus:outline-none focus:ring-4 focus:ring-purple-400 
                      focus:ring-offset-2 focus:ring-offset-gray-900
                    `}
                  >
                    View Dashboard
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleContinue}
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
                    focus:outline-none focus:ring-4 focus:ring-gray-400 
                    focus:ring-offset-2 focus:ring-offset-gray-900
                  `}
                >
                  Continue
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