'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { memo } from 'react'
import { PauseResumeButtonOptimized } from './PauseResumeButtonOptimized'
import { EndCallButtonOptimized } from './EndCallButtonOptimized'

interface CallControlsProps {
  isMuted: boolean
  isSessionPaused: boolean
  totalPausedTimeSeconds: number
  conversationTimeSeconds?: number
  isLoading: boolean
  onMuteToggle: () => void
  onEndCall: () => void
  onPauseResume: () => void
  disabled?: boolean
}

/**
 * Optimized Call Controls with responsive layout and smooth animations
 * - Mobile-first responsive design with proper spacing
 * - Smooth entrance/exit animations
 * - Performance optimized with memo
 * - Accessible with proper keyboard navigation
 */
export const CallControlsOptimized = memo(function CallControlsOptimized({
  isMuted,
  isSessionPaused,
  totalPausedTimeSeconds,
  conversationTimeSeconds = 0,
  isLoading,
  onMuteToggle,
  onEndCall,
  onPauseResume,
  disabled = false
}: CallControlsProps) {
  // Animation variants for container
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
        staggerChildren: 0.1
      }
    },
    exit: {
      opacity: 0,
      y: 20,
      transition: { duration: 0.3 }
    }
  }

  // Animation variants for buttons
  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 300
      }
    }
  }

  // Mute button - rendered inline (not as a sub-component to avoid remounting/blinking)
  const muteButtonElement = (
    <motion.div
      variants={buttonVariants}
      className="flex flex-col items-center"
    >
      <motion.button
        onClick={onMuteToggle}
        disabled={disabled}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          relative
          flex items-center justify-center
          w-11 h-11 min-w-[44px] min-h-[44px]
          sm:w-12 sm:h-12 sm:min-w-[48px] sm:min-h-[48px]
          lg:w-14 lg:h-14 lg:min-w-[56px] lg:min-h-[56px]
          rounded-full
          ${isMuted
            ? 'bg-gradient-to-br from-gray-600 to-gray-700'
            : 'bg-gradient-to-br from-blue-600 to-blue-700'
          }
          shadow-lg hover:shadow-xl
          transition-all duration-300
          focus:outline-none focus:ring-4
          ${isMuted ? 'focus:ring-gray-400' : 'focus:ring-blue-400'}
          focus:ring-offset-2 focus:ring-offset-gray-900
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
        aria-pressed={isMuted}
      >
        {isMuted ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 sm:w-6 sm:h-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 sm:w-6 sm:h-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        )}
      </motion.button>
      <span className="mt-1 text-xs sm:text-sm text-white font-medium select-none">
        {isMuted ? "Unmute" : "Mute"}
      </span>
    </motion.div>
  )

  return (
    <AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full pt-3 pb-2 sm:pt-4 sm:pb-3"
      >
        {/* Controls container */}
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          {/* Pause/Resume Button */}
          <motion.div variants={buttonVariants}>
            <PauseResumeButtonOptimized
              isPaused={isSessionPaused}
              onClick={onPauseResume}
              disabled={disabled}
              totalPausedTimeSeconds={totalPausedTimeSeconds}
            />
          </motion.div>

          {/* End Call Button - Centered and larger */}
          <motion.div variants={buttonVariants}>
            <EndCallButtonOptimized
              onClick={onEndCall}
              disabled={disabled}
              isLoading={isLoading}
            />
          </motion.div>

          {/* Mute Button */}
          {muteButtonElement}
        </div>

        {/* Optional status indicator */}
        <AnimatePresence>
          {isSessionPaused && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="mt-2 text-center text-[10px] sm:text-xs text-orange-400 font-medium"
            >
              Session paused • Not being billed
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
})