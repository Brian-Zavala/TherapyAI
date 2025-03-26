// src/components/dashboard/RelationshipProgressCard.tsx
"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export default function RelationshipProgressCard() {
  const [progressData, setProgressData] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Sample data - in a real app, fetch this from your API
    const sampleData = [
      { week: "Week 1", closeness: 65, communication: 60 },
      { week: "Week 2", closeness: 68, communication: 63 },
      { week: "Week 3", closeness: 72, communication: 70 },
      { week: "Week 4", closeness: 75, communication: 72 },
      { week: "Week 5", closeness: 78, communication: 75 },
      { week: "Week 6", closeness: 82, communication: 80 },
    ]
    
    setProgressData(sampleData)
    setLoading(false)
  }, [])
  
  if (loading) return <div className="h-64 flex items-center justify-center">Loading progress data...</div>
  
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