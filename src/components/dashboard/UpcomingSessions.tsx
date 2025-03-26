// src/components/dashboard/UpcomingSessions.tsx
"use client"

import { useState, useEffect } from "react"

export default function UpcomingSessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/dashboard/upcoming-sessions')
        
        if (!response.ok) {
          throw new Error('Failed to fetch upcoming sessions')
        }
        
        const data = await response.json()
        setSessions(data)
      } catch (err) {
        console.error('Error fetching upcoming sessions:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchSessions()
  }, [])
  
  if (loading) return <div className="h-64 flex items-center justify-center">Loading session data...</div>
  
  if (error) return (
    <div className="h-64 flex items-center justify-center text-red-500">
      Error loading upcoming sessions: {error}
    </div>
  )
  
  if (sessions.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No upcoming sessions scheduled. Book your next session to see it here.
      </div>
    )
  }
  
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