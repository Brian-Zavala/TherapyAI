// src/components/dashboard/RelationshipProgressCard.tsx
"use client"

import { useState, useEffect } from "react"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts"
import { motion } from "framer-motion"

export default function RelationshipProgressCard() {
  const [therapyType, setTherapyType] = useState('couple')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState('loading') // 'api', 'sample', 'loading'
  const [error, setError] = useState(null)

  // Generate sample data for the chart
  const generateSampleData = (type = 'couple') => {
    const sampleData = []
    const today = new Date()
    
    // Generate 5 weeks of data
    for (let i = 0; i < 5; i++) {
      const weekDate = new Date(today)
      weekDate.setDate(today.getDate() - (i * 7)) // Go back i weeks
      
      const weekLabel = `Week ${weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      
      // Base values that increase over time
      const baseCloseness = 60 + (i * 3)
      const baseCommunication = 55 + (i * 4)
      
      // Add random variation
      const randomVariance = Math.floor(Math.random() * 6) - 3 // -3 to +3
      
      sampleData.push({
        name: weekLabel,
        closeness: type === 'family' ? 
          baseCloseness + randomVariance + 5 : 
          baseCloseness + randomVariance,
        communication: baseCommunication + randomVariance,
        amt: 100 // Used for domain calculation
      })
    }
    
    // Return in chronological order (oldest first)
    return sampleData.reverse()
  }

  // Fetch real data from API, fallback to mock data if needed
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      setDataSource('loading')
      console.log(`Fetching data for ${therapyType} therapy`)

      try {
        // Fetch data from the real API
        const response = await fetch(`/api/dashboard/relationship-progress?type=${therapyType}`)
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        
        const apiData = await response.json()
        console.log("API returned data:", apiData)
        
        // Check if we got valid data
        if (Array.isArray(apiData) && apiData.length > 0 && apiData[0].hasOwnProperty('closeness')) {
          // Transform API data to match our chart format
          const formattedData = apiData.map(item => ({
            name: item.week,
            closeness: item.closeness,
            communication: item.communication,
            amt: 100,
            // Keep additional fields for tooltip/details
            notes: item.notes,
            insight: item.insight,
            sessionId: item.sessionId
          }))
          
          setData(formattedData)
          setDataSource('api')
          console.log("Using real data from API")
        } else {
          // If API returned invalid/empty data, use sample data
          console.log("API returned invalid data, using sample data")
          const sampleData = generateSampleData(therapyType)
          setData(sampleData)
          setDataSource('sample')
          setError('No real data available')
        }
      } catch (error) {
        console.error("Error fetching relationship progress data:", error)
        // On error, use sample data as fallback
        console.log("Using sample data due to error")
        const sampleData = generateSampleData(therapyType)
        setData(sampleData)
        setDataSource('sample')
        setError(`Failed to load data: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [therapyType])

  // Helper for therapy type selection
  const TherapyTypeSelector = () => (
    <div className="flex justify-center mb-4">
      <div className="inline-flex p-1 bg-purple-100 rounded-lg shadow-sm">
        <button
          onClick={() => setTherapyType('couple')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            therapyType === 'couple' 
              ? 'bg-purple-600 text-white' 
              : 'text-purple-700 hover:bg-purple-200'
          }`}
        >
          Couple
        </button>
        <button
          onClick={() => setTherapyType('family')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            therapyType === 'family' 
              ? 'bg-purple-600 text-white' 
              : 'text-purple-700 hover:bg-purple-200'
          }`}
        >
          Family
        </button>
      </div>
    </div>
  )

  // Loading state
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-purple-600">Loading relationship progress data...</p>
        </div>
      </div>
    )
  }

  // Function to navigate to session transcript if available
  const viewSessionTranscript = (sessionId) => {
    if (sessionId) {
      console.log("Navigating to session transcript:", sessionId)
      // Use window.location for navigation
      if (typeof window !== 'undefined') {
        window.location.href = `/dashboard/sessions?session=${sessionId}`
      }
    }
  }

  // Enhanced tooltip for the chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload // Access the original data point

      return (
        <div className="bg-white p-4 shadow-md rounded-md border border-gray-200 max-w-[250px]">
          <p className="font-medium text-gray-800">{label}</p>
          
          <div className="mt-3 space-y-2">
            <p className="text-sm flex items-center justify-between">
              <span className="flex items-center">
                <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                Closeness:
              </span>
              <span className="font-medium">{payload[0].value}/100</span>
            </p>
            
            <p className="text-sm flex items-center justify-between">
              <span className="flex items-center">
                <span className="inline-block w-3 h-3 bg-pink-500 rounded-full mr-2"></span>
                Communication:
              </span>
              <span className="font-medium">{payload[1].value}/100</span>
            </p>
          </div>
          
          {/* Show insight if available */}
          {dataPoint.insight && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <p className="text-xs italic text-gray-600">{dataPoint.insight}</p>
            </div>
          )}
          
          {/* Show notes if available */}
          {dataPoint.notes && dataPoint.notes !== "Sample data for demonstration" && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 line-clamp-2">{dataPoint.notes}</p>
            </div>
          )}
          
          {/* Link to session transcript if available */}
          {dataPoint.sessionId && (
            <button 
              onClick={() => viewSessionTranscript(dataPoint.sessionId)}
              className="mt-3 text-xs flex items-center text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                />
              </svg>
              View Session Transcript
            </button>
          )}
        </div>
      )
    }
    return null
  }

  // Chart title based on therapy type
  const chartTitle = therapyType === 'couple' 
    ? 'Relationship Progress' 
    : 'Family Relationship Progress'

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-[500px]">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-gray-800">{chartTitle}</h3>
        
        {/* Data source indicator */}
        {dataSource === 'api' && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <span className="w-2 h-2 mr-1 bg-green-400 rounded-full"></span>
            Live Data
          </span>
        )}
        {dataSource === 'sample' && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <span className="w-2 h-2 mr-1 bg-amber-400 rounded-full"></span>
            Sample Data
          </span>
        )}
      </div>
      
      <TherapyTypeSelector />
      
      {/* Error message if present */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-md text-xs mb-3">
          {error}
        </div>
      )}
      
      {/* Chart container with explicit height */}
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="closeness" 
              stroke="#8B5CF6" 
              strokeWidth={2}
              name="Closeness"
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
              isAnimationActive={true}
              animationDuration={1000}
            />
            <Line 
              type="monotone" 
              dataKey="communication" 
              stroke="#EC4899" 
              strokeWidth={2}
              name="Communication"
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
              isAnimationActive={true}
              animationDuration={1000}
              animationBegin={300}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Metrics display */}
      <div className="flex mt-6 space-x-4">
        {data.length > 0 && (
          <>
            <div className="bg-purple-50 p-3 rounded-lg flex-1">
              <p className="text-sm text-purple-700">Average Closeness</p>
              <p className="text-2xl font-bold text-purple-900">
                {Math.round(data.reduce((sum, item) => sum + item.closeness, 0) / data.length)}
              </p>
            </div>
            <div className="bg-pink-50 p-3 rounded-lg flex-1">
              <p className="text-sm text-pink-700">Average Communication</p>
              <p className="text-2xl font-bold text-pink-900">
                {Math.round(data.reduce((sum, item) => sum + item.communication, 0) / data.length)}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}