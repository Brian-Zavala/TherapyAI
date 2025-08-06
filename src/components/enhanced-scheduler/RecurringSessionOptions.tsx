'use client'

import React, { useState } from 'react'
import { Repeat, Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { addWeeks, addMonths, format } from 'date-fns'

interface RecurringSessionOptionsProps {
  isRecurring: boolean
  onRecurringChange: (isRecurring: boolean) => void
  frequency?: 'weekly' | 'biweekly' | 'monthly'
  onFrequencyChange?: (frequency: 'weekly' | 'biweekly' | 'monthly') => void
  endDate?: Date | null
  onEndDateChange?: (date: Date | null) => void
  sessionCount?: number
  onSessionCountChange?: (count: number) => void
  selectedDate?: Date | null
  selectedTime?: Date | null
}

interface FrequencyOption {
  value: 'weekly' | 'biweekly' | 'monthly'
  label: string
  description: string
  recommended?: boolean
}

const frequencyOptions: FrequencyOption[] = [
  {
    value: 'weekly',
    label: 'Weekly',
    description: 'Same day and time each week',
    recommended: true
  },
  {
    value: 'biweekly',
    label: 'Bi-weekly',
    description: 'Every two weeks'
  },
  {
    value: 'monthly',
    label: 'Monthly',
    description: 'Once per month'
  }
]

export function RecurringSessionOptions({
  isRecurring,
  onRecurringChange,
  frequency = 'weekly',
  onFrequencyChange,
  endDate,
  onEndDateChange,
  sessionCount = 4,
  onSessionCountChange,
  selectedDate,
  selectedTime
}: RecurringSessionOptionsProps) {
  const [endType, setEndType] = useState<'date' | 'count'>('count')
  
  const calculateEndDate = (startDate: Date, freq: string, count: number): Date => {
    switch (freq) {
      case 'weekly':
        return addWeeks(startDate, count - 1)
      case 'biweekly':
        return addWeeks(startDate, (count - 1) * 2)
      case 'monthly':
        return addMonths(startDate, count - 1)
      default:
        return startDate
    }
  }
  
  const getNextSessions = () => {
    if (!selectedDate || !isRecurring) return []
    
    const sessions = []
    let currentDate = new Date(selectedDate)
    
    if (selectedTime) {
      currentDate.setHours(selectedTime.getHours(), selectedTime.getMinutes())
    }
    
    const maxSessions = endType === 'count' ? sessionCount : 10
    
    for (let i = 0; i < maxSessions; i++) {
      if (endType === 'date' && endDate && currentDate > endDate) break
      
      sessions.push(new Date(currentDate))
      
      switch (frequency) {
        case 'weekly':
          currentDate = addWeeks(currentDate, 1)
          break
        case 'biweekly':
          currentDate = addWeeks(currentDate, 2)
          break
        case 'monthly':
          currentDate = addMonths(currentDate, 1)
          break
      }
    }
    
    return sessions.slice(0, 5) // Show max 5 preview sessions
  }
  
  return (
    <div className="space-y-4">
      {/* Recurring Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-800 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
            <Repeat className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-medium">Recurring Sessions</h3>
            <p className="text-sm text-gray-400">Schedule regular sessions automatically</p>
          </div>
        </div>
        <button
          onClick={() => onRecurringChange(!isRecurring)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            isRecurring ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          <motion.div
            layout
            className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
            animate={{ x: isRecurring ? 20 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      </div>
      
      <AnimatePresence>
        {isRecurring && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* Frequency Selection */}
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">Frequency</h4>
              <div className="grid grid-cols-3 gap-2">
                {frequencyOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => onFrequencyChange?.(option.value)}
                    className={`
                      p-3 rounded-lg text-center transition-all
                      ${frequency === option.value
                        ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                      }
                    `}
                  >
                    <div className="font-medium">{option.label}</div>
                    {option.recommended && frequency !== option.value && (
                      <div className="text-xs text-green-400 mt-1">Recommended</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            {/* End Type Selection */}
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">End After</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setEndType('count')}
                  className={`
                    p-3 rounded-lg transition-all
                    ${endType === 'count'
                      ? 'bg-gray-700 text-white border border-blue-500'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    }
                  `}
                >
                  <Clock className="w-4 h-4 inline mr-2" />
                  Number of Sessions
                </button>
                <button
                  onClick={() => setEndType('date')}
                  className={`
                    p-3 rounded-lg transition-all
                    ${endType === 'date'
                      ? 'bg-gray-700 text-white border border-blue-500'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    }
                  `}
                >
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Specific Date
                </button>
              </div>
            </div>
            
            {/* End Configuration */}
            {endType === 'count' ? (
              <div>
                <label className="text-sm text-gray-400">Number of Sessions</label>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => onSessionCountChange?.(Math.max(2, sessionCount - 1))}
                    className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white"
                  >
                    -
                  </button>
                  <div className="flex-1 text-center bg-gray-800 rounded-lg py-2 text-white">
                    {sessionCount} sessions
                  </div>
                  <button
                    onClick={() => onSessionCountChange?.(Math.min(52, sessionCount + 1))}
                    className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white"
                  >
                    +
                  </button>
                </div>
                {selectedDate && (
                  <p className="text-xs text-gray-500 mt-2">
                    Ends on: {format(calculateEndDate(selectedDate, frequency, sessionCount), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="text-sm text-gray-400">End Date</label>
                <input
                  type="date"
                  value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => onEndDateChange?.(e.target.value ? new Date(e.target.value) : null)}
                  min={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
                  className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            )}
            
            {/* Session Preview */}
            {selectedDate && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Upcoming Sessions Preview
                </h4>
                <div className="space-y-1">
                  {getNextSessions().map((date, idx) => (
                    <div key={idx} className="text-sm text-gray-300 flex items-center gap-2">
                      <span className="text-gray-500">{idx + 1}.</span>
                      {format(date, 'EEE, MMM d, yyyy')}
                      {selectedTime && (
                        <span className="text-gray-400">
                          at {format(date, 'h:mm a')}
                        </span>
                      )}
                    </div>
                  ))}
                  {endType === 'count' && sessionCount > 5 && (
                    <div className="text-sm text-gray-500">
                      ... and {sessionCount - 5} more sessions
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Info Message */}
            <div className="bg-gray-800/50 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-gray-400">
                <p>Recurring sessions will be automatically scheduled at the same time.</p>
                <p className="mt-1">You can modify or cancel individual sessions later.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}