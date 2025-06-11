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
  
  // Process consolidated assistant message
  const processConsolidatedAssistantMessage = useCallback(async (consolidatedText: string) => {
    if (!sessionId || !consolidatedText.trim()) return
    
    try {
      console.log('🤖 Processing consolidated assistant message')
      
      // Save to session storage with multiple backup keys
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
      
      // Update UI
      const newChunk = `AI: ${consolidatedText}`
      setTranscriptChunks(prev => [...prev, newChunk])
      onTranscriptUpdate?.([...transcriptChunks, newChunk])
      
      // Save to database
      const transcriptEntry: TranscriptEntry = {
        speaker: 'assistant',
        text: consolidatedText,
        timestamp: new Date().toISOString(),
        isFinal: true,
        messageType: 'assistant',
        wordCount: consolidatedText.split(' ').filter(word => word.length > 0).length,
        characterCount: consolidatedText.length
      }
      
      await addTranscriptEntry(transcriptEntry)
      console.log('✅ Saved assistant transcript to database')
      
      // Update metrics
      const wordCount = transcriptEntry.wordCount || 0
      onMetricsUpdate?.({
        userWords: 0,
        assistantWords: wordCount
      })
      
    } catch (error) {
      console.error('Error processing assistant message:', error)
      onError?.(error as Error)
    }
  }, [sessionId, transcriptChunks, onTranscriptUpdate, onMetricsUpdate, onError])
  
  // Process consolidated user message
  const processConsolidatedUserMessage = useCallback(async (consolidatedText: string) => {
    if (!sessionId || !consolidatedText.trim()) return
    
    try {
      console.log('👤 Processing consolidated user message')
      
      // Save to session storage
      const transcriptKey = `transcript-${sessionId}`
      const existingTranscript = sessionStorage.getItem(transcriptKey) || ''
      const updatedTranscript = existingTranscript + 
        (existingTranscript ? '\n' : '') + 
        `You: ${consolidatedText}`
      sessionStorage.setItem(transcriptKey, updatedTranscript)
      
      // Update UI
      const newChunk = `You: ${consolidatedText}`
      setTranscriptChunks(prev => [...prev, newChunk])
      onTranscriptUpdate?.([...transcriptChunks, newChunk])
      
      // Save to database
      const transcriptEntry: TranscriptEntry = {
        speaker: 'user',
        text: consolidatedText,
        timestamp: new Date().toISOString(),
        isFinal: true,
        messageType: 'user',
        wordCount: consolidatedText.split(' ').filter(word => word.length > 0).length,
        characterCount: consolidatedText.length
      }
      
      await addTranscriptEntry(transcriptEntry)
      console.log('✅ Saved user transcript to database')
      
      // Update metrics
      const wordCount = transcriptEntry.wordCount || 0
      onMetricsUpdate?.({
        userWords: wordCount,
        assistantWords: 0
      })
      
    } catch (error) {
      console.error('Error processing user message:', error)
      onError?.(error as Error)
    }
  }, [sessionId, transcriptChunks, onTranscriptUpdate, onMetricsUpdate, onError])
  
  // Handle VAPI messages
  const handleVapiMessage = useCallback(async (message: VapiMessage, vapiInstance: ExtendedVapi | null) => {
    try {
      // Handle transcript messages (speech-to-text)
      if (isTranscriptMessage(message) && message.transcript) {
        const { speaker, text, isFinal } = message.transcript
        
        if (speaker === 'user') {
          // Buffer user messages
          if (isFinal) {
            userBufferRef.current += (userBufferRef.current ? ' ' : '') + text
            
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
      if (isModelOutputMessage(message) && message.model?.role === 'assistant') {
        const text = message.model.content
        
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
      
      // Handle session ID recovery from messages
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
    return () => {
      // Clear all timers on unmount
      if (assistantTimeoutRef.current) {
        clearTimeout(assistantTimeoutRef.current)
      }
      if (userTimeoutRef.current) {
        clearTimeout(userTimeoutRef.current)
      }
      
      // Process any remaining buffered content
      const assistantText = assistantBufferRef.current.trim()
      const userText = userBufferRef.current.trim()
      
      if (assistantText) {
        processConsolidatedAssistantMessage(assistantText)
      }
      if (userText) {
        processConsolidatedUserMessage(userText)
      }
    }
  }, [processConsolidatedAssistantMessage, processConsolidatedUserMessage])
  
  // Periodic backup
  useEffect(() => {
    if (!sessionId || transcriptChunks.length === 0) return
    
    const backupInterval = setInterval(saveTranscriptBackup, 60000) // Every minute
    
    return () => clearInterval(backupInterval)
  }, [sessionId, transcriptChunks.length, saveTranscriptBackup])
  
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