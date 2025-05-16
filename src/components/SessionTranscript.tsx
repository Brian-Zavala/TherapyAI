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

  // Real-time tracking of session duration
  const [sessionDuration, setSessionDuration] = useState<number>(initialSession?.duration || 0)
  const [transcriptPollingInterval, setTranscriptPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<number>(0)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  
  // Function to calculate elapsed time for active sessions
  useEffect(() => {
    // Only for active sessions
    if (session?.status === 'active') {
      // Try to get the exact session start time
      const fetchSessionStartTime = async () => {
        try {
          const response = await fetch(`/api/sessions/${sessionId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.startTime) {
              setSessionStartTime(new Date(data.startTime));
            } else {
              // Fall back to session date if no explicit start time
              setSessionStartTime(new Date(data.date));
            }
          }
        } catch (error) {
          console.error('Error fetching session start time:', error);
        }
      };
      
      fetchSessionStartTime();
      
      // Set up timer to calculate elapsed time
      const durationTimer = setInterval(() => {
        if (sessionStartTime) {
          const now = new Date();
          const elapsedMinutes = Math.ceil((now.getTime() - sessionStartTime.getTime()) / (1000 * 60));
          // Update the duration
          setSessionDuration(Math.max(1, elapsedMinutes));
        }
      }, 10000); // Update every 10 seconds
      
      return () => clearInterval(durationTimer);
    } else {
      // For completed sessions, just use the stored duration
      setSessionDuration(session?.duration || 0);
    }
  }, [session?.status, sessionId, sessionStartTime]);
  
  // Load session data and transcript entries with real-time updates
  useEffect(() => {
    // Enhanced transcript loading with improved error handling and polling
    async function loadTranscript(force: boolean = false) {
      try {
        // Throttle fetch rate to avoid excessive requests
        const now = Date.now();
        if (!force && now - lastFetchTime < 2000) {
          console.log('Throttling transcript fetch - too soon since last fetch');
          return;
        }
        
        setLastFetchTime(now);
        console.log(`Loading transcript entries for session ${sessionId}`);
        
        // Improved error handling for fetch
        let response;
        try {
          // Use catch syntax to handle fetch errors properly
          response = await fetch(`/api/sessions/${sessionId}/transcript`, {
            cache: 'no-store', // Use no-store instead of no-cache
            headers: {
              'X-Fetch-Time': Date.now().toString() // Add timestamp to prevent caching
            }
          });
          
          if (!response.ok) {
            console.error(`Error fetching transcript: ${response.status}`);
            return;
          }
        } catch (fetchError) {
          console.error(`Network error fetching transcript: ${fetchError.message}`);
          return;
        }
        
        const entries = await response.json();
        console.log(`Fetched ${entries?.length || 0} transcript entries`);
        
        if (entries && Array.isArray(entries) && entries.length > 0) {
          // Sort entries by timestamp to ensure correct ordering
          const sortedEntries = [...entries].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          
          // Compare with existing entries to avoid unnecessary re-renders
          const existingIds = new Set(transcriptEntries.map(e => e.id));
          const hasNewEntries = sortedEntries.some(e => !existingIds.has(e.id)) || 
                               sortedEntries.length !== transcriptEntries.length;
          
          if (hasNewEntries) {
            console.log(`Setting ${sortedEntries.length} sorted transcript entries from API (${sortedEntries.length - transcriptEntries.length} new)`);
            // Set entries from API
            setTranscriptEntries(sortedEntries);
            setShowingPlaceholder(false);
          } else {
            console.log('No new transcript entries found');
          }
        } else if (session?.transcript && transcriptEntries.length === 0) {
          // If no entries but we have a legacy transcript, parse it
          const parsedEntries = formatLegacyTranscript(session.transcript);
          setTranscriptEntries(parsedEntries);
          setShowingPlaceholder(false);
          console.log(`Set ${parsedEntries.length} parsed transcript entries from legacy transcript`);
        } else {
          // Check session storage as last resort, but only if we have no entries yet
          if (transcriptEntries.length === 0) {
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
                  setShowingPlaceholder(false);
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
        }
      } catch (error) {
        console.error('Error fetching transcript entries:', error);
      }
    }
    
    async function loadSessionData(force: boolean = false) {
      try {
        if (!force) {
          setLoading(true);
        }
        
        let response;
        try {
          response = await fetch(`/api/sessions/${sessionId}`, { 
            cache: 'no-store', // Use no-store instead of no-cache
            headers: {
              'X-Fetch-Time': Date.now().toString() // Add timestamp to prevent caching
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch session: ${response.status}`);
          }
        } catch (fetchError) {
          console.error(`Network error fetching session: ${fetchError.message}`);
          throw new Error(`Network error: ${fetchError.message}`);
        }
        
        const sessionData = await response.json();
        
        // Update session data
        setSession(sessionData);
        
        // Update duration if this is a completed session
        if (sessionData.status !== 'active') {
          setSessionDuration(sessionData.duration || 0);
        }
        
        // If session has transcript entries directly, use them
        if (sessionData.transcriptEntries?.length > 0) {
          setTranscriptEntries(sessionData.transcriptEntries);
          setShowingPlaceholder(false);
        } else {
          // Otherwise, load transcript entries separately
          await loadTranscript(force);
        }
      } catch (err) {
        console.error('Error fetching session data:', err);
        setError('Could not load session details');
      } finally {
        if (!force) {
          setLoading(false);
          // If we still have no entries by now, don't show a placeholder anymore
          setTimeout(() => {
            setShowingPlaceholder(false);
          }, 300);
        }
      }
    }
    
    // Initial data loading
    if (initialSession) {
      // If we have initial session data, just load transcript
      loadTranscript(true);
    } else if (sessionId) {
      // Otherwise load everything
      loadSessionData(true);
    }
    
    // Set up polling for real-time updates if this is an active session
    if (sessionId) {
      // Check if session is active before setting up polling
      const checkSessionStatus = async () => {
        try {
          let response;
          try {
            response = await fetch(`/api/sessions/${sessionId}`, {
              cache: 'no-store'
            });
          } catch (fetchError) {
            console.error('Network error checking session status:', fetchError);
            return; // Exit early on network errors
          }
          
          if (response.ok) {
            const data = await response.json();
            
            // For active sessions, set up polling
            if (data.status === 'active') {
              console.log('Setting up real-time polling for active session');
              
              // Clear any existing interval
              if (transcriptPollingInterval) {
                clearInterval(transcriptPollingInterval);
              }
              
              // Set up new polling interval - every 5 seconds
              const interval = setInterval(() => {
                console.log('Polling for transcript updates');
                
                // Use try-catch to prevent interval from being disrupted by errors
                try {
                  loadTranscript(false).catch(err => {
                    console.warn('Error during transcript polling:', err);
                    // Continue with interval despite errors
                  });
                  
                  // Also refresh session data occasionally to check duration/status
                  loadSessionData(true).catch(err => {
                    console.warn('Error during session data polling:', err);
                    // Continue with interval despite errors
                  });
                } catch (pollingError) {
                  console.error('Error in polling interval:', pollingError);
                  // Continue with interval despite errors
                }
              }, 5000) as unknown as NodeJS.Timeout;
              
              setTranscriptPollingInterval(interval);
            } else if (transcriptPollingInterval) {
              // For non-active sessions, clear any existing polling
              console.log('Clearing polling for non-active session');
              clearInterval(transcriptPollingInterval);
              setTranscriptPollingInterval(null);
            }
          }
        } catch (error) {
          console.error('Error checking session status:', error);
        }
      };
      
      // Initial check
      checkSessionStatus();
      
      // Clean up polling on unmount
      return () => {
        if (transcriptPollingInterval) {
          console.log('Cleaning up transcript polling interval');
          clearInterval(transcriptPollingInterval);
        }
      };
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
        <div className="bg-gradient-to-r from-blue-500 to-blue-600/90 p-5">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Session Transcript
          </h2>
        </div>
        <div className="p-4 sm:p-5 min-h-[300px]">
          <div className="flex flex-col justify-center items-center h-full">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
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
        <div className="bg-gradient-to-r from-blue-500 to-blue-600/90 p-5">
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
                    opacity: [0.5, 0.8, 0.5] as any, 
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
            }) as any}
          </motion.div>
        </div>
      </div>
    );
  }

  // Process entries - extract all actual conversation parts
  let initialFiltered = [];
  
  console.log(`Processing ${transcriptEntries.length} transcript entries`);
  
  // First, check if we have any entries
  if (transcriptEntries.length === 0) {
    console.log('No transcript entries found');
    // Add placeholder to ensure UI shows something
    initialFiltered.push({
      id: 'placeholder',
      sessionId: session.id,
      speaker: 'system',
      text: 'No conversation data is available for this session.',
      timestamp: new Date().toISOString(),
      isFinal: true
    });
  } else {
    console.log('Found transcript entries, processing...');
    
    for (const entry of transcriptEntries) {
      console.log(`Processing entry: speaker=${entry?.speaker}, text preview=${entry?.text?.substring(0, 50)}`);
      
      // Skip null or empty entries
      if (!entry || !entry.text || !entry.text.trim()) {
        console.log('Skipping empty entry');
        continue;
      }
      
      // Special case: system notifications
      if (entry.speaker === 'system') {
        console.log('Found system entry');
        initialFiltered.push(entry);
        continue;
      }
      
      // If this entry contains a summary and transcript, extract just the transcript part
      if (entry.text.includes("I've reviewed my notes from our previous sessions") && 
          entry.text.includes("Full conversation transcript:")) {
        
        console.log('Found combined summary+transcript entry, extracting transcript part');
        
        // Extract only the part after "Full conversation transcript:"
        const fullTranscriptPart = entry.text.split("Full conversation transcript:")[1];
        
        if (fullTranscriptPart && fullTranscriptPart.trim()) {
          // Process the transcript text into individual entries
          const lines = fullTranscriptPart.trim().split("\n");
          console.log(`Extracted ${lines.length} lines from transcript part`);
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line === "-----") continue;
            
            // Try to parse each line as a speaker: text format
            const match = line.match(/^([^:]+):\s*(.+)$/);
            if (match) {
              const speaker = match[1].trim().toLowerCase();
              const text = match[2].trim();
              
              if (text) {
                initialFiltered.push({
                  id: `extracted-${entry.id}-${i}`,
                  sessionId: entry.sessionId,
                  speaker: speaker === 'client' || speaker === 'you' ? 'user' : 'assistant',
                  text: text,
                  timestamp: new Date(Date.now() - (lines.length - i) * 10000).toISOString(),
                  isFinal: true
                });
              }
            }
          }
        }
      } 
      // If entry contains only session summary but no conversation - filter it out
      else if (entry.text.includes("I've reviewed my notes from our previous sessions") ||
          entry.text.includes("Key client concerns discussed:") ||
          entry.text.includes("Guidance I provided:")) {
        
        console.log('Found summary-only entry - excluding');
      }
      // Regular conversation entry - include as is
      else {
        console.log('Found regular conversation entry - including');
        initialFiltered.push(entry);
      }
    }
    
    console.log(`Filtered to ${initialFiltered.length} entries`);
    
    // If all entries were filtered out, add placeholder
    if (initialFiltered.length === 0) {
      console.log('No valid entries after filtering - adding placeholder');
      initialFiltered.push({
        id: 'placeholder',
        sessionId: session.id,
        speaker: 'system',
        text: 'No conversation data available after filtering summaries. Try refreshing or creating a new session.',
        timestamp: new Date().toISOString(),
        isFinal: true
      });
    }
  }
  
  // Sort by timestamp first
  const sortedEntries = [...initialFiltered].sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  })
  
  // Enhanced deduplication to handle partial/progressive text with improved similarity detection
  let filteredEntriesArray = [];
  const speakerTexts = new Map();
  
  // Helper functions for text normalization and comparison
  const normalizeText = (text) => {
    if (!text) return '';
    return text.toLowerCase().trim().replace(/\s+/g, ' ');
  };
  
  const isSignificantlyDifferent = (text1, text2) => {
    // Normalized versions for comparison
    const norm1 = normalizeText(text1);
    const norm2 = normalizeText(text2);
    
    // Check if one string contains most of the other
    const containsSignificantPart = (a, b) => {
      // If a is a very short fragment, it's probably just the beginning of b
      if (a.split(' ').length <= 3 && b.includes(a)) {
        return true;
      }
      
      // If a contains more than 80% of b's words, consider them similar
      const aWords = new Set(a.split(' '));
      const bWords = b.split(' ');
      const commonWords = bWords.filter(word => aWords.has(word));
      
      return commonWords.length >= bWords.length * 0.8;
    };
    
    // Check both directions of containment
    return !containsSignificantPart(norm1, norm2) && !containsSignificantPart(norm2, norm1);
  };
  
  // Process entries in chronological order
  sortedEntries.forEach(entry => {
    const speaker = entry.speaker.toLowerCase();
    const text = entry.text.trim();
    
    // Skip empty entries
    if (!text) return;
    
    // Get existing entries for this speaker
    const speakerHistory = speakerTexts.get(speaker) || [];
    
    // Check if this text is redundant with any previous entries
    let isRedundant = false;
    let replacedEntries = [];
    
    // Check against recent messages from this speaker
    for (let i = speakerHistory.length - 1; i >= Math.max(0, speakerHistory.length - 10); i--) {
      const prevEntry = speakerHistory[i];
      const prevText = prevEntry.text;
      
      // CASE 1: Current text is completely contained in a previous entry - skip it
      if (normalizeText(prevText).includes(normalizeText(text))) {
        isRedundant = true;
        break;
      }
      
      // CASE 2: Previous text is completely contained in current text - replace it
      if (normalizeText(text).includes(normalizeText(prevText))) {
        replacedEntries.push({
          index: i,
          id: prevEntry.id
        });
        continue;
      }
      
      // CASE 3: Check for beginning fragments (common with voice transcription)
      const normText = normalizeText(text);
      const normPrevText = normalizeText(prevText);
      
      // Beginning fragments: one message starts with the same words as another
      const isBeginningFragment = (
        (normText.length < normPrevText.length * 0.5 && normPrevText.startsWith(normText)) ||
        (normPrevText.length < normText.length * 0.5 && normText.startsWith(normPrevText))
      );
      
      if (isBeginningFragment) {
        // If current text is shorter, skip it in favor of the more complete message
        if (text.length < prevText.length) {
          isRedundant = true;
          break;
        } else {
          // Current text is more complete, replace the shorter version
          replacedEntries.push({
            index: i,
            id: prevEntry.id
          });
          continue;
        }
      }
      
      // CASE 4: Check for semantically similar content
      if (!isSignificantlyDifferent(text, prevText)) {
        // Keep the longer message
        if (text.length >= prevText.length) {
          // Current is more complete, replace the shorter one
          replacedEntries.push({
            index: i,
            id: prevEntry.id
          });
        } else {
          // Previous is more complete, current is redundant
          isRedundant = true;
          break;
        }
      }
    }
    
    // Skip if this entry is redundant with existing messages
    if (isRedundant) return;
    
    // Remove entries that this one replaces
    if (replacedEntries.length > 0) {
      // Sort indices in descending order to avoid shifting
      replacedEntries.sort((a, b) => b.index - a.index);
      
      for (const replaced of replacedEntries) {
        // Remove from speaker history
        speakerHistory.splice(replaced.index, 1);
        
        // Remove from filtered list if present
        const indexInFiltered = filteredEntriesArray.findIndex(e => e.id === replaced.id);
        if (indexInFiltered >= 0) {
          filteredEntriesArray.splice(indexInFiltered, 1);
        }
      }
    }
    
    // Add this entry to speaker history
    speakerHistory.push({
      id: entry.id,
      text: text
    });
    
    // Update speaker map
    speakerTexts.set(speaker, speakerHistory);
    
    // Add to our filtered list
    filteredEntriesArray.push(entry);
  })
  
  // Final pass - group messages by conversation position to catch any remaining redundancies
  const finalEntries = [];
  const conversationGroups = new Map();
  
  // Group messages by approximate position in conversation
  filteredEntriesArray.forEach((entry, idx) => {
    const speaker = entry.speaker.toLowerCase();
    // Group by speaker and rough position in conversation flow
    const key = `${speaker}-${Math.floor(idx / 2)}`;
    
    if (!conversationGroups.has(key)) {
      conversationGroups.set(key, []);
    }
    conversationGroups.get(key).push(entry);
  });
  
  // For each group, keep only the most complete message
  conversationGroups.forEach(group => {
    if (group.length === 1) {
      finalEntries.push(group[0]);
      return;
    }
    
    // Prefer longer messages as they're typically more complete
    group.sort((a, b) => b.text.length - a.text.length);
    finalEntries.push(group[0]);
  });
  
  // Sort by timestamp to maintain conversation flow
  finalEntries.sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  });
  
  // Use the final filtered list as our result
  const filteredEntries = finalEntries;
  
  // If still no valid entries, show placeholder
  const displayEntries = filteredEntries.length > 0 
    ? filteredEntries 
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
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Session Transcript
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-black">
            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {format(new Date(session.date), 'PPP')}
          </span>
          
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-black">
            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {session.status === 'active' ? (
              <span className="flex items-center">
                {sessionDuration} minutes
                <span className="ml-1 h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span>
              </span>
            ) : (
              `${session.duration} minutes`
            )}
          </span>
          
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-black">
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
                        ? 'bg-gradient-to-r from-blue-500/10 to-blue-500/5 text-black border border-indigo-100' 
                        : entry.speaker === 'system'
                          ? 'bg-gray-100 text-gray-600 border border-gray-200'
                          : 'bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 text-black/90 border border-gray-100'
                    }`}
                  >
                    {entry.speaker !== 'system' && (
                      <div className={`text-xs font-medium mb-1 flex items-center ${
                        isUser ? 'text-green-600/90' : 'text-stone-700'
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
            }) as any}
          </motion.div>
        ) : (
          <div className="text-center py-8">
            <div className="bg-indigo-50 rounded-lg p-5 inline-block">
              <svg 
                className="h-10 w-10 text-blue-500 mx-auto mb-2" 
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
              <p className="text-blue-600 font-medium">No transcript available</p>
              <p className="text-blue-500 text-sm mt-1">This session does not have any recorded conversation yet.</p>
            </div>
          </div>
        )}
      </div>
      
    </div>
  )
}