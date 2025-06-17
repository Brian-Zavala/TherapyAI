'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useTimer } from 'react-timer-hook'

interface SessionTimerV2Props {
  durationMinutes: number
  conversationTimeSeconds: number // Total conversation time from server
  isConversationActive: boolean // Whether VAPI call is active
  isPaused: boolean // Whether session is paused
  onTimeUpdate?: (remainingTimeMinutes: number, remainingTimeSeconds: number) => void
  onExpire?: () => void
  className?: string
  showRecoveredIndicator?: boolean
}

export default function SessionTimerV2({ 
  durationMinutes, 
  conversationTimeSeconds,
  isConversationActive,
  isPaused,
  onTimeUpdate,
  onExpire,
  className = "",
  showRecoveredIndicator = false
}: SessionTimerV2Props) {
  const [isClient, setIsClient] = useState(false)
  
  // Calculate expiry timestamp based on remaining time
  const calculateExpiryTimestamp = useCallback(() => {
    const now = new Date()
    const totalSeconds = durationMinutes * 60
    const remainingSeconds = Math.max(0, totalSeconds - conversationTimeSeconds)
    now.setSeconds(now.getSeconds() + remainingSeconds)
    return now
  }, [durationMinutes, conversationTimeSeconds])
  
  // Initialize timer with react-timer-hook
  const {
    totalSeconds,
    seconds,
    minutes,
    hours,
    isRunning,
    start,
    pause,
    restart,
  } = useTimer({ 
    expiryTimestamp: calculateExpiryTimestamp(),
    onExpire: () => {
      console.log('⏰ Session timer expired')
      onExpire?.()
    },
    autoStart: false, // We'll control start/stop based on conversation state
  })
  
  // Client-side rendering check
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Control timer based on conversation and pause state
  useEffect(() => {
    if (!isClient) return
    
    if (isConversationActive && !isPaused) {
      if (!isRunning) {
        console.log('▶️ Starting timer countdown')
        start()
      }
    } else {
      if (isRunning) {
        console.log('⏸️ Pausing timer countdown')
        pause()
      }
    }
  }, [isConversationActive, isPaused, isRunning, start, pause, isClient])
  
  // Handle external conversation time updates
  useEffect(() => {
    if (!isClient) return
    
    // Calculate expected remaining time based on conversation time
    const totalSessionSeconds = durationMinutes * 60
    const expectedRemaining = Math.max(0, totalSessionSeconds - conversationTimeSeconds)
    
    // If there's a significant difference (>5 seconds), restart the timer
    const currentRemaining = totalSeconds
    const timeDiff = Math.abs(expectedRemaining - currentRemaining)
    
    if (timeDiff > 5) {
      console.log(`⏱️ Timer sync needed: Expected ${expectedRemaining}s, Current ${currentRemaining}s (diff: ${timeDiff}s)`)
      const newExpiry = calculateExpiryTimestamp()
      restart(newExpiry, isConversationActive && !isPaused)
    }
  }, [conversationTimeSeconds, durationMinutes, totalSeconds, restart, isConversationActive, isPaused, isClient, calculateExpiryTimestamp])
  
  // Notify parent of time updates
  useEffect(() => {
    if (onTimeUpdate && isClient) {
      const remainingMinutes = Math.floor(totalSeconds / 60)
      const remainingSecondsInMinute = totalSeconds % 60
      onTimeUpdate(remainingMinutes, remainingSecondsInMinute)
      
      // Log at key moments
      if (totalSeconds === 300 || totalSeconds === 60 || totalSeconds === 30 || totalSeconds === 10) {
        const usedSeconds = durationMinutes * 60 - totalSeconds
        console.log(`⏱️ TIMER: ${Math.floor(usedSeconds / 60)}:${(usedSeconds % 60).toString().padStart(2, '0')} used, ${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')} remaining`)
      }
    }
  }, [totalSeconds, onTimeUpdate, durationMinutes, isClient])
  
  // Format time display
  const formatTime = (): string => {
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  
  // Determine color based on remaining time
  const getTimerColor = (): string => {
    const percentage = (totalSeconds / (durationMinutes * 60)) * 100
    
    if (totalSeconds === 0) {
      return 'text-red-400'
    } else if (percentage <= 10) {
      return 'text-red-400'
    } else if (percentage <= 25) {
      return 'text-yellow-400'
    } else {
      return 'text-green-400'
    }
  }
  
  // Animation for low time warning
  const shouldPulse = totalSeconds <= (durationMinutes * 60 * 0.1) && totalSeconds > 0
  
  // Don't render on server
  if (!isClient) {
    return (
      <div className={`font-mono text-center ${className}`}>
        <div className="text-lg sm:text-xl font-bold text-gray-400">
          --:--
        </div>
      </div>
    )
  }
  
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
          {formatTime()}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {totalSeconds === 0 ? 'Session Complete' : 'Conversation Time Left'}
          {isPaused && totalSeconds > 0 && (
            <div className="text-xs text-yellow-400 mt-1">
              ⏸️ Paused
            </div>
          )}
          {!isConversationActive && !isPaused && totalSeconds > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Ready to start
            </div>
          )}
          {showRecoveredIndicator && totalSeconds > 0 && (
            <div className="text-xs text-blue-400 mt-1 animate-pulse">
              Session Restored
            </div>
          )}
          {/* Time warning indicators */}
          {totalSeconds > 0 && totalSeconds <= 600 && totalSeconds > 300 && (
            <motion.div 
              className="text-xs text-blue-400 mt-1"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              💭 10 minutes remaining
            </motion.div>
          )}
          {totalSeconds > 0 && totalSeconds <= 300 && totalSeconds > 60 && (
            <motion.div 
              className="text-xs text-yellow-400 mt-1"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              ⚠️ 5 minutes remaining
            </motion.div>
          )}
          {totalSeconds > 0 && totalSeconds <= 60 && totalSeconds > 30 && (
            <motion.div 
              className="text-xs text-orange-400 mt-1 font-semibold"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              ⏰ 1 minute remaining
            </motion.div>
          )}
          {totalSeconds > 0 && totalSeconds <= 30 && (
            <motion.div 
              className="text-xs text-red-400 mt-1 font-bold animate-pulse"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              🚨 Session ending soon!
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Stopwatch variant for tracking elapsed time
interface SessionStopwatchProps {
  isActive: boolean
  isPaused: boolean
  initialSeconds?: number
  onTimeUpdate?: (elapsedSeconds: number) => void
  className?: string
}

export function SessionStopwatch({
  isActive,
  isPaused,
  initialSeconds = 0,
  onTimeUpdate,
  className = ""
}: SessionStopwatchProps) {
  const [isClient, setIsClient] = useState(false)
  
  // Create offset timestamp for initial seconds
  const getOffsetTimestamp = () => {
    const offset = new Date()
    offset.setSeconds(offset.getSeconds() + initialSeconds)
    return offset
  }
  
  const {
    totalSeconds,
    seconds,
    minutes,
    hours,
    isRunning,
    start,
    pause,
  } = useStopwatch({ 
    autoStart: false,
    offsetTimestamp: getOffsetTimestamp()
  })
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Control stopwatch based on active/paused state
  useEffect(() => {
    if (!isClient) return
    
    if (isActive && !isPaused) {
      if (!isRunning) {
        start()
      }
    } else {
      if (isRunning) {
        pause()
      }
    }
  }, [isActive, isPaused, isRunning, start, pause, isClient])
  
  // Notify parent of elapsed time
  useEffect(() => {
    if (onTimeUpdate && isClient) {
      onTimeUpdate(totalSeconds)
    }
  }, [totalSeconds, onTimeUpdate, isClient])
  
  // Format elapsed time
  const formatElapsedTime = (): string => {
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
  
  if (!isClient) {
    return (
      <div className={`font-mono text-center ${className}`}>
        <div className="text-sm text-gray-400">
          0:00
        </div>
      </div>
    )
  }
  
  return (
    <div className={`font-mono text-center ${className}`}>
      <div className="flex flex-col items-center">
        <div className="text-sm text-gray-400">
          {formatElapsedTime()}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Elapsed Time
        </div>
      </div>
    </div>
  )
}