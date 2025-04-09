// src/components/dashboard/SessionTimeChart.tsx
"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Area, ComposedChart } from "recharts"
import { motion } from "framer-motion"

export default function SessionTimeChart() {
  const [sessionData, setSessionData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeBar, setActiveBar] = useState(null)
  const [view, setView] = useState('monthly') // 'monthly' or 'average'
  const [totalHours, setTotalHours] = useState(0)
  const [averageSessionLength, setAverageSessionLength] = useState(0)
  const [therapyType, setTherapyType] = useState('couple') // 'couple', 'solo', or 'family'
  
  const fetchSessionData = async (type = 'couple') => {
    try {
      setLoading(true)
      const response = await fetch(`/api/dashboard/session-time?type=${type}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch session time data')
      }
      
      const data = await response.json()
      
      // Calculate summary statistics
      let totalMinutes = 0
      let totalSessions = 0
      
      data.forEach(item => {
        totalMinutes += item.sessionTime
        totalSessions += item.sessionCount
      })
      
      setTotalHours(Math.round(totalMinutes / 60 * 10) / 10) // Round to 1 decimal place
      setAverageSessionLength(totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0)
      
      // Add visual interest by adding a progress field and improving clarity
      const enhancedData = data.map((item, index, arr) => {
        // Calculate a growth percentage based on previous months
        const prevValue = index > 0 ? arr[index-1].sessionTime : 0
        const growthRate = prevValue === 0 ? 100 : Math.round((item.sessionTime / prevValue) * 100 - 100)
        
        // Calculate average session length for this month
        const avgSessionLen = item.sessionCount > 0 
          ? Math.round(item.sessionTime / item.sessionCount) 
          : 0
          
        return {
          ...item,
          // Format month for better readability
          monthFormatted: item.month.substring(0, 3), // First 3 letters of month
          // Indicates % change from previous month
          growth: growthRate,
          // Average length of each session this month
          avgSessionLength: avgSessionLen,
          // Visual representation - cap at reasonable values
          progressVisual: Math.min(Math.max(growthRate + 100, 50), 150)
        }
      })
      
      setSessionData(enhancedData)
    } catch (err) {
      console.error(`Error fetching ${type} session time data:`, err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchSessionData(therapyType)
  }, [therapyType])
  
  if (loading) return (
    <div className="h-80 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-indigo-600 font-medium">Loading your therapy journey...</p>
      </div>
    </div>
  )
  
  if (error) return (
    <div className="h-80 flex items-center justify-center text-indigo-600">
      <div className="text-center p-6 bg-indigo-50 rounded-lg">
        <svg className="w-12 h-12 mx-auto text-indigo-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-lg font-medium">Couldn't load your session data</p>
        <p className="text-sm mt-2 text-indigo-500">{error}</p>
      </div>
    </div>
  )
  
  // Create a reusable component for the therapy type selector
  const TherapyTypeSelector = () => (
    <div className="flex justify-center mb-2 sm:mb-4">
      <div className="inline-flex p-1 bg-indigo-50 rounded-lg w-full max-w-[250px] overflow-x-auto">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setTherapyType('couple')}
          className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium rounded-md transition-colors flex-1 min-w-[60px] ${
            therapyType === 'couple' 
              ? 'bg-indigo-600 text-white' 
              : 'text-indigo-800 hover:bg-indigo-100'
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
              ? 'bg-indigo-600 text-white' 
              : 'text-indigo-800 hover:bg-indigo-100'
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
              ? 'bg-indigo-600 text-white' 
              : 'text-indigo-800 hover:bg-indigo-100'
          }`}
        >
          Family
        </motion.button>
      </div>
    </div>
  );
  
  if (sessionData.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-[340px] sm:h-80 lg:h-96 mb-6 sm:mb-0 overflow-hidden"
      >
        {/* Keep the therapy type selector visible even when there's no data */}
        <TherapyTypeSelector />

        <div className="h-[calc(100%-45px)] flex items-center justify-center text-indigo-600">
          <div className="text-center p-6 bg-indigo-50 rounded-lg max-w-sm">
            <svg className="w-12 h-12 mx-auto text-indigo-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <p className="text-lg font-medium">No {therapyType} sessions yet</p>
            <p className="text-sm mt-2 text-indigo-500">
              Begin your {therapyType} therapy journey to see insights about your sessions over time
            </p>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium"
              onClick={() => window.location.href = '/dashboard/therapy'}
            >
              Start First Session
            </motion.button>
          </div>
        </div>
      </motion.div>
    )
  }
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const monthData = sessionData.find(item => item.month === label || item.monthFormatted === label);
      
      return (
        <div className="bg-white p-4 shadow-lg rounded-lg border border-indigo-100">
          <p className="font-medium text-indigo-800">{monthData?.month || label}</p>
          <div className="mt-2 space-y-1.5">
            {/* Total Time */}
            <p className="text-sm text-gray-700 flex items-center">
              <span className="inline-block w-3 h-3 bg-indigo-500 rounded-full mr-2"></span>
              <span className="w-36">Total Session Time:</span> 
              <span className="font-medium">{payload[0].value} mins</span>
              <span className="text-xs text-indigo-500 ml-1">
                ({Math.round(payload[0].value / 60 * 10) / 10} hrs)
              </span>
            </p>
            
            {/* Session Count */}
            <p className="text-sm text-gray-700 flex items-center">
              <span className="inline-block w-3 h-3 bg-teal-500 rounded-full mr-2"></span>
              <span className="w-36">Number of Sessions:</span> 
              <span className="font-medium">{payload[1].value}</span>
            </p>
            
            {/* Average Session Length */}
            {monthData && (
              <p className="text-sm text-gray-700 flex items-center">
                <span className="inline-block w-3 h-3 bg-violet-500 rounded-full mr-2"></span>
                <span className="w-36">Avg Session Length:</span> 
                <span className="font-medium">{monthData.avgSessionLength} mins</span>
              </p>
            )}
            
            {/* Growth Indicator */}
            {payload[2] && monthData?.growth !== undefined && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-sm text-gray-700 flex items-center">
                  <span className="inline-block w-3 h-3 bg-amber-400 rounded-full mr-2"></span>
                  <span className="w-36">Growth from Previous:</span>
                  <span className={`font-medium ${
                    monthData.growth > 0 
                      ? 'text-green-600' 
                      : monthData.growth < 0 
                        ? 'text-red-600' 
                        : 'text-gray-600'
                  }`}>
                    {monthData.growth > 0 ? '+' : ''}{monthData.growth}%
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };
  
  const handleBarClick = (data, index) => {
    setActiveBar(activeBar === index ? null : index);
  };
  
  const toggleView = () => {
    setView(view === 'monthly' ? 'average' : 'monthly');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-[340px] sm:h-80 lg:h-96 mb-6 sm:mb-0 overflow-hidden"
    >
      {/* Use the reusable therapy type selector */}
      <TherapyTypeSelector />

      {/* Summary Stats */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
        <div className="flex flex-wrap gap-2 sm:gap-4">
          <motion.div 
            whileHover={{ y: -2 }}
            className="px-3 py-2 bg-indigo-50 rounded-lg"
          >
            <p className="text-xs text-indigo-600 font-medium">Total Therapy Time</p>
            <p className="text-xl font-bold text-indigo-800">{totalHours}<span className="text-xs text-indigo-500 ml-1">hours</span></p>
          </motion.div>
          <motion.div 
            whileHover={{ y: -2 }}
            className="px-3 py-2 bg-teal-50 rounded-lg"
          >
            <p className="text-xs text-teal-600 font-medium">Average Session</p>
            <p className="text-xl font-bold text-teal-800">{averageSessionLength}<span className="text-xs text-teal-500 ml-1">mins</span></p>
          </motion.div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleView}
          className="text-xs px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-md transition-colors"
        >
          {view === 'monthly' ? 'Show Average View' : 'Show Monthly View'}
        </motion.button>
      </div>
      
      <div className="h-[70%] min-h-[200px] w-full overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={sessionData}
            margin={{ top: 10, right: 30, left: 10, bottom: 25 }}
            barGap={2}
          >
          <defs>
            <linearGradient id="sessionTimeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#818CF8" stopOpacity={0.2}/>
            </linearGradient>
            <linearGradient id="sessionCountGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#5EEAD4" stopOpacity={0.2}/>
            </linearGradient>
            <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#FCD34D" stopOpacity={0.2}/>
            </linearGradient>
          </defs>
          
          <XAxis 
            dataKey={view === 'monthly' ? "monthFormatted" : "month"} 
            tick={{ fill: '#4F46E5', fontSize: 12 }}
            axisLine={{ stroke: '#E0E7FF' }}
            tickLine={false}
            padding={{ left: 10, right: 10 }}
          />
          
          <YAxis 
            yAxisId="left" 
            orientation="left"
            tick={{ fill: '#4F46E5', fontSize: 11 }}
            axisLine={{ stroke: '#E0E7FF' }}
            tickLine={false}
            domain={[0, 'dataMax + 30']} // Adds some breathing room
            label={{ 
              value: "Minutes", 
              angle: -90, 
              position: "insideLeft",
              style: { fill: '#4F46E5', fontSize: 12, textAnchor: 'middle' }
            }} 
          />
          
          <YAxis 
            yAxisId="right" 
            orientation="right"
            tick={{ fill: '#0D9488', fontSize: 11 }}
            axisLine={{ stroke: '#E0E7FF' }}
            tickLine={false}
            domain={[0, 'dataMax + 2']} // Adds some breathing room
            label={{ 
              value: "Sessions", 
              angle: 90, 
              position: "insideRight",
              style: { fill: '#0D9488', fontSize: 12, textAnchor: 'middle' }
            }}
          />
          
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ opacity: 0.15 }}
          />
          
          <Legend 
            verticalAlign="top" 
            height={30} 
            wrapperStyle={{
              paddingBottom: '5px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#4B5563'
            }}
          />
          
          {/* Session Time Bar */}
          <Bar 
            yAxisId="left" 
            dataKey="sessionTime" 
            name="Session Time (mins)" 
            fill="url(#sessionTimeGradient)"
            radius={[5, 5, 0, 0]}
            onClick={handleBarClick}
            animationDuration={1000}
            animationEasing="ease-out"
            isAnimationActive={true}
            minPointSize={3} // Ensures small values are still visible
          >
            {sessionData.map((entry, index) => (
              <motion.rect 
                key={`rect-${index}`}
                initial={{ opacity: 0.4 }}
                animate={{ 
                  opacity: activeBar === index ? 1 : 0.8,
                  stroke: activeBar === index ? '#4F46E5' : 'none',
                  strokeWidth: activeBar === index ? 2 : 0
                }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </Bar>
          
          {/* Session Count Bar */}
          <Bar 
            yAxisId="right" 
            dataKey="sessionCount" 
            name="Sessions" 
            fill="url(#sessionCountGradient)"
            radius={[5, 5, 0, 0]}
            opacity={0.9}
            animationDuration={1000}
            animationEasing="ease-out"
            animationBegin={300}
            isAnimationActive={true}
            minPointSize={3} // Ensures small values are still visible
          />
          
          {/* Progress/Growth Line */}
          <Area 
            yAxisId="left"
            type="monotone"
            dataKey="progressVisual"
            name="Growth Trend"
            stroke="#F59E0B"
            strokeWidth={2}
            fillOpacity={0.2}
            fill="url(#progressGradient)"
            activeDot={{ r: 6, stroke: '#F59E0B', strokeWidth: 2, fill: '#FEF3C7' }}
            animationDuration={1500}
            animationBegin={600}
            isAnimationActive={true}
            connectNulls={true}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </div>
      
      {/* Chart legend/annotation */}
      <div className="flex justify-center">
        <p className="text-xs text-gray-500 italic text-center -translate-y-7.5">
          Click on any bar for details.
        </p>
      </div>
    </motion.div>
  )
}