'use client'

import React from 'react'
import { Modal } from '@/components/Modal'
import { User, Users, Home, ChevronRight } from 'lucide-react'

export type TherapyType = 'solo' | 'couple' | 'family'

interface TherapyTypeSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelectType: (type: TherapyType) => void
  isLoading?: boolean
  availableTypes?: TherapyType[]
}

export const TherapyTypeSelector: React.FC<TherapyTypeSelectorProps> = ({
  isOpen,
  onClose,
  onSelectType,
  isLoading = false,
  availableTypes = ['solo', 'couple', 'family']
}) => {
  const therapyTypeInfo = {
    solo: {
      icon: User,
      title: 'Solo Therapy',
      description: 'Individual session focused on personal growth and self-discovery',
      benefits: [
        'Personalized attention',
        'Safe space for personal topics',
        'Self-paced exploration'
      ],
      color: 'blue'
    },
    couple: {
      icon: Users,
      title: 'Couple Therapy',
      description: 'Strengthen your relationship through guided conversation',
      benefits: [
        'Improve communication',
        'Resolve conflicts together',
        'Build deeper connection'
      ],
      color: 'purple'
    },
    family: {
      icon: Home,
      title: 'Family Therapy',
      description: 'Address family dynamics and strengthen bonds',
      benefits: [
        'Improve family communication',
        'Resolve family conflicts',
        'Create healthier dynamics'
      ],
      color: 'green'
    }
  }

  const handleSelectType = (type: TherapyType) => {
    if (!isLoading) {
      onSelectType(type)
    }
  }

  const getColorClasses = (color: string, isHover = false) => {
    const colors = {
      blue: isHover 
        ? 'hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
        : 'text-blue-600 dark:text-blue-400',
      purple: isHover
        ? 'hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20'
        : 'text-purple-600 dark:text-purple-400',
      green: isHover
        ? 'hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
        : 'text-green-600 dark:text-green-400'
    }
    return colors[color as keyof typeof colors] || colors.purple
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose Therapy Type">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Select the type of therapy session you'd like to start.
        </p>

        <div className="space-y-3">
          {availableTypes.map((type) => {
            const info = therapyTypeInfo[type]
            const Icon = info.icon

            return (
              <button
                key={type}
                onClick={() => handleSelectType(type)}
                disabled={isLoading}
                className={`
                  w-full p-4 rounded-lg border-2 transition-all text-left
                  ${isLoading
                    ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                    : `border-gray-200 dark:border-gray-700 ${getColorClasses(info.color, true)}`
                  }
                  group
                `}
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg bg-gray-100 dark:bg-gray-800 ${getColorClasses(info.color)}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                        {info.title}
                      </h3>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {info.description}
                    </p>
                    
                    <div className="mt-3 space-y-1">
                      {info.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-600" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {isLoading && (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
            Starting your session...
          </div>
        )}
      </div>
    </Modal>
  )
}