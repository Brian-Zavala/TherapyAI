'use client'

import { useState, useRef, useCallback, useEffect, MutableRefObject } from 'react'
import { 
  VapiState, 
  AssistantConfigType
} from '@/types/therapy-session'
import { 
  ERROR_MESSAGES
} from '@/lib/therapy-session/constants'
import { 
  VapiMessage, 
  isFunctionCallMessage
} from '@/types/vapi'
import { normalizeAudioLevel } from '@/lib/therapy-session/utils'
import { useVapiToken } from './useVapiToken'
import { useVapiPublicKey } from './useVapiPublicKey'
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
  const activePauseRequestRef = useRef<string | null>(null) // Track active pause request
  
  // Get user session
  const { data: session } = useSession()
  
  // Audio analysis for waveform visualization
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !vapiState.isActive) {
      setAudioLevel(0)
      return
    }
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    
    // Get frequency data
    analyserRef.current.getByteFrequencyData(dataArray)
    
    // Focus on voice frequency range (85-255 Hz for fundamental frequency)
    // This helps filter out non-voice sounds
    const voiceRangeStart = Math.floor(85 * analyserRef.current.frequencyBinCount / (audioContextRef.current?.sampleRate || 48000) * 2)
    const voiceRangeEnd = Math.floor(3000 * analyserRef.current.frequencyBinCount / (audioContextRef.current?.sampleRate || 48000) * 2)
    
    let voiceSum = 0
    let voiceCount = 0
    for (let i = voiceRangeStart; i <= voiceRangeEnd && i < dataArray.length; i++) {
      voiceSum += dataArray[i]
      voiceCount++
    }
    const voiceAverage = voiceCount > 0 ? voiceSum / voiceCount : 0
    
    // Get time domain data for RMS calculation
    const timeDomainArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteTimeDomainData(timeDomainArray)
    
    // Calculate RMS for overall volume
    let sum = 0
    for (let i = 0; i < timeDomainArray.length; i++) {
      const sample = (timeDomainArray[i] - 128) / 128
      sum += sample * sample
    }
    const rms = Math.sqrt(sum / timeDomainArray.length)
    const rmsLevel = rms * 100
    
    // Combine voice frequency average with RMS for better detection
    const normalizedVoiceLevel = normalizeAudioLevel(voiceAverage)
    const finalLevel = Math.max(normalizedVoiceLevel, rmsLevel * 30)
    
    // More frequent logging for debugging
    if (Math.random() < 0.1) { // 10% chance, roughly every ~170ms
      console.log('🎤 Audio Analysis:', {
        voiceAverage: voiceAverage.toFixed(2),
        normalizedVoiceLevel: normalizedVoiceLevel.toFixed(2),
        rmsLevel: rmsLevel.toFixed(2),
        finalLevel: finalLevel.toFixed(2),
        maxFreq: Math.max(...dataArray),
        isActive: vapiState.isActive,
        analyserConnected: !!analyserRef.current
      })
    }
    
    setAudioLevel(finalLevel)
    optionsRef.current.onAudioLevelChange?.(finalLevel)
    
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
      
      // Clean up existing audio resources
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop())
        audioStreamRef.current = null
      }
      if (audioContextRef.current) {
        await audioContextRef.current.close()
        audioContextRef.current = null
      }
      
      // Get user media stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false, // Disable to get raw audio
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000
        } 
      })
      audioStreamRef.current = stream
      
      // Create audio context and analyzer
      // @ts-expect-error - webkitAudioContext is a vendor-prefixed API
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      
      // Resume audio context if suspended (required in some browsers)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }
      
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 2048 // Increase for better frequency resolution
      analyserRef.current.smoothingTimeConstant = 0.3 // Less smoothing for more responsive animation
      
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      // Verify audio track is not muted
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = true
        console.log('📻 Audio track state:', {
          enabled: audioTrack.enabled,
          muted: audioTrack.muted,
          label: audioTrack.label,
          readyState: audioTrack.readyState,
          settings: audioTrack.getSettings()
        })
      }
      
      console.log('✅ Audio analyzer setup complete:', {
        audioContext: audioContextRef.current.state,
        sampleRate: audioContextRef.current.sampleRate,
        analyserFftSize: analyserRef.current.fftSize,
        frequencyBinCount: analyserRef.current.frequencyBinCount,
        streamActive: stream.active,
        audioTracks: stream.getAudioTracks().length
      })
      
      // Start analyzing
      analyzeAudio()
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
        // If token is still loading, this is expected - don't treat as error
        if (tokenLoading) {
          console.log('[useVapiSession] Token is still loading, waiting...');
          return false; // Return false instead of throwing error
        }
        
        // If we have a token error, use that message
        if (tokenError) {
          console.error('[useVapiSession] Token error:', tokenError);
          setVapiState(prev => ({ ...prev, error: tokenError }));
          optionsRef.current.onError?.(new Error(tokenError));
          return false;
        }
        
        // Otherwise, token is not available for unknown reason
        const errorMsg = 'Failed to obtain authentication token. Please try refreshing the page or logging in again.';
        console.error('[useVapiSession] No token available:', { tokenError, tokenLoading });
        setVapiState(prev => ({ ...prev, error: errorMsg }));
        optionsRef.current.onError?.(new Error(errorMsg));
        return false;
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
      optionsRef.current.onError?.(error instanceof Error ? error : new Error(errorMessage))
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

    window.addEventListener('vapi-auth-error', handleAuthError as unknown as EventListener);
    
    return () => {
      window.removeEventListener('vapi-auth-error', handleAuthError as unknown as EventListener);
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
      
      // Check if VAPI provides access to audio stream or levels
      console.log('🔍 Checking VAPI instance for audio access:', {
        hasGetAudioStream: typeof (vapi as any).getAudioStream === 'function',
        hasGetMediaStream: typeof (vapi as any).getMediaStream === 'function',
        hasGetUserMedia: typeof (vapi as any).getUserMedia === 'function',
        hasAudioContext: !!(vapi as any).audioContext,
        hasAnalyser: !!(vapi as any).analyser,
        vapiKeys: Object.keys(vapi || {}),
        vapiPrototype: Object.getPrototypeOf(vapi) ? Object.getOwnPropertyNames(Object.getPrototypeOf(vapi)) : []
      })
      
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
      } else if ((event as any)?.reason) {
        reason = String((event as any).reason)
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
      
      // Navigate to dashboard when session completes naturally
      // Check if this is a natural completion (not user-initiated)
      const isNaturalCompletion = reason && 
        (reason.includes('max-duration') || 
         reason.includes('silence-timeout') || 
         reason.includes('assistant-request') ||
         reason.includes('completed'))
      
      if (isNaturalCompletion) {
        console.log('🚀 Natural session completion detected, navigating to dashboard')
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1000) // Delay to show completion message if any
      }
      
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
              (async () => {
                try {
                  const res = await fetch(`/api/vapi/assistant/validate?assistantId=${assistantId}`)
                  const data = await res.json()
                  console.error('Assistant validation result:', data)
                  if (!data.valid) {
                    console.error('Assistant validation failed:', data.diagnosis)
                  }
                } catch (err) {
                  console.error('Failed to validate assistant:', err)
                }
              })()
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
      // Debug: Log all message types to find audio-related events
      console.log('📨 VAPI Message:', {
        type: (message as any).type,
        hasVolume: 'volume' in (message as any),
        hasAudioLevel: 'audioLevel' in (message as any),
        keys: Object.keys(message || {})
      })
      
      // Log transcript messages specifically
      if ((message as any).type === 'transcript') {
        console.log('🎙️ TRANSCRIPT MESSAGE RECEIVED:', {
          role: (message as any).role,
          text: (message as any).transcript?.substring(0, 50) + '...',
          transcriptType: (message as any).transcriptType,
          hasOnMessage: !!optionsRef.current.onMessage
        })
      }
      
      // Check for function calls
      if (isFunctionCallMessage(message) && message.functionCall) {
        console.log('🔧 Function call:', message.functionCall.name)
        optionsRef.current.onFunctionCall?.(
          message.functionCall.name, 
          message.functionCall.parameters
        )
      }
      
      // Check for volume level in messages (some VAPI implementations provide this)
      if ((message as any).type === 'volume-level' && (message as any).volume !== undefined) {
        const volumeLevel = (message as any).volume * 100
        console.log('📊 VAPI Volume Level:', volumeLevel)
        setAudioLevel(volumeLevel)
        optionsRef.current.onAudioLevelChange?.(volumeLevel)
      }
      
      // Pass all messages to parent
      optionsRef.current.onMessage?.(message)
    })
    
    // Try to listen for volume-level events specifically
    if (typeof vapi.on === 'function') {
      vapi.on('volume-level', (data: any) => {
        if (data && typeof data.volume === 'number') {
          const volumeLevel = data.volume * 100
          console.log('🎤 VAPI Volume Event:', volumeLevel)
          setAudioLevel(volumeLevel)
          optionsRef.current.onAudioLevelChange?.(volumeLevel)
        }
      })
    }
    
  }, [setupAudioAnalyzer])
  
  // Validate assistant configuration before starting call
  const validateAssistantBeforeCall = useCallback(async (assistantIdOrConfig: string | AssistantConfigType) => {
    if (typeof assistantIdOrConfig === 'string') {
      // Validate assistant ID exists
      try {
        const response = await fetch(`/api/vapi/assistant/validate?assistantId=${assistantIdOrConfig}`)
        if (response.ok) {
          const result = await response.json()
          if (!result.valid) {
            throw new Error(`Assistant validation failed: ${result.reason || 'Unknown reason'}`)
          }
        }
      } catch (error) {
        console.warn('Assistant validation request failed, proceeding anyway:', error)
        // Don't block the call if validation endpoint fails
      }
    } else {
      // For inline configs, use the config cleaner
      const { cleanAndValidateVapiConfig } = await import('@/lib/vapi-config-cleaner')
      try {
        cleanAndValidateVapiConfig(assistantIdOrConfig)
      } catch (error) {
        throw new Error(`Configuration validation failed: ${error instanceof Error ? error.message : 'Invalid configuration'}`)
      }
    }
  }, [])

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
    
    // Validate configuration before proceeding
    try {
      await validateAssistantBeforeCall(assistantIdOrConfig)
    } catch (error) {
      console.error('Assistant validation failed:', error)
      setVapiState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Configuration validation failed'
      }))
      throw error
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
      
      // Determine if we're using inline config or assistant ID
      if (typeof assistantIdOrConfig === 'string') {
        // Assistant ID approach
        console.log(`🎯 Starting VAPI call with assistant ID: ${assistantIdOrConfig}`)
        
        await vapiManagerRef.current.startSession({
          assistantId: assistantIdOrConfig,
          resumeFromMessages: resumeMessages,
          sessionId: sessionIdRef.current
        })
      } else {
        // Inline configuration approach
        console.log('🎭 Starting VAPI call with inline configuration')
        
        // Check if this is an inline config (has model, voice, transcriber) or assistant ID config
        if ('model' in assistantIdOrConfig && 'voice' in assistantIdOrConfig && 'transcriber' in assistantIdOrConfig) {
          // Full inline configuration
          await vapiManagerRef.current.startSession({
            assistantConfig: assistantIdOrConfig,
            resumeFromMessages: resumeMessages,
            sessionId: sessionIdRef.current
          })
        } else if ('assistantId' in assistantIdOrConfig && assistantIdOrConfig.assistantId) {
          // Assistant ID with overrides
          console.log(`🎯 Starting VAPI call with assistant ID: ${assistantIdOrConfig.assistantId}`)
          
          await vapiManagerRef.current.startSession({
            assistantId: assistantIdOrConfig.assistantId,
            resumeFromMessages: resumeMessages,
            variableValues: assistantIdOrConfig.variableValues,
            sessionId: sessionIdRef.current
          })
        } else {
          throw new Error('Invalid configuration: must provide either assistantId or full inline config')
        }
      }
      
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
  }, [createVapiInstance, isExpiringSoon, tokenLoading, refreshToken, validateAssistantBeforeCall])
  
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
    
    // Track operation start time
    const operationStartTime = Date.now()
    
    // Generate unique request ID
    const requestId = `pause-${sessionId}-${operationStartTime}`
    
    // Check if there's already an active pause request for this session
    if (activePauseRequestRef.current && activePauseRequestRef.current.startsWith(`pause-${sessionId}`)) {
      console.warn('Pause request already in progress, ignoring duplicate')
      return null
    }
    
    // Set the active request
    activePauseRequestRef.current = requestId
    
    try {
      setVapiState(prev => ({ ...prev, isLoading: true }))
      
      // Get current conversation state
      const messages = vapiManagerRef.current.getConversationHistory()
      const metadata = vapiManagerRef.current.getSessionMetadata()
      const currentAssistantId = vapiManagerRef.current.getCurrentAssistantId()
      
      console.log(`💾 Saving conversation state: ${messages.length} messages`)
      
      // Prepare save data based on whether we're using inline config or assistant ID
      const saveData: any = {
        sessionId,
        messages,
        sessionMetadata: metadata
      }
      
      // If using inline config, we need to save the full config
      if (currentAssistantId === 'inline-config') {
        const assistantConfig = vapiManagerRef.current.getCurrentAssistantConfig()
        if (assistantConfig) {
          saveData.assistantConfig = assistantConfig
          console.log('💾 Saving inline configuration session')
        } else {
          console.error('❌ Inline config detected but no config found to save')
          saveData.isInlineConfig = true
        }
      } else {
        saveData.assistantId = currentAssistantId || ''
      }
      
      // Save conversation state to database with timeout
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout
      
      try {
        const response = await fetch('/api/conversation/save-state', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(saveData),
          signal: controller.signal
        })
        
        clearTimeout(timeout)
      } finally {
        clearTimeout(timeout)
      }
      
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
      
      // Track telemetry for successful pause
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.capture('vapi_session_paused', {
          sessionId,
          stateId: result.stateId,
          messageCount: messages.length,
          pauseDuration: Date.now() - (metadata.startTime || 0),
          conversationDuration: metadata.totalDuration,
          operationDuration: Date.now() - operationStartTime,
          success: true
        })
      }
      
      // Clear active request on success
      activePauseRequestRef.current = null
      
      return result.stateId
      
    } catch (error) {
      console.error('Error pausing VAPI call:', error)
      
      // Handle different error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setVapiState(prev => ({ ...prev, error: 'Request timeout - please check your connection' }))
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
          setVapiState(prev => ({ ...prev, error: 'Network error - please check your connection' }))
        } else {
          setVapiState(prev => ({ ...prev, error: error.message || 'Failed to pause session' }))
        }
      } else {
        setVapiState(prev => ({ ...prev, error: 'Failed to pause session' }))
      }
      
      // Track telemetry for failed pause
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.capture('vapi_session_pause_failed', {
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
          success: false
        })
      }
      
      // Clear active request on error
      activePauseRequestRef.current = null
      
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
    
    // Check if session is already active
    if (vapiState.isActive) {
      console.warn('Cannot resume - session is already active')
      throw new Error('Session is already active. Please end the current session before resuming another.')
    }
    
    // Check if VAPI Manager is already active
    if (vapiManagerRef.current?.getSessionStatus().isActive) {
      console.warn('Cannot resume - VAPI Manager reports active session')
      throw new Error('An active voice session is already in progress')
    }
    
    // Track operation start time
    const operationStartTime = Date.now()
    
    try {
      setVapiState(prev => ({ ...prev, isLoading: true, error: null }))
      
      // Load conversation state with timeout
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout
      
      try {
        const response = await fetch(`/api/conversation/load-state?sessionId=${sessionId}`, {
          signal: controller.signal
        })
        
        clearTimeout(timeout)
        
        if (!response.ok) {
          throw new Error('Failed to load conversation state')
        }
        
        const result = await response.json()
        if (!result.success || !result.state) {
          throw new Error(result.error || 'No conversation state found')
        }
        
        return result
      } finally {
        clearTimeout(timeout)
      }
      
      const { assistantId, assistantConfig, messages, variableValues } = result.state
      
      console.log(`📦 Resuming session with ${messages.length} messages`)
      
      // Create VAPI Manager if needed
      if (!vapiManagerRef.current) {
        const success = await createVapiInstance(sessionId)
        if (!success || !vapiManagerRef.current) {
          throw new Error('Failed to initialize VAPI Manager')
        }
      }
      
      // Resume session with saved state
      if (assistantConfig) {
        // Resume with inline configuration
        console.log('🎭 Resuming with inline assistant configuration')
        await vapiManagerRef.current.startSession({
          assistantConfig,
          resumeFromMessages: messages
        })
      } else if (assistantId) {
        // Resume with assistant ID
        console.log(`🎯 Resuming with assistant ID: ${assistantId}`)
        await vapiManagerRef.current.startSession({
          assistantId,
          resumeFromMessages: messages,
          variableValues
        })
      } else {
        throw new Error('No assistant configuration found in saved state')
      }
      
      console.log('✅ Session resumed successfully')
      
      // Track telemetry for successful resume
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.capture('vapi_session_resumed', {
          sessionId,
          messageCount: messages.length,
          hasAssistantConfig: !!assistantConfig,
          hasAssistantId: !!assistantId,
          resumeDuration: Date.now() - (result.state.lastActiveTime ? new Date(result.state.lastActiveTime).getTime() : 0),
          operationDuration: Date.now() - operationStartTime,
          success: true
        })
      }
      
    } catch (error) {
      console.error('Error resuming VAPI call:', error)
      
      // Handle different error types
      let errorMessage = 'Failed to resume session'
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timeout - please check your connection'
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error - please check your connection'
        } else {
          errorMessage = error.message || 'Failed to resume session'
        }
      }
      
      // Track telemetry for failed resume
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.capture('vapi_session_resume_failed', {
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
          errorMessage,
          success: false
        })
      }
      
      setVapiState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isLoading: false 
      }))
      throw error
    }
  }, [createVapiInstance, vapiState.isActive])
  
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
      
      // Clear active pause request
      activePauseRequestRef.current = null
      
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