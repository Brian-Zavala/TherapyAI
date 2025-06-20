'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { useOptimizedTranscript } from '@/hooks/useOptimizedTranscript'

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
  
  // Real-time tracking of session duration
  const [sessionDuration, setSessionDuration] = useState<number>(initialSession?.duration || 0)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  
  // Use optimized transcript hook for real-time updates
  const {
    entries: transcriptEntries,
    isLoading: transcriptLoading,
    error: transcriptError,
    hasMore,
    loadMore,
    refresh
  } = useOptimizedTranscript({
    sessionId,
    isActive: session?.status === 'active',
    pageSize: 50
  })
  
  // Virtual scrolling refs
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  
  // Handle scroll position for auto-scroll
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    
    setAutoScroll(isNearBottom)
    
    // Load more when near top (for pagination)
    if (scrollTop < 100 && hasMore && !transcriptLoading) {
      loadMore()
    }
  }, [hasMore, transcriptLoading, loadMore])
  
  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current && session?.status === 'active') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [transcriptEntries.length, autoScroll, session?.status])
  
  // Function to calculate elapsed time for active sessions
  useEffect(() => {
    if (session?.status === 'active') {
      const fetchSessionStartTime = async () => {
        try {
          const response = await fetch(`/api/sessions/${sessionId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.startTime) {
              setSessionStartTime(new Date(data.startTime))
            } else {
              setSessionStartTime(new Date(data.date))
            }
          }
        } catch (error) {
          console.error('Error fetching session start time:', error)
        }
      }
      
      fetchSessionStartTime()
    } else {
      setSessionDuration(session?.duration || 0)
    }
  }, [session?.status, sessionId])

  // Update duration every 10 seconds for active sessions
  useEffect(() => {
    if (session?.status === 'active' && sessionStartTime) {
      const updateDuration = () => {
        const now = new Date()
        const elapsedMinutes = Math.floor((now.getTime() - sessionStartTime.getTime()) / (1000 * 60))
        setSessionDuration(Math.max(1, elapsedMinutes))
      }
      
      updateDuration()
      const durationTimer = setInterval(updateDuration, 10000)
      
      return () => clearInterval(durationTimer)
    }
  }, [session?.status, sessionStartTime])
  
  // Load session data
  useEffect(() => {
    async function loadSessionData() {
      if (initialSession) return
      
      try {
        setLoading(true)
        const response = await fetch(`/api/sessions/${sessionId}`, { 
          cache: 'no-store'
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch session: ${response.status}`)
        }
        
        const sessionData = await response.json()
        setSession(sessionData)
        
        if (sessionData.status !== 'active') {
          setSessionDuration(sessionData.duration || 0)
        }
      } catch (err) {
        console.error('Error fetching session data:', err)
        setError('Could not load session details')
      } finally {
        setLoading(false)
      }
    }
    
    if (sessionId && !initialSession) {
      loadSessionData()
    }
  }, [sessionId, initialSession])

  // Filter and process entries for display
  const displayEntries = transcriptEntries.filter(entry => {
    if (!entry || !entry.text || !entry.text.trim()) return false
    
    // Filter out system artifacts
    if (entry.text.includes("-----") ||
        entry.text.includes("Full conversation transcript:")) {
      return false
    }
    
    return true
  })

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/20">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-5">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Session Transcript
          </h2>
        </div>
        <div className="p-4 sm:p-5 min-h-[300px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3 mx-auto"></div>
            <p className="text-white/70 text-sm">Loading transcript data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="p-6 bg-red-500/20 backdrop-blur-md text-red-300 rounded-xl border border-red-400/30">
        {error || 'Session not found'}
      </div>
    )
  }

  const combinedError = transcriptError && `Transcript Error: ${transcriptError}`

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/20">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Session Transcript
          {session.status === 'active' && (
            <span className="ml-2 flex items-center">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
              <span className="ml-1 text-xs text-green-300">Live</span>
            </span>
          )}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm text-white">
            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {format(new Date(session.date), 'PPP')}
          </span>
          
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm text-white">
            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {session.status === 'active' ? (
              <span className="flex items-center">
                {sessionDuration} minutes
              </span>
            ) : (
              `${session.duration} minutes`
            )}
          </span>
          
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm text-white">
            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            {session.theme}
          </span>
          
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={transcriptLoading}
              className="ml-auto text-xs text-white/80 hover:text-white transition-colors"
            >
              {transcriptLoading ? 'Loading...' : 'Load More'}
            </button>
          )}
        </div>
      </div>
      
      {combinedError && (
        <div className="px-4 py-2 bg-red-500/20 text-red-300 text-sm">
          {combinedError}
        </div>
      )}
      
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="p-4 sm:p-5 overflow-y-auto max-h-[60vh] scroll-smooth"
      >
        {transcriptLoading && displayEntries.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3 mx-auto"></div>
            <p className="text-white/70 text-sm">Loading conversation...</p>
          </div>
        ) : displayEntries.length > 0 ? (
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {displayEntries.map((entry, index) => {
              const isUser = entry.speaker?.toLowerCase() === 'user' || 
                           entry.speaker?.toLowerCase() === 'you' || 
                           entry.speaker?.toLowerCase() === 'client'
              
              return (
                <motion.div 
                  key={entry.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.05, 0.2), duration: 0.3 }}
                >
                  <div 
                    className={`max-w-[85%] sm:max-w-[80%] p-3 rounded-lg shadow-sm backdrop-blur-sm ${
                      isUser 
                        ? 'bg-blue-500/20 text-white border border-blue-400/30' 
                        : 'bg-white/15 text-white border border-white/20'
                    }`}
                  >
                    <div className={`text-xs font-medium mb-1 flex items-center ${
                      isUser ? 'text-blue-300' : 'text-white/80'
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
                      <span className="ml-auto text-[10px] text-white/50">
                        {format(new Date(entry.timestamp), 'HH:mm:ss')}
                      </span>
                    </div>
                    <div className="text-sm whitespace-pre-wrap text-white/90">{entry.text}</div>
                  </div>
                </motion.div>
              )
            }) as any}
            
            {/* Auto-scroll anchor */}
            <div ref={bottomRef} />
          </motion.div>
        ) : (
          <div className="text-center py-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-5 inline-block border border-white/20">
              <svg 
                className="h-10 w-10 text-blue-400 mx-auto mb-2" 
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
              <p className="text-white font-medium">No transcript available</p>
              <p className="text-white/70 text-sm mt-1">
                {session.status === 'active' 
                  ? 'The conversation will appear here as you speak...'
                  : 'This session does not have any recorded conversation.'}
              </p>
            </div>
          </div>
        )}
        
        {/* Loading indicator for pagination */}
        {transcriptLoading && displayEntries.length > 0 && (
          <div className="text-center py-4">
            <div className="inline-flex items-center text-white/60 text-sm">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
              Loading more messages...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}