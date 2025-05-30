'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface SessionTimerProps {
  durationMinutes: number
  startTime: Date
  onTimeUpdate?: (remainingTimeMinutes: number, remainingTimeSeconds: number) => void
  className?: string
  showRecoveredIndicator?: boolean
  vapiCallTime?: number // VAPI call duration in seconds for comparison
  showDualTiming?: boolean // Whether to show both session and call timing
}

export default function SessionTimer({ 
  durationMinutes, 
  startTime, 
  onTimeUpdate,
  className = "",
  showRecoveredIndicator = false,
  vapiCallTime = 0,
  showDualTiming = false
}: SessionTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(durationMinutes * 60)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const elapsedMs = now.getTime() - startTime.getTime()
      const elapsedSeconds = Math.floor(elapsedMs / 1000)
      const totalSeconds = durationMinutes * 60
      const remaining = Math.max(0, totalSeconds - elapsedSeconds)
      
      setRemainingSeconds(remaining)
      
      if (remaining === 0 && !isExpired) {
        setIsExpired(true)
      }

      // Call the callback with remaining time for VAPI integration
      if (onTimeUpdate) {
        const remainingMinutes = Math.floor(remaining / 60)
        onTimeUpdate(remainingMinutes, remaining)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [durationMinutes, startTime, onTimeUpdate, isExpired])

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSecondsPart = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSecondsPart.toString().padStart(2, '0')}`
  }

  // Determine color based on remaining time
  const getTimerColor = (): string => {
    const percentage = (remainingSeconds / (durationMinutes * 60)) * 100
    
    if (isExpired || remainingSeconds === 0) {
      return 'text-red-400'
    } else if (percentage <= 10) { // Last 10% of time (red)
      return 'text-red-400'
    } else if (percentage <= 25) { // Last 25% of time (yellow/orange)
      return 'text-yellow-400'
    } else {
      return 'text-green-400' // Normal time (green)
    }
  }

  // Animation variants for pulsing when time is low
  const shouldPulse = remainingSeconds <= (durationMinutes * 60 * 0.1) // Pulse in last 10%
  
  return (
    <motion.div 
      className={`font-mono text-center ${className}`}
      animate={shouldPulse ? {
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1]
      } : {}}
      transition={shouldPulse ? {
        duration: 1,
        repeat: Infinity,
        ease: "easeInOut"
      } : {}}
    >
      <div className="flex flex-col items-center">
        <div className={`text-lg sm:text-xl font-bold ${getTimerColor()}`}>
          {formatTime(remainingSeconds)}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {isExpired ? 'Session Complete' : 'Time Remaining'}
          {showRecoveredIndicator && !isExpired && (
            <div className="text-xs text-blue-400 mt-1 animate-pulse">
              Session Restored
            </div>
          )}
          {showDualTiming && vapiCallTime > 0 && !isExpired && (
            <div className="text-xs text-gray-500 mt-1">
              Call: {Math.floor(vapiCallTime / 60)}:{(vapiCallTime % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}