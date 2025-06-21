'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { useDashboardRealTimeEnhanced } from '@/hooks/useDashboardRealTimeEnhanced'
import { format } from 'date-fns'
import { ChevronDownIcon, ChevronUpIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'

interface ProgressDataPoint {
  date: string
  sessionId: string
  sessionNumber: number
  closeness: number
  communication: number
  overall: number
  listening: number
  expression: number
  clarity: number
  empathy: number
  respect: number
  duration: number
  conversationTurns: number
  familyMembers?: Array<{
    id: string
    name: string
    relationship: string
  }>
  insights: string[]
  trends: {
    closeness: number
    communication: number
    overall: number
  }
}

interface AggregateStats {
  totalSessions: number
  averageMetrics: {
    closeness: number
    communication: number
    overall: number
    listening: number
    expression: number
  }
  totalProgress: {
    closeness: number
    communication: number
    overall: number
  } | null
  lastSession: ProgressDataPoint | null
  firstSession: ProgressDataPoint | null
  totalDuration: number
  totalConversationTurns: number
}

interface RelationshipProgressEnhancedProps {
  initialTherapyType?: 'couple' | 'family' | 'individual'
  className?: string
}

export default function RelationshipProgressEnhanced({
  initialTherapyType = 'couple',
  className = ''
}: RelationshipProgressEnhancedProps) {
  // State
  const [therapyType, setTherapyType] = useState(initialTherapyType)
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('all')
  const [viewMode, setViewMode] = useState<'timeline' | 'radar' | 'metrics' | 'insights'>('timeline')
  const [progressData, setProgressData] = useState<ProgressDataPoint[]>([])
  const [aggregateStats, setAggregateStats] = useState<AggregateStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState<ProgressDataPoint | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  // Real-time integration
  const { metrics: realtimeMetrics, isConnected } = useDashboardRealTimeEnhanced()

  // Fetch progress data
  const fetchProgressData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/dashboard/relationship-progress/enhanced?` +
        `therapyType=${therapyType}&timeframe=${timeframe}&includeMetrics=true`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch progress data')
      }

      const data = await response.json()
      setProgressData(data.progress || [])
      setAggregateStats(data.aggregateStats || null)
    } catch (err) {
      console.error('Error fetching progress:', err)
      setError(err instanceof Error ? err.message : 'Failed to load progress data')
    } finally {
      setLoading(false)
    }
  }, [therapyType, timeframe])

  // Load data on mount and when filters change
  useEffect(() => {
    fetchProgressData()
  }, [fetchProgressData])

  // Format data for charts
  const chartData = useMemo(() => {
    return progressData.map(point => ({
      name: format(new Date(point.date), 'MMM d'),
      ...point,
      week: format(new Date(point.date), 'MMM d')
    }))
  }, [progressData])

  // Radar chart data for latest session
  const radarData = useMemo(() => {
    const latest = progressData[progressData.length - 1]
    if (!latest) return []

    return [
      { metric: 'Clarity', value: latest.clarity, fullMark: 100 },
      { metric: 'Empathy', value: latest.empathy, fullMark: 100 },
      { metric: 'Respect', value: latest.respect, fullMark: 100 },
      { metric: 'Listening', value: latest.listening, fullMark: 100 },
      { metric: 'Expression', value: latest.expression, fullMark: 100 },
      { metric: 'Overall', value: latest.overall, fullMark: 100 }
    ]
  }, [progressData])

  // Insights data for bar chart
  const insightsData = useMemo(() => {
    const insightCounts: Record<string, number> = {}
    
    progressData.forEach(point => {
      point.insights.forEach(insight => {
        const key = insight.split(' ').slice(0, 3).join(' ') // Simplify insight for grouping
        insightCounts[key] = (insightCounts[key] || 0) + 1
      })
    })

    return Object.entries(insightCounts)
      .map(([insight, count]) => ({ insight, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [progressData])

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload[0]) return null

    const data = payload[0].payload as ProgressDataPoint

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-4 rounded-lg shadow-xl border border-gray-200 max-w-xs"
      >
        <p className="font-semibold text-gray-800 mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          <p className="flex justify-between">
            <span className="text-gray-600">Overall:</span>
            <span className="font-medium">{data.overall}%</span>
          </p>
          <p className="flex justify-between">
            <span className="text-gray-600">Duration:</span>
            <span className="font-medium">{data.duration} min</span>
          </p>
          <p className="flex justify-between">
            <span className="text-gray-600">Turns:</span>
            <span className="font-medium">{data.conversationTurns}</span>
          </p>
        </div>
        {data.insights.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-600 font-medium mb-1">Insights:</p>
            <ul className="text-xs text-gray-700 space-y-0.5">
              {data.insights.slice(0, 2).map((insight, i) => (
                <li key={i} className="flex items-start">
                  <span className="text-green-500 mr-1">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}
        <button
          onClick={() => setSelectedSession(data)}
          className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          View Details →
        </button>
      </motion.div>
    )
  }

  // Render different view modes
  const renderViewContent = () => {
    switch (viewMode) {
      case 'timeline':
        return (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="week" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickMargin={10}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickMargin={10}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  wrapperStyle={{ paddingTop: '20px' }}
                />
                <ReferenceLine y={50} stroke="#9ca3af" strokeDasharray="3 3" />
                
                <Area
                  type="monotone"
                  dataKey="overall"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.1}
                  strokeWidth={2}
                  name="Overall Progress"
                />
                <Line
                  type="monotone"
                  dataKey="clarity"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Clarity"
                />
                <Line
                  type="monotone"
                  dataKey="empathy"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Empathy"
                />
                <Line
                  type="monotone"
                  dataKey="respect"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Respect"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )

      case 'radar':
        return (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis 
                  dataKey="metric" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]} 
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                />
                <Radar
                  name="Current Metrics"
                  dataKey="value"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.6}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )

      case 'metrics':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {aggregateStats && (
              <>
                <MetricCard
                  title="Total Sessions"
                  value={aggregateStats.totalSessions}
                  subtitle={`${Math.round(aggregateStats.totalDuration / 60)} hours total`}
                  trend={null}
                  color="blue"
                />
                <MetricCard
                  title="Avg Overall Score"
                  value={aggregateStats.averageMetrics.overall}
                  subtitle="Out of 100"
                  trend={aggregateStats.totalProgress?.overall || 0}
                  color="purple"
                />
                <MetricCard
                  title="Communication"
                  value={aggregateStats.averageMetrics.communication}
                  subtitle={`${aggregateStats.totalProgress?.communication || 0 > 0 ? '+' : ''}${aggregateStats.totalProgress?.communication || 0} pts`}
                  trend={aggregateStats.totalProgress?.communication || 0}
                  color="green"
                />
                <MetricCard
                  title="Closeness"
                  value={aggregateStats.averageMetrics.closeness}
                  subtitle={`${aggregateStats.totalProgress?.closeness || 0 > 0 ? '+' : ''}${aggregateStats.totalProgress?.closeness || 0} pts`}
                  trend={aggregateStats.totalProgress?.closeness || 0}
                  color="pink"
                />
                <MetricCard
                  title="Active Listening"
                  value={aggregateStats.averageMetrics.listening}
                  subtitle="Average score"
                  trend={null}
                  color="indigo"
                />
                <MetricCard
                  title="Expression"
                  value={aggregateStats.averageMetrics.expression}
                  subtitle="Average score"
                  trend={null}
                  color="yellow"
                />
              </>
            )}
          </div>
        )

      case 'insights':
        return (
          <div className="space-y-6">
            {insightsData.length > 0 && (
              <div className="h-64">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Common Insights</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={insightsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <YAxis 
                      dataKey="insight" 
                      type="category" 
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      width={150}
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {progressData.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Session Insights</h3>
                <div className="space-y-3">
                  {progressData.slice(-3).reverse().map((session, i) => (
                    <motion.div
                      key={session.sessionId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-gray-50 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-medium text-gray-800">
                          Session #{session.sessionNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(session.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <ul className="space-y-1">
                        {session.insights.map((insight, j) => (
                          <li key={j} className="flex items-start text-sm text-gray-700">
                            <SparklesIcon className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-96 bg-gray-100 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || progressData.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <EmptyState 
          therapyType={therapyType}
          onStartSession={() => window.location.href = '/dashboard/therapy'}
        />
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {therapyType === 'family' ? 'Family' : therapyType === 'individual' ? 'Personal' : 'Relationship'} Progress
          </h2>
          {isConnected && (
            <span className="flex items-center text-xs text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
              Real-time
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          {/* Therapy Type Selector */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(['couple', 'family', 'individual'] as const).map(type => (
              <button
                key={type}
                onClick={() => setTherapyType(type)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  therapyType === type
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Timeframe Selector */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(['week', 'month', 'all'] as const).map(time => (
              <button
                key={time}
                onClick={() => setTimeframe(time)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  timeframe === time
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {time === 'all' ? 'All Time' : time.charAt(0).toUpperCase() + time.slice(1)}
              </button>
            ))}
          </div>

          {/* View Mode Selector */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(['timeline', 'radar', 'metrics', 'insights'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {renderViewContent()}
      </div>

      {/* Session Details Modal */}
      <AnimatePresence>
        {selectedSession && (
          <SessionDetailsModal
            session={selectedSession}
            onClose={() => setSelectedSession(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Helper Components
interface MetricCardProps {
  title: string
  value: number
  subtitle: string
  trend: number | null
  color: 'blue' | 'green' | 'purple' | 'pink' | 'yellow' | 'indigo'
}

function MetricCard({ title, value, subtitle, trend, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    pink: 'bg-pink-50 text-pink-700 border-pink-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`p-4 rounded-lg border ${colorClasses[color]} transition-all`}
    >
      <p className="text-sm font-medium opacity-80">{title}</p>
      <div className="flex items-baseline mt-1">
        <p className="text-2xl font-bold">{value}</p>
        {trend !== null && trend !== 0 && (
          <span className={`ml-2 text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? <ChevronUpIcon className="w-4 h-4 inline" /> : <ChevronDownIcon className="w-4 h-4 inline" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-xs mt-1 opacity-70">{subtitle}</p>
    </motion.div>
  )
}

