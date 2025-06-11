'use client'
import { motion } from 'framer-motion'

interface StartTherapyButtonProps {
  onClick: () => void
  disabled?: boolean
  therapyType?: string
  therapistName?: string
}

/**
 * Animated start therapy button component
 * Features a pulsing green button with smooth animations
 */
export function StartTherapyButton({ 
  onClick, 
  disabled = false, 
  therapyType = 'therapy',
  therapistName = 'AI Therapist'
}: StartTherapyButtonProps) {
  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-20"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        delay: 0.2,
        duration: 0.4, 
        type: "spring",
        stiffness: 260, 
        damping: 20 
      }}
    >
      <motion.button
        onClick={onClick}
        disabled={disabled}
        title={`Start a ${therapyType} therapy session with ${therapistName}`}
        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center shadow-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 cursor-pointer"
        aria-label="Start therapy session"
        whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(0, 255, 0, 0.3)" }}
        whileTap={{ scale: 0.95 }}
        animate={{ 
          boxShadow: [
            "0 0 0px rgba(0, 255, 0, 0)", 
            "0 0 15px rgba(0, 255, 0, 0.3)", 
            "0 0 0px rgba(0, 255, 0, 0)"
          ] 
        }}
        transition={{
          boxShadow: {
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }
        }}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-10 w-10 sm:h-12 sm:w-12 text-white" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" 
          />
        </svg>
      </motion.button>
    </motion.div>
  )
}