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
  isModelOutputMessage
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

// Hook configuration interface
interface UseTranscriptHandlerOptions {
  sessionId: string | null
  onTranscriptUpdate?: (chunks: string[]) => void
  onMetricsUpdate?: (metrics: { userWords: number; assistantWords: number }) => void
  onError?: (error: Error) => void
}

// Hook return type
interface UseTranscriptHandlerReturn {
  // State
  transcriptChunks: string[]
  isProcessingAssistant: boolean
  isProcessingUser: boolean
  
  // Methods
  handleVapiMessage: (message: VapiMessage, vapiInstance: ExtendedVapi | null) => Promise<void>
  clearTranscripts: () => void
  recoverTranscriptsFromStorage: () => TranscriptEntry[]
  saveTranscriptBackup: () => void
  
  // Debug info
  getBufferState: () => { assistantBuffer: string; userBuffer: string }
}

/**
 * Custom hook for managing therapy session transcripts
 * Handles buffering, debouncing, storage, and persistence
 */
export function useTranscriptHandler(options: UseTranscriptHandlerOptions): UseTranscriptHandlerReturn {
  const { sessionId, onTranscriptUpdate, onMetricsUpdate, onError } = options
  
  // Get transcript strategy
  const strategyRef = useRef(getTranscriptStrategy())
  
  // Log strategy on mount
  useEffect(() => {
    if (sessionId) {
      logTranscriptStrategy(sessionId)
    }
  }, [sessionId])
  
  // UI state
  const [transcriptChunks, setTranscriptChunks] = useState<string[]>([])
  
  // Processing state
  const [isProcessingAssistant, setIsProcessingAssistant] = useState(false)
  const [isProcessingUser, setIsProcessingUser] = useState(false)
  
  // Buffers for transcript fragments
  const assistantBufferRef = useRef<string>('')
  const userBufferRef = useRef<string>('')
  
  // Debounce timers
  const assistantTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const userTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Conversation deduplication
  const lastConversationMetadataRef = useRef<ConversationMetadata | null>(null)
  
  // Track if component is mounted to prevent race conditions
  const isMountedRef = useRef(true)
  
  // Process consolidated assistant message
  const processConsolidatedAssistantMessage = useCallback(async (consolidatedText: string) => {
    if (!sessionId || !consolidatedText.trim()) return
    
    try {
      console.log('🤖 Processing consolidated assistant message')
      
      // Save to session storage with error handling
      try {
        const timestamp = Date.now()
        const backupKey = `transcript-assistant-${sessionId}-${timestamp}`
        sessionStorage.setItem(backupKey, consolidatedText)
        
        // Also save with simpler key for easier recovery
        const transcriptKey = `transcript-${sessionId}`
        const existingTranscript = sessionStorage.getItem(transcriptKey) || ''
        const updatedTranscript = existingTranscript + 
          (existingTranscript ? '\n' : '') + 
          `AI: ${consolidatedText}`
        sessionStorage.setItem(transcriptKey, updatedTranscript)
      } catch (storageError) {
        console.warn('Failed to save to session storage:', storageError)
        // Continue processing even if storage fails
      }
      
      // Update UI only if component is still mounted
      if (isMountedRef.current) {
        const newChunk = `AI: ${consolidatedText}`
        setTranscriptChunks(prev => {
          const updated = [...prev, newChunk]
          onTranscriptUpdate?.(updated)
          return updated
        })
      }
      
      // Save to database with retry logic (only if strategy allows)
      if (sessionId && shouldSaveTranscript('realtime')) {
        console.log(`🔄 Sending assistant transcript to batching service: "${consolidatedText.substring(0, 50)}..."`)
        
        let retries = 3
        while (retries > 0) {
          try {
            const transcriptData = markTranscriptSource({
              sessionId,
              speaker: 'assistant',
              text: consolidatedText,
              timestamp: new Date().toISOString(),
              isFinal: true
            }, 'realtime')
            
            await addTranscriptEntry(transcriptData)
            console.log('✅ Added assistant transcript to batch queue')
            break
          } catch (error) {
            retries--
            if (retries === 0) {
              console.error('Failed to save transcript after 3 attempts:', error)
              throw error
            }
            console.warn(`Transcript save failed, retrying... (${retries} attempts left)`)
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      } else if (sessionId && !shouldSaveTranscript('realtime')) {
        console.log('📋 Real-time transcript saving disabled by strategy - buffering for UI only')
      }
      
      // Update metrics
      const wordCount = consolidatedText.split(' ').filter(word => word.length > 0).length
      onMetricsUpdate?.({
        userWords: 0,
        assistantWords: wordCount
      })
      
    } catch (error) {
      console.error('Error processing assistant message:', error)
      onError?.(error as Error)
    }
  }, [sessionId, onTranscriptUpdate, onMetricsUpdate, onError])
  
  // Process consolidated user message
  const processConsolidatedUserMessage = useCallback(async (consolidatedText: string) => {
    if (!sessionId || !consolidatedText.trim()) return
    
    try {
      console.log('👤 Processing consolidated user message')
      
      // Save to session storage with error handling
      try {
        const transcriptKey = `transcript-${sessionId}`
        const existingTranscript = sessionStorage.getItem(transcriptKey) || ''
        const updatedTranscript = existingTranscript + 
          (existingTranscript ? '\n' : '') + 
          `You: ${consolidatedText}`
        sessionStorage.setItem(transcriptKey, updatedTranscript)
      } catch (storageError) {
        console.warn('Failed to save to session storage:', storageError)
        // Continue processing even if storage fails
      }
      
      // Update UI only if component is still mounted
      if (isMountedRef.current) {
        const newChunk = `You: ${consolidatedText}`
        setTranscriptChunks(prev => {
          const updated = [...prev, newChunk]
          onTranscriptUpdate?.(updated)
          return updated
        })
      }
      
      // Save to database with retry logic (only if strategy allows)
      if (sessionId && shouldSaveTranscript('realtime')) {
        console.log(`🔄 Sending user transcript to batching service: "${consolidatedText.substring(0, 50)}..."`)
        
        let retries = 3
        while (retries > 0) {
          try {
            const transcriptData = markTranscriptSource({
              sessionId,
              speaker: 'user',
              text: consolidatedText,
              timestamp: new Date().toISOString(),
              isFinal: true
            }, 'realtime')
            
            await addTranscriptEntry(transcriptData)
            console.log('✅ Added user transcript to batch queue')
            break
          } catch (error) {
            retries--
            if (retries === 0) {
              console.error('Failed to save transcript after 3 attempts:', error)
              throw error
            }
            console.warn(`Transcript save failed, retrying... (${retries} attempts left)`)
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      } else if (sessionId && !shouldSaveTranscript('realtime')) {
        console.log('📋 Real-time transcript saving disabled by strategy - buffering for UI only')
      }
      
      // Update metrics
      const wordCount = consolidatedText.split(' ').filter(word => word.length > 0).length
      onMetricsUpdate?.({
        userWords: wordCount,
        assistantWords: 0
      })
      
    } catch (error) {
      console.error('Error processing user message:', error)
      onError?.(error as Error)
    }
  }, [sessionId, onTranscriptUpdate, onMetricsUpdate, onError])
  
  // Handle VAPI messages
  const handleVapiMessage = useCallback(async (message: VapiMessage, vapiInstance: ExtendedVapi | null) => {
    try {
      // Log message type for debugging
      console.log(`📨 VAPI Message: ${message.type}`)
      
      // Handle transcript messages (speech-to-text)
      if (isTranscriptMessage(message) && message.transcript) {
        // Transcript is a string, not an object
        const transcript = message.transcript
        const role = message.role
        const isFinal = message.transcriptType === 'final'
        
        if (role === 'user') {
          // Buffer user messages
          if (isFinal) {
            userBufferRef.current += (userBufferRef.current ? ' ' : '') + transcript
            
            // Clear existing timer
            if (userTimeoutRef.current) {
              clearTimeout(userTimeoutRef.current)
            }
            
            // Set processing flag
            setIsProcessingUser(true)
            
            // Debounce processing
            userTimeoutRef.current = setTimeout(async () => {
              const consolidatedText = userBufferRef.current.trim()
              if (consolidatedText) {
                await processConsolidatedUserMessage(consolidatedText)
                userBufferRef.current = ''
              }
              setIsProcessingUser(false)
            }, TRANSCRIPT_DEBOUNCE_MS)
          }
        }
      }
      
      // Handle model output messages (text-to-speech)
      if (isModelOutputMessage(message) && message.role === 'assistant') {
        const text = message.output
        
        // Buffer assistant messages
        assistantBufferRef.current += (assistantBufferRef.current ? ' ' : '') + text
        
        // Clear existing timer
        if (assistantTimeoutRef.current) {
          clearTimeout(assistantTimeoutRef.current)
        }
        
        // Set processing flag
        setIsProcessingAssistant(true)
        
        // Debounce processing
        assistantTimeoutRef.current = setTimeout(async () => {
          const consolidatedText = assistantBufferRef.current.trim()
          if (consolidatedText) {
            await processConsolidatedAssistantMessage(consolidatedText)
            assistantBufferRef.current = ''
          }
          setIsProcessingAssistant(false)
        }, TRANSCRIPT_DEBOUNCE_MS)
      }
      
      // Handle conversation update messages - full conversation history
      if (message.type === 'conversation-update' && message.conversation) {
        const conversationMessages = message.conversation
        
        // Look for session ID in messages
        for (const msg of conversationMessages) {
          if (msg.role === 'system' || msg.role === 'assistant') {
            const sessionIdMatch = msg.content?.match(/Session ID: ([\w-]+)/)
            if (sessionIdMatch && vapiInstance) {
              const recoveredSessionId = sessionIdMatch[1]
              console.log(`📝 Recovered session ID from conversation: ${recoveredSessionId}`)
              vapiInstance._sessionId = recoveredSessionId
              break
            }
          }
        }
        
        // Check for duplicate conversations
        const conversationHash = createConversationHash(conversationMessages)
        const messageCount = conversationMessages.length
        const lastMessage = conversationMessages[conversationMessages.length - 1]
        const lastMessageContent = lastMessage?.content || ''
        
        const currentMetadata: ConversationMetadata = {
          hash: conversationHash,
          messageCount,
          lastMessageContent,
          timestamp: Date.now()
        }
        
        if (lastConversationMetadataRef.current) {
          const isDuplicate = 
            currentMetadata.hash === lastConversationMetadataRef.current.hash &&
            currentMetadata.messageCount === lastConversationMetadataRef.current.messageCount &&
            currentMetadata.lastMessageContent === lastConversationMetadataRef.current.lastMessageContent
          
          if (isDuplicate) {
            console.log('⚠️ Duplicate conversation update detected, skipping processing')
            return
          }
        }
        
        lastConversationMetadataRef.current = currentMetadata
        
        // Process new conversation messages into transcript entries
        const newMessages = conversationMessages.slice(transcriptChunks.length)
        for (const msg of newMessages) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            // Add to transcript chunks
            const formattedChunk = `${msg.role === 'assistant' ? 'AI' : 'You'}: ${msg.content}`
            setTranscriptChunks(prev => [...prev, formattedChunk])
            
            // Call the transcript update callback with the formatted chunk
            onTranscriptUpdate?.([...transcriptChunks, formattedChunk])
          }
        }
      }
      
    } catch (error) {
      console.error('Error handling VAPI message:', error)
      onError?.(error as Error)
    }
  }, [processConsolidatedAssistantMessage, processConsolidatedUserMessage, onError])
  
  // Clear transcripts
  const clearTranscripts = useCallback(() => {
    setTranscriptChunks([])
    assistantBufferRef.current = ''
    userBufferRef.current = ''
    
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
    
    // Clear metadata
    lastConversationMetadataRef.current = null
  }, [])
  
  // Recover transcripts from storage
  const recoverTranscriptsFromStorage = useCallback((): TranscriptEntry[] => {
    if (!sessionId) return []
    
    try {
      const transcriptKey = `transcript-${sessionId}`
      const savedTranscript = sessionStorage.getItem(transcriptKey)
      
      if (!savedTranscript) return []
      
      // Parse saved transcript into entries
      const lines = savedTranscript.split('\n')
      const entries: TranscriptEntry[] = []
      
      for (const line of lines) {
        if (line.startsWith('You: ')) {
          entries.push({
            speaker: 'user',
            text: line.substring(5),
            timestamp: new Date().toISOString(),
            isFinal: true
          })
        } else if (line.startsWith('AI: ')) {
          entries.push({
            speaker: 'assistant',
            text: line.substring(4),
            timestamp: new Date().toISOString(),
            isFinal: true
          })
        }
      }
      
      return entries
    } catch (error) {
      console.error('Error recovering transcripts:', error)
      return []
    }
  }, [sessionId])
  
  // Save transcript backup
  const saveTranscriptBackup = useCallback(() => {
    if (!sessionId || transcriptChunks.length === 0) return
    
    try {
      const backupKey = `transcript-backup-${sessionId}-${Date.now()}`
      sessionStorage.setItem(backupKey, JSON.stringify(transcriptChunks))
      console.log('💾 Transcript backup saved')
    } catch (error) {
      console.error('Error saving transcript backup:', error)
    }
  }, [sessionId, transcriptChunks])
  
  // Get buffer state (for debugging)
  const getBufferState = useCallback(() => ({
    assistantBuffer: assistantBufferRef.current,
    userBuffer: userBufferRef.current
  }), [])
  
  // Process any pending buffers when session ends
  useEffect(() => {
    isMountedRef.current = true
    
    return () => {
      isMountedRef.current = false
      
      // Clear all timers on unmount
      if (assistantTimeoutRef.current) {
        clearTimeout(assistantTimeoutRef.current)
      }
      if (userTimeoutRef.current) {
        clearTimeout(userTimeoutRef.current)
      }
      
      // Process any remaining buffered content synchronously
      const assistantText = assistantBufferRef.current.trim()
      const userText = userBufferRef.current.trim()
      
      // Create a promise to handle async saves with timeout
      const savePromises: Promise<void>[] = []
      
      if (assistantText && sessionId && shouldSaveTranscript('realtime')) {
        const transcriptData = markTranscriptSource({
          sessionId,
          speaker: 'assistant',
          text: assistantText,
          timestamp: new Date().toISOString(),
          isFinal: true
        }, 'realtime')
        
        savePromises.push(
          addTranscriptEntry(transcriptData).catch(error => {
            console.error('Failed to save assistant buffer on unmount:', error)
          })
        )
      }
      
      if (userText && sessionId && shouldSaveTranscript('realtime')) {
        const transcriptData = markTranscriptSource({
          sessionId,
          speaker: 'user',
          text: userText,
          timestamp: new Date().toISOString(),
          isFinal: true
        }, 'realtime')
        
        savePromises.push(
          addTranscriptEntry(transcriptData).catch(error => {
            console.error('Failed to save user buffer on unmount:', error)
          })
        )
      }
      
      // Use Promise.race with timeout to ensure cleanup completes
      if (savePromises.length > 0) {
        Promise.race([
          Promise.all(savePromises),
          new Promise(resolve => setTimeout(resolve, 2000)) // 2 second timeout
        ]).catch(error => {
          console.error('Error saving buffers on unmount:', error)
        })
      }
    }
  }, [sessionId])
  
  // Periodic backup
  useEffect(() => {
    if (!sessionId || transcriptChunks.length === 0) return
    
    const backupInterval = setInterval(() => {
      // Only backup if component is still mounted
      if (isMountedRef.current) {
        saveTranscriptBackup()
      }
    }, 60000) // Every minute
    
    return () => clearInterval(backupInterval)
  }, [sessionId, transcriptChunks.length, saveTranscriptBackup])
  
  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clear all pending timers
      if (userTimeoutRef.current) {
        clearTimeout(userTimeoutRef.current)
        userTimeoutRef.current = null
      }
      if (assistantTimeoutRef.current) {
        clearTimeout(assistantTimeoutRef.current)
        assistantTimeoutRef.current = null
      }
      // Clear buffers to prevent memory leaks
      userBufferRef.current = ''
      assistantBufferRef.current = ''
      lastConversationMetadataRef.current = null
    }
  }, [])
  
  return {
    // State
    transcriptChunks,
    isProcessingAssistant,
    isProcessingUser,
    
    // Methods
    handleVapiMessage,
    clearTranscripts,
    recoverTranscriptsFromStorage,
    saveTranscriptBackup,
    
    // Debug info
    getBufferState
  }
}