function EmptyState({ therapyType, onStartSession }: { therapyType: string; onStartSession: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No {therapyType} Progress Data Yet
      </h3>
      <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
        Start your first {therapyType} therapy session to begin tracking your progress and insights.
      </p>
      <button
        onClick={onStartSession}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Start First Session
      </button>
    </div>
  )
}

function SessionDetailsModal({ session, onClose }: { session: ProgressDataPoint; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Session #{session.sessionNumber} Details
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {format(new Date(session.date), 'MMMM d, yyyy')} • {session.duration} minutes
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Metrics Grid */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Communication Metrics</h4>
            <div className="grid grid-cols-3 gap-3">
              <MetricBadge label="Clarity" value={session.clarity} />
              <MetricBadge label="Empathy" value={session.empathy} />
              <MetricBadge label="Respect" value={session.respect} />
              <MetricBadge label="Listening" value={session.listening} />
              <MetricBadge label="Expression" value={session.expression} />
              <MetricBadge label="Overall" value={session.overall} />
            </div>
          </div>

          {/* Family Members */}
          {session.familyMembers && session.familyMembers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Participants</h4>
              <div className="flex flex-wrap gap-2">
                {session.familyMembers.map(member => (
                  <span
                    key={member.id}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                  >
                    {member.name} ({member.relationship})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Insights */}
          {session.insights.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Session Insights</h4>
              <ul className="space-y-2">
                {session.insights.map((insight, i) => (
                  <li key={i} className="flex items-start text-sm text-gray-700">
                    <SparklesIcon className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => {
                window.location.href = `/dashboard/sessions?session=${session.sessionId}`
              }}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View Transcript
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function MetricBadge({ label, value }: { label: string; value: number }) {
  const getColor = (val: number) => {
    if (val >= 80) return 'bg-green-100 text-green-800 border-green-200'
    if (val >= 60) return 'bg-blue-100 text-blue-800 border-blue-200'
    if (val >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  return (
    <div className={`p-3 rounded-lg border ${getColor(value)} text-center`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}%</p>
    </div>
  )
}