'use client'

import { useState, useRef, useCallback, useEffect, MutableRefObject } from 'react'
import { 
  VapiState, 
  AssistantConfigType,
  ExtendedVapi
} from '@/types/therapy-session'
import { 
  ERROR_MESSAGES, 
  VAPI_CONFIG
} from '@/lib/therapy-session/constants'
import { 
  VapiMessage, 
  isFunctionCallMessage
} from '@/types/vapi'
import { normalizeAudioLevel } from '@/lib/therapy-session/utils'
import { useVapiToken } from './useVapiToken'
import { VAPIManager } from '@/lib/vapi-manager'
import { useSession } from 'next-auth/react'

// Hook configuration interface
interface UseVapiSessionOptions {
  onCallStart?: () => void
  onCallEnd?: (reason?: string) => void
  onError?: (error: unknown) => void
  onMessage?: (message: VapiMessage) => void
  onFunctionCall?: (functionName: string, parameters: Record<string, unknown>) => void
  onAudioLevelChange?: (level: number) => void
}

// Hook return type
interface UseVapiSessionReturn {
  // State
  vapiState: VapiState
  audioLevel: number
  
  // Authentication state
  isAuthLoading: boolean
  authError: string | null
  
  // Methods
  createVapiInstance: (sessionId?: string) => Promise<boolean>
  startCall: (assistantIdOrConfig: string | AssistantConfigType) => Promise<void>
  stopCall: () => Promise<void>
  pauseCall: (sessionId: string) => Promise<string | null>
  resumeCall: (sessionId: string) => Promise<void>
  toggleMute: () => void
  isInstanceReady: () => boolean
  
  // Refs for direct access if needed
  vapiManagerRef: MutableRefObject<VAPIManager | null>
  audioContextRef: MutableRefObject<AudioContext | null>
  analyserRef: MutableRefObject<AnalyserNode | null>
}

/**
 * Custom hook for managing VAPI voice session
 * Encapsulates all VAPI-related logic including WebRTC connection,
 * audio analysis, and event handling
 */
