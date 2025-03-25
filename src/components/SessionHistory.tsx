'use client'

import { useState } from 'react'

type Session = {
  id: string
  date: string
  duration: number
  notes?: string
}

export default function SessionHistory() {
  // In a real app, this would be fetched from a database
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: '1',
      date: '2025-03-22',
      duration: 15,
      notes: 'Discussed communication patterns'
    },
    {
      id: '2',
      date: '2025-03-24',
      duration: 25,
      notes: 'Worked on active listening techniques'
    }
  ])

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Session History</h2>
      
      {sessions.length === 0 ? (
        <p className="text-gray-500">No sessions yet. Start your first therapy session!</p>
      ) : (
        <div className="space-y-4">
          {sessions.map(session => (
            <div key={session.id} className="border-b pb-3 last:border-b-0">
              <div className="flex justify-between items-center">
                <span className="font-medium">{new Date(session.date).toLocaleDateString()}</span>
                <span className="text-sm text-gray-600">{session.duration} minutes</span>
              </div>
              {session.notes && <p className="text-gray-700 mt-1 text-sm">{session.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}