'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import React from 'react'
// Framer Motion import commented out due to build errors
// import { motion, AnimatePresence } from 'framer-motion'
import Vapi from '@vapi-ai/web'
import dynamic from 'next/dynamic'
import { COUPLE_THERAPY_ASSISTANT_CONFIG } from '@/lib/vapi'

// Dynamically import VoiceWaveform with no SSR to avoid hydration issues
const VoiceWaveform = dynamic(() => import('./VoiceWaveform'), { 
  ssr: false
})

interface AssistantConfigType {
  id: string;
  name: string;
  type: string;
  model: {
    provider: string;
    model: string;
    temperature: number;
    messages: Array<{
      role: string;
      content: string;
    }>;
  };
  voice: {
    provider: string;
    voiceId: string;
  };
  firstMessage: string;
}

type TherapyButtonProps = {
  userId: string;
  assistantConfig?: AssistantConfigType;
  therapyType?: string;
}

function TherapyButton({ 
  userId, 
  assistantConfig = COUPLE_THERAPY_ASSISTANT_CONFIG, 
  therapyType = 'couple' 
}: TherapyButtonProps) {
  // State management
  const [isLoading, setIsLoading] = useState(false)
  const [isCallActive, setIsCallActive] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [transcriptChunks, setTranscriptChunks] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState<number>(0)
  
  // Refs for performance optimization
  // Using ExtendedVapi type to handle custom properties
  const vapiInstanceRef = useRef<ExtendedVapi | null>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const analyser = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  
  // Check for existing session on component mount using useCallback for performance
  const checkForActiveSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/active?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        if (data && data.id) {
          // Only store the session ID
          setSessionId(data.id)
          console.log('Found existing session, but not auto-starting:', data.id)
          // Don't auto-start the session
        }
      }
    } catch (error) {
      console.error('Error checking for active session:', error)
    }
  }, [userId])
  
  useEffect(() => {
    checkForActiveSession()
    
    // Cleanup on unmount
    return () => {
      cleanupResources()
    }
  }, [checkForActiveSession])
  
  // Cleanup function extracted for reuse
  const cleanupResources = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    if (audioContext.current) {
      audioContext.current.close()
      audioContext.current = null
    }
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop())
      audioStreamRef.current = null
    }
    
    document.body.classList.remove('session-active')
  }
  
  // Simplified audio analyzer setup
  const setupAudioAnalyzer = async () => {
    // Avoid creating multiple audio contexts
    if (audioContext.current) return
    
    try {
      // Request audio access with optimal settings
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 44100
        } 
      })
      
      // Store stream for cleanup
      audioStreamRef.current = stream
      
      // Create audio context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      audioContext.current = new AudioContextClass({ 
        latencyHint: 'interactive',
        sampleRate: 44100
      })
      
      // Set up analyzer
      analyser.current = audioContext.current.createAnalyser()
      analyser.current.fftSize = 256
      analyser.current.smoothingTimeConstant = 0.7
      
      // Connect audio
      const source = audioContext.current.createMediaStreamSource(stream)
      source.connect(analyser.current)
      
      // Create array to hold frequency data
      const dataArray = new Uint8Array(analyser.current.frequencyBinCount)
      
      // Start analyzing audio
      const updateAudioLevel = () => {
        if (!analyser.current) return
        
        // Get frequency data
        analyser.current.getByteFrequencyData(dataArray)
        
        // Simple average calculation
        let sum = 0
        const speechRange = Math.min(dataArray.length, 30) // Focus on first ~30 bins (speech range)
        
        for (let i = 0; i < speechRange; i++) {
          sum += dataArray[i]
        }
        
        // Normalize to 0-100
        const level = sum / speechRange
        
        // Use graduated normalization to allow for smoother transitions
        // This creates a more natural animation between silence and speech
        let normalizedLevel = 0;
        
        if (level < 30) {
          // Complete silence or very low background noise (0-3)
          normalizedLevel = level < 10 ? 0 : level / 3; 
        } else if (level < 50) {
          // Low sounds (3-15)
          normalizedLevel = 10 + ((level - 30) / 20) * 10;
        } else if (level < 80) {
          // Normal speech (15-50)
          normalizedLevel = 20 + ((level - 50) / 30) * 30;
        } else {
          // Loud speech (50-100)
          normalizedLevel = 50 + Math.min(50, (level - 80) * 1.5);
        }
        
        // Update state
        setAudioLevel(normalizedLevel)
        
        // Continue loop
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
      }
      
      // Resume audio for Safari
      if (audioContext.current.state === 'suspended') {
        try {
          await audioContext.current.resume()
        } catch (e) {
          console.warn('Could not resume audio context, waiting for user interaction')
        }
      }
      
      // Start analysis loop
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
    } catch (err) {
      console.error('Error setting up audio analyzer:', err)
      setErrorMessage('Could not access microphone. Please check permissions.')
    }
  }
  
  // Extend Vapi type to include our custom properties
  type ExtendedVapi = Vapi & {
    _customData?: {
      systemPrompt?: string
      firstMessage?: string
    }
  }
  
  // Create Vapi instance with optimizations
  const createVapiInstance = useCallback(async (userProfile?: Record<string, string>) => {
    try {
      // Dispose of any existing instance
      if (vapiInstanceRef.current) {
        try {
          await vapiInstanceRef.current.stop()
        } catch (e) {
          console.warn('Error stopping existing Vapi instance:', e)
        }
        vapiInstanceRef.current = null
      }
      
      // Get token with better error handling
      let token
      try {
        console.log('Attempting to fetch Vapi token...');
        
        // Try getting token from our API
        const tokenResponse = await fetch('/api/vapi/token');
        
        if (tokenResponse.ok) {
          const data = await tokenResponse.json();
          token = data.token;
          console.log('Successfully received token from API');
        } else {
          // If API fails, log error and try fallback
          const errorText = await tokenResponse.text().catch(() => 'Unknown error');
          console.error('Token API error:', tokenResponse.status, errorText);
          
          // Fall back to direct API key
          token = process.env.NEXT_PUBLIC_VAPI_API_KEY;
          console.log('Falling back to direct API key');
        }
      } catch (e) {
        console.error('Error fetching token:', e);
        // Ultimate fallback to direct API key
        token = process.env.NEXT_PUBLIC_VAPI_API_KEY;
        console.log('Exception caught, using direct API key');
      }
      
      if (!token) {
        throw new Error('No Vapi credentials available - check your API key configuration');
      }
      
      console.log('Token obtained:', token ? 'Token available (not shown for security)' : 'No token');
      
      // Create instance
      vapiInstanceRef.current = new Vapi(token)
      
      // Customize assistant if profile available
      if (userProfile && vapiInstanceRef.current) {
        try {
          const { getPersonalizedAssistantConfig, getPersonalizedSystemPromptForType, getPersonalizedFirstMessageForType } = await import('@/lib/vapi')
          
          const userProfileData = {
            userName: userProfile.name,
            partnerName: userProfile.partnerName,
            relationshipStatus: userProfile.relationshipStatus
          };
          
          // Get personalized prompt and message based on therapy type
          const systemPrompt = getPersonalizedSystemPromptForType(therapyType, userProfileData);
          const firstMessage = getPersonalizedFirstMessageForType(therapyType, userProfileData);
          
          vapiInstanceRef.current._customData = {
            systemPrompt,
            firstMessage
          }
        } catch (err) {
          console.error('Error applying personalizations:', err)
        }
      }
      
      // Set up event handlers
      vapiInstanceRef.current.on('call-start', () => {
        console.log('Vapi call started')
        setIsCallActive(true)
        setErrorMessage(null)
        
        // Force audio setup on call start
        setupAudioAnalyzer()
      })
      
      vapiInstanceRef.current.on('call-end', (event: any) => {
        // Log the complete event for debugging
        console.log('Vapi call ended, complete event:', event);
        
        // Extract reason if available
        let reason = 'No reason provided';
        if (typeof event === 'string') {
          reason = event;
        } else if (event && typeof event === 'object' && 'reason' in event) {
          reason = String(event.reason);
        }
        
        console.log('Call end reason:', reason);
        setIsCallActive(false);
        
        // If there's a specific reason other than normal ending, show it to the user
        if (reason && reason !== 'ended' && reason !== 'normal') {
          setErrorMessage(`Session ended: ${reason}. You can try again if needed.`);
        } else {
          // Clear any error messages for normal endings
          setErrorMessage(null);
        }
        
        if (sessionId) {
          // Directly use the current ref value to avoid circular dependencies
          handleCallEndRef.current();
        }
      })
      
      vapiInstanceRef.current.on('error', (error: unknown) => {
        // Log the complete error for debugging
        console.error('Vapi error (complete):', error)
        
        // Create a more descriptive error message
        let errorDetail = "Unknown error";
        try {
          // Try to extract meaningful error information based on different possible formats
          if (error && typeof error === 'object') {
            // For error object format
            if ('message' in error && typeof (error as any).message === 'string') {
              errorDetail = (error as any).message;
            } 
            // For error code format
            else if ('code' in error) {
              errorDetail = `Error code: ${(error as any).code}`;
            }
            // For error status format
            else if ('status' in error) {
              errorDetail = `Status: ${(error as any).status}`;
            }
            // For error that contains detail field
            else if ('detail' in error && typeof (error as any).detail === 'string') {
              errorDetail = (error as any).detail;
            }
            // For error with keys
            else if (Object.keys(error).length > 0) {
              const keys = Object.keys(error);
              const values = keys.map(key => (error as any)[key]).filter(v => v !== undefined);
              errorDetail = `${keys.join(', ')}: ${values.join(', ')}`;
            }
          } else if (typeof error === 'string') {
            // Direct string error
            errorDetail = error;
          } else if (error instanceof Error) {
            // Standard error object
            errorDetail = error.message;
          }
        } catch (e) {
          errorDetail = "Error parsing error details";
          console.error("Error while parsing error details:", e);
        }
        
        // Set user-friendly message
        setErrorMessage(`Voice assistant error: ${errorDetail}. Please try again.`);
        
        if (sessionId) {
          // Directly use the current ref value to avoid circular dependencies
          handleCallEndRef.current();
        }
      })
      
      // Transcript handling
      vapiInstanceRef.current.on('message', (message: any) => {
        if (message.type === 'transcript') {
          setTranscriptChunks(prev => [...prev, `USER: ${message.transcript}`])
        } else if (message.type === 'model-output' && message.content) {
          setTranscriptChunks(prev => [...prev, `THERAPIST: ${message.content}`])
        }
      })
      
      return true
    } catch (error) {
      console.error('Failed to create Vapi instance:', error)
      setErrorMessage(`Failed to create Vapi instance: ${error}`)
      return false
    }
  }, [sessionId, therapyType])
  
  // Start therapy session
  const startTherapySession = useCallback(async () => {
    setErrorMessage(null)
    setIsLoading(true)
    
    try {
      // Get user profile
      let userProfile = null
      try {
        const profileResponse = await fetch('/api/user/profile')
        if (profileResponse.ok) {
          userProfile = await profileResponse.json()
        }
      } catch (err) {
        console.warn('Could not load user profile, using default experience')
      }
      
      // Create session in database
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime: new Date().toISOString(),
          date: new Date().toISOString(), // This is required by the schema
          status: 'active',
          duration: 60, // Required by the schema, default 60 minutes
          theme: therapyType === 'couple' ? 'Relationship Counseling' : 
                 therapyType === 'solo' ? 'Individual Therapy' : 'Family Therapy',
          notes: `${therapyType} therapy session started at ${new Date().toLocaleTimeString()}`,
          // Include context for session personalization
          context: userProfile ? {
            userName: userProfile.name,
            partnerName: userProfile.partnerName,
            relationshipStatus: userProfile.relationshipStatus,
            therapyType: therapyType
          } : undefined,
        }),
      })
      
      if (!response.ok) {
        // Try to get the detailed error message from the response
        try {
          const errorData = await response.json();
          console.error('Session creation error details:', errorData);
          throw new Error(`Failed to create session: ${errorData.error || response.statusText}`);
        } catch (jsonError) {
          // If can't parse JSON, use the status text
          throw new Error(`Failed to create session: ${response.status} ${response.statusText}`);
        }
      }
      
      try {
        const session = await response.json()
        console.log('Session created successfully:', session)
        
        if (!session.id) {
          throw new Error('Session created but no ID returned')
        }
        
        setSessionId(session.id)
      } catch (parseError) {
        console.error('Error parsing session response:', parseError)
        throw new Error('Failed to parse session data')
      }
      
      // Initialize Vapi
      const initialized = await createVapiInstance(userProfile)
      if (!initialized) {
        throw new Error('Failed to initialize Vapi')
      }
      
      // Set up audio analyzer
      await setupAudioAnalyzer()
      
      // Get assistant ID - either from assistantConfig or from env vars
      let assistantId;
      
      if (assistantConfig && assistantConfig.id) {
        console.log(`Using assistant ID from config for ${therapyType} therapy: ${assistantConfig.id}`);
        assistantId = assistantConfig.id;
      } else {
        console.log('No assistant ID in config, falling back to environment variable');
        assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
      }
      
      if (!assistantId) {
        throw new Error('No assistant ID available')
      }
      
      console.log(`Starting ${therapyType} therapy session with assistant: ${assistantConfig?.name || 'Unknown'} (ID: ${assistantId})`);
      console.log(`Voice configuration: ${JSON.stringify(assistantConfig?.voice || 'default')}`);
      
      
      // Use a simpler approach similar to the one that worked previously
      try {
        console.log('Starting call with assistant ID:', assistantId);
        
        // Create a simpler configuration similar to what worked before
        const assistantConfig = {
          // Just include the essential parameters
          variableValues: userProfile ? {
            username: userProfile.name || 'user',
            partnername: userProfile.partnerName || 'partner'
          } : undefined,
          firstMessage: vapiInstanceRef.current?._customData?.firstMessage
        };
        
        console.log('Starting call with config:', JSON.stringify(assistantConfig, null, 2));
        
        // First attempt with the standard config
        try {
          await vapiInstanceRef.current?.start(assistantId, assistantConfig);
          console.log('Successfully started call with standard config');
        } catch (initialErr) {
          console.error('Error starting call with standard config:', initialErr);
          
          // Try with minimal config as a fallback (this worked in the previous version)
          console.log('Trying minimal config as fallback');
          const minimalConfig = {
            variableValues: assistantConfig.variableValues
          };
          
          await vapiInstanceRef.current?.start(assistantId, minimalConfig);
          console.log('Successfully started call with minimal config');
        }
      } catch (err) {
        console.error('Error starting call with all attempts:', err);
        throw err;
      }
      
      // Dim lights
      document.body.classList.add('session-active')
    } catch (error) {
      console.error('Failed to start therapy session:', error)
      setErrorMessage(`Start session error: ${error}`)
      
      document.body.classList.remove('session-active')
      
      // Clean up failed session
      if (sessionId) {
        try {
          await fetch(`/api/sessions/${sessionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'failed',
              endTime: new Date().toISOString(),
            }),
          })
        } catch (err) {
          console.error('Failed to cleanup session after error:', err)
        }
        setSessionId(null)
      }
    } finally {
      setIsLoading(false)
    }
  }, [userId, createVapiInstance, sessionId, therapyType, assistantConfig])
  
  // End therapy session
  const endTherapySession = useCallback(async () => {
    if (!sessionId) {
      return
    }
    
    try {
      setIsLoading(true)
      
      // Stop call
      if (vapiInstanceRef.current) {
        try {
          await vapiInstanceRef.current.stop()
        } catch (err) {
          console.warn('Error stopping Vapi call:', err)
        }
        vapiInstanceRef.current = null
      }
      
      // Update session in database
      const transcript = transcriptChunks.join('\n')
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endTime: new Date().toISOString(),
          status: 'completed',
          transcript,
          notes: `Therapy session ${new Date().toLocaleDateString()} - Duration: ${Math.round(transcriptChunks.length / 3)} minutes of conversation`,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to update session')
      }
      
      // Clean up
      cleanupResources()
    } catch (error) {
      console.error('Failed to end session:', error)
      setErrorMessage(`End session error: ${error}`)
    } finally {
      setSessionId(null)
      setIsCallActive(false)
      setTranscriptChunks([])
      setIsLoading(false)
    }
  }, [sessionId, transcriptChunks])
  
  // Use a ref to avoid circular dependencies with the callbacks
  const handleCallEndRef = useRef(endTherapySession);
  
  // Update the ref when endTherapySession changes
  useEffect(() => {
    handleCallEndRef.current = endTherapySession;
  }, [endTherapySession]);
  
  // Handle call end and errors
  useEffect(() => {
    // If call is no longer active but we still have a session ID, end the session
    if (sessionId && !isCallActive && document.body.classList.contains('session-active')) {
      // Call has ended, clean up the session
      handleCallEndRef.current();
    }
  }, [isCallActive, sessionId]);
  
  return (
    <div className="flex flex-col items-center w-full max-w-full sm:max-w-lg mx-auto">
      {/* Error messages */}
      {/* AnimatePresence removed temporarily */}
        {errorMessage && (
          <div 
            // initial={{ opacity: 0, y: -10 }}
            // animate={{ opacity: 1, y: 0 }}
            // exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm w-full opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards]"
          >
            {errorMessage}
          </div>
        )}
      
      
      {/* Voice waveform - only visible during active calls */}
      {/* AnimatePresence removed temporarily */}
        {isCallActive && (
          <div
            // initial={{ opacity: 0, height: 0 }}
            // animate={{ opacity: 1, height: 'auto' }}
            // exit={{ opacity: 0, height: 0 }}
            // transition={{ duration: 0.3 }}
            className="w-full mb-4 opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards]"
            style={{
              maxWidth: '100%',
              width: '100%',
              margin: '0 auto',
              padding: 0,
              overflowX: 'hidden',
              willChange: 'height, opacity'
            }}
          >
            <VoiceWaveform audioLevel={audioLevel} />
          </div>
        )}
      
      
      {/* Action buttons */}
      {!isCallActive ? (
        <button
          onClick={startTherapySession}
          disabled={isLoading}
          title={`Start a ${therapyType} therapy session with ${assistantConfig?.name}`}
          className="relative px-5 sm:px-6 py-3 w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-lg hover:shadow-indigo-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden hover:scale-105"
        >
          <div 
            className="absolute inset-0 opacity-30 bg-gradient-to-r from-indigo-500 to-purple-600"
            // animate={{
            //  background: ['linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)', 'linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%)']
            // }}
            // transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
          />
          
          <div className="flex items-center justify-center relative z-10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span className="whitespace-nowrap text-sm sm:text-base">
              {isLoading ? 'Connecting...' : `Start ${therapyType.charAt(0).toUpperCase() + therapyType.slice(1)} Therapy`}
            </span>
          </div>
        </button>
      ) : (
        <button
          onClick={endTherapySession}
          disabled={isLoading}
          className="relative px-5 sm:px-6 py-3 w-full sm:w-auto bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow-lg hover:shadow-red-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden hover:scale-105"
        >
          <div className="flex items-center justify-center relative z-10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="whitespace-nowrap text-sm sm:text-base">{isLoading ? 'Ending...' : 'End Therapy Session'}</span>
          </div>
        </button>
      )}
      
      {/* Session status message */}
      {isCallActive && (
        <p 
          // initial={{ opacity: 0, y: 10 }}
          // animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-green-600 font-medium opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards]"
        >
          Session active - speak with our AI therapist
        </p>
      )}
    </div>
  )
}

export default TherapyButton