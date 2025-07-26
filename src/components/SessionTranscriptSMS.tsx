'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

interface SessionTranscriptSMSProps {
  sessionId: string;
  initialSession?: Session | null;
}

export default function SessionTranscriptSMS({ sessionId, initialSession }: SessionTranscriptSMSProps) {
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
  const [showTimestamps, setShowTimestamps] = useState(false)
  
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
        entry.text.includes("Full conversation transcript:") ||
        entry.text.includes("Session ID:")) {
      return false
    }
    
    return true
  })

  // Group consecutive messages from the same speaker
  const groupedEntries = displayEntries.reduce((groups: Array<{
    speaker: string,
    messages: TranscriptEntry[],
    timestamp: string
  }>, entry) => {
    const lastGroup = groups[groups.length - 1]
    const speaker = entry.speaker?.toLowerCase()
    
    // Debug log to see what speaker values we're getting
    if (groups.length === 0) {
      console.log('Transcript speaker values found:', new Set(displayEntries.map(e => e.speaker)))
    }
    
    if (lastGroup && lastGroup.speaker === speaker) {
      lastGroup.messages.push(entry)
    } else {
      groups.push({
        speaker,
        messages: [entry],
        timestamp: entry.timestamp
      })
    }
    
    return groups
  }, [])

  if (loading) {
    return (
      <div className="h-full bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 shadow-lg">
          <h2 className="text-white font-semibold text-lg">Session Transcript</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
            <p className="text-gray-400">Loading conversation...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="h-full bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="p-6 bg-red-900/20 backdrop-blur-md text-red-400 rounded-xl border border-red-500/30">
          {error || 'Session not found'}
        </div>
      </div>
    )
  }

  const combinedError = transcriptError && `Transcript Error: ${transcriptError}`

  return (
    <div className="h-full bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-white font-semibold text-lg">Session Transcript</h2>
            {session.status === 'active' && (
              <span className="flex items-center space-x-1">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
                <span className="text-xs text-green-300">Live</span>
              </span>
            )}
          </div>
          
          <button
            onClick={() => setShowTimestamps(!showTimestamps)}
            className="text-white/70 hover:text-white transition-colors text-sm"
          >
            {showTimestamps ? 'Hide' : 'Show'} Times
          </button>
        </div>
        
        <div className="mt-2 flex items-center space-x-4 text-sm text-white/80">
          <span className="flex items-center">
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {format(new Date(session.date), 'MMM d, yyyy')}
          </span>
          
          <span className="flex items-center">
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {sessionDuration} min
          </span>
          
          <span className="flex items-center">
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            {displayEntries.length} messages
          </span>
        </div>
      </div>
      
      {combinedError && (
        <div className="px-4 py-2 bg-red-900/20 text-red-400 text-sm border-b border-red-500/30">
          {combinedError}
        </div>
      )}
      
      {/* Messages Container */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1), transparent 50%)`,
        }}
      >
        {transcriptLoading && displayEntries.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3 mx-auto"></div>
            <p className="text-gray-400 text-sm">Loading conversation...</p>
          </div>
        ) : groupedEntries.length > 0 ? (
          <AnimatePresence initial={false}>
            {groupedEntries.map((group, groupIndex) => {
              const isUser = group.speaker === 'user' || 
                           group.speaker === 'you' || 
                           group.speaker === 'client'
              
              // Handle 'vapi' as assistant speaker
              const isAssistant = group.speaker === 'assistant' || 
                                group.speaker === 'vapi' || 
                                group.speaker === 'ai' ||
                                group.speaker === 'therapist'
              
              return (
                <motion.div 
                  key={`group-${groupIndex}`}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(groupIndex * 0.05, 0.2), duration: 0.3 }}
                >
                  <div className={`max-w-[75%] sm:max-w-[65%] space-y-1`}>
                    {/* Speaker label */}
                    <div className={`text-xs font-medium mb-1 ${
                      isUser ? 'text-right text-blue-400' : 'text-left text-purple-400'
                    }`}>
                      {isUser ? 'You' : 'AI Therapist'}
                    </div>
                    
                    {/* Messages */}
                    {group.messages.map((entry, messageIndex) => (
                      <div
                        key={entry.id}
                        className={`relative ${
                          isUser 
                            ? 'bg-blue-600 text-white ml-auto' 
                            : 'bg-gray-700 text-gray-100'
                        } rounded-2xl px-4 py-2 shadow-lg ${
                          messageIndex === 0 ? (isUser ? 'rounded-tr-sm' : 'rounded-tl-sm') : ''
                        }`}
                      >
                        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {entry.text}
                        </div>
                        
                        {/* Timestamp on last message or if showing all timestamps */}
                        {(showTimestamps || messageIndex === group.messages.length - 1) && (
                          <div className={`text-[10px] mt-1 ${
                            isUser ? 'text-blue-200' : 'text-gray-400'
                          }`}>
                            {format(new Date(entry.timestamp), 'HH:mm')}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Read indicator for user messages */}
                    {isUser && session.status === 'active' && (
                      <div className="text-right text-xs text-gray-500 mt-1">
                        Read
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        ) : (
          <div className="text-center py-12">
            <svg className="h-16 w-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-gray-500">No messages yet</p>
            {session.status === 'active' && (
              <p className="text-gray-600 text-sm mt-2">Messages will appear here as the conversation progresses</p>
            )}
          </div>
        )}
        
        {/* Auto-scroll anchor */}
        <div ref={bottomRef} />
        
        {/* Typing indicator for active sessions */}
        {session.status === 'active' && (
          <motion.div 
            className="flex justify-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-gray-700 rounded-2xl px-4 py-3 shadow-lg rounded-tl-sm">
              <div className="flex space-x-1">
                <motion.div
                  className="w-2 h-2 bg-gray-400 rounded-full"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="w-2 h-2 bg-gray-400 rounded-full"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                />
                <motion.div
                  className="w-2 h-2 bg-gray-400 rounded-full"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Load more button */}
      {hasMore && (
        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <button
            onClick={loadMore}
            disabled={transcriptLoading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors duration-200"
          >
            {transcriptLoading ? 'Loading...' : 'Load Earlier Messages'}
          </button>
        </div>
      )}
    </div>
  )
}