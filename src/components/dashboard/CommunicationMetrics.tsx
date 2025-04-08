// src/components/dashboard/CommunicationMetrics.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, RadialBarChart, RadialBar } from "recharts"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import RelationshipAssessment from "@/components/RelationshipAssessment"

export default function CommunicationMetrics() {
  const router = useRouter()
  const [metricsData, setMetricsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chartType, setChartType] = useState('radar') // 'radar', 'pie', or 'radial'
  const [activeIndex, setActiveIndex] = useState(0)
  const [therapyType, setTherapyType] = useState('couple') // 'couple', 'solo', or 'family'
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false) // State for assessment modal
  
  const fetchMetricsData = async (type = 'couple') => {
    setLoading(true)
    try {
      const response = await fetch(`/api/dashboard/communication-metrics?type=${type}`)
      
      if (!response.ok) {
        // Handle different error cases based on status code
        if (response.status === 401) {
          throw new Error('Please sign in to view your metrics')
        } else if (response.status === 404) {
          throw new Error('User profile not found')
        } else {
          // Treat any other error as "No data yet" but don't throw an error
          setError('No data available yet')
          setLoading(false)
          return
        }
      }
      
      const data = await response.json()
      
      // Transform data for different chart types
      const transformed = data.map((item) => ({
        ...item,
        name: item.name.replace('Score', ''), // Shorten names
        fullMark: 100, // For radar chart
        fill: getColorForMetric(item.name), // For radial bar chart
      }))
      
      setMetricsData(transformed)
    } catch (err) {
      console.error(`Error fetching ${type} communication metrics:`, err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchMetricsData(therapyType)
    
    // Set up rotation of chart types
    const interval = setInterval(() => {
      setChartType((current) => {
        if (current === 'radar') return 'pie'
        if (current === 'pie') return 'radial'
        return 'radar'
      })
    }, 6000) // Rotate every 8 seconds
    
    return () => clearInterval(interval)
  }, [therapyType])
  
  // Colors for different metrics
  const getColorForMetric = (name) => {
    const colors = {
      activeListeningScore: "#6366F1", // Indigo
      expressingNeedsScore: "#EC4899", // Pink
      conflictResolutionScore: "#10B981", // Emerald
      emotionalSupportScore: "#F59E0B", // Amber
    }
    
    return colors[name] || "#6366F1"
  }
  
  const COLORS = ["#6366F1", "#EC4899", "#10B981", "#F59E0B"]
  
  const onPieEnter = useCallback((_, index) => {
    setActiveIndex(index)
  }, [])
  
  // Custom radial label
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="#4B5563" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${name}: ${value}%`}
      </text>
    )
  }
  
  // Custom tooltip for all chart types
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-100">
          <p className="font-medium text-gray-800">{data.name}</p>
          <p className="text-sm mt-1 text-blue-600 font-medium">
            Score: {data.value}/100
          </p>
          <p className="text-xs mt-2 text-gray-500">
            {getDescriptionForMetric(data.name)}
          </p>
        </div>
      )
    }
    return null
  }
  
  // Descriptions for each metric
  const getDescriptionForMetric = (name) => {
    const descriptions = {
      'Active Listening': 'How well you listen and understand your partner',
      'Expressing Needs': 'How effectively you communicate your own needs',
      'Conflict Resolution': 'How well you resolve disagreements together',
      'Emotional Support': 'How much emotional support you provide each other',
    }
    
    return descriptions[name] || ''
  }
  
  if (loading) return (
    <div className="h-80 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-blue-600 font-medium">Analyzing your communication patterns...</p>
      </div>
    </div>
  )
  
  if (error) return (
    <div className="h-80 flex items-center justify-center text-blue-600">
      <div className="text-center p-6 bg-blue-50 rounded-lg">
        <svg className="w-12 h-12 mx-auto text-blue-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-lg font-medium">No communication data available yet</p>
        <p className="text-sm mt-2 text-blue-500">Complete your first therapy session to see analytics and insights</p>
      </div>
    </div>
  )
  
  // Function to toggle assessment modal
  const toggleAssessment = () => {
    setIsAssessmentOpen(!isAssessmentOpen)
  }
  
  if (metricsData.length === 0) {
    return (
      <>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-80 flex items-center justify-center text-blue-600"
        >
          <div className="text-center p-6 bg-blue-50 rounded-lg max-w-sm">
            <svg className="w-12 h-12 mx-auto text-blue-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-lg font-medium">No data available yet</p>
            <p className="text-sm mt-2 text-blue-500">
              Complete an assessment or therapy session to see analytics and insights
            </p>
            <div className="flex flex-col sm:flex-row sm:space-x-3 justify-center mt-4">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mb-2 sm:mb-0 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                onClick={toggleAssessment}
              >
                Take Assessment
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium"
                onClick={() => router.push('/schedule')}
              >
                Schedule Session
              </motion.button>
            </div>
          </div>
        </motion.div>
        
        {/* Assessment Modal */}
        {isAssessmentOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Relationship Assessment</h3>
                <button onClick={toggleAssessment} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <div className="mb-6 text-sm text-gray-600">
                  Your assessment results will be used to personalize your therapy experience and 
                  track your progress over time.
                </div>
                <div className="overflow-y-auto max-h-[60vh]">
                  <RelationshipAssessment />
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }
  
  // Find the highest and lowest scoring metrics
  const highestMetric = [...metricsData].sort((a, b) => b.value - a.value)[0]
  const lowestMetric = [...metricsData].sort((a, b) => a.value - b.value)[0]
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-[340px] sm:h-80 lg:h-96 overflow-hidden"
    >
      {/* Therapy type selector at the very top */}
      <div className="flex justify-center mb-2 sm:mb-4">
        <div className="inline-flex p-1 bg-blue-50 rounded-lg w-full max-w-[250px] overflow-x-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setTherapyType('couple')}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium rounded-md transition-colors flex-1 min-w-[60px] ${
              therapyType === 'couple' 
                ? 'bg-blue-600 text-white' 
                : 'text-blue-800 hover:bg-blue-100'
            }`}
          >
            Couple
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setTherapyType('solo')}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium rounded-md transition-colors flex-1 min-w-[60px] ${
              therapyType === 'solo' 
                ? 'bg-blue-600 text-white' 
                : 'text-blue-800 hover:bg-blue-100'
            }`}
          >
            Individual
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setTherapyType('family')}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium rounded-md transition-colors flex-1 min-w-[60px] ${
              therapyType === 'family' 
                ? 'bg-blue-600 text-white' 
                : 'text-blue-800 hover:bg-blue-100'
            }`}
          >
            Family
          </motion.button>
        </div>
      </div>

      {/* Metrics summary and chart types */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setChartType('radar')}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              chartType === 'radar' 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            Radar
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setChartType('pie')}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              chartType === 'pie' 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            Pie
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setChartType('radial')}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              chartType === 'radial' 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            Bars
          </motion.button>
        </div>
        
        <div className="flex flex-wrap gap-2 sm:gap-4">
          <motion.div 
            whileHover={{ y: -2 }}
            className="px-3 py-2 bg-green-50 rounded-lg"
          >
            <p className="text-xs text-green-600 font-medium">Strongest</p>
            <p className="text-sm font-bold text-green-800">{highestMetric?.name}</p>
          </motion.div>
          <motion.div 
            whileHover={{ y: -2 }}
            className="px-3 py-2 bg-amber-50 rounded-lg"
          >
            <p className="text-xs text-amber-600 font-medium">Focus Area</p>
            <p className="text-sm font-bold text-amber-800">{lowestMetric?.name}</p>
          </motion.div>
        </div>
      </div>
      
      <div className="h-[70%] min-h-[200px] w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div 
            key={chartType}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
            {chartType === 'radar' && (
              <RadarChart outerRadius="80%" data={metricsData}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis 
                  dataKey="name" 
                  tick={{ fill: '#4B5563', fontSize: 12 }}
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={{ fill: '#4B5563' }}
                />
                <Radar
                  name="Communication"
                  dataKey="value"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.6}
                  animationDuration={1500}
                  animationEasing="ease-out"
                  isAnimationActive={true}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            )}
            
            {chartType === 'pie' && (
              <PieChart>
                <defs>
                  {COLORS.map((color, index) => (
                    <linearGradient key={`gradient-${index}`} id={`colorGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie
                  activeIndex={activeIndex}
                  activeShape={renderCustomizedLabel}
                  data={metricsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  fill="#8884d8"
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                  animationDuration={1500}
                  animationEasing="ease-out"
                  isAnimationActive={true}
                >
                  {metricsData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`url(#colorGradient-${index})`} 
                      stroke={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  iconType="circle"
                  wrapperStyle={{ 
                    paddingTop: '10px',
                    fontSize: '12px',
                    fontWeight: 500
                  }}
                />
              </PieChart>
            )}
            
            {chartType === 'radial' && (
              <RadialBarChart 
                innerRadius="20%" 
                outerRadius="90%" 
                data={metricsData} 
                startAngle={180} 
                endAngle={0}
                cx="50%"
                cy="80%"
              >
                <RadialBar
                  label={{
                    fill: '#666',
                    position: 'insideStart',
                    fontSize: 12
                  }}
                  background={{ fill: '#eee' }}
                  dataKey="value"
                  animationDuration={1500}
                  animationEasing="ease-out"
                  isAnimationActive={true}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  iconSize={10} 
                  layout="horizontal" 
                  verticalAlign="top" 
                  align="center"
                  wrapperStyle={{ 
                    paddingBottom: '10px',
                    fontSize: '12px',
                    fontWeight: 500
                  }}
                />
              </RadialBarChart>
            )}
          </ResponsiveContainer>
        </motion.div>
      </AnimatePresence>
      </div>
      
      {/* Chart type indicator */}
      <div className="flex justify-center mt-3">
        <div className="flex space-x-2 items-center">
          {['radar', 'pie', 'radial'].map((type) => (
            <motion.div 
              key={type}
              animate={{
                scale: chartType === type ? 1.2 : 1,
                opacity: chartType === type ? 1 : 0.5
              }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className={`w-2 h-2 rounded-full ${chartType === type ? 'bg-blue-600' : 'bg-gray-300'}`}
              onClick={() => setChartType(type)}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}