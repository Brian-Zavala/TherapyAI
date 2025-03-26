// src/components/dashboard/UpcomingSessions.tsx
"use client"

import { useState, useEffect } from "react"

export default function UpcomingSessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Sample data - in a real app, fetch this from your API
    const sampleData = [
      { id: 1, date: "2025-03-28", time: "10:00 AM", theme: "Communication Strategies" },
      { id: 2, date: "2025-04-04", time: "10:00 AM", theme: "Conflict Resolution" },
      { id: 3, date: "2025-04-11", time: "10:00 AM", theme: "Building Trust" },
    ]
    
    setSessions(sampleData)
    setLoading(false)
  }, [])
  
  if (loading) return <div className="h-64 flex items-center justify-center">Loading session data...</div>
  
  return (
    <div className="overflow-y-auto h-64">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Date</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Time</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Theme</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id} className="border-t border-gray-200">
              <td className="px-4 py-3 text-sm text-gray-900">{session.date}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{session.time}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{session.theme}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}