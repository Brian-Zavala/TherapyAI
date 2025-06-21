'use client'
import { motion } from 'framer-motion'
import { memo } from 'react'

interface EndCallButtonProps {
  onClick: () => void
  disabled?: boolean
  isLoading?: boolean
}

/**
 * Optimized End Call button with enhanced animations and accessibility
 * - Mobile-first responsive design with 44px+ touch targets
 * - Smooth animations with proper hover/tap states
 * - Loading state with spinner animation
 * - Performance optimized with memo
 */
export const EndCallButtonOptimized = memo(function EndCallButtonOptimized({ 
  onClick, 
  disabled = false, 
  isLoading = false 
}: EndCallButtonProps) {
  // Animation variants
  const buttonVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
    disabled: { scale: 1, opacity: 0.5 }
  }

  const iconVariants = {
    initial: { rotate: 135 },
    hover: { 
      rotate: 145,
      transition: { type: "spring", stiffness: 300, damping: 20 }
    }
  }

  return (
    <div className="flex flex-col items-center">
      <motion.button
        onClick={onClick}
        disabled={disabled || isLoading}
        variants={buttonVariants}
        initial="initial"
        whileHover={!disabled && !isLoading ? "hover" : undefined}
        whileTap={!disabled && !isLoading ? "tap" : undefined}
        animate={disabled || isLoading ? "disabled" : "initial"}
        className={`
          relative overflow-hidden
          ${/* Mobile-first sizing with minimum touch target */''}
          w-16 h-16 min-w-[64px] min-h-[64px]
          ${/* Tablet and up */''}
          sm:w-20 sm:h-20 sm:min-w-[80px] sm:min-h-[80px]
          ${/* Desktop */''}
          lg:w-24 lg:h-24 lg:min-w-[96px] lg:min-h-[96px]
          ${/* Styling */''}
          rounded-full
          bg-gradient-to-br from-red-600 to-red-700
          hover:from-red-500 hover:to-red-600
          ${/* Shadow effects */''}
          shadow-lg hover:shadow-2xl shadow-red-600/20
          ${/* Transitions */''}
          transition-all duration-300 ease-out
          ${/* Focus states */''}
          focus:outline-none focus:ring-4 focus:ring-red-400 
          focus:ring-offset-2 focus:ring-offset-gray-900
          ${/* Disabled state */''}
          disabled:cursor-not-allowed disabled:shadow-none
          ${/* Performance */''}
          will-change-transform
        `}
        aria-label={isLoading ? "Ending call..." : "End therapy call"}
        aria-busy={isLoading}
      >
        {/* Pulse animation when not loading */}
        {!isLoading && (
          <motion.div
            className="absolute inset-0 rounded-full"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              ease: "easeOut",
              repeatDelay: 0.5 
            }}
            style={{
              background: 'radial-gradient(circle, rgba(220, 38, 38, 0.4) 0%, transparent 70%)'
            }}
          />
        )}

        {/* Icon or loading spinner */}
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          {isLoading ? (
            <motion.div
              className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 border-3 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ 
                duration: 1, 
                repeat: Infinity, 
                ease: "linear" 
              }}
            />
          ) : (
            <motion.svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              strokeWidth={2}
              variants={iconVariants}
              initial="initial"
              whileHover={!disabled ? "hover" : undefined}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" 
              />
            </motion.svg>
          )}
        </div>
      </motion.button>
      
      {/* Label with animation */}
      <motion.span 
        className={`
          mt-1 sm:mt-2
          text-xs sm:text-sm
          font-medium select-none
          ${isLoading ? 'text-gray-400' : 'text-white'}
          transition-colors duration-300
        `}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        {isLoading ? 'Ending...' : 'End Call'}
      </motion.span>
    </div>
  )
})