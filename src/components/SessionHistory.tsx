// src/components/SessionHistory.tsx
'use client'

import { useState, useEffect } from 'react'

type Session = {
  id: string
  startTime: string
  endTime?: string
  duration?: number
  notes?: string
}

export default function SessionHistory() {
  const [sessions, setSessions] = useState<Session[]>([])
  
  useEffect(() => {
    // Load session history from localStorage
    const savedSessions = localStorage.getItem('therapySessionHistory')
    if (savedSessions) {
      try {
        setSessions(JSON.parse(savedSessions))
      } catch (e) {
        console.error('Error loading session history:', e)
      }
    }
  }, [])
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
    })
  }
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Session History</h2>
      
      {sessions.length === 0 ? (
        <p className="text-gray-500">No sessions yet. Start your first therapy session!</p>
      ) : (
        <div className="space-y-4">
          {sessions.map(session => (
            <div key={session.id} className="border-b pb-3 last:border-b-0">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{formatDate(session.startTime)}</div>
                  <div className="text-sm text-gray-600">
                    {formatTime(session.startTime)} - {session.endTime ? formatTime(session.endTime) : 'Ongoing'}
                  </div>
                </div>
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-md">
                  {session.duration || '?'} min
                </span>
              </div>
              {session.notes && <p className="text-gray-700 mt-2 text-sm">{session.notes}</p>}
              
              {!session.notes && (
                <button 
                  className="text-blue-600 hover:underline text-xs mt-2"
                  onClick={() => {
                    // In a real app, this would open a modal to add notes
                    const notes = prompt('Add notes for this session:')
                    if (notes) {
                      const updatedSessions = sessions.map(s => 
                        s.id === session.id ? { ...s, notes } : s
                      )
                      setSessions(updatedSessions)
                      localStorage.setItem('therapySessionHistory', JSON.stringify(updatedSessions))
                    }
                  }}
                >
                  + Add notes
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}