// src/components/dashboard/SessionTimeChart.tsx
"use client"

import { useState, useEffect } from "react"
import { ComposedChart, Bar, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Rectangle } from "recharts"
import { motion, AnimatePresence } from "framer-motion"
import { ClockIcon, UsersIcon, ChartBarIcon, ExclamationTriangleIcon, DocumentChartBarIcon } from '@heroicons/react/24/outline' // Example icons

// Helper function for number formatting (optional, but nice for tooltips)
const formatNumber = (num: number) => num.toLocaleString();

export default function SessionTimeChart() {
  const [sessionData, setSessionData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalHours, setTotalHours] = useState(0)
  const [averageSessionLength, setAverageSessionLength] = useState(0)
  const [therapyType, setTherapyType] = useState('couple') // 'couple', 'solo', or 'family'

  const fetchSessionData = async (type = 'couple') => {
    try {
      setLoading(true)
      setError(null) // Clear previous errors
      const response = await fetch(`/api/dashboard/session-time?type=${type}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch session time data (Status: ${response.status})`)
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

      // Enhance data for charting and tooltips
      const enhancedData = data.map((item, index, arr) => {
        const prevValue = index > 0 ? arr[index - 1].sessionTime : 0;
        const growthRate = prevValue === 0 && item.sessionTime > 0
            ? 100 // If first month has data, show 100% growth from 0
            : prevValue === 0 && item.sessionTime === 0
            ? 0 // If both are zero, growth is 0
            : prevValue === 0 ? 0 // Should not happen if prevValue is 0 and item.sessionTime > 0, handled above
            : Math.round((item.sessionTime / prevValue) * 100 - 100);


        const avgSessionLen = item.sessionCount > 0
          ? Math.round(item.sessionTime / item.sessionCount)
          : 0

        return {
          ...item,
          monthFormatted: item.month.substring(0, 3), // First 3 letters of month
          growth: growthRate, // Indicates % change from previous month's total time
          avgSessionLength: avgSessionLen, // Average length of each session this month
        }
      })

      setSessionData(enhancedData)
    } catch (err) {
      console.error(`Error fetching ${type} session time data:`, err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessionData(therapyType)
  }, [therapyType])

  // --- Loading State ---
  if (loading) return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-[380px] flex items-center justify-center" // Increased height slightly
    >
      <div className="flex flex-col items-center">
        {/* Enhanced Spinner */}
        <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-indigo-700 font-medium text-sm">Loading your therapy insights...</p>
      </div>
    </motion.div>
  )

  // --- Error State ---
  if (error) return (
     <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-[380px] flex items-center justify-center p-4" // Increased height slightly
    >
      <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg max-w-md">
        <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-red-400 mb-3" />
        <p className="text-lg font-semibold text-red-800">Couldn't load session data</p>
        <p className="text-sm mt-2 text-red-600">{error}</p>
         <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fetchSessionData(therapyType)} // Add a retry button
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </motion.button>
      </div>
    </motion.div>
  )

  // --- Reusable Therapy Type Selector ---
  const TherapyTypeSelector = () => (
    <div className="flex justify-center mb-4">
      {/* Added subtle shadow and slightly more padding */}
      <div className="inline-flex p-1.5 bg-indigo-100 rounded-lg shadow-sm w-full max-w-xs sm:max-w-sm overflow-x-auto">
        {['couple', 'solo', 'family'].map((type) => (
          <motion.button
            key={type}
            whileHover={{ scale: 1.03 }} // Slightly more subtle hover
            whileTap={{ scale: 0.97 }}
            onClick={() => setTherapyType(type)}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors duration-200 ease-in-out flex-1 min-w-[70px] ${
              therapyType === type
                ? 'bg-indigo-600 text-white shadow-md' // Added shadow to active
                : 'text-indigo-700 hover:bg-indigo-200'
            }`}
            // Animate layout changes for smooth background transition (optional but nice)
            layout // Requires Framer Motion's layout animations feature
          >
             {/* Capitalize first letter */}
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </motion.button>
        ))}
      </div>
    </div>
  );

  // --- No Data State ---
   if (sessionData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-[380px] flex flex-col mb-6 sm:mb-0 overflow-hidden" // Increased height slightly
      >
        <TherapyTypeSelector />
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="text-center p-6 bg-indigo-50 border border-indigo-100 rounded-lg max-w-sm">
             <DocumentChartBarIcon className="w-12 h-12 mx-auto text-indigo-400 mb-4" />
             <p className="text-lg font-medium text-indigo-800">No {therapyType} sessions recorded yet</p>
             <p className="text-sm mt-2 text-indigo-600">
               Start logging your {therapyType} therapy sessions to visualize your progress and insights over time.
             </p>
             <motion.button
               whileHover={{ scale: 1.05, y: -2 }}
               whileTap={{ scale: 0.95 }}
               className="mt-5 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all duration-150 ease-in-out shadow hover:shadow-md"
               onClick={() => window.location.href = '/dashboard/therapy'} // Assuming this is the correct link
             >
               Log First Session
             </motion.button>
           </div>
         </div>
       </motion.div>
     )
   }

  // --- Custom Tooltip Component ---
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Find the full data point for extra info like growth, avgSessionLength etc.
      const monthData = sessionData.find(item => item.monthFormatted === label);
      if (!monthData) return null; // Should always find one if tooltip is active

      return (
        <div className="bg-white p-4 shadow-xl rounded-lg border border-gray-200 min-w-[250px]">
          <p className="font-semibold text-indigo-900 mb-3 border-b pb-2">{monthData.month}</p>
          <div className="space-y-2">
            {/* Total Time */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-gray-700">
                <span className="inline-block w-3 h-3 bg-indigo-500 rounded-full mr-2 flex-shrink-0"></span>
                Total Time:
              </div>
              <span className="font-medium text-gray-800">{formatNumber(monthData.sessionTime)} mins
                <span className="text-xs text-indigo-500 ml-1">
                   ({Math.round(monthData.sessionTime / 60 * 10) / 10} hrs)
                 </span>
              </span>
            </div>

             {/* Session Count */}
             <div className="flex items-center justify-between text-sm">
               <div className="flex items-center text-gray-700">
                 <span className="inline-block w-3 h-3 bg-teal-500 rounded-full mr-2 flex-shrink-0"></span>
                 Sessions:
               </div>
               <span className="font-medium text-gray-800">{formatNumber(monthData.sessionCount)}</span>
             </div>

             {/* Average Session Length */}
             <div className="flex items-center justify-between text-sm">
               <div className="flex items-center text-gray-700">
                 <span className="inline-block w-3 h-3 bg-violet-500 rounded-full mr-2 flex-shrink-0"></span>
                 Avg. Length:
               </div>
               <span className="font-medium text-gray-800">{formatNumber(monthData.avgSessionLength)} mins</span>
             </div>

             {/* Growth Indicator */}
             {monthData.growth !== undefined && (
               <div className="mt-3 pt-2 border-t border-gray-100">
                 <div className="flex items-center justify-between text-sm">
                   <div className="flex items-center text-gray-700">
                     <span className="inline-block w-3 h-3 bg-amber-400 rounded-full mr-2 flex-shrink-0"></span>
                     Monthly Time Growth:
                   </div>
                   <span className={`font-semibold ${
                     monthData.growth > 0 ? 'text-green-600' :
                     monthData.growth < 0 ? 'text-red-600' :
                     'text-gray-600'
                   }`}>
                     {monthData.growth >= 0 ? '+' : ''}{formatNumber(monthData.growth)}%
                   </span>
                 </div>
                 <p className="text-xs text-gray-500 mt-1 text-right">vs. previous month</p>
               </div>
             )}
           </div>
         </div>
       );
     }
     return null;
   };

   return (
     <motion.div
       initial={{ opacity: 0, y: 15 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.6, ease: "easeOut" }}
        // Increased height slightly, adjust as needed based on content
       className="h-[380px] sm:h-[400px] lg:h-[420px] mb-6 sm:mb-0 flex flex-col overflow-hidden"
     >
       <TherapyTypeSelector />

       {/* Summary Stats */}
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 px-1">
         <motion.div
           whileHover={{ y: -3, boxShadow: "0 4px 10px rgba(99, 102, 241, 0.2)" }}
           className="px-4 py-3 bg-indigo-50 rounded-lg flex items-center gap-3 transition-all duration-150 ease-in-out"
         >
           <ClockIcon className="w-6 h-6 text-indigo-500 flex-shrink-0" />
           <div>
             <p className="text-xs text-indigo-600 font-medium uppercase tracking-wide">Total Time</p>
             {/* Consider adding number animation here if desired */}
             <p className="text-xl font-bold text-indigo-800">
               {totalHours}<span className="text-sm font-medium text-indigo-500 ml-1">hours</span>
             </p>
           </div>
         </motion.div>
         <motion.div
           whileHover={{ y: -3, boxShadow: "0 4px 10px rgba(20, 184, 166, 0.2)" }}
           className="px-4 py-3 bg-teal-50 rounded-lg flex items-center gap-3 transition-all duration-150 ease-in-out"
         >
           <UsersIcon className="w-6 h-6 text-teal-500 flex-shrink-0" />
           <div>
             <p className="text-xs text-teal-600 font-medium uppercase tracking-wide">Overall Avg. Session</p>
             <p className="text-xl font-bold text-teal-800">
               {averageSessionLength}<span className="text-sm font-medium text-teal-500 ml-1">mins</span>
             </p>
           </div>
         </motion.div>
       </div>

       {/* Chart Area */}
       {/* Added flex-grow to allow chart to take remaining space */}
       <div className="flex-grow min-h-[250px] w-full overflow-hidden">
         <ResponsiveContainer width="100%" height="100%">
           <ComposedChart
             data={sessionData}
             margin={{ top: 5, right: 5, left: -15, bottom: 5 }} // Adjusted margins slightly
             barGap={4} // Increase gap slightly
           >
             <defs>
               <linearGradient id="sessionTimeGradient" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="5%" stopColor="#6366F1" stopOpacity={0.9}/>
                 <stop offset="95%" stopColor="#818CF8" stopOpacity={0.5}/>
               </linearGradient>
               <linearGradient id="sessionCountGradient" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.8}/>
                 <stop offset="95%" stopColor="#5EEAD4" stopOpacity={0.4}/>
               </linearGradient>
               {/* New Gradient for Avg Session Length */}
               <linearGradient id="avgLengthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A855F7" stopOpacity={0.5}/> {/* Violet color */}
                  <stop offset="95%" stopColor="#C084FC" stopOpacity={0.1}/>
               </linearGradient>
             </defs>

             <XAxis
               dataKey="monthFormatted"
               tick={{ fill: '#4F46E5', fontSize: 11, fontWeight: 500 }}
               axisLine={{ stroke: '#E0E7FF', strokeWidth: 1 }}
               tickLine={false}
               padding={{ left: 10, right: 10 }}
               interval="preserveStartEnd" // Ensure first/last ticks are shown
             />

             <YAxis
               yAxisId="left"
               orientation="left"
               tick={{ fill: '#4F46E5', fontSize: 10 }}
               axisLine={false} // Cleaner look
               tickLine={false}
               domain={[0, 'dataMax + 50']} // Dynamic padding
               width={40} // Allocate space for label
               label={{
                 value: "Minutes",
                 angle: -90,
                 position: "insideLeft",
                 style: { fill: '#6366F1', fontSize: 11, fontWeight: 500, textAnchor: 'middle' },
                 offset: 10 // Adjust offset if needed
               }}
               tickFormatter={(value) => formatNumber(value)} // Format Y-axis numbers
             />

             <YAxis
               yAxisId="right"
               orientation="right"
               tick={{ fill: '#0D9488', fontSize: 10 }}
               axisLine={false} // Cleaner look
               tickLine={false}
               domain={[0, 'dataMax + 5']} // Dynamic padding
               width={40} // Allocate space for label
               label={{
                 value: "Sessions",
                 angle: 90,
                 position: "insideRight",
                 style: { fill: '#0D9488', fontSize: 11, fontWeight: 500, textAnchor: 'middle' },
                 offset: 10 // Adjust offset if needed
               }}
                tickFormatter={(value) => formatNumber(value)} // Format Y-axis numbers
             />

             <Tooltip
               content={<CustomTooltip />}
               cursor={{ fill: 'rgba(239, 246, 255, 0.5)' }} // Lighter indigo cursor fill
               animationDuration={200} // Faster tooltip animation
               animationEasing="ease-out"
             />

             <Legend
               verticalAlign="top"
               align="center"
               height={30}
               wrapperStyle={{
                 paddingBottom: '10px', // More space below legend
                 fontSize: '11px',
                 fontWeight: 500,
                 color: '#4B5563'
               }}
               iconSize={10} // Smaller legend icons
             />

             {/* Session Time Bar */}
             <Bar
               yAxisId="left"
               dataKey="sessionTime"
               name="Total Time (mins)"
               fill="url(#sessionTimeGradient)"
               radius={[4, 4, 0, 0]} // Slightly smaller radius
               animationDuration={1000}
               animationEasing="ease-out"
               isAnimationActive={true}
               minPointSize={2}
               // Add hover effect via recharts prop
               activeBar={<Rectangle fill="#4F46E5" opacity={0.9} />}
             />

             {/* Session Count Bar */}
             <Bar
               yAxisId="right"
               dataKey="sessionCount"
               name="Sessions"
               fill="url(#sessionCountGradient)"
               radius={[4, 4, 0, 0]}
               opacity={0.9}
               animationDuration={1000}
               animationEasing="ease-out"
               animationBegin={200} // Stagger start
               isAnimationActive={true}
               minPointSize={2}
                // Add hover effect via recharts prop
               activeBar={<Rectangle fill="#0F766E" opacity={0.9} />}
             />

             {/* Average Session Length Line/Area */}
             <Area
                yAxisId="left" // Shares axis with total time (minutes)
                type="monotone"
                dataKey="avgSessionLength"
                name="Avg. Length (mins)"
                stroke="#A855F7" // Violet color
                strokeWidth={2.5} // Slightly thicker line
                fillOpacity={0.3} // Adjust opacity
                fill="url(#avgLengthGradient)" // Use new gradient
                activeDot={{ r: 6, stroke: '#8B5CF6', strokeWidth: 2, fill: '#EDE9FE' }}
                animationDuration={1200} // Longer duration for area
                animationBegin={400} // Stagger start further
                isAnimationActive={true}
                connectNulls={true} // Connect line over months with no data
             />
           </ComposedChart>
         </ResponsiveContainer>
       </div>

       {/* Chart annotation */}
       <div className="flex justify-center mt-1">
         <p className="text-xs text-gray-500 italic text-center">
           Hover over the chart elements for detailed insights.
         </p>
       </div>
     </motion.div>
   )
}