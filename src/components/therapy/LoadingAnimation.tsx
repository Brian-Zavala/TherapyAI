'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LoadingAnimationProps {
  isVisible: boolean
}

const loadingMessages = [
  "Finding the perfect space for our conversation...",
  "Preparing a comfortable environment...",
  "Setting up your private therapy session...",
  "Creating a safe space for you to share...",
  "Getting everything ready for our talk...",
  "Almost there... just a moment more..."
]

/**
 * Loading animation component for therapy sessions
 * Displays rotating messages with gradient background
 */
export function LoadingAnimation({ isVisible }: LoadingAnimationProps) {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    if (!isVisible) return

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible) return null

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-gradient-to-b from-black/90 via-black/95 to-black rounded-[28px] backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Loading Spinner */}
      <div className="mb-8">
        <svg 
          className="animate-spin h-16 w-16 text-green-400" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      
      {/* Loading Messages */}
      <AnimatePresence mode="wait">
        <motion.p
          key={messageIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
          className="text-white text-center px-8 text-sm sm:text-base max-w-md"
        >
          {loadingMessages[messageIndex]}
        </motion.p>
      </AnimatePresence>
      
      {/* Connection Status */}
      <p className="text-gray-400 text-xs mt-4">
        Connecting to your therapist...
      </p>
    </motion.div>
  )
}