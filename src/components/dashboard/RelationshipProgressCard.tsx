// src/components/dashboard/RelationshipProgressCard.tsx
"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export default function RelationshipProgressCard() {
  const [progressData, setProgressData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    const fetchProgressData = async () => {
      try {
        const response = await fetch('/api/dashboard/relationship-progress')
        
        if (!response.ok) {
          throw new Error('Failed to fetch relationship progress data')
        }
        
        const data = await response.json()
        setProgressData(data)
      } catch (err) {
        console.error('Error fetching relationship progress data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchProgressData()
  }, [])
  
  if (loading) return <div className="h-64 flex items-center justify-center">Loading progress data...</div>
  
  if (error) return (
    <div className="h-64 flex items-center justify-center text-red-500">
      Error loading progress data: {error}
    </div>
  )
  
  if (progressData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No progress data available. Complete your first assessment to see progress.
      </div>
    )
  }
  
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={progressData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Line type="monotone" dataKey="closeness" stroke="#8884d8" name="Closeness Score" />
          <Line type="monotone" dataKey="communication" stroke="#82ca9d" name="Communication Score" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}