'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { 
  TranscriptEntry,
  ConversationMetadata,
  ExtendedVapi
} from '@/types/therapy-session'
import { 
  VapiMessage,
  isTranscriptMessage,
  isModelOutputMessage,
  VapiConversationUpdateMessage
} from '@/types/vapi'
import { 
  TRANSCRIPT_DEBOUNCE_MS
} from '@/lib/therapy-session/constants'
import { addTranscriptEntry } from '@/lib/transcript-service-optimized'
import { createConversationHash } from '@/lib/therapy-session/utils'
import { 
  getTranscriptStrategy,
  logTranscriptStrategy,
  shouldSaveTranscript,
  shouldCalculateMetrics,
  markTranscriptSource
} from '@/lib/vapi/transcript-strategy'
import { safeSessionStorage } from '@/lib/safe-session-storage'

// Hook configuration interface
interface UseTranscriptHandlerOptions {
  sessionId: string | null
  onTranscriptUpdate?: (entries: TranscriptDisplayEntry[]) => void
  onMetricsUpdate?: (metrics: { userWords: number; assistantWords: number }) => void
  onError?: (error: Error) => void
}

// Display entry for UI with better structure
interface TranscriptDisplayEntry {
  id: string
  speaker: 'user' | 'assistant'
  text: string
  timestamp: string
  isFinal: boolean
  isPartial?: boolean
}

// Hook return type
interface UseTranscriptHandlerReturn {
  // State
  transcriptEntries: TranscriptDisplayEntry[]
  isProcessingAssistant: boolean
  isProcessingUser: boolean
  
  // Methods
  handleVapiMessage: (message: VapiMessage, vapiInstance: ExtendedVapi | null) => Promise<void>
  clearTranscripts: () => void
  recoverTranscriptsFromStorage: () => TranscriptEntry[]
  saveTranscriptBackup: () => void
  
  // Debug info
  getBufferState: () => { 
    assistantBuffer: string; 
    userBuffer: string;
    partialTranscripts: { user: string[]; assistant: string[] }
  }
}

/**
 * Enhanced transcript handler with better partial message handling
 */
