'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { memo } from 'react'

interface PauseResumeButtonProps {
  isPaused: boolean
  onClick: () => void
  disabled?: boolean
  totalPausedTimeSeconds?: number
}

/**
 * Optimized Pause/Resume button with enhanced animations and responsive design
 * - Mobile-first responsive design with proper touch targets (44px minimum)
 * - Smooth Framer Motion animations with easing functions
 * - Performance optimized with memo and will-change
 * - Accessible with proper ARIA labels and focus states
 */
export const PauseResumeButtonOptimized = memo(function PauseResumeButtonOptimized({ 
  isPaused, 
  onClick, 
  disabled = false, 
  totalPausedTimeSeconds = 0 
}: PauseResumeButtonProps) {
  const savedMinutes = Math.floor(totalPausedTimeSeconds / 60)
  
  // Animation variants for button
  const buttonVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
    disabled: { scale: 1, opacity: 0.5 }
  }
  
  // Icon animation variants
  const iconVariants = {
    paused: { 
      rotate: 0,
      transition: { type: "spring", stiffness: 300, damping: 20 }
    },
    playing: { 
      rotate: 360,
      transition: { type: "spring", stiffness: 300, damping: 20 }
    }
  }

  return (
    <div className="flex flex-col items-center">
      <motion.button 
        onClick={onClick}
        disabled={disabled}
        variants={buttonVariants}
        initial="initial"
        whileHover={!disabled ? "hover" : undefined}
        whileTap={!disabled ? "tap" : undefined}
        animate={disabled ? "disabled" : "initial"}
        className={`
          relative overflow-hidden
          ${/* Mobile-first sizing with 44px minimum touch target */''}
          w-11 h-11 min-w-[44px] min-h-[44px]
          ${/* Tablet and up */''}
          sm:w-14 sm:h-14 sm:min-w-[56px] sm:min-h-[56px]
          ${/* Desktop */''}
          lg:w-16 lg:h-16 lg:min-w-[64px] lg:min-h-[64px]
          rounded-full
          ${/* Dynamic colors with smooth transitions */''}
          ${isPaused 
            ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500' 
            : 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500'
          }
          ${/* Shadow and effects */''}
          shadow-lg hover:shadow-xl
          ${/* Smooth transitions */''}
          transition-all duration-300 ease-out
          ${/* Focus states for accessibility */''}
          focus:outline-none focus:ring-4 focus:ring-offset-2 
          ${isPaused ? 'focus:ring-green-400' : 'focus:ring-orange-400'}
          focus:ring-offset-gray-900
          ${/* Disabled state */''}
          disabled:cursor-not-allowed disabled:shadow-none
          ${/* Performance optimization */''}
          will-change-transform
        `}
        aria-label={isPaused ? "Resume therapy session" : "Pause therapy session"}
        aria-pressed={!isPaused}
      >
        {/* Background ripple effect */}
        <motion.div
          className="absolute inset-0 rounded-full"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.6, repeat: Infinity, ease: "easeOut" }}
          style={{
            background: isPaused 
              ? 'radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(249, 115, 22, 0.3) 0%, transparent 70%)'
          }}
        />
        
        {/* Icon container with animation */}
        <motion.div
          className="relative z-10 flex items-center justify-center w-full h-full"
          variants={iconVariants}
          animate={isPaused ? "paused" : "playing"}
        >
          <AnimatePresence mode="wait">
            {isPaused ? (
              <motion.svg
                key="play"
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <path d="M8 5v14l11-7z"/>
              </motion.svg>
            ) : (
              <motion.svg
                key="pause"
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.button>
      
      {/* Status text with animation */}
      <motion.span 
        className="mt-1 text-xs sm:text-sm text-white font-medium select-none"
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        {isPaused ? "Resume" : "Pause"}
      </motion.span>
      
      {/* Savings indicator with animation */}
      <AnimatePresence>
        {isPaused && savedMinutes > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ 
              type: "spring",
              stiffness: 400,
              damping: 25,
              delay: 0.2 
            }}
            className="mt-1 flex items-center gap-1 px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded-full backdrop-blur-sm"
          >
            <span className="text-green-400 text-[10px] sm:text-xs font-medium">
              💰
            </span>
            <span className="text-green-400 text-[10px] sm:text-xs font-medium">
              {savedMinutes}m saved
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})