export function useVapiSession(options: UseVapiSessionOptions = {}): UseVapiSessionReturn {
  // State management
  const [vapiState, setVapiState] = useState<VapiState>({
    isActive: false,
    isLoading: false,
    isMuted: false,
    error: null,
    audioLevel: 0
  })
  const [audioLevel, setAudioLevel] = useState(0)
  
  // Refs for performance optimization
  const vapiManagerRef = useRef<VAPIManager | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  
  // Get user session
  const { data: session } = useSession()
  
  // Audio analysis for waveform visualization
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !vapiState.isActive) {
      setAudioLevel(0)
      return
    }
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    
    // Calculate average audio level
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
    const normalizedLevel = normalizeAudioLevel(average)
    
    setAudioLevel(normalizedLevel)
    optionsRef.current.onAudioLevelChange?.(normalizedLevel)
    
    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(analyzeAudio)
  }, [vapiState.isActive])
  
  // Setup audio analyzer for voice visualization
  const setupAudioAnalyzer = useCallback(async () => {
    try {
      console.log('🎤 Setting up audio analyzer...')
      
      // Clean up existing analyzer
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      
      // Get user media stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      audioStreamRef.current = stream
      
      // Create audio context and analyzer
      // @ts-expect-error - webkitAudioContext is a vendor-prefixed API
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      // Start analyzing
      analyzeAudio()
      
      console.log('✅ Audio analyzer setup complete')
    } catch (error) {
      console.error('Error setting up audio analyzer:', error)
      setVapiState(prev => ({ 
        ...prev, 
        error: ERROR_MESSAGES.PERMISSION_DENIED 
      }))
    }
  }, [analyzeAudio])
  
  // Get VAPI token
  // Store options in refs to avoid stale closures
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);
  
  // Memoize the onError callback for useVapiToken to prevent re-renders
  const handleTokenError = useCallback((error: Error) => {
    console.error('[useVapiSession] Token error:', error);
    setVapiState(prev => ({ ...prev, error: error.message }));
    optionsRef.current.onError?.(error);
  }, []);
  
  const { 
    token, 
    isLoading: tokenLoading, 
    error: tokenError, 
    refreshToken,
    isExpiringSoon 
  } = useVapiToken({ 
    autoRefresh: true,
    onError: handleTokenError
  });

  // Auto-refresh token when expiring soon during active call
  useEffect(() => {
    if (isExpiringSoon && vapiState.isActive && !tokenLoading) {
      console.log('[useVapiSession] Token expiring soon, refreshing...');
      refreshToken();
    }
  }, [isExpiringSoon, vapiState.isActive, tokenLoading, refreshToken]);

  // Create VAPI instance
  const createVapiInstance = useCallback(async (sessionId?: string): Promise<boolean> => {
    try {
      // Don't create instance if token is not ready
      if (!token) {
        // If token is still loading, this is expected
        if (tokenLoading) {
          console.log('[useVapiSession] Token is still loading, waiting...');
          throw new Error('Authentication in progress, please wait...');
        }
        
        const errorMsg = tokenError || ERROR_MESSAGES.VAPI_KEY_MISSING;
        console.error('[useVapiSession] No token available:', { tokenError, tokenLoading });
        throw new Error(errorMsg);
      }

      if (!session?.user?.id) {
        throw new Error('User session not found');
      }

      // Dispose of any existing instance
      if (vapiManagerRef.current) {
        vapiManagerRef.current.destroy()
        vapiManagerRef.current = null
      }
      
      console.log('🎙️ Initializing VAPI Manager...')
      
      // Create VAPI Manager instance
      vapiManagerRef.current = new VAPIManager({
        publicKey: token,
        userId: session.user.id,
        maxRetries: 3,
        timeout: 30000
      })
      
      // Store session ID if provided
      if (sessionId) {
        sessionIdRef.current = sessionId
        console.log(`📝 Set session ID: ${sessionId}`)
      }
      
      // Set up event handlers
      setupEventHandlers()
      
      console.log('✅ VAPI Manager initialized successfully')
      return true
      
    } catch (error) {
      console.error('Failed to create Vapi instance:', error)
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.VAPI_INIT_FAILED
      setVapiState(prev => ({ ...prev, error: errorMessage }))
      optionsRef.current.onError?.(error)
      return false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tokenError])
  
  // Listen for VAPI auth errors
  useEffect(() => {
    const handleAuthError = async (event: CustomEvent) => {
      console.log('[useVapiSession] Received VAPI auth error event:', event.detail);
      
      // Try to refresh token
      try {
        await refreshToken();
        console.log('[useVapiSession] Token refreshed after auth error');
        
        // If we have an active instance, recreate it with new token
        if (vapiManagerRef.current) {
          const sessionId = sessionIdRef.current;
          await createVapiInstance(sessionId || undefined);
        }
      } catch (error) {
        console.error('[useVapiSession] Failed to recover from auth error:', error);
        setVapiState(prev => ({ 
          ...prev, 
          error: 'Authentication failed. Please try again.'
        }));
      }
    };

    window.addEventListener('vapi-auth-error', handleAuthError as EventListener);
    
    return () => {
      window.removeEventListener('vapi-auth-error', handleAuthError as EventListener);
    };
  }, [refreshToken, createVapiInstance]);
  
  // Set up VAPI event handlers
  const setupEventHandlers = useCallback(() => {
    if (!vapiManagerRef.current) return
    
    const vapi = (vapiManagerRef.current as any).vapi
    if (!vapi) return
    
    // Call start event
    vapi.on('call-start', async () => {
      console.log('✅ Vapi call started')
      setVapiState(prev => ({ 
        ...prev, 
        isActive: true, 
        isLoading: false, 
        error: null 
      }))
      
      // Setup audio analyzer
      setupAudioAnalyzer()
      
      // Notify parent
      optionsRef.current.onCallStart?.()
    })
    
    // Call end event
    vapi.on('call-end', async function(event?: unknown) {
      console.log('📞 Vapi call ended:', event)
      
      // Extract reason
      let reason = 'No reason provided'
      if (typeof event === 'string') {
        reason = event
      } else if (event?.reason) {
        reason = String(event.reason)
      }
      
      setVapiState(prev => ({ 
        ...prev, 
        isActive: false, 
        isLoading: false 
      }))
      
      // Clean up audio
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop())
        audioStreamRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      
      setAudioLevel(0)
      
      // CRITICAL: Ensure session-active class is removed when VAPI call ends
      console.log('🎨 VAPI call ended - removing session-active class')
      document.body.classList.remove('session-active')
      
      // Dispatch event to notify UI
      window.dispatchEvent(new Event('sessionStateChanged'))
      
      // Notify parent
      optionsRef.current.onCallEnd?.(reason)
    })
    
    // Error event
    vapi.on('error', (error: unknown) => {
      console.error('Vapi error:', error)
      
      let errorDetail = "Unknown error"
      let errorCode = ""
      let diagnosis = ""
      
      // Enhanced error parsing for VAPI-specific errors
      if (error && typeof error === 'object') {
        const errorObj = error as Record<string, any>
        
        // Check for specific VAPI error patterns
        if (errorObj.errorMsg === 'Meeting has ended' && errorObj.error?.type === 'no-room') {
          errorDetail = "Session setup failed"
          diagnosis = "The therapy session could not be started. This may be due to account issues or invalid configuration."
          
          // Log detailed error info for debugging
          console.error('VAPI Room Error Details:', {
            type: errorObj.error?.type,
            message: errorObj.error?.msg,
            details: errorObj.error?.details,
            callClientId: errorObj.callClientId
          })
          
          // Attempt to validate the assistant
          if (typeof window !== 'undefined') {
            const assistantId = sessionIdRef.current
            if (assistantId) {
              fetch(`/api/vapi/assistant/validate?assistantId=${assistantId}`)
                .then(res => res.json())
                .then(data => {
                  console.error('Assistant validation result:', data)
                  if (!data.valid) {
                    console.error('Assistant validation failed:', data.diagnosis)
                  }
                })
                .catch(err => console.error('Failed to validate assistant:', err))
            }
          }
        } else if ('message' in errorObj) {
          errorDetail = (errorObj as Error).message
        } else if ('errorMsg' in errorObj) {
          errorDetail = errorObj.errorMsg as string
        }
        
        if ('code' in errorObj && errorObj.code) {
          errorCode = `Code: ${errorObj.code}`
        }
      } else if (typeof error === 'string') {
        errorDetail = error
      }
      
      const userMessage = diagnosis || `Voice assistant error: ${errorDetail}${errorCode ? ` (${errorCode})` : ""}`
      
      setVapiState(prev => ({ 
        ...prev, 
        error: userMessage,
        isLoading: false 
      }))
      
      optionsRef.current.onError?.(error)
    })
    
    // Message event
    vapi.on('message', (message: VapiMessage) => {
      // Check for function calls
      if (isFunctionCallMessage(message) && message.functionCall) {
        console.log('🔧 Function call:', message.functionCall.name)
        optionsRef.current.onFunctionCall?.(
          message.functionCall.name, 
          message.functionCall.parameters
        )
      }
      
      // Pass all messages to parent
      optionsRef.current.onMessage?.(message)
    })
    
  }, [setupAudioAnalyzer])
  
  // Start VAPI call
  const startCall = useCallback(async (assistantIdOrConfig: string | AssistantConfigType) => {
    // Check if token is expired and refresh if needed
    if (isExpiringSoon && !tokenLoading) {
      console.log('[useVapiSession] Token expiring, refreshing before call...');
      await refreshToken();
      // Force recreate instance with new token
      if (vapiManagerRef.current) {
        const sessionId = sessionIdRef.current;
        await createVapiInstance(sessionId || undefined);
      }
    }
    
    // Auto-initialize VAPI instance if it doesn't exist
    if (!vapiManagerRef.current) {
      console.log('🎙️ VAPI Manager not found, creating one...')
      const success = await createVapiInstance()
      if (!success || !vapiManagerRef.current) {
        throw new Error('Failed to initialize VAPI Manager')
      }
    }
    
    try {
      setVapiState(prev => ({ ...prev, isLoading: true, error: null }))
      
      // Determine assistant ID
      const assistantId = typeof assistantIdOrConfig === 'string' 
        ? assistantIdOrConfig 
        : assistantIdOrConfig.assistantId || ''
      
      console.log(`🎯 Starting VAPI call with assistant ID: ${assistantId}`)
      
      // Check if we need to resume from a previous state
      let resumeMessages = undefined
      if (sessionIdRef.current) {
        try {
          const response = await fetch(`/api/conversation/load-state?sessionId=${sessionIdRef.current}`)
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.state) {
              resumeMessages = result.state.messages
              console.log(`📦 Found ${resumeMessages.length} messages to resume from`)
            }
          }
        } catch (e) {
          console.warn('Failed to load conversation state:', e)
        }
      }
      
      // Start session with VAPIManager
      await vapiManagerRef.current.startSession({
        assistantId,
        resumeFromMessages: resumeMessages,
        variableValues: typeof assistantIdOrConfig === 'object' ? assistantIdOrConfig.variableValues : undefined
      })
      
      console.log('✅ VAPI call started successfully')
    } catch (error) {
      console.error('Error starting VAPI call:', error)
      
      // Enhanced error logging for 400 responses
      if (error && typeof error === 'object' && 'url' in error && 'status' in error) {
        console.error('VAPI API Error Details:', {
          url: (error as any).url,
          status: (error as any).status,
          statusText: (error as any).statusText,
          type: (error as any).type,
          redirected: (error as any).redirected,
          errorObject: error
        })
        
        // Try to extract the response body for more details
        if ((error as any).data || (error as any).error) {
          console.error('VAPI Error Response Body:', {
            data: (error as any).data,
            error: (error as any).error
          })
        }
        
        // For 400 errors, try to get more specific validation details
        if ((error as any).status === 400) {
          console.error('🚨 VAPI 400 Bad Request - Configuration Issue Detected')
          
          // Try to access the response text if available
          try {
            const errorResponse = (error as any).error || {}
            if (errorResponse.message && Array.isArray(errorResponse.message)) {
              console.error('VAPI Validation Errors:', errorResponse.message)
              
              // Try to identify specific field issues
              errorResponse.message.forEach((msg: string, index: number) => {
                console.error(`Validation Error ${index + 1}:`, msg)
                
                // Check for common issues
                if (msg.includes('provider')) {
                  console.error('💡 Fix: Ensure model/voice/transcriber objects have required "provider" field')
                }
                if (msg.includes('model')) {
                  console.error('💡 Fix: Check model configuration structure and field names')
                }
                if (msg.includes('voice')) {
                  console.error('💡 Fix: Check voice configuration structure and voiceId')
                }
                if (msg.includes('transcriber')) {
                  console.error('💡 Fix: Check transcriber configuration structure')
                }
              })
            }
          } catch (parseError) {
            console.error('Failed to parse detailed error response:', parseError)
          }
        }
      }
      
      setVapiState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: 'Failed to start voice session' 
      }))
      throw error
    }
  }, [createVapiInstance, isExpiringSoon, tokenLoading, refreshToken])
  
  // Stop VAPI call
  const stopCall = useCallback(async () => {
    if (!vapiManagerRef.current) return
    
    try {
      await vapiManagerRef.current.stopSession()
      console.log('✅ VAPI call stopped')
    } catch (error) {
      console.error('Error stopping VAPI call:', error)
    }
  }, [])
  
  // Pause VAPI call with conversation state preservation
  const pauseCall = useCallback(async (sessionId: string): Promise<string | null> => {
    if (!vapiManagerRef.current) {
      console.error('No VAPI Manager instance')
      return null
    }
    
    if (!sessionId) {
      console.error('No session ID provided for pause')
      return null
    }
    
    try {
      setVapiState(prev => ({ ...prev, isLoading: true }))
      
      // Get current conversation state
      const messages = vapiManagerRef.current.getConversationHistory()
      const metadata = vapiManagerRef.current.getSessionMetadata()
      const assistantId = vapiManagerRef.current.getCurrentAssistantId() || ''
      
      console.log(`💾 Saving conversation state: ${messages.length} messages`)
      
      // Save conversation state to database
      const response = await fetch('/api/conversation/save-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          assistantId,
          messages,
          sessionMetadata: metadata
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save conversation state')
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to save state')
      }
      
      // Stop VAPI session (this stops billing)
      await vapiManagerRef.current.stopSession()
      
      console.log(`✅ Session paused successfully. State ID: ${result.stateId}`)
      return result.stateId
      
    } catch (error) {
      console.error('Error pausing VAPI call:', error)
      setVapiState(prev => ({ ...prev, error: 'Failed to pause session' }))
      return null
    } finally {
      setVapiState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])
  
  // Resume VAPI call from saved state
  const resumeCall = useCallback(async (sessionId: string): Promise<void> => {
    if (!sessionId) {
      throw new Error('No session ID provided for resume')
    }
    
    try {
      setVapiState(prev => ({ ...prev, isLoading: true, error: null }))
      
      // Load conversation state
      const response = await fetch(`/api/conversation/load-state?sessionId=${sessionId}`)
      if (!response.ok) {
        throw new Error('Failed to load conversation state')
      }
      
      const result = await response.json()
      if (!result.success || !result.state) {
        throw new Error(result.error || 'No conversation state found')
      }
      
      const { assistantId, messages, variableValues } = result.state
      
      console.log(`📦 Resuming session with ${messages.length} messages`)
      
      // Create VAPI Manager if needed
      if (!vapiManagerRef.current) {
        const success = await createVapiInstance(sessionId)
        if (!success || !vapiManagerRef.current) {
          throw new Error('Failed to initialize VAPI Manager')
        }
      }
      
      // Resume session with saved state
      await vapiManagerRef.current.startSession({
        assistantId,
        resumeFromMessages: messages,
        variableValues
      })
      
      console.log('✅ Session resumed successfully')
      
    } catch (error) {
      console.error('Error resuming VAPI call:', error)
      setVapiState(prev => ({ 
        ...prev, 
        error: 'Failed to resume session',
        isLoading: false 
      }))
      throw error
    }
  }, [createVapiInstance])
  
  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!vapiManagerRef.current) return
    
    const vapi = (vapiManagerRef.current as any).vapi
    if (!vapi) return
    
    const newMutedState = !vapiState.isMuted
    
    try {
      // Try standard setMuted method
      if (typeof vapi.setMuted === 'function') {
        vapi.setMuted(newMutedState)
      } else {
        console.warn('setMuted method not available on VAPI instance')
      }
      
      setVapiState(prev => ({ ...prev, isMuted: newMutedState }))
      console.log(`🎤 Microphone ${newMutedState ? 'muted' : 'unmuted'}`)
    } catch (error) {
      console.error('Error toggling mute:', error)
    }
  }, [vapiState.isMuted])
  
  // Check if instance is ready
  const isInstanceReady = useCallback(() => {
    return vapiManagerRef.current !== null
  }, [])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up VAPI Manager
      if (vapiManagerRef.current) {
        vapiManagerRef.current.destroy()
      }
      
      // Clean up audio
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])
  
  return {
    // State
    vapiState,
    audioLevel,
    
    // Authentication state
    isAuthLoading: tokenLoading,
    authError: tokenError,
    
    // Methods
    createVapiInstance,
    startCall,
    stopCall,
    pauseCall,
    resumeCall,
    toggleMute,
    isInstanceReady,
    
    // Refs for direct access
    vapiManagerRef,
    audioContextRef,
    analyserRef
  }
}