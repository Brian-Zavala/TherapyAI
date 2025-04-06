'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Vapi from '@vapi-ai/web'
import { AssistantConfig } from '@/lib/vapi'

type TherapyButtonProps = {
  userId: string
}

function TherapyButton({ userId }: TherapyButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isCallActive, setIsCallActive] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [transcriptChunks, setTranscriptChunks] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState<number>(0)
  const vapiInstanceRef = useRef<any>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const analyser = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Check for existing session on component mount
  useEffect(() => {
    async function checkForActiveSession() {
      try {
        const response = await fetch(`/api/sessions/active?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          if (data && data.id) {
            setSessionId(data.id)
            setIsCallActive(true)
            
            // Set up audio visualization if session is active
            setupAudioAnalyzer()
            
            // Also apply the session-active class on initial load if session is active
            document.body.classList.add('session-active')
          }
        }
      } catch (error) {
        console.error('Error checking for active session:', error)
      }
    }

    checkForActiveSession()
    
    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContext.current) {
        audioContext.current.close()
      }
      document.body.classList.remove('session-active')
    }
  }, [userId])
  
  // Setup audio analyzer for voice visualization
  const setupAudioAnalyzer = async () => {
    try {
      if (!audioContext.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        analyser.current = audioContext.current.createAnalyser()
        const source = audioContext.current.createMediaStreamSource(stream)
        source.connect(analyser.current)
        analyser.current.fftSize = 256
        
        const updateAudioLevel = () => {
          if (!analyser.current) return
          
          const dataArray = new Uint8Array(analyser.current.frequencyBinCount)
          analyser.current.getByteFrequencyData(dataArray)
          
          // Calculate average level
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
          setAudioLevel(average)
          
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
        }
        
        updateAudioLevel()
      }
    } catch (err) {
      console.error('Error setting up audio analyzer:', err)
    }
  }

  async function createVapiInstance(userProfile?: any) {
    try {
      // Dispose of any existing instance first
      if (vapiInstanceRef.current) {
        try {
          await vapiInstanceRef.current.stop()
        } catch (e) {
          console.warn('Error stopping existing Vapi instance:', e)
        }
        vapiInstanceRef.current = null
      }

      // Get a secure client token from our backend
      let token;
      try {
        // First try to get a secure token from our backend
        const tokenResponse = await fetch('/api/vapi/token');
        if (tokenResponse.ok) {
          const data = await tokenResponse.json();
          token = data.token;
          console.log('Using secure client token from backend');
        }
      } catch (tokenError) {
        console.warn('Could not get secure token from backend, falling back to public key:', tokenError);
      }

      // Fall back to public key if token fetch fails
      if (!token) {
        token = process.env.NEXT_PUBLIC_VAPI_API_KEY;
        if (!token) {
          throw new Error('Vapi API key is missing');
        }
        console.log('Using public API key as fallback');
      }

      console.log('Creating new Vapi instance');
      vapiInstanceRef.current = new Vapi(token);
      
      // Debug: Check if the instance was created
      console.log('Vapi instance created:', !!vapiInstanceRef.current);
      
      // Immediately customize the assistant with user profile if available
      if (userProfile && vapiInstanceRef.current) {
        try {
          // Import helper functions from vapi.ts
          const { getPersonalizedSystemPrompt, getPersonalizedFirstMessage } = await import('@/lib/vapi');
          
          // Create personalized content
          const systemPrompt = getPersonalizedSystemPrompt({
            userName: userProfile.name,
            partnerName: userProfile.partnerName,
            relationshipStatus: userProfile.relationshipStatus
          });
          
          const firstMessage = getPersonalizedFirstMessage({
            userName: userProfile.name,
            partnerName: userProfile.partnerName
          });
          
          // Store personalization data to use when starting the assistant
          console.log('Prepared personalized content for assistant');
          
          // Store these values in a safer way - using a dedicated property object
          // These will be used during the start call
          vapiInstanceRef.current._customData = {
            systemPrompt,
            firstMessage
          };
        } catch (personalizationError) {
          console.error('Error applying personalizations:', personalizationError);
        }
      }
      
      // Set up event handlers
      vapiInstanceRef.current.on('call-start', () => {
        console.log('Call started successfully');
        setIsCallActive(true);
        setErrorMessage(null);
      });
      
      vapiInstanceRef.current.on('call-end', () => {
        console.log('Call ended');
        if (sessionId) {
          endTherapySession();
        }
      });
      
      vapiInstanceRef.current.on('error', (error: any) => {
        // Stringify error to see more details
        const errorString = JSON.stringify(error) || 'Empty error object';
        console.error('Vapi error:', errorString);
        setErrorMessage(`Vapi error: ${errorString}`);
        
        if (sessionId) {
          endTherapySession();
        }
      });
      
      vapiInstanceRef.current.on('message', (message: any) => {
        console.log('Message received:', message);
        // Handle different message types
        if (message.type === 'transcript') {
          setTranscriptChunks(prev => [...prev, `USER: ${message.transcript}`]);
        } else if (message.type === 'model-output' && message.content) {
          setTranscriptChunks(prev => [...prev, `THERAPIST: ${message.content}`]);
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to create Vapi instance:', error);
      setErrorMessage(`Failed to create Vapi instance: ${error}`);
      return false;
    }
  }

  async function startTherapySession() {
    setErrorMessage(null);
    try {
      setIsLoading(true);
      
      // Fetch user profile information to personalize the therapy session
      let userProfile = null;
      try {
        const profileResponse = await fetch('/api/user/profile');
        if (profileResponse.ok) {
          userProfile = await profileResponse.json();
          console.log('User profile loaded for therapy session:', userProfile);
        }
      } catch (profileError) {
        console.warn('Could not load user profile, using default experience:', profileError);
      }
  
      // 1. Create session in database with user profile context
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          startTime: new Date().toISOString(),
          status: 'active',
          theme: 'general relationship',
          // Add user profile context to personalize the session
          context: userProfile ? {
            userName: userProfile.name,
            partnerName: userProfile.partnerName,
            relationshipStatus: userProfile.relationshipStatus
          } : undefined,
        }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to create session');
      }
  
      const session = await response.json();
      setSessionId(session.id);
  
      // 2. Initialize Vapi instance fresh each time with user profile
      const initialized = await createVapiInstance(userProfile);
      if (!initialized) {
        throw new Error('Failed to initialize Vapi');
      }
  
      // 3. Check browser compatibility for advanced audio features
      const AudioContextClass = window.AudioContext || 
        (window as any).webkitAudioContext;
  
      if (!AudioContextClass) {
        console.warn('AudioContext not supported in this browser. Some features may be limited.');
      }
  
      // 4. Check browser permissions & setup audio analyzer
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone permission granted');
        
        // Only set up audio analyzer if AudioContext is supported
        if (AudioContextClass) {
          setupAudioAnalyzer();
        }
      } catch (mediaError) {
        console.error('Microphone permission denied:', mediaError);
        setErrorMessage('Microphone access denied. Please allow microphone access and try again.');
        throw new Error('Microphone permission denied');
      }
  
      // 5. Get the assistant ID to use and prepare configuration
      let assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
      
      // Log which assistant we're using
      console.log('Using assistant ID:', assistantId);
      
      if (!assistantId) {
        throw new Error('No assistant ID available. Please configure an assistant.');
      }
      
      // Prepare assistant overrides with personalized data
      // For overriding an existing assistant, use assistantOverrides format
      const assistantOverrides = {
        variableValues: userProfile ? {
          username: userProfile.name || 'user',
          partnername: userProfile.partnerName || 'partner'
        } : undefined,
        // Only override the first message if we have a custom one
        firstMessage: vapiInstanceRef.current._customData?.firstMessage || undefined
      };
      
      console.log('Starting call with assistant overrides:', JSON.stringify(assistantOverrides));
      
      // Add timeout for debugging and handle errors more specifically
      try {
        // When using an assistantId, we should use assistantOverrides format
        // not the full assistantConfig format
        const startPromise = vapiInstanceRef.current.start(assistantId, assistantOverrides);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Start call timeout')), 15000)
        );
        
        await Promise.race([startPromise, timeoutPromise]);
      } catch (callError: unknown) {
        // Type narrowing to safely handle the unknown type
        const errorMessage = callError instanceof Error 
          ? callError.message 
          : String(callError);
          
        if (errorMessage.includes('audio')) {
          console.warn('Audio processing issue detected:', errorMessage);
          // You could set a flag to use limited audio functionality
          // setUsingLimitedAudio(true);
        } else {
          // Re-throw non-audio related errors
          throw callError;
        }
      }
      
      // Apply "dim the lights" effect by adding a class to the body
      document.body.classList.add('session-active');
      
    } catch (error: unknown) {
      console.error('Failed to start therapy session:', error);
      setErrorMessage(`Start session error: ${error instanceof Error ? error.message : String(error)}`);
      
      // Clean up if needed
      document.body.classList.remove('session-active');
    } finally {
      setIsLoading(false);
    }
  }
  

  async function endTherapySession() {
    if (!sessionId) {
      console.log('No active session to end')
      return
    }

    try {
      setIsLoading(true)
      
      // 1. Stop the call if it's active
      if (vapiInstanceRef.current) {
        try {
          await vapiInstanceRef.current.stop()
        } catch (stopError) {
          console.warn('Error stopping Vapi call:', stopError)
        }
        vapiInstanceRef.current = null
      }
      
      // 2. Update session in database with end time and transcript
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
        try {
          const errorData = await response.json()
          console.error('Error updating session:', errorData)
          throw new Error(errorData.error || 'Failed to update session')
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
          throw new Error('Failed to update session: Invalid server response')
        }
      }
      
      const updatedSession = await response.json()
      console.log('Session updated successfully:', updatedSession)

      // Clean up audio context
      if (audioContext.current) {
        audioContext.current.close()
        audioContext.current = null
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      // Remove session-active class
      document.body.classList.remove('session-active')

    } catch (error) {
      console.error('Failed to end session:', error)
      setErrorMessage(`End session error: ${error}`)
    } finally {
      // Reset state
      setSessionId(null)
      setIsCallActive(false)
      setTranscriptChunks([])
      setIsLoading(false)
    }
  }

  // Generate bars for visualization
  const generateBars = () => {
    const bars = [];
    const barCount = 30;
    
    for (let i = 0; i < barCount; i++) {
      // Calculate height based on position and audio level
      const position = i / barCount;
      const amplitude = Math.sin(position * Math.PI);
      const height = amplitude * (audioLevel / 2);
      
      bars.push(
        <motion.div
          key={i}
          initial={{ height: '5%' }}
          animate={{ 
            height: `${5 + Math.abs(height)}%`,
            backgroundColor: audioLevel > 30 
              ? `rgba(129, 140, 248, ${0.3 + amplitude * 0.7})` 
              : `rgba(129, 140, 248, ${0.3 + amplitude * 0.3})`
          }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 10,
            mass: 0.5 + Math.random() * 0.5
          }}
          className="w-1 rounded-full mx-px transform transition-all duration-75"
          style={{ 
            transformOrigin: 'bottom',
          }}
        />
      );
    }
    
    return bars;
  };

  return (
    <div className="flex flex-col items-center">
      {errorMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm"
        >
          {errorMessage}
        </motion.div>
      )}
      
      {/* Voice waveform visualization */}
      <AnimatePresence>
        {isCallActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full py-4 px-4 mb-6"
          >
            <div className="relative h-24 w-full overflow-hidden rounded-lg bg-indigo-900/30 backdrop-blur-sm flex items-center justify-center">
              <motion.div 
                className="absolute bottom-0 left-0 right-0 flex justify-center items-end h-full px-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {generateBars()}
              </motion.div>
              
              {/* Glowing effect that responds to audio level */}
              <motion.div 
                className="absolute inset-0 rounded-lg pointer-events-none"
                animate={{ 
                  boxShadow: `inset 0 0 ${10 + audioLevel / 4}px rgba(99, 102, 241, ${0.2 + audioLevel / 300})` 
                }}
                transition={{ duration: 0.1 }}
              />
              
              {/* Subtle instruction/status when idle */}
              {audioLevel < 5 && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  transition={{ delay: 1 }}
                  className="text-indigo-200 text-opacity-70 text-sm"
                >
                  Speak to see your voice visualization...
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!isCallActive ? (
        <motion.button
          onClick={startTherapySession}
          disabled={isLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-lg hover:shadow-indigo-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        >
          {/* Pulsing background effect */}
          <motion.div
            className="absolute inset-0 opacity-30"
            animate={{
              background: ['linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)', 'linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%)']
            }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
          />
          
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 rounded-lg"
            animate={{ 
              boxShadow: ['0 0 10px rgba(99, 102, 241, 0.5)', '0 0 20px rgba(99, 102, 241, 0.3)']
            }}
            transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
          />
          
          {/* Button content */}
          <motion.div
            className="flex items-center relative z-10"
            initial={false}
            animate={{ opacity: [0.9, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
          >
            {/* Icon */}
            <motion.span
              className="mr-2"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatType: "loop" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </motion.span>
            
            {/* Text */}
            {isLoading ? 'Connecting...' : 'Start Therapy Session'}
          </motion.div>
        </motion.button>
      ) : (
        <motion.button
          onClick={endTherapySession}
          disabled={isLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow-lg hover:shadow-red-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        >
          {/* Pulsing background effect */}
          <motion.div
            className="absolute inset-0 opacity-30"
            animate={{
              background: ['linear-gradient(90deg, #ef4444 0%, #dc2626 100%)', 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)']
            }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
          />
          
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 rounded-lg"
            animate={{ 
              boxShadow: ['0 0 10px rgba(239, 68, 68, 0.5)', '0 0 20px rgba(239, 68, 68, 0.3)']
            }}
            transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
          />
          
          {/* Button content */}
          <motion.div
            className="flex items-center relative z-10"
            initial={false}
            animate={{ opacity: [0.9, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
          >
            {/* Icon */}
            <motion.span
              className="mr-2"
              animate={{ 
                rotate: [0, 5, 0, -5, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                repeatType: "loop"
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.span>
            
            {/* Text */}
            {isLoading ? 'Ending...' : 'End Therapy Session'}
          </motion.div>
        </motion.button>
      )}
      
      {isCallActive && (
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-green-600 font-medium"
        >
          Session active - speak with our AI therapist
        </motion.p>
      )}
          </div>
  )
}

export default TherapyButton;