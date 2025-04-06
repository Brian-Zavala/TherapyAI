// src/components/dashboard/SessionTimeChart.tsx
"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export default function SessionTimeChart() {
  const [sessionData, setSessionData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const response = await fetch('/api/dashboard/session-time')
        
        if (!response.ok) {
          throw new Error('Failed to fetch session time data')
        }
        
        const data = await response.json()
        setSessionData(data)
      } catch (err) {
        console.error('Error fetching session time data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchSessionData()
  }, [])
  
  if (loading) return <div className="h-64 flex items-center justify-center">Loading session data...</div>
  
  if (error) return (
    <div className="h-64 flex items-center justify-center text-red-500">
      Error loading session data: {error}
    </div>
  )
  
  if (sessionData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No session data available. Complete your first session to see data here.
      </div>
    )
  }
  
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sessionData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis yAxisId="left" label={{ value: "Minutes", angle: -90, position: "insideLeft" }} />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip formatter={(value, name) => {
            if (name === "Session Time") return [`${value} mins`, name];
            if (name === "Session Count") return [`${value} sessions`, name];
            return [value, name];
          }} />
          <Bar yAxisId="left" dataKey="sessionTime" name="Session Time" fill="#8884d8" />
          <Bar yAxisId="right" dataKey="sessionCount" name="Session Count" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}