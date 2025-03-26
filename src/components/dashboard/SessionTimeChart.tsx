// src/components/dashboard/SessionTimeChart.tsx
"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export default function SessionTimeChart() {
  const [sessionData, setSessionData] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // In a real app, you'd fetch this from your API
    // For now, using sample data
    const sampleData = [
      { month: "Jan", sessionTime: 120 },
      { month: "Feb", sessionTime: 150 },
      { month: "Mar", sessionTime: 180 },
      { month: "Apr", sessionTime: 210 },
      { month: "May", sessionTime: 240 },
      { month: "Jun", sessionTime: 270 },
    ]
    
    setSessionData(sampleData)
    setLoading(false)
  }, [])
  
  if (loading) return <div className="h-64 flex items-center justify-center">Loading session data...</div>
  
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sessionData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis label={{ value: "Minutes", angle: -90, position: "insideLeft" }} />
          <Tooltip formatter={(value) => [`${value} mins`, "Session Time"]} />
          <Bar dataKey="sessionTime" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}