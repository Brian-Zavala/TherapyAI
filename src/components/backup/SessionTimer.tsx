'use client'

import { useState, useEffect, useRef } from 'react'
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
  
  // Track the last conversationTimeSeconds to detect external updates
  const lastConversationTimeRef = useRef(conversationTimeSeconds)

  useEffect(() => {
    // Calculate the current remaining time
    const calculateRemaining = () => {
      let currentConversationTime = conversationTimeSeconds
      
      // Add current active segment time if conversation is active
      if (isConversationActive && conversationStartTime) {
        const now = new Date()
        const currentSegmentMs = now.getTime() - conversationStartTime.getTime()
        const currentSegmentSeconds = Math.floor(currentSegmentMs / 1000)
        currentConversationTime += currentSegmentSeconds
      }
      
      const totalSeconds = durationMinutes * 60
      return Math.max(0, totalSeconds - currentConversationTime)
    }
    
    // Initial calculation
    const initialRemaining = calculateRemaining()
    setRemainingSeconds(initialRemaining)
    
    // Check if conversationTimeSeconds was updated externally
    if (conversationTimeSeconds !== lastConversationTimeRef.current) {
      console.log(`⏱️ External conversation time update detected: ${lastConversationTimeRef.current}s → ${conversationTimeSeconds}s`)
      lastConversationTimeRef.current = conversationTimeSeconds
    }

    const interval = setInterval(() => {
      // Always recalculate based on current props
      const newRemaining = calculateRemaining()
      
      setRemainingSeconds(prev => {
        // If there's a significant difference (> 2 seconds), use the recalculated value
        if (Math.abs(newRemaining - prev) > 2) {
          console.log(`⏱️ Timer correction: ${prev}s → ${newRemaining}s (diff: ${prev - newRemaining}s)`)
          return newRemaining
        }
        
        // Otherwise, just count down normally if active
        if (!isConversationActive) {
          return prev
        }
        
        const countdownRemaining = Math.max(0, prev - 1)
        
        // Log timer calculation for debugging (only at key moments)
        if (countdownRemaining === 300 || countdownRemaining === 60 || countdownRemaining === 30 || countdownRemaining === 10) {
          const usedSeconds = durationMinutes * 60 - countdownRemaining
          console.log(`⏱️ TIMER: ${Math.floor(usedSeconds / 60)}:${(usedSeconds % 60).toString().padStart(2, '0')} used, ${Math.floor(countdownRemaining / 60)}:${(countdownRemaining % 60).toString().padStart(2, '0')} remaining (${durationMinutes}min session)`);
        }
        
        if (countdownRemaining === 0 && !isExpired) {
          setIsExpired(true)
        }

        // Call the callback with remaining time for VAPI integration
        if (onTimeUpdate) {
          const remainingMinutes = Math.floor(countdownRemaining / 60)
          onTimeUpdate(remainingMinutes, countdownRemaining)
        }
        
        return countdownRemaining
      })
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
        </div>
      </div>
    </motion.div>
  )
}