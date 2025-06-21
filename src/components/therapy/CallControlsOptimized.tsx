'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { memo } from 'react'
import { PauseResumeButtonOptimized } from './PauseResumeButtonOptimized'
import { EndCallButtonOptimized } from './EndCallButtonOptimized'

interface CallControlsProps {
  isPaused: boolean
  isMuted: boolean
  onTogglePause: () => void
  onToggleMute: () => void
  onEndCall: () => void
  isLoading?: boolean
  disabled?: boolean
  totalPausedTimeSeconds?: number
}

/**
 * Optimized Call Controls with responsive layout and smooth animations
 * - Mobile-first responsive design with proper spacing
 * - Smooth entrance/exit animations
 * - Performance optimized with memo
 * - Accessible with proper keyboard navigation
 */
export const CallControlsOptimized = memo(function CallControlsOptimized({
  isPaused,
  isMuted,
  onTogglePause,
  onToggleMute,
  onEndCall,
  isLoading = false,
  disabled = false,
  totalPausedTimeSeconds = 0
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

  // Mute button component
  const MuteButton = () => (
    <motion.div 
      variants={buttonVariants}
      className="flex flex-col items-center"
    >
      <motion.button
        onClick={onToggleMute}
        disabled={disabled}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          relative overflow-hidden
          ${/* Mobile-first sizing */''}
          w-11 h-11 min-w-[44px] min-h-[44px]
          sm:w-14 sm:h-14 sm:min-w-[56px] sm:min-h-[56px]
          lg:w-16 lg:h-16 lg:min-w-[64px] lg:min-h-[64px]
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
          will-change-transform
        `}
        aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
        aria-pressed={isMuted}
      >
        <AnimatePresence mode="wait">
          {isMuted ? (
            <motion.svg
              key="muted"
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
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
            </motion.svg>
          ) : (
            <motion.svg
              key="unmuted"
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>
      <motion.span 
        className="mt-1 text-xs sm:text-sm text-white font-medium select-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {isMuted ? "Unmute" : "Mute"}
      </motion.span>
    </motion.div>
  )

  return (
    <AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={`
          ${/* Container positioning */''}
          fixed bottom-0 inset-x-0
          ${/* Background with blur */''}
          bg-gradient-to-t from-gray-900/95 via-gray-900/90 to-transparent
          backdrop-blur-md
          ${/* Border */''}
          border-t border-gray-800/50
          ${/* Padding responsive */''}
          p-4 sm:p-6 lg:p-8
          ${/* Safe area for mobile devices */''}
          pb-safe sm:pb-6 lg:pb-8
          ${/* Z-index */''}
          z-40
        `}
      >
        {/* Gradient overlay for smooth transition */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-gray-900/50 to-transparent pointer-events-none" />
        
        {/* Controls container */}
        <div className={`
          relative
          ${/* Flexbox layout */''}
          flex items-center justify-center
          ${/* Gap responsive */''}
          gap-6 sm:gap-8 lg:gap-12
          ${/* Max width for large screens */''}
          max-w-lg mx-auto
        `}>
          {/* Pause/Resume Button */}
          <motion.div variants={buttonVariants}>
            <PauseResumeButtonOptimized
              isPaused={isPaused}
              onClick={onTogglePause}
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
          <MuteButton />
        </div>

        {/* Optional status indicator */}
        <AnimatePresence>
          {isPaused && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className={`
                mt-4 text-center
                text-xs sm:text-sm text-orange-400
                font-medium
              `}
            >
              Session paused • You are not being billed
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
})