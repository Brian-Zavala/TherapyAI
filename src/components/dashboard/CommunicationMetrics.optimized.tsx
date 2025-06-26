'use client'

import React, { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon } from '@/components/ui/icons'

interface MetricData {
  date: string
  confidence: number
  clarity: number
  empathy: number
  engagement: number
}

interface CommunicationMetricsProps {
  metrics?: MetricData[]
  isLoading?: boolean
  error?: Error | null
  expanded?: boolean
}

// Memoized chart component
const MetricsChart = memo(({ data }: { data: MetricData[] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
        </linearGradient>
        <linearGradient id="colorClarity" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
        </linearGradient>
        <linearGradient id="colorEmpathy" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
        </linearGradient>
      </defs>
      <XAxis 
        dataKey="date" 
        stroke="#6b7280"
        style={{ fontSize: '12px' }}
        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      />
      <YAxis 
        stroke="#6b7280"
        style={{ fontSize: '12px' }}
        domain={[0, 100]}
        ticks={[0, 25, 50, 75, 100]}
      />
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: '#1f2937', 
          border: '1px solid #374151',
          borderRadius: '8px'
        }}
        labelStyle={{ color: '#9ca3af' }}
        itemStyle={{ color: '#e5e7eb' }}
      />
      <Legend 
        wrapperStyle={{ fontSize: '14px' }}
        iconType="line"
      />
      <Area
        type="monotone"
        dataKey="confidence"
        stroke="#8b5cf6"
        fillOpacity={1}
        fill="url(#colorConfidence)"
        strokeWidth={2}
        name="Confidence"
      />
      <Area
        type="monotone"
        dataKey="clarity"
        stroke="#3b82f6"
        fillOpacity={1}
        fill="url(#colorClarity)"
        strokeWidth={2}
        name="Clarity"
      />
      <Area
        type="monotone"
        dataKey="empathy"
        stroke="#10b981"
        fillOpacity={1}
        fill="url(#colorEmpathy)"
        strokeWidth={2}
        name="Empathy"
      />
    </AreaChart>
  </ResponsiveContainer>
))

MetricsChart.displayName = 'MetricsChart'

// Metric card component
const MetricCard = memo(({ 
  title, 
  value, 
  change, 
  color 
}: { 
  title: string
  value: number
  change: number
  color: string 
}) => {
  const isPositive = change >= 0
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700"
    >
      <h4 className="text-sm font-medium text-gray-400 mb-2">{title}</h4>
      <div className="flex items-end justify-between">
        <div className="flex-1">
          <p className="text-2xl font-bold text-white">{value}%</p>
          <Progress 
            value={value} 
            className="mt-2 h-2"
            indicatorClassName={color}
          />
        </div>
        <div className={`flex items-center ml-4 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {isPositive ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
          <span className="text-sm font-medium ml-1">{Math.abs(change)}%</span>
        </div>
      </div>
    </motion.div>
  )
})

MetricCard.displayName = 'MetricCard'

// Main component
function CommunicationMetricsOptimized({ 
  metrics = [], 
  isLoading = false, 
  error = null 
}: CommunicationMetricsProps) {
  // Calculate current and previous metrics
  const { currentMetrics, previousMetrics, chartData } = useMemo(() => {
    if (!metrics.length) {
      return {
        currentMetrics: { confidence: 0, clarity: 0, empathy: 0, engagement: 0 },
        previousMetrics: { confidence: 0, clarity: 0, empathy: 0, engagement: 0 },
        chartData: []
      }
    }
    
    const current = metrics[metrics.length - 1]
    const previous = metrics[metrics.length - 2] || current
    
    // Format data for chart
    const chartData = metrics.slice(-7).map(m => ({
      ...m,
      date: new Date(m.date).toISOString()
    }))
    
    return {
      currentMetrics: current,
      previousMetrics: previous,
      chartData
    }
  }, [metrics])
  
  // Calculate changes
  const changes = useMemo(() => ({
    confidence: currentMetrics.confidence - previousMetrics.confidence,
    clarity: currentMetrics.clarity - previousMetrics.clarity,
    empathy: currentMetrics.empathy - previousMetrics.empathy,
    engagement: currentMetrics.engagement - previousMetrics.engagement
  }), [currentMetrics, previousMetrics])
  
  if (isLoading) {
    return (
      <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <TrendingUpIcon className="w-5 h-5 mr-2" />
            Communication Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-gray-800 rounded"></div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-gray-800 rounded"></div>
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
          <CardTitle className="text-white">Communication Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-400">Failed to load communication metrics</p>
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
          <TrendingUpIcon className="w-5 h-5 mr-2" />
          Communication Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart */}
        <div className="bg-gray-800/30 rounded-lg p-4">
          <MetricsChart data={chartData} />
        </div>
        
        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Confidence"
            value={Math.round(currentMetrics.confidence)}
            change={Math.round(changes.confidence)}
            color="bg-purple-500"
          />
          <MetricCard
            title="Clarity"
            value={Math.round(currentMetrics.clarity)}
            change={Math.round(changes.clarity)}
            color="bg-blue-500"
          />
          <MetricCard
            title="Empathy"
            value={Math.round(currentMetrics.empathy)}
            change={Math.round(changes.empathy)}
            color="bg-green-500"
          />
          <MetricCard
            title="Engagement"
            value={Math.round(currentMetrics.engagement)}
            change={Math.round(changes.engagement)}
            color="bg-yellow-500"
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default memo(CommunicationMetricsOptimized)