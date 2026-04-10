'use client'

import React from 'react'
import { Users, User, UsersIcon, Heart, Brain, Activity } from 'lucide-react'
import { motion } from 'framer-motion'
import { SessionType as TherapyType } from '@prisma/client'

interface TherapyTypeSelectorProps {
  selectedType: TherapyType | null
  onTypeSelect: (type: TherapyType) => void
  availableTypes?: TherapyType[]
  partnerConnected?: boolean
  familyMembersCount?: number
}

interface TherapyTypeOption {
  type: TherapyType
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  gradient: string
  features: string[]
  recommended?: boolean
}

const therapyTypeOptions: TherapyTypeOption[] = [
  {
    type: 'SOLO' as TherapyType,
    label: 'Individual',
    description: 'Personal growth and self-discovery',
    icon: User,
    gradient: 'from-blue-600 to-cyan-600',
    features: [
      'One-on-one support',
      'Personal development',
      'Stress management',
      'Self-awareness'
    ]
  },
  {
    type: 'COUPLE' as TherapyType,
    label: 'Couples',
    description: 'Strengthen your relationship',
    icon: Heart,
    gradient: 'from-pink-600 to-rose-600',
    features: [
      'Communication skills',
      'Conflict resolution',
      'Intimacy building',
      'Trust repair'
    ],
    recommended: true
  },
  {
    type: 'FAMILY',
    label: 'Family',
    description: 'Improve family dynamics',
    icon: UsersIcon,
    gradient: 'from-purple-600 to-indigo-600',
    features: [
      'Family communication',
      'Parenting support',
      'Boundary setting',
      'Conflict mediation'
    ]
  },
  {
    type: 'FAMILY' as TherapyType, // Mapped from GROUP to FAMILY
    label: 'Group',
    description: 'Connect with others on similar journeys',
    icon: Users,
    gradient: 'from-green-600 to-emerald-600',
    features: [
      'Peer support',
      'Shared experiences',
      'Group dynamics',
      'Community healing'
    ]
  }
]

const additionalOptions = [
  {
    type: 'CLINICAL' as TherapyType,
    label: 'Clinical',
    description: 'Evidence-based therapeutic interventions',
    icon: Brain,
    gradient: 'from-orange-600 to-amber-600',
    features: [
      'CBT/DBT approaches',
      'Trauma-informed',
      'Clinical assessment',
      'Treatment planning'
    ]
  },
  {
    type: 'WELLNESS' as TherapyType,
    label: 'Wellness',
    description: 'Holistic health and wellbeing',
    icon: Activity,
    gradient: 'from-teal-600 to-cyan-600',
    features: [
      'Mind-body connection',
      'Lifestyle coaching',
      'Stress reduction',
      'Wellness planning'
    ]
  }
]

export function TherapyTypeSelector({
  selectedType,
  onTypeSelect,
  availableTypes,
  partnerConnected = false,
  familyMembersCount = 0
}: TherapyTypeSelectorProps) {
  // Filter available options based on what's enabled
  const displayOptions = therapyTypeOptions.filter(option => {
    if (availableTypes && !availableTypes.includes(option.type)) {
      return false
    }
    
    // Show couples option only if partner is connected
    if (option.type === 'COUPLE' && !partnerConnected) {
      return false
    }
    
    // Show family option only if there are family members
    if (option.type === 'FAMILY' && familyMembersCount === 0) {
      return false
    }
    
    return true
  })
  
  const getRecommendedType = () => {
    if (partnerConnected) return 'COUPLES'
    if (familyMembersCount > 0) return 'FAMILY'
    return 'INDIVIDUAL'
  }
  
  const recommendedType = getRecommendedType()
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Select Therapy Type</h3>
        {selectedType && (
          <span className="text-sm text-gray-400">
            Selected: {displayOptions.find(o => o.type === selectedType)?.label}
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {displayOptions.map((option) => {
          const isSelected = selectedType === option.type
          const isRecommended = option.type === recommendedType
          const Icon = option.icon
          
          return (
            <motion.button
              key={option.type}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onTypeSelect(option.type)}
              className={`
                relative p-4 rounded-xl text-left transition-all overflow-hidden
                ${isSelected 
                  ? 'bg-gradient-to-br ' + option.gradient + ' text-white shadow-lg' 
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }
              `}
            >
              {/* Recommended Badge */}
              {isRecommended && !isSelected && (
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">
                    Recommended
                  </span>
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                  ${isSelected 
                    ? 'bg-white/20' 
                    : 'bg-gradient-to-br ' + option.gradient + ' text-white'
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
                  
                  {/* Features List */}
                  <div className="mt-3 space-y-1">
                    {option.features.slice(0, 2).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className={`w-1 h-1 rounded-full ${
                          isSelected ? 'bg-white/60' : 'bg-gray-500'
                        }`} />
                        <span className={`text-xs ${
                          isSelected ? 'text-white/70' : 'text-gray-500'
                        }`}>
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Selection Indicator */}
              {isSelected && (
                <motion.div
                  layoutId="therapyTypeIndicator"
                  className="absolute inset-0 border-2 border-white/30 rounded-xl pointer-events-none"
                />
              )}
            </motion.button>
          )
        })}
      </div>
      
      {/* Info Messages */}
      {!partnerConnected && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <p className="text-sm text-blue-400">
            Connect with your partner in your profile to unlock couples therapy sessions
          </p>
        </div>
      )}
      
      {familyMembersCount === 0 && !partnerConnected && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
          <p className="text-sm text-purple-400">
            Add family members in your profile to access family therapy sessions
          </p>
        </div>
      )}
    </div>
  )
}