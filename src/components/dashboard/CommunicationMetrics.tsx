// src/components/dashboard/CommunicationMetrics.tsx
"use client"

import { useState, useEffect } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

export default function CommunicationMetrics() {
  const [metricsData, setMetricsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    const fetchMetricsData = async () => {
      try {
        const response = await fetch('/api/dashboard/communication-metrics')
        
        if (!response.ok) {
          throw new Error('Failed to fetch communication metrics')
        }
        
        const data = await response.json()
        setMetricsData(data)
      } catch (err) {
        console.error('Error fetching communication metrics:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchMetricsData()
  }, [])
  
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]
  
  if (loading) return <div className="h-64 flex items-center justify-center">Loading metrics data...</div>
  
  if (error) return (
    <div className="h-64 flex items-center justify-center text-red-500">
      Error loading metrics data: {error}
    </div>
  )
  
  if (metricsData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No communication metrics available. Complete your first assessment to see metrics.
      </div>
    )
  }
  
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