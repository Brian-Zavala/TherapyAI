'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { memo, useEffect } from 'react'

interface PausedOverlayProps {
  isPaused: boolean
  totalPausedMinutes: number
  onResume?: () => void
}

/**
 * Optimized overlay displayed when therapy session is paused
 * - Responsive design with mobile-first approach
 * - Smooth animations with proper easing and stagger effects
 * - Performance optimized with will-change and memo
 * - Accessible with proper focus management
 */
export const PausedOverlayOptimized = memo(function PausedOverlayOptimized({
  isPaused,
  totalPausedMinutes,
  onResume
}: PausedOverlayProps) {
  // Lock body scroll when overlay is visible
  useEffect(() => {
    if (isPaused) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isPaused])

  // Animation variants for container
  const overlayVariants = {
    hidden: { 
      opacity: 0,
      backdropFilter: 'blur(0px)'
    },
    visible: { 
      opacity: 1,
      backdropFilter: 'blur(8px)',
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1] // Tailwind's ease-out curve
      }
    }
  }

  // Animation variants for content
  const contentVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.9,
      y: 20
    },
    visible: { 
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.34, 1.56, 0.64, 1], // Spring-like easing
        staggerChildren: 0.1
      }
    }
  }

  // Animation variants for children
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  }

  return (
    <AnimatePresence mode="wait">
      {isPaused && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className={`
            ${/* Positioning and sizing */''}
            fixed inset-0 z-50
            ${/* Background with backdrop blur */''}
            bg-black/60 backdrop-blur-md
            ${/* Flexbox centering */''}
            flex items-center justify-center
            ${/* Padding for mobile */''}
            p-4 sm:p-6 lg:p-8
            ${/* Performance optimization */''}
            will-change-[opacity,backdrop-filter]
          `}
          aria-modal="true"
          role="dialog"
          aria-labelledby="paused-title"
          aria-describedby="paused-description"
        >
          <motion.div
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className={`
              ${/* Container styling */''}
              relative
              ${/* Background and border */''}
              bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-gray-800/95
              border border-orange-500/30
              ${/* Responsive sizing */''}
              w-full max-w-sm sm:max-w-md
              ${/* Rounded corners responsive */''}
              rounded-2xl sm:rounded-3xl
              ${/* Shadow with glow effect */''}
              shadow-2xl shadow-orange-500/10
              ${/* Padding responsive */''}
              p-6 sm:p-8 lg:p-10
              ${/* Performance */''}
              will-change-transform
            `}
          >
            {/* Animated background gradient */}
            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden pointer-events-none">
              <motion.div
                className="absolute inset-0 opacity-30"
                animate={{
                  background: [
                    'radial-gradient(circle at 20% 80%, rgba(249, 115, 22, 0.15) 0%, transparent 50%)',
                    'radial-gradient(circle at 80% 20%, rgba(249, 115, 22, 0.15) 0%, transparent 50%)',
                    'radial-gradient(circle at 20% 80%, rgba(249, 115, 22, 0.15) 0%, transparent 50%)'
                  ]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </div>

            <div className="relative flex flex-col items-center">
              {/* Animated Pause Icon */}
              <motion.div 
                variants={itemVariants}
                className={`
                  ${/* Responsive sizing */''}
                  w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24
                  ${/* Styling */''}
                  bg-gradient-to-br from-orange-500/20 to-orange-600/20
                  rounded-full flex items-center justify-center
                  ${/* Margin */''}
                  mb-4 sm:mb-6
                  ${/* Shadow */''}
                  shadow-lg shadow-orange-500/20
                `}
              >
                <motion.svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-orange-500"
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </motion.svg>
              </motion.div>
              
              {/* Status Text */}
              <motion.h3 
                id="paused-title"
                variants={itemVariants}
                className={`
                  ${/* Typography responsive */''}
                  text-xl sm:text-2xl lg:text-3xl
                  font-bold text-white
                  ${/* Margin */''}
                  mb-2 sm:mb-3
                  ${/* Text shadow for readability */''}
                  [text-shadow:_0_2px_10px_rgb(0_0_0_/_40%)]
                `}
              >
                Session Paused
              </motion.h3>
              
              <motion.p 
                id="paused-description"
                variants={itemVariants}
                className={`
                  ${/* Typography responsive */''}
                  text-sm sm:text-base lg:text-lg
                  text-gray-300 text-center
                  ${/* Margin */''}
                  mb-4 sm:mb-6
                  ${/* Line height */''}
                  leading-relaxed
                  ${/* Max width for readability */''}
                  max-w-xs
                `}
              >
                Your therapy session is on hold. Press resume when you're ready to continue.
              </motion.p>
              
              {/* Savings Indicator */}
              <AnimatePresence>
                {totalPausedMinutes > 0 && (
                  <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className={`
                      ${/* Container */''}
                      relative overflow-hidden
                      ${/* Background and border */''}
                      bg-gradient-to-r from-green-500/10 to-green-600/10
                      border border-green-500/30
                      ${/* Rounded and padding */''}
                      rounded-xl sm:rounded-2xl
                      px-4 sm:px-6 py-2 sm:py-3
                      ${/* Shadow */''}
                      shadow-md shadow-green-500/10
                    `}
                  >
                    {/* Animated shimmer effect */}
                    <motion.div
                      className="absolute inset-0 -translate-x-full"
                      animate={{
                        translateX: ['100%', '-100%']
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(34, 197, 94, 0.2), transparent)'
                      }}
                    />
                    
                    <p className="relative text-green-400 text-sm sm:text-base font-semibold flex items-center gap-2">
                      <span className="text-lg sm:text-xl">💰</span>
                      <span>{totalPausedMinutes} minute{totalPausedMinutes !== 1 ? 's' : ''} saved</span>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Resume Button */}
              {onResume && (
                <motion.button
                  variants={itemVariants}
                  onClick={onResume}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="mt-5 sm:mt-6 w-full max-w-[220px] py-3 px-6 rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-semibold text-sm sm:text-base shadow-lg shadow-green-500/25 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-green-400/50 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                    Resume Session
                  </span>
                </motion.button>
              )}

              {/* Billing Note */}
              <motion.p
                variants={itemVariants}
                className="text-gray-500 text-xs sm:text-sm mt-3 sm:mt-4 text-center"
              >
                You are not billed during paused time
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})