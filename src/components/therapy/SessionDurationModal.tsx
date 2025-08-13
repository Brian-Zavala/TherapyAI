'use client'

import React from 'react'
import { Modal } from '@/components/Modal'
import { Clock } from 'lucide-react'

interface SessionDurationModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectDuration: (duration: number) => void
  isLoading?: boolean
  availableDurations?: number[]
}

export const SessionDurationModal: React.FC<SessionDurationModalProps> = ({
  isOpen,
  onClose,
  onSelectDuration,
  isLoading = false,
  availableDurations = [15, 20, 25, 30, 45, 60]
}) => {
  const handleDurationSelect = (duration: number) => {
    if (!isLoading) {
      onSelectDuration(duration)
    }
  }

  const getDurationLabel = (duration: number): string => {
    if (duration < 60) {
      return `${duration} minutes`
    }
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60
    if (minutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`
    }
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minutes`
  }

  const getDurationDescription = (duration: number): string => {
    switch (duration) {
      case 15:
        return 'Quick check-in or follow-up'
      case 20:
        return 'Brief focused session'
      case 25:
        return 'Standard session'
      case 30:
        return 'Full session with deep discussion'
      case 45:
        return 'Extended session for complex topics'
      case 60:
        return 'Comprehensive therapy session'
      default:
        return 'Custom duration session'
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Session Duration">
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Choose the duration that best fits your needs today.
        </p>
        
        {availableDurations.map((duration) => (
          <button
            key={duration}
            onClick={() => handleDurationSelect(duration)}
            disabled={isLoading}
            className={`
              w-full p-4 rounded-lg border-2 transition-all
              ${isLoading 
                ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' 
                : 'hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 border-gray-200 dark:border-gray-700'
              }
              flex items-start space-x-3
            `}
          >
            <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-left">
              <div className="font-semibold text-gray-900 dark:text-white">
                {getDurationLabel(duration)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {getDurationDescription(duration)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  )
}