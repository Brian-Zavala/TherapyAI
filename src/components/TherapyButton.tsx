'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Vapi from '@vapi-ai/web'
import dynamic from 'next/dynamic'
import { COUPLE_THERAPY_ASSISTANT_CONFIG } from '@/lib/vapi'
import { useSoundContext } from './SoundProvider'
import SessionDurationModal from './SessionDurationModal'
import FamilyMemberSelectionModal from './FamilyMemberSelectionModal'
import SessionTimer from './SessionTimer'
import { RealTimeMetricsCalculator, type IncrementalMetrics } from '@/lib/real-time-metrics-optimized'
import { 
  VapiMessage, 
  isTranscriptMessage, 
  isModelOutputMessage, 
  isConversationUpdateMessage,
  isFunctionCallMessage,
  isSpeechUpdateMessage
} from '@/types/vapi'
import { addTranscriptEntry } from '@/lib/transcript-service-optimized'

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
  shouldAutoRestart?: boolean; // When true, auto-restart session if found
}

function TherapyButton({ 
  userId, 
  assistantConfig = COUPLE_THERAPY_ASSISTANT_CONFIG as AssistantConfigType, 
  therapyType = 'couple',
  shouldAutoRestart = false
}: TherapyButtonProps) {
  // State management
  const [isLoading, setIsLoading] = useState(false)
  const [showDurationModal, setShowDurationModal] = useState(false)
  const [showFamilySelectionModal, setShowFamilySelectionModal] = useState(false)
  const [selectedSessionDuration, setSelectedSessionDuration] = useState<30 | 60>(60)
  const [familyMembers, setFamilyMembers] = useState<Array<{name: string, age: number, relation: string}>>([])
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<Array<{name: string, age: number, relation: string}>>([])
  const [isCallActive, setIsCallActive] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [transcriptChunks, setTranscriptChunks] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState<number>(0)
  const [isMuted, setIsMuted] = useState(false)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [sessionRecovered, setSessionRecovered] = useState(false)
  const [isEndingSession, setIsEndingSession] = useState(false)
  const [vapiCallStartTime, setVapiCallStartTime] = useState<Date | null>(null)
  const [vapiCallDuration, setVapiCallDuration] = useState(0)
  
  // 🚀 PAUSE FUNCTIONALITY: Track session pause state for billing optimization
  const [isSessionPaused, setIsSessionPaused] = useState(false)
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null)
  const [totalPausedTimeSeconds, setTotalPausedTimeSeconds] = useState(0)
  
  // Real-time metrics calculation state
  const [metricsCalculator, setMetricsCalculator] = useState<RealTimeMetricsCalculator | null>(null)
  const [currentMetrics, setCurrentMetrics] = useState<IncrementalMetrics | null>(null)
  
  // Conversation time tracking
  const [conversationTimeSeconds, setConversationTimeSeconds] = useState(0)
  const [conversationStartTime, setConversationStartTime] = useState<Date | null>(null)
  
  // Session creation guard to prevent duplicate sessions
  const sessionCreationInProgress = useRef(false)
  const autoRestartTriggered = useRef(false)
  const sessionCheckInProgress = useRef(false)
  const componentMounted = useRef(false)
  const currentSessionDuration = useRef<30 | 60>(60) // Track the actual session duration being used
  
  // Conversation deduplication to prevent processing same conversation-update multiple times
  const lastConversationHash = useRef<string | null>(null)
  const lastConversationSessionId = useRef<string | null>(null)
  
  // Unified transcript debouncing to prevent VAPI interruption from ALL fragments
  const [assistantBuffer, setAssistantBuffer] = useState<string>('')
  const assistantTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isProcessingAssistant, setIsProcessingAssistant] = useState(false)
  
  // User transcript debouncing for partial speech fragments
  const [userBuffer, setUserBuffer] = useState<string>('')
  const userTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isProcessingUser, setIsProcessingUser] = useState(false)
  
  const TRANSCRIPT_DEBOUNCE_MS = 1500 // Wait 1.5s for fragments to complete before processing
  
  // WebSocket client functions for real-time communication
  const sendMetricsUpdate = useCallback(async (userId: string, sessionId: string, metrics: IncrementalMetrics) => {
    // For now, send metrics via HTTP API as WebSocket is complex to set up correctly
    try {
      await fetch('/api/ws/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'metrics_update',
          userId,
          sessionId,
          metrics,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to send metrics update:', error);
    }
  }, []);

  const sendSessionUpdate = useCallback(async (userId: string, sessionId: string, status: string, data?: any) => {
    // For now, send session updates via HTTP API as WebSocket is complex to set up correctly
    try {
      await fetch('/api/ws/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'session_update',
          userId,
          sessionId,
          status,
          data,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to send session update:', error);
    }
  }, []);
  
  // Initialize metrics calculator when session starts
  const initializeMetricsCalculator = useCallback((sessionId: string, therapyType: string, userId: string, duration = 60) => {
    if (!metricsCalculator) {
      const calculator = new RealTimeMetricsCalculator({
        sessionId,
        therapyType: therapyType as 'couple' | 'family' | 'solo',
        sessionDurationMinutes: duration,
        userId
      });
      setMetricsCalculator(calculator);
      console.log(`📊 METRICS: Initialized calculator for ${therapyType} therapy session ${sessionId}`);
      return calculator;
    }
    return metricsCalculator;
  }, [metricsCalculator]);

  // Process consolidated assistant message after debouncing
  const processConsolidatedAssistantMessage = useCallback(async (consolidatedText: string, currentSessionId: string) => {
    if (!consolidatedText.trim() || isProcessingAssistant) return;
    
    setIsProcessingAssistant(true);
    
    try {
      console.log(`🎯 CONSOLIDATED ASSISTANT MESSAGE: ${consolidatedText.substring(0, 100)}... (${consolidatedText.length} chars)`);
      
      // Enhanced assistant message storage
      const storageKey = `transcript-${currentSessionId}`;
      let existingTranscripts = [];
      
      try {
        const stored = sessionStorage.getItem(storageKey);
        existingTranscripts = stored ? JSON.parse(stored) : [];
      } catch (parseError: unknown) {
        console.warn('Error parsing existing transcripts, starting fresh:', (parseError instanceof Error) ? parseError.message : String(parseError));
        existingTranscripts = [];
      }
      
      // Create enhanced assistant entry
      const assistantEntry = {
        speaker: 'assistant',
        text: consolidatedText.trim(),
        timestamp: new Date().toISOString(),
        isFinal: true,
        messageType: 'model-output-consolidated'
      };
      
      existingTranscripts.push(assistantEntry);
      
      // Save back to storage
      sessionStorage.setItem(storageKey, JSON.stringify(existingTranscripts));
      console.log(`✅ Saved consolidated assistant response to storage (${existingTranscripts.length} total entries)`);
      
      // Enhanced backup for assistant messages
      const backupKey = `assistant-${currentSessionId}-${Date.now()}`;
      sessionStorage.setItem(backupKey, JSON.stringify(assistantEntry));
      console.log(`✅ Saved assistant backup: ${backupKey}`);
      
      // Single UI update for complete thought
      setTranscriptChunks(prev => {
        const newChunks = [...prev, `THERAPIST: ${consolidatedText.trim()}`];
        console.log(`✅ Updated UI with consolidated assistant response (${newChunks.length} total)`);
        return newChunks;
      });
      
      // CRITICAL: Save assistant message to database - OPTIMIZED BATCHED VERSION
      try {
        const { addTranscriptEntry } = await import('@/lib/transcript-service-optimized');
        
        console.log(`🔄 BATCHED: Adding consolidated assistant response to queue...`);
        const result = await addTranscriptEntry({
          sessionId: currentSessionId,
          speaker: 'assistant',
          text: consolidatedText.trim(),
          timestamp: new Date().toISOString(),
          isFinal: true
        });
        
        console.log(`✅ CONSOLIDATED ASSISTANT QUEUED SUCCESS: Response queued with ID: ${result?.id || 'queued'}`);
        
        // 📊 REAL-TIME METRICS DISABLED - Will calculate after session ends
        // Phase 1 Fix: Removed real-time metrics to prevent VAPI interruptions
        // Metrics will be calculated in /api/sessions/[id]/complete for better accuracy
        console.log('📊 METRICS: Deferred until session completion for consolidated assistant message');
      } catch (dbError) {
        console.error(`❌ CONSOLIDATED ASSISTANT BATCHED SAVE FAILED:`, dbError);
        console.warn('Consolidated assistant response preserved in sessionStorage despite batch failure');
      }
    } catch (storageError: unknown) {
      console.error('💥 ERROR STORING CONSOLIDATED ASSISTANT RESPONSE:', (storageError instanceof Error) ? storageError.message : String(storageError));
    } finally {
      setIsProcessingAssistant(false);
    }
  }, [isProcessingAssistant]);

  // Consolidated user transcript processing with debouncing
  const processConsolidatedUserMessage = useCallback(async (consolidatedText: string, currentSessionId: string) => {
    if (!consolidatedText.trim() || isProcessingUser) return;
    
    setIsProcessingUser(true);
    
    try {
      console.log(`🎯 CONSOLIDATED USER MESSAGE: ${consolidatedText.substring(0, 100)}... (${consolidatedText.length} chars)`);
      
      // Single UI update for complete user thought
      setTranscriptChunks(prev => {
        const newChunks = [...prev, `USER: ${consolidatedText.trim()}`];
        return newChunks;
      });
      
      // Single database call for complete user message
      await addTranscriptEntry({
        sessionId: currentSessionId,
        speaker: 'user',
        text: consolidatedText.trim(),
        timestamp: new Date().toISOString(),
        isFinal: true
      });
      
      // Session storage for backup (reduced frequency)
      const storageKey = `transcript-${currentSessionId}`;
      try {
        const stored = sessionStorage.getItem(storageKey) || '[]';
        const existingTranscripts = JSON.parse(stored);
        existingTranscripts.push({
          speaker: 'user',
          text: consolidatedText.trim(),
          timestamp: new Date().toISOString(),
          isFinal: true,
          messageType: 'consolidated-user'
        });
        sessionStorage.setItem(storageKey, JSON.stringify(existingTranscripts));
        console.log(`✅ CONSOLIDATED USER: Saved to storage (${existingTranscripts.length} total entries)`);
      } catch (storageError) {
        console.warn('User transcript storage failed:', storageError);
      }
      
    } catch (error) {
      console.error('Error processing consolidated user message:', error);
    } finally {
      setIsProcessingUser(false);
    }
  }, [isProcessingUser]);
  
  // Calculate and broadcast incremental metrics
  const calculateAndBroadcastIncrementalMetrics = useCallback(async (sessionId: string, speaker: 'user' | 'assistant', text: string) => {
    try {
      // Ensure we have a metrics calculator
      let calculator = metricsCalculator;
      if (!calculator) {
        calculator = initializeMetricsCalculator(sessionId, therapyType, userId, currentSessionDuration.current);
      }
      
      if (!calculator) {
        console.warn('📊 METRICS: No calculator available for session', sessionId);
        return;
      }

      // Add transcript entry to metrics calculator
      const transcriptEntry = {
        speaker,
        text,
        timestamp: new Date().toISOString()
      };

      const metrics = calculator.addTranscriptEntry(transcriptEntry);
      setCurrentMetrics(metrics);
      
      // Only broadcast if metrics are confident enough or significant
      if (RealTimeMetricsCalculator.shouldTriggerUpdate(metrics)) {
        console.log(`📊 METRICS: Broadcasting update for session ${sessionId} - Confidence: ${metrics.confidence}%`);
        
        // Send metrics update via WebSocket client to server
        try {
          await sendMetricsUpdate(userId, sessionId, metrics);
        } catch (broadcastError) {
          console.error('Error broadcasting metrics update:', broadcastError);
        }
      } else {
        console.log(`📊 METRICS: Calculated but not broadcasting (confidence: ${metrics.confidence}%, entries: ${metrics.entryCount})`);
      }
      
    } catch (error) {
      console.error('Error in calculateAndBroadcastIncrementalMetrics:', error);
    }
  }, [metricsCalculator, initializeMetricsCalculator, therapyType, userId, sendMetricsUpdate]);
  
  // Get the sound context to control music playback
  const { stopMusicPlayback, setSessionActive } = useSoundContext()
  
  // Refs for performance optimization
  // Using ExtendedVapi type to handle custom properties
  const vapiInstanceRef = useRef<ExtendedVapi | null>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const analyser = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)

  // 🚀 SESSION RECOVERY: Restore session from sessionStorage backup
  const recoverSessionFromStorage = useCallback(() => {
    try {
      console.log('🔍 RECOVERY: Checking for session backups in sessionStorage...');
      
      // Get all session backup keys
      const backupKeys = Object.keys(sessionStorage).filter(key => 
        key.startsWith('session-') && key.includes('-backup-time')
      );
      
      if (backupKeys.length === 0) {
        console.log('📁 RECOVERY: No session backups found');
        return null;
      }
      
      // Find the most recent backup
      let mostRecentBackup = null;
      let mostRecentTime = 0;
      
      for (const key of backupKeys) {
        try {
          const backup = JSON.parse(sessionStorage.getItem(key) || '{}');
          const backupTime = new Date(backup.timestamp).getTime();
          
          if (backupTime > mostRecentTime) {
            mostRecentTime = backupTime;
            mostRecentBackup = { key, ...backup };
          }
        } catch (error) {
          console.warn(`Failed to parse backup ${key}:`, error);
        }
      }
      
      if (mostRecentBackup && mostRecentBackup.sessionId) {
        const timeSinceBackup = Date.now() - mostRecentTime;
        const minutesAgo = Math.floor(timeSinceBackup / 60000);
        
        console.log(`🎯 RECOVERY: Found session backup from ${minutesAgo} minutes ago:`, {
          sessionId: mostRecentBackup.sessionId,
          conversationTime: mostRecentBackup.conversationTimeSeconds,
          therapyType: mostRecentBackup.therapyType,
          isPaused: mostRecentBackup.isPaused
        });
        
        // Check if backup is recent enough (within 2 hours)
        if (timeSinceBackup < 2 * 60 * 60 * 1000) {
          // Try to restore transcript backup as well
          const transcriptKey = `session-${mostRecentBackup.sessionId}-transcript-backup`;
          const transcriptBackup = sessionStorage.getItem(transcriptKey);
          
          if (transcriptBackup) {
            try {
              const parsedTranscript = JSON.parse(transcriptBackup);
              console.log(`📝 RECOVERY: Found transcript backup with ${parsedTranscript.transcriptChunks?.length || 0} entries`);
              mostRecentBackup.transcriptChunks = parsedTranscript.transcriptChunks || [];
            } catch (error) {
              console.warn('Failed to parse transcript backup:', error);
            }
          }
          
          return mostRecentBackup;
        } else {
          console.log('⏰ RECOVERY: Backup is too old (>2 hours), ignoring');
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error during session recovery:', error);
      return null;
    }
  }, []);
  
  // 🚀 SESSION RECOVERY: Check for and offer session recovery on component mount
  useEffect(() => {
    const recoveredSession = recoverSessionFromStorage();
    if (recoveredSession && !isCallActive) {
      console.log('🔄 RECOVERY: Session recovery available - user can resume:', recoveredSession.sessionId);
      // Store recovery data for user decision
      sessionStorage.setItem('available-session-recovery', JSON.stringify(recoveredSession));
    }
  }, []); // Only run on mount
  
  // 🚀 PAUSE RECOVERY: Restore pause state from sessionStorage
  useEffect(() => {
    if (sessionId) {
      const pauseStateKey = `session-${sessionId}-pause-state`;
      const pauseState = sessionStorage.getItem(pauseStateKey);
      
      if (pauseState) {
        try {
          const parsed = JSON.parse(pauseState);
          if (parsed.pausedAt && !parsed.resumedAt) {
            // Session was paused and never resumed
            console.log('🔄 PAUSE RECOVERY: Restoring paused session state');
            setIsSessionPaused(true);
            setPauseStartTime(new Date(parsed.pausedAt));
            setTotalPausedTimeSeconds(parsed.totalPausedTimeSeconds || 0);
          } else if (parsed.totalPausedTimeSeconds) {
            // Session has pause history
            setTotalPausedTimeSeconds(parsed.totalPausedTimeSeconds);
          }
        } catch (error) {
          console.warn('Error parsing pause state:', error);
        }
      }
    }
  }, [sessionId]);

  const createVapiInstance = useCallback(async (userProfile?: any, currentSessionId?: string) => {
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
            }, {} as Record<string, string>)
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
        const errorMessage = initError instanceof Error ? initError.message : String(initError);
        throw new Error(`Failed to initialize Vapi: ${errorMessage}`);
      }
      
      // Store session ID in the Vapi instance for message handling
      const sessionIdToUse = currentSessionId || sessionId;
      if (vapiInstanceRef.current && sessionIdToUse) {
        (vapiInstanceRef.current as any)._sessionId = sessionIdToUse;
        console.log(`#### SETTING SESSION ID ${sessionIdToUse} FOR TRANSCRIPT RECORDING ####`);
        
        // Also store in sessionStorage for backup
        try {
          sessionStorage.setItem('current-session-id', sessionIdToUse);
          console.log(`Saved session ID to sessionStorage: ${sessionIdToUse}`);
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
        (vapiInstanceRef.current as any)._customData = {
          userName: userProfile.name || 'client',
          therapyType: therapyType
        };
      }
      
      
      // Set up event handlers
      vapiInstanceRef.current.on('call-start', async () => {
        console.log('✅ Vapi call started - call-start event fired');
        setIsCallActive(true);
        setIsLoading(false); // Stop loading animation when call actually starts
        setErrorMessage(null);
        
        // Track VAPI call start time for real-time timing
        const vapiStartTime = new Date();
        setVapiCallStartTime(vapiStartTime);
        setConversationStartTime(vapiStartTime);
        console.log('📞 VAPI Call timing started:', vapiStartTime.toISOString());
        
        // Update session with conversation start time (resume conversation timing)
        if (sessionId) {
          try {
            await fetch(`/api/sessions/${sessionId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lastConversationStart: vapiStartTime.toISOString(),
                isPaused: false
              })
            });
            console.log('📊 Session conversation timing resumed');
          } catch (error) {
            console.error('Error updating session conversation start:', error);
          }
        }
        
        // Initialize metrics calculator and broadcast session start
        if (sessionId) {
          const effectiveDuration = currentSessionDuration.current;
          initializeMetricsCalculator(sessionId, therapyType, userId, effectiveDuration);
          await broadcastSessionStatus(sessionId, 'active', {
            therapyType,
            duration: effectiveDuration,
            startTime: vapiStartTime.toISOString()
          });
        }
        
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
              const { addTranscriptEntry, getPreviousSessionsTranscript } = await import('@/lib/transcript-service-optimized');
              
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
      vapiInstanceRef.current.on('call-end', async function(event?: any) {
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
        
        // Calculate VAPI call duration and update session conversation time
        let vapiDurationSeconds = 0;
        if (vapiCallStartTime) {
          const vapiEndTime = new Date();
          const vapiDurationMs = vapiEndTime.getTime() - vapiCallStartTime.getTime();
          vapiDurationSeconds = Math.floor(vapiDurationMs / 1000);
          setVapiCallDuration(vapiDurationSeconds);
          console.log(`📞 VAPI Call duration: ${Math.round(vapiDurationSeconds / 60)} minutes (${vapiDurationSeconds} seconds)`);
          
          // Update local conversation time state and session database
          setConversationTimeSeconds(prev => prev + vapiDurationSeconds);
          setConversationStartTime(null);
          
          if (sessionId) {
            try {
              await fetch(`/api/sessions/${sessionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  conversationTimeSeconds: `ADD_${vapiDurationSeconds}`, // Special instruction to add to existing time
                  isPaused: true,
                  lastConversationStart: null
                })
              });
              console.log(`📊 Session conversation time updated: +${vapiDurationSeconds} seconds`);
            } catch (error) {
              console.error('Error updating session conversation time:', error);
            }
          }
        }
        
        // Show a user-friendly message about the call ending
        if (reason && reason !== "NORMAL" && reason !== "No reason provided") {
          setErrorMessage(`Session ended: ${reason}. This may be a temporary issue with the voice service.`);
        } else {
          // Clear error messages for normal endings
          setErrorMessage(null);
        }
        
        if (sessionId) {
          // Broadcast session end to dashboard
          await broadcastSessionStatus(sessionId, 'completed', {
            endTime: new Date().toISOString(),
            duration: vapiDurationSeconds || 0,
            reason: reason !== 'No reason provided' ? reason : 'normal'
          });
          
          // Cleanup metrics calculator
          if (metricsCalculator) {
            metricsCalculator.cleanupSession();
            setMetricsCalculator(null);
            setCurrentMetrics(null);
          }
          
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
      
      
      // 🎯 COMPREHENSIVE MESSAGE HANDLER - CATCHES ALL VAPI MESSAGE TYPES
      vapiInstanceRef.current.on('message', async (message: VapiMessage) => {
        try {
          // 🔍 MINIMAL DEBUG LOGGING - Reduced verbose logging for performance
          const messageRole = isTranscriptMessage(message) || isModelOutputMessage(message) ? message.role : undefined;
          console.log(`📨 VAPI MSG: ${message.type}${messageRole ? ` (${messageRole})` : ''}`);
          
          // 🚫 CONVERSATION-UPDATE DEDUPLICATION - Prevent processing duplicate conversation states
          if (isConversationUpdateMessage(message)) {
            try {
              // Create hash of conversation content to detect duplicates
              const conversationContent = JSON.stringify(message.conversation || []);
              // Use a safer hash that handles Unicode characters
              const conversationHash = btoa(encodeURIComponent(conversationContent)).substring(0, 32);
              
              // Handle session ID changes with session recovery awareness
              if (lastConversationSessionId.current !== sessionId) {
                let shouldResetHash = true;
                
                // Only check for recovery if we have a valid sessionId
                if (sessionId) {
                  try {
                    const recoveryData = sessionStorage.getItem('session-recovered');
                    if (recoveryData) {
                      const parsed = JSON.parse(recoveryData);
                      // Validate the recovery data structure and ensure sessionId matches
                      const isSessionRecovery = parsed && 
                                               typeof parsed.sessionId === 'string' && 
                                               parsed.sessionId === sessionId;
                      
                      if (isSessionRecovery) {
                        // Try to restore conversation hash from sessionStorage
                        const storedHash = sessionStorage.getItem(`conversation-hash-${sessionId}`);
                        if (storedHash) {
                          lastConversationHash.current = storedHash;
                          shouldResetHash = false;
                          console.log(`🔄 RESTORED conversation hash for recovered session: ${sessionId} (hash: ${storedHash})`);
                        } else {
                          console.log(`🔄 NO STORED HASH for recovered session: ${sessionId} - will reset`);
                        }
                      }
                    }
                  } catch (storageError) {
                    console.warn('Error accessing session recovery data:', storageError);
                  }
                }
                
                if (shouldResetHash) {
                  lastConversationHash.current = null;
                  console.log(`🔄 RESET conversation hash for ${sessionId ? 'new session' : 'null session'}: ${sessionId}`);
                }
                
                lastConversationSessionId.current = sessionId;
              }
              
              // Deduplication logic
              if (lastConversationHash.current === conversationHash) {
                console.log(`⏭️ SKIPPING DUPLICATE conversation-update (hash: ${conversationHash})`);
                return; // Skip processing this duplicate
              }
              
              // Update hash and persist for future recovery
              lastConversationHash.current = conversationHash;
              if (sessionId) {
                try {
                  sessionStorage.setItem(`conversation-hash-${sessionId}`, conversationHash);
                } catch (storageError) {
                  console.warn('Error storing conversation hash:', storageError);
                }
              }
              console.log(`✅ PROCESSING NEW conversation-update (hash: ${conversationHash})`);
              
            } catch (hashError) {
              console.warn('Error in conversation deduplication, processing anyway:', hashError);
            }
          }
          
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
            console.error('⚠️ CRITICAL: Processing transcript without session ID - transcripts will NOT be saved to database!');
            console.log('Available session references:', {
              sessionId,
              vapiSessionId: (vapiInstanceRef.current as any)?._sessionId,
              storageSessionId: sessionStorage.getItem('current-session-id')
            });
            
            // Try to recover session ID from alternative sources
            const recoveredSessionId = sessionId || 
                                     (vapiInstanceRef.current as any)?._sessionId || 
                                     sessionStorage.getItem('current-session-id');
            
            if (recoveredSessionId) {
              console.log(`✓ RECOVERED SESSION ID: ${recoveredSessionId}`);
              setSessionId(recoveredSessionId);
              // Continue with normal processing using recovered ID
              currentSessionId = recoveredSessionId;
            } else {
              console.error('💥 FATAL: Cannot recover session ID - creating emergency session');
              
              // Add this transcript to UI state at minimum
              const text = isTranscriptMessage(message) ? message.transcript : 
                          isModelOutputMessage(message) ? message.output : 
                          (message as any).content || (message as any).text || '';
              const speaker = (isTranscriptMessage(message) || isModelOutputMessage(message)) ? message.role : 'user';
              
              if (text && text.trim() !== '') {
                const displaySpeaker = speaker === 'assistant' ? 'THERAPIST' : 'USER';
                setTranscriptChunks(prev => [...prev, `${displaySpeaker}: ${text}`]);
                console.log(`Added to transcript chunks: ${displaySpeaker}: ${text.substring(0, 50)}...`);
                
                // Try to create an emergency session to save this transcript
                try {
                  const emergencyResponse = await fetch('/api/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      date: new Date().toISOString(),
                      duration: 30,
                      theme: 'Emergency Recovery Session',
                      status: 'active'
                    })
                  });
                  
                  if (emergencyResponse.ok) {
                    const emergencySession = await emergencyResponse.json();
                    console.log(`✓ CREATED EMERGENCY SESSION: ${emergencySession.id}`);
                    setSessionId(emergencySession.id);
                    sessionStorage.setItem('current-session-id', emergencySession.id);
                    currentSessionId = emergencySession.id;
                    // Continue with normal processing
                  } else {
                    console.error('Failed to create emergency session');
                    return; // Give up on database storage
                  }
                } catch (emergencyError) {
                  console.error('Error creating emergency session:', emergencyError);
                  return; // Give up on database storage
                }
              } else {
                return; // No valid text to process
              }
            }
          }
          
          // 🔧 FUNCTION CALL HANDLING - USER-INITIATED SESSION ENDING
          if (isFunctionCallMessage(message) && message.functionCall?.name === 'end_therapy_session') {
            console.log('🔚 FUNCTION CALL: User requested to end therapy session');
            console.log('Function call details:', JSON.stringify(message.functionCall, null, 2));
            
            // Extract reason and goodbye message from function parameters
            const reason = message.functionCall.parameters?.reason || 'user_requested';
            const goodbyeMessage = message.functionCall.parameters?.goodbye_message || '';
            
            console.log(`Session ending reason: ${reason}`);
            if (goodbyeMessage) {
              console.log(`Goodbye message: ${goodbyeMessage}`);
              
              // Add the goodbye message to the transcript
              try {
                const { addTranscriptEntry } = await import('@/lib/transcript-service-optimized');
                await addTranscriptEntry({
                  sessionId: currentSessionId,
                  speaker: 'assistant',
                  text: goodbyeMessage,
                  timestamp: new Date().toISOString(),
                  isFinal: true
                });
                
                // Update UI with goodbye message
                setTranscriptChunks(prev => [...prev, `THERAPIST: ${goodbyeMessage}`]);
                console.log('✅ Added goodbye message to transcript');
              } catch (error) {
                console.error('Error adding goodbye message to transcript:', error);
              }
            }
            
            // Set ending session state for UI feedback
            setIsEndingSession(true);
            
            // Add a brief delay to let the goodbye message be heard, then end the session
            setTimeout(() => {
              console.log('🔚 Ending therapy session due to user request');
              endTherapySession();
            }, goodbyeMessage ? 3000 : 1000); // 3 seconds if there's a goodbye message, 1 second otherwise
            
            return; // Don't process as transcript
          }
          
          // 🚀 ENHANCED TRANSCRIPT HANDLING - FIXED FOR COMPLETENESS AND ASSISTANT CAPTURE
          // Critical: Only save FINAL transcripts to prevent fragmented sentences
          if (isTranscriptMessage(message)) {
            const text = message.transcript;
            const isFinal = message.transcriptType === 'final';
            
            if (!text || text.trim() === '') {
              console.log('⏭️ Skipping empty transcript message');
              return;
            }
            
            // 🔥 CRITICAL FIX: Intelligent speaker detection instead of defaulting to 'user'
            let speaker = message.role || (message as any).speaker || null;
            
            // If no speaker specified, use content analysis to determine speaker
            if (!speaker) {
              // Enhanced speaker detection with more precise patterns
              const isLikelyAssistant = 
                // Strong AI indicators - therapeutic language patterns
                /\b(I understand|let me|tell me more|how does that make you feel|what I hear|it sounds like|have you considered|that's interesting|I'd like to explore|from what you're sharing)\b/i.test(text) ||
                // Professional/therapeutic language  
                /\b(therapy|therapeutic|counseling|session|feelings|emotions|relationship|communication)\b/i.test(text) ||
                // AI-initiated conversation patterns
                /\b(good morning|good afternoon|good evening|thank you for|I appreciate|what would you like|let's talk about|that sounds|I hear that|it seems like)\b/i.test(text) ||
                // Therapist-specific question patterns (more precise)
                /\b(can you tell me|could you share|would you mind|have you ever considered|do you think that|are you feeling|what comes to mind when)\b/i.test(text) ||
                // Professional acknowledgment responses
                /\b(I see|I notice|that makes sense|absolutely|of course|certainly|indeed|exactly|precisely)\b/i.test(text) ||
                // Length-based detection (longer responses are usually AI)
                text.length > 100 ||
                // Professional language patterns
                /\b(wonderful|excellent|fantastic|that's understandable|that's valid|I can hear that)\b/i.test(text)
              
              speaker = isLikelyAssistant ? 'assistant' : 'user';
              console.log(`🤖 SPEAKER DETECTION: Determined speaker as '${speaker}' for text: "${text.substring(0, 60)}..." (length: ${text.length})`);
            }
            
            // 🚀 PHASE 2: UNIFIED DEBOUNCING FOR ALL TRANSCRIPT PROCESSING
            
            // USER TRANSCRIPT DEBOUNCING: Consolidate fragments to prevent interruption
            if (speaker === 'user') {
              console.log(`📝 USER TRANSCRIPT FRAGMENT: "${text}" (isFinal: ${isFinal}, buffering...)`);
              
              // Add fragment to user buffer
              setUserBuffer(prev => prev + (prev ? ' ' : '') + text);
              
              // Clear existing timeout
              if (userTimeoutRef.current) {
                clearTimeout(userTimeoutRef.current);
              }
              
              // Set new timeout to process consolidated buffer
              userTimeoutRef.current = setTimeout(() => {
                setUserBuffer(currentBuffer => {
                  if (currentBuffer.trim()) {
                    processConsolidatedUserMessage(currentBuffer, currentSessionId);
                  }
                  return ''; // Clear buffer
                });
              }, TRANSCRIPT_DEBOUNCE_MS);
              
              return; // Don't process immediately - wait for debounce
            }
            
            // ASSISTANT TRANSCRIPT DEBOUNCING: Handle assistant messages not already caught by model-output
            if (speaker === 'assistant') {
              console.log(`📝 ASSISTANT TRANSCRIPT: "${text}" (processing via existing assistant debouncing)`);
              
              // Add to assistant buffer (will be processed by existing debouncing)
              setAssistantBuffer(prev => prev + (prev ? ' ' : '') + text);
              
              // Clear existing timeout
              if (assistantTimeoutRef.current) {
                clearTimeout(assistantTimeoutRef.current);
              }
              
              // Set new timeout to process consolidated buffer
              assistantTimeoutRef.current = setTimeout(() => {
                setAssistantBuffer(currentBuffer => {
                  if (currentBuffer.trim()) {
                    processConsolidatedAssistantMessage(currentBuffer, currentSessionId);
                  }
                  return ''; // Clear buffer
                });
              }, TRANSCRIPT_DEBOUNCE_MS);
              
              return; // Don't process immediately - wait for debounce
            }
            
            // 🚨 FALLBACK: This code should not be reached due to debouncing above
            // All user and assistant messages are now handled by unified debouncing
            console.warn(`⚠️ UNEXPECTED: Transcript message reached fallback handler - speaker: ${speaker}, text: "${text.substring(0, 50)}...", type: ${message.type}`);
            console.warn('This suggests the debouncing logic above may need adjustment.');
          }
          // 🤖 ENHANCED ASSISTANT MESSAGE CAPTURE - DEBOUNCED TO PREVENT VAPI INTERRUPTION
          else if (isModelOutputMessage(message)) {
            // MODEL-OUTPUT DEBOUNCING: Consolidate fragments to prevent interruption
            const text = message.output || '';
            
            if (!text || text.trim() === '') {
              console.log('⏭️ Skipping empty model-output fragment');
              return;
            }
            
            console.log(`📝 MODEL OUTPUT FRAGMENT: "${text}" (buffering...)`);
            
            // Add fragment to buffer
            setAssistantBuffer(prev => prev + text);
            
            // Clear existing timeout
            if (assistantTimeoutRef.current) {
              clearTimeout(assistantTimeoutRef.current);
            }
            
            // Set new timeout to process consolidated buffer
            assistantTimeoutRef.current = setTimeout(() => {
              // Access current buffer value via callback
              setAssistantBuffer(currentBuffer => {
                if (currentBuffer.trim()) {
                  processConsolidatedAssistantMessage(currentBuffer, currentSessionId);
                }
                return ''; // Clear buffer
              });
            }, TRANSCRIPT_DEBOUNCE_MS);
            
            return; // Don't process immediately - wait for debounce
          }
          // 🤖 LEGACY ASSISTANT MESSAGE CAPTURE - FOR NON-MODEL-OUTPUT MESSAGES
          else if (
            isSpeechUpdateMessage(message) ||  // Speech processing
            // Check for custom message types that might not be in our union
            ((message as any).type === 'assistant-request') ||  // Assistant API calls
            ((message as any).type === 'voice-input') ||  // Voice input processing
            ((message as any).type === 'transcript-response') || 
            ((message as any).type === 'assistant-response') ||
            ('role' in message && (message as any).role === 'assistant') ||
            ('speaker' in message && (message as any).speaker === 'assistant') ||
            ('from' in message && (message as any).from === 'assistant') ||
            // Legacy patterns for backward compatibility
            ((message as any).type === 'message' && 'role' in message && (message as any).role === 'assistant')
          ) {
            // Enhanced text extraction for different message types
            let text = '';
            // Extract text from various message formats
            text = (message as any).transcript || (message as any).content || (message as any).text || (message as any).message || '';
            
            if (!text || text.trim() === '') {
              console.log('⏭️ Skipping empty assistant message');
              return;
            }
            
            console.log(`🤖 LEGACY ASSISTANT MESSAGE CAPTURED: ${text.substring(0, 100)}... (type: ${message.type})`);
            
            // 🚀 PHASE 2: DEBOUNCE LEGACY ASSISTANT MESSAGES TOO
            console.log(`📝 LEGACY ASSISTANT FRAGMENT: "${text}" (buffering for debounced processing...)`);
            
            // Add to assistant buffer (will be processed by existing debouncing)
            setAssistantBuffer(prev => prev + (prev ? ' ' : '') + text);
            
            // Clear existing timeout
            if (assistantTimeoutRef.current) {
              clearTimeout(assistantTimeoutRef.current);
            }
            
            // Set new timeout to process consolidated buffer
            assistantTimeoutRef.current = setTimeout(() => {
              setAssistantBuffer(currentBuffer => {
                if (currentBuffer.trim()) {
                  processConsolidatedAssistantMessage(currentBuffer, currentSessionId);
                }
                return ''; // Clear buffer
              });
            }, TRANSCRIPT_DEBOUNCE_MS);
          }
          // 🚨 CATCH-ALL HANDLER - Captures any messages we might have missed
          else {
            // Check if this message contains text content that might be an assistant response
            const potentialText = (message as any).transcript || (message as any).content || (message as any).text || (message as any).message || '';
            
            if (potentialText && potentialText.trim() !== '' && potentialText.length > 10) {
              console.log(`🔍 UNKNOWN MESSAGE TYPE with content: type="${message.type}", role="${(message as any).role}", content="${potentialText.substring(0, 100)}..."`);
              
              // If this looks like it could be an assistant message, log it for analysis
              if ((message as any).role === 'assistant' || 
                  (message as any).speaker === 'assistant' || 
                  (message as any).from === 'assistant' ||
                  message.type?.includes('assistant') ||
                  message.type?.includes('response') ||
                  message.type?.includes('model')) {
                console.log(`🚨 POTENTIAL MISSED ASSISTANT MESSAGE: ${JSON.stringify(message, null, 2)}`);
                
                // Try to save it as an assistant message
                try {
                  const storageKey = `transcript-${currentSessionId}`;
                  let existingTranscripts = [];
                  
                  try {
                    const stored = sessionStorage.getItem(storageKey);
                    existingTranscripts = stored ? JSON.parse(stored) : [];
                  } catch (parseError) {
                    existingTranscripts = [];
                  }
                  
                  const catchAllEntry = {
                    speaker: 'assistant',
                    text: potentialText.trim(),
                    timestamp: new Date().toISOString(),
                    isFinal: true,
                    messageType: `CATCH_ALL_${message.type}`
                  };
                  
                  existingTranscripts.push(catchAllEntry);
                  sessionStorage.setItem(storageKey, JSON.stringify(existingTranscripts));
                  
                  console.log(`🆘 CATCH-ALL SAVE: Saved potential assistant message to storage`);
                  
                  // Update UI
                  setTranscriptChunks(prev => [...prev, `THERAPIST: ${potentialText.trim()}`]);
                  
                  // Try to save to database - OPTIMIZED BATCHED VERSION
                  const { addTranscriptEntry } = await import('@/lib/transcript-service-optimized');
                  await addTranscriptEntry({
                    sessionId: currentSessionId,
                    speaker: 'assistant',
                    text: potentialText.trim(),
                    timestamp: new Date().toISOString(),
                    isFinal: true
                  });
                  
                  console.log(`🆘 CATCH-ALL BATCHED SAVE: Queued unknown assistant message`);
                  
                  // 📊 REAL-TIME METRICS CALCULATION - DEBOUNCED
                  try {
                    await calculateAndBroadcastIncrementalMetrics(currentSessionId, 'assistant', potentialText.trim());
                  } catch (metricsError) {
                    console.error('Error calculating incremental metrics for catch-all:', metricsError);
                  }
                } catch (catchAllError) {
                  console.error('Error in catch-all handler:', catchAllError);
                }
              }
            } else {
              console.log(`📤 Ignoring message type "${message.type}" - no relevant content`);
            }
          }
        } catch (error) {
          console.error('💥 Error handling transcript message:', error);
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
  
  // Cleanup metrics calculator function
  const cleanupMetricsCalculator = useCallback(() => {
    try {
      if (metricsCalculator) {
        console.log('🧹 Cleaning up metrics calculator for session');
        metricsCalculator.cleanupSession();
        setMetricsCalculator(null);
        setCurrentMetrics(null);
        console.log('✅ Metrics calculator cleanup complete');
      }
    } catch (error) {
      console.error('Error during metrics calculator cleanup:', error);
    }
  }, [metricsCalculator, setMetricsCalculator, setCurrentMetrics])
  
  // Create Vapi instance - MOVED HERE TO FIX HOISTING ISSUE
  // Start therapy session with specific therapy type override - for session recovery
  const startTherapySessionWithType = useCallback(async (existingSessionId?: string, selectedDuration?: 30 | 60, selectedMembers?: Array<{name: string, age: number, relation: string}>, overrideTherapyType?: string) => {
    const effectiveTherapyType = overrideTherapyType || therapyType;
    console.log(`🎯 startTherapySessionWithType called with therapyType: ${effectiveTherapyType} (override: ${overrideTherapyType}, original: ${therapyType})`);
    
    // Prevent duplicate session creation
    if (sessionCreationInProgress.current) {
      console.log('⚠️ SESSION CREATION GUARD: Session creation already in progress, skipping duplicate attempt');
      return;
    }
    
    sessionCreationInProgress.current = true;
    
    // Use provided session ID or fallback to component state
    const currentSessionId = existingSessionId || sessionId;
    console.log('⚙️ SESSION CREATION GUARD: Starting therapy session initialization...');
    console.log(`📋 SESSION STATE: existingSessionId=${existingSessionId}, sessionId=${sessionId}, userId=${userId}, therapyType=${effectiveTherapyType}`);
    
    try {
      setErrorMessage(null)
      setIsLoading(true)
      
      // Store a session flag in window object to ensure we don't accidentally clean up
      if (typeof window !== 'undefined') {
        (window as any).__therapySessionActive = true;
        console.log('Setting session active flag in window object');
      }
      
      // Verify the session-active class is present (double check as this is critical for visuals)
      if (!document.body.classList.contains('session-active')) {
        console.warn('session-active class missing from document.body - adding it');
        document.body.classList.add('session-active');
      }
      
      // Not setting isCallActive or setSessionActive here as it's already done in the button click handler
      
      // Store session start time for duration calculation
      const sessionStartTime = new Date();
      setSessionStartTime(sessionStartTime); // Set in state for timer component
      // Store in sessionStorage for recovery on browser refresh
      try {
        sessionStorage.setItem('session-start-time', sessionStartTime.toISOString());
        sessionStorage.setItem(`session-${sessionId}-start-time`, sessionStartTime.toISOString());
        console.log('Saved session start time:', sessionStartTime.toISOString());
        
        // Also store session ID for recovery
        sessionStorage.setItem('active-session-id', sessionId || '');
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
        
        if ((profileResponse as Response).ok) {
          userProfile = await (profileResponse as Response).json();
          console.log('✅ Got user profile quickly');
        }
      } catch (err) {
        console.warn('⚠️ Using default experience - profile load failed or timed out:', err);
      }
      
      // Start audio setup in background (don't wait for it)
      setupAudioAnalyzer().catch(err => {
        console.warn('Audio setup failed, continuing anyway:', err);
      });
      
      // Check if we already have a session ID (avoid duplicate creation)
      // But only if it's a valid active session
      let shouldCreateNewSession = true;
      
      if (currentSessionId) {
        // Check if the existing session is still active/valid
        try {
          const sessionCheckResponse = await fetch(`/api/sessions/${currentSessionId}`);
          if (sessionCheckResponse.ok) {
            const existingSession = await sessionCheckResponse.json();
            if (existingSession && existingSession.status === 'active') {
              console.log(`ℹ️ SESSION CREATION SKIP: Valid active session exists with ID: ${currentSessionId}, skipping creation`);
              currentSessionDuration.current = existingSession.duration; // Use existing session's duration
              shouldCreateNewSession = false;
              // Update component state if we have an existing session ID
              if (existingSessionId && existingSessionId !== sessionId) {
                setSessionId(existingSessionId);
              }
            } else {
              console.log(`🔄 EXPIRED SESSION CLEANUP: Session ${currentSessionId} is ${existingSession?.status || 'invalid'}, will create new session`);
              // Clear the expired session ID from state
              setSessionId(null);
            }
          } else {
            console.log(`🔄 INVALID SESSION CLEANUP: Session ${currentSessionId} not found, will create new session`);
            // Clear the invalid session ID from state
            setSessionId(null);
          }
        } catch (error) {
          console.error(`❌ SESSION CHECK ERROR: Failed to validate session ${currentSessionId}, will create new session:`, error);
          // Clear the problematic session ID from state
          setSessionId(null);
        }
      }
      
      if (shouldCreateNewSession) {
        // ULTRA-FAST MODE: Create minimal session record
        const effectiveSessionDuration = selectedDuration || currentSessionDuration.current;
        currentSessionDuration.current = effectiveSessionDuration; // Store for use by timer and metrics
        console.log(`⚡ SESSION CREATION START: Creating minimal session record for faster startup - Duration: ${effectiveSessionDuration} minutes`);
        console.log(`📊 SESSION DURATION TRACKING: effectiveSessionDuration = ${effectiveSessionDuration}`);
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime: sessionStartTime.toISOString(),
          date: sessionStartTime.toISOString(),
          status: 'active',
          duration: effectiveSessionDuration,
          theme: `${therapyType.charAt(0).toUpperCase() + therapyType.slice(1)} Therapy (${effectiveSessionDuration} min)`,
          notes: `Session started - ${effectiveSessionDuration} minute session`,
          assistantId: assistantConfig.id || '',
          // Minimal context to avoid bloated payloads
          context: userProfile?.name ? { userName: userProfile.name, therapyType, sessionDuration: effectiveSessionDuration } : { therapyType, sessionDuration: effectiveSessionDuration }
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
        console.log('✅ Session created successfully:', session)
        console.log(`📊 SESSION DURATION VERIFICATION: Created session has duration = ${session.duration} minutes (expected: ${effectiveSessionDuration})`)
        
        if (!session.id) {
          throw new Error('Session created but no ID returned')
        }
        
        setSessionId(session.id)
        
        // Store session ID in sessionStorage for reliable access
        sessionStorage.setItem('current-session-id', session.id)
        console.log(`💾 Session ID stored in sessionStorage: ${session.id}`)
        
        // Set session ID on Vapi instance if it exists
        if (vapiInstanceRef.current) {
          (vapiInstanceRef.current as any)._sessionId = session.id
          console.log(`💾 Session ID set on Vapi instance: ${session.id}`)
        }
      } catch (parseError) {
        console.error('Error parsing session response:', parseError)
        throw new Error('Failed to parse session data')
      }
      
        // ULTRA-FAST MODE: Skip expensive session history processing
        console.log('⚡ ULTRA-FAST MODE: Skipping session history processing for faster startup');
      }
      
      // Initialize Vapi immediately with minimal profile (common for both new and existing sessions)
      // Pass the current session ID to ensure transcript processing works
      const currentSessionIdForVapi = sessionId || sessionStorage.getItem('current-session-id') || undefined;
      const initialized = await createVapiInstance(userProfile, currentSessionIdForVapi);
      if (!initialized) {
        throw new Error('Failed to initialize Vapi')
      }
      
      // ULTRA-FAST MODE: Skip complex network monitoring to reduce overhead
      console.log('⚡ ULTRA-FAST MODE: Skipping network monitoring for faster startup');
      
      // Explicitly set the session ID on the Vapi instance for transcript recording
      if (vapiInstanceRef.current && currentSessionId) {
        (vapiInstanceRef.current as any)._sessionId = currentSessionId;
        console.log(`#### SETTING SESSION ID ${currentSessionId} FOR TRANSCRIPT RECORDING ####`);
        
        // Also store in sessionStorage for backup
        try {
          sessionStorage.setItem('current-session-id', currentSessionId);
          console.log(`Saved session ID to sessionStorage: ${currentSessionId}`);
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
        therapyType: effectiveTherapyType
      }));
      
      // Check for assistantId based on therapy type
      if (effectiveTherapyType === 'couple') {
        assistantId = process.env.NEXT_PUBLIC_VAPI_COUPLE_ASSISTANT_ID;
        console.log('Using couple therapy assistant ID:', assistantId);
      } else if (effectiveTherapyType === 'solo') {
        assistantId = process.env.NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID;
        console.log('Using solo therapy assistant ID:', assistantId);
      } else if (effectiveTherapyType === 'family') {
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
      
      console.log(`Starting ${effectiveTherapyType} therapy session with assistant: ${assistantConfig?.name || 'Unknown'} (ID: ${assistantId})`);
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
        console.log('Therapy type:', effectiveTherapyType);
        
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
          // Fetch personalized assistant configuration from API with session timing
          console.log('Fetching personalized assistant configuration with session timing...');
          const sessionDuration = selectedDuration || currentSessionDuration.current; // Use passed duration or fallback to ref
          console.log(`🕒 DURATION DEBUG: selectedDuration=${selectedDuration}, currentSessionDuration.current=${currentSessionDuration.current}, final sessionDuration=${sessionDuration}`);
          const startTimeISO = sessionStartTime.toISOString();
          
          // Build URL with selected family members for family therapy
          let configUrl = `/api/vapi/assistant?personalized=true&therapyType=${effectiveTherapyType}&duration=${sessionDuration}&startTime=${encodeURIComponent(startTimeISO)}`;
          
          // Add selected family members to the request for family therapy
          if (effectiveTherapyType === 'family' && selectedMembers && selectedMembers.length > 0) {
            const familyMembersParam = encodeURIComponent(JSON.stringify(selectedMembers));
            configUrl += `&selectedFamilyMembers=${familyMembersParam}`;
            console.log('Adding selected family members to configuration:', selectedMembers);
          }
          
          const configResponse = await fetch(configUrl);
          
          if (!configResponse.ok) {
            throw new Error('Failed to fetch personalized configuration');
          }
          
          const personalizedConfig = await configResponse.json();
          console.log('✅ Received personalized configuration with enhanced settings and session timing:', {
            duration: sessionDuration,
            maxDurationSeconds: personalizedConfig.maxDurationSeconds
          });
          
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
              // Now start with personalized firstMessage, variable values, and session timing
              const minimalOverrides = {
                firstMessage: personalizedConfig.firstMessage, // Always include personalized intro
                maxDurationSeconds: personalizedConfig.maxDurationSeconds, // Session timeout
                variableValues: {
                  userName: personalizedConfig.variableValues?.userName || userProfile?.name || 'there',
                  partnerName: personalizedConfig.variableValues?.partnerName || userProfile?.partnerName || '',
                  therapyType: therapyType,
                  ...personalizedConfig.variableValues // Include all session timing variables
                }
              };
              await vapiInstanceRef.current.start(assistantId, minimalOverrides);
              console.log('✅ Session started with server-configured assistant and personalized intro');
              return; // Exit early on success
            }
          } catch (serverConfigError) {
            console.warn('Server-side configuration failed, falling back to client-side:', serverConfigError);
          }
          
          // Option 2: Fall back to client-side configuration
          console.log('Attempting client-side assistant configuration...');
          await vapiInstanceRef.current.start(assistantId, personalizedConfig);
          console.log('✅ Session started with client-side personalized configuration');
          
        } catch (personalizedError) {
          console.warn('Personalized configuration failed, using basic assistant:', personalizedError);
          
          // Option 3: Final fallback to basic assistant start
          await vapiInstanceRef.current.start(assistantId);
          console.log('⚠️ Session started with basic assistant (no personalization)');
        }
        
      } catch (sessionError) {
        console.error('Failed to start enhanced session:', sessionError);
        throw sessionError;
      }
      
      console.log('⭐ Therapy session started successfully!');
    } catch (error) {
      console.error('Error starting therapy session:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start session');
      
      // Cleanup on error
      if (typeof window !== 'undefined') {
        (window as any).__therapySessionActive = false;
      }
      document.body.classList.remove('session-active');
      setSessionActive(false);
    } finally {
      setIsLoading(false);
      sessionCreationInProgress.current = false;
    }
  }, [userId, createVapiInstance, sessionId, assistantConfig, stopMusicPlayback, setSessionActive, therapyType])

  // Wrapper function that uses the current therapyType prop as default
  const startTherapySession = useCallback(async (existingSessionId?: string, selectedDuration?: 30 | 60, selectedMembers?: Array<{name: string, age: number, relation: string}>) => {
    return startTherapySessionWithType(existingSessionId, selectedDuration, selectedMembers, therapyType);
  }, [startTherapySessionWithType, therapyType]);

  const audioTrackRef = useRef<MediaStreamTrack | null>(null) // Reference to audio track for muting
  
  // Check for existing session and recover timer state
  const checkForActiveSession = useCallback(async () => {
    // Prevent concurrent session checks
    if (sessionCheckInProgress.current) {
      console.log('⚠️ SESSION CHECK GUARD: Session check already in progress, skipping duplicate attempt');
      return;
    }
    
    sessionCheckInProgress.current = true;
    console.log('🔍 SESSION CHECK GUARD: Starting active session check...');
    
    try {
      console.log('Checking for active sessions for user:', userId);
      const response = await fetch(`/api/sessions/active?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        if (data && data.id) {
          setSessionId(data.id)
          console.log('Found existing session:', data.id)
          
          // Use the prop from therapy page to determine if we should auto-restart
          const shouldPerformAutoRestart = shouldAutoRestart && data.startTime
          
          // Recover session timing data if available
          if (data.startTime && data.duration) {
            const sessionStart = new Date(data.startTime);
            const sessionDuration = data.duration;
            const now = new Date();
            const elapsedMs = now.getTime() - sessionStart.getTime();
            const elapsedMinutes = Math.floor(elapsedMs / 60000);
            
            // Check if session is still valid using conversation time, not wall clock
            const conversationTimeSeconds = data.conversationTimeSeconds || 0;
            const conversationTimeMinutes = Math.floor(conversationTimeSeconds / 60);
            const remainingMinutes = sessionDuration - conversationTimeMinutes;
            
            // Only recover if session still has conversation time remaining  
            if (remainingMinutes > 0) {
              console.log(`📚 RECOVERING SESSION: ${conversationTimeMinutes} conversation minutes used, ${remainingMinutes} minutes remaining`);
              
              // Restore timer state
              setSessionStartTime(sessionStart);
              setSelectedSessionDuration(sessionDuration as 30 | 60);
              setSessionRecovered(true);
              
              // Restore conversation time if available, checking backup first
              let restoredConversationTime = data.conversationTimeSeconds || 0;
              
              // Check for backup time data from beforeunload saves
              const backupTimeKey = `session-${data.id}-backup-time`;
              const backupTimeData = sessionStorage.getItem(backupTimeKey);
              if (backupTimeData) {
                try {
                  const backup = JSON.parse(backupTimeData);
                  if (backup.conversationTimeSeconds > restoredConversationTime) {
                    console.log(`📊 BACKUP RECOVERY: Using backup time ${backup.conversationTimeSeconds}s instead of database time ${restoredConversationTime}s`);
                    restoredConversationTime = backup.conversationTimeSeconds;
                    
                    // Save the more accurate backup time to the database
                    try {
                      await fetch(`/api/sessions/${data.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          conversationTimeSeconds: restoredConversationTime,
                          lastConversationStart: backup.lastConversationStart
                        })
                      });
                      console.log(`📊 Updated database with backup time: ${restoredConversationTime}s`);
                    } catch (updateError) {
                      console.warn('Failed to update database with backup time:', updateError);
                    }
                  }
                  
                  // Clear the backup after successful recovery
                  sessionStorage.removeItem(backupTimeKey);
                } catch (backupError) {
                  console.warn('Error parsing backup time data:', backupError);
                }
              }
              
              if (restoredConversationTime > 0) {
                setConversationTimeSeconds(restoredConversationTime);
                console.log(`📊 Restored conversation time: ${restoredConversationTime} seconds`);
              }
              
              // Store recovery info for user awareness
              sessionStorage.setItem('session-recovered', JSON.stringify({
                sessionId: data.id,
                originalStart: data.startTime,
                recoveredAt: now.toISOString(),
                conversationTimeMinutes,
                conversationTimeSeconds,
                remainingMinutes,
                autoRestarted: shouldPerformAutoRestart
              }));
              
              // 🚀 UNIFIED RECOVERY: Always use modal for session recovery (no auto-restart)
              console.log('📝 UNIFIED RECOVERY: Setting up session recovery modal for user choice');
              
              // Check if session was paused
              const pauseStateKey = `session-${data.id}-pause-state`;
              const pauseState = sessionStorage.getItem(pauseStateKey);
              let pauseInfo = null;
              
              if (pauseState) {
                try {
                  pauseInfo = JSON.parse(pauseState);
                  console.log('⏸️ PAUSE STATE FOUND: Session was paused before page leave');
                } catch (error) {
                  console.warn('Error parsing pause state:', error);
                }
              }
              
              // Prepare data for the ActiveSessionFoundModal
              const recoveryData = {
                sessionId: data.id,
                originalStart: data.startTime,
                recoveredAt: now.toISOString(),
                conversationTimeMinutes,
                conversationTimeSeconds,
                remainingMinutes,
                autoRestarted: false, // Will be set to true when user chooses to continue
                sessionData: data,
                pauseInfo: pauseInfo // Include pause info for recovery
              };
              
              // Store for ActiveSessionFoundModal to pick up
              sessionStorage.setItem('session-recovery-pending', JSON.stringify(recoveryData));
              
              console.log('🔔 RECOVERY MODAL: Session recovery modal will show - user can choose to continue or cancel');
              
              // NO AUTO-RESTART - Let user decide via modal
                
              // User will make the decision via ActiveSessionFoundModal
              
              console.log(`✅ Session timer recovered successfully (auto-restart: ${shouldPerformAutoRestart})`);
            } else {
              console.log(`⚠️ Session has expired (${conversationTimeMinutes} conversation minutes used, duration was ${sessionDuration} minutes)`);
              
              // Clean up expired session data to prevent failsafe auto-restart
              console.log('🧹 Cleaning up expired session data from storage');
              sessionStorage.removeItem('current-session-id');
              sessionStorage.removeItem('session-recovery-pending');
              sessionStorage.removeItem('session-continue-trigger');
              sessionStorage.removeItem('session-recovered');
            }
          }
          
          // Set flag to avoid cleanup
          if (typeof window !== 'undefined') {
            (window as any).__existingSession = data.id;
          }
        } else {
          console.log('No active session found for user');
          
          // Clean up any stale session storage data when no session exists
          console.log('🧹 Cleaning up stale session data - no active session found');
          sessionStorage.removeItem('current-session-id');
          sessionStorage.removeItem('session-recovery-pending');
          sessionStorage.removeItem('session-continue-trigger');
        }
      }
    } catch (error) {
      console.error('Error checking for active session:', error)
    } finally {
      sessionCheckInProgress.current = false;
    }
  }, [userId, setSessionActive, startTherapySession])
  
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
    // Prevent double execution in React StrictMode
    if (componentMounted.current) {
      return;
    }
    componentMounted.current = true;
    
    console.log('🚀 TherapyButton mounted, checking for active sessions...');
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
  }, [userId]) // Only depend on userId to prevent frequent re-runs
  
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
    
    // 12. Clean up conversation hash from sessionStorage
    if (sessionId) {
      try {
        const hashKey = `conversation-hash-${sessionId}`;
        sessionStorage.removeItem(hashKey);
        console.log(`- Removed conversation hash for session: ${sessionId}`);
      } catch (storageError) {
        console.warn('Error removing conversation hash:', storageError);
      }
    }
    
    // Reset conversation hash references
    lastConversationHash.current = null;
    lastConversationSessionId.current = null;
    
    // 13. Reset browser idle detection if available
    if ('IdleDetector' in window) {
      try {
        // Inform the browser we're no longer in an active call
        // This can help with power management and background throttling
        (navigator as any).userActivation?.isActive;
      } catch (idleError) {
        // Ignore idle detection errors
      }
    }
    
    // 14. Update session state in context
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
  
  // Broadcast session status updates to dashboard
  const broadcastSessionStatus = useCallback(async (sessionId: string, status: 'active' | 'completed', data?: any) => {
    try {
      await sendSessionUpdate(userId, sessionId, status, data);
      console.log(`📱 BROADCAST: Session ${sessionId} status: ${status}`);
    } catch (error) {
      console.error('Error broadcasting session status:', error);
    }
  }, [userId]);
  
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

  // Fetch family members from user profile
  const fetchFamilyMembers = useCallback(async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const userData = await response.json();
        const members = [];
        
        // Add partner if exists
        if (userData.partnerName) {
          members.push({
            name: userData.partnerName,
            age: userData.partnerAge || 0,
            relation: userData.relationshipStatus === 'married' ? 'spouse' : 'partner'
          });
        }
        
        // Add family members 1-7
        for (let i = 1; i <= 7; i++) {
          const name = userData[`familyMember${i}`];
          const age = userData[`familyMember${i}Age`];
          const relation = userData[`familyMember${i}Relation`];
          
          if (name) {
            members.push({
              name,
              age: age || 0,
              relation: relation || 'family member'
            });
          }
        }
        
        setFamilyMembers(members);
        console.log('Fetched family members:', members);
        return members;
      }
    } catch (error) {
      console.error('Error fetching family members:', error);
    }
    return [];
  }, []);

  // Handle session recovery trigger - defined before the useEffect that uses it
  const triggerSessionContinuation = useCallback(async (recoveredSessionId: string, sessionData: any) => {
    console.log('🔄 Triggering session continuation for:', recoveredSessionId);
    
    try {
      // Validate inputs
      if (!recoveredSessionId || !sessionData) {
        throw new Error('Invalid session data for continuation');
      }
      
      // Clear any existing error state
      setErrorMessage(null);
      setIsLoading(true);
      
      // Set the session ID immediately
      setSessionId(recoveredSessionId);
      
      // CRITICAL FIX: Fetch fresh session data to get correct assistantId
      console.log('🔍 Fetching fresh session data to determine correct therapy type...');
      const sessionResponse = await fetch(`/api/sessions/${recoveredSessionId}`);
      if (!sessionResponse.ok) {
        throw new Error('Failed to fetch session data for recovery');
      }
      
      const freshSessionData = await sessionResponse.json();
      console.log('📊 Fresh session data:', {
        assistantId: freshSessionData.assistantId,
        theme: freshSessionData.theme,
        duration: freshSessionData.duration
      });
      
      // Determine correct therapy type from assistantId
      let detectedTherapyType = therapyType; // fallback to prop
      if (freshSessionData.assistantId) {
        const assistantId = freshSessionData.assistantId;
        console.log(`🔍 Detecting therapy type from assistantId: "${assistantId}"`);
        
        // Check against known assistant IDs
        if (assistantId === process.env.NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID) {
          detectedTherapyType = 'solo';
          console.log('✅ Detected Solo therapy from assistantId');
        } else if (assistantId === process.env.NEXT_PUBLIC_VAPI_FAMILY_ASSISTANT_ID) {
          detectedTherapyType = 'family';
          console.log('✅ Detected Family therapy from assistantId');
        } else if (assistantId === process.env.NEXT_PUBLIC_VAPI_COUPLE_ASSISTANT_ID) {
          detectedTherapyType = 'couple';
          console.log('✅ Detected Couple therapy from assistantId');
        } else {
          console.log(`⚠️ Unknown assistantId "${assistantId}", using fallback therapy type: ${detectedTherapyType}`);
        }
      }
      
      console.log(`🎯 Final therapy type for session continuation: ${detectedTherapyType}`);
      
      // Set session duration from recovered data
      const sessionDuration = freshSessionData.duration || sessionData.duration;
      if (sessionDuration) {
        setSelectedSessionDuration(sessionDuration);
        currentSessionDuration.current = sessionDuration;
        console.log(`📊 Session duration set to: ${sessionDuration} minutes`);
      }
      
      // Set session as active immediately for UI
      if (typeof window !== 'undefined') {
        (window as any).__therapySessionActive = true;
        document.body.classList.add('session-active');
        console.log('🎨 UI updated: session-active class added');
      }
      
      // Update component states
      setIsCallActive(true);
      setSessionActive(true);
      
      console.log('🚀 Starting VAPI session continuation...');
      
      // 🚀 PAUSE STATE RECOVERY: Check if session was paused before page refresh
      const pauseStateKey = `session-${recoveredSessionId}-pause-state`;
      const pauseState = sessionStorage.getItem(pauseStateKey);
      let wasPaused = false;
      let pauseData = null;
      
      if (pauseState) {
        try {
          pauseData = JSON.parse(pauseState);
          wasPaused = true;
          console.log('⏸️ PAUSE STATE RECOVERY: Session was paused before page refresh');
          console.log('📊 Pause data:', pauseData);
          
          // Restore pause timing data
          if (pauseData.totalPausedTimeSeconds) {
            setTotalPausedTimeSeconds(pauseData.totalPausedTimeSeconds);
            console.log(`⏸️ Restored total paused time: ${pauseData.totalPausedTimeSeconds} seconds`);
          }
          
          // Clear the pause state from storage since we're handling it
          sessionStorage.removeItem(pauseStateKey);
          
        } catch (error) {
          console.warn('Error parsing pause state:', error);
        }
      }
      
      // Start the session with the recovered ID, duration, and detected therapy type
      await startTherapySessionWithType(recoveredSessionId, sessionDuration, [], detectedTherapyType);
      
      // 🚀 AUTO-PAUSE AFTER RECOVERY: If session was paused, restore pause state
      if (wasPaused && pauseData) {
        console.log('⏸️ AUTO-PAUSE: Session was paused before refresh, restoring pause state...');
        
        // Small delay to ensure VAPI session is fully started before pausing
        setTimeout(async () => {
          try {
            // Set pause state without calling VAPI stop (since session should start paused)
            setIsSessionPaused(true);
            setPauseStartTime(new Date());
            
            // Stop VAPI to restore paused state
            if (vapiInstanceRef.current) {
              await vapiInstanceRef.current.stop();
              console.log('⏸️ AUTO-PAUSE: VAPI stopped to restore paused state');
            }
            
            // Save current pause state for future recovery
            sessionStorage.setItem(`session-${recoveredSessionId}-pause-state`, JSON.stringify({
              pausedAt: new Date().toISOString(),
              conversationTimeSeconds: pauseData.conversationTimeSeconds || 0,
              totalPausedTimeSeconds: pauseData.totalPausedTimeSeconds || 0,
              sessionId: recoveredSessionId,
              restoredFromRefresh: true
            }));
            
            console.log('✅ AUTO-PAUSE: Session restored in paused state - user can resume when ready');
            
          } catch (error) {
            console.error('Error restoring pause state:', error);
          }
        }, 2000); // 2 second delay to ensure session is fully initialized
      }
      
      console.log('✅ Session continuation successful');
      setIsLoading(false);
      
    } catch (error) {
      console.error('❌ Error during session continuation:', error);
      
      // Reset to safe state
      setIsCallActive(false);
      setSessionActive(false);
      setIsLoading(false);
      
      // Remove session-active class if continuation failed
      if (typeof window !== 'undefined') {
        (window as any).__therapySessionActive = false;
        document.body.classList.remove('session-active');
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to continue session';
      setErrorMessage(errorMessage);
      
      // Clean up stale session storage
      sessionStorage.removeItem('session-continue-trigger');
      sessionStorage.removeItem('current-session-id');
      
      throw error; // Re-throw for upper-level handling
    }
  }, [therapyType, setSessionActive, startTherapySessionWithType]);

  // Listen for session continuation trigger from active session modal
  useEffect(() => {
    let processingContinuation = false;
    
    const checkForSessionContinuation = () => {
      try {
        // Prevent duplicate processing
        if (processingContinuation) {
          console.log('⏳ Session continuation already in progress, skipping check');
          return;
        }
        
        const continueSessionData = sessionStorage.getItem('session-continue-trigger');
        if (continueSessionData) {
          const { sessionId: recoveredId, sessionData } = JSON.parse(continueSessionData);
          console.log('🔔 Session continuation trigger detected:', recoveredId);
          
          // Validate trigger data
          if (!recoveredId || !sessionData) {
            console.error('❌ Invalid continuation trigger data');
            sessionStorage.removeItem('session-continue-trigger');
            return;
          }
          
          // Set processing flag
          processingContinuation = true;
          
          // Clear the trigger to avoid duplicate processing
          sessionStorage.removeItem('session-continue-trigger');
          
          // Trigger the continuation
          triggerSessionContinuation(recoveredId, sessionData)
            .catch(error => {
              console.error('❌ Session continuation failed:', error);
            })
            .finally(() => {
              processingContinuation = false;
            });
        }
        
        // Failsafe: Also check for direct session ID if trigger method fails
        const directSessionId = sessionStorage.getItem('current-session-id');
        if (directSessionId && !isCallActive && !sessionId) {
          console.log('🔍 Failsafe: Found direct session ID without active call:', directSessionId);
          
          // DISABLED: Failsafe auto-continuation to prevent unwanted session restarts
          console.log('🔍 Failsafe found session ID but auto-continuation disabled');
          console.log('⚠️ User must explicitly choose to continue sessions via modal');
          
          // Clean up stale session storage to prevent repeated failsafe triggers
          sessionStorage.removeItem('current-session-id');
          sessionStorage.removeItem('session-recovery-pending');
          sessionStorage.removeItem('session-continue-trigger');
        }
        
      } catch (error) {
        console.warn('Error checking for session continuation trigger:', error);
        processingContinuation = false;
      }
    };

    // Check immediately
    checkForSessionContinuation();
    
    // Also check periodically in case trigger is added later (less frequent to avoid spam)
    const interval = setInterval(checkForSessionContinuation, 2000);
    
    return () => {
      clearInterval(interval);
      processingContinuation = false;
    };
  }, [triggerSessionContinuation, isCallActive, sessionId]);

  // Periodic conversation time saving during active sessions
  useEffect(() => {
    if (!isCallActive || !sessionId || !conversationStartTime) {
      return;
    }

    // 🚀 SESSION RECOVERY: sessionStorage-only saves to prevent VAPI interruptions
    const saveConversationTimeToStorage = (isBeforeUnload = false) => {
      try {
        const now = new Date();
        const currentSegmentSeconds = Math.floor((now.getTime() - conversationStartTime.getTime()) / 1000);
        const totalConversationTime = conversationTimeSeconds + currentSegmentSeconds;

        // Save if we have accumulated time or if this is a beforeunload event
        if (currentSegmentSeconds > 5 || isBeforeUnload) {
          console.log(`💾 ${isBeforeUnload ? 'EMERGENCY' : 'RECOVERY'} BACKUP: Saving to sessionStorage (${totalConversationTime}s) - NO database calls during active session`);
          
          // ALWAYS save to sessionStorage for emergency recovery (instant, no network calls)
          sessionStorage.setItem(`session-${sessionId}-backup-time`, JSON.stringify({
            conversationTimeSeconds: totalConversationTime,
            lastConversationStart: conversationStartTime.toISOString(),
            timestamp: now.toISOString(),
            isPaused: isBeforeUnload,
            sessionId: sessionId,
            assistantId: assistantConfig?.id,
            therapyType: assistantConfig?.type
          }));
          
          // Save transcript backup to sessionStorage as well
          if (transcriptChunks.length > 0) {
            sessionStorage.setItem(`session-${sessionId}-transcript-backup`, JSON.stringify({
              transcriptChunks: transcriptChunks,
              timestamp: now.toISOString(),
              sessionId: sessionId
            }));
          }
          
          // 🚀 UNIFIED PAUSE LOGIC: Always pause VAPI on page leave to stop billing
          if (isBeforeUnload) {
            // Automatically pause the session when user leaves page
            try {
              if (vapiInstanceRef.current && !isSessionPaused) {
                console.log('🚨 AUTO-PAUSE: Stopping VAPI billing due to page leave');
                vapiInstanceRef.current.stop();
                
                // Mark as paused in sessionStorage
                sessionStorage.setItem(`session-${sessionId}-pause-state`, JSON.stringify({
                  pausedAt: now.toISOString(),
                  conversationTimeSeconds: totalConversationTime,
                  totalPausedTimeSeconds: totalPausedTimeSeconds,
                  sessionId: sessionId,
                  reason: 'page_leave'
                }));
              }
            } catch (error) {
              console.warn('Error auto-pausing VAPI on page leave:', error);
            }
            
            // Send database update
            if (navigator.sendBeacon) {
              const data = JSON.stringify({
                conversationTimeSeconds: totalConversationTime,
                lastConversationStart: conversationStartTime.toISOString(),
                isPaused: true // Always mark as paused when user leaves
              });
              
              navigator.sendBeacon(`/api/sessions/${sessionId}`, new Blob([data], {
                type: 'application/json'
              }));
              console.log('📡 AUTO-PAUSE: Database updated with paused state');
            }
          }
        }
      } catch (error) {
        console.warn('Error during session storage backup:', error);
      }
    };

    // 🚀 RECOVERY BACKUPS: sessionStorage-only every 15 seconds (no database calls = no VAPI interruption)
    const interval = setInterval(() => saveConversationTimeToStorage(false), 15000);

    // 🚀 AUTO-PAUSE ON PAGE LEAVE: Save conversation time AND pause VAPI to prevent billing
    const handleBeforeUnload = () => {
      // Save conversation time to storage
      saveConversationTimeToStorage(true);
      
      // 🚀 AUTO-PAUSE: Stop VAPI session to prevent billing during page refresh/leave
      if (vapiInstanceRef.current && !isSessionPaused) {
        try {
          console.log('⏸️ AUTO-PAUSE ON PAGE LEAVE: Stopping VAPI to prevent billing');
          
          // Stop VAPI synchronously (beforeunload must be synchronous)
          vapiInstanceRef.current.stop();
          
          // Save pause state to sessionStorage
          if (sessionId) {
            const pauseData = {
              pausedAt: new Date().toISOString(),
              conversationTimeSeconds: conversationTimeSeconds,
              totalPausedTimeSeconds: totalPausedTimeSeconds,
              sessionId: sessionId,
              autoPausedOnPageLeave: true // Flag to indicate this was auto-paused
            };
            
            sessionStorage.setItem(`session-${sessionId}-pause-state`, JSON.stringify(pauseData));
            console.log('💾 AUTO-PAUSE: Saved pause state for session recovery');
          }
          
        } catch (error) {
          console.warn('Error auto-pausing session on page leave:', error);
        }
      }
    };

    // 🚀 AUTO-PAUSE ON TAB HIDE: Save conversation time AND pause VAPI when tab becomes hidden
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Save conversation time to storage
        saveConversationTimeToStorage(true);
        
        // 🚀 AUTO-PAUSE: Stop VAPI session to prevent billing when tab is hidden/minimized
        if (vapiInstanceRef.current && !isSessionPaused) {
          try {
            console.log('⏸️ AUTO-PAUSE ON TAB HIDE: Stopping VAPI to prevent billing');
            
            // Stop VAPI session
            vapiInstanceRef.current.stop();
            
            // Save pause state to sessionStorage
            if (sessionId) {
              const pauseData = {
                pausedAt: new Date().toISOString(),
                conversationTimeSeconds: conversationTimeSeconds,
                totalPausedTimeSeconds: totalPausedTimeSeconds,
                sessionId: sessionId,
                autoPausedOnTabHide: true // Flag to indicate this was auto-paused on tab hide
              };
              
              sessionStorage.setItem(`session-${sessionId}-pause-state`, JSON.stringify(pauseData));
              console.log('💾 AUTO-PAUSE: Saved pause state for tab hide recovery');
            }
            
          } catch (error) {
            console.warn('Error auto-pausing session on tab hide:', error);
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isCallActive, sessionId, conversationStartTime, conversationTimeSeconds]);

  // Handle modal actions
  const handleStartButtonClick = () => {
    console.log('Start button clicked - showing duration selection modal');
    setShowDurationModal(true);
  };

  const handleDurationSelect = async (duration: 30 | 60) => {
    console.log('Duration selected:', duration);
    
    // Update duration selection
    setSelectedSessionDuration(duration);
    currentSessionDuration.current = duration;
    setShowDurationModal(false);
    
    // For family therapy, show family member selection modal
    if (therapyType === 'family') {
      console.log('Family therapy selected - fetching family members for selection');
      const members = await fetchFamilyMembers();
      if (members.length > 0) {
        setShowFamilySelectionModal(true);
      } else {
        // No family members found, show error or proceed anyway
        setErrorMessage('No family members found in your profile. Please update your profile to add family members before starting a family therapy session.');
        return;
      }
    } else {
      // For non-family therapy, start session immediately
      startSessionWithDuration(duration);
    }
  };

  const startSessionWithDuration = async (duration: 30 | 60, selectedMembers?: Array<{name: string, age: number, relation: string}>) => {
    console.log(`Starting therapy session process with ${duration} minute duration`);
    
    // Store selected family members if provided
    if (selectedMembers) {
      setSelectedFamilyMembers(selectedMembers);
      console.log('Selected family members for session:', selectedMembers);
    }
    
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
    startTherapySession(undefined, duration, selectedMembers).catch(error => {
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
  };

  const handleModalClose = () => {
    console.log('Duration selection modal closed');
    setShowDurationModal(false);
  };

  const handleFamilySelectionClose = () => {
    console.log('Family selection modal closed');
    setShowFamilySelectionModal(false);
    // Reset duration selection since user cancelled
    setSelectedSessionDuration(60);
    currentSessionDuration.current = 60;
  };

  const handleFamilyMembersSelected = (selectedMembers: Array<{name: string, age: number, relation: string}>) => {
    console.log('Family members selected:', selectedMembers);
    setShowFamilySelectionModal(false);
    startSessionWithDuration(selectedSessionDuration, selectedMembers);
  };

  // Handle family member removal (for future profile updates)
  const handleRemoveFamilyMember = useCallback((index: number) => {
    setFamilyMembers(prev => {
      const updated = prev.filter((_, i) => i !== index);
      // Clear cache to force refresh on next fetch
      sessionStorage.removeItem('family-members-cache');
      console.log('Removed family member at index:', index);
      return updated;
    });
  }, []);

  // Handle real-time timer updates with VAPI assistant integration
  const handleTimeUpdate = useCallback((remainingTimeMinutes: number, remainingTimeSeconds: number) => {
    if (vapiInstanceRef.current && isCallActive) {
      try {
        const totalSeconds = currentSessionDuration.current * 60;
        const sessionPercentageRemaining = (remainingTimeSeconds / totalSeconds) * 100;
        
        // Log time updates (throttled)
        if (remainingTimeSeconds % 30 === 0) {
          console.log(`📊 SESSION TIME: ${remainingTimeMinutes}:${(remainingTimeSeconds % 60).toString().padStart(2, '0')} remaining (${sessionPercentageRemaining.toFixed(1)}%)`);
        }
        
        // Send critical time updates to VAPI assistant via system messages
        const shouldSendUpdate = (
          remainingTimeMinutes === 10 ||  // 10 minutes warning
          remainingTimeMinutes === 5 ||   // 5 minutes warning
          remainingTimeMinutes === 3 ||   // 3 minutes warning
          remainingTimeMinutes === 2 ||   // 2 minutes warning
          remainingTimeMinutes === 1 ||   // 1 minute warning
          (remainingTimeSeconds === 45) || // 45 seconds warning
          (remainingTimeSeconds === 30)    // 30 seconds warning
        );
        
        // Client-side backup termination - force end session if time runs out
        if (remainingTimeSeconds <= 30 && remainingTimeSeconds > 0) {
          console.log('🚨 BACKUP TERMINATION: Less than 30 seconds remaining - preparing forced session end');
          try {
            if (typeof vapiInstanceRef.current.say === 'function') {
              // Use VAPI's say method to force session termination with goodbye message
              const goodbyeMessage = remainingTimeSeconds <= 10 
                ? "Our time has come to an end. Thank you for sharing this meaningful session with me. Take care."
                : "We need to wrap up our time together now. Thank you for this important conversation.";
              
              console.log('🔚 FORCED TERMINATION: Using vapi.say() to end session');
              vapiInstanceRef.current.say(goodbyeMessage, true); // true = endCallAfterSpoken
              return; // Exit early to prevent further updates
            }
          } catch (forceEndError) {
            console.warn('Backup termination failed:', forceEndError);
          }
        }
        
        if (shouldSendUpdate) {
          try {
            // Create time-aware system message for assistant
            let timeMessage = '';
            if (remainingTimeMinutes === 10) {
              timeMessage = 'Time Update: 10 minutes remaining in session. Continue conversation naturally but begin to consider pacing toward meaningful insights.';
            } else if (remainingTimeMinutes === 5) {
              timeMessage = 'Time Update: 5 minutes remaining in session. Begin natural transition toward session closure while maintaining therapeutic value.';
            } else if (remainingTimeMinutes === 3) {
              timeMessage = 'Time Update: 3 minutes remaining in session. Start wrapping up current topics and begin summarizing key insights.';
            } else if (remainingTimeMinutes === 2) {
              timeMessage = 'Time Update: 2 minutes remaining in session. Begin active closure and prepare for ending. Start providing final therapeutic insights.';
            } else if (remainingTimeMinutes === 1) {
              timeMessage = 'Time Update: 1 minute remaining. CRITICAL: Begin immediate session closure and prepare to use end_therapy_session function.';
            } else if (remainingTimeSeconds === 45) {
              timeMessage = 'Time Update: 45 seconds remaining. URGENT: Begin final goodbye and use end_therapy_session function immediately.';
            } else if (remainingTimeSeconds === 30) {
              timeMessage = 'Time Update: 30 seconds remaining. FINAL WARNING: Use end_therapy_session function NOW to avoid forced termination.';
            }
            
            // Send system message to assistant via VAPI
            if (timeMessage && typeof vapiInstanceRef.current.send === 'function') {
              vapiInstanceRef.current.send({
                type: 'add-message',
                message: {
                  role: 'system',
                  content: timeMessage
                }
              });
              
              console.log(`⏰ REAL-TIME ASSISTANT UPDATE: Sent "${timeMessage.substring(0, 50)}..."`);
            }
            
          } catch (msgError) {
            console.warn('Failed to send time update to assistant:', msgError);
          }
        }
        
      } catch (error) {
        console.warn('Error in timer update handling:', error);
      }
    }
  }, [isCallActive]);

  // Duplicate function removed - function is now defined earlier
  const endTherapySession = useCallback(async () => {
    console.log('End therapy session called')
    
    // Reset the session active flag since the session is ending
    if (typeof window !== 'undefined') {
      (window as any).__therapySessionActive = false;
      console.log('Resetting session active flag - session ending');
    }
    
    // Reset session creation and auto-restart flags
    console.log('🔄 SESSION CLEANUP: Resetting all session guards and flags');
    sessionCreationInProgress.current = false;
    autoRestartTriggered.current = false;
    sessionCheckInProgress.current = false;
    componentMounted.current = false; // Allow re-initialization
    
    // Immediately reset UI state to improve user experience and ensure UI updates
    setIsCallActive(false);
    setIsLoading(false);
    setIsMuted(false); // Reset mute state when call ends
    setLoadingMessageIndex(0); // Reset loading message index
    setIsEndingSession(false); // Reset ending session state
    setSessionStartTime(null); // Reset session start time
    setSessionRecovered(false); // Reset session recovery state
    setVapiCallStartTime(null); // Reset VAPI call start time
    setVapiCallDuration(0); // Reset VAPI call duration
    
    // Update session state in the sound context
    setSessionActive(false);
    
    // Explicitly clean up resources right away for immediate visual feedback
    cleanupResources();
    
    // CRITICAL: Flush any pending transcript batches before session ends
    try {
      console.log('🚀 FLUSHING: Saving any pending transcript batches...');
      const { flushTranscriptBatches } = await import('@/lib/transcript-service-optimized');
      await flushTranscriptBatches();
      console.log('✅ FLUSH SUCCESS: All pending transcripts saved');
    } catch (flushError) {
      console.error('❌ FLUSH ERROR: Failed to save pending transcripts:', flushError);
    }
    
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
      console.log(`Session ${currentSessionId} ending - recovering all transcripts from all sources`);
      
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
        const storageKey = `transcript-${currentSessionId}`;
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
        const entriesResponse = await fetch(`/api/sessions/${currentSessionId}/transcript`);
        
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
        const sessionResponse = await fetch(`/api/sessions/${currentSessionId}`);
        
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
        const { addTranscriptEntry } = await import('@/lib/transcript-service-optimized');
        let savedCount = 0;
        
        // Save each entry individually
        for (const entry of dedupedEntries) {
          try {
            // Skip system entries for the database
            if (entry.speaker === 'system') continue;
            
            if (currentSessionId) {
              await addTranscriptEntry({
                sessionId: currentSessionId,
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
        await fetch(`/api/sessions/${currentSessionId}`, {
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
        if (!startTimeStr && currentSessionId) {
          startTimeStr = sessionStorage.getItem(`session-${currentSessionId}-start-time`);
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
      
      // Calculate actual session duration and timing metadata
      const sessionEndTime = new Date();
      let actualDurationMinutes = sessionDuration; // Default to planned duration
      let sessionTimingMetadata = {};
      
      if (sessionStartTime) {
        const actualDurationMs = sessionEndTime.getTime() - sessionStartTime.getTime();
        actualDurationMinutes = Math.round(actualDurationMs / 60000); // Convert to minutes
        
        sessionTimingMetadata = {
          // Session timing (UI/Database)
          plannedDurationMinutes: sessionDuration,
          actualDurationMinutes,
          actualDurationMs,
          startTime: sessionStartTime.toISOString(),
          endTime: sessionEndTime.toISOString(),
          sessionRecovered: sessionRecovered,
          timerDisplayed: true,
          
          // VAPI call timing (Real-time events)
          vapiCallDurationSeconds: vapiCallDuration,
          vapiCallDurationMinutes: Math.round(vapiCallDuration / 60),
          vapiCallStartTime: vapiCallStartTime?.toISOString(),
          vapiTimerIntegrated: true,
          
          // Timing comparison
          sessionVsCallDifference: actualDurationMs - (vapiCallDuration * 1000),
          timingSource: vapiCallDuration > 0 ? 'vapi_events' : 'session_timer'
        };
        
        console.log(`📊 DUAL TIMING: Session ${actualDurationMinutes}min, VAPI Call ${Math.round(vapiCallDuration/60)}min`);
      }
      
      const response = await fetch(`/api/sessions/${currentSessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endTime: sessionEndTime.toISOString(),
          status: 'completed',
          duration: currentSessionDuration.current, // Use the originally selected duration, not the calculated actual duration
          notes: `Therapy session ${sessionEndTime.toLocaleDateString()} - Selected: ${currentSessionDuration.current}min, Actual: ${actualDurationMinutes}min, VAPI Call: ${Math.round(vapiCallDuration/60)}min - ${dedupedEntries.length} transcript entries`,
          sessionTimingMetadata: JSON.stringify(sessionTimingMetadata)
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to update session');
      }
      
      console.log(`✅ SESSION UPDATE CONFIRMED - Actual duration: ${actualDurationMinutes} minutes (planned: ${sessionDuration} minutes)`);
      
      console.log('📋 TRANSCRIPT RECOVERY COMPLETE');
      console.log(`Successfully saved ${dedupedEntries.length} unique transcript entries`);
      
    } catch (error) {
      console.error('Failed to end session:', error);
      setErrorMessage(`End session error: ${error}`);
    } finally {
      // 📊 CLEANUP METRICS CALCULATOR
      cleanupMetricsCalculator();
      
      // Make sure to clear the session ID
      setSessionId(null);
      // Clear transcript chunks to free memory
      setTranscriptChunks([]);
    }
  }, [sessionId, transcriptChunks, setSessionActive, cleanupMetricsCalculator])
  
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
  
  // 🚀 UNIFIED SESSION CONTINUATION: Handle modal "Continue Session" choice
  const continueSessionFromModal = useCallback(async (sessionData: any) => {
    try {
      console.log('🔄 MODAL CONTINUE: User chose to continue session:', sessionData.id);
      
      // Restore session state
      setSessionId(sessionData.id);
      setSelectedSessionDuration(sessionData.duration);
      currentSessionDuration.current = sessionData.duration;
      setSessionStartTime(new Date(sessionData.startTime));
      
      // Check for pause state
      const pauseStateKey = `session-${sessionData.id}-pause-state`;
      const pauseState = sessionStorage.getItem(pauseStateKey);
      let wasPaused = false;
      
      if (pauseState) {
        try {
          const pauseInfo = JSON.parse(pauseState);
          if (pauseInfo.pausedAt && !pauseInfo.resumedAt) {
            wasPaused = true;
            console.log('⏸️ CONTINUE PAUSED: Session was paused, restoring pause state');
            
            // Restore pause state
            setIsSessionPaused(true);
            setPauseStartTime(new Date(pauseInfo.pausedAt));
            setTotalPausedTimeSeconds(pauseInfo.totalPausedTimeSeconds || 0);
          }
        } catch (error) {
          console.warn('Error parsing pause state during continuation:', error);
        }
      }
      
      // Set session as active in UI
      setIsCallActive(true);
      setSessionActive(true);
      
      // Apply visual effects
      if (typeof window !== 'undefined') {
        (window as any).__therapySessionActive = true;
        document.body.classList.add('session-active');
      }
      
      const main = document.querySelector('main');
      if (main) {
        main.style.transition = 'all 0.3s ease-in-out';
        main.style.opacity = '0.95';
      }
      
      if (wasPaused) {
        console.log('⏸️ CONTINUE AS PAUSED: Session restored in paused state - user can manually resume');
        // Don't start VAPI - let user manually resume with pause button
      } else {
        console.log('▶️ CONTINUE ACTIVE: Session was active, auto-resuming VAPI');
        // Auto-start VAPI since session wasn't paused
        setTimeout(() => {
          startTherapySession(sessionData.id, sessionData.duration).catch(error => {
            console.error('Error resuming active session:', error);
            setErrorMessage(`Failed to resume session: ${error.message}`);
          });
        }, 500);
      }
      
    } catch (error) {
      console.error('Error continuing session from modal:', error);
      throw error;
    }
  }, [startTherapySession]);
  
  // 🚀 PAUSE/RESUME FUNCTIONALITY: Save billing time and allow breaks
  const pauseResumeSession = useCallback(async () => {
    if (!sessionId || !vapiInstanceRef.current) {
      console.warn('Cannot pause: No active session or VAPI instance');
      return;
    }
    
    try {
      if (isSessionPaused) {
        // RESUME SESSION
        console.log('▶️ RESUMING: Restarting VAPI session and billing');
        
        // Calculate total paused time
        if (pauseStartTime) {
          const pauseDuration = Math.floor((Date.now() - pauseStartTime.getTime()) / 1000);
          setTotalPausedTimeSeconds(prev => prev + pauseDuration);
          console.log(`⏸️ PAUSE DURATION: ${pauseDuration} seconds saved from billing`);
        }
        
        // Save pause state to sessionStorage for recovery
        sessionStorage.setItem(`session-${sessionId}-pause-state`, JSON.stringify({
          totalPausedTimeSeconds: totalPausedTimeSeconds,
          resumedAt: new Date().toISOString(),
          sessionId: sessionId
        }));
        
        // Resume VAPI call - restart if needed
        await vapiInstanceRef.current.start();
        
        // Update state
        setIsSessionPaused(false);
        setPauseStartTime(null);
        setConversationStartTime(new Date()); // Reset conversation timer
        
        console.log('✅ SESSION RESUMED: VAPI active, billing resumed');
        
      } else {
        // PAUSE SESSION
        console.log('⏸️ PAUSING: Stopping VAPI session to save billing');
        
        // CRITICAL: Set pause state BEFORE stopping VAPI to prevent session ending
        setIsSessionPaused(true);
        setPauseStartTime(new Date());
        
        // Stop VAPI call to save costs
        await vapiInstanceRef.current.stop();
        
        // Save pause state to sessionStorage for recovery
        sessionStorage.setItem(`session-${sessionId}-pause-state`, JSON.stringify({
          pausedAt: new Date().toISOString(),
          conversationTimeSeconds: conversationTimeSeconds,
          totalPausedTimeSeconds: totalPausedTimeSeconds,
          sessionId: sessionId
        }));
        
        // Flush any pending transcripts before pausing
        try {
          const { flushSessionTranscripts } = await import('@/lib/transcript-service-optimized');
          await flushSessionTranscripts(sessionId);
          console.log('💾 PAUSE: Saved all pending transcripts');
        } catch (error) {
          console.warn('Error flushing transcripts during pause:', error);
        }
        
        console.log('✅ SESSION PAUSED: VAPI stopped, billing paused, progress saved');
      }
      
    } catch (error) {
      console.error('Error during pause/resume:', error);
      // Reset pause state on error
      setIsSessionPaused(false);
      setPauseStartTime(null);
    }
  }, [isSessionPaused, sessionId, pauseStartTime, totalPausedTimeSeconds, conversationTimeSeconds]);
  
  // Use a ref to avoid circular dependencies with the callbacks
  const handleCallEndRef = useRef(endTherapySession);
  
  // Update the ref when endTherapySession changes
  useEffect(() => {
    handleCallEndRef.current = endTherapySession;
  }, [endTherapySession]);
  
  // Handle call end and errors
  useEffect(() => {
    // If call is no longer active but we still have a session ID, end the session
    // IMPORTANT: Don't end the session if it's just paused
    if (sessionId && !isCallActive && document.body.classList.contains('session-active') && !isSessionPaused) {
      // Call has ended and not just paused, clean up the session
      console.log('📞 CALL END DETECTED: Session is not paused, ending session');
      handleCallEndRef.current();
    }
  }, [isCallActive, sessionId, isSessionPaused]);

  // 🧹 Cleanup timeouts on unmount to prevent memory leaks (Phase 2 completion)
  useEffect(() => {
    return () => {
      // Clean up assistant debouncing timeout
      if (assistantTimeoutRef.current) {
        clearTimeout(assistantTimeoutRef.current);
        assistantTimeoutRef.current = null;
      }
      
      // Clean up user debouncing timeout
      if (userTimeoutRef.current) {
        clearTimeout(userTimeoutRef.current);
        userTimeoutRef.current = null;
      }
      
      console.log('🧹 CLEANUP: Cleared all debouncing timeouts');
    };
  }, []);
  
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
              <VoiceWaveform audioLevel={isMuted || isSessionPaused ? 0 : audioLevel} />
              {isMuted && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full animate-pulse shadow-md">
                    Microphone Muted
                  </div>
                </div>
              )}
              {/* 🚀 PAUSE INDICATOR */}
              {isSessionPaused && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="bg-orange-500 text-white text-xs font-medium px-3 py-2 rounded-full animate-pulse shadow-md flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                    <span>Session Paused • 💰 Billing Stopped</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Session Timer */}
            <div className="text-center py-1 sm:py-2">
              {sessionStartTime ? (
                <SessionTimer 
                  durationMinutes={currentSessionDuration.current}
                  startTime={sessionStartTime}
                  conversationTimeSeconds={conversationTimeSeconds}
                  isConversationActive={isCallActive}
                  conversationStartTime={conversationStartTime || undefined}
                  className="text-white"
                  onTimeUpdate={handleTimeUpdate}
                  showRecoveredIndicator={sessionRecovered}
                  vapiCallTime={vapiCallDuration}
                  showDualTiming={isCallActive && vapiCallDuration > 0}
                />
              ) : (
                <p className="text-white font-mono text-base sm:text-lg">
                  <span className="text-green-400">●</span> Active
                </p>
              )}
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
              
              {/* 🚀 PAUSE/RESUME BUTTON - Replaces Speaker button for cost savings */}
              <div className="flex flex-col items-center">
                <button 
                  onClick={pauseResumeSession}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full ${isSessionPaused ? 'bg-green-600' : 'bg-orange-500'} flex items-center justify-center mb-1 sm:mb-2 transition-colors duration-300 hover:bg-opacity-90 cursor-pointer`}
                  aria-label={isSessionPaused ? "Resume session" : "Pause session"}
                >
                  {isSessionPaused ? (
                    // Resume icon (play button)
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  ) : (
                    // Pause icon
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                  )}
                </button>
                <span className="text-white text-xs">{isSessionPaused ? "Resume" : "Pause"}</span>
                {/* Show pause time saved indicator */}
                {isSessionPaused && totalPausedTimeSeconds > 0 && (
                  <span className="text-green-400 text-[10px] mt-1">
                    💰 {Math.floor(totalPausedTimeSeconds / 60)}m saved
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Start Therapy Button - Only visible when call is not active and modal is closed */}
        {!isCallActive && !showDurationModal && (
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
              onClick={handleStartButtonClick}
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

      {/* Session Duration Modal */}
      <SessionDurationModal
        isOpen={showDurationModal}
        onClose={handleModalClose}
        onSelectDuration={handleDurationSelect}
        therapyType={therapyType}
        isLoading={isLoading}
      />

      {/* Family Member Selection Modal */}
      <FamilyMemberSelectionModal
        isOpen={showFamilySelectionModal}
        onClose={handleFamilySelectionClose}
        onSelectMembers={handleFamilyMembersSelected}
        familyMembers={familyMembers}
        onRemoveMember={handleRemoveFamilyMember}
        isLoading={isLoading}
      />
    </div>
  )
}

export default React.memo(TherapyButton)