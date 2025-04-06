// src/components/dashboard/RelationshipProgressCard.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Brush, CartesianGrid } from "recharts"
import { motion, useAnimation, AnimatePresence } from "framer-motion"

export default function RelationshipProgressCard() {
  const [progressData, setProgressData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [focusedPoint, setFocusedPoint] = useState(null)
  const [averageScores, setAverageScores] = useState({ closeness: 0, communication: 0 })
  const [activeIndex, setActiveIndex] = useState(null)
  const [showAverage, setShowAverage] = useState(false)
  const chartControls = useAnimation()
  const progressRef = useRef(null)
  
  // For pulse effect on points
  useEffect(() => {
    if (progressData.length > 0) {
      const interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * progressData.length)
        setActiveIndex(randomIndex)
        setTimeout(() => setActiveIndex(null), 1500)
      }, 4000)
      
      return () => clearInterval(interval)
    }
  }, [progressData])
  
  useEffect(() => {
    const fetchProgressData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/dashboard/relationship-progress')
        
        if (!response.ok) {
          throw new Error('Failed to fetch relationship progress data')
        }
        
        const data = await response.json()
        
        // Calculate average scores
        if (data.length > 0) {
          const totalCloseness = data.reduce((sum, item) => sum + item.closeness, 0)
          const totalCommunication = data.reduce((sum, item) => sum + item.communication, 0)
          
          setAverageScores({
            closeness: Math.round(totalCloseness / data.length),
            communication: Math.round(totalCommunication / data.length)
          })
        }
        
        // Add trend indicators
        const enhancedData = data.map((item, index, arr) => {
          let closenessChange = 0
          let commChange = 0
          
          if (index > 0) {
            closenessChange = item.closeness - arr[index-1].closeness
            commChange = item.communication - arr[index-1].communication
          }
          
          return {
            ...item,
            closenessChange,
            commChange,
            trend: (closenessChange + commChange) / 2
          }
        })
        
        setProgressData(enhancedData)
        
        // Animate in the chart data
        chartControls.start({
          opacity: 1,
          y: 0,
          transition: { 
            duration: 0.5,
            delay: 0.2
          }
        })
      } catch (err) {
        console.error('Error fetching relationship progress data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchProgressData()
  }, [chartControls])
  
  const toggleAverageLines = () => {
    setShowAverage(!showAverage)
  }
  
  if (loading) return (
    <div className="h-80 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <motion.div 
          animate={{ 
            rotate: 360,
            scale: [1, 1.1, 1] 
          }}
          transition={{ 
            rotate: { duration: 1.5, repeat: Infinity, ease: "linear" },
            scale: { duration: 1, repeat: Infinity, repeatType: "reverse" }
          }}
          className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center"
        >
          <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </motion.div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-purple-600 font-medium"
        >
          Analyzing your relationship growth...
        </motion.p>
      </div>
    </div>
  )
  
  if (error) return (
    <div className="h-80 flex items-center justify-center text-purple-600">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-6 bg-purple-50 rounded-lg"
      >
        <svg className="w-12 h-12 mx-auto text-purple-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-lg font-medium">Couldn't load your progress data</p>
        <p className="text-sm mt-2 text-purple-500">{error}</p>
      </motion.div>
    </div>
  )
  
  if (progressData.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-80 flex items-center justify-center text-purple-600"
      >
        <div className="text-center p-6 bg-purple-50 rounded-lg max-w-sm">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <svg className="w-12 h-12 mx-auto text-purple-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </motion.div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-lg font-medium">Begin tracking your progress</p>
            <p className="text-sm mt-2 text-purple-500">
              Complete your first assessment to start visualizing your relationship growth over time
            </p>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium"
            >
              Take Assessment
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    )
  }
  
  // Custom tooltip component for the chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const weekData = progressData.find(d => d.week === label);
      
      return (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 shadow-lg rounded-lg border border-purple-100"
        >
          <div className="flex items-center">
            <span className="text-purple-800 font-medium">Week {label}</span>
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                weekData.trend > 0 
                  ? 'bg-green-100 text-green-800' 
                  : weekData.trend < 0 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-gray-100 text-gray-800'
              }`}
            >
              {weekData.trend > 0 
                ? '+' + Math.round(weekData.trend) 
                : weekData.trend < 0 
                  ? Math.round(weekData.trend) 
                  : 'No change'}
            </motion.span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                <span className="text-sm">Closeness:</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium text-sm mr-1">{payload[0].value}/100</span>
                {weekData.closenessChange !== 0 && (
                  <span className={`text-xs ${
                    weekData.closenessChange > 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {weekData.closenessChange > 0 ? '↑' : '↓'}{Math.abs(weekData.closenessChange)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 bg-pink-500 rounded-full mr-2"></span>
                <span className="text-sm">Communication:</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium text-sm mr-1">{payload[1].value}/100</span>
                {weekData.commChange !== 0 && (
                  <span className={`text-xs ${
                    weekData.commChange > 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {weekData.commChange > 0 ? '↑' : '↓'}{Math.abs(weekData.commChange)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
            <span>Click to highlight</span>
            {weekData.trend !== 0 && (
              <span className={`text-xs font-medium ${
                weekData.trend > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {weekData.trend > 0 ? 'Improving' : 'Needs focus'}
              </span>
            )}
          </div>
        </motion.div>
      );
    }
    return null;
  };
  
  // Get the most recent score for display
  const latestWeek = progressData[progressData.length - 1]
  
  // Determine improvement from previous week
  const prevWeekIndex = progressData.length - 2;
  const prevWeek = prevWeekIndex >= 0 ? progressData[prevWeekIndex] : null;
  
  const closenessChange = prevWeek ? latestWeek.closeness - prevWeek.closeness : 0;
  const commChange = prevWeek ? latestWeek.communication - prevWeek.communication : 0;
  
  const handlePointClick = (data, index) => {
    setFocusedPoint(focusedPoint === index ? null : index)
    
    // Animate the progress indicator
    if (progressRef.current) {
      const percent = Math.min(95, Math.max(5, data.closeness * 0.8));
      progressRef.current.style.width = `${percent}%`;
    }
  }
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-80"
    >
      {/* Score indicators with subtle animations */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
        <div className="flex flex-wrap gap-2 sm:gap-4">
          <motion.div 
            whileHover={{ 
              y: -3,
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" 
            }}
            className="px-3 py-2 bg-purple-50 rounded-lg"
          >
            <p className="text-xs text-purple-600 font-medium">Closeness</p>
            <div className="flex items-center">
              <p className="text-xl font-bold text-purple-800">{latestWeek.closeness}<span className="text-xs text-purple-500">/100</span></p>
              {closenessChange !== 0 && (
                <motion.span 
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`ml-1 text-xs ${closenessChange > 0 ? 'text-green-600' : 'text-red-500'}`}
                >
                  {closenessChange > 0 ? '↑' : '↓'}{Math.abs(closenessChange)}
                </motion.span>
              )}
            </div>
          </motion.div>
          <motion.div 
            whileHover={{ 
              y: -3,
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" 
            }}
            className="px-3 py-2 bg-pink-50 rounded-lg"
          >
            <p className="text-xs text-pink-600 font-medium">Communication</p>
            <div className="flex items-center">
              <p className="text-xl font-bold text-pink-800">{latestWeek.communication}<span className="text-xs text-pink-500">/100</span></p>
              {commChange !== 0 && (
                <motion.span 
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`ml-1 text-xs ${commChange > 0 ? 'text-green-600' : 'text-red-500'}`}
                >
                  {commChange > 0 ? '↑' : '↓'}{Math.abs(commChange)}
                </motion.span>
              )}
            </div>
          </motion.div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleAverageLines}
            className={`text-xs px-2 py-1 rounded-md transition-colors ${
              showAverage ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800'
            }`}
          >
            {showAverage ? 'Hide Avg' : 'Show Avg'}
          </motion.button>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="text-right text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-md"
          >
            Week {progressData.length}
          </motion.div>
        </div>
      </div>
      
      <div className="h-[75%] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={progressData}
            margin={{ top: 5, right: 20, left: 10, bottom: 15 }}
            onMouseLeave={() => setActiveIndex(null)}
          >
          <defs>
            <linearGradient id="colorCloseness" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#C4B5FD" stopOpacity={0.2}/>
            </linearGradient>
            <linearGradient id="colorCommunication" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EC4899" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#F9A8D4" stopOpacity={0.2}/>
            </linearGradient>
            <filter id="shadow" height="200%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#8B5CF6" floodOpacity="0.3"/>
            </filter>
          </defs>
          <CartesianGrid stroke="#F3F4F6" strokeDasharray="3 3" />
          <XAxis 
            dataKey="week" 
            tick={{ fill: '#6B7280' }}
            tickLine={{ stroke: '#E5E7EB' }}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis 
            domain={[0, 100]} 
            tick={{ fill: '#6B7280' }}
            tickLine={{ stroke: '#E5E7EB' }}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ 
              paddingTop: '10px',
              fontSize: '12px',
              fontWeight: 500
            }} 
          />
          
          {/* Reference lines for average scores - only shown when toggled */}
          <AnimatePresence>
            {showAverage && (
              <>
                <ReferenceLine 
                  y={averageScores.closeness} 
                  stroke="#8B5CF6" 
                  strokeDasharray="3 3" 
                  label={{ 
                    value: `Avg: ${averageScores.closeness}`, 
                    fill: '#8B5CF6', 
                    fontSize: 12,
                    position: 'right'
                  }} 
                />
                <ReferenceLine 
                  y={averageScores.communication} 
                  stroke="#EC4899" 
                  strokeDasharray="3 3" 
                  label={{ 
                    value: `Avg: ${averageScores.communication}`, 
                    fill: '#EC4899', 
                    fontSize: 12,
                    position: 'left'
                  }} 
                />
              </>
            )}
          </AnimatePresence>
          
          <Line 
            type="monotone" 
            dataKey="closeness" 
            stroke="#8B5CF6" 
            strokeWidth={3}
            name="Closeness Score" 
            dot={(props) => {
              const { cx, cy, index } = props;
              const isFocused = focusedPoint === index;
              const isActive = activeIndex === index;
              
              return (
                <g key={`dot-${index}`}>
                  <circle
                    key={`circle-${index}`}
                    cx={cx}
                    cy={cy}
                    r={isFocused ? 6 : isActive ? 6 : 4}
                    fill={isFocused ? "#8B5CF6" : "#F5F3FF"}
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    style={{
                      filter: isFocused ? "url(#shadow)" : "none"
                    }}
                  />
                  {isActive && !isFocused && (
                    <circle
                      key={`pulse-${index}`}
                      cx={cx}
                      cy={cy}
                      r={10}
                      fill="none"
                      stroke="#8B5CF6"
                      strokeWidth={1}
                      strokeOpacity={0.5}
                      style={{
                        animation: "pulse 1.5s infinite"
                      }}
                    />
                  )}
                  
                  <style key={`style-${index}`}>
                    {`
                      @keyframes pulse {
                        0% { r: 4; stroke-opacity: 0.8; }
                        70% { r: 10; stroke-opacity: 0; }
                        100% { r: 4; stroke-opacity: 0; }
                      }
                    `}
                  </style>
                </g>
              );
            }}
            activeDot={{ 
              r: 6, 
              stroke: '#8B5CF6',
              strokeWidth: 2,
              fill: '#F5F3FF',
              onClick: handlePointClick
            }}
            connectNulls={true}
            animationDuration={1500}
            animationEasing="ease-out"
            isAnimationActive={true}
          />
          <Line 
            type="monotone" 
            dataKey="communication" 
            stroke="#EC4899" 
            strokeWidth={3}
            name="Communication Score" 
            dot={(props) => {
              const { cx, cy, index } = props;
              const isFocused = focusedPoint === index;
              const isActive = activeIndex === index;
              
              return (
                <g key={`dot-comm-${index}`}>
                  <circle
                    key={`circle-comm-${index}`}
                    cx={cx}
                    cy={cy}
                    r={isFocused ? 6 : isActive ? 6 : 4}
                    fill={isFocused ? "#EC4899" : "#FCE7F3"}
                    stroke="#EC4899"
                    strokeWidth={2}
                    style={{
                      filter: isFocused ? "url(#shadow)" : "none"
                    }}
                  />
                  {isActive && !isFocused && (
                    <circle
                      key={`pulse-comm-${index}`}
                      cx={cx}
                      cy={cy}
                      r={10}
                      fill="none"
                      stroke="#EC4899"
                      strokeWidth={1}
                      strokeOpacity={0.5}
                      style={{
                        animation: "pulsePink 1.5s infinite"
                      }}
                    />
                  )}
                  
                  <style key={`style-comm-${index}`}>
                    {`
                      @keyframes pulsePink {
                        0% { r: 4; stroke-opacity: 0.8; }
                        70% { r: 10; stroke-opacity: 0; }
                        100% { r: 4; stroke-opacity: 0; }
                      }
                    `}
                  </style>
                </g>
              );
            }}
            activeDot={{ 
              r: 6, 
              stroke: '#EC4899',
              strokeWidth: 2,
              fill: '#FCE7F3',
              onClick: handlePointClick
            }}
            connectNulls={true}
            animationBegin={300}
            animationDuration={1500}
            animationEasing="ease-out"
            isAnimationActive={true}
          />
          
          {progressData.length > 6 && (
            <Brush 
              dataKey="week" 
              height={20} 
              stroke="#A78BFA" 
              fill="#F5F3FF"
              startIndex={Math.max(0, progressData.length - 6)}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      </div>
      
      {/* Animated progress & insight indicators */}
      <div className="flex flex-col mt-1 space-y-1">
        <motion.div 
          className="h-1 bg-gray-100 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            ref={progressRef}
            className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ 
              width: focusedPoint !== null 
                ? `${60 + (focusedPoint / (progressData.length - 1)) * 35}%` 
                : "60%" 
            }}
            transition={{ 
              duration: 1,
              ease: "easeInOut",
            }}
          />
        </motion.div>
        
        <div className="flex items-center justify-center">
          <AnimatePresence mode="wait">
            {focusedPoint !== null ? (
              <motion.p
                key="insight"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-xs text-center px-2 font-medium text-purple-700"
              >
                {progressData[focusedPoint].trend > 5 
                  ? "Great progress! Keep up the good work!" 
                  : progressData[focusedPoint].trend < -5
                    ? "This period needs some attention. Try open communication."
                    : "Steady relationship metrics. Focus on consistent growth."}
              </motion.p>
            ) : (
              <motion.p
                key="default"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-xs text-gray-500 italic text-center px-2"
              >
                Click on any point to see insights for that week
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}