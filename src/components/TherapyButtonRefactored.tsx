'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useVapiSession } from '@/hooks/useVapiSession'
import { useSessionManagement } from '@/hooks/useSessionManagement'
import { useTranscriptHandler } from '@/hooks/useTranscriptHandler'
import { useButtonSound } from '@/hooks/useButtonSound'
import { useSupabaseRealTimeMetrics } from '@/hooks/useSupabaseRealTimeMetrics'
import { useSupabaseSessionState } from '@/hooks/useSupabaseSessionState'
import { useVapiMetricsBridge } from '@/hooks/useVapiMetricsBridge'
import { initializeSessionMetrics, cleanupSessionMetrics } from '@/lib/transcript-service-optimized'
import SessionDurationModal from './SessionDurationModal'
import FamilyMemberSelectionModal from './FamilyMemberSelectionModal'
import SessionTimer from './SessionTimer'
import VoiceWaveform from './VoiceWaveform'
import SessionTranscript from './SessionTranscript'
import { 
  CallControls, 
  CallHeader, 
  PausedOverlay,
  ErrorDisplay 
} from './therapy'
import type { TherapyType } from '@/types/therapy-session'

// Loading messages that cycle through
const loadingMessages = [
  "Finding the perfect space for our conversation...",
  "Preparing a comfortable environment...",
  "Setting up your private therapy session...",
  "Creating a safe space for you to share...",
  "Getting everything ready for our talk...",
  "Almost there... just a moment more..."
]

interface TherapyButtonRefactoredProps {
  therapyType: TherapyType
  disabled?: boolean
}

export function TherapyButtonRefactored({ 
  therapyType, 
  disabled = false 
}: TherapyButtonRefactoredProps) {
  const { user } = useAuth()
  const playClick = useButtonSound()
  
  // Core hooks for session management
  const vapi = useVapiSession({
    onCallStart: () => {
      console.log('[TherapyButton] VAPI call started - starting conversation timer')
      // Add session-active class to trigger background transition
      document.body.classList.add('session-active')
      // Trigger conversation start timing
      session.startConversationTimer()
    },
    onCallEnd: (reason?: string) => {
      console.log('[TherapyButton] VAPI call ended:', reason)
      // Remove session-active class when VAPI call ends
      document.body.classList.remove('session-active')
      // Conversation time tracking should automatically stop
    },
    onError: (error: unknown) => {
      console.error('[TherapyButton] VAPI error:', error)
      setError(error instanceof Error ? error.message : String(error))
    },
    onMessage: (message) => {
      // Forward VAPI messages to transcript handler
      transcript.handleVapiMessage(message, vapi.vapiInstanceRef.current)
    }
  })
  
  const session = useSessionManagement({
    userId: user?.id || '',
    therapyType,
    onSessionCreated: (sessionId: string) => {
      console.log('[TherapyButton] Session created:', sessionId)
      // Handle post-session actions
    },
    onSessionRecovered: (recoveredSession: any) => {
      console.log('[TherapyButton] Session recovered:', recoveredSession)
      // TODO: Implement session recovery modal when ActiveSessionFoundModal is needed
    }
  })
  
  const transcript = useTranscriptHandler({
    sessionId: session.sessionId || '',
    onTranscriptUpdate: (chunks) => {
      console.log('[TherapyButton] Transcript updated:', chunks.length, 'chunks')
    },
    onMetricsUpdate: (metrics) => {
      console.log('[TherapyButton] Transcript metrics:', metrics)
    }
  })

  // Use Supabase realtime for metrics (as consumer to receive updates)
  const metrics = useSupabaseRealTimeMetrics({
    sessionId: session.sessionId || '',
    userId: user?.id || '',
    role: 'consumer', // Always consumer - the bridge will be the provider
    onMetricsUpdate: (metrics) => {
      console.log('[TherapyButton] Metrics updated:', metrics)
    },
    onError: (error) => {
      console.error('[TherapyButton] Metrics error:', error)
    }
  })
  
  // Use Supabase realtime for session state management
  const sessionState = useSupabaseSessionState({
    sessionId: session.sessionId,
    userId: user?.id || '',
    onSessionUpdate: (updatedSession) => {
      console.log('[TherapyButton] Session updated:', updatedSession)
    }
  })
  
  // Bridge VAPI session with Supabase metrics broadcasting
  const { isBroadcasting } = useVapiMetricsBridge({
    sessionId: session.sessionId || '',
    userId: user?.id || '',
    vapiState: vapi.vapiState,
    transcriptChunks: transcript.transcriptChunks,
    therapyType: therapyType,
    sessionDuration: session.sessionDuration,
    enabled: !!(session.sessionId && vapi.vapiState.isActive && !session.isPaused)
  })
  
  // Local UI state
  const [showDurationModal, setShowDurationModal] = useState(false)
  const [showFamilySelectionModal, setShowFamilySelectionModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)
  
  // Family member management for family therapy
  const [familyMembers, setFamilyMembers] = useState<Array<{name: string, age: number, relation: string}>>([])
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<Array<{name: string, age: number, relation: string}>>([])
  
  // Mute functionality
  const [isMuted, setIsMuted] = useState(false)
  
  // Recovery deduplication
  const [isProcessingRecovery, setIsProcessingRecovery] = useState(false)
  const recoveryProcessedRef = useRef(new Set<string>())
  const lastRecoveryAttemptRef = useRef<number>(0)
  
  // Effect to cycle through loading messages
  useEffect(() => {
    if (!isLoading && !vapi.vapiState.isLoading) {
      setMessageIndex(0) // Reset when not loading
      return
    }

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [isLoading, vapi.vapiState.isLoading])
  
  // Listen for session recovery auto-start events
  useEffect(() => {
    const handleSessionRecoveryComplete = async (event: CustomEvent) => {
      const { sessionId, sessionData, detectedType, assistant } = event.detail
      const now = Date.now()
      
      // Prevent duplicate processing and React StrictMode double effects
      if (isProcessingRecovery || 
          recoveryProcessedRef.current.has(sessionId) ||
          (now - lastRecoveryAttemptRef.current) < 2000) { // 2 second cooldown
        console.log('⚠️ Recovery already processed or in cooldown for session:', sessionId)
        return
      }
      
      console.log('🔔 TherapyButtonRefactored: Session recovery event received:', event.detail)
      
      // Mark as processing immediately
      setIsProcessingRecovery(true)
      recoveryProcessedRef.current.add(sessionId)
      lastRecoveryAttemptRef.current = now
      
      // Clear auto-start data immediately to prevent loops
      sessionStorage.removeItem('session-auto-start')
      
      try {
        console.log('🚀 Auto-starting VAPI session for recovered session:', sessionId)
        
        // First recover the session state in session management
        try {
          await session.recoverSession({
            sessionId,
            sessionData,
            originalStart: sessionData.startTime || new Date().toISOString(),
            conversationTimeSeconds: sessionData.conversationTimeSeconds || 0,
            pauseInfo: sessionData.pauseInfo
          })
          
          // Initialize metrics calculator for recovered session
          if (user?.id) {
            initializeSessionMetrics(sessionId, user.id, detectedType as TherapyType, sessionData.duration || 60)
            console.log('📊 Initialized metrics calculator for recovered session:', sessionId)
          }
        } catch (recoveryError) {
          console.error('❌ Failed to recover session state:', recoveryError)
          throw new Error(`Session recovery failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`)
        }
        
        // Check if we should use inline configuration
        const useInlineConfig = process.env.NEXT_PUBLIC_USE_INLINE_ASSISTANT === 'true'
        
        if (useInlineConfig) {
          console.log('🎭 Using inline assistant configuration for recovery')
          
          // Fetch personalized inline configuration
          const response = await fetch(
            `/api/vapi/assistant?personalized=true&therapyType=${detectedType}&duration=${sessionData.duration || 60}&startTime=${encodeURIComponent(sessionData.startTime || new Date().toISOString())}`
          )
          
          if (!response.ok) {
            throw new Error('Failed to fetch assistant configuration for recovery')
          }
          
          const personalizedConfig = await response.json()
          
          // Remove ID and any non-VAPI fields to ensure clean inline configuration
          const { id: _id, metadata: _metadata, variableValues: _variableValues, ...inlineConfig } = personalizedConfig
          
          // Update first message for recovery
          inlineConfig.firstMessage = 'Welcome back! I can see we were in the middle of our session together. Let\'s continue right where we left off. How are you feeling?'
          
          console.log('🔄 Starting recovered VAPI session with inline config...')
          
          // Log the configuration being sent to VAPI for debugging
          console.log('📋 Final inline config being sent to VAPI:', {
            hasModel: !!inlineConfig.model,
            modelProvider: inlineConfig.model?.provider,
            modelName: inlineConfig.model?.model,
            hasVoice: !!inlineConfig.voice,
            voiceProvider: inlineConfig.voice?.provider,
            voiceId: inlineConfig.voice?.voiceId,
            hasTranscriber: !!inlineConfig.transcriber,
            transcriberProvider: inlineConfig.transcriber?.provider,
            hasFirstMessage: !!inlineConfig.firstMessage,
            maxDurationSeconds: inlineConfig.maxDurationSeconds,
            hasFunctions: !!inlineConfig.functions && inlineConfig.functions.length > 0,
            clientMessages: inlineConfig.clientMessages?.length || 0,
            recordingEnabled: inlineConfig.recordingEnabled,
            hipaaEnabled: inlineConfig.hipaaEnabled,
            // Show problematic fields that might cause 400 errors
            unexpectedFields: Object.keys(inlineConfig).filter(key => 
              !['model', 'voice', 'transcriber', 'firstMessage', 'maxDurationSeconds', 
                'silenceTimeoutSeconds', 'responseDelaySeconds', 'llmRequestDelaySeconds', 
                'numWordsToInterruptAssistant', 'clientMessages', 'functions', 'variableValues',
                'recordingEnabled', 'hipaaEnabled', 'backgroundSound', 'modelOutputInMessagesEnabled',
                'metadata'].includes(key)
            )
          })
          
          // Validate configuration before sending to VAPI (recovery)
          const { validateVapiInlineConfig, logVapiValidationResult } = await import('@/lib/vapi-config-validator')
          const validationResult = validateVapiInlineConfig(inlineConfig)
          logVapiValidationResult(validationResult)
          
          if (!validationResult.isValid) {
            console.error('❌ Recovery VAPI validation failed')
            throw new Error(`Recovery configuration validation failed: ${validationResult.errors.join('; ')}`)
          }
          
          console.log('✅ Recovery validation passed, starting VAPI call...')
          
          await vapi.startCall(inlineConfig)
          
        } else {
          // Use assistant ID approach with recovery message
          await vapi.startCall({
            assistantId: assistant.id || getAssistantId(detectedType),
            assistantOverrides: {
              firstMessage: 'Welcome back! I can see we were in the middle of our session together. Let\'s continue right where we left off. How are you feeling?'
            }
          })
        }
        
        // Ensure session-active class is set for recovered sessions
        document.body.classList.add('session-active')
        console.log('🌟 Added session-active class for recovered session')
        
        console.log('✅ VAPI session auto-started successfully for recovery')
        
      } catch (error) {
        console.error('❌ Failed to auto-start VAPI session for recovery:', error)
        setError(error instanceof Error ? error.message : 'Failed to start recovered session')
        // Remove from processed set on error so it can be retried later
        recoveryProcessedRef.current.delete(sessionId)
        lastRecoveryAttemptRef.current = 0 // Reset cooldown on error
      } finally {
        setIsProcessingRecovery(false)
      }
    }
    
    // Add event listener
    window.addEventListener('sessionRecoveryComplete', handleSessionRecoveryComplete as EventListener)
    
    // Check for existing auto-start flag on mount (in case event was missed)
    const autoStartData = sessionStorage.getItem('session-auto-start')
    if (autoStartData && !isProcessingRecovery) {
      try {
        const { sessionId, sessionData, detectedType, timestamp } = JSON.parse(autoStartData)
        
        // Check if already processed
        if (recoveryProcessedRef.current.has(sessionId)) {
          console.log('⚠️ Auto-start data already processed, removing...')
          sessionStorage.removeItem('session-auto-start')
          return
        }
        
        // Check if auto-start data is recent (within 10 seconds)
        const age = Date.now() - timestamp
        if (age < 10000) {
          console.log('🔄 Found recent auto-start data, triggering auto-start...')
          
          // Simulate the event for auto-start
          const assistantConfig = getAssistantConfigByType(detectedType)
          handleSessionRecoveryComplete(new CustomEvent('sessionRecoveryComplete', {
            detail: {
              sessionId,
              sessionData,
              detectedType,
              assistant: assistantConfig
            }
          }) as CustomEvent)
        } else {
          console.log('⏰ Auto-start data is stale, removing...')
          sessionStorage.removeItem('session-auto-start')
        }
      } catch (error) {
        console.warn('Failed to parse auto-start data:', error)
        sessionStorage.removeItem('session-auto-start')
      }
    }
    
    // Cleanup processed sessions periodically to prevent memory leaks
    const cleanupInterval = setInterval(() => {
      if (recoveryProcessedRef.current.size > 10) {
        console.log('🧹 Cleaning up old recovery sessions...')
        recoveryProcessedRef.current.clear()
      }
    }, 60000) // Every minute
    
    // Cleanup
    return () => {
      window.removeEventListener('sessionRecoveryComplete', handleSessionRecoveryComplete as EventListener)
      clearInterval(cleanupInterval)
      // Reset recovery state on unmount
      setIsProcessingRecovery(false)
    }
  }, [vapi, therapyType, isProcessingRecovery])
  
  // Cleanup session-active class on unmount to prevent stuck states
  useEffect(() => {
    return () => {
      // Only remove if no active session exists
      if (!session.sessionId && !vapi.vapiState.isActive) {
        document.body.classList.remove('session-active')
        console.log('🧹 Cleaned up session-active class on component unmount')
      }
    }
  }, [session.sessionId, vapi.vapiState.isActive])
  
  // Helper to get assistant config by type
  const getAssistantConfigByType = (type: string) => {
    switch (type) {
      case 'solo':
        return { id: process.env.NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID, name: 'Dr. Elliot Mackaphy' }
      case 'family':
        return { id: process.env.NEXT_PUBLIC_VAPI_FAMILY_ASSISTANT_ID, name: 'Dr. Jada Pearson' }
      case 'couple':
      default:
        return { id: process.env.NEXT_PUBLIC_VAPI_COUPLE_ASSISTANT_ID, name: 'Dr. Maya Thompson' }
    }
  }
  
  // Handle therapy button click
  const handleTherapyClick = useCallback(() => {
    playClick()
    
    if (!user) {
      setError('Please log in to start a therapy session')
      return
    }
    
    // Don't allow clicking if already loading or in session
    if (isLoading || vapi.vapiState.isLoading || session.sessionId || vapi.vapiState.isActive) {
      console.log('⚠️ Therapy button click ignored - already in session or loading')
      return
    }
    
    console.log('🎨 Preparing session - showing duration selection modal')
    
    // Apply background transition but DO NOT set loading state yet
    // This allows the duration modal to be visible and interactive
    
    // 1. Set session-active class for starry night background
    document.body.classList.add('session-active')
    console.log('Added session-active class to body - background should transition to starry night')
    
    // Force a small delay to ensure MutationObserver catches the change
    setTimeout(() => {
      // Double-check the class is still there
      if (!document.body.classList.contains('session-active')) {
        console.log('⚠️ Re-adding session-active class')
        document.body.classList.add('session-active')
      }
      
      // Dispatch a custom event to notify any listeners
      window.dispatchEvent(new Event('sessionStateChanged'))
    }, 10)
    
    // 2. Set window flag to prevent cleanup
    if (typeof window !== 'undefined') {
      (window as any).__therapySessionActive = true;
      console.log('Set window.__therapySessionActive = true')
    }
    
    // 3. Apply visual effects
    const main = document.querySelector('main')
    if (main) {
      main.style.transition = 'all 0.3s ease-in-out'
      main.style.opacity = '0.95'
    }
    
    // NOTE: DO NOT set isLoading = true here!
    // We need the duration modal to be visible and interactive
    
    // For family therapy, show family member selection first
    if (therapyType === 'family') {
      setShowFamilySelectionModal(true)
    } else {
      setShowDurationModal(true)
    }
  }, [user, isLoading, vapi.vapiState.isLoading, session.sessionId, vapi.vapiState.isActive, playClick, therapyType])
  
  // Handle duration selection
  const handleDurationSelect = useCallback(async (duration: number) => {
    setShowDurationModal(false)
    setError(null)
    
    // NOW set loading state after duration is selected
    setIsLoading(true)
    console.log('Duration selected, starting session creation and VAPI initialization...')
    
    try {
      // Create session with family members if selected
      const newSession = await session.createSession(duration, selectedFamilyMembers)
      
      if (!newSession) {
        throw new Error('Failed to create session')
      }
      
      // Initialize metrics calculator for real-time metrics
      if (user?.id) {
        initializeSessionMetrics(newSession, user.id, therapyType, duration)
        console.log('📊 Initialized metrics calculator for session:', newSession)
      }
      
      // session-active class was already added in handleTherapyClick for immediate UI feedback
      console.log('🌟 Session created, continuing with VAPI initialization...')
      
      // Check if we should use inline configuration
      const useInlineConfig = process.env.NEXT_PUBLIC_USE_INLINE_ASSISTANT === 'true'
      
      if (useInlineConfig) {
        console.log('🎭 Using inline assistant configuration')
        
        // First validate VAPI configuration
        console.log('🔍 Validating VAPI configuration...')
        const validateResponse = await fetch('/api/vapi/validate', {
          credentials: 'include' // Include cookies for authentication
        })
        
        if (!validateResponse.ok) {
          // Handle validation endpoint errors
          if (validateResponse.status === 401) {
            throw new Error('Authentication required. Please log in again.')
          }
          const errorText = await validateResponse.text()
          console.error('Validation endpoint error:', validateResponse.status, errorText)
          throw new Error(`Validation failed: ${validateResponse.status} ${validateResponse.statusText}`)
        }
        
        const validation = await validateResponse.json()
        console.log('📋 VAPI Validation:', validation)
        
        if (!validation.vapiStatus.connected) {
          throw new Error(`VAPI API connection failed: ${validation.vapiStatus.error || 'Unknown error'}`)
        }
        
        // Check for critical issues
        const criticalIssues = validation.recommendations.filter((r: string) => r.startsWith('❌'))
        if (criticalIssues.length > 0) {
          console.error('Critical VAPI configuration issues:', criticalIssues)
          throw new Error('VAPI configuration error: ' + criticalIssues[0])
        }
        
        // Fetch personalized inline configuration
        const response = await fetch(
          `/api/vapi/assistant?personalized=true&therapyType=${therapyType}&duration=${duration}&startTime=${encodeURIComponent(new Date().toISOString())}`
        )
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Failed to fetch assistant configuration:', errorText)
          throw new Error('Failed to fetch assistant configuration')
        }
        
        const personalizedConfig = await response.json()
        console.log('📋 Personalized config structure:', {
          hasModel: !!personalizedConfig.model,
          modelProvider: personalizedConfig.model?.provider,
          modelName: personalizedConfig.model?.model,
          hasVoice: !!personalizedConfig.voice,
          voiceProvider: personalizedConfig.voice?.provider,
          hasTranscriber: !!personalizedConfig.transcriber,
          hasFirstMessage: !!personalizedConfig.firstMessage,
          hasSystemPrompt: !!(personalizedConfig.model?.messages?.[0]?.content),
          maxDurationSeconds: personalizedConfig.maxDurationSeconds,
        })
        
        // The API endpoint already cleaned the config, so use it directly
        // Only remove fields we know for sure are not part of VAPI schema
        const { id: _id, metadata: _metadata, ...inlineConfig } = personalizedConfig
        
        // Ensure critical fields are present
        if (!inlineConfig.model || !inlineConfig.voice || !inlineConfig.transcriber) {
          console.error('Incomplete inline configuration:', {
            model: !!inlineConfig.model,
            voice: !!inlineConfig.voice,
            transcriber: !!inlineConfig.transcriber
          })
          throw new Error('Incomplete assistant configuration - missing required components')
        }
        
        // Log the configuration structure for debugging (without sensitive data)
        console.log('🔍 VAPI Configuration structure:', {
          hasModel: !!inlineConfig.model,
          modelProvider: inlineConfig.model?.provider,
          modelName: inlineConfig.model?.model,
          hasVoice: !!inlineConfig.voice,
          voiceProvider: inlineConfig.voice?.provider,
          voiceId: inlineConfig.voice?.voiceId ? 'SET' : 'MISSING',
          hasTranscriber: !!inlineConfig.transcriber,
          transcriberProvider: inlineConfig.transcriber?.provider,
          hasFirstMessage: !!inlineConfig.firstMessage,
          maxDurationSeconds: inlineConfig.maxDurationSeconds,
          hasFunctions: !!inlineConfig.functions && inlineConfig.functions.length > 0,
          clientMessages: inlineConfig.clientMessages?.length || 0
        })
        
        console.log('🚀 Starting VAPI call with inline configuration...')
        
        // Log the final configuration being sent to VAPI for debugging
        console.log('📋 Final inline config being sent to VAPI:', {
          hasModel: !!inlineConfig.model,
          modelProvider: inlineConfig.model?.provider,
          modelName: inlineConfig.model?.model,
          hasVoice: !!inlineConfig.voice,
          voiceProvider: inlineConfig.voice?.provider,
          voiceId: inlineConfig.voice?.voiceId ? 'SET' : 'MISSING',
          hasTranscriber: !!inlineConfig.transcriber,
          transcriberProvider: inlineConfig.transcriber?.provider,
          hasFirstMessage: !!inlineConfig.firstMessage,
          maxDurationSeconds: inlineConfig.maxDurationSeconds,
          hasFunctions: !!inlineConfig.functions && inlineConfig.functions.length > 0,
          clientMessages: inlineConfig.clientMessages?.length || 0,
          recordingEnabled: inlineConfig.recordingEnabled,
          hipaaEnabled: inlineConfig.hipaaEnabled,
          // Show problematic fields that might cause 400 errors
          unexpectedFields: Object.keys(inlineConfig).filter(key => 
            !['model', 'voice', 'transcriber', 'firstMessage', 'maxDurationSeconds', 
              'silenceTimeoutSeconds', 'responseDelaySeconds', 'llmRequestDelaySeconds', 
              'numWordsToInterruptAssistant', 'clientMessages', 'functions', 'variableValues',
              'recordingEnabled', 'hipaaEnabled', 'backgroundSound', 'modelOutputInMessagesEnabled',
              'metadata'].includes(key)
          )
        })
        
        // Validate configuration before sending to VAPI
        const { validateVapiInlineConfig, logVapiValidationResult } = await import('@/lib/vapi-config-validator')
        const validationResult = validateVapiInlineConfig(inlineConfig)
        logVapiValidationResult(validationResult)
        
        if (!validationResult.isValid) {
          console.error('❌ Client-side VAPI validation failed')
          throw new Error(`Configuration validation failed: ${validationResult.errors.join('; ')}`)
        }
        
        console.log('✅ Client-side validation passed, starting VAPI call...')
        
        // Start VAPI with inline configuration
        await vapi.startCall(inlineConfig)
      } else {
        // Use assistant ID approach
        await vapi.startCall({
          assistantId: getAssistantId(therapyType),
          assistantOverrides: {
            firstMessage: getFirstMessage(therapyType),
            model: {
              provider: 'anthropic',
              model: 'claude-3-5-sonnet-20241022',
              temperature: 1,
              maxTokens: 750
            }
          }
        })
      }
    } catch (error) {
      console.error('[TherapyButton] Failed to start session:', error)
      setError(error instanceof Error ? error.message : 'Failed to start session')
      
      // Reset UI state on error
      document.body.classList.remove('session-active')
      if (typeof window !== 'undefined') {
        (window as any).__therapySessionActive = false
      }
      const main = document.querySelector('main')
      if (main) {
        main.style.opacity = '1'
      }
    } finally {
      setIsLoading(false) // Stop loading
    }
  }, [therapyType, session, vapi, selectedFamilyMembers])
  
  // Handle end session
  const handleEndSession = useCallback(async () => {
    try {
      await vapi.stopCall()
      // End session through both systems for proper synchronization
      await Promise.all([
        session.endSession(),
        sessionState.endSession()
      ])
      setError(null)
      
      // CRITICAL: Reset loading state to hide phone UI
      setIsLoading(false)
      
      // Remove session-active class to return to inactive state
      document.body.classList.remove('session-active')
      
      // Reset window flag
      if (typeof window !== 'undefined') {
        (window as any).__therapySessionActive = false
      }
      
      // Reset main opacity
      const main = document.querySelector('main')
      if (main) {
        main.style.opacity = '1'
      }
      
      // Clear any session recovery data
      sessionStorage.removeItem('session-recovery-pending')
      sessionStorage.removeItem('current-session-id')
      sessionStorage.removeItem('session-auto-start')
      
      // Cleanup metrics calculator
      if (session.sessionId) {
        cleanupSessionMetrics(session.sessionId)
        console.log('🧹 Cleaned up metrics calculator for session:', session.sessionId)
      }
      
      console.log('✅ Session ended, UI reset to inactive state')
    } catch (error) {
      console.error('[TherapyButton] Failed to end session:', error)
      setError(error instanceof Error ? error.message : 'Failed to end session')
      // Still reset UI on error
      setIsLoading(false)
      document.body.classList.remove('session-active')
      if (typeof window !== 'undefined') {
        (window as any).__therapySessionActive = false
      }
    }
  }, [vapi, session, sessionState])

  // Handle time updates from the timer
  const handleTimeUpdate = useCallback((remainingMinutes: number, remainingSeconds: number) => {
    // Log time updates for debugging
    console.log(`⏱️ Time update: ${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')} remaining`)
    
    // If time is expired, end the session
    if (remainingMinutes === 0 && remainingSeconds === 0) {
      console.log('⏰ Session time expired, ending session...')
      handleEndSession()
    }
  }, [handleEndSession])

  // Handle mute toggle
  const toggleMute = useCallback(() => {
    const newMuteState = !isMuted
    setIsMuted(newMuteState)
    
    // Call VAPI mute if available
    if (vapi.toggleMute) {
      vapi.toggleMute()
    }
    
    console.log(`🔇 Microphone ${newMuteState ? 'muted' : 'unmuted'}`)
  }, [isMuted, vapi])

  // Handle family member selection for family therapy
  const handleFamilyMembersSelected = useCallback((members: Array<{name: string, age: number, relation: string}>) => {
    setSelectedFamilyMembers(members)
    setShowFamilySelectionModal(false)
    console.log('👨‍👩‍👧‍👦 Selected family members:', members)
    
    // Now proceed with session creation
    setShowDurationModal(true)
  }, [])

  const handleFamilySelectionClose = useCallback(() => {
    setShowFamilySelectionModal(false)
    // Reset UI state if user cancels the modal
    setIsLoading(false)
    document.body.classList.remove('session-active')
    if (typeof window !== 'undefined') {
      (window as any).__therapySessionActive = false
    }
    const main = document.querySelector('main')
    if (main) {
      main.style.opacity = '1'
    }
    console.log('🔙 Family selection modal cancelled - reverting UI state')
  }, [])

  const handleRemoveFamilyMember = useCallback((index: number) => {
    setFamilyMembers(prev => prev.filter((_, i) => i !== index))
  }, [])

  
  // Debug logging for UI state
  useEffect(() => {
    console.log('[TherapyButton Debug] UI State:', {
      sessionId: session.sessionId,
      vapiIsActive: vapi.vapiState.isActive,
      vapiIsLoading: vapi.vapiState.isLoading,
      vapiError: vapi.vapiState.error,
      shouldShowSessionUI: !!(session.sessionId || vapi.vapiState.isActive),
      // Supabase realtime state
      metricsConnected: metrics.isConnected,
      sessionStateConnected: sessionState.isConnected,
      isPaused: sessionState.isPaused,
      isBroadcasting: isBroadcasting
    })
  }, [session.sessionId, vapi.vapiState.isActive, vapi.vapiState.isLoading, vapi.vapiState.error, metrics.isConnected, sessionState.isConnected, sessionState.isPaused, isBroadcasting])

  // Debug logging for SessionTimer data
  useEffect(() => {
    console.log('[TherapyButton Debug] Timer Data:', {
      sessionDuration: session.sessionDuration,
      sessionDurationType: typeof session.sessionDuration,
      conversationTimeSeconds: session.conversationTimeSeconds,
      conversationTimeType: typeof session.conversationTimeSeconds,
      conversationStartTime: session.conversationStartTime,
      sessionRecovered: session.sessionRecovered,
      isSessionPaused: session.isSessionPaused
    })
  }, [session.sessionDuration, session.conversationTimeSeconds, session.conversationStartTime, session.sessionRecovered, session.isSessionPaused])

  // Get therapist name based on therapy type
  const getTherapistName = () => {
    switch (therapyType) {
      case 'solo': return 'Dr. Elliot Mackaphy'
      case 'family': return 'Dr. Jada Pearson'
      case 'couple':
      default: return 'Dr. Maya Thompson'
    }
  }
  
  // Render different states
  // Show session UI if we have a session ID OR if VAPI reports as active OR if loading
  // This ensures the phone container appears immediately when starting a session
  if (session.sessionId || vapi.vapiState.isActive || isLoading || vapi.vapiState.isLoading) {

    // Active session UI with proper phone container
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-full sm:max-w-lg mx-auto px-2" style={{ 
        position: 'relative', 
        zIndex: 10000, 
        overflow: 'visible',
        minHeight: '600px'
      }}>
        {/* Phone container with proper styling matching original */}
        <motion.div
          className={`w-full max-w-[300px] xs:max-w-[85vw] sm:max-w-[340px] rounded-[28px] overflow-visible relative mx-auto border-zinc-700 mt-0`}
          animate={{ 
            height: 'auto',
            y: 0,
            opacity: 1,
            scale: 1,
            top: '0px',
          }}
          initial={{ 
            height: '80px',
            opacity: 0.9,
            scale: 0.95,
          }}
          transition={{ 
            duration: 0.7, 
            type: "spring",
            damping: 20,
            stiffness: 100
          }}
          style={{
            height: 'auto',
            minHeight: '520px',
            boxShadow: '0 0 50px rgba(0, 0, 0, 0.5)',
            background: 'rgba(0, 0, 0, 0.95)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '28px',
            zIndex: 9999,
            position: 'relative',
            display: 'block',
            visibility: 'visible'
          }}
        >
          {/* Call Header */}
          <CallHeader 
            therapistName={getTherapistName()}
            isPaused={sessionState.isPaused}
            isVisible={!isLoading && !vapi.vapiState.isLoading}
          />
          
          {/* Loading Animation - Show when loading but call not started */}
          {(isLoading || vapi.vapiState.isLoading) ? (
            <motion.div 
              className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-gradient-to-b from-black/90 via-black/95 to-black rounded-[28px] backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Breathing Circle Animation with Glow */}
              <div className="relative mb-8">
                {/* Outer glow effect */}
                <motion.div
                  className="absolute -inset-4 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl"
                  animate={{
                    scale: [0.9, 1.1, 0.9],
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                
                <motion.div
                  className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 via-cyan-400 to-teal-400 shadow-lg"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 0.4, 0.7],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <motion.div
                  className="absolute inset-0 w-32 h-32 rounded-full bg-gradient-to-tr from-purple-400 via-pink-400 to-rose-400"
                  animate={{
                    scale: [1.2, 1, 1.2],
                    opacity: [0.3, 0.6, 0.3],
                    rotate: [360, 180, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                  }}
                />
                
                {/* Center pulse with enhanced heart */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{
                    scale: [0.8, 1, 0.8],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white via-white/95 to-white/90 shadow-inner flex items-center justify-center">
                    <motion.svg 
                      className="w-8 h-8" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                      animate={{
                        fill: ["rgba(239, 68, 68, 0)", "rgba(239, 68, 68, 0.5)", "rgba(239, 68, 68, 0)"],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        stroke="rgba(239, 68, 68, 0.8)"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                      />
                    </motion.svg>
                  </div>
                </motion.div>
              </div>
              
              {/* Loading Text with Enhanced Typography */}
              <motion.div
                className="text-center px-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-white text-xl font-semibold mb-3 tracking-wide">
                  Preparing Your Session
                </h3>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={messageIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5 }}
                    className="text-gray-300 text-sm font-light"
                  >
                    {loadingMessages[messageIndex]}
                  </motion.p>
                </AnimatePresence>
              </motion.div>
              
              {/* Enhanced Floating Dots with Gradient */}
              <div className="flex space-x-3 mt-8">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="relative"
                    animate={{
                      y: [0, -12, 0],
                    }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: "easeInOut"
                    }}
                  >
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 shadow-md" />
                    <motion.div
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-400"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 0, 0.5],
                      }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: "easeInOut"
                      }}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {/* Main Content */}
              <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex flex-col items-center justify-between h-[calc(100%-80px)] overflow-y-auto rounded-b-[28px] bg-black">
                {/* Security Notice */}
                <div className="text-center py-2 text-gray-300 text-xs sm:text-sm">
                  <span>End-to-end encrypted</span>
                </div>
                
                {/* Therapist Avatar */}
                <div className="py-4 sm:py-6 relative">
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden shadow-lg mb-3 sm:mb-4 border-2 border-blue-300 mx-auto">
                    <img 
                      src={`/images/${therapyType === 'solo' ? 'dr-elliot-mackaphy.jpg' : 
                                    therapyType === 'family' ? 'dr-jada-pearson.jpg' : 
                                    'dr-maya-thompson.jpg'}`}
                      alt={getTherapistName()}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-white text-center text-base sm:text-lg font-medium">
                    {getTherapistName()}
                  </p>
                </div>
                
                {/* Voice Waveform */}
                <div className="w-full my-2 sm:my-3 relative" style={{ minHeight: '80px' }}>
                  <VoiceWaveform audioLevel={isMuted || sessionState.isPaused ? 0 : vapi.audioLevel} />
                  {isMuted && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full animate-pulse shadow-md">
                        Microphone Muted
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Session Timer */}
                <div className="text-center py-1 sm:py-2">
                  {session.sessionDuration ? (
                    <SessionTimer
                      durationMinutes={session.sessionDuration}
                      conversationTimeSeconds={session.conversationTimeSeconds}
                      isConversationActive={vapi.vapiState.isActive && !sessionState.isPaused}
                      conversationStartTime={session.conversationStartTime || undefined}
                      className="text-white"
                      showRecoveredIndicator={session.sessionRecovered}
                      onTimeUpdate={handleTimeUpdate}
                    />
                  ) : (
                    <p className="text-white font-mono text-base sm:text-lg">
                      <span className="text-green-400">●</span> Active
                    </p>
                  )}
                </div>
                
                {/* Call Controls using extracted component */}
                <CallControls
                  isMuted={isMuted}
                  isSessionPaused={sessionState.isPaused}
                  totalPausedTimeSeconds={sessionState.session?.totalPausedTimeSeconds || 0}
                  isLoading={vapi.vapiState.isLoading || isLoading}
                  onMuteToggle={toggleMute}
                  onEndCall={handleEndSession}
                  onPauseResume={() => sessionState.isPaused ? sessionState.resumeSession() : sessionState.pauseSession()}
                />
              </div>
            </>
          )}
          
          {/* Paused Overlay */}
          <PausedOverlay 
            isPaused={sessionState.isPaused}
            totalPausedMinutes={Math.floor((sessionState.session?.totalPausedTimeSeconds || 0) / 60)}
          />
        </motion.div>
        
        {/* Session status message */}
        {(vapi.vapiState.isActive || sessionState.isPaused) && (
          <p className={`mt-4 font-medium text-sm sm:text-base opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards] text-center ${sessionState.isPaused ? 'text-orange-500' : 'text-green-600'}`}>
            {sessionState.isPaused ? 'Session paused - click Resume to continue' : 'Session active - speak with our AI therapist'}
          </p>
        )}
        
        {/* Transcript only - NO NOTES in phone UI - Only show when session is active */}
        {!isLoading && !vapi.vapiState.isLoading && transcript.transcriptChunks.length > 0 && (
          <div className="mt-4">
            <SessionTranscript chunks={transcript.transcriptChunks} />
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <ErrorDisplay 
            message={error}
            onDismiss={() => setError(null)}
          />
        )}
      </div>
    )
  }
  
  // Default button state
  return (
    <>
      <div className="flex items-center justify-center w-full h-full min-h-[200px]">
        <motion.button
          onClick={handleTherapyClick}
          disabled={disabled || vapi.vapiState.isLoading || session.isEndingSession || isLoading}
          title={`Start a ${therapyType} therapy session`}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center shadow-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 cursor-pointer"
          aria-label="Start therapy session"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            boxShadow: ["0 0 0px rgba(0, 255, 0, 0)", "0 0 15px rgba(0, 255, 0, 0.3)", "0 0 0px rgba(0, 255, 0, 0)"] 
          }}
          whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(0, 255, 0, 0.3)" }}
          whileTap={{ scale: 0.95 }}
          transition={{
            opacity: { delay: 0.2, duration: 0.4 },
            scale: { delay: 0.2, duration: 0.4, type: "spring", stiffness: 260, damping: 20 },
            boxShadow: {
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }
          }}
        >
          {vapi.vapiState.isLoading || session.isEndingSession || isLoading ? (
            <svg className="animate-spin h-10 w-10 sm:h-12 sm:w-12 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-12 sm:w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          )}
        </motion.button>
      </div>
      
      <AnimatePresence>
        {showDurationModal && (
          <SessionDurationModal
            isOpen={showDurationModal}
            onClose={() => {
              setShowDurationModal(false)
              // Reset UI state if user cancels the modal
              setIsLoading(false)
              document.body.classList.remove('session-active')
              if (typeof window !== 'undefined') {
                (window as any).__therapySessionActive = false
              }
              const main = document.querySelector('main')
              if (main) {
                main.style.opacity = '1'
              }
              console.log('🔙 Duration modal cancelled - reverting UI state')
            }}
            onSelectDuration={handleDurationSelect}
            therapyType={therapyType}
          />
        )}
        
        {showFamilySelectionModal && (
          <FamilyMemberSelectionModal
            isOpen={showFamilySelectionModal}
            onClose={handleFamilySelectionClose}
            onSelectMembers={handleFamilyMembersSelected}
            familyMembers={familyMembers}
            onRemoveMember={handleRemoveFamilyMember}
            isLoading={vapi.vapiState.isLoading}
          />
        )}
        
        {/* Note: ActiveSessionFoundModal manages its own visibility based on sessionStorage */}
      </AnimatePresence>
      
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg max-w-md text-center mt-4"
        >
          {error}
        </motion.div>
      )}
    </>
  )
}

// Helper functions
function getAssistantId(therapyType: TherapyType): string {
  const assistantIds = {
    couple: process.env.NEXT_PUBLIC_VAPI_COUPLE_ASSISTANT_ID || '',
    individual: process.env.NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID || '',
    solo: process.env.NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID || '',
    family: process.env.NEXT_PUBLIC_VAPI_FAMILY_ASSISTANT_ID || ''
  }
  return assistantIds[therapyType] || assistantIds.individual
}

function getFirstMessage(therapyType: TherapyType): string {
  const messages = {
    couple: 'Hello! I\'m Dr. Maya Thompson. I\'m here to help you both navigate your relationship journey.',
    individual: 'Hello! I\'m Dr. Elliot Mackaphy. I\'m here to support you on your personal journey.',
    solo: 'Hello! I\'m Dr. Elliot Mackaphy. I\'m here to support you on your personal journey.',
    family: 'Hello! I\'m Dr. Jada Pearson. I\'m here to help your family work through challenges together.'
  }
  return messages[therapyType] || messages.individual
}