export function useTranscriptHandlerFixed(options: UseTranscriptHandlerOptions): UseTranscriptHandlerReturn {
  const { sessionId, onTranscriptUpdate, onMetricsUpdate, onError } = options
  
  // Buffer for transcripts that arrive before sessionId is available
  const pendingTranscriptsRef = useRef<TranscriptDisplayEntry[]>([])
  
  // Get transcript strategy
  const strategyRef = useRef(getTranscriptStrategy())
  
  // Log strategy on mount
  useEffect(() => {
    if (sessionId) {
      logTranscriptStrategy(sessionId)
    }
  }, [sessionId])
  
  // UI state - structured transcript entries
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptDisplayEntry[]>([])
  
  // Processing state
  const [isProcessingAssistant, setIsProcessingAssistant] = useState(false)
  const [isProcessingUser, setIsProcessingUser] = useState(false)
  
  // Enhanced buffers for better partial handling
  const partialBuffersRef = useRef<{
    user: string[]
    assistant: string[]
  }>({ user: [], assistant: [] })
  
  // Final message buffers
  const finalBuffersRef = useRef<{
    user: string
    assistant: string
  }>({ user: '', assistant: '' })
  
  // Debounce timers
  const assistantTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const userTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Track last message IDs to prevent duplicates
  const lastMessageIdsRef = useRef<{
    user: string | null
    assistant: string | null
  }>({ user: null, assistant: null })
  
  // Conversation deduplication
  const lastConversationHashRef = useRef<string | null>(null)
  
  // Track if component is mounted to prevent race conditions
  const isMountedRef = useRef(true)
  
  // Generate unique ID for transcript entries
  const generateTranscriptId = useCallback((speaker: string, text: string, timestamp: string) => {
    return `${speaker}-${timestamp}-${text.substring(0, 20).replace(/\s/g, '-')}`
  }, [])
  
  // Process and save transcript entry
  const processTranscriptEntry = useCallback(async (
    speaker: 'user' | 'assistant',
    text: string,
    isFinal: boolean = true
  ) => {
    if (!text.trim()) return
    
    const timestamp = new Date().toISOString()
    const entryId = generateTranscriptId(speaker, text, timestamp)
    
    // Create display entry
    const displayEntry: TranscriptDisplayEntry = {
      id: entryId,
      speaker,
      text: text.trim(),
      timestamp,
      isFinal,
      isPartial: !isFinal
    }
    
    // If no sessionId yet, buffer the transcript
    if (!sessionId) {
      console.log(`📦 Buffering ${speaker} transcript until sessionId available`)
      pendingTranscriptsRef.current.push(displayEntry)
      
      // Still update UI
      if (isMountedRef.current) {
        setTranscriptEntries(prev => {
          const updated = [...prev, displayEntry]
          onTranscriptUpdate?.(updated)
          return updated
        })
      }
      return
    }
    
    try {
      // Update UI immediately
      if (isMountedRef.current) {
        setTranscriptEntries(prev => {
          // Remove any partial messages for this speaker when adding final
          const filtered = isFinal 
            ? prev.filter(entry => !(entry.speaker === speaker && entry.isPartial))
            : prev
          
          const updated = [...filtered, displayEntry]
          onTranscriptUpdate?.(updated)
          return updated
        })
      }
      
      // Save to session storage
      try {
        const transcriptKey = `transcript-${sessionId}`
        const existingData = safeSessionStorage.getItem(transcriptKey)
        const existingEntries: TranscriptDisplayEntry[] = existingData ? JSON.parse(existingData) : []
        
        // Only save final messages to storage
        if (isFinal) {
          existingEntries.push(displayEntry)
          safeSessionStorage.setItem(transcriptKey, JSON.stringify(existingEntries))
        }
      } catch (storageError) {
        console.warn('Failed to save to session storage:', storageError)
      }
      
      // Save to database (only final messages)
      if (isFinal && shouldSaveTranscript('realtime')) {
        const transcriptData = markTranscriptSource({
          sessionId,
          speaker,
          text: text.trim(),
          timestamp,
          isFinal: true
        }, 'realtime')
        
        await addTranscriptEntry(transcriptData)
        console.log(`✅ Added ${speaker} transcript to batch queue`)
      }
      
      // Update metrics
      if (isFinal) {
        const wordCount = text.split(' ').filter(word => word.length > 0).length
        onMetricsUpdate?.({
          userWords: speaker === 'user' ? wordCount : 0,
          assistantWords: speaker === 'assistant' ? wordCount : 0
        })
      }
      
    } catch (error) {
      console.error(`Error processing ${speaker} message:`, error)
      onError?.(error as Error)
    }
  }, [sessionId, onTranscriptUpdate, onMetricsUpdate, onError, generateTranscriptId])
  
  // Process consolidated messages with better partial handling
  const processFinalMessage = useCallback(async (speaker: 'user' | 'assistant') => {
    const buffer = speaker === 'user' ? finalBuffersRef.current.user : finalBuffersRef.current.assistant
    
    if (buffer.trim()) {
      await processTranscriptEntry(speaker, buffer, true)
      
      // Clear the buffer
      if (speaker === 'user') {
        finalBuffersRef.current.user = ''
      } else {
        finalBuffersRef.current.assistant = ''
      }
    }
  }, [processTranscriptEntry])
  
  // Handle VAPI messages with enhanced processing
  const handleVapiMessage = useCallback(async (message: VapiMessage, vapiInstance: ExtendedVapi | null) => {
    try {
      // Handle transcript messages (user speech-to-text)
      if (isTranscriptMessage(message) && message.transcript) {
        const transcript = message.transcript
        const isFinal = message.transcriptType === 'final'
        
        // VAPI transcript messages are always from the user
        if (isFinal) {
          // Add to final buffer
          finalBuffersRef.current.user += (finalBuffersRef.current.user ? ' ' : '') + transcript
          
          // Clear existing timer
          if (userTimeoutRef.current) {
            clearTimeout(userTimeoutRef.current)
          }
          
          setIsProcessingUser(true)
          
          // Debounce final processing
          userTimeoutRef.current = setTimeout(async () => {
            await processFinalMessage('user')
            setIsProcessingUser(false)
          }, TRANSCRIPT_DEBOUNCE_MS)
          
        } else {
          // Handle partial transcripts - show immediately in UI
          partialBuffersRef.current.user.push(transcript)
          const partialText = partialBuffersRef.current.user.join(' ')
          
          await processTranscriptEntry('user', partialText, false)
        }
      }
      
      // Handle model output messages (assistant responses)
      if (isModelOutputMessage(message)) {
        const text = message.output
        
        // Add to assistant buffer
        finalBuffersRef.current.assistant += (finalBuffersRef.current.assistant ? ' ' : '') + text
        
        // Clear existing timer
        if (assistantTimeoutRef.current) {
          clearTimeout(assistantTimeoutRef.current)
        }
        
        setIsProcessingAssistant(true)
        
        // Debounce processing
        assistantTimeoutRef.current = setTimeout(async () => {
          await processFinalMessage('assistant')
          setIsProcessingAssistant(false)
        }, TRANSCRIPT_DEBOUNCE_MS)
      }
      
      // Handle conversation update messages - for recovery
      if (message.type === 'conversation-update' && message.conversation) {
        const conversation = message.conversation as VapiConversationUpdateMessage['conversation']
        
        // Create hash to check for duplicates
        const conversationHash = createConversationHash(conversation)
        
        if (conversationHash === lastConversationHashRef.current) {
          console.log('⚠️ Duplicate conversation update detected, skipping')
          return
        }
        
        lastConversationHashRef.current = conversationHash
        
        // Process conversation history
        const existingIds = new Set(transcriptEntries.map(e => e.id))
        
        for (const msg of conversation) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            const timestamp = msg.timestamp || new Date().toISOString()
            const entryId = generateTranscriptId(msg.role, msg.content, timestamp)
            
            // Skip if already processed
            if (existingIds.has(entryId)) continue
            
            const displayEntry: TranscriptDisplayEntry = {
              id: entryId,
              speaker: msg.role as 'user' | 'assistant',
              text: msg.content,
              timestamp,
              isFinal: true
            }
            
            // Add to UI
            setTranscriptEntries(prev => {
              const updated = [...prev, displayEntry]
              onTranscriptUpdate?.(updated)
              return updated
            })
          }
        }
      }
      
    } catch (error) {
      console.error('Error handling VAPI message:', error)
      onError?.(error as Error)
    }
  }, [processTranscriptEntry, processFinalMessage, onTranscriptUpdate, onError, transcriptEntries, generateTranscriptId])
  
  // Clear transcripts
  const clearTranscripts = useCallback(() => {
    setTranscriptEntries([])
    finalBuffersRef.current = { user: '', assistant: '' }
    partialBuffersRef.current = { user: [], assistant: [] }
    
    // Clear timers
    if (assistantTimeoutRef.current) {
      clearTimeout(assistantTimeoutRef.current)
      assistantTimeoutRef.current = null
    }
    if (userTimeoutRef.current) {
      clearTimeout(userTimeoutRef.current)
      userTimeoutRef.current = null
    }
    
    // Clear flags
    setIsProcessingAssistant(false)
    setIsProcessingUser(false)
    
    // Clear tracking
    lastConversationHashRef.current = null
    lastMessageIdsRef.current = { user: null, assistant: null }
  }, [])
  
  // Recover transcripts from storage
  const recoverTranscriptsFromStorage = useCallback((): TranscriptEntry[] => {
    if (!sessionId) return []
    
    try {
      const transcriptKey = `transcript-${sessionId}`
      const savedData = safeSessionStorage.getItem(transcriptKey)
      
      if (!savedData) return []
      
      const displayEntries: TranscriptDisplayEntry[] = JSON.parse(savedData)
      
      // Convert to TranscriptEntry format
      return displayEntries.map(entry => ({
        id: entry.id,
        sessionId: sessionId,
        speaker: entry.speaker,
        text: entry.text,
        timestamp: entry.timestamp,
        isFinal: entry.isFinal
      }))
      
    } catch (error) {
      console.error('Error recovering transcripts:', error)
      return []
    }
  }, [sessionId])
  
  // Save transcript backup
  const saveTranscriptBackup = useCallback(() => {
    if (!sessionId || transcriptEntries.length === 0) return
    
    try {
      const backupKey = `transcript-backup-${sessionId}-${Date.now()}`
      safeSessionStorage.setItem(backupKey, JSON.stringify(transcriptEntries))
      console.log('📦 Transcript backup saved')
    } catch (error) {
      console.error('Failed to save transcript backup:', error)
    }
  }, [sessionId, transcriptEntries])
  
  // Process pending transcripts when sessionId becomes available
  useEffect(() => {
    if (sessionId && pendingTranscriptsRef.current.length > 0) {
      console.log(`📤 Processing ${pendingTranscriptsRef.current.length} pending transcripts`)
      
      pendingTranscriptsRef.current.forEach(async (entry) => {
        await processTranscriptEntry(entry.speaker, entry.text, entry.isFinal)
      })
      
      pendingTranscriptsRef.current = []
    }
  }, [sessionId, processTranscriptEntry])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      clearTranscripts()
    }
  }, [clearTranscripts])
  
  // Get buffer state for debugging
  const getBufferState = useCallback(() => ({
    assistantBuffer: finalBuffersRef.current.assistant,
    userBuffer: finalBuffersRef.current.user,
    partialTranscripts: {
      user: [...partialBuffersRef.current.user],
      assistant: [...partialBuffersRef.current.assistant]
    }
  }), [])
  
  return {
    transcriptEntries,
    isProcessingAssistant,
    isProcessingUser,
    handleVapiMessage,
    clearTranscripts,
    recoverTranscriptsFromStorage,
    saveTranscriptBackup,
    getBufferState
  }
}