// @ts-nocheck
'use client'

import React, { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Calendar, Clock, Users, FileText, Loader, CheckCircle, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { DatePicker } from './DatePicker'
import { TimeSlotPicker } from './TimeSlotPicker'
import { TherapyTypeSelector } from './TherapyTypeSelector'
import { SessionDurationPicker } from './SessionDurationPicker'
import { RecurringSessionOptions } from './RecurringSessionOptions'
import { SessionNotesForm } from './SessionNotesForm'
import { TherapyType } from '@prisma/client'
import { getUserTimezone, formatSessionTime } from '@/lib/date-utils'
import { useProfile } from '@/providers/ProfileProvider'

interface EnhancedSchedulerModalProps {
  isOpen: boolean
  onClose: () => void
  sessionToEdit?: any
  onSchedule?: (data: any) => void
  userPreferences?: any
}

interface SchedulerStep {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const steps: SchedulerStep[] = [
  { id: 'date', label: 'Date', icon: Calendar },
  { id: 'type', label: 'Type', icon: Users },
  { id: 'duration', label: 'Duration', icon: Clock },
  { id: 'time', label: 'Time', icon: Clock },
  { id: 'notes', label: 'Details', icon: FileText }
]

export function EnhancedSchedulerModal({ 
  isOpen, 
  onClose, 
  sessionToEdit,
  onSchedule,
  userPreferences
}: EnhancedSchedulerModalProps) {
  const { profile } = useProfile()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<Date | null>(null)
  const [therapyType, setTherapyType] = useState<TherapyType>('INDIVIDUAL')
  const [duration, setDuration] = useState(30)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringFrequency, setRecurringFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly')
  const [recurringEndDate, setRecurringEndDate] = useState<Date | null>(null)
  const [recurringSessionCount, setRecurringSessionCount] = useState(4)
  const [notes, setNotes] = useState('')
  const [goals, setGoals] = useState<string[]>([])
  const [focusAreas, setFocusAreas] = useState<string[]>([])
  
  const timezone = getUserTimezone(profile?.timezone)
  
  // Initialize from edit session
  useEffect(() => {
    if (sessionToEdit) {
      setSelectedDate(new Date(sessionToEdit.startTime))
      setSelectedTime(new Date(sessionToEdit.startTime))
      setTherapyType(sessionToEdit.therapyType as TherapyType || 'INDIVIDUAL')
      setDuration(sessionToEdit.duration || 60)
      setNotes(sessionToEdit.notes || '')
    }
  }, [sessionToEdit])
  
  // Initialize from user preferences
  useEffect(() => {
    if (userPreferences && !sessionToEdit) {
      if (userPreferences.therapyType) {
        setTherapyType(userPreferences.therapyType)
      }
      if (userPreferences.recurringSession === 'yes') {
        setIsRecurring(true)
        setRecurringFrequency(userPreferences.sessionFrequency || 'weekly')
      }
    }
  }, [userPreferences, sessionToEdit])
  
  const canProceed = () => {
    switch (currentStep) {
      case 0: return selectedDate !== null
      case 1: return therapyType !== null
      case 2: return duration > 0
      case 3: return selectedTime !== null
      case 4: return true // Notes are optional
      default: return false
    }
  }
  
  const handleNext = () => {
    if (canProceed() && currentStep < steps.length - 1) {
      setError(null)
      setCurrentStep(currentStep + 1)
    }
  }
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setError(null)
      setCurrentStep(currentStep - 1)
    }
  }
  
  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const sessionData = {
        date: selectedTime.toISOString(),
        duration,
        therapyType,
        notes,
        goals,
        focusAreas,
        isRecurring,
        recurringFrequency: isRecurring ? recurringFrequency : undefined,
        recurringEndDate: isRecurring && recurringEndDate ? recurringEndDate.toISOString() : undefined,
        recurringSessionCount: isRecurring && !recurringEndDate ? recurringSessionCount : undefined,
        sessionId: sessionToEdit?.id
      }
      
      await onSchedule?.(sessionData)
    } catch (error) {
      console.error('Error scheduling session:', error)
      setError(error instanceof Error ? error.message : 'Failed to schedule session. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  if (!isOpen) return null
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <DatePicker
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            timezone={timezone}
          />
        )
      case 1:
        return (
          <TherapyTypeSelector
            selectedType={therapyType}
            onTypeSelect={setTherapyType}
            partnerConnected={!!profile?.partnerId}
            familyMembersCount={profile?.familyMembers?.length || 0}
          />
        )
      case 2:
        return (
          <div className="space-y-6">
            <SessionDurationPicker
              selectedDuration={duration}
              onDurationSelect={setDuration}
              therapyType={therapyType}
            />
            <RecurringSessionOptions
              isRecurring={isRecurring}
              onRecurringChange={setIsRecurring}
              frequency={recurringFrequency}
              onFrequencyChange={setRecurringFrequency}
              endDate={recurringEndDate}
              onEndDateChange={setRecurringEndDate}
              sessionCount={recurringSessionCount}
              onSessionCountChange={setRecurringSessionCount}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
            />
          </div>
        )
      case 3:
        return (
          <TimeSlotPicker
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onTimeSelect={setSelectedTime}
            timezone={timezone}
            duration={duration}
          />
        )
      case 4:
        return (
          <SessionNotesForm
            notes={notes}
            onNotesChange={setNotes}
            goals={goals}
            onGoalsChange={setGoals}
            focusAreas={focusAreas}
            onFocusAreasChange={setFocusAreas}
            therapyType={therapyType}
          />
        )
      default:
        return null
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative z-10 w-full max-w-4xl bg-gray-900 rounded-xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-white">
                {sessionToEdit ? 'Reschedule Session' : 'Schedule New Session'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            {/* Step Indicators */}
            <div className="flex items-center gap-2 mt-4">
              {steps.map((step, idx) => {
                const Icon = step.icon
                const isActive = idx === currentStep
                const isCompleted = idx < currentStep
                
                return (
                  <React.Fragment key={step.id}>
                    <button
                      onClick={() => isCompleted && setCurrentStep(idx)}
                      disabled={!isCompleted}
                      className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all
                        ${isActive 
                          ? 'bg-blue-600 text-white' 
                          : isCompleted
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer'
                          : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        }
                      `}
                    >
                      {isCompleted && !isActive ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                      <span className="text-sm font-medium">{step.label}</span>
                    </button>
                    {idx < steps.length - 1 && (
                      <div className={`w-8 h-0.5 ${
                        idx < currentStep ? 'bg-blue-600' : 'bg-gray-700'
                      }`} />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* Error Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-400 font-medium">Error</p>
                    <p className="text-sm text-red-300 mt-1">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto p-1 hover:bg-red-500/20 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Step Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>
          
          {/* Footer */}
          <div className="bg-gray-800 px-6 py-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                  ${currentStep === 0
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }
                `}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              <div className="flex items-center gap-3">
                {selectedTime && (
                  <div className="text-sm text-gray-400">
                    {formatSessionTime(selectedTime, duration, timezone).date} at {formatSessionTime(selectedTime, duration, timezone).time}
                  </div>
                )}
                
                {currentStep === steps.length - 1 ? (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !canProceed()}
                    className={`
                      flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all
                      ${isSubmitting || !canProceed()
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                      }
                    `}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        {sessionToEdit ? 'Update Session' : 'Schedule Session'}
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                      ${!canProceed()
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                      }
                    `}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Loading Overlay */}
          <AnimatePresence>
            {isSubmitting && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm z-20 flex items-center justify-center rounded-xl"
              >
                <div className="bg-gray-800 rounded-xl p-6 text-center">
                  <Loader className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-3" />
                  <p className="text-white font-medium">
                    {sessionToEdit ? 'Updating session...' : 'Scheduling session...'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    This may take a few moments
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}