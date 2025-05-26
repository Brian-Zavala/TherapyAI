'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Vapi from '@vapi-ai/web'
import dynamic from 'next/dynamic'
import { COUPLE_THERAPY_ASSISTANT_CONFIG } from '@/lib/vapi'
import { useSoundContext } from './SoundProvider'

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
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  
  // Get the sound context to control music playback
  const { stopMusicPlayback, setSessionActive } = useSoundContext()
  
  // Refs for performance optimization
  // Using ExtendedVapi type to handle custom properties
  const vapiInstanceRef = useRef<ExtendedVapi | null>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const analyser = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const audioTrackRef = useRef<MediaStreamTrack | null>(null) // Reference to audio track for muting
  
  // Check for existing session on component mount using useCallback for performance
  // Note: We don't auto-start sessions to avoid unexpected behavior
  const checkForActiveSession = useCallback(async () => {
    try {
      console.log('Checking for active sessions for user:', userId);
      const response = await fetch(`/api/sessions/active?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        if (data && data.id) {
          // Only store the session ID
          setSessionId(data.id)
          console.log('Found existing session, but not auto-starting:', data.id)
          // Don't auto-start the session, but set the flag to avoid cleanup
          if (typeof window !== 'undefined') {
            // Don't set as active yet because user hasn't clicked the button
            (window as any).__existingSession = data.id;
          }
        } else {
          console.log('No active session found for user');
        }
      }
    } catch (error) {
      console.error('Error checking for active session:', error)
    }
  }, [userId])
  
  // Effect to cycle loading messages
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % 6);
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [isLoading]);
  
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
    
    // NOTE: We DON'T want to clean up on unmount if a session is active
    // Because this would immediately stop any session that was just started
    return () => {
      // Check multiple indicators for active session
      const hasSessionClass = document.body.classList.contains('session-active');
      const hasWindowFlag = (window as any).__therapySessionActive === true;
      const hasExistingSession = (window as any).__existingSession;
      
      if (hasSessionClass || hasWindowFlag || hasExistingSession) {
        console.log('Component unmounting but session indicators present - NOT cleaning up', {
          hasSessionClass,
          hasWindowFlag,
          hasExistingSession
        });
      } else {
        console.log('Component unmounting, no active session - cleaning up resources');
        cleanupResources();
      }
    }
  }, [checkForActiveSession]) // Only depend on checkForActiveSession
  
  // Enhanced cleanup function for thoroughly releasing resources
  const cleanupResources = () => {
    // Check if we have an active session flag set
    if (typeof window !== 'undefined' && (window as any).__therapySessionActive === true) {
      console.log('⚠️ Cleanup requested but session is active - SKIPPING CLEANUP');
      return;
    }
    
    console.log('🧹 Cleaning up resources...');
    
    // 1. Clean up animation frame
    if (animationFrameRef.current) {
      console.log('- Canceling animation frame');
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // 2. Clean up audio context
    if (audioContext.current) {
      console.log('- Closing audio context');
      audioContext.current.close();
      audioContext.current = null;
    }
    
    // 3. Clean up audio tracks
    if (audioStreamRef.current) {
      console.log('- Stopping audio tracks');
      audioStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`  - Track ${track.id} stopped (${track.kind})`);
      });
      audioStreamRef.current = null;
      audioTrackRef.current = null;
    }
    
    // 4. Clean up Vapi status interval
    if (vapiInstanceRef.current && (vapiInstanceRef.current as any)._statusInterval) {
      console.log('- Clearing status check interval');
      clearInterval((vapiInstanceRef.current as any)._statusInterval);
      (vapiInstanceRef.current as any)._statusInterval = null;
    }
    
    // 5. Reset Vapi tracking values
    if (vapiInstanceRef.current) {
      (vapiInstanceRef.current as any)._isCallActive = false;
      (vapiInstanceRef.current as any)._currentAssistantId = null;
      
      // Explicitly mark the transport as closed to avoid reconnection attempts
      (vapiInstanceRef.current as any)._transportState = 'closed';
    }
    
    // 6. Remove event listeners
    if (typeof window !== 'undefined') {
      console.log('- Removing window event listeners');
      window.removeEventListener('online', () => {});
      window.removeEventListener('offline', () => {});
    }
    
    // 7. Release browser permissions indicators if present
    try {
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        navigator.permissions.query({ name: 'microphone' as PermissionName })
          .then(permissionStatus => {
            console.log(`- Current microphone permission status: ${permissionStatus.state}`);
          })
          .catch(() => {});
      }
    } catch (permError) {
      // Ignore permission query errors
    }
    
    // 8. Remove session styling immediately
    console.log('- Removing session styling');
    document.body.classList.remove('session-active');
    
    // 9. Restore opacity of main content with faster transition
    const main = document.querySelector('main');
    if (main) {
      main.style.transition = 'opacity 0.15s ease-in-out';
      main.style.opacity = '1';
    }
    
    // 10. Ensure any backdrop filter is completely removed
    document.body.style.backdropFilter = 'none';
    
    // 11. For extra safety, also remove any other potential overlay effects
    document.body.style.filter = 'none';
    
    // 12. Reset browser idle detection if available
    if ('IdleDetector' in window) {
      try {
        // Inform the browser we're no longer in an active call
        // This can help with power management and background throttling
        (navigator as any).userActivation?.isActive;
      } catch (idleError) {
        // Ignore idle detection errors
      }
    }
    
    // 13. Update session state in context
    setSessionActive(false);
    
    console.log('✅ Cleanup complete');
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
  const createVapiInstance = useCallback(async (userProfile?: any) => {
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
      // Get API key from environment variables
      const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY;
      
      // Check if API key exists
      if (!apiKey) {
        console.error('NEXT_PUBLIC_VAPI_API_KEY is not set in environment variables');
        
        // Log all available NEXT_PUBLIC keys for debugging
        console.log("Available environment variables:", 
          Object.keys(process.env)
            .filter(key => key.startsWith('NEXT_PUBLIC'))
            .reduce((obj, key) => {
              obj[key] = process.env[key] ? '✅ Set' : '❌ Not set';
              return obj;
            }, {})
        );
        
        throw new Error('Vapi API key not configured - check environment variables');
      }
      
      console.log('Found Vapi API key, starting authentication');
      
      try {
        // Import and use initVapi which has debugging built in
        const { initVapi } = await import('@/lib/vapi');
        
        // Create instance directly with API key (no custom transcriber)
        console.log('🎙️ Initializing Vapi with default transcriber');
        const vapiInstance = await initVapi(apiKey, { 
          useCustomTranscriber: false,
          // Ensure reconnection is enabled
          reconnectEnabled: true,
          // Add more STUN servers for better connectivity
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
            { urls: "stun:stun.ekiga.net" },
            { urls: "stun:stun.ideasip.com" },
            { urls: "stun:stun.schlund.de" }
          ]
        });
        
        if (!vapiInstance) {
          throw new Error('Vapi initialization returned null or undefined');
        }
        
        vapiInstanceRef.current = vapiInstance;
        console.log('✅ Vapi initialized successfully with default transcriber');
      } catch (initError) {
        console.error('🔴 Error initializing Vapi:', initError);
        // Re-throw the error after logging it
        throw new Error(`Failed to initialize Vapi: ${initError.message}`);
      }
      
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
      
      // ULTRA-FAST MODE: Skip all personalization to improve startup time
      // All customization should be handled by the pre-configured assistant in Vapi dashboard
      console.log('⚡ ULTRA-FAST MODE: Skipping personalization to reduce startup time');
      console.log('All customization will be handled by the pre-configured assistant');
      
      // Only store minimal data for transcript recording
      if (userProfile && vapiInstanceRef.current) {
        vapiInstanceRef.current._customData = {
          userName: userProfile.name || 'client',
          therapyType: therapyType
        };
      }
      
      
      // Set up event handlers
      vapiInstanceRef.current.on('call-start', () => {
        console.log('✅ Vapi call started - call-start event fired');
        setIsCallActive(true);
        setIsLoading(false); // Stop loading animation when call actually starts
        setErrorMessage(null);
        
        // Ensure session-active class is present (critical for starry night visualization)
        if (!document.body.classList.contains('session-active')) {
          console.log('WARNING: session-active class missing on call-start, adding it now');
          document.body.classList.add('session-active');
        }
        
        // Ensure we have applied all visualization settings
        const main = document.querySelector('main');
        if (main) {
          main.style.transition = 'all 0.3s ease-in-out';
          main.style.opacity = '0.95';
        }
        
        // Add initial transcript entry to mark start of session
        if (sessionId) {
          try {
            setTimeout(async () => {
              // Import transcript service
              const { addTranscriptEntry, getPreviousSessionsTranscript } = await import('@/lib/transcript-service');
              
              try {
                // First, add system message
                const result = await addTranscriptEntry({
                  sessionId,
                  speaker: 'system',
                  text: 'Therapy session started. The AI therapist is connecting...',
                  timestamp: new Date().toISOString(),
                  isFinal: true
                });
                console.log('Successfully added session start entry with ID:', result?.id);
                
                // Force UI update
                setTranscriptChunks(prev => [...prev, 'SYSTEM: Session started']);
                
                // Directly fetch previous session transcripts without relying on stored data
                console.log('Directly fetching previous session history');
                const previousSessionsHistory = await getPreviousSessionsTranscript(userId, sessionId);
                
                // Check if we have previous sessions to include
                if (previousSessionsHistory) {
                  console.log('Found previous session history, adding to transcript');
                  
                  // Wait a moment before adding session context
                  setTimeout(async () => {
                    try {
                      // Insert a user message asking about previous sessions
                      const userEntryResult = await addTranscriptEntry({
                        sessionId,
                        speaker: 'user',
                        text: 'Do you remember our previous therapy sessions?',
                        timestamp: new Date(Date.now() + 2000).toISOString(),
                        isFinal: true
                      });
                      console.log('Added user entry asking about previous sessions');
                      
                      // Insert the assistant response with session history
                      const assistantEntryResult = await addTranscriptEntry({
                        sessionId,
                        speaker: 'assistant',
                        text: `Yes, of course I remember our previous sessions. I've kept detailed notes about our conversations. In our past sessions, we've explored several important topics. Is there anything specific from our previous discussions you'd like to revisit, or would you prefer to focus on something new today?`,
                        timestamp: new Date(Date.now() + 4000).toISOString(),
                        isFinal: true
                      });
                      console.log('Added assistant response acknowledging previous sessions');
                      
                      // Now add the actual history as a system message for the AI to see
                      // but not visible to the user (hidden in the UI)
                      const systemHistoryEntry = await addTranscriptEntry({
                        sessionId,
                        speaker: 'system',
                        text: "IMPORTANT: USER HAS PREVIOUS SESSIONS - therapist must acknowledge and reference prior discussions when asked.\n\n" + previousSessionsHistory,
                        timestamp: new Date(Date.now() + 100).toISOString(),
                        isFinal: true
                      });
                      console.log('Added system entry with previous session details');
                      
                      // Update UI with these entries
                      setTranscriptChunks(prev => [
                        ...prev, 
                        'USER: Do you remember our previous therapy sessions?',
                        'THERAPIST: Yes, of course I remember our previous sessions. I\'ve kept detailed notes about our conversations. In our past sessions, we\'ve explored several important topics. Is there anything specific from our previous discussions you\'d like to revisit, or would you prefer to focus on something new today?'
                      ]);
                      
                    } catch (err) {
                      console.error('Failed to add session history entries:', err);
                    }
                  }, 2000);
                } else {
                  console.log('No previous session history found');
                }
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
        setIsLoading(false); // Ensure loading is stopped
        
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
        console.error('Vapi error (complete):', error || 'No error details available')
        setIsLoading(false); // Stop loading on error
        
        // Create a more descriptive error message
        let errorDetail = "Unknown error";
        let errorCode = "";
        try {
          // Try to extract meaningful error information based on different possible formats
          if (error && typeof error === 'object') {
            console.log('Error object structure:', JSON.stringify(error, null, 2));
            
            // First look for an error message
            if ('message' in error && typeof (error as any).message === 'string') {
              errorDetail = (error as any).message;
            } 
            // Check for error code
            if ('code' in error) {
              errorCode = `Code: ${(error as any).code}`;
            }
            // Check for status
            if ('status' in error) {
              errorCode += (errorCode ? ', ' : '') + `Status: ${(error as any).status}`;
            }
            // For error that contains detail field
            if ('detail' in error && typeof (error as any).detail === 'string') {
              errorDetail = (error as any).detail;
            }
            // For error with no recognized fields but has properties
            if (errorDetail === "Unknown error" && Object.keys(error).length > 0) {
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
            if ('code' in error) {
              errorCode = `Code: ${(error as any).code}`;
            }
          }
        } catch (e) {
          errorDetail = "Error parsing error details";
          console.error("Error while parsing error details:", e);
        }
        
        // Set user-friendly message with more details
        let userMessage = `Voice assistant error: ${errorDetail}`;
        if (errorCode) {
          userMessage += ` (${errorCode})`;
        }
        userMessage += ". Please try again.";
        
        setErrorMessage(userMessage);
        
        // Also attempt to diagnose the error
        console.log('Attempting error diagnosis...');
        let possibleSolution = '';
        
        if (errorDetail.includes('404') || errorDetail.includes('not found')) {
          possibleSolution = 'This appears to be an API endpoint issue. Verify API URL is correct.';
        } else if (errorDetail.includes('401') || errorDetail.includes('unauthorized')) {
          possibleSolution = 'This appears to be an authentication issue. Verify API key is correct.';
        } else if (errorDetail.includes('network') || errorDetail.includes('connection')) {
          possibleSolution = 'This appears to be a network connectivity issue.';
        }
        
        if (possibleSolution) {
          console.log('DIAGNOSIS: ' + possibleSolution);
        }
        
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
  
  // Set up network request capture to debug API issues
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      // Create network capture to see where requests are going
      try {
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
          const [url, options] = args;
          // Only log API calls related to Vapi
          if (url && typeof url === 'string' && 
             (url.includes('vapi.ai') || url.includes('call/web') || url.includes('assistant'))) {
            console.log(`🌐 FETCH REQUEST: ${url}`, options);
            
            // Return the promise but also add our own then/catch to see the result
            return originalFetch(...args)
              .then(response => {
                // Clone the response so we can both log it and return it
                const clone = response.clone();
                // Log success or failure
                if (response.ok) {
                  console.log(`✅ FETCH SUCCESS: ${url} - Status: ${response.status}`);
                } else {
                  console.error(`❌ FETCH ERROR: ${url} - Status: ${response.status}`);
                  // Try to get response body for error details
                  clone.text().then(text => {
                    try {
                      const json = JSON.parse(text);
                      console.error('Error details:', json);
                    } catch {
                      console.error('Error response (text):', text);
                    }
                  }).catch(e => {
                    console.error('Error parsing response:', e);
                  });
                }
                return response;
              })
              .catch(error => {
                console.error(`💥 FETCH EXCEPTION: ${url}`, error);
                throw error;
              });
          }
          return originalFetch(...args);
        };
        
        console.log('👀 API request capture active - monitoring Vapi API calls');
        
        return () => {
          window.fetch = originalFetch;
          console.log('API request capture removed');
        };
      } catch (error) {
        console.warn('Could not set up network capture:', error);
      }
    }
  }, []);

  // Start therapy session
  const startTherapySession = useCallback(async () => {
    console.log('⚙️ Starting therapy session initialization...');
    setErrorMessage(null)
    setIsLoading(true)
    
    // Store a session flag in window object to ensure we don't accidentally clean up
    if (typeof window !== 'undefined') {
      (window as any).__therapySessionActive = true;
      console.log('Setting session active flag in window object');
    }
    
    try {
      // Verify the session-active class is present (double check as this is critical for visuals)
      if (!document.body.classList.contains('session-active')) {
        console.warn('session-active class missing from document.body - adding it');
        document.body.classList.add('session-active');
      }
      
      // Not setting isCallActive or setSessionActive here as it's already done in the button click handler
      
      // Store session start time for duration calculation
      const sessionStartTime = new Date();
      // Store in sessionStorage for recovery on browser refresh
      try {
        sessionStorage.setItem('session-start-time', sessionStartTime.toISOString());
        sessionStorage.setItem(`session-${sessionId}-start-time`, sessionStartTime.toISOString());
        console.log('Saved session start time:', sessionStartTime.toISOString());
        
        // Also store session ID for recovery
        sessionStorage.setItem('active-session-id', sessionId);
      } catch (err) {
        console.warn('Could not save session start time to sessionStorage', err);
      }
      
      // ULTRA-FAST MODE: Minimize API calls during session start
      // Only load essential data, skip heavy operations
      console.log('⚡ ULTRA-FAST MODE: Loading only essential data for immediate session start');
      
      let userProfile = null;
      try {
        // Quick user profile fetch with timeout
        const profileResponse = await Promise.race([
          fetch('/api/user/profile'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Profile fetch timeout')), 2000))
        ]);
        
        if (profileResponse.ok) {
          userProfile = await profileResponse.json();
          console.log('✅ Got user profile quickly');
        }
      } catch (err) {
        console.warn('⚠️ Using default experience - profile load failed or timed out:', err);
      }
      
      // Start audio setup in background (don't wait for it)
      setupAudioAnalyzer().catch(err => {
        console.warn('Audio setup failed, continuing anyway:', err);
      });
      
      // ULTRA-FAST MODE: Create minimal session record
      console.log('⚡ Creating minimal session record for faster startup');
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime: sessionStartTime.toISOString(),
          date: sessionStartTime.toISOString(),
          status: 'active',
          duration: 60,
          theme: `${therapyType.charAt(0).toUpperCase() + therapyType.slice(1)} Therapy`,
          notes: `Session started`,
          assistantId: assistantConfig.id || '',
          // Minimal context to avoid bloated payloads
          context: userProfile?.name ? { userName: userProfile.name, therapyType } : { therapyType }
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
      
      // ULTRA-FAST MODE: Skip expensive session history processing
      console.log('⚡ ULTRA-FAST MODE: Skipping session history processing for faster startup');
      
      // Initialize Vapi immediately with minimal profile
      const initialized = await createVapiInstance(userProfile)
      if (!initialized) {
        throw new Error('Failed to initialize Vapi')
      }
      
      // ULTRA-FAST MODE: Skip complex network monitoring to reduce overhead
      console.log('⚡ ULTRA-FAST MODE: Skipping network monitoring for faster startup');
      
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
      
      // Log the available assistant options
      console.log('Assistant config:', JSON.stringify({
        id: assistantConfig?.id,
        name: assistantConfig?.name,
        type: assistantConfig?.type,
        therapyType
      }));
      
      // Check for assistantId based on therapy type
      if (therapyType === 'couple') {
        assistantId = process.env.NEXT_PUBLIC_VAPI_COUPLE_ASSISTANT_ID;
        console.log('Using couple therapy assistant ID:', assistantId);
      } else if (therapyType === 'solo') {
        assistantId = process.env.NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID;
        console.log('Using solo therapy assistant ID:', assistantId);
      } else if (therapyType === 'family') {
        assistantId = process.env.NEXT_PUBLIC_VAPI_FAMILY_ASSISTANT_ID;
        console.log('Using family therapy assistant ID:', assistantId);
      } else if (assistantConfig && assistantConfig.id) {
        console.log('Using assistant ID from config:', assistantConfig.id);
        assistantId = assistantConfig.id;
      } else {
        console.log('No specific assistant ID found, using default assistant ID');
        assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
      }
      
      if (!assistantId) {
        console.error('No assistant ID available from any source');
        throw new Error('No assistant ID available')
      }
      
      console.log(`Starting ${therapyType} therapy session with assistant: ${assistantConfig?.name || 'Unknown'} (ID: ${assistantId})`);
      console.log(`Voice configuration: ${JSON.stringify(assistantConfig?.voice || 'default')}`);
      
      // Ensure we have a session-active class on the body - this is critical for the starry night visualization
      if (!document.body.classList.contains('session-active')) {
        console.log('WARNING: session-active class missing from document.body, adding it now');
        document.body.classList.add('session-active');
      } else {
        console.log('Verified session-active class is present on document.body');
      }
      
      // ENHANCED MODE: Start call with personalized assistant configuration
      try {
        console.log('🚀 Starting enhanced therapy session with personalization');
        console.log('Using assistant ID:', assistantId);
        console.log('Therapy type:', therapyType);
        
        // Ensure we have a clean state
        if (vapiInstanceRef.current) {
          (vapiInstanceRef.current as any)._isCallActive = true;
          (vapiInstanceRef.current as any)._currentAssistantId = assistantId;
          (vapiInstanceRef.current as any)._callStartTime = new Date();
        }
        
        // Validate that assistantId exists
        if (!assistantId) {
          throw new Error('Assistant ID is missing or invalid');
        }
        
        // Check if vapiInstanceRef.current exists before calling start
        if (!vapiInstanceRef.current) {
          throw new Error('Vapi instance not initialized');
        }
        
        try {
          // Fetch personalized assistant configuration from API
          console.log('Fetching personalized assistant configuration...');
          const configResponse = await fetch(`/api/vapi/assistant?personalized=true&therapyType=${therapyType}`);
          
          if (!configResponse.ok) {
            throw new Error('Failed to fetch personalized configuration');
          }
          
          const personalizedConfig = await configResponse.json();
          console.log('✅ Received personalized configuration with enhanced settings');
          
          // Option 1: Try to configure assistant server-side first
          try {
            console.log('Attempting server-side assistant configuration...');
            const configureResponse = await fetch('/api/vapi/assistant/configure', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                assistantId,
                configuration: personalizedConfig
              })
            });
            
            if (configureResponse.ok) {
              console.log('✅ Assistant configured server-side successfully');
              // Now start with just variable values since config is on server
              const minimalOverrides = {
                variableValues: {
                  userName: personalizedConfig.variableValues?.userName || userProfile?.name || 'there',
                  partnerName: personalizedConfig.variableValues?.partnerName || userProfile?.partnerName || '',
                  therapyType: therapyType
                }
              };
              await vapiInstanceRef.current.start(assistantId, minimalOverrides);
              console.log('✅ Session started with server-configured assistant');
              return; // Exit early on success
            }
          } catch (configError) {
            console.warn('Server-side configuration failed, using client-side approach:', configError);
          }
          
          // Option 2: Store config in multiple places for redundancy
          // Store in Vapi instance
          if (vapiInstanceRef.current) {
            (vapiInstanceRef.current as any)._enhancedConfig = personalizedConfig;
            console.log('Stored enhanced configuration on Vapi instance');
          }
          
          // Store in sessionStorage for persistence
          try {
            const { VapiConfigStore } = await import('@/lib/vapi-config-store');
            VapiConfigStore.storeConfig(assistantId, {
              model: personalizedConfig.model,
              voice: personalizedConfig.voice,
              transcriber: personalizedConfig.transcriber,
              silenceTimeoutSeconds: personalizedConfig.silenceTimeoutSeconds,
              responseDelaySeconds: personalizedConfig.responseDelaySeconds,
              llmRequestDelaySeconds: personalizedConfig.llmRequestDelaySeconds,
              numWordsToInterruptAssistant: personalizedConfig.numWordsToInterruptAssistant,
              backchanneling: personalizedConfig.backchanneling,
            });
            console.log('Stored configuration in sessionStorage');
          } catch (storeError) {
            console.warn('Failed to store config in sessionStorage:', storeError);
          }
          
          // Only send minimal overrides in the payload
          const minimalOverrides = {
            firstMessage: personalizedConfig.firstMessage,
            variableValues: {
              userName: personalizedConfig.variableValues?.userName || userProfile?.name || 'there',
              partnerName: personalizedConfig.variableValues?.partnerName || userProfile?.partnerName || '',
              therapyType: therapyType
            }
          };
          
          // Start with minimal configuration
          await vapiInstanceRef.current.start(assistantId, minimalOverrides);
          console.log('✅ Enhanced therapy session started successfully');
          
        } catch (enhancedError) {
          console.warn('⚠️ Enhanced mode failed, falling back to basic configuration:', enhancedError);
          
          // Fallback: try with progressively simpler configurations
          console.warn('Enhanced mode failed, trying fallback approaches...');
          
          // First try: Just variable values
          try {
            console.log('Fallback 1: Trying with just variable values...');
            const minimalOverrides = {
              variableValues: {
                userName: userProfile?.name || 'there',
                partnerName: userProfile?.partnerName || '',
                therapyType: therapyType
              }
            };
            await vapiInstanceRef.current.start(assistantId, minimalOverrides);
            console.log('✅ Variable values fallback successful');
          } catch (fallback1Error) {
            console.warn('Fallback 1 failed:', fallback1Error);
            
            // Second try: Just assistant ID
            try {
              console.log('Fallback 2: Trying with just assistant ID...');
              await vapiInstanceRef.current.start(assistantId);
              console.log('✅ Minimal configuration successful');
            } catch (fallback2Error) {
              console.error('❌ All fallback approaches failed:', fallback2Error);
              
              // Final attempt: Use a default assistant ID if available
              const defaultAssistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
              if (defaultAssistantId && defaultAssistantId !== assistantId) {
                try {
                  console.log('Final fallback: Trying with default assistant ID...');
                  await vapiInstanceRef.current.start(defaultAssistantId);
                  console.log('✅ Default assistant fallback successful');
                } catch (finalError) {
                  throw new Error('Failed to start session with any configuration or assistant');
                }
              } else {
                throw new Error('Failed to start session with any configuration level');
              }
            }
          }
        }
        
        console.log('✅ Therapy session initialization complete');
      } catch (err) {
        console.error('❌ Fatal error starting therapy session:', err);
        throw err;
      }
    } catch (error) {
      console.error('❌ Failed to start therapy session:', error)
      setErrorMessage(`Start session error: ${error}`)
      
      // Reset the session active flag since the session failed to start
      if (typeof window !== 'undefined') {
        (window as any).__therapySessionActive = false;
        console.log('Resetting session active flag due to error');
      }
      
      // Clean up UI and resources
      cleanupResources();
      
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
  }, [userId, createVapiInstance, sessionId, therapyType, assistantConfig, stopMusicPlayback, setSessionActive])
  
  // End therapy session
  const endTherapySession = useCallback(async () => {
    console.log('End therapy session called')
    
    // Reset the session active flag since the session is ending
    if (typeof window !== 'undefined') {
      (window as any).__therapySessionActive = false;
      console.log('Resetting session active flag - session ending');
    }
    
    // Immediately reset UI state to improve user experience and ensure UI updates
    setIsCallActive(false);
    setIsLoading(false);
    setIsMuted(false); // Reset mute state when call ends
    setLoadingMessageIndex(0); // Reset loading message index
    
    // Update session state in the sound context
    setSessionActive(false);
    
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
        let startTimeStr = sessionStorage.getItem('session-start-time');
        
        // Try session-specific start time as fallback
        if (!startTimeStr && sessionId) {
          startTimeStr = sessionStorage.getItem(`session-${sessionId}-start-time`);
          if (startTimeStr) {
            console.log('Using session-specific start time as fallback');
          }
        }
        
        if (startTimeStr) {
          const startTime = new Date(startTimeStr);
          // Calculate duration in minutes and round to nearest minute
          const durationMs = endTime.getTime() - startTime.getTime();
          sessionDuration = Math.max(1, Math.round(durationMs / (1000 * 60)));
          console.log(`Session duration calculated: ${sessionDuration} minutes (${Math.round(durationMs/1000)} seconds)`);
          console.log(`IMPORTANT: This duration (${sessionDuration} min) will be sent to the API for updating the session record.`);
        } else {
          // If no start time in sessionStorage, try to use session creation time
          console.warn('No session-start-time found in sessionStorage, using fallback calculation');
          
          // More accurate fallback: estimate based on transcript entries and average speaking rate
          const entryCount = dedupedEntries.length;
          const totalWords = dedupedEntries.reduce((sum, entry) => sum + entry.text.split(' ').length, 0);
          
          // Average speaking rate is about 150 words per minute
          // Add some buffer time for pauses and thinking
          const estimatedMinutes = Math.ceil(totalWords / 120); // Conservative estimate
          
          // Also consider minimum time based on number of exchanges
          const minTimeByExchanges = Math.ceil(entryCount / 2); // Assume at least 30 seconds per exchange
          
          sessionDuration = Math.max(1, Math.max(estimatedMinutes, minTimeByExchanges));
          console.log(`Estimated session duration: ${sessionDuration} minutes (${entryCount} entries, ${totalWords} words)`);
        }
      } catch (timeError) {
        console.error('Error calculating duration:', timeError);
        // Final fallback to a reasonable estimate based on transcript length
        const entryCount = dedupedEntries.length;
        // Assume an average conversation has about 2-3 exchanges per minute
        sessionDuration = Math.max(1, Math.ceil(entryCount / 2.5));
        console.log(`Fallback duration estimate: ${sessionDuration} minutes from ${entryCount} entries`);
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
      
      console.log(`✅ SESSION UPDATE CONFIRMED - Duration sent to API: ${sessionDuration} minutes`);
      
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
  }, [sessionId, transcriptChunks, setSessionActive])
  
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
    <div className="flex flex-col items-center justify-center w-full max-w-full sm:max-w-lg mx-auto px-2" style={{ 
      position: 'relative', 
      zIndex: 10000, 
      overflow: 'visible',
      minHeight: isCallActive ? '600px' : 'auto'
    }}>
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
        className={`w-full max-w-[300px] xs:max-w-[85vw] sm:max-w-[340px] rounded-[28px] overflow-visible relative mx-auto border-zinc-700 ${isCallActive ? 'mt-0' : 'mt-8'}`}
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
          background: isCallActive ? 'rgba(0, 0, 0, 0.95)' : 'transparent',
          border: isCallActive ? '2px solid rgba(255, 255, 255, 0.3)' : 'none',
          borderRadius: '28px',
          zIndex: 9999, // Increase z-index to ensure visibility
          position: 'relative', // Ensure positioning context
          display: 'block', // Ensure it's displayed
          visibility: 'visible' // Ensure it's visible
        }}
      >
        
        {/* Call Header - Only visible when call is active and not loading */}
        <div className="px-4 sm:px-6 pt-5 pb-3 flex flex-col items-center justify-center relative">
          {isCallActive && !isLoading && (
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
        
        {/* Loading Animation - Show when loading but call not started */}
        {isCallActive && isLoading && (
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
              <motion.p
                className="text-gray-300 text-sm font-light"
                key={loadingMessageIndex} // Force re-render for smooth transitions
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.5 }}
              >
                {[
                  "Creating a safe space...",
                  "Connecting with your therapist...",
                  "Preparing therapeutic environment...",
                  "Setting up secure connection...",
                  "Initializing session protocols...",
                  "Almost ready..."
                ][loadingMessageIndex]}
              </motion.p>
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
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut"
                  }}
                >
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 shadow-lg" />
                  <motion.div
                    className="absolute inset-0 w-3 h-3 rounded-full bg-white/30"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: "easeOut"
                    }}
                  />
                </motion.div>
              ))}
            </div>
            
            {/* Subtle tip text */}
            <motion.p
              className="text-gray-500 text-xs mt-8 px-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 1 }}
            >
              This may take a few moments • Your privacy is protected
            </motion.p>
          </motion.div>
        )}
        
        {/* Call Active Content */}
        {isCallActive && !isLoading && (
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
            <div className="w-full my-2 sm:my-3 opacity-100 relative" style={{ minHeight: '80px' }}>
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
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full ${isMuted ? 'bg-red-600' : 'bg-gray-700'} flex items-center justify-center mb-1 sm:mb-2 transition-colors duration-300 hover:bg-opacity-90 cursor-pointer`}
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
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600 flex items-center justify-center mb-1 sm:mb-2 shadow-lg hover:bg-red-700 transition-all duration-300 disabled:opacity-50 cursor-pointer"
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
                console.log('Start button clicked - initializing session');
                
                // IMMEDIATE UI FEEDBACK - critical for user experience
                // 1. Set window flag FIRST to prevent cleanup
                if (typeof window !== 'undefined') {
                  (window as any).__therapySessionActive = true;
                  console.log('Set window.__therapySessionActive = true');
                }
                
                // 2. Set session-active class for visual feedback
                document.body.classList.add('session-active');
                console.log('Added session-active class to body');
                
                // 3. Set UI state for component
                setIsCallActive(true);
                console.log('Set isCallActive = true');
                
                // 4. Apply visual effects immediately 
                const main = document.querySelector('main');
                if (main) {
                  main.style.transition = 'all 0.3s ease-in-out';
                  main.style.opacity = '0.95';
                }
                
                // 5. Tell the sound context we're active
                setSessionActive(true);
                console.log('Set session active in sound context');
                
                // 6. Start the session initialization process
                console.log('Starting therapy session process');
                startTherapySession().catch(error => {
                  console.error('Error starting session:', error);
                  setErrorMessage(`Failed to start session: ${error.message || 'Unknown error'}`);
                  
                  // Reset UI state if session fails to start
                  document.body.classList.remove('session-active');
                  setIsCallActive(false);
                  if (main) {
                    main.style.opacity = '1';
                  }
                  setSessionActive(false);
                });
              }}
              disabled={isLoading}
              title={`Start a ${therapyType} therapy session with ${assistantConfig?.name}`}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center shadow-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 cursor-pointer"
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

export default React.memo(TherapyButton)