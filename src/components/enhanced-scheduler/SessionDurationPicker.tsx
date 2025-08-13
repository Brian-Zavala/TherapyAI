'use client'

import React from 'react'
import { Clock, Zap, Calendar, Target } from 'lucide-react'
import { motion } from 'framer-motion'

interface SessionDurationPickerProps {
  selectedDuration: number | null
  onDurationSelect: (duration: number) => void
  therapyType?: string
  recommendedDuration?: number
  minDuration?: number
  maxDuration?: number
}

interface DurationOption {
  minutes: number
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  popular?: boolean
  bestFor?: string[]
  priceMultiplier?: number
}

const durationOptions: DurationOption[] = [
  {
    minutes: 15,
    label: '15 minutes',
    description: 'Brief touchpoint for immediate support',
    icon: Zap,
    bestFor: ['Crisis moments', 'Quick emotional support', 'Maintenance'],
    priceMultiplier: 0.25
  },
  {
    minutes: 20,
    label: '20 minutes',
    description: 'Essential session for meaningful progress',
    icon: Clock,
    popular: true,
    bestFor: ['Regular therapy', 'Relationship work', 'Essential tier'],
    priceMultiplier: 0.35
  },
  {
    minutes: 25,
    label: '25 minutes',
    description: 'Extended session for deeper exploration',
    icon: Calendar,
    bestFor: ['Growth tier', 'Complex topics', 'Therapeutic progress'],
    priceMultiplier: 0.42
  },
  {
    minutes: 30,
    label: '30 minutes',
    description: 'Standard session with comprehensive coverage',
    icon: Clock,
    bestFor: ['Progress updates', 'Multiple topics', 'Unlimited tier'],
    priceMultiplier: 0.5
  },
  {
    minutes: 60,
    label: '60 minutes',
    description: 'Full session with in-depth exploration',
    icon: Target,
    bestFor: ['Couples therapy', 'Complex issues', 'First sessions'],
    priceMultiplier: 1.0
  }
]

const therapyTypeRecommendations: Record<string, number> = {
  INDIVIDUAL: 20,
  COUPLES: 30,
  FAMILY: 30,
  GROUP: 30,
  CLINICAL: 60,
  WELLNESS: 20
}

export function SessionDurationPicker({
  selectedDuration,
  onDurationSelect,
  therapyType,
  recommendedDuration,
  minDuration = 15,
  maxDuration = 60
}: SessionDurationPickerProps) {
  // Get recommended duration based on therapy type or prop
  const getRecommendedDuration = () => {
    if (recommendedDuration) return recommendedDuration
    if (therapyType && therapyTypeRecommendations[therapyType]) {
      return therapyTypeRecommendations[therapyType]
    }
    return 30 // Default recommendation is 30 minutes
  }
  
  const recommended = getRecommendedDuration()
  
  // Filter options based on min/max constraints
  const availableOptions = durationOptions.filter(
    option => option.minutes >= minDuration && option.minutes <= maxDuration
  )
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Select Session Duration</h3>
        {selectedDuration && (
          <span className="text-sm text-gray-400">
            {selectedDuration} minutes selected
          </span>
        )}
      </div>
      
      {/* Duration Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {availableOptions.map((option) => {
          const isSelected = selectedDuration === option.minutes
          const isRecommended = option.minutes === recommended
          const Icon = option.icon
          
          return (
            <motion.button
              key={option.minutes}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onDurationSelect(option.minutes)}
              className={`
                relative p-4 rounded-xl text-left transition-all
                ${isSelected 
                  ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg' 
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }
              `}
            >
              {/* Popular/Recommended Badge */}
              {(option.popular || isRecommended) && !isSelected && (
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    isRecommended 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {isRecommended ? 'Recommended' : 'Popular'}
                  </span>
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                  ${isSelected 
                    ? 'bg-white/20' 
                    : 'bg-gray-700'
                  }
                `}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1">
                  <h4 className={`font-medium ${isSelected ? 'text-white' : 'text-white'}`}>
                    {option.label}
                  </h4>
                  <p className={`text-sm mt-1 ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                    {option.description}
                  </p>
                  
                  {/* Best For List */}
                  {option.bestFor && option.bestFor.length > 0 && (
                    <div className="mt-2">
                      <p className={`text-xs ${isSelected ? 'text-white/60' : 'text-gray-500'}`}>
                        Best for:
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {option.bestFor.slice(0, 2).map((use, idx) => (
                          <span
                            key={idx}
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              isSelected 
                                ? 'bg-white/10 text-white/70' 
                                : 'bg-gray-700 text-gray-400'
                            }`}
                          >
                            {use}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Selection Indicator */}
              {isSelected && (
                <motion.div
                  layoutId="durationIndicator"
                  className="absolute inset-0 border-2 border-white/30 rounded-xl pointer-events-none"
                />
              )}
            </motion.button>
          )
        })}
      </div>
      
      {/* Info Section */}
      <div className="space-y-2">
        {therapyType && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-sm text-blue-400">
              <Clock className="w-4 h-4 inline mr-1" />
              For {therapyType.toLowerCase()} therapy, we recommend {recommended}-minute sessions
            </p>
          </div>
        )}
        
        {/* Custom Duration Option */}
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-sm text-gray-400">
            Need a different duration? Contact support for custom session lengths
          </p>
        </div>
      </div>
      
      {/* Session Tips */}
      <div className="bg-gray-800/30 rounded-lg p-4 space-y-2">
        <h4 className="text-sm font-medium text-white">Session Duration Tips</h4>
        <ul className="space-y-1 text-xs text-gray-400">
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">•</span>
            <span>First-time sessions often benefit from 60 minutes</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-0.5">•</span>
            <span>Regular check-ins can be effective in 30-45 minutes</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-400 mt-0.5">•</span>
            <span>Complex family dynamics may need 90-minute sessions</span>
          </li>
        </ul>
      </div>
    </div>
  )
}