'use client'

import React, { useMemo, useEffect, useState, useRef } from 'react'
import { Clock, Loader } from 'lucide-react'
import { motion } from 'framer-motion'
import { getAvailableTimeSlots, formatInUserTimezone } from '@/lib/date-utils'
import { format } from 'date-fns'

interface TimeSlotPickerProps {
  selectedDate: Date | null
  selectedTime: Date | null
  onTimeSelect: (time: Date) => void
  timezone: string
  duration: number // in minutes
  existingSessions?: Array<{ date: Date; duration: number }>
  isLoading?: boolean
  calendarIntegrations?: Array<{ provider: string; id: string }>
}

export function TimeSlotPicker({
  selectedDate,
  selectedTime,
  onTimeSelect,
  timezone,
  duration = 60,
  existingSessions = [],
  isLoading = false,
  calendarIntegrations = []
}: TimeSlotPickerProps) {
  const [conflictCheckLoading, setConflictCheckLoading] = useState(false)
  const [conflicts, setConflicts] = useState<Set<string>>(new Set())
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Generate available time slots for the selected date
  const timeSlots = useMemo(() => {
    if (!selectedDate) return []
    
    return getAvailableTimeSlots(selectedDate, timezone, {
      startHour: 9,
      endHour: 21, // Extended hours to 9 PM
      interval: 30
    })
  }, [selectedDate, timezone])
  
  // Check for conflicts with existing sessions and calendar integrations
  useEffect(() => {
    // Cancel any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    if (!selectedDate) {
      setConflicts(new Set())
      setConflictCheckLoading(false)
      return
    }
    
    // Debounce the conflict check by 300ms to prevent rapid API calls
    debounceTimerRef.current = setTimeout(() => {
      const checkConflicts = async () => {
        // Create new abort controller for this request
        const abortController = new AbortController()
        abortControllerRef.current = abortController
        
        // Only set loading if we have time slots to check
        const slots = getAvailableTimeSlots(selectedDate, timezone, {
          startHour: 9,
          endHour: 21,
          interval: 30
        })
        
        if (slots.length === 0) {
          setConflictCheckLoading(false)
          return
        }
        
        setConflictCheckLoading(true)
        const conflictSet = new Set<string>()
        
        try {
          
          // Check existing sessions locally (no API call needed)
          if (existingSessions && existingSessions.length > 0) {
            slots.forEach(slot => {
              const slotEnd = new Date(slot.time.getTime() + duration * 60 * 1000)
              
              existingSessions.forEach(session => {
                const sessionEnd = new Date(session.date.getTime() + session.duration * 60 * 1000)
                
                // Check if times overlap
                if (
                  (slot.time >= session.date && slot.time < sessionEnd) ||
                  (slotEnd > session.date && slotEnd <= sessionEnd) ||
                  (slot.time <= session.date && slotEnd >= sessionEnd)
                ) {
                  conflictSet.add(slot.time.toISOString())
                }
              })
            })
          }
          
          // Check calendar integrations - only if we have both integrations and time slots
          // Temporarily disable external calendar checks to fix infinite loop
          const skipExternalCalendarCheck = true
          
          if (!skipExternalCalendarCheck && calendarIntegrations && calendarIntegrations.length > 0 && slots.length > 0) {
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), 5000)
            )
            
            const fetchPromise = fetch('/api/calendar/conflicts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                date: selectedDate.toISOString(),
                duration,
                timeSlots: slots.map(slot => slot.time.toISOString())
              }),
              signal: abortController.signal // Add abort signal to request
            })
            
            const response = await Promise.race([fetchPromise, timeoutPromise]) as Response
            
            if (response.ok) {
              const data = await response.json()
              if (data.conflicts && Array.isArray(data.conflicts)) {
                data.conflicts.forEach((conflictTime: string) => {
                  conflictSet.add(conflictTime)
                })
              }
            }
          }
          
          // Only update state if this request wasn't aborted
          if (!abortController.signal.aborted) {
            setConflicts(conflictSet)
          }
        } catch (error: any) {
          // Ignore abort errors
          if (error?.name !== 'AbortError') {
            console.error('Error checking calendar conflicts:', error)
          }
        } finally {
          // Always clear loading state unless request was aborted
          if (!abortController.signal.aborted) {
            setConflictCheckLoading(false)
          }
        }
      }
      
      checkConflicts()
    }, 300) // 300ms debounce delay
    
    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [selectedDate, timezone, existingSessions, duration, calendarIntegrations?.length]) // Use stable reference to prevent loops
  
  const isSlotAvailable = (slotTime: Date) => {
    // Check if slot is in the past
    if (slotTime < new Date()) return false
    
    // Check if slot has conflicts
    if (conflicts.has(slotTime.toISOString())) return false
    
    return true
  }
  
  const getSlotStatus = (slotTime: Date) => {
    if (slotTime < new Date()) return 'past'
    if (conflicts.has(slotTime.toISOString())) return 'conflict'
    return 'available'
  }
  
  if (!selectedDate) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">Please select a date first</p>
      </div>
    )
  }
  
  if (isLoading || conflictCheckLoading) {
    return (
      <div className="text-center py-8">
        <Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
        <p className="text-gray-400">Checking availability...</p>
      </div>
    )
  }
  
  // Group time slots by period
  const morningSlots = timeSlots.filter(slot => {
    const hour = new Date(slot.time).getHours()
    return hour >= 9 && hour < 12
  })
  
  const afternoonSlots = timeSlots.filter(slot => {
    const hour = new Date(slot.time).getHours()
    return hour >= 12 && hour < 17
  })
  
  const eveningSlots = timeSlots.filter(slot => {
    const hour = new Date(slot.time).getHours()
    return hour >= 17 && hour < 21
  })
  
  const renderTimeSlotGroup = (title: string, slots: typeof timeSlots) => {
    if (slots.length === 0) return null
    
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-400">{title}</h4>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {slots.map(slot => {
            const status = getSlotStatus(slot.time)
            const isSelected = selectedTime && slot.time.getTime() === selectedTime.getTime()
            const isAvailable = status === 'available'
            
            return (
              <motion.button
                key={slot.time.toISOString()}
                whileHover={isAvailable ? { scale: 1.05 } : {}}
                whileTap={isAvailable ? { scale: 0.95 } : {}}
                onClick={() => isAvailable && onTimeSelect(slot.time)}
                disabled={!isAvailable}
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${status === 'past' 
                    ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed line-through'
                    : status === 'conflict'
                    ? 'bg-red-900/20 text-red-400 cursor-not-allowed'
                    : isSelected
                    ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  }
                `}
                title={status === 'conflict' ? 'Time slot unavailable' : ''}
              >
                {slot.display}
              </motion.button>
            )
          })}
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Select a Time</h3>
        <span className="text-sm text-gray-400">
          {format(selectedDate, 'EEEE, MMMM d')}
        </span>
      </div>
      
      <div className="space-y-6">
        {renderTimeSlotGroup('Morning', morningSlots)}
        {renderTimeSlotGroup('Afternoon', afternoonSlots)}
        {renderTimeSlotGroup('Evening', eveningSlots)}
      </div>
      
      {selectedTime && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
          <p className="text-sm text-blue-400">
            Selected: {formatInUserTimezone(selectedTime, 'h:mm a zzz', timezone)} ({duration} minutes)
          </p>
        </div>
      )}
      
      <div className="text-xs text-gray-500 space-y-1">
        <p className="flex items-center gap-2">
          <span className="w-3 h-3 bg-gray-800 rounded" />
          Available
        </p>
        <p className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-900/20 rounded" />
          Unavailable/Conflict
        </p>
      </div>
    </div>
  )
}