// @ts-nocheck
/**
 * Alternative VAPI implementation using direct SDK approach
 * Based on robust example pattern - simplified without hook abstraction
 * 
 * This is for comparison purposes to evaluate if we need the hook complexity
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
// Session type handled by Clerk
import Vapi from '@vapi-ai/web'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Components
import SessionDurationModal from './SessionDurationModal'
import TherapyTypeSelector from './TherapyTypeSelector'
import SessionTimerV2 from './SessionTimerV2'
import VoiceWaveform from './VoiceWaveform'
import CallControlsOptimized from './therapy/CallControlsOptimized'

// Types
import type { 
  TherapyType, 
  FamilyMember, 
  SessionDuration,
  TranscriptEntry 
} from '@/types'

interface TherapyButtonDirectProps {
  authSession: Session | null
  profileData?: any
  familyMembers?: FamilyMember[]
  className?: string
}

interface Message {
  time: string
  type: 'user' | 'assistant' | 'system'
  content: string
  role?: string
  transcript?: string
}

/**
 * Direct VAPI implementation without hook abstraction
 * Demonstrates simpler approach with inline VAPI SDK usage
 */
export default function TherapyButtonDirect({
  authSession,
  profileData,
  familyMembers = [],
  className
}: TherapyButtonDirectProps) {
  const router = useRouter()
  
  // VAPI instance - created once, persisted across renders
  const [vapi] = useState(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || process.env.VAPI_PUBLIC_KEY
    if (!publicKey) {
      console.error('[VAPI] No public key found')
      return null
    }
    return new Vapi(publicKey)
  })

  // Connection state
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [assistantIsSpeaking, setAssistantIsSpeaking] = useState(false)
  const [volumeLevel, setVolumeLevel] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  
  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionDuration, setSessionDuration] = useState<SessionDuration | null>(null)
  const [therapyType, setTherapyType] = useState<TherapyType | null>(null)
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<string[]>([])
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  
  // UI state
  const [showDurationModal, setShowDurationModal] = useState(false)
  const [showTherapySelector, setShowTherapySelector] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // Refs for cleanup
  const connectionTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 3

  /**
   * Set up VAPI event listeners
   */
  useEffect(() => {
    if (!vapi) return

    // Connection events
    vapi.on('call-start', () => {
      console.log('[VAPI] Call started')
      setIsConnected(true)
      setIsConnecting(false)
      setSessionStartTime(new Date())
      addMessage('system', 'Therapy session connected')
      
      // Clear any connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current)
      }
      
      // Broadcast credit update event
      window.dispatchEvent(new Event('creditUpdate'))
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
      setVolumeLevel(volume)
    })

    // Message handling
    vapi.on('message', (message: any) => {
      console.log('[VAPI] Message:', message)
      
      // Handle transcripts
      if (message.type === 'transcript' && message.transcriptType === 'final') {
        if (message.role === 'user') {
          addMessage('user', message.transcript)
          saveTranscriptEntry({
            sessionId: sessionId || '',
            speaker: 'user',
            text: message.transcript,
            timestamp: new Date().toISOString()
          })
        } else if (message.role === 'assistant') {
          addMessage('assistant', message.transcript)
          saveTranscriptEntry({
            sessionId: sessionId || '',
            speaker: 'assistant', 
            text: message.transcript,
            timestamp: new Date().toISOString()
          })
        }
      }
      
      // Handle function calls
      if (message.type === 'function-call') {
        addMessage('system', `Function: ${message.functionCall?.name}`)
      }
      
      // Handle call end
      if (message.type === 'hang' || message.type === 'status-update') {
        if (message.status === 'ended') {
          handleCallEnd()
        }
      }
    })

    // Error handling
    vapi.on('error', (error: any) => {
      console.error('[VAPI] Error:', error)
      setError(error.message || 'Connection error occurred')
      addMessage('system', `Error: ${error.message || error}`)
      
      // Attempt reconnection for connection errors
      if (error.code === 'CONNECTION_FAILED' && reconnectAttemptsRef.current < maxReconnectAttempts) {
        attemptReconnection()
      }
    })

    // Cleanup on unmount
    return () => {
      if (isConnected && vapi) {
        vapi.stop()
      }
    }
  }, [vapi, sessionId, isConnected])

  /**
   * Add message to conversation log
   */
  const addMessage = useCallback((type: 'user' | 'assistant' | 'system', content: string) => {
    setMessages(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      type,
      content
    }])
  }, [])

  /**
   * Save transcript entry to database
   */
  const saveTranscriptEntry = useCallback(async (entry: Partial<TranscriptEntry>) => {
    if (!sessionId) return
    
    try {
      // In production, batch these for performance
      await fetch(`/api/sessions/${sessionId}/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: [entry] })
      })
    } catch (error) {
      console.error('[Transcript] Failed to save:', error)
    }
  }, [sessionId])

  /**
   * Start therapy session
   */
  const startCall = useCallback(async () => {
    if (!vapi || isConnecting || isConnected) return
    
    try {
      setIsConnecting(true)
      setError(null)
      addMessage('system', 'Starting therapy session...')
      
      // Create session in database first
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
        throw new Error('Failed to create session')
      }
      
      const { sessionId: newSessionId } = await sessionResponse.json()
      setSessionId(newSessionId)
      
      // Get assistant configuration
      const assistantResponse = await fetch(`/api/vapi/assistant?personalized=true&therapyType=${therapyType}&duration=${sessionDuration}`)
      const assistantConfig = await assistantResponse.json()
      
      // Start VAPI call with inline configuration
      await vapi.start({
        model: assistantConfig.model || {
          provider: "openai",
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "You are a compassionate therapy assistant."
            }
          ]
        },
        voice: assistantConfig.voice || {
          provider: "11labs",
          voiceId: "rachel"
        },
        transcriber: assistantConfig.transcriber || {
          provider: "deepgram",
          model: "nova-2",
          language: "en-US"
        },
        firstMessage: assistantConfig.firstMessage || "Hello, I'm here to support you today.",
        silenceTimeoutSeconds: 30,
        maxDurationSeconds: (sessionDuration || 15) * 60,
        endCallPhrases: ["goodbye", "end session", "stop therapy"],
        ...assistantConfig // Spread any additional config
      })
      
      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (!isConnected) {
          setError('Connection timeout. Please try again.')
          stopCall()
        }
      }, 30000) // 30 second timeout
      
    } catch (error) {
      console.error('[VAPI] Failed to start:', error)
      setIsConnecting(false)
      setError('Failed to start therapy session')
      toast.error('Failed to start session', {
        description: 'Please try again or contact support.'
      })
    }
  }, [vapi, isConnecting, isConnected, therapyType, sessionDuration, selectedFamilyMembers])

  /**
   * Stop therapy session
   */
  const stopCall = useCallback(() => {
    if (!vapi) return
    
    console.log('[VAPI] Stopping call')
    vapi.stop()
    handleCallEnd()
  }, [vapi])

  /**
   * Handle call end - cleanup and navigation
   */
  const handleCallEnd = useCallback(async () => {
    setIsConnected(false)
    setIsConnecting(false)
    setAssistantIsSpeaking(false)
    setVolumeLevel(0)
    addMessage('system', 'Session ended')
    
    // Clear timeouts
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current)
    }
    
    // Complete session in database
    if (sessionId) {
      try {
        await fetch(`/api/sessions/${sessionId}/complete`, {
          method: 'POST'
        })
      } catch (error) {
        console.error('[Session] Failed to complete:', error)
      }
    }
    
    // Broadcast credit update
    window.dispatchEvent(new Event('creditUpdate'))
    
    // Navigate to dashboard after delay
    toast.success('Session completed', {
      description: 'Redirecting to dashboard...'
    })
    
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  }, [sessionId, router])

  /**
   * Toggle mute
   */
  const toggleMute = useCallback(() => {
    if (!vapi || !isConnected) return
    
    const newMutedState = !isMuted
    vapi.setMuted(newMutedState)
    setIsMuted(newMutedState)
    
    toast.info(newMutedState ? 'Microphone muted' : 'Microphone unmuted')
  }, [vapi, isConnected, isMuted])

  /**
   * Pause session (simulated with mute)
   */
  const pauseSession = useCallback(() => {
    if (!vapi || !isConnected) return
    
    vapi.setMuted(true)
    setIsPaused(true)
    toast.info('Session paused')
  }, [vapi, isConnected])

  /**
   * Resume session
   */
  const resumeSession = useCallback(() => {
    if (!vapi || !isConnected) return
    
    vapi.setMuted(false)
    setIsPaused(false)
    toast.success('Session resumed')
  }, [vapi, isConnected])

  /**
   * Attempt reconnection with exponential backoff
   */
  const attemptReconnection = useCallback(() => {
    reconnectAttemptsRef.current++
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 8000)
    
    toast.info(`Reconnecting... (Attempt ${reconnectAttemptsRef.current})`)
    
    setTimeout(() => {
      startCall()
    }, delay)
  }, [startCall])

  /**
   * Say custom message
   */
  const sayMessage = useCallback((text: string, endCallAfter = false) => {
    if (!vapi || !isConnected) return
    
    vapi.say(text, endCallAfter)
    addMessage('system', `Assistant will say: "${text}"`)
  }, [vapi, isConnected])

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
      {/* Start button - only shown when not connected */}
      {!isConnected && !isConnecting && (
        <button
          onClick={() => setShowDurationModal(true)}
          className={cn(
            "px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600",
            "text-white font-semibold rounded-xl",
            "hover:from-purple-700 hover:to-blue-700",
            "transform transition-all duration-200 hover:scale-105",
            "shadow-lg hover:shadow-xl",
            className
          )}
        >
          Start Therapy Session
        </button>
      )}

      {/* Active session UI */}
      {(isConnecting || isConnected) && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-purple-50 to-blue-50">
          <div className="container mx-auto px-4 py-8 h-full flex flex-col">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {isConnecting ? 'Connecting...' : 'Therapy Session Active'}
              </h1>
              {sessionStartTime && (
                <SessionTimerV2
                  startTime={sessionStartTime}
                  isPaused={isPaused}
                  maxDuration={sessionDuration || 15}
                />
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

            {/* Messages (hidden in production, shown for debugging) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-white rounded-lg shadow-lg p-4 max-h-48 overflow-y-auto">
                <h3 className="font-semibold mb-2">Debug Log:</h3>
                {messages.map((msg, i) => (
                  <div key={i} className="text-sm mb-1">
                    <span className="text-gray-500">[{msg.time}]</span>
                    <span className={cn(
                      "ml-2",
                      msg.type === 'user' && "text-blue-600",
                      msg.type === 'assistant' && "text-green-600",
                      msg.type === 'system' && "text-gray-600"
                    )}>
                      {msg.type}: {msg.content}
                    </span>
                  </div>
                ))}
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
          
          // For family therapy, select members
          if (type === 'family' && familyMembers.length > 0) {
            // In production, show family member selection modal
            setSelectedFamilyMembers(familyMembers.map(m => m.id))
          }
          
          // Start the call
          startCall()
        }}
        isFamilyAvailable={familyMembers.length >= 2}
      />
    </>
  )
}