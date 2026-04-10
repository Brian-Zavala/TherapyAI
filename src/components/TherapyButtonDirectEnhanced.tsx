// @ts-nocheck
/**
 * Enhanced Direct VAPI Implementation
 * Preserves ALL critical features while removing hook abstraction complexity
 * 
 * This version maintains feature parity with TherapyButtonRefactored
 * while using direct VAPI SDK approach for clarity
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
// Session type handled by Clerk
import Vapi from '@vapi-ai/web'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

// Components
import SessionDurationModal from './SessionDurationModal'
import TherapyTypeSelector from './TherapyTypeSelector'
import FamilyMemberSelectionModal from './FamilyMemberSelectionModal'
import ActiveSessionFoundModal from './ActiveSessionFoundModal'
import SessionTimerV2 from './SessionTimerV2'
import VoiceWaveform from './VoiceWaveform'
import CallControlsOptimized from './therapy/CallControlsOptimized'
import TranscriptOverlay from './TranscriptOverlay'

// Hooks (only the essential ones we can't replace)
import { useButtonSound } from '@/hooks/useButtonSound'

// Services
import { transcriptService } from '@/lib/transcript-service-optimized'

// Types
import type { 
  TherapyType, 
  FamilyMember, 
  SessionDuration,
  TranscriptEntry 
} from '@/types'

interface TherapyButtonDirectEnhancedProps {
  authSession: Session | null
  profileData?: any
  familyMembers?: FamilyMember[]
  className?: string
}

interface SessionState {
  id: string
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED'
  startTime: Date
  pausedAt?: Date
  totalPausedTime: number
  conversationTime: number
  duration: number
  therapyType: TherapyType
  familyMemberIds?: string[]
}

/**
 * Enhanced Direct VAPI Implementation with ALL critical features preserved
 */
