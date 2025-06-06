'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface SessionTimerProps {
  durationMinutes: number
  conversationTimeSeconds: number // VAPI-tracked billing time (single source of truth)
  isConversationActive: boolean // Whether VAPI call is active
  conversationStartTime?: Date // When current VAPI call segment started
  onTimeUpdate?: (remainingTimeMinutes: number, remainingTimeSeconds: number) => void
  className?: string
  showRecoveredIndicator?: boolean
}

export default function SessionTimer({ 
  durationMinutes, 
  conversationTimeSeconds,
  isConversationActive,
  conversationStartTime,
  onTimeUpdate,
  className = "",
  showRecoveredIndicator = false
}: SessionTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(durationMinutes * 60)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      let currentConversationTime = conversationTimeSeconds
      
      // Add current active segment time if conversation is active
      if (isConversationActive && conversationStartTime) {
        const now = new Date()
        const currentSegmentMs = now.getTime() - conversationStartTime.getTime()
        const currentSegmentSeconds = Math.floor(currentSegmentMs / 1000)
        currentConversationTime += currentSegmentSeconds
      }
      
      const totalSeconds = durationMinutes * 60
      const remaining = Math.max(0, totalSeconds - currentConversationTime)
      
      // Log timer calculation for debugging (every 10 seconds to avoid spam)
      if (currentConversationTime % 10 === 0 || remaining <= 60) {
        console.log(`⏱️ TIMER: ${Math.floor(currentConversationTime / 60)}:${(currentConversationTime % 60).toString().padStart(2, '0')} used, ${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')} remaining (${durationMinutes}min session)`);
      }
      
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
  }, [durationMinutes, conversationTimeSeconds, isConversationActive, conversationStartTime, onTimeUpdate, isExpired])

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
          {isExpired ? 'Session Complete' : 'Conversation Time Left'}
          {!isConversationActive && !isExpired && (
            <div className="text-xs text-yellow-400 mt-1">
              ⏸️ Paused
            </div>
          )}
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