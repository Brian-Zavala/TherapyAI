'use client'

import React, { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { HeartIcon, SparklesIcon, TrophyIcon, TargetIcon } from '@/components/ui/icons'

interface ProgressData {
  overallScore: number
  categories: {
    communication: number
    trust: number
    intimacy: number
    conflictResolution: number
    sharedGoals: number
  }
  milestones: {
    id: string
    title: string
    completed: boolean
    date?: string
  }[]
  streak: number
  totalSessions: number
}

interface RelationshipProgressCardProps {
  progress?: ProgressData
  isLoading?: boolean
  error?: Error | null
  expanded?: boolean
}

// Progress category component
const ProgressCategory = memo(({ 
  name, 
  value, 
  icon, 
  color 
}: { 
  name: string
  value: number
  icon: React.ReactNode
  color: string 
}) => {
  const percentage = Math.min(100, Math.max(0, value))
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full ${color} bg-opacity-20 flex items-center justify-center`}>
            {icon}
          </div>
          <span className="text-sm font-medium text-gray-300">{name}</span>
        </div>
        <span className="text-sm font-bold text-white">{percentage}%</span>
      </div>
      <Progress 
        value={percentage} 
        className="h-2"
        indicatorClassName={color}
      />
    </motion.div>
  )
})

ProgressCategory.displayName = 'ProgressCategory'

// Milestone badge component
const MilestoneBadge = memo(({ 
  milestone 
}: { 
  milestone: { id: string; title: string; completed: boolean; date?: string } 
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.2 }}
    whileHover={{ scale: 1.05 }}
    className={`
      relative overflow-hidden rounded-lg p-3 border transition-all
      ${milestone.completed 
        ? 'bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-700' 
        : 'bg-gray-800/30 border-gray-700'
      }
    `}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
          milestone.completed ? 'bg-green-500' : 'bg-gray-600'
        }`}>
          {milestone.completed ? (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <div className="w-2 h-2 bg-gray-400 rounded-full" />
          )}
        </div>
        <span className={`text-sm font-medium ${
          milestone.completed ? 'text-white' : 'text-gray-400'
        }`}>
          {milestone.title}
        </span>
      </div>
      {milestone.completed && milestone.date && (
        <span className="text-xs text-gray-500">
          {new Date(milestone.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}
    </div>
  </motion.div>
))

MilestoneBadge.displayName = 'MilestoneBadge'

// Overall progress ring
const ProgressRing = memo(({ percentage }: { percentage: number }) => {
  const radius = 70
  const strokeWidth = 12
  const normalizedRadius = radius - strokeWidth * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  
  return (
    <div className="relative w-40 h-40">
      <svg
        height={radius * 2}
        width={radius * 2}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          stroke="#374151"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Progress circle */}
        <circle
          stroke="url(#progressGradient)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{percentage}%</span>
        <span className="text-sm text-gray-400">Overall</span>
      </div>
    </div>
  )
})

ProgressRing.displayName = 'ProgressRing'

// Main component
function RelationshipProgressCardOptimized({ 
  progress, 
  isLoading = false, 
  error = null 
}: RelationshipProgressCardProps) {
  // Default progress data
  const defaultProgress: ProgressData = useMemo(() => ({
    overallScore: 0,
    categories: {
      communication: 0,
      trust: 0,
      intimacy: 0,
      conflictResolution: 0,
      sharedGoals: 0
    },
    milestones: [],
    streak: 0,
    totalSessions: 0
  }), [])
  
  const data = progress || defaultProgress
  
  if (isLoading) {
    return (
      <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <HeartIcon className="w-5 h-5 mr-2" />
            Relationship Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="flex justify-center">
              <div className="w-40 h-40 bg-gray-800 rounded-full"></div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-800 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Relationship Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-400">Failed to load progress data</p>
            <p className="text-sm text-gray-500 mt-2">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center">
            <HeartIcon className="w-5 h-5 mr-2" />
            Relationship Progress
          </div>
          <div className="flex items-center space-x-2">
            {data.streak > 0 && (
              <Badge variant="secondary" className="bg-orange-900/50 text-orange-300 border-orange-700">
                <SparklesIcon className="w-3 h-3 mr-1" />
                {data.streak} day streak
              </Badge>
            )}
            <Badge variant="secondary" className="bg-purple-900/50 text-purple-300 border-purple-700">
              {data.totalSessions} sessions
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall progress ring */}
        <div className="flex justify-center py-4">
          <ProgressRing percentage={Math.round(data.overallScore)} />
        </div>
        
        {/* Category progress */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-400 flex items-center">
            <TargetIcon className="w-4 h-4 mr-1" />
            Key Areas
          </h4>
          <div className="space-y-3">
            <ProgressCategory
              name="Communication"
              value={data.categories.communication}
              icon={<span className="text-lg">💬</span>}
              color="bg-blue-500"
            />
            <ProgressCategory
              name="Trust"
              value={data.categories.trust}
              icon={<span className="text-lg">🤝</span>}
              color="bg-purple-500"
            />
            <ProgressCategory
              name="Intimacy"
              value={data.categories.intimacy}
              icon={<span className="text-lg">💕</span>}
              color="bg-pink-500"
            />
            <ProgressCategory
              name="Conflict Resolution"
              value={data.categories.conflictResolution}
              icon={<span className="text-lg">🕊️</span>}
              color="bg-green-500"
            />
            <ProgressCategory
              name="Shared Goals"
              value={data.categories.sharedGoals}
              icon={<span className="text-lg">🎯</span>}
              color="bg-yellow-500"
            />
          </div>
        </div>
        
        {/* Milestones */}
        {data.milestones.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-400 flex items-center">
              <TrophyIcon className="w-4 h-4 mr-1" />
              Milestones
            </h4>
            <div className="space-y-2">
              {data.milestones.slice(0, 3).map((milestone) => (
                <MilestoneBadge key={milestone.id} milestone={milestone} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default memo(RelationshipProgressCardOptimized)