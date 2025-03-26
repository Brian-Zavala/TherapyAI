// src/components/dashboard/CommunicationMetrics.tsx
"use client"

import { useState, useEffect } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

export default function CommunicationMetrics() {
  const [metricsData, setMetricsData] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Sample data - in a real app, fetch this from your API
    const sampleData = [
      { name: "Active Listening", value: 40 },
      { name: "Expressing Needs", value: 25 },
      { name: "Conflict Resolution", value: 20 },
      { name: "Emotional Support", value: 15 },
    ]
    
    setMetricsData(sampleData)
    setLoading(false)
  }, [])
  
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]
  
  if (loading) return <div className="h-64 flex items-center justify-center">Loading metrics data...</div>
  
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={metricsData}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {metricsData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value}%`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}