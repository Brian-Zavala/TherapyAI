'use client'

import React, { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClockIcon, CalendarIcon } from '@/components/ui/icons'

interface SessionData {
  date: string
  duration: number
  sessionType: string
  completed: boolean
}

interface SessionTimeChartProps {
  sessions?: SessionData[]
  isLoading?: boolean
  error?: Error | null
}

// Custom tooltip component
const CustomTooltip = memo(({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 shadow-lg">
        <p className="text-gray-400 text-sm">
          {new Date(label).toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          })}
        </p>
        <p className="text-white font-medium">
          {payload[0].value} minutes
        </p>
        <p className="text-gray-400 text-xs mt-1">
          {payload[0].payload.sessionType} session
        </p>
      </div>
    )
  }
  return null
})

CustomTooltip.displayName = 'CustomTooltip'

// Summary stats component
const SessionStats = memo(({ sessions }: { sessions: SessionData[] }) => {
  const stats = useMemo(() => {
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0)
    const completedSessions = sessions.filter(s => s.completed).length
    const avgDuration = sessions.length > 0 ? totalMinutes / sessions.length : 0
    
    return {
      totalHours: Math.floor(totalMinutes / 60),
      totalMinutes: totalMinutes % 60,
      completedSessions,
      totalSessions: sessions.length,
      avgDuration: Math.round(avgDuration),
      completionRate: sessions.length > 0 
        ? Math.round((completedSessions / sessions.length) * 100) 
        : 0
    }
  }, [sessions])
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Total Time</p>
            <p className="text-2xl font-bold text-white">
              {stats.totalHours}h {stats.totalMinutes}m
            </p>
          </div>
          <ClockIcon className="w-8 h-8 text-purple-500" />
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Sessions</p>
            <p className="text-2xl font-bold text-white">
              {stats.completedSessions}/{stats.totalSessions}
            </p>
          </div>
          <CalendarIcon className="w-8 h-8 text-blue-500" />
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Avg Duration</p>
            <p className="text-2xl font-bold text-white">{stats.avgDuration}m</p>
          </div>
          <div className="text-green-500 text-2xl">⏱️</div>
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Completion</p>
            <p className="text-2xl font-bold text-white">{stats.completionRate}%</p>
          </div>
          <div className="text-yellow-500 text-2xl">✅</div>
        </div>
      </motion.div>
    </div>
  )
})

SessionStats.displayName = 'SessionStats'

// Main chart component
function SessionTimeChartOptimized({ 
  sessions = [], 
  isLoading = false, 
  error = null 
}: SessionTimeChartProps) {
  // Prepare chart data
  const chartData = useMemo(() => {
    // Group sessions by date and aggregate
    const grouped = sessions.reduce((acc, session) => {
      const date = new Date(session.date).toLocaleDateString()
      if (!acc[date]) {
        acc[date] = {
          date: session.date,
          totalDuration: 0,
          completedDuration: 0,
          sessions: 0
        }
      }
      acc[date].totalDuration += session.duration
      if (session.completed) {
        acc[date].completedDuration += session.duration
      }
      acc[date].sessions += 1
      return acc
    }, {} as Record<string, any>)
    
    return Object.values(grouped)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14) // Last 14 days
  }, [sessions])
  
  if (isLoading) {
    return (
      <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <ClockIcon className="w-5 h-5 mr-2" />
            Session Time Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-gray-800 rounded"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-800 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Session Time Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-400">Failed to load session data</p>
            <p className="text-sm text-gray-500 mt-2">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <ClockIcon className="w-5 h-5 mr-2" />
          Session Time Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats summary */}
        <SessionStats sessions={sessions} />
        
        {/* Chart */}
        <div className="bg-gray-800/30 rounded-lg p-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                label={{ 
                  value: 'Minutes', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: '#6b7280' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '14px' }}
                iconType="rect"
              />
              <Bar 
                dataKey="completedDuration" 
                stackId="a"
                fill="#10b981" 
                name="Completed"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="totalDuration" 
                stackId="b"
                fill="#6b7280" 
                name="Total"
                radius={[4, 4, 0, 0]}
                opacity={0.5}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Empty state */}
        {sessions.length === 0 && (
          <div className="text-center py-8 bg-gray-800/30 rounded-lg mt-4">
            <CalendarIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No sessions tracked yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Start your first therapy session to see analytics
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default memo(SessionTimeChartOptimized)