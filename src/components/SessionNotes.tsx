'use client'

import { useState } from 'react'

export default function SessionNotes() {
  const [notes, setNotes] = useState('')
  const [savedNotes, setSavedNotes] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveNotes = async () => {
    if (!notes.trim()) return
    
    setIsSaving(true)
    
    // In a real app, you would save this to a database
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setSavedNotes([notes, ...savedNotes])
    setNotes('')
    setIsSaving(false)
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Session Notes</h2>
      
      <div className="mb-4">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Record your thoughts and insights from your therapy session..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
        />
      </div>
      
      <div className="text-right mb-6">
        <button
          onClick={handleSaveNotes}
          disabled={isSaving || !notes.trim()}
          className={`px-4 py-2 rounded-md text-white ${
            isSaving || !notes.trim() ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          } transition`}
        >
          {isSaving ? 'Saving...' : 'Save Notes'}
        </button>
      </div>
      
      {savedNotes.length > 0 && (
        <div>
          <h3 className="font-medium mb-2">Previously Saved Notes</h3>
          <div className="space-y-3">
            {savedNotes.map((note, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-md text-sm">
                {note}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}