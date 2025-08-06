'use client'

import React, { useState } from 'react'
import { FileText, Target, Heart, Brain, AlertCircle, CheckCircle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SessionNotesFormProps {
  notes?: string
  onNotesChange: (notes: string) => void
  goals?: string[]
  onGoalsChange?: (goals: string[]) => void
  focusAreas?: string[]
  onFocusAreasChange?: (areas: string[]) => void
  therapyType?: string
}

interface FocusArea {
  value: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const commonFocusAreas: FocusArea[] = [
  { value: 'communication', label: 'Communication', icon: FileText },
  { value: 'trust', label: 'Trust Building', icon: Heart },
  { value: 'conflict', label: 'Conflict Resolution', icon: AlertCircle },
  { value: 'intimacy', label: 'Intimacy', icon: Heart },
  { value: 'anxiety', label: 'Anxiety Management', icon: Brain },
  { value: 'depression', label: 'Depression', icon: Brain },
  { value: 'trauma', label: 'Trauma Processing', icon: AlertCircle },
  { value: 'boundaries', label: 'Boundaries', icon: CheckCircle },
  { value: 'parenting', label: 'Parenting', icon: Users },
  { value: 'career', label: 'Career/Work', icon: Target },
  { value: 'self-esteem', label: 'Self-Esteem', icon: Heart },
  { value: 'addiction', label: 'Addiction Recovery', icon: Brain }
]

// Import Users icon for parenting
import { Users } from 'lucide-react'

const sessionPrompts = {
  INDIVIDUAL: [
    "What would you like to focus on today?",
    "Any specific challenges this week?",
    "Progress updates from last session?"
  ],
  COUPLES: [
    "What relationship topics to discuss?",
    "Recent conflicts to address?",
    "Positive moments to celebrate?"
  ],
  FAMILY: [
    "Family dynamics to explore?",
    "Communication patterns to improve?",
    "Specific family members' concerns?"
  ],
  GROUP: [
    "Topics to share with the group?",
    "Support needed from peers?",
    "Experiences to process together?"
  ]
}

export function SessionNotesForm({
  notes = '',
  onNotesChange,
  goals = [],
  onGoalsChange,
  focusAreas = [],
  onFocusAreasChange,
  therapyType = 'INDIVIDUAL'
}: SessionNotesFormProps) {
  const [newGoal, setNewGoal] = useState('')
  const [showGoalInput, setShowGoalInput] = useState(false)
  
  const maxNotesLength = 500
  const remainingChars = maxNotesLength - notes.length
  
  const prompts = sessionPrompts[therapyType as keyof typeof sessionPrompts] || sessionPrompts.INDIVIDUAL
  
  const handleAddGoal = () => {
    if (newGoal.trim() && goals.length < 5) {
      onGoalsChange?.([...goals, newGoal.trim()])
      setNewGoal('')
      setShowGoalInput(false)
    }
  }
  
  const handleRemoveGoal = (index: number) => {
    onGoalsChange?.(goals.filter((_, i) => i !== index))
  }
  
  const toggleFocusArea = (area: string) => {
    if (focusAreas.includes(area)) {
      onFocusAreasChange?.(focusAreas.filter(a => a !== area))
    } else if (focusAreas.length < 4) {
      onFocusAreasChange?.([...focusAreas, area])
    }
  }
  
  const insertPrompt = (prompt: string) => {
    if (notes.length > 0) {
      onNotesChange(notes + '\n\n' + prompt + ' ')
    } else {
      onNotesChange(prompt + ' ')
    }
  }
  
  return (
    <div className="space-y-4">
      {/* Session Notes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Session Notes
          </h3>
          <span className={`text-sm ${remainingChars < 50 ? 'text-orange-400' : 'text-gray-400'}`}>
            {remainingChars} characters left
          </span>
        </div>
        
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value.slice(0, maxNotesLength))}
          placeholder="Add any notes, topics, or context for your session..."
          className="w-full h-32 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 transition-colors"
        />
        
        {/* Quick Prompts */}
        <div className="mt-2 flex flex-wrap gap-2">
          {prompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => insertPrompt(prompt)}
              className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-full transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
      
      {/* Focus Areas */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-2">
          Focus Areas (select up to 4)
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {commonFocusAreas.map((area) => {
            const isSelected = focusAreas.includes(area.value)
            const Icon = area.icon
            
            return (
              <button
                key={area.value}
                onClick={() => toggleFocusArea(area.value)}
                disabled={!isSelected && focusAreas.length >= 4}
                className={`
                  p-2 rounded-lg text-sm flex items-center gap-2 transition-all
                  ${isSelected
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate">{area.label}</span>
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Session Goals */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Session Goals
          </h4>
          {goals.length < 5 && (
            <button
              onClick={() => setShowGoalInput(true)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              + Add Goal
            </button>
          )}
        </div>
        
        {/* Goals List */}
        <div className="space-y-2">
          <AnimatePresence>
            {goals.map((goal, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 p-2 bg-gray-800/50 rounded-lg"
              >
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-sm text-gray-300 flex-1">{goal}</span>
                <button
                  onClick={() => handleRemoveGoal(idx)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                >
                  <X className="w-3 h-3 text-gray-500" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* New Goal Input */}
          <AnimatePresence>
            {showGoalInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddGoal()}
                  placeholder="Enter a goal for this session..."
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleAddGoal}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowGoalInput(false)
                    setNewGoal('')
                  }}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          
          {goals.length === 0 && !showGoalInput && (
            <p className="text-sm text-gray-500 text-center py-2">
              No goals set yet. Add goals to track progress.
            </p>
          )}
        </div>
      </div>
      
      {/* Privacy Notice */}
      <div className="bg-gray-800/30 rounded-lg p-3 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-gray-400">
          <p>Your notes are private and help your therapist prepare for the session.</p>
          <p className="mt-1">All information is encrypted and stored securely.</p>
        </div>
      </div>
    </div>
  )
}