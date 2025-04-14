'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Vapi from '@vapi-ai/web'
import dynamic from 'next/dynamic'
import { COUPLE_THERAPY_ASSISTANT_CONFIG } from '@/lib/vapi'

// Dynamically import VoiceWaveform with no SSR to avoid hydration issues
const VoiceWaveform = dynamic(() => import('./VoiceWaveform'), { 
  ssr: false
})

interface AssistantConfigType {
  id: string | undefined;
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
    voiceId: string | undefined;
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
  assistantConfig = COUPLE_THERAPY_ASSISTANT_CONFIG as AssistantConfigType, 
  therapyType = 'couple' 
}: TherapyButtonProps) {
  // State management
  const [isLoading, setIsLoading] = useState(false)
  const [isCallActive, setIsCallActive] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [transcriptChunks, setTranscriptChunks] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState<number>(0)
  const [isMuted, setIsMuted] = useState(false)
  
  // Refs for performance optimization
  // Using ExtendedVapi type to handle custom properties
  const vapiInstanceRef = useRef<ExtendedVapi | null>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const analyser = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const audioTrackRef = useRef<MediaStreamTrack | null>(null) // Reference to audio track for muting
  
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
    
    // Debug function to check transcriber configuration
    const debugTranscriberConfig = async () => {
      try {
        console.log('🔍 DEBUG: Checking transcriber configuration...');
        const response = await fetch('/api/vapi/transcriber');
        if (response.ok) {
          const config = await response.json();
          console.log('🔍 DEBUG: Transcriber config available:', config);
        } else {
          console.log('🔍 DEBUG: Transcriber config not available:', response.status);
        }
      } catch (error) {
        console.error('🔍 DEBUG: Error checking transcriber config:', error);
      }
    };
    
    // Only run in development mode
    if (process.env.NODE_ENV === 'development') {
      debugTranscriberConfig();
    }
    
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
    
    // Remove session styling immediately
    document.body.classList.remove('session-active')
    
    // Restore opacity of main content with faster transition
    const main = document.querySelector('main')
    if (main) {
      main.style.transition = 'opacity 0.15s ease-in-out'
      main.style.opacity = '1'
    }
    
    // Remove blur effect from background
    document.body.style.backdropFilter = 'none'
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
      
      // Store the audio track for muting functionality
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length > 0) {
        audioTrackRef.current = audioTracks[0]
        console.log('Audio track stored for mute functionality')
      }
      
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
    setMuted?: (muted: boolean) => void
    isMuted?: () => boolean
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
      
      // SIMPLIFIED APPROACH: Use public API key directly
      // This avoids any token-related issues while we debug
      const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY;
      
      if (!apiKey) {
        console.error('NEXT_PUBLIC_VAPI_API_KEY is not set in environment variables');
        throw new Error('Vapi API key not configured');
      }
      
      console.log('Using direct API key for Vapi authentication');
      
      // Import and use initVapi which has debugging built in
      const { initVapi } = await import('@/lib/vapi');
      
      // Create instance directly with API key (no custom transcriber)
      console.log('🎙️ Initializing Vapi with default transcriber');
      vapiInstanceRef.current = await initVapi(apiKey, { useCustomTranscriber: false });
      console.log('✅ Vapi initialized successfully with default transcriber');
      
      // Store session ID in the Vapi instance for message handling
      if (vapiInstanceRef.current && sessionId) {
        (vapiInstanceRef.current as any)._sessionId = sessionId;
        console.log(`#### SETTING SESSION ID ${sessionId} FOR TRANSCRIPT RECORDING ####`);
        
        // Also store in sessionStorage for backup
        try {
          sessionStorage.setItem('current-session-id', sessionId);
          console.log(`Saved session ID to sessionStorage: ${sessionId}`);
        } catch (storageError) {
          console.warn('Could not save session ID to sessionStorage:', storageError);
        }
      }
      
      // Customize assistant if profile available
      if (userProfile && vapiInstanceRef.current) {
        try {
          const { getPersonalizedAssistantConfig, getPersonalizedSystemPromptForType, getPersonalizedFirstMessageForType } = await import('@/lib/vapi')
          
          // Create profile data object with appropriate fields based on therapy type
          const userProfileData = {
            userName: userProfile.name,
            partnerName: userProfile.partnerName,
            relationshipStatus: userProfile.relationshipStatus,
            // Include family members for family therapy
            familyMember1: userProfile.familyMember1,
            familyMember2: userProfile.familyMember2,
            familyMember3: userProfile.familyMember3,
            familyMember4: userProfile.familyMember4
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
        
        // Add initial transcript entry to mark start of session
        if (sessionId) {
          try {
            setTimeout(async () => {
              // Import transcript service
              const { addTranscriptEntry } = await import('@/lib/transcript-service');
              
              try {
                const result = await addTranscriptEntry({
                  sessionId,
                  speaker: 'assistant',
                  text: 'Therapy session started. The AI therapist is connecting...',
                  timestamp: new Date().toISOString(),
                  isFinal: true
                });
                console.log('Successfully added session start entry with ID:', result?.id);
                
                // Force UI update
                setTranscriptChunks(prev => [...prev, 'SYSTEM: Session started']);
              } catch (err) {
                console.error('Failed to add session start entry:', err);
              }
            }, 1000); // Small delay to ensure session is fully initialized
          } catch (error) {
            console.error('Error adding initial transcript entry:', error);
          }
        }
        
        // Force audio setup on call start
        setupAudioAnalyzer()
      })
      
      // Using proper type annotation for the event handler
      vapiInstanceRef.current.on('call-end', function(event?: any) {
        // Log the complete event for debugging
        console.log('Vapi call ended, complete event:', event || {});
        
        // Extract reason if available
        let reason = 'No reason provided';
        if (typeof event === 'string') {
          reason = event;
        } else if (event && typeof event === 'object' && 'reason' in event) {
          reason = String(event.reason);
        }
        
        console.log('Call end reason:', reason);
        setIsCallActive(false);
        
        // Show a user-friendly message about the call ending
        if (reason && reason !== "NORMAL" && reason !== "No reason provided") {
          setErrorMessage(`Session ended: ${reason}. This may be a temporary issue with the voice service.`);
        } else {
          // Clear error messages for normal endings
          setErrorMessage(null);
        }
        
        if (sessionId) {
          // Directly use the current ref value to avoid circular dependencies
          handleCallEndRef.current();
        }
      })
      
      vapiInstanceRef.current.on('error', (error: unknown) => {
        // Log the complete error for debugging
        console.error('Vapi error (complete):', error || {})
        
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
      
      // Enhanced transcript handling with structured entries
      vapiInstanceRef.current.on('message', async (message: any) => {
        try {
          // Enhanced logging for debugging transcript issues
          console.log('VAPI MESSAGE EVENT:', JSON.stringify(message, null, 2));
          
          // Try to get session ID from multiple sources with better fallbacks
          let currentSessionId = null;
          
          // 1. Try from component state first
          if (sessionId) {
            currentSessionId = sessionId;
            console.log(`Using session ID from component state: ${sessionId}`);
          } 
          // 2. Try from Vapi instance reference
          else if ((vapiInstanceRef.current as any)?._sessionId) {
            currentSessionId = (vapiInstanceRef.current as any)?._sessionId;
            console.log(`Using session ID from Vapi instance: ${currentSessionId}`);
          }
          // 3. Try from sessionStorage as last resort
          else {
            try {
              const storedSessionId = sessionStorage.getItem('current-session-id');
              if (storedSessionId) {
                currentSessionId = storedSessionId;
                console.log(`Using session ID from sessionStorage: ${storedSessionId}`);
                
                // Also update our state and Vapi instance for future use
                setSessionId(storedSessionId);
                if (vapiInstanceRef.current) {
                  (vapiInstanceRef.current as any)._sessionId = storedSessionId;
                }
              }
            } catch (storageError) {
              console.warn('Error accessing sessionStorage:', storageError);
            }
          }
          
          if (!currentSessionId) {
            console.log('Processing transcript without session ID (test mode)');
            
            // Add this transcript to UI state at minimum
            const text = message.transcript || message.content || message.text || '';
            const speaker = message.role || 'user';
            
            if (text && text.trim() !== '') {
              const displaySpeaker = speaker === 'assistant' ? 'THERAPIST' : 'USER';
              setTranscriptChunks(prev => [...prev, `${displaySpeaker}: ${text}`]);
              console.log(`Added to transcript chunks: ${displaySpeaker}: ${text.substring(0, 50)}...`);
            }
            return;
          }
          
          // IMPROVED TRANSCRIPT HANDLING
          // Now handling both transcript types the same way regardless of partial or final
          if (message.type === 'transcript') {
            const text = message.transcript;
            const speaker = message.role || 'user'; // Default to user if no role
            
            if (!text || text.trim() === '') {
              console.log('Skipping empty transcript message');
              return;
            }
            
            console.log(`✨ TRANSCRIPT: [${speaker}] ${text.substring(0, 100)}...`);
            
            // Simple direct storage to sessionStorage for reliability
            try {
              // 1. Store in main transcript array
              const storageKey = `transcript-${currentSessionId}`;
              let existingTranscripts = [];
              
              try {
                const stored = sessionStorage.getItem(storageKey);
                existingTranscripts = stored ? JSON.parse(stored) : [];
              } catch (parseError: unknown) {
                console.warn('Error parsing existing transcripts, starting fresh:', (parseError instanceof Error) ? parseError.message : String(parseError));
                existingTranscripts = [];
              }
              
              // Add new entry
              existingTranscripts.push({
                speaker: speaker === 'assistant' ? 'assistant' : 'user',
                text: text,
                timestamp: new Date().toISOString()
              });
              
              // Save back to storage
              sessionStorage.setItem(storageKey, JSON.stringify(existingTranscripts));
              console.log(`✓ Saved to main transcript storage (${existingTranscripts.length} total entries)`);
              
              // 2. Also save as individual backup with unique timestamp
              const backupKey = `backup-${speaker}-${currentSessionId}-${Date.now()}`;
              sessionStorage.setItem(backupKey, text);
              console.log(`✓ Saved backup with key: ${backupKey}`);
              
              // 3. Update UI state
              const displaySpeaker = speaker === 'assistant' ? 'THERAPIST' : 'USER';
              setTranscriptChunks(prev => {
                const newChunks = [...prev, `${displaySpeaker}: ${text}`];
                console.log(`Updated UI with transcript chunks (${newChunks.length} total)`);
                return newChunks;
              });
              
              // 4. Also try to save to database via transcript service
              // Import inside try/catch to avoid blocking main functionality
              try {
                const { addTranscriptEntry } = await import('@/lib/transcript-service');
                const normalizedSpeaker = speaker === 'assistant' ? 'assistant' : 'user';
                
                const result = await addTranscriptEntry({
                  sessionId: currentSessionId,
                  speaker: normalizedSpeaker,
                  text,
                  timestamp: new Date().toISOString(),
                  isFinal: message.transcriptType !== 'partial'
                });
                
                console.log(`✓ DB SAVE: Successfully saved to database with ID: ${result?.id || 'unknown'}`);
              } catch (dbError) {
                console.warn('Failed to save to database, but transcript is in sessionStorage:', dbError);
                // We still have the transcript in sessionStorage, so we're good
              }
            } catch (storageError: unknown) {
              console.error('💥 ERROR STORING TRANSCRIPT:', (storageError instanceof Error) ? storageError.message : String(storageError));
            }
          }
          // Also handle assistant messages (usually contain assistant responses)
          else if (
            (message.type === 'transcript-response') || 
            (message.type === 'assistant-response') ||
            (message.type === 'model-output' && message.content) ||
            (message.role === 'assistant' && message.content)
          ) {
            const text = message.transcript || message.content || message.text || '';
            
            if (!text || text.trim() === '') {
              return;
            }
            
            console.log(`✨ ASSISTANT MESSAGE: ${text.substring(0, 100)}...`);
            
            // Store in the same way as regular transcripts
            try {
              // 1. Store in main transcript array
              const storageKey = `transcript-${currentSessionId}`;
              let existingTranscripts = [];
              
              try {
                const stored = sessionStorage.getItem(storageKey);
                existingTranscripts = stored ? JSON.parse(stored) : [];
              } catch (parseError: unknown) {
                console.warn('Error parsing existing transcripts, starting fresh:', (parseError instanceof Error) ? parseError.message : String(parseError));
                existingTranscripts = [];
              }
              
              // Add new entry
              existingTranscripts.push({
                speaker: 'assistant',
                text: text,
                timestamp: new Date().toISOString()
              });
              
              // Save back to storage
              sessionStorage.setItem(storageKey, JSON.stringify(existingTranscripts));
              console.log(`✓ Saved assistant message to storage (${existingTranscripts.length} total entries)`);
              
              // 2. Also save as individual backup with unique timestamp
              const backupKey = `backup-assistant-${currentSessionId}-${Date.now()}`;
              sessionStorage.setItem(backupKey, text);
              
              // 3. Update UI state
              setTranscriptChunks(prev => {
                const newChunks = [...prev, `THERAPIST: ${text}`];
                return newChunks;
              });
              
              // 4. Try to save to database
              try {
                const { addTranscriptEntry } = await import('@/lib/transcript-service');
                
                const result = await addTranscriptEntry({
                  sessionId: currentSessionId,
                  speaker: 'assistant',
                  text,
                  timestamp: new Date().toISOString(),
                  isFinal: true
                });
                
                console.log(`✓ DB SAVE: Successfully saved assistant message to database`);
              } catch (dbError) {
                console.warn('Failed to save assistant message to database:', dbError);
              }
            } catch (storageError: unknown) {
              console.error('💥 ERROR STORING ASSISTANT MESSAGE:', (storageError instanceof Error) ? storageError.message : String(storageError));
            }
          }
        } catch (error) {
          console.error('Error handling transcript message:', error);
          // Continue with the session despite transcript storage errors
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
      // Note: UI changes are now handled in the button click handler for immediate feedback
      // So we don't need to duplicate them here, but we'll ensure they're applied
      if (!document.body.classList.contains('session-active')) {
        document.body.classList.add('session-active')
      }
      
      // Ensure call is marked as active
      if (!isCallActive) {
        setIsCallActive(true)
      }
      
      // Store session start time for duration calculation
      const sessionStartTime = new Date();
      // Store in sessionStorage for recovery on browser refresh
      try {
        sessionStorage.setItem('session-start-time', sessionStartTime.toISOString());
        console.log('Saved session start time:', sessionStartTime.toISOString());
      } catch (err) {
        console.warn('Could not save session start time to sessionStorage', err);
      }
      
      // Start loading the setup in parallel
      // User profile and session creation can happen in parallel
      const [userProfilePromise, audioPromise] = [
        // Get user profile
        (async () => {
          try {
            const profileResponse = await fetch('/api/user/profile')
            if (profileResponse.ok) {
              return await profileResponse.json()
            }
          } catch (err) {
            console.warn('Could not load user profile, using default experience')
          }
          return null
        })(),
        
        // Start setting up audio in parallel - this can happen independently
        setupAudioAnalyzer()
      ]
      
      // Wait for user profile to complete
      const userProfile = await userProfilePromise
      
      // Create session in database
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime: sessionStartTime.toISOString(),
          date: sessionStartTime.toISOString(), // This is required by the schema
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
            // Include family members for family therapy
            familyMember1: userProfile.familyMember1,
            familyMember2: userProfile.familyMember2,
            familyMember3: userProfile.familyMember3,
            familyMember4: userProfile.familyMember4,
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
      
      let session;
      try {
        session = await response.json()
        console.log('Session created successfully:', session)
        
        if (!session.id) {
          throw new Error('Session created but no ID returned')
        }
        
        setSessionId(session.id)
      } catch (parseError) {
        console.error('Error parsing session response:', parseError)
        throw new Error('Failed to parse session data')
      }
      
      // Initialize Vapi with custom transcriber - this can now happen in parallel with audio setup
      const initialized = await createVapiInstance(userProfile)
      if (!initialized) {
        throw new Error('Failed to initialize Vapi')
      }
      
      // Explicitly set the session ID on the Vapi instance for transcript recording
      if (vapiInstanceRef.current && session.id) {
        (vapiInstanceRef.current as any)._sessionId = session.id;
        console.log(`#### SETTING SESSION ID ${session.id} FOR TRANSCRIPT RECORDING ####`);
        
        // Also store in sessionStorage for backup
        try {
          sessionStorage.setItem('current-session-id', session.id);
          console.log(`Saved session ID to sessionStorage: ${session.id}`);
        } catch (storageError) {
          console.warn('Could not save session ID to sessionStorage:', storageError);
        }
      }
      
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
            partnername: userProfile.partnerName || 'partner',
            // Include family members if this is family therapy
            ...(therapyType === 'family' ? {
              familymember1: userProfile.familyMember1 || '',
              familymember2: userProfile.familyMember2 || '',
              familymember3: userProfile.familyMember3 || '',
              familymember4: userProfile.familyMember4 || ''
            } : {})
          } : undefined,
          firstMessage: vapiInstanceRef.current?._customData?.firstMessage
        };
        
        // Start the call with the standard config
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
    } catch (error) {
      console.error('Failed to start therapy session:', error)
      setErrorMessage(`Start session error: ${error}`)
      
      // Clean up all resources and styling
      cleanupResources()
      
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
    console.log('End therapy session called')
    
    // Immediately reset UI state to improve user experience and ensure UI updates
    setIsCallActive(false);
    setIsLoading(false);
    setIsMuted(false); // Reset mute state when call ends
    
    // Explicitly clean up resources right away for immediate visual feedback
    cleanupResources();
    
    // Try to get session ID from multiple sources
    let currentSessionId = null;
    
    // 1. Try from component state first
    if (sessionId) {
      currentSessionId = sessionId;
      console.log(`Using session ID from component state: ${sessionId}`);
    } 
    // 2. Try from Vapi instance reference
    else if ((vapiInstanceRef.current as any)?._sessionId) {
      currentSessionId = (vapiInstanceRef.current as any)?._sessionId;
      console.log(`Using session ID from Vapi instance: ${currentSessionId}`);
    }
    // 3. Try from sessionStorage as last resort
    else {
      try {
        const storedSessionId = sessionStorage.getItem('current-session-id');
        if (storedSessionId) {
          currentSessionId = storedSessionId;
          console.log(`Using session ID from sessionStorage: ${storedSessionId}`);
          
          // Also update our state for future use
          setSessionId(storedSessionId);
        }
      } catch (storageError: unknown) {
        console.warn('Error accessing sessionStorage:', (storageError instanceof Error) ? storageError.message : String(storageError));
      }
    }
    
    if (!currentSessionId) {
      console.warn('No session ID available for ending therapy session');
      // Reset all UI states even if we have no session ID
      setSessionId(null);
      setTranscriptChunks([]);
      return
    }
    
    // Stop call and clean up audio resources immediately for better UX
    if (vapiInstanceRef.current) {
      try {
        await vapiInstanceRef.current.stop()
      } catch (err) {
        console.warn('Error stopping Vapi call:', err)
      }
      vapiInstanceRef.current = null
    }
    
    // Explicitly clean up resources
    cleanupResources()
    
    try {
      // Process transcript in background
      console.log('🔍 BEGINNING COMPREHENSIVE TRANSCRIPT RECOVERY');
      console.log(`Session ${sessionId} ending - recovering all transcripts from all sources`);
      
      // Create master list of all recovered transcript entries
      const allRecoveredEntries: Array<{speaker: string, text: string, timestamp: string}> = [];
      const allTranscriptErrors: Array<string> = [];
      
      // 1. First, collect all transcript entries from component state
      console.log('STEP 1: Collecting transcripts from component state');
      const currentTranscriptChunks = [...transcriptChunks];
      
      if (currentTranscriptChunks.length > 0) {
        console.log(`Found ${currentTranscriptChunks.length} transcript chunks in component state`);
        
        for (const chunk of currentTranscriptChunks) {
          // Parse the chunk format "SPEAKER: Text content"
          const match = chunk.match(/^([A-Z]+):\s*(.*)/);
          if (match) {
            const rawSpeaker = match[1].toLowerCase();
            const text = match[2];
            
            // Normalize speaker names
            const normalizedSpeaker = 
              rawSpeaker === 'user' || 
              rawSpeaker === 'you' || 
              rawSpeaker === 'client' || 
              rawSpeaker === 'human' ? 'user' : 'assistant';
            
            // Add to recovered entries
            allRecoveredEntries.push({
              speaker: normalizedSpeaker,
              text: text,
              timestamp: new Date().toISOString()
            });
          }
        }
      } else {
        console.log('No transcript chunks found in component state');
      }
      
      // 2. Check the main transcript storage in sessionStorage
      console.log('STEP 2: Checking main transcript storage in sessionStorage');
      try {
        const storageKey = `transcript-${sessionId}`;
        const storedTranscripts = sessionStorage.getItem(storageKey);
        
        if (storedTranscripts) {
          try {
            const parsedTranscripts = JSON.parse(storedTranscripts);
            console.log(`Found ${parsedTranscripts.length} stored transcripts in session storage`);
            
            // Add all entries to our master list
            if (Array.isArray(parsedTranscripts) && parsedTranscripts.length > 0) {
              parsedTranscripts.forEach(entry => {
                if (entry && entry.speaker && entry.text) {
                  allRecoveredEntries.push({
                    speaker: entry.speaker === 'user' ? 'user' : 'assistant',
                    text: entry.text,
                    timestamp: entry.timestamp || new Date().toISOString()
                  });
                }
              });
            }
          } catch (parseError: unknown) {
            console.error('Error parsing stored transcripts:', (parseError instanceof Error) ? parseError.message : String(parseError));
            allTranscriptErrors.push(`Parse storage error: ${(parseError instanceof Error) ? parseError.message : String(parseError)}`);
          }
        } else {
          console.log('No transcripts found in main session storage');
        }
      } catch (storageError: unknown) {
        console.error('Error accessing session storage:', (storageError instanceof Error) ? storageError.message : String(storageError));
        allTranscriptErrors.push(`Storage access error: ${(storageError instanceof Error) ? storageError.message : String(storageError)}`);
      }
      
      // 3. Check for individual backup entries in sessionStorage
      console.log('STEP 3: Checking for individual backup entries in sessionStorage');
      try {
        const backupPrefix = `backup-`;
        const speakerPrefixes = ['user', 'assistant', 'therapist'];
        
        // Search all sessionStorage for matching backup entries
        let backupCount = 0;
        
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          
          if (key && key.startsWith(backupPrefix) && key.includes(currentSessionId)) {
            try {
              const text = sessionStorage.getItem(key);
              if (text) {
                // Determine speaker from key
                let speaker = 'assistant'; // Default
                
                // Check which speaker prefix is in the key
                for (const prefix of speakerPrefixes) {
                  if (key.includes(prefix)) {
                    speaker = prefix === 'therapist' ? 'assistant' : prefix;
                    break;
                  }
                }
                
                // Add to recovered entries
                allRecoveredEntries.push({
                  speaker,
                  text,
                  timestamp: new Date().toISOString()
                });
                
                backupCount++;
              }
            } catch (entryError) {
              console.warn(`Could not process backup entry ${key}:`, entryError);
            }
          }
        }
        
        console.log(`Found ${backupCount} individual backup entries in session storage`);
      } catch (backupError: unknown) {
        console.error('Error processing backup entries:', (backupError instanceof Error) ? backupError.message : String(backupError));
        allTranscriptErrors.push(`Backup recovery error: ${(backupError instanceof Error) ? backupError.message : String(backupError)}`);
      }
      
      // 4. Check for msg-prefixed entries (additional backups) in sessionStorage
      console.log('STEP 4: Checking for msg-prefixed entries in sessionStorage');
      try {
        const msgPrefix = `msg-${currentSessionId}`;
        let msgCount = 0;
        
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          
          if (key && key.startsWith(msgPrefix)) {
            try {
              const rawEntry = sessionStorage.getItem(key);
              if (rawEntry) {
                const entry = JSON.parse(rawEntry);
                
                if (entry && entry.speaker && entry.text) {
                  // Add to recovered entries
                  allRecoveredEntries.push({
                    speaker: entry.speaker === 'user' ? 'user' : 'assistant',
                    text: entry.text,
                    timestamp: entry.timestamp || new Date().toISOString()
                  });
                  
                  msgCount++;
                }
              }
            } catch (msgError: unknown) {
              console.warn(`Could not process msg entry ${key}:`, (msgError instanceof Error) ? msgError.message : String(msgError));
            }
          }
        }
        
        console.log(`Found ${msgCount} msg-prefixed entries in session storage`);
      } catch (msgError: unknown) {
        console.error('Error processing msg entries:', (msgError instanceof Error) ? msgError.message : String(msgError));
        allTranscriptErrors.push(`Msg recovery error: ${(msgError instanceof Error) ? msgError.message : String(msgError)}`);
      }
      
      // 5. Try to get entries from database
      console.log('STEP 5: Retrieving entries from database');
      try {
        const entriesResponse = await fetch(`/api/sessions/${sessionId}/transcript`);
        
        if (entriesResponse.ok) {
          const entries = await entriesResponse.json();
          
          if (entries && Array.isArray(entries) && entries.length > 0) {
            console.log(`Retrieved ${entries.length} entries from database API`);
            
            // Filter for only user and assistant entries (not system)
            const validEntries = entries.filter(entry => 
              (entry.speaker === 'user' || entry.speaker === 'assistant') &&
              !entry.text.includes('This session does not have any recorded conversation yet.')
            );
            
            if (validEntries.length > 0) {
              console.log(`Found ${validEntries.length} valid entries in database`);
              
              validEntries.forEach(entry => {
                allRecoveredEntries.push({
                  speaker: entry.speaker,
                  text: entry.text,
                  timestamp: entry.timestamp || new Date().toISOString()
                });
              });
            } else {
              console.log('No valid entries found in database (only system entries)');
            }
          } else {
            console.log('No entries found in database response');
          }
        } else {
          console.warn(`Database API returned status: ${entriesResponse.status}`);
          allTranscriptErrors.push(`Database API error: ${entriesResponse.status}`);
        }
      } catch (dbError: unknown) {
        console.error('Error retrieving from database:', (dbError instanceof Error) ? dbError.message : String(dbError));
        allTranscriptErrors.push(`Database retrieval error: ${(dbError instanceof Error) ? dbError.message : String(dbError)}`);
      }
      
      // 6. Check legacy transcript field
      console.log('STEP 6: Checking legacy transcript field');
      try {
        const sessionResponse = await fetch(`/api/sessions/${sessionId}`);
        
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          
          if (sessionData && sessionData.transcript && typeof sessionData.transcript === 'string') {
            console.log('Found legacy transcript field in session');
            
            // Parse the legacy transcript into entries
            const lines = sessionData.transcript.split('\n').filter((line: string) => line.trim() !== '');
            console.log(`Found ${lines.length} lines in legacy transcript`);
            
            if (lines.length > 0) {
              lines.forEach((line: string) => {
                const speakerMatch = line.match(/^([^:]+):\s*(.+)$/);
                
                if (speakerMatch) {
                  const rawSpeaker = speakerMatch[1].trim().toLowerCase();
                  const text = speakerMatch[2].trim();
                  
                  // Normalize speaker names
                  const speaker = 
                    rawSpeaker === 'user' || 
                    rawSpeaker === 'you' || 
                    rawSpeaker === 'client' || 
                    rawSpeaker === 'human' ? 'user' : 'assistant';
                  
                  if (text) {
                    allRecoveredEntries.push({
                      speaker,
                      text,
                      timestamp: new Date().toISOString()
                    });
                  }
                }
              });
            }
          } else {
            console.log('No legacy transcript found in session data');
          }
        } else {
          console.warn(`Session API returned status: ${sessionResponse.status}`);
          allTranscriptErrors.push(`Session API error: ${sessionResponse.status}`);
        }
      } catch (legacyError: unknown) {
        console.error('Error checking legacy transcript:', (legacyError instanceof Error) ? legacyError.message : String(legacyError));
        allTranscriptErrors.push(`Legacy transcript error: ${(legacyError instanceof Error) ? legacyError.message : String(legacyError)}`);
      }
      
      // 7. DEDUPLICATE ENTRIES
      console.log('STEP 7: Deduplicating all transcript entries');
      
      // ADDITIONAL CHECK: Look for transcripts directly in UI state
      if (transcriptChunks.length > 0) {
        console.log(`Found ${transcriptChunks.length} transcript chunks in state, adding to recovery`);
        
        for (const chunk of transcriptChunks) {
          const match = chunk.match(/^([A-Z]+):\s*(.+)/);
          if (match) {
            const rawSpeaker = match[1].toLowerCase();
            const text = match[2];
            
            // Normalize speaker names
            const normalizedSpeaker = 
              rawSpeaker === 'user' || 
              rawSpeaker === 'you' || 
              rawSpeaker === 'client' || 
              rawSpeaker === 'human' ? 'user' : 'assistant';
            
            // Add to recovered entries
            allRecoveredEntries.push({
              speaker: normalizedSpeaker,
              text: text,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
      
      // Create map using the text content as key to eliminate duplicates
      const uniqueEntries = new Map();
      
      // First pass: Group by exact speaker and text
      allRecoveredEntries.forEach(entry => {
        const key = `${entry.speaker}:${entry.text}`;
        
        if (!uniqueEntries.has(key)) {
          uniqueEntries.set(key, entry);
        } else {
          // If we've seen this before, keep the one with the earliest timestamp
          const existing = uniqueEntries.get(key);
          if (new Date(entry.timestamp) < new Date(existing.timestamp)) {
            uniqueEntries.set(key, entry);
          }
        }
      });
      
      // Convert back to array and sort by timestamp
      const dedupedEntries = Array.from(uniqueEntries.values())
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      console.log(`Deduplication complete: ${allRecoveredEntries.length} total entries reduced to ${dedupedEntries.length} unique entries`);
      
      // If we still don't have entries, create a placeholder entry to avoid empty transcript
      if (dedupedEntries.length === 0) {
        console.warn('⚠️ NO TRANSCRIPT ENTRIES FOUND IN ANY SOURCE! Creating placeholder entry');
        
        // Only add placeholder if absolutely nothing was found
        if (allTranscriptErrors.length > 0) {
          console.error('Recovery errors encountered:', allTranscriptErrors);
          dedupedEntries.push({
            speaker: 'system',
            text: `This session encountered transcript issues: ${allTranscriptErrors.join(' | ')}`,
            timestamp: new Date().toISOString()
          });
        } else {
          dedupedEntries.push({
            speaker: 'system',
            text: 'This session does not have any recorded conversation yet.',
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // 8. SAVE ALL RECOVERED ENTRIES TO DATABASE
      console.log('STEP 8: Saving all unique recovered entries to database');
      
      // Convert the deduped entries into transcript format for legacy compatibility
      const transcriptBuilder = dedupedEntries.map(entry => {
        const displaySpeaker = entry.speaker === 'user' ? 'USER' : 
                               entry.speaker === 'assistant' ? 'THERAPIST' : 'SYSTEM';
        return `${displaySpeaker}: ${entry.text}`;
      });
      
      const combinedTranscript = transcriptBuilder.join('\n');
      console.log(`Generated combined transcript with ${transcriptBuilder.length} entries`);
      
      // 8a. Import transcript service for adding entries
      try {
        const { addTranscriptEntry } = await import('@/lib/transcript-service');
        let savedCount = 0;
        
        // Save each entry individually
        for (const entry of dedupedEntries) {
          try {
            // Skip system entries for the database
            if (entry.speaker === 'system') continue;
            
            if (sessionId) {
              await addTranscriptEntry({
                sessionId,
                speaker: entry.speaker,
                text: entry.text,
                timestamp: entry.timestamp,
                isFinal: true
              });
              
              savedCount++;
            }
          } catch (entryError: unknown) {
            console.warn(`Error saving individual entry: ${(entryError instanceof Error) ? entryError.message : String(entryError)}`);
          }
        }
        
        console.log(`Successfully saved ${savedCount} individual entries to database`);
      } catch (importError) {
        console.error('Error importing transcript service:', importError);
      }
      
      // 8b. Also update the legacy transcript field for backward compatibility
      try {
        // In a separate try block in case individual entry saving failed
        await fetch(`/api/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcript: combinedTranscript
          })
        });
        
        console.log('Successfully updated legacy transcript field');
      } catch (legacyUpdateError) {
        console.error('Error updating legacy transcript:', legacyUpdateError);
      }
      
      // 9. FINALIZE SESSION
      console.log('STEP 9: Finalizing session');
      
      // Calculate actual duration based on start and end time
      let sessionDuration = 1; // default 1 minute minimum
      try {
        const endTime = new Date();
        const startTimeStr = sessionStorage.getItem('session-start-time');
        
        if (startTimeStr) {
          const startTime = new Date(startTimeStr);
          // Calculate duration in minutes and round to nearest minute
          const durationMs = endTime.getTime() - startTime.getTime();
          sessionDuration = Math.max(1, Math.round(durationMs / (1000 * 60)));
          console.log(`Session duration: ${sessionDuration} minutes (${Math.round(durationMs/1000)} seconds)`);
        } else {
          // Fallback to entry-based estimation if no start time
          const entryCount = dedupedEntries.length;
          sessionDuration = Math.max(1, Math.round(entryCount / 3));
          console.log(`Estimated session duration from ${entryCount} entries: ${sessionDuration} minutes`);
        }
      } catch (timeError) {
        console.error('Error calculating duration:', timeError);
        // Fallback to entry count based duration
        const entryCount = dedupedEntries.length;
        sessionDuration = Math.max(1, Math.round(entryCount / 3));
      }
      
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endTime: new Date().toISOString(),
          status: 'completed',
          duration: sessionDuration, // Update with actual duration
          notes: `Therapy session ${new Date().toLocaleDateString()} - Duration: ${sessionDuration} minutes - ${dedupedEntries.length} transcript entries`,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to update session');
      }
      
      console.log('📋 TRANSCRIPT RECOVERY COMPLETE');
      console.log(`Successfully saved ${dedupedEntries.length} unique transcript entries`);
      
    } catch (error) {
      console.error('Failed to end session:', error);
      setErrorMessage(`End session error: ${error}`);
    } finally {
      // Make sure to clear the session ID
      setSessionId(null);
      // Clear transcript chunks to free memory
      setTranscriptChunks([]);
    }
  }, [sessionId, transcriptChunks])
  
  // Toggle mute function
  const toggleMute = useCallback(() => {
    if (audioTrackRef.current) {
      const newMuteState = !isMuted;
      audioTrackRef.current.enabled = !newMuteState;
      setIsMuted(newMuteState);
      console.log(`Microphone ${newMuteState ? 'muted' : 'unmuted'}`);
      
      // If using Vapi, you can also signal to the Vapi instance that audio is muted
      if (vapiInstanceRef.current) {
        // Use the setMuted method from Vapi SDK
        if (typeof vapiInstanceRef.current.setMuted === 'function') {
          try {
            vapiInstanceRef.current.setMuted(newMuteState);
            console.log(`Vapi setMuted(${newMuteState}) called successfully`);
          } catch (e) {
            console.warn('Vapi setMuted method not available:', e);
          }
        }
      }
    } else {
      console.warn('No audio track available to mute/unmute');
    }
  }, [isMuted]);
  
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
    <div className="flex flex-col items-center justify-center w-full max-w-full sm:max-w-lg mx-auto px-2 overflow-visible">
      {/* Error messages */}
      {errorMessage && (
        <div 
          className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm w-full opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards]"
        >
          {errorMessage}
        </div>
      )}
      
      {/* Animate presence to handle intro and session transitions */}
      <AnimatePresence mode="wait">
        {/* Intro content - only visible when call is not active */}
        {!isCallActive && (
          <motion.div 
            key="intro"
            className="max-w-md text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.5 }}
          >
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Apple Phone Call Style UI - with animations */}
      <motion.div 
        className={`w-full max-w-[300px] xs:max-w-[85vw] sm:max-w-[340px] rounded-[28px] overflow-visible z-50 relative mx-auto border-zinc-700 ${isCallActive ? 'mt-0' : 'mt-8'}`}
        animate={{ 
          height: isCallActive ? 'auto' : '80px',
          y: isCallActive ? 0 : 0,
          opacity: 1,
          scale: isCallActive ? 1 : 0.95,
          top: isCallActive ? '0px' : '0px',
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
          height: isCallActive ? 'auto' : '80px',
          minHeight: isCallActive ? '520px' : '80px',
          boxShadow: isCallActive ? '0 0 50px rgba(0, 0, 0, 0.5)' : 'none',
          background: isCallActive ? 'black' : '',
          border: isCallActive ? '2px solid rgba(255, 255, 255, 0.15)' : 'none',
          borderRadius: '28px',
          zIndex: 100 // Ensure this is higher than any background
        }}
      >
        
        {/* Call Header - Only visible when call is active */}
        <div className="px-4 sm:px-6 pt-5 pb-3 flex flex-col items-center justify-center relative">
          {isCallActive && (
            <div className="text-white text-center bg-black px-6 py-3 rounded-t-[28px] shadow-inner w-full border-t border-x border-gray-800">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">
                {assistantConfig?.name || 'AI Therapist'}
              </h3>
              <p className="text-xs sm:text-sm text-blue-300 font-medium flex items-center justify-center">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></span>
                Connected
              </p>
            </div>
          )}
        </div>
        
        {/* Call Active Content */}
        {isCallActive && (
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex flex-col items-center justify-between h-[calc(100%-80px)] overflow-y-auto rounded-b-[28px] bg-black">
            {/* Timer & Status */}
            <div className="text-center py-2 text-gray-300 text-xs sm:text-sm">
              <span>End-to-end encrypted</span>
            </div>
            
            {/* Therapist Avatar */}
            <div className="py-4 sm:py-6 relative">
              {therapyType === 'solo' ? (
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden shadow-lg mb-3 sm:mb-4 border-2 border-blue-300 mx-auto">
                  <img 
                    src="/images/dr-elliot-mackaphy.jpg" 
                    alt="Dr. Elliot Mackaphy" 
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : therapyType === 'couple' ? (
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden shadow-lg mb-3 sm:mb-4 border-2 border-blue-300 mx-auto">
                  <img 
                    src="/images/dr-maya-thompson.jpg" 
                    alt="Dr. Maya Thompson" 
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden shadow-lg mb-3 sm:mb-4 border-2 border-blue-300 mx-auto">
                  <img 
                    src="/images/dr-jada-pearson.jpg" 
                    alt="Dr. Jada Pearson" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <p className="text-white text-center text-base sm:text-lg font-medium">
                {therapyType === 'solo' ? 'Dr. Elliot Mackaphy' : 
                 therapyType === 'couple' ? 'Dr. Maya Thompson' : 'Dr. Jada Pearson'}
              </p>
            </div>
            
            {/* Voice Waveform */}
            <div className="w-full my-2 sm:my-3 opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards] relative">
              <VoiceWaveform audioLevel={isMuted ? 0 : audioLevel} />
              {isMuted && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full animate-pulse shadow-md">
                    Microphone Muted
                  </div>
                </div>
              )}
            </div>
            
            {/* Timer Indicator */}
            <div className="text-center py-1 sm:py-2">
              <p className="text-white font-mono text-base sm:text-lg">
                {/* Show timer here if needed */}
                <span className="text-green-400">●</span> Active
              </p>
            </div>
            
            {/* Call Controls */}
            <div className="flex items-center justify-around w-full py-2 sm:py-4 mt-1 sm:mt-2">
              {/* Mute Button */}
              <div className="flex flex-col items-center">
                <button 
                  onClick={toggleMute}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full ${isMuted ? 'bg-red-600' : 'bg-gray-700'} flex items-center justify-center mb-1 sm:mb-2 transition-colors duration-300 hover:bg-opacity-90`}
                  aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                >
                  {isMuted ? (
                    // Muted microphone icon
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" strokeDasharray="2 2" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    // Active microphone icon
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>
                <span className="text-white text-xs">{isMuted ? "Unmute" : "Mute"}</span>
              </div>
              
              {/* End Call Button */}
              <div className="flex flex-col items-center">
                <button
                  onClick={endTherapySession}
                  disabled={isLoading}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600 flex items-center justify-center mb-1 sm:mb-2 shadow-lg hover:bg-red-700 transition-all duration-300 disabled:opacity-50"
                  aria-label="End call"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10 text-white rotate-135" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </button>
                <span className="text-white text-xs">End Call</span>
              </div>
              
              {/* Speaker Button */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-700 flex items-center justify-center mb-1 sm:mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 007.072 0m-9.9-2.828a9 9 0 0112.728 0" />
                  </svg>
                </div>
                <span className="text-white text-xs">Speaker</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Start Therapy Button - Only visible when call is not active */}
        {!isCallActive && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-center z-20"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              delay: 0.2,
              duration: 0.4, 
              type: "spring",
              stiffness: 260, 
              damping: 20 
            }}
          >
            <motion.button
              onClick={() => {
                console.log('Start button clicked');
                // Set UI state immediately
                setIsCallActive(true);
                // Set blue gradient effect right away
                document.body.classList.add('session-active');
                // Add visualizing effect for better readability
                const main = document.querySelector('main');
                if (main) {
                  main.style.transition = 'all 0.3s ease-in-out';
                  main.style.opacity = '0.85'; // Less dim for better visibility
                  // Apply blur to the background, not the content
                  document.body.style.backdropFilter = 'blur(5px)';
                }
                // Then start the actual session process
                startTherapySession();
              }}
              disabled={isLoading}
              title={`Start a ${therapyType} therapy session with ${assistantConfig?.name}`}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center shadow-lg hover:cursor-pointer hover:from-green-600 hover:to-green-700 disabled:opacity-50"
              aria-label="Start therapy session"
              whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(0, 255, 0, 0.3)" }}
              whileTap={{ scale: 0.95 }}
              animate={{ 
                boxShadow: ["0 0 0px rgba(0, 255, 0, 0)", "0 0 15px rgba(0, 255, 0, 0.3)", "0 0 0px rgba(0, 255, 0, 0)"] 
              }}
              transition={{
                boxShadow: {
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut"
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-12 sm:w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </motion.button>
          </motion.div>
        )}
      </motion.div>
      
      {/* Session status message */}
      {isCallActive && (
        <p className="mt-4 text-green-600 font-medium text-sm sm:text-base opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards] text-center">
          Session active - speak with our AI therapist
        </p>
      )}
    </div>
  )
}

export default TherapyButton