export default function TherapyButtonDirectEnhanced({
  authSession,
  profileData,
  familyMembers = [],
  className
}: TherapyButtonDirectEnhancedProps) {
  const router = useRouter()
  const supabase = createClient()
  const { playSound } = useButtonSound()
  
  // VAPI instance - singleton pattern without external manager
  const vapiRef = useRef<Vapi | null>(null)
  const [vapi, setVapi] = useState<Vapi | null>(null)
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [assistantIsSpeaking, setAssistantIsSpeaking] = useState(false)
  const [volumeLevel, setVolumeLevel] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  
  // Session state (replaces useSessionManagementV2)
  const [session, setSession] = useState<SessionState | null>(null)
  const [sessionDuration, setSessionDuration] = useState<SessionDuration | null>(null)
  const [therapyType, setTherapyType] = useState<TherapyType | null>(null)
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<string[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const conversationTimerRef = useRef<NodeJS.Timeout>()
  const pauseTimestampRef = useRef<number>()
  
  // Credits state (replaces useSessionWithCredits)
  const [userCredits, setUserCredits] = useState<number | null>(null)
  const [creditsLoading, setCreditsLoading] = useState(false)
  const [concurrentSessions, setConcurrentSessions] = useState(0)
  
  // Transcript state (replaces useTranscriptHandler)
  const [transcriptChunks, setTranscriptChunks] = useState<string[]>([])
  const [showTranscript, setShowTranscript] = useState(true)
  const transcriptBufferRef = useRef<TranscriptEntry[]>([])
  
  // Recovery state (replaces useTherapySessionRecovery)
  const [recoverableSession, setRecoverableSession] = useState<any>(null)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  
  // UI state
  const [showDurationModal, setShowDurationModal] = useState(false)
  const [showTherapySelector, setShowTherapySelector] = useState(false)
  const [showFamilySelector, setShowFamilySelector] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Refs for cleanup and timers
  const connectionTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)
  const timeWarningsRef = useRef<Set<number>>(new Set())
  const sessionChannelRef = useRef<any>(null)

  /**
   * Initialize VAPI instance (singleton pattern)
   */
  useEffect(() => {
    if (!vapiRef.current) {
      const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || process.env.VAPI_PUBLIC_KEY
      if (publicKey) {
        vapiRef.current = new Vapi(publicKey)
        setVapi(vapiRef.current)
      } else {
        console.error('[VAPI] No public key found')
        setError('Voice service configuration error')
      }
    }
  }, [])

  /**
   * Check for recoverable sessions on mount
   */
  useEffect(() => {
    checkForRecoverableSessions()
  }, [])

  /**
   * Check user credits on mount and after each session
   */
  useEffect(() => {
    if (authSession?.user?.id) {
      fetchUserCredits()
    }
  }, [authSession])

  /**
   * Set up VAPI event listeners
   */
  useEffect(() => {
    if (!vapi) return

    // Connection events
    vapi.on('call-start', () => {
      console.log('[VAPI] Call started')
      handleCallStart()
    })

    vapi.on('call-end', () => {
      console.log('[VAPI] Call ended')
      handleCallEnd()
    })

    // Speech events
    vapi.on('speech-start', () => {
      setAssistantIsSpeaking(true)
    })

    vapi.on('speech-end', () => {
      setAssistantIsSpeaking(false)
    })

    // Volume level for waveform
    vapi.on('volume-level', (volume: number) => {
      setVolumeLevel(Math.round(volume * 100))
    })

    // Message handling for transcripts and metrics
    vapi.on('message', (message: any) => {
      handleVapiMessage(message)
    })

    // Error handling
    vapi.on('error', (error: any) => {
      handleVapiError(error)
    })

    // Cleanup
    return () => {
      if (isConnected && vapi) {
        vapi.stop()
      }
      cleanupSession()
    }
  }, [vapi, session])

  /**
   * Set up Supabase real-time subscriptions (replaces useSupabaseSessionState)
   */
  useEffect(() => {
    if (!session?.id) return

    const channel = supabase
      .channel(`session:${session.id}`)
      .on('broadcast', { event: 'session-update' }, (payload) => {
        handleSessionUpdate(payload.payload)
      })
      .subscribe()

    sessionChannelRef.current = channel

    return () => {
      channel.unsubscribe()
    }
  }, [session?.id])

  /**
   * Conversation timer (replaces session management timing)
   */
  useEffect(() => {
    if (session && isConnected && !isPaused) {
      conversationTimerRef.current = setInterval(() => {
        updateConversationTime()
      }, 100) // Update every 100ms for accuracy
    } else {
      if (conversationTimerRef.current) {
        clearInterval(conversationTimerRef.current)
      }
    }

    return () => {
      if (conversationTimerRef.current) {
        clearInterval(conversationTimerRef.current)
      }
    }
  }, [session, isConnected, isPaused])

  /**
   * Fetch user credits
   */
  const fetchUserCredits = async () => {
    setCreditsLoading(true)
    try {
      const response = await fetch('/api/user/credits')
      const data = await response.json()
      setUserCredits(data.availableCredits || 0)
      setConcurrentSessions(data.concurrentSessions || 0)
    } catch (error) {
      console.error('[Credits] Failed to fetch:', error)
    } finally {
      setCreditsLoading(false)
    }
  }

  /**
   * Check for recoverable sessions
   */
  const checkForRecoverableSessions = async () => {
    if (!authSession?.user?.id) return

    try {
      const response = await fetch('/api/sessions/check-recovery')
      const data = await response.json()
      
      if (data.hasRecoverableSession) {
        setRecoverableSession(data.session)
        setShowRecoveryModal(true)
      }
    } catch (error) {
      console.error('[Recovery] Failed to check:', error)
    }
  }

  /**
   * Handle VAPI call start
   */
  const handleCallStart = () => {
    setIsConnected(true)
    setIsConnecting(false)
    
    // Start conversation timer
    if (session) {
      setSession({
        ...session,
        status: 'ACTIVE',
        startTime: new Date()
      })
    }
    
    // Clear connection timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current)
    }
    
    // Update UI
    document.body.classList.add('session-active')
    
    // Broadcast events
    window.dispatchEvent(new Event('creditUpdate'))
    window.dispatchEvent(new CustomEvent('sessionStarted', { 
      detail: { sessionId: session?.id } 
    }))
    
    toast.success('Therapy session connected')
    playSound()
  }

  /**
   * Handle VAPI call end
   */
  const handleCallEnd = async () => {
    setIsConnected(false)
    setIsConnecting(false)
    setAssistantIsSpeaking(false)
    setVolumeLevel(0)
    
    // Complete session
    if (session) {
      await completeSession()
    }
    
    // Cleanup
    cleanupSession()
    
    // Update UI
    document.body.classList.remove('session-active')
    
    // Navigate to dashboard
    toast.success('Session completed', {
      description: 'Redirecting to dashboard...'
    })
    
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  }

  /**
   * Handle VAPI messages (transcripts, metrics, etc.)
   */
  const handleVapiMessage = async (message: any) => {
    console.log('[VAPI] Message:', message)
    
    // Handle transcripts
    if (message.type === 'transcript' && message.transcriptType === 'final') {
      const entry: TranscriptEntry = {
        sessionId: session?.id || '',
        speaker: message.role,
        text: message.transcript,
        timestamp: new Date().toISOString()
      }
      
      // Add to buffer for batching
      transcriptBufferRef.current.push(entry)
      
      // Update UI transcript
      if (message.role === 'assistant') {
        setTranscriptChunks(prev => [...prev, message.transcript])
      }
      
      // Add to transcript service for optimized batching
      if (session?.id) {
        await transcriptService.addEntry(entry)
      }
    }
    
    // Handle function calls
    if (message.type === 'function-call') {
      console.log('[VAPI] Function call:', message.functionCall)
    }
    
    // Handle status updates
    if (message.type === 'status-update' && message.status === 'ended') {
      handleCallEnd()
    }
  }

  /**
   * Handle VAPI errors
   */
  const handleVapiError = (error: any) => {
    console.error('[VAPI] Error:', error)
    setError(error.message || 'Connection error occurred')
    
    // Attempt reconnection for connection errors
    if (error.code === 'CONNECTION_FAILED' && reconnectAttemptsRef.current < 3) {
      attemptReconnection()
    } else {
      toast.error('Session error', {
        description: error.message || 'Please try again'
      })
    }
  }

  /**
   * Update conversation time and check for warnings
   */
  const updateConversationTime = () => {
    if (!session || isPaused) return
    
    const now = Date.now()
    const elapsed = now - session.startTime.getTime() - session.totalPausedTime
    const conversationSeconds = Math.floor(elapsed / 1000)
    
    setSession(prev => prev ? {
      ...prev,
      conversationTime: conversationSeconds
    } : null)
    
    // Check for time warnings
    const remainingMinutes = session.duration - (conversationSeconds / 60)
    
    if (remainingMinutes <= 10 && !timeWarningsRef.current.has(10)) {
      timeWarningsRef.current.add(10)
      sendTimeWarning(10)
    }
    if (remainingMinutes <= 5 && !timeWarningsRef.current.has(5)) {
      timeWarningsRef.current.add(5)
      sendTimeWarning(5)
    }
    if (remainingMinutes <= 1 && !timeWarningsRef.current.has(1)) {
      timeWarningsRef.current.add(1)
      sendTimeWarning(1)
    }
    if (remainingMinutes <= 0.5 && !timeWarningsRef.current.has(0.5)) {
      timeWarningsRef.current.add(0.5)
      sendTimeWarning(0.5)
    }
    
    // Auto-end if exceeded duration
    if (conversationSeconds >= session.duration * 60) {
      handleCallEnd()
    }
  }

  /**
   * Send time warning to VAPI
   */
  const sendTimeWarning = (minutes: number) => {
    if (!vapi || !isConnected) return
    
    const message = minutes === 0.5 
      ? "30 seconds remaining in our session"
      : `${minutes} minute${minutes === 1 ? '' : 's'} remaining in our session`
    
    vapi.send({
      type: 'add-message',
      message: {
        role: 'system',
        content: message
      }
    })
  }

  /**
   * Start therapy session
   */
  const startCall = async () => {
    if (!vapi || isConnecting || isConnected) return
    
    // Validate credits
    if (userCredits === null || userCredits < (sessionDuration || 15)) {
      toast.error('Insufficient credits', {
        description: 'Please purchase more credits to continue'
      })
      router.push('/pricing')
      return
    }
    
    // Check concurrent sessions
    if (concurrentSessions >= 1) { // Adjust based on plan
      toast.error('Session limit reached', {
        description: 'Please end your current session first'
      })
      return
    }
    
    try {
      setIsConnecting(true)
      setError(null)
      playSound()
      
      // Create session in database with credit validation
      const sessionResponse = await fetch('/api/sessions/create-with-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          therapyType,
          duration: sessionDuration,
          familyMemberIds: selectedFamilyMembers
        })
      })
      
      if (!sessionResponse.ok) {
        const error = await sessionResponse.json()
        throw new Error(error.message || 'Failed to create session')
      }
      
      const { sessionId, remainingCredits } = await sessionResponse.json()
      
      // Update local state
      setSession({
        id: sessionId,
        status: 'ACTIVE',
        startTime: new Date(),
        totalPausedTime: 0,
        conversationTime: 0,
        duration: sessionDuration || 15,
        therapyType: therapyType || 'solo',
        familyMemberIds: selectedFamilyMembers
      })
      
      setUserCredits(remainingCredits)
      
      // Initialize transcript service
      transcriptService.initializeMetricsCalculator(
        sessionId,
        authSession?.user?.id || '',
        therapyType || 'solo',
        sessionDuration
      )
      
      // Get personalized assistant configuration
      const assistantResponse = await fetch(
        `/api/vapi/assistant?personalized=true&therapyType=${therapyType}&duration=${sessionDuration}`
      )
      const assistantConfig = await assistantResponse.json()
      
      // Start VAPI call
      await vapi.start(assistantConfig)
      
      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (!isConnected) {
          setError('Connection timeout. Please check your internet and try again.')
          stopCall()
        }
      }, 30000)
      
      // Save to localStorage for recovery
      localStorage.setItem('activeSession', JSON.stringify({
        sessionId,
        therapyType,
        duration: sessionDuration,
        startTime: new Date().toISOString()
      }))
      
    } catch (error: any) {
      console.error('[VAPI] Failed to start:', error)
      setIsConnecting(false)
      setError(error.message || 'Failed to start therapy session')
      toast.error('Failed to start session', {
        description: error.message || 'Please try again'
      })
    }
  }

  /**
   * Stop therapy session
   */
  const stopCall = useCallback(() => {
    if (!vapi) return
    
    playSound()
    vapi.stop()
  }, [vapi, playSound])

  /**
   * Pause session
   */
  const pauseSession = useCallback(async () => {
    if (!vapi || !isConnected || !session) return
    
    setIsPaused(true)
    pauseTimestampRef.current = Date.now()
    vapi.setMuted(true)
    
    // Update session state
    setSession(prev => prev ? {
      ...prev,
      status: 'PAUSED',
      pausedAt: new Date()
    } : null)
    
    // Broadcast pause state
    if (sessionChannelRef.current) {
      sessionChannelRef.current.send({
        type: 'broadcast',
        event: 'session-update',
        payload: { status: 'PAUSED' }
      })
    }
    
    // Update database
    await fetch(`/api/sessions/${session.id}/pause`, {
      method: 'POST'
    })
    
    toast.info('Session paused')
    playSound()
  }, [vapi, isConnected, session, playSound])

  /**
   * Resume session
   */
  const resumeSession = useCallback(async () => {
    if (!vapi || !isConnected || !session) return
    
    // Calculate paused duration
    const pausedDuration = pauseTimestampRef.current 
      ? Date.now() - pauseTimestampRef.current 
      : 0
    
    setIsPaused(false)
    vapi.setMuted(false)
    
    // Update session state
    setSession(prev => prev ? {
      ...prev,
      status: 'ACTIVE',
      pausedAt: undefined,
      totalPausedTime: prev.totalPausedTime + pausedDuration
    } : null)
    
    // Broadcast resume state
    if (sessionChannelRef.current) {
      sessionChannelRef.current.send({
        type: 'broadcast',
        event: 'session-update',
        payload: { status: 'ACTIVE' }
      })
    }
    
    // Update database
    await fetch(`/api/sessions/${session.id}/resume`, {
      method: 'POST'
    })
    
    toast.success('Session resumed')
    playSound()
  }, [vapi, isConnected, session, playSound])

  /**
   * Toggle mute
   */
  const toggleMute = useCallback(() => {
    if (!vapi || !isConnected) return
    
    const newMutedState = !isMuted
    vapi.setMuted(newMutedState)
    setIsMuted(newMutedState)
    
    toast.info(newMutedState ? 'Microphone muted' : 'Microphone unmuted')
    playSound()
  }, [vapi, isConnected, isMuted, playSound])

  /**
   * Complete session
   */
  const completeSession = async () => {
    if (!session) return
    
    try {
      await fetch(`/api/sessions/${session.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationTime: session.conversationTime,
          transcriptCount: transcriptBufferRef.current.length
        })
      })
      
      // Clear recovery data
      localStorage.removeItem('activeSession')
      
      // Broadcast completion
      window.dispatchEvent(new CustomEvent('sessionEnded', {
        detail: { sessionId: session.id }
      }))
      window.dispatchEvent(new Event('creditUpdate'))
      
    } catch (error) {
      console.error('[Session] Failed to complete:', error)
    }
  }

  /**
   * Handle session recovery
   */
  const handleRecoverSession = async () => {
    if (!recoverableSession || !vapi) return
    
    try {
      setShowRecoveryModal(false)
      setIsConnecting(true)
      
      // Restore session state
      setSession({
        id: recoverableSession.id,
        status: 'ACTIVE',
        startTime: new Date(recoverableSession.startTime),
        totalPausedTime: 0,
        conversationTime: recoverableSession.conversationTime || 0,
        duration: recoverableSession.duration,
        therapyType: recoverableSession.sessionType,
        familyMemberIds: recoverableSession.familyMemberIds
      })
      
      // Get assistant config
      const assistantResponse = await fetch(
        `/api/vapi/assistant?personalized=true&therapyType=${recoverableSession.sessionType}&duration=${recoverableSession.duration}`
      )
      const assistantConfig = await assistantResponse.json()
      
      // Add recovery context
      assistantConfig.firstMessage = `Welcome back. Let's continue where we left off. ${assistantConfig.firstMessage}`
      
      // Start VAPI with recovered config
      await vapi.start(assistantConfig)
      
      toast.success('Session recovered successfully')
      
    } catch (error) {
      console.error('[Recovery] Failed:', error)
      toast.error('Failed to recover session')
      setIsConnecting(false)
    }
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  const attemptReconnection = () => {
    reconnectAttemptsRef.current++
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 8000)
    
    toast.info(`Reconnecting... (Attempt ${reconnectAttemptsRef.current})`)
    
    setTimeout(() => {
      if (session && vapi && !isConnected) {
        // Attempt to restart with existing session
        vapi.start(session.id)
      }
    }, delay)
  }

  /**
   * Handle session update from Supabase
   */
  const handleSessionUpdate = (payload: any) => {
    if (payload.status === 'PAUSED' && !isPaused) {
      pauseSession()
    } else if (payload.status === 'ACTIVE' && isPaused) {
      resumeSession()
    }
  }

  /**
   * Cleanup session resources
   */
  const cleanupSession = () => {
    // Clear timers
    if (conversationTimerRef.current) {
      clearInterval(conversationTimerRef.current)
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current)
    }
    
    // Clear refs
    transcriptBufferRef.current = []
    timeWarningsRef.current.clear()
    reconnectAttemptsRef.current = 0
    
    // Unsubscribe from channels
    if (sessionChannelRef.current) {
      sessionChannelRef.current.unsubscribe()
    }
    
    // Clear state
    setSession(null)
    setTranscriptChunks([])
  }

  // Check authentication
  if (!authSession) {
    return (
      <button
        onClick={() => router.push('/auth/signin')}
        className={cn(
          "px-6 py-3 bg-primary text-white rounded-lg",
          "hover:bg-primary/90 transition-colors",
          className
        )}
      >
        Sign in to Start Therapy
      </button>
    )
  }

  // Main UI
  return (
    <>
      {/* Start button */}
      {!isConnected && !isConnecting && !session && (
        <button
          onClick={() => setShowDurationModal(true)}
          disabled={creditsLoading || userCredits === 0}
          className={cn(
            "px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600",
            "text-white font-semibold rounded-xl",
            "hover:from-purple-700 hover:to-blue-700",
            "transform transition-all duration-200 hover:scale-105",
            "shadow-lg hover:shadow-xl",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
        >
          {creditsLoading ? 'Loading...' : 
           userCredits === 0 ? 'No Credits Available' : 
           'Start Therapy Session'}
        </button>
      )}

      {/* Active session UI */}
      {(isConnecting || isConnected || session) && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-purple-50 to-blue-50">
          <div className="container mx-auto px-4 py-8 h-full flex flex-col">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {isConnecting ? 'Connecting...' : 'Therapy Session Active'}
              </h1>
              {session && (
                <SessionTimerV2
                  startTime={session.startTime}
                  isPaused={isPaused}
                  maxDuration={session.duration}
                  conversationTime={session.conversationTime}
                />
              )}
              {userCredits !== null && (
                <div className="text-sm text-gray-600 mt-2">
                  Credits remaining: {userCredits}
                </div>
              )}
            </div>

            {/* Voice waveform */}
            <div className="flex-1 flex items-center justify-center mb-8">
              <VoiceWaveform
                isActive={isConnected && !isPaused}
                audioLevel={volumeLevel}
                isSpeaking={assistantIsSpeaking}
              />
            </div>

            {/* Transcript overlay */}
            {showTranscript && transcriptChunks.length > 0 && (
              <TranscriptOverlay
                chunks={transcriptChunks}
                isVisible={showTranscript}
                onToggle={() => setShowTranscript(!showTranscript)}
              />
            )}

            {/* Controls */}
            <div className="flex justify-center gap-4 mb-8">
              <CallControlsOptimized
                isMuted={isMuted}
                isPaused={isPaused}
                onToggleMute={toggleMute}
                onTogglePause={isPaused ? resumeSession : pauseSession}
                onEndCall={stopCall}
                disabled={!isConnected}
              />
            </div>

            {/* Error display */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <SessionDurationModal
        isOpen={showDurationModal}
        onClose={() => setShowDurationModal(false)}
        onSelectDuration={(duration) => {
          setSessionDuration(duration)
          setShowDurationModal(false)
          setShowTherapySelector(true)
        }}
      />

      <TherapyTypeSelector
        isOpen={showTherapySelector}
        onClose={() => setShowTherapySelector(false)}
        onSelectType={(type) => {
          setTherapyType(type)
          setShowTherapySelector(false)
          
          if (type === 'family' && familyMembers.length >= 2) {
            setShowFamilySelector(true)
          } else {
            startCall()
          }
        }}
        isFamilyAvailable={familyMembers.length >= 2}
      />

      <FamilyMemberSelectionModal
        isOpen={showFamilySelector}
        onClose={() => setShowFamilySelector(false)}
        familyMembers={familyMembers}
        onSelectMembers={(memberIds) => {
          setSelectedFamilyMembers(memberIds)
          setShowFamilySelector(false)
          startCall()
        }}
      />

      <ActiveSessionFoundModal
        isOpen={showRecoveryModal}
        onClose={() => {
          setShowRecoveryModal(false)
          setRecoverableSession(null)
        }}
        onRecover={handleRecoverSession}
        sessionData={recoverableSession}
      />
    </>
  )
}