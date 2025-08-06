'use client'

import React, { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addDays, startOfWeek, addWeeks, isSameDay, isAfter, isBefore, startOfDay } from 'date-fns'
import { motion } from 'framer-motion'

interface DatePickerProps {
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  disabledDates?: Date[]
  timezone?: string
}

export function DatePicker({
  selectedDate,
  onDateSelect,
  minDate = new Date(),
  maxDate = addDays(new Date(), 90), // 90 days out
  disabledDates = [],
  timezone = 'UTC'
}: DatePickerProps) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()))
  
  // Generate 7 days for the current week
  const weekDays = useMemo(() => {
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeek, i))
    }
    return days
  }, [currentWeek])
  
  const isDateDisabled = (date: Date) => {
    const dayStart = startOfDay(date)
    return (
      isBefore(dayStart, startOfDay(minDate)) ||
      isAfter(dayStart, startOfDay(maxDate)) ||
      disabledDates.some(disabled => isSameDay(dayStart, disabled))
    )
  }
  
  const handlePreviousWeek = () => {
    const newWeek = addWeeks(currentWeek, -1)
    if (!isBefore(newWeek, startOfWeek(minDate))) {
      setCurrentWeek(newWeek)
    }
  }
  
  const handleNextWeek = () => {
    const newWeek = addWeeks(currentWeek, 1)
    if (!isAfter(addDays(newWeek, 6), maxDate)) {
      setCurrentWeek(newWeek)
    }
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Select a Date</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousWeek}
            disabled={isBefore(addWeeks(currentWeek, -1), startOfWeek(minDate))}
            className="p-1 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <span className="text-sm text-gray-400 min-w-[120px] text-center">
            {format(currentWeek, 'MMM d')} - {format(addDays(currentWeek, 6), 'MMM d, yyyy')}
          </span>
          <button
            onClick={handleNextWeek}
            disabled={isAfter(addDays(addWeeks(currentWeek, 1), 6), maxDate)}
            className="p-1 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((date, index) => {
          const isDisabled = isDateDisabled(date)
          const isSelected = selectedDate && isSameDay(date, selectedDate)
          const isToday = isSameDay(date, new Date())
          
          return (
            <motion.button
              key={date.toISOString()}
              whileHover={!isDisabled ? { scale: 1.05 } : {}}
              whileTap={!isDisabled ? { scale: 0.95 } : {}}
              onClick={() => !isDisabled && onDateSelect(date)}
              disabled={isDisabled}
              className={`
                relative p-3 rounded-xl text-center transition-all
                ${isDisabled 
                  ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed' 
                  : isSelected
                  ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }
              `}
            >
              <div className="text-xs font-medium mb-1">
                {format(date, 'EEE')}
              </div>
              <div className="text-lg font-semibold">
                {format(date, 'd')}
              </div>
              {isToday && !isSelected && (
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />
              )}
            </motion.button>
          )
        })}
      </div>
      
      {selectedDate && (
        <div className="text-center text-sm text-gray-400">
          Selected: {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </div>
      )}
    </div>
  )
}