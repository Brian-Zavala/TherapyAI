'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface MetricData {
  date: string
  clarityScore: number
  empathyScore: number
  respectScore: number
  overallScore: number
  sessionCount?: number
}

interface SessionStats {
  totalSessions: number
  totalDuration: number
  avgDuration: number
  lastSessionDate: string | null
  sessionsLastWeek: number
  activeStreak: number
}

interface FamilyMember {
  id: string
  name: string
  age?: number
  relation?: string
}

interface CommunicationMetricEnhancedProps {
  userId: string
  dateRange?: 'week' | 'month' | 'year'
  showFamilyMembers?: boolean
}

export default function CommunicationMetricEnhanced({
  userId,
  dateRange = 'week',
  showFamilyMembers = true,
}: CommunicationMetricEnhancedProps) {
  const [metrics, setMetrics] = useState<MetricData[]>([])
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'clarity' | 'empathy' | 'respect'>('all')
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  // Fetch metrics data with optimized query
  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Calculate date range
      const endDate = new Date()
      let startDate: Date
      
      switch (dateRange) {
        case 'week':
          startDate = subDays(endDate, 7)
          break
        case 'month':
          startDate = subDays(endDate, 30)
          break
        case 'year':
          startDate = subDays(endDate, 365)
          break
      }

      // Fetch data in parallel for better performance
      const [metricsResponse, statsResponse, familyResponse] = await Promise.all([
        // Fetch aggregated metrics
        fetch(`/api/dashboard/metrics?userId=${userId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&aggregate=daily`),
        // Fetch session statistics
        fetch(`/api/dashboard/session-stats?userId=${userId}`),
        // Fetch family members if needed
        showFamilyMembers ? fetch(`/api/users/${userId}/family-members`) : Promise.resolve(null),
      ])

      if (!metricsResponse.ok) throw new Error('Failed to fetch metrics')
      if (!statsResponse.ok) throw new Error('Failed to fetch session stats')

      const metricsData = await metricsResponse.json()
      const statsData = await statsResponse.json()
      
      setMetrics(metricsData.metrics)
      setSessionStats(statsData)

      if (familyResponse && familyResponse.ok) {
        const familyData = await familyResponse.json()
        setFamilyMembers(familyData.familyMembers || [])
      }
    } catch (err) {
      console.error('Error fetching metrics:', err)
      setError('Failed to load communication metrics')
    } finally {
      setLoading(false)
    }
  }, [userId, dateRange, showFamilyMembers])

  useEffect(() => {
    fetchMetrics()
    
    // Set up real-time updates using Supabase
    const setupRealtimeUpdates = async () => {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const channel = supabase
        .channel(`metrics:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'CommunicationMetric',
            filter: `userId=eq.${userId}`,
          },
          (payload) => {
            console.log('New metric received:', payload)
            fetchMetrics() // Refresh data
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    const cleanup = setupRealtimeUpdates()
    
    return () => {
      cleanup.then(fn => fn?.())
    }
  }, [fetchMetrics, userId])

  // Calculate improvement trends
  const calculateTrends = () => {
    if (metrics.length < 2) return null

    const latest = metrics[metrics.length - 1]
    const previous = metrics[metrics.length - 2]

    return {
      clarity: ((latest.clarityScore - previous.clarityScore) / previous.clarityScore) * 100,
      empathy: ((latest.empathyScore - previous.empathyScore) / previous.empathyScore) * 100,
      respect: ((latest.respectScore - previous.respectScore) / previous.respectScore) * 100,
      overall: ((latest.overallScore - previous.overallScore) / previous.overallScore) * 100,
    }
  }

  // Prepare chart data
  const prepareChartData = () => {
    const labels = metrics.map(m => format(new Date(m.date), 'MMM dd'))
    
    const datasets = []
    
    if (selectedMetric === 'all' || selectedMetric === 'clarity') {
      datasets.push({
        label: 'Clarity',
        data: metrics.map(m => m.clarityScore),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      })
    }
    
    if (selectedMetric === 'all' || selectedMetric === 'empathy') {
      datasets.push({
        label: 'Empathy',
        data: metrics.map(m => m.empathyScore),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      })
    }
    
    if (selectedMetric === 'all' || selectedMetric === 'respect') {
      datasets.push({
        label: 'Respect',
        data: metrics.map(m => m.respectScore),
        borderColor: 'rgb(251, 146, 60)',
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        tension: 0.4,
      })
    }

    return { labels, datasets }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
      },
    },
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-white/20 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/20 backdrop-blur-md rounded-xl p-6 border border-red-400/30">
        <p className="text-red-300">{error}</p>
        <button
          onClick={fetchMetrics}
          className="mt-4 px-4 py-2 bg-red-500/30 hover:bg-red-500/40 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  const trends = calculateTrends()
  const chartData = prepareChartData()

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Communication Metrics</h2>
        <p className="text-white/80 text-sm">
          Track your progress across key communication dimensions
        </p>
      </div>

      {/* Session Stats Bar */}
      {sessionStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="text-3xl font-bold text-white">{sessionStats.totalSessions}</p>
            <p className="text-sm text-white/70">Total Sessions</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <p className="text-3xl font-bold text-white">{sessionStats.avgDuration}</p>
            <p className="text-sm text-white/70">Avg Duration (min)</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <p className="text-3xl font-bold text-white">{sessionStats.sessionsLastWeek}</p>
            <p className="text-sm text-white/70">This Week</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <p className="text-3xl font-bold text-white">{sessionStats.activeStreak}</p>
            <p className="text-sm text-white/70">Day Streak</p>
          </motion.div>
        </div>
      )}

      {/* Controls */}
      <div className="p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'clarity', 'empathy', 'respect'] as const).map((metric) => (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === metric
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {metric.charAt(0).toUpperCase() + metric.slice(1)}
            </button>
          ))}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('chart')}
            className={`px-4 py-2 rounded-lg transition-all ${
              viewMode === 'chart'
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            Chart
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded-lg transition-all ${
              viewMode === 'table'
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {viewMode === 'chart' ? (
            <motion.div
              key="chart"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-64"
            >
              <Line data={chartData} options={chartOptions} />
            </motion.div>
          ) : (
            <motion.div
              key="table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="overflow-x-auto"
            >
              <table className="w-full text-white/80">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-2">Date</th>
                    <th className="text-center py-2">Clarity</th>
                    <th className="text-center py-2">Empathy</th>
                    <th className="text-center py-2">Respect</th>
                    <th className="text-center py-2">Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric, index) => (
                    <tr key={index} className="border-b border-white/10">
                      <td className="py-2">{format(new Date(metric.date), 'MMM dd')}</td>
                      <td className="text-center py-2">{metric.clarityScore.toFixed(1)}</td>
                      <td className="text-center py-2">{metric.empathyScore.toFixed(1)}</td>
                      <td className="text-center py-2">{metric.respectScore.toFixed(1)}</td>
                      <td className="text-center py-2 font-semibold">{metric.overallScore.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Trends */}
      {trends && (
        <div className="p-4 bg-white/5 border-t border-white/20">
          <p className="text-sm text-white/70 mb-2">Recent Trends</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(trends).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-white/60 capitalize">{key}:</span>
                <span className={`text-sm font-semibold ${value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {value >= 0 ? '+' : ''}{value.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Family Members */}
      {showFamilyMembers && familyMembers.length > 0 && (
        <div className="p-4 bg-white/5 border-t border-white/20">
          <p className="text-sm text-white/70 mb-2">Family Members in Sessions</p>
          <div className="flex flex-wrap gap-2">
            {familyMembers.map((member) => (
              <div
                key={member.id}
                className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/80"
              >
                {member.name} {member.relation && `(${member.relation})`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}