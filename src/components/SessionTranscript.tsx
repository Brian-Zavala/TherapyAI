'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'

// Define the structure for a single transcript message
type TranscriptEntry = {
  id: string
  sessionId: string
  speaker: string
  text: string
  timestamp: string
  isFinal: boolean
}

type Session = {
  id: string
  date: string
  duration: number
  theme: string
  status: string
  transcript?: string | null
  notes?: string | null
  transcriptEntries?: TranscriptEntry[]
}

interface SessionTranscriptProps {
  sessionId: string;
  initialSession?: Session | null;
}

export default function SessionTranscript({ sessionId, initialSession }: SessionTranscriptProps) {
  const [session, setSession] = useState<Session | null>(initialSession || null)
  const [loading, setLoading] = useState(!initialSession)
  const [error, setError] = useState<string | null>(null)
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([])
  
  // Show a placeholder entry immediately while loading for better UI experience
  const [showingPlaceholder, setShowingPlaceholder] = useState(true)

  // Load session data and transcript entries
  useEffect(() => {
    async function loadTranscript() {
      try {
        console.log(`Loading transcript entries for session ${sessionId}`)
        const response = await fetch(`/api/sessions/${sessionId}/transcript`)
        
        if (!response.ok) {
          console.error(`Error fetching transcript: ${response.status}`)
          return
        }
        
        const entries = await response.json()
        console.log(`Fetched ${entries?.length || 0} transcript entries`)
        
        if (entries && Array.isArray(entries) && entries.length > 0) {
          // Sort entries by timestamp to ensure correct ordering
          const sortedEntries = [...entries].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          
          // Set entries from API
          setTranscriptEntries(sortedEntries)
          setShowingPlaceholder(false)
          console.log(`Set ${sortedEntries.length} sorted transcript entries from API`);
        } else if (session?.transcript) {
          // If no entries but we have a legacy transcript, parse it
          const parsedEntries = formatLegacyTranscript(session.transcript);
          setTranscriptEntries(parsedEntries)
          setShowingPlaceholder(false)
          console.log(`Set ${parsedEntries.length} parsed transcript entries from legacy transcript`);
        } else {
          // Check session storage as last resort
          try {
            const storageKey = `transcript-${sessionId}`;
            const stored = sessionStorage.getItem(storageKey);
            if (stored) {
              const storedEntries = JSON.parse(stored);
              if (Array.isArray(storedEntries) && storedEntries.length > 0) {
                // Convert to transcript entry format
                const formattedEntries = storedEntries.map((entry, index) => ({
                  id: `storage-${index}`,
                  sessionId: sessionId,
                  speaker: entry.speaker || 'unknown',
                  text: entry.text || '',
                  timestamp: entry.timestamp || new Date().toISOString(),
                  isFinal: true
                }));
                
                setTranscriptEntries(formattedEntries);
                setShowingPlaceholder(false)
                console.log(`Set ${formattedEntries.length} transcript entries from session storage`);
                
                // Also migrate these entries to the database for future retrieval
                try {
                  formattedEntries.forEach(async (entry) => {
                    await fetch(`/api/sessions/${sessionId}/transcript`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        speaker: entry.speaker,
                        text: entry.text,
                        timestamp: entry.timestamp,
                        isFinal: true
                      })
                    });
                  });
                  console.log('Migrated session storage entries to database');
                } catch (migrationError) {
                  console.error('Failed to migrate entries to database:', migrationError);
                }
              }
            }
          } catch (storageError) {
            console.error('Error checking session storage:', storageError);
          }
        }
      } catch (error) {
        console.error('Error fetching transcript entries:', error)
      }
    }
    
    async function loadSessionData() {
      try {
        setLoading(true)
        
        const response = await fetch(`/api/sessions/${sessionId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch session')
        }
        
        const sessionData = await response.json()
        setSession(sessionData)
        
        // If session has transcript entries directly, use them
        if (sessionData.transcriptEntries?.length > 0) {
          setTranscriptEntries(sessionData.transcriptEntries)
          setShowingPlaceholder(false)
        } else {
          // Otherwise, load transcript entries separately
          await loadTranscript()
        }
      } catch (err) {
        console.error('Error fetching session data:', err)
        setError('Could not load session details')
      } finally {
        setLoading(false)
        // If we still have no entries by now, don't show a placeholder anymore
        setTimeout(() => {
          setShowingPlaceholder(false)
        }, 300)
      }
    }
    
    if (initialSession) {
      // If we have initial session data, just load transcript
      loadTranscript()
    } else if (sessionId) {
      // Otherwise load everything
      loadSessionData()
    }
  }, [sessionId, initialSession])

  // Fallback function to parse legacy transcript strings
  function formatLegacyTranscript(transcript: string): TranscriptEntry[] {
    if (!transcript || !session) return []
    
    // Split by newlines and filter empty lines
    const lines = transcript.split('\n').filter(line => line.trim() !== '')
    const entries: TranscriptEntry[] = []
    
    lines.forEach((line, index) => {
      // Try to match speaker pattern (SPEAKER: text)
      const match = line.match(/^([^:]+):\s*(.+)$/)
      
      if (match) {
        const speakerText = match[1].toLowerCase()
        // Normalize speaker
        const speaker = (speakerText === 'user' || 
                       speakerText === 'client' || 
                       speakerText === 'human' ||
                       speakerText === 'you') 
          ? 'user' : 'assistant'
        
        const text = match[2].trim()
        
        if (text) {
          entries.push({
            id: `legacy-${index}`,
            sessionId: session.id,
            speaker,
            text,
            timestamp: new Date(Date.now() - (lines.length - index) * 10000).toISOString(),
            isFinal: true
          })
        }
      } else {
        // No speaker prefix - use heuristics
        const probablyUser = line.endsWith('?') || 
                           /\b(I feel|I think|I am|I'm|I need|I want|I have)\b/i.test(line)
        
        entries.push({
          id: `legacy-${index}`,
          sessionId: session.id,
          speaker: probablyUser ? 'user' : 'assistant',
          text: line.trim(),
          timestamp: new Date(Date.now() - (lines.length - index) * 10000).toISOString(),
          isFinal: true
        })
      }
    })
    
    return entries
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-5">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Session Transcript
          </h2>
        </div>
        <div className="p-4 sm:p-5 min-h-[300px]">
          <div className="flex flex-col justify-center items-center h-full">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-gray-500 text-sm">Loading transcript data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg">
        {error || 'Session not found'}
      </div>
    )
  }

  // Show a placeholder immediately if we're in placeholder mode
  if (showingPlaceholder && !loading) {
    const placeholderEntries = [];
    for (let i = 0; i < 5; i++) {
      // Alternate between user and assistant
      const speaker = i % 2 === 0 ? 'user' : 'assistant';
      placeholderEntries.push({
        id: `loading-placeholder-${i}`,
        sessionId: session.id,
        speaker,
        text: speaker === 'user' ? 'Loading conversation...' : 'Retrieving transcript data...',
        timestamp: new Date(Date.now() - (5 - i) * 5000).toISOString(),
        isFinal: true
      });
    }
    
    // Display loading placeholders for a better user experience
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-5">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Session Transcript
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white">
              <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {format(new Date(session.date), 'PPP')}
            </span>
          </div>
        </div>
        
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[60vh]">
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
          >
            {placeholderEntries.map((entry, index) => {
              const isUser = entry.speaker === 'user';
              
              return (
                <motion.div 
                  key={entry.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  initial={{ opacity: 0.5, y: 10 }}
                  animate={{ 
                    opacity: [0.5, 0.8, 0.5], 
                    y: 0 
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity,
                    delay: index * 0.2 
                  }}
                >
                  <div 
                    className={`max-w-[85%] sm:max-w-[80%] p-3 rounded-lg shadow-sm ${
                      isUser 
                        ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-900 border border-indigo-100' 
                        : 'bg-white text-gray-800 border border-gray-100'
                    }`}
                  >
                    <div className={`text-xs font-medium mb-1 flex items-center ${
                      isUser ? 'text-indigo-700' : 'text-gray-600'
                    }`}>
                      {isUser ? (
                        <>
                          <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          You
                        </>
                      ) : (
                        <>
                          <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          AI Therapist
                        </>
                      )}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{entry.text}</div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    );
  }

  // Filter and sort transcript entries
  const filteredEntries = transcriptEntries.filter(entry => 
    entry && entry.text && entry.text.trim() !== '' &&
    entry.speaker && typeof entry.speaker === 'string' &&
    !entry.text.includes("This session does not have any") &&
    !entry.text.includes("Full session transcript:") &&
    entry.speaker.toLowerCase() !== 'system'
  )
  
  // Sort by timestamp
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  })
  
  // If still no valid entries, show placeholder
  const displayEntries = sortedEntries.length > 0 
    ? sortedEntries 
    : [{
        id: 'placeholder',
        sessionId: session.id,
        speaker: 'system',
        text: 'No conversation data is available for this session.',
        timestamp: new Date().toISOString(),
        isFinal: true
      }]

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-5">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Session Transcript
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white">
            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {format(new Date(session.date), 'PPP')}
          </span>
          
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white">
            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {session.duration} minutes
          </span>
          
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white">
            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            {session.theme}
          </span>
        </div>
      </div>
      
      <div className="p-4 sm:p-5 overflow-y-auto max-h-[60vh]">
        {displayEntries.length > 0 ? (
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {displayEntries.map((entry, index) => {
              const isUser = entry.speaker?.toLowerCase() === 'user' || 
                           entry.speaker?.toLowerCase() === 'you' || 
                           entry.speaker?.toLowerCase() === 'client';
              
              return (
                <motion.div 
                  key={entry.id || `line-${index}`}
                  className={`flex ${isUser ? 'justify-end' : entry.speaker === 'system' ? 'justify-center' : 'justify-start'}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                >
                  <div 
                    className={`max-w-[85%] sm:max-w-[80%] p-3 rounded-lg shadow-sm ${
                      isUser 
                        ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-900 border border-indigo-100' 
                        : entry.speaker === 'system'
                          ? 'bg-gray-100 text-gray-600 border border-gray-200'
                          : 'bg-white text-gray-800 border border-gray-100'
                    }`}
                  >
                    {entry.speaker !== 'system' && (
                      <div className={`text-xs font-medium mb-1 flex items-center ${
                        isUser ? 'text-indigo-700' : 'text-gray-600'
                      }`}>
                        {isUser ? (
                          <>
                            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            You
                          </>
                        ) : (
                          <>
                            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            AI Therapist
                          </>
                        )}
                      </div>
                    )}
                    
                    {entry.speaker === 'system' ? (
                      <div className="text-sm flex items-center justify-center">
                        <svg className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {entry.text}
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap">{entry.text}</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <div className="text-center py-8">
            <div className="bg-indigo-50 rounded-lg p-5 inline-block">
              <svg 
                className="h-10 w-10 text-indigo-400 mx-auto mb-2" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
                />
              </svg>
              <p className="text-indigo-700 font-medium">No transcript available</p>
              <p className="text-indigo-500 text-sm mt-1">This session does not have any recorded conversation yet.</p>
            </div>
          </div>
        )}
      </div>
      
      {session.notes && (
        <div className="border-t border-gray-100 p-5 bg-gray-50">
          <h3 className="font-medium text-gray-800 mb-3 flex items-center">
            <svg className="h-4 w-4 mr-1 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Session Notes
          </h3>
          <p className="text-gray-600 text-sm bg-white p-4 rounded-lg border border-gray-100">{session.notes}</p>
        </div>
      )}
    </div>
  )
}