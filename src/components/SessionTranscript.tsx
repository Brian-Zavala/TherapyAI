'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'

type Session = {
  id: string
  date: string
  duration: number
  theme: string
  status: string
  transcript?: string | null
  notes?: string | null
}

export default function SessionTranscript({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSession() {
      try {
        setLoading(true)
        const response = await fetch(`/api/sessions/${sessionId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch session')
        }
        
        const data = await response.json()
        setSession(data)
      } catch (err) {
        console.error('Error fetching session:', err)
        setError('Could not load session details')
      } finally {
        setLoading(false)
      }
    }
    
    if (sessionId) {
      fetchSession()
    }
  }, [sessionId])

  function formatTranscript(transcript: string) {
    if (!transcript) return []
    
    // Split by newlines and filter empty lines
    const lines = transcript.split('\n').filter(line => line.trim() !== '');
    const deduplicatedLines = [];
    
    // Track messages we've seen to avoid duplicates
    const seenMessages = new Set();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Check for speaker patterns
      let speaker = '';
      let isUserMessage = false;
      let speakerPrefix = '';
      let content = '';
      
      // Check for explicit speaker prefixes
      const userPrefixMatch = /^(user|human|client|customer|you|person)\s*:/i.exec(line);
      const therapistPrefixMatch = /^(therapist|assistant|ai|claude|dr|doctor|counselor|advisor)\s*:/i.exec(line);
      
      if (userPrefixMatch) {
        // User message with explicit prefix
        speaker = 'You';
        speakerPrefix = userPrefixMatch[0].trim();
        isUserMessage = true;
        content = line.substring(speakerPrefix.length).trim();
      } else if (therapistPrefixMatch) {
        // Therapist message with explicit prefix
        speaker = 'AI Therapist';
        speakerPrefix = therapistPrefixMatch[0].trim();
        content = line.substring(speakerPrefix.length).trim();
      } else {
        // No explicit prefix - infer based on content
        const probablyUser = /\?\s*$/.test(line) || 
                           /\b(I feel|I think|I am|I'm|I need|I want|I have|I've|I'd|I would|my)\b/i.test(line);
        
        const probablyTherapist = /\b(let me|what I hear|I understand|it sounds like|have you considered|tell me more|how does that make you|you mentioned|would you like to|we could|let's explore)\b/i.test(line);
        
        if (probablyUser && !probablyTherapist) {
          speaker = 'You';
          isUserMessage = true;
        } else {
          // Default to therapist for unlabeled messages
          speaker = 'AI Therapist';
        }
        
        content = line;
      }
      
      // Skip empty content
      if (!content) continue;
      
      // Check for duplicates
      const messageKey = `${speaker}:${content}`;
      
      // Skip exact duplicates
      if (seenMessages.has(messageKey)) {
        continue;
      }
      
      // Check for partial duplicates - messages that are subsets or supersets of seen messages
      let isDuplicate = false;
      const toDelete = [];
      
      for (const seen of seenMessages) {
        const [seenSpeaker, ...seenContentParts] = seen.split(':');
        const seenContent = seenContentParts.join(':'); // Handle colons in the content
        
        // Only compare messages from the same speaker
        if (seenSpeaker === speaker) {
          // Case 1: This message is contained within a message we've already seen
          if (seenContent.includes(content) && content.length < seenContent.length) {
            isDuplicate = true;
            break;
          }
          
          // Case 2: A message we've seen is contained within this message 
          // (this is a more complete version)
          if (content.includes(seenContent) && seenContent.length < content.length) {
            toDelete.push(seen);
          }
        }
      }
      
      // If this is a less complete version of a message we've already seen, skip it
      if (isDuplicate) continue;
      
      // Remove any less complete versions we've seen before
      for (const del of toDelete) {
        seenMessages.delete(del);
      }
      
      // Add this message to our seen set
      seenMessages.add(messageKey);
      
      // Add to results
      deduplicatedLines.push({
        id: deduplicatedLines.length,
        speaker,
        content,
        prefix: speakerPrefix,
        isUser: isUserMessage
      });
    }
    
    return deduplicatedLines;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
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

  const transcriptLines = formatTranscript(session.transcript || '')

  // Animation variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.07,
        delayChildren: 0.2
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 350, damping: 25 }
    }
  };

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
        {transcriptLines.length > 0 ? (
          <motion.div 
            className="space-y-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {transcriptLines.map((line) => (
              <motion.div 
                key={line.id}
                variants={itemVariants}
                className={`flex ${line.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] sm:max-w-[80%] p-3 rounded-lg shadow-sm ${
                    line.isUser 
                      ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-900 border border-indigo-100' 
                      : 'bg-white text-gray-800 border border-gray-100'
                  }`}
                >
                  <div className={`text-xs font-medium mb-1 flex items-center ${
                    line.isUser ? 'text-indigo-700' : 'text-gray-600'
                  }`}>
                    {line.isUser ? (
                      <>
                        <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {line.speaker}
                      </>
                    ) : (
                      <>
                        <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {line.speaker}
                      </>
                    )}
                  </div>
                  <div className="text-sm">{line.content}</div>
                </div>
              </motion.div>
            ))}
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
              <p className="text-indigo-500 text-sm mt-1">This session does not have a recorded transcript.</p>
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