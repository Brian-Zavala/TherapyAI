// @ts-nocheck
'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useVapiSession } from '@/hooks/useVapiSession'
import { useVapiToken } from '@/hooks/useVapiToken'
import { vapiInstanceManager } from '@/lib/services/vapi-instance-manager'
import { useSessionManagementV2 } from '@/hooks/useSessionManagementV2'
import { useSessionWithCredits } from '@/hooks/useSessionWithCredits'
import { useTranscriptHandler } from '@/hooks/useTranscriptHandler'
import { useButtonSound } from '@/hooks/useButtonSound'
import { useSupabaseRealTimeMetrics } from '@/hooks/useSupabaseRealTimeMetrics'
import { useSupabaseSessionState } from '@/hooks/useSupabaseSessionState'
import { useVapiMetricsBridge } from '@/hooks/useVapiMetricsBridge'
import { useSessionConflict } from '@/hooks/useSessionConflict'
import { useFamilyMembersEnhanced } from '@/hooks/useFamilyMembersEnhanced'
import { initializeSessionMetrics, cleanupSessionMetrics } from '@/lib/transcript-service-optimized'
import { safeSessionStorage } from '@/lib/safe-session-storage'
import { 
  AUTH_ERRORS, 
  SESSION_ERRORS, 
  getUserFriendlyError 
} from '@/lib/error-messages'
import SessionDurationModal from './SessionDurationModal'
import { SessionConflictDialog } from './SessionConflictDialog'
import FamilyMemberSelectionModal from './FamilyMemberSelectionModal'
import SessionTimerV2 from './SessionTimerV2'
import VoiceWaveform from './VoiceWaveform'
import SessionTranscript from './SessionTranscript'
import { 
  CallControlsOptimized as CallControls, 
  CallHeader, 
  PausedOverlayOptimized as PausedOverlay,
  ErrorDisplay 
} from './therapy'
import TranscriptOverlay from './therapy/TranscriptOverlay'
import LiveTranscriptButton from './therapy/LiveTranscriptButton'
import TherapyTypeSelector from './TherapyTypeSelector'
import type { TherapyType, SessionRecoveryData } from '@/types/therapy-session'

// Loading messages that cycle through
const loadingMessages = [
  "Finding the perfect space for our conversation...",
  "Preparing a comfortable environment...",
  "Setting up your private therapy session...",
  "Creating a safe space for you to share...",
  "Getting everything ready for our talk...",
  "Almost there... just a moment more..."
]

// Recovery timing constants for consistency
const RECOVERY_CONSTANTS = {
  COOLDOWN_MS: 2000,               // Cooldown between recovery attempts
  STALE_DATA_MS: 60000,           // When recovery data is considered stale (60s)
  AUTO_START_VALIDITY_MS: 60000,   // How long auto-start data is valid (60s - matches modal)
  VAPI_READY_TIMEOUT_MS: 15000,    // Max wait for VAPI to be ready (15s)
  VAPI_READY_CHECK_INTERVAL_MS: 500, // How often to check VAPI readiness
  DEFERRED_RECOVERY_DELAY_MS: 200,   // Delay for deferred recovery dispatch
  CLEANUP_INTERVAL_MS: 30000        // How often to clean up old recovery data (30s)
}

interface TherapyButtonRefactoredProps {
  therapyType: TherapyType
  disabled?: boolean
  forceNewSession?: boolean
  onSessionConflict?: (conflictData: any) => void
  onSessionStarted?: () => void
  linkedSessionId?: string | null
}

export const TherapyButtonRefactored = React.memo(function TherapyButtonRefactored({ 
  therapyType, 
  disabled = false,
  forceNewSession = false,
  onSessionConflict,
  onSessionStarted,
  linkedSessionId = null
}: TherapyButtonRefactoredProps) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const playClick = useButtonSound()
  
  // Session conflict handling
  const {
    conflictSession,
    isConflictDialogOpen,
    setIsConflictDialogOpen,
    handleSessionConflict,
    resumeExistingSession,
    formatSessionTime
  } = useSessionConflict()
  
  // Core hooks for session management
  // Create vapi ref first
  const vapiInstanceRef = useRef<any>(null)
  
  // Store session ref for callbacks
  const sessionRef = useRef<any>(null)
  
  // Session active class management - moved here to be available for callbacks
  const sessionActiveManaged = useRef(false)
  const sessionActiveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Debounce ref for pause/resume operations
  const pauseResumeDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Ref to handleEndSession so handleVapiCallEnd can trigger it without stale closures
  const handleEndSessionRef = useRef<(() => void) | null>(null)
  
  // Centralized function to manage session-active class
  const setSessionActive = useCallback((active: boolean) => {
    // Clear any pending timeout
    if (sessionActiveTimeoutRef.current) {
      clearTimeout(sessionActiveTimeoutRef.current)
      sessionActiveTimeoutRef.current = null
    }
    
    // Update managed flag
    sessionActiveManaged.current = active
    
    // Use requestAnimationFrame for smooth DOM updates
    requestAnimationFrame(() => {
      if (active && !document.body.classList.contains('session-active')) {
        document.body.classList.add('session-active')
        console.log('✅ Added session-active class')
        
        // Set window flag
        if (typeof window !== 'undefined') {
          (window as Window & { __therapySessionActive?: boolean }).__therapySessionActive = true
        }
      } else if (!active && document.body.classList.contains('session-active')) {
        // Add a small delay before removing to prevent flicker during transitions
        sessionActiveTimeoutRef.current = setTimeout(() => {
          if (!sessionActiveManaged.current) {
            document.body.classList.remove('session-active')
            console.log('✅ Removed session-active class')
            
            // Clear window flag
            if (typeof window !== 'undefined') {
              (window as Window & { __therapySessionActive?: boolean }).__therapySessionActive = false
            }
            
            // Reset main opacity
            const main = document.querySelector('main')
            if (main) {
              main.style.opacity = '1'
            }
          }
        }, 100) // Small delay to prevent flicker
      }
      
      // Dispatch event
      window.dispatchEvent(new Event('sessionStateChanged'))
    })
  }, [])
  
  // Memoize VAPI callbacks to prevent re-renders
  const handleVapiCallStart = useCallback(() => {
    console.log('[TherapyButton] VAPI call started - starting conversation timer')
    
    // CRITICAL: Set sessionId on VAPI instance immediately to prevent transcript buffering
    if (sessionRef.current?.sessionId && vapiInstanceRef.current) {
      vapiInstanceRef.current._sessionId = sessionRef.current.sessionId
      console.log('🔗 Set sessionId on VAPI instance immediately:', sessionRef.current.sessionId)
    }
    
    // Add session-active class to trigger background transition
    setSessionActive(true)
    // Dispatch event to update credit display immediately
    window.dispatchEvent(new Event('sessionStarted'))
    window.dispatchEvent(new Event('creditUpdate'))
    // Trigger conversation start timing with current sessionId
    if (sessionRef.current) {
      sessionRef.current.startConversationTimer(sessionRef.current.sessionId || undefined)
    }
  }, [setSessionActive])
  
  const handleVapiCallEnd = useCallback((reason?: string) => {
    console.log('[TherapyButton] VAPI call ended:', reason)

    // CRITICAL: Save conversation time when VAPI unexpectedly ends
    // This ensures we don't lose billing data if connection drops
    if (sessionRef.current?.sessionId && sessionRef.current?.conversationTimeSeconds > 0) {
      console.log('💾 Saving conversation time on VAPI disconnect:', sessionRef.current.conversationTimeSeconds)

      // Force update conversation time to database
      fetch(`/api/sessions/${sessionRef.current.sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationTimeSeconds: sessionRef.current.conversationTimeSeconds,
          lastConversationStart: null, // Clear to indicate not actively in conversation
          vapiDisconnectReason: reason || 'unknown'
        })
      }).catch(error => {
        console.error('Failed to save conversation time on disconnect:', error)
      })
    }

    // Remove session-active class when VAPI call ends
    // Only if we're not loading or in a modal
    if (!isLoadingRef.current && !showDurationModalRef.current && !showFamilySelectionModalRef.current) {
      setSessionActive(false)
    }

    // When VAPI ends the call (e.g. assistant used endCall tool), trigger full session completion
    // This ensures the session is properly completed, credits updated, and user redirected
    if (sessionRef.current?.sessionId && !endSessionInProgressRef.current) {
      console.log('🔚 VAPI call ended with active session - triggering session completion')
      // Small delay to let VAPI finish cleanup before we run our completion
      setTimeout(() => {
        handleEndSessionRef.current?.()
      }, 500)
    }
  }, [setSessionActive])
  
  const handleVapiError = useCallback((error: unknown) => {
    console.error('[TherapyButton] VAPI error:', error)
    setError(getUserFriendlyError(error))
    
    // Check if this is a "Meeting has ended" error
    if (error && typeof error === 'object') {
      const errorObj = error as Record<string, any>
      if (errorObj.errorMsg === 'Meeting has ended' && errorObj.error?.type === 'no-room') {
        // Mark session as ended to prevent recovery attempts
        const currentSessionId = sessionRef.current?.sessionId
        if (currentSessionId) {
          safeSessionStorage.setItem('session-just-ended', JSON.stringify({
            sessionId: currentSessionId,
            timestamp: Date.now(),
            reason: 'vapi-room-ended'
          }))
          console.log('🚫 VAPI room ended - marked session to prevent recovery')
          
          // Force cleanup
          cleanupSessionMetrics(currentSessionId)
        }
      }
    }
  }, [])
  
  // Create transcript ref for the callback
  const transcriptRef = useRef<any>(null)
  
  const handleVapiMessage = useCallback((message: any) => {
    console.log('🔔 THERAPY BUTTON: Received VAPI message to forward', {
      type: message?.type,
      hasTranscriptHandler: !!transcriptRef.current,
      currentSessionId: sessionRef.current?.sessionId
    });

    // Log function calls for debugging (endCall tool is handled natively by VAPI)
    if (message?.type === 'function-call' && message?.functionCall) {
      console.log('🔧 VAPI Function Call detected:', message.functionCall.name);
    }

    // Forward VAPI messages to transcript handler
    if (transcriptRef.current) {
      transcriptRef.current.handleVapiMessage(message, vapiInstanceRef.current)
    } else {
      console.error('❌ THERAPY BUTTON: No transcript handler available!');
    }
  }, [])
  
  // Get JWT token for VAPI authentication (public keys are no longer supported)
  const { token: vapiToken, isLoading: tokenLoading, error: tokenError } = useVapiToken({
    scope: 'public',
    autoRefresh: true
  })
  
  // Use JWT token exclusively for authentication
  const vapiApiKey = vapiToken || undefined;
  
  // Track token state with a ref for async access
  const tokenStateRef = useRef<{ token: string | null; loading: boolean; error: string | null }>({
    token: null,
    loading: true,
    error: null
  });
  
  useEffect(() => {
    tokenStateRef.current = {
      token: vapiToken,
      loading: tokenLoading,
      error: tokenError
    };
  }, [vapiToken, tokenLoading, tokenError]);
  
  // Log the authentication state for debugging
  useEffect(() => {
    if (vapiApiKey) {
      console.log('[TherapyButton] VAPI auth ready:', {
        type: 'JWT Token',
        source: 'JWT Service'
      });
    } else if (!tokenLoading) {
      console.error('[TherapyButton] No VAPI authentication available:', {
        tokenError: tokenError
      });
    }
  }, [vapiApiKey, vapiToken, tokenLoading, tokenError]);
  
  const vapi = useVapiSession({
    apiKey: vapiApiKey,
    assistantId: getAssistantId(therapyType),
    onCallStart: handleVapiCallStart,
    onCallEnd: handleVapiCallEnd,
    onError: handleVapiError,
    onMessage: handleVapiMessage
  })
  
  
  // Update ref when vapi instance changes
  useEffect(() => {
    vapiInstanceRef.current = vapi.vapi
  }, [vapi.vapi])
  
  // Memoize callbacks to prevent re-renders
  const handleSessionCreated = useCallback((sessionId: string) => {
    console.log('[TherapyButton] Session created:', sessionId)
    // Handle post-session actions
  }, [])
  
  const handleSessionRecovered = useCallback((recoveredSession: SessionRecoveryData) => {
    console.log('[TherapyButton] Session recovered:', recoveredSession)
    // TODO: Implement session recovery modal when ActiveSessionFoundModal is needed
  }, [])
  
  const handleTranscriptUpdate = useCallback(() => {
    // Transcript updates happen frequently, no need to log
  }, [])

  const session = useSessionManagementV2({
    userId: user?.id || '',
    therapyType,
    onSessionCreated: handleSessionCreated,
    onSessionRecovered: handleSessionRecovered,
    onTimeWarning: (remainingMinutes) => {
      console.log(`⚠️ Time warning: ${remainingMinutes} minutes remaining`)
      
      // Enhanced conversational time management system:
      // - 10 min: AI becomes time-aware but doesn't interrupt
      // - 5 min: AI politely interrupts, offers choice (continue vs reflect)
      // - 1 min: AI guides based on user's 5-min choice
      // - 30 sec: AI prepares personalized goodbye
      // - 0 sec: AI delivers warm, contextual farewell
      
      // Send time warning to VAPI if connected
      if (vapi.vapi && vapi.isConnected) {
        try {
          // Different messages based on remaining time and therapy type
          let systemMessage = '';
          
          if (remainingMinutes === 10) {
            // Send clear system notification about remaining time
            systemMessage = '[SYSTEM NOTIFICATION] 10 minutes remaining in session. Continue the therapeutic conversation naturally while being mindful of time. Do not announce the time to the client yet.';
          } else if (remainingMinutes === 5) {
            // Send the 5-minute warning voice message
            let userNotification = '';
            
            if (therapyType === 'couple') {
              userNotification = "I'm sorry to interrupt, but I wanted to let you both know we're getting close to the end of our session - we have about 5 minutes left. Would you like to continue with what you're discussing right now, or would it be helpful to take a moment to reflect on what we've talked about today and identify some key takeaways together?";
            } else if (therapyType === 'family') {
              userNotification = "Hey everyone, I'm sorry to interrupt, but I just wanted to let you all know we're getting close to the end of our session - we have about 5 minutes remaining. Would you like to keep going with our current discussion, or would it be helpful to pause and reflect on what we've accomplished as a family today?";
            } else {
              // For individual/solo therapy, use their name if available
              const userName = user?.name ? user.name.split(' ')[0] : '';
              if (userName) {
                userNotification = `I'm sorry to interrupt you, ${userName}, but I wanted to let you know we're getting close to the end of our session - we have about 5 minutes left. Would you like to continue exploring what you're sharing right now, or would it be helpful to take these last few minutes to reflect on our conversation today and identify any insights or action steps you'd like to take with you?`;
              } else {
                userNotification = "I'm sorry to interrupt, but I wanted to let you know we're getting close to the end of our session - we have about 5 minutes left. Would you like to continue with what you're sharing, or would it be helpful to use these last few minutes to reflect on our conversation today and identify any key insights or next steps?";
              }
            }
            
            // Don't use say() here - let VAPI handle the announcement based on the system message
            // This prevents duplicate announcements
            console.log(`⏰ 5-minute warning triggered at conversation time: ${Math.floor(session.conversationTimeSeconds / 60)}:${(session.conversationTimeSeconds % 60).toString().padStart(2, '0')}`);
            
            // Send system notification with the exact message VAPI should speak
            systemMessage = `[SYSTEM NOTIFICATION] 5 minutes remaining in session. Please announce to the client: "${userNotification}"`;
          } else if (remainingMinutes === 1) {
            systemMessage = '[SYSTEM NOTIFICATION] 1 minute remaining in session. Begin wrapping up immediately. Offer brief closing remarks and prepare to end.';
          } else if (remainingMinutes === 0.5) { // 30 seconds
            systemMessage = '[SYSTEM NOTIFICATION] 30 seconds remaining. Deliver a brief warm goodbye with an encouraging thought, then IMMEDIATELY call the endCall tool to end the call. Do not wait any longer.';
          }
          
          if (systemMessage) {
            vapi.sendMessage({
              type: 'add-message',
              message: {
                role: 'system',
                content: systemMessage,
              },
            });
            console.log('📤 Sent time warning to VAPI:', {
            remainingMinutes,
            therapyType,
            messagePreview: systemMessage.substring(0, 50) + '...'
          });
          }
        } catch (error) {
          console.error('Failed to send time warning to VAPI:', error);
        }
      }
    }
  })
  
  // Initialize VAPI instance as soon as token is ready
  useEffect(() => {
    if (vapi.vapi && !vapi.isConnecting && !vapi.isConnected) {
      console.log('🎙️ VAPI instance ready for connection')
      // VAPI instance is created by the hook, no need to create it here
    }
  }, [vapi.vapi, vapi.isConnecting, vapi.isConnected, session.sessionId])
  
  const handleTranscriptMetricsUpdate = useCallback(() => {
    // Metrics updates happen frequently, no need to log
  }, [])
  
  const handleMetricsUpdate = useCallback(() => {
    // Metrics updates happen frequently, no need to log
  }, [])
  
  const handleMetricsError = useCallback((error: Error) => {
    console.error('[TherapyButton] Metrics error:', error)
  }, [])
  
  const handleSessionUpdate = useCallback(() => {
    // Session updates happen frequently, no need to log
  }, [])

  // Debug log moved to useEffect to prevent logging on every render
  useEffect(() => {
    console.log('🔍 THERAPY BUTTON: Creating transcript handler with sessionId:', session.sessionId || 'EMPTY');
  }, [session.sessionId]);
  
  const transcript = useTranscriptHandler({
    sessionId: session.sessionId, // Pass null instead of empty string to allow proper buffering
    onTranscriptUpdate: handleTranscriptUpdate,
    onMetricsUpdate: handleTranscriptMetricsUpdate
  })
  
  // Update transcript ref when transcript handler changes
  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])

  // Use Supabase realtime for metrics (as consumer to receive updates)
  useSupabaseRealTimeMetrics({
    sessionId: session.sessionId || '',
    userId: user?.id || '',
    role: 'consumer', // Always consumer - the bridge will be the provider
    onMetricsUpdate: handleMetricsUpdate,
    onError: handleMetricsError
  })
  
  // Use Supabase realtime for session state management
  const sessionState = useSupabaseSessionState({
    sessionId: session.sessionId || undefined,
    userId: user?.id || '',
    onSessionUpdate: handleSessionUpdate,
    onVapiPause: vapi.pauseCall,
    onVapiResume: vapi.resumeCall
  })
  
  // Bridge VAPI session with Supabase metrics broadcasting
  useVapiMetricsBridge({
    sessionId: session.sessionId || '',
    userId: user?.id || '',
    vapiState: { isActive: vapi.isConnected, isLoading: vapi.isConnecting },
    transcriptChunks: transcript.transcriptChunks,
    therapyType: therapyType,
    sessionDuration: session.sessionDuration,
    enabled: !!(session.sessionId && vapi.isConnected && !session.isSessionPaused)
  })
  
  // Update session ref when session changes
  useEffect(() => {
    sessionRef.current = session
  }, [session])
  
  // Credit-aware session management
  const sessionWithCredits = useSessionWithCredits()
  
  // Local UI state
  const [showDurationModal, setShowDurationModal] = useState(false)
  const [showFamilySelectionModal, setShowFamilySelectionModal] = useState(false)
  const [showTherapyTypeSelector, setShowTherapyTypeSelector] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)
  const [isRecoveredSession, setIsRecoveredSession] = useState(false)
  const [forceHidePhoneUI, setForceHidePhoneUI] = useState(false)
  const [showTranscriptOverlay, setShowTranscriptOverlay] = useState(false)
  const [hasNewTranscriptMessages, setHasNewTranscriptMessages] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  // Create refs for callbacks to avoid re-renders
  const isLoadingRef = useRef(isLoading)
  const showDurationModalRef = useRef(showDurationModal)
  const showFamilySelectionModalRef = useRef(showFamilySelectionModal)
  
  useEffect(() => {
    isLoadingRef.current = isLoading
    showDurationModalRef.current = showDurationModal
    showFamilySelectionModalRef.current = showFamilySelectionModal
  }, [isLoading, showDurationModal, showFamilySelectionModal])
  
  // Family member management for family therapy
  const {
    familyMembers,
    loading: familyMembersLoading,
    error: familyMembersError,
    removeFamilyMember,
    saveFamilyMembers
  } = useFamilyMembersEnhanced({ autoSave: false })
  
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<Array<{name: string, age: number, relation: string}>>([])
  
  // Mute functionality
  const [isMuted, setIsMuted] = useState(false)
  
  // Recovery deduplication with timestamp tracking for proper cleanup
  const [isProcessingRecovery, setIsProcessingRecovery] = useState(false)
  const recoveryProcessedRef = useRef(new Map<string, number>()) // Map of sessionId -> timestamp
  const lastRecoveryAttemptRef = useRef<number>(0)
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Deferred recovery state for when auth is loading
  const [deferredRecoveryData, setDeferredRecoveryData] = useState<any>(null)
  
  // Timer expiry handling
  const isHandlingExpiryRef = useRef(false)
  
  // Effect to cycle through loading messages
  useEffect(() => {
    if (!isLoading && !vapi.isConnecting) {
      setMessageIndex(0) // Reset when not loading
      return
    }

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [isLoading, vapi.isConnecting])
  
  // Cleanup function for expired sessions
  const cleanupExpiredSession = useCallback(async (sessionId: string, reason: string = 'expired') => {
    console.log(`🧹 Cleaning up expired session ${sessionId}, reason: ${reason}`)
    
    try {
      // End the session via API
      await fetch(`/api/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason,
          forceComplete: true
        })
      })
    } catch (error) {
      console.error('Failed to cleanup expired session:', error)
    }
    
    // Clear all related session storage
    safeSessionStorage.removeItem('session-recovery-pending')
    safeSessionStorage.removeItem('current-session-id')
    safeSessionStorage.removeItem('session-auto-start')
    safeSessionStorage.removeItem(`session-${sessionId}-backup`)
    safeSessionStorage.removeItem(`session-${sessionId}-pause-state`)
    
    // Mark as just ended to prevent recovery
    safeSessionStorage.setItem('session-just-ended', JSON.stringify({
      sessionId: sessionId,
      timestamp: Date.now(),
      reason: reason
    }))
  }, [])

  // Track auth errors locally if needed
  const authError: string | null = null

  // Listen for session recovery auto-start events
  useEffect(() => {
    const handleSessionRecoveryComplete = async (event: CustomEvent) => {
      const { sessionId, sessionData, detectedType, assistant } = event.detail
      const now = Date.now()
      
      // Prevent duplicate processing and React StrictMode double effects
      const previousProcessTime = recoveryProcessedRef.current.get(sessionId)
      if (isProcessingRecovery || 
          (previousProcessTime && (now - previousProcessTime) < RECOVERY_CONSTANTS.COOLDOWN_MS) ||
          (now - lastRecoveryAttemptRef.current) < RECOVERY_CONSTANTS.COOLDOWN_MS) {
        console.log('⚠️ Recovery already processed or in cooldown for session:', sessionId)
        return
      }
      
      // Check if session is expired based on conversation time
      if (sessionData) {
        const conversationTime = sessionData.conversationTimeSeconds || 0
        const duration = sessionData.duration || 30
        const remainingMinutes = duration - (conversationTime / 60)
        
        if (remainingMinutes <= 0) {
          console.log('🚫 Cannot recover expired session, cleaning up...')
          await cleanupExpiredSession(sessionId, 'expired-on-recovery')
          return
        }
        
        // Check if VAPI is already active for this session
        if (vapi.isConnected && session.sessionId === sessionId) {
          console.log('✅ VAPI already active for this session, skipping recovery')
          return
        }
        
        // Check if another session is active
        if (vapi.isConnected && session.sessionId !== sessionId) {
          console.log('⚠️ Another session is active, cannot recover', {
            activeSessionId: session.sessionId,
            recoverySessionId: sessionId
          })
          await cleanupExpiredSession(sessionId, 'another-session-active')
          return
        }
      }
      
      console.log('🔔 TherapyButtonRefactored: Session recovery event received:', event.detail)
      
      // Mark as processing immediately
      setIsProcessingRecovery(true)
      recoveryProcessedRef.current.set(sessionId, now) // Store with timestamp
      lastRecoveryAttemptRef.current = now
      setIsRecoveredSession(true)
      
      // Reset forceHidePhoneUI when recovering a session
      setForceHidePhoneUI(false)
      
      // Clear auto-start data immediately to prevent loops
      safeSessionStorage.removeItem('session-auto-start')
      
      try {
        console.log('🚀 Auto-starting VAPI session for recovered session:', sessionId)
        
        // Check if authentication is still loading
        if (isAuthLoading) {
          console.log('⏳ Authentication still loading, deferring recovery...')
          // Store the recovery data for later processing
          setDeferredRecoveryData({
            sessionId,
            sessionData,
            detectedType,
            assistant,
            event: event.detail
          })
          setIsProcessingRecovery(false)
          recoveryProcessedRef.current.delete(sessionId) // Remove from map on deferral
          return
        }
        
        // Check if there's an authentication error
        if (authError) {
          console.error('❌ Authentication error, cannot recover session:', authError)
          throw new Error(`Authentication failed: ${authError}`)
        }
        
        // First recover the session state in session management
        try {
          // Get session duration from event detail or sessionData
          const duration = event.detail.sessionDuration || sessionData.duration || 30
          console.log('🕐 Recovering session with duration:', duration, 'minutes')
          
          await session.recoverSession({
            sessionId,
            sessionData: {
              ...sessionData,
              duration // Ensure duration is included
            },
            originalStart: sessionData.startTime || new Date().toISOString(),
            conversationTimeSeconds: sessionData.conversationTimeSeconds || 0,
            pauseInfo: sessionData.pauseInfo,
            sessionDuration: duration, // Explicit duration field
            remainingMinutes: Math.floor((duration * 60 - (sessionData.conversationTimeSeconds || 0)) / 60),
            conversationTimeMinutes: (sessionData.conversationTimeSeconds || 0) / 60,
            recoveredAt: new Date().toISOString(),
            autoRestarted: true
          } as SessionRecoveryData)
          
          // Initialize metrics calculator for recovered session
          if (user?.id) {
            initializeSessionMetrics(sessionId, user.id, detectedType as TherapyType, sessionData.duration || 30)
            console.log('📊 Initialized metrics calculator for recovered session:', sessionId)
          }
        } catch (recoveryError) {
          console.error('❌ Failed to recover session state:', recoveryError)
          throw new Error(`Session recovery failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`)
        }
        
        // CRITICAL: Check VAPI readiness before attempting recovery
        if (!vapi.vapi && !vapi.isConnecting) {
          console.error('❌ Cannot recover session: VAPI not initialized')
          
          // Clear recovery data to prevent repeated attempts
          safeSessionStorage.removeItem('session-recovery-pending')
          safeSessionStorage.removeItem('session-auto-start')
          safeSessionStorage.removeItem('current-session-id')
          
          setError(SESSION_ERRORS.RECOVERY_AUTH_ERROR)
          setIsProcessingRecovery(false)
          recoveryProcessedRef.current.delete(sessionId) // Allow retry after auth error
          lastRecoveryAttemptRef.current = 0 // Reset cooldown
          return
        }
        
        // Wait for VAPI to be ready
        let vapiReadyAttempts = 0
        const maxVapiAttempts = RECOVERY_CONSTANTS.VAPI_READY_TIMEOUT_MS / RECOVERY_CONSTANTS.VAPI_READY_CHECK_INTERVAL_MS
        
        while ((vapi.isConnecting || !vapi.vapi) && vapiReadyAttempts < maxVapiAttempts) {
          console.log(`⏳ Waiting for VAPI to be ready... Attempt ${vapiReadyAttempts + 1}/${maxVapiAttempts}`)
          console.log('Connecting:', vapi.isConnecting)
          console.log('Instance exists:', !!vapi.vapi)
          
          await new Promise(resolve => setTimeout(resolve, RECOVERY_CONSTANTS.VAPI_READY_CHECK_INTERVAL_MS))
          vapiReadyAttempts++
        }
        
        // Final check after waiting
        if (!vapi.vapi || vapi.isConnecting) {
          console.error(`❌ VAPI failed to initialize after ${RECOVERY_CONSTANTS.VAPI_READY_TIMEOUT_MS / 1000} seconds`)
          
          // Clear recovery data to prevent repeated attempts
          safeSessionStorage.removeItem('session-recovery-pending')
          safeSessionStorage.removeItem('session-auto-start')
          safeSessionStorage.removeItem('current-session-id')
          
          setError(SESSION_ERRORS.RECOVERY_TIMEOUT)
          setIsProcessingRecovery(false)
          recoveryProcessedRef.current.delete(sessionId) // Allow retry after timeout
          lastRecoveryAttemptRef.current = 0 // Reset cooldown
          return
        }
        
        console.log('✅ VAPI is ready, proceeding with session recovery')
        
        // Check if we should use inline configuration
        const useInlineConfig = process.env.NEXT_PUBLIC_USE_INLINE_ASSISTANT === 'true'
        
        if (useInlineConfig) {
          console.log('🎭 Using inline assistant configuration for recovery')
          
          // Fetch personalized inline configuration
          const recoveryFamilyMembersParam = detectedType === 'family' && sessionData.familyMembers?.length > 0 
            ? `&selectedFamilyMembers=${encodeURIComponent(JSON.stringify(sessionData.familyMembers))}`
            : ''
          
          const response = await fetch(
            `/api/vapi/assistant?personalized=true&therapyType=${detectedType}&duration=${sessionData.duration || 60}&startTime=${encodeURIComponent(sessionData.startTime || new Date().toISOString())}${recoveryFamilyMembersParam}`
          )
          
          if (!response.ok) {
            throw new Error('Failed to fetch assistant configuration for recovery')
          }
          
          const personalizedConfig = await response.json()
          
          // Remove ID and any non-VAPI fields to ensure clean inline configuration
          const inlineConfig = { ...personalizedConfig }
          delete inlineConfig.id
          delete inlineConfig.metadata
          delete inlineConfig.variableValues
          
          // Update first message for recovery
          inlineConfig.firstMessage = 'Welcome back! I can see we were in the middle of our session together. Let\'s continue right where we left off. How are you feeling?'
          
          // Inject conversation history into model.messages with performance optimizations
          if (sessionData.transcript && sessionData.transcript.length > 0 && inlineConfig.model) {
            console.log('💬 Optimizing conversation history for VAPI session...')
            
            // Performance settings
            const MAX_MESSAGES_TO_INJECT = 20 // Limit to prevent token overflow
            const MAX_CONTENT_LENGTH = 500 // Truncate very long messages
            const SUMMARIZE_THRESHOLD = 30 // If more than 30 messages, summarize older ones
            
            // Get the existing system message
            const systemMessage = inlineConfig.model.messages?.[0] || {
              role: "system",
              content: inlineConfig.model.systemPrompt || "You are a helpful assistant."
            }
            
            // Process transcript with performance optimizations
            let processedHistory = []
            const totalMessages = sessionData.transcript.length
            
            if (totalMessages > SUMMARIZE_THRESHOLD) {
              // For long conversations, create a summary of older messages
              const recentMessages = sessionData.transcript.slice(-MAX_MESSAGES_TO_INJECT)
              const olderMessages = sessionData.transcript.slice(0, -MAX_MESSAGES_TO_INJECT)
              
              // Create a summary message for older content
              const summaryMessage = {
                role: "system",
                content: `[Previous Conversation Summary] The session began ${sessionData.duration || 0} minutes ago with ${olderMessages.length} exchanges covering: relationship concerns, communication patterns, and therapeutic progress. The most recent conversation follows.`
              }
              
              // Convert recent messages only
              processedHistory = recentMessages.map((msg: any) => ({
                role: msg.role === 'vapi' ? 'assistant' : msg.role,
                content: msg.text.length > MAX_CONTENT_LENGTH 
                  ? msg.text.substring(0, MAX_CONTENT_LENGTH) + '...' 
                  : msg.text
              }))
              
              // Add summary before recent messages
              processedHistory.unshift(summaryMessage)
            } else {
              // For shorter conversations, include all messages but limit content length
              processedHistory = sessionData.transcript.slice(-MAX_MESSAGES_TO_INJECT).map((msg: any) => ({
                role: msg.role === 'vapi' ? 'assistant' : msg.role,
                content: msg.text.length > MAX_CONTENT_LENGTH 
                  ? msg.text.substring(0, MAX_CONTENT_LENGTH) + '...' 
                  : msg.text
              }))
            }
            
            // Add a concise context message
            const contextMessage = {
              role: "system",
              content: `[Recovered Session] Continuing session ${sessionData.id} after ${sessionData.duration || 0} minutes.`
            }
            
            // Reconstruct messages array with optimized history
            inlineConfig.model.messages = [
              systemMessage,
              contextMessage,
              ...processedHistory
            ]
            
            console.log(`📚 Optimized history: ${processedHistory.length} messages from ${totalMessages} total`)
            
            // Performance tracking
            const estimatedTokens = processedHistory.reduce((sum, msg) => sum + (msg.content.length / 4), 0)
            console.log(`⚡ Performance: ~${Math.round(estimatedTokens)} tokens, payload reduction: ${Math.round((1 - processedHistory.length / totalMessages) * 100)}%`)
          }
          
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
            hasFunctions: !!inlineConfig.model?.tools && inlineConfig.model.tools.length > 0,
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
          await vapi.startCall(assistant.id || getAssistantId(detectedType))
        }
        
        // Ensure session-active class is set for recovered sessions
        setSessionActive(true)
        console.log('🌟 Set session-active for recovered session')
        
        console.log('✅ VAPI session auto-started successfully for recovery')
        
      } catch (error) {
        console.error('❌ Failed to auto-start VAPI session for recovery:', error)
        setError(SESSION_ERRORS.RECOVERY_FAILED)
        // Remove from processed set on error so it can be retried later
        recoveryProcessedRef.current.delete(sessionId)
        lastRecoveryAttemptRef.current = 0 // Reset cooldown on error
      } finally {
        setIsProcessingRecovery(false)
      }
    }
    
    // Add event listener
    window.addEventListener('sessionRecoveryComplete', handleSessionRecoveryComplete as unknown as EventListener)
    
    // Check for existing auto-start flag on mount (in case event was missed)
    const autoStartData = safeSessionStorage.getItem('session-auto-start')
    if (autoStartData && !isProcessingRecovery) {
      try {
        const { sessionId, sessionData, detectedType, timestamp } = JSON.parse(autoStartData)
        
        // Check if already processed
        const previousProcessTime = recoveryProcessedRef.current.get(sessionId)
        if (previousProcessTime) {
          console.log('⚠️ Auto-start data already processed, removing...')
          safeSessionStorage.removeItem('session-auto-start')
          return
        }
        
        // Check if auto-start data is recent (within validity period)
        const age = Date.now() - timestamp
        if (age < RECOVERY_CONSTANTS.AUTO_START_VALIDITY_MS) {
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
          safeSessionStorage.removeItem('session-auto-start')
        }
      } catch (error) {
        console.warn('Failed to parse auto-start data:', error)
        safeSessionStorage.removeItem('session-auto-start')
      }
    }
    
    // Cleanup processed sessions periodically to prevent memory leaks
    const cleanupInterval = setInterval(() => {
      const now = Date.now()
      let cleanedCount = 0
      
      // Clean up entries older than stale data timeout
      for (const [sessionId, timestamp] of recoveryProcessedRef.current) {
        if (now - timestamp > RECOVERY_CONSTANTS.STALE_DATA_MS) {
          recoveryProcessedRef.current.delete(sessionId)
          cleanedCount++
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} old recovery sessions`)
      }
    }, RECOVERY_CONSTANTS.CLEANUP_INTERVAL_MS)
    
    // Cleanup
    return () => {
      window.removeEventListener('sessionRecoveryComplete', handleSessionRecoveryComplete as unknown as EventListener)
      clearInterval(cleanupInterval)
      // Don't update state in cleanup - it causes infinite loops
      // The ref will be reset naturally when component remounts
    }
  }, [vapi, therapyType, user?.id, isAuthLoading, authError, setSessionActive])
  
  // Process deferred recovery when authentication completes
  useEffect(() => {
    if (!isAuthLoading && !authError && deferredRecoveryData) {
      console.log('🔄 Authentication ready, processing deferred recovery...')
      
      // Re-dispatch the recovery event with the stored data
      const recoveryEvent = new CustomEvent('sessionRecoveryComplete', { 
        detail: deferredRecoveryData.event 
      })
      
      // Clear deferred data first to prevent loops
      setDeferredRecoveryData(null)
      
      // Delay to ensure all auth state is fully propagated
      setTimeout(() => {
        window.dispatchEvent(recoveryEvent)
      }, RECOVERY_CONSTANTS.DEFERRED_RECOVERY_DELAY_MS)
    }
  }, [isAuthLoading, authError, deferredRecoveryData])
  
  // Cleanup session-active class on unmount to prevent stuck states
  useEffect(() => {
    return () => {
      // Use refs to avoid stale closures in cleanup
      const currentSessionId = sessionRef.current?.sessionId
      const currentVapiState = vapiInstanceRef.current
      
      // Only remove if no active session exists
      // Don't check state variables in cleanup to avoid infinite loops
      if (!currentSessionId && !currentVapiState) {
        document.body.classList.remove('session-active')
        console.log('🧹 Cleaned up session-active class on component unmount')
      }
    }
  }, []) // Empty deps to run only on mount/unmount
  
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
      setError(AUTH_ERRORS.UNAUTHORIZED)
      return
    }
    
    // Don't allow clicking if already loading or in session
    if (isLoading || vapi.isConnecting || session.sessionId || vapi.isConnected) {
      console.log('⚠️ Therapy button click ignored - already in session or loading')
      return
    }
    
    console.log('🎨 Preparing session - showing duration selection modal')
    
    // Apply background transition but DO NOT set loading state yet
    // This allows the duration modal to be visible and interactive
    
    // 1. Set session-active class for starry night background
    setSessionActive(true)
    console.log('Set session-active for therapy button click')
    
    // 2. Set window flag is handled by setSessionActive
    
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
      // Check if family members are loaded
      if (familyMembersLoading) {
        console.log('⏳ Waiting for family members to load...')
        return
      }
      
      if (familyMembers.length === 0) {
        setError(SESSION_ERRORS.NO_FAMILY_MEMBERS)
        return
      }
      
      setShowFamilySelectionModal(true)
    } else {
      setShowDurationModal(true)
    }
  }, [user, isLoading, vapi.isConnecting, session.sessionId, vapi.isConnected, playClick, therapyType, familyMembersLoading, familyMembers.length])
  
  // Handle duration selection with atomic credit validation and session creation
  const handleDurationSelect = useCallback(async (duration: number, familyMembersOverride?: Array<{name: string, age: number, relation: string}>) => {
    console.log(`🎯 Duration selected: ${duration} minutes`);
    setShowDurationModal(false);
    setIsLoading(true);
    setError(null);
    
    try {
      // Use atomic session creation endpoint that handles credit validation
      const response = await fetch('/api/sessions/create-with-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          duration,
          therapyType: therapyType || 'couple',
          familyMembers: familyMembersOverride || selectedFamilyMembers,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        const errorMessage = result.error?.message || 'Failed to create session';
        const errorCode = result.error?.code;
        
        // Handle specific error codes
        if (errorCode === 'INSUFFICIENT_CREDITS') {
          setError(errorMessage);
          setShowDurationModal(true); // Reopen modal to show credit options
        } else if (errorCode === 'EXISTING_ACTIVE_SESSION' || errorCode === 'CONCURRENT_LIMIT_EXCEEDED') {
          // Show conflict dialog so user can resume or end existing session
          const handled = handleSessionConflict(result.error);
          if (!handled) {
            setError(errorMessage);
          }
        } else {
          setError(errorMessage);
        }
        
        setIsLoading(false);
        return;
      }
      
      // Session created successfully with credits reserved
      const { sessionId, creditsRemaining, concurrentInfo } = result.data;
      
      console.log(`✅ Session created: ${sessionId}`);
      console.log(`💳 Credits remaining: ${creditsRemaining}`);
      console.log(`🔄 Concurrent sessions: ${concurrentInfo.current}/${concurrentInfo.limit}`);
      
      // CRITICAL FIX: Update session management hook state after API creation
      // This ensures session.sessionId is available for transcripts and timer
      safeSessionStorage.setItem('active-session-id', sessionId);
      safeSessionStorage.setItem(`session-${sessionId}-start-time`, new Date().toISOString());
      
      // Save session info for recovery
      safeSessionStorage.setItem('pending-session-id', sessionId);
      safeSessionStorage.setItem('pending-session-duration', duration.toString());
      
      if (familyMembersOverride) {
        safeSessionStorage.setItem('pending-family-members', JSON.stringify(familyMembersOverride));
      }
      
      // Update session management hook with external session data
      session.setExternalSession(sessionId, duration);
      
      // Now start VAPI with the created session
      await startVAPISession(sessionId, duration, familyMembersOverride);
    } catch (error) {
      console.error('Error in session creation:', error);
      setError(error instanceof Error ? error.message : 'Failed to start session');
      setIsLoading(false);
    }
  }, [therapyType, selectedFamilyMembers]);
  
  // Start VAPI session after successful creation
  const startVAPISession = useCallback(async (sessionId: string, duration: number, familyMembersOverride?: Array<{name: string, age: number, relation: string}>) => {
    console.log('🚀 Starting VAPI for session:', sessionId);
    
    try {
      setIsLoading(true);
      setError(null);
      
      // 1. Fetch personalized assistant configuration
      const familyMembersToUse = familyMembersOverride || selectedFamilyMembers;
      const familyMembersParam = therapyType === 'family' && familyMembersToUse?.length > 0 
        ? `&selectedFamilyMembers=${encodeURIComponent(JSON.stringify(familyMembersToUse))}`
        : '';
      
      const assistantResponse = await fetch(
        `/api/vapi/assistant?personalized=true&therapyType=${therapyType}&duration=${duration}&startTime=${encodeURIComponent(new Date().toISOString())}${familyMembersParam}`
      );
      
      if (!assistantResponse.ok) {
        throw new Error('Failed to fetch personalized assistant configuration');
      }
      
      const personalizedConfig = await assistantResponse.json();
      console.log('📋 Got personalized assistant configuration');
      
      // 2. Clean the configuration for inline use
      const inlineConfig = { ...personalizedConfig };
      // Remove fields that shouldn't be in inline config
      delete inlineConfig.id;
      delete inlineConfig.metadata;
      delete inlineConfig.variableValues;
      delete inlineConfig.recordingEnabled;
      delete inlineConfig.hipaaEnabled;
      delete inlineConfig.backgroundDenoisingEnabled;
      delete inlineConfig.responseDelaySeconds;
      delete inlineConfig.llmRequestDelaySeconds;
      delete inlineConfig.numWordsToInterruptAssistant;
      
      // 3. Validate VAPI configuration
      if (!inlineConfig.model || !inlineConfig.voice || !inlineConfig.transcriber) {
        console.error('Invalid VAPI config:', inlineConfig);
        throw new Error('Invalid assistant configuration');
      }
      
      console.log('✅ VAPI validation passed, starting call...');
      
      // 4. Check JWT token availability - wait if still loading
      // Always use the ref to get the most current token value
      let finalApiKey = tokenStateRef.current.token || vapiApiKey;
      
      if (!finalApiKey) {
        // Check current token state
        if (tokenStateRef.current.loading) {
          console.log('⏳ JWT token still loading, waiting for it to complete...');
          // Wait up to 5 seconds for token to load
          let waitTime = 0;
          const maxWait = 5000;
          const checkInterval = 100;
          
          while (tokenStateRef.current.loading && waitTime < maxWait) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waitTime += checkInterval;
          }
          
          console.log(`⏱️ Waited ${waitTime}ms for token. Loading: ${tokenStateRef.current.loading}, Token available: ${!!tokenStateRef.current.token}`);
          
          // After waiting, check if we have the token now
          if (!tokenStateRef.current.token) {
            if (tokenStateRef.current.error) {
              throw new Error(`VAPI authentication failed: ${tokenStateRef.current.error}`);
            } else {
              throw new Error('VAPI JWT token failed to load after waiting - please try again');
            }
          }
          
          finalApiKey = tokenStateRef.current.token;
        } else {
          console.error('VAPI JWT token not available:', {
            token: !!tokenStateRef.current.token,
            tokenError: tokenStateRef.current.error
          });
          
          // Provide helpful error message
          if (tokenStateRef.current.error) {
            throw new Error(`VAPI authentication failed: ${tokenStateRef.current.error}`);
          } else {
            throw new Error('VAPI JWT token not available - check server configuration');
          }
        }
      }
      
      if (!finalApiKey) {
        throw new Error('Unable to obtain VAPI authentication token');
      }
      
      console.log('🔑 Using VAPI authentication:', {
        type: 'JWT Token',
        source: 'JWT Service'
      });
      
      // 5. Ensure VAPI instance is ready
      // First check if singleton manager already has the instance
      let vapiInstance = vapiInstanceManager.getCurrentInstance();
      
      if (!vapiInstance && !vapi.vapi) {
        console.log('⏳ VAPI instance not ready, requesting from manager...', {
          hasApiKey: !!finalApiKey,
          keyType: 'JWT',
          managerReady: vapiInstanceManager.isReady()
        });
        
        // Request instance from manager directly
        try {
          vapiInstance = await vapiInstanceManager.getOrCreateInstance(finalApiKey);
          console.log('✅ VAPI instance obtained from manager');
        } catch (error) {
          console.error('Failed to get VAPI instance from manager:', error);
          
          // Fallback: wait for hook to initialize
          await new Promise(resolve => setTimeout(resolve, 500));
          
          if (!vapi.vapi) {
            throw new Error('VAPI instance failed to initialize - check API key and console logs');
          }
          vapiInstance = vapi.vapi;
        }
      } else {
        vapiInstance = vapi.vapi || vapiInstance;
        console.log('✅ VAPI instance already available');
      }
      
      if (!vapiInstance) {
        throw new Error('VAPI instance could not be obtained');
      }
      
      // Start VAPI session with the instance
      console.log('🚀 Starting VAPI call with configuration...');
      await vapiInstance.start(inlineConfig);
      
      // 6. Set session active state
      setSessionActive(true);
      console.log('📞 VAPI started, starting conversation timer');
      
      // 7. Set up audio analyzer
      console.log('🎤 Setting up audio analyzer...');
      
    } catch (error) {
      console.error('❌ Failed to start VAPI session:', error);
      setError(error instanceof Error ? error.message : 'Failed to start voice session');
      setSessionActive(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user, therapyType, selectedFamilyMembers, vapi, setSessionActive, vapiApiKey]);
  
  // Handle ending existing session and starting new one
  const handleEndAndStartNew = useCallback(async () => {
    if (!conflictSession) return

    try {
      // Close the conflict dialog
      setIsConflictDialogOpen(false)
      setIsLoading(true)

      // Force-end the existing session
      console.log(`🔄 Force-ending existing session: ${conflictSession.id}`)
      const endResponse = await fetch(`/api/sessions/${conflictSession.id}/force-end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'User started new session' }),
      })

      if (!endResponse.ok) {
        // Fallback: try the cleanup endpoint
        await fetch('/api/sessions/cleanup-stale', { method: 'POST' })
      }

      console.log('✅ Existing session ended, reopening duration modal')
      setIsLoading(false)

      // Reopen the duration modal so user can start fresh
      setShowDurationModal(true)
    } catch (error) {
      console.error('Failed to end existing session:', error)
      setError('Failed to end existing session. Please try again.')
      setIsLoading(false)
    }
  }, [conflictSession])

  // Track if redirect is in progress to prevent duplicates
  const redirectInProgressRef = useRef(false)
  const endSessionInProgressRef = useRef(false)
  
  // Handle end session
  const handleEndSession = useCallback(async () => {
    // Prevent multiple simultaneous end session calls
    if (endSessionInProgressRef.current) {
      console.log('⚠️ End session already in progress, ignoring duplicate call')
      return
    }
    
    endSessionInProgressRef.current = true
    
    try {
      // CRITICAL: Force hide phone UI immediately to prevent any visual glitches
      setForceHidePhoneUI(true)
      
      // FIXED: Don't set loading state when ending session to avoid confusing "Preparing" message
      // The loading state was designed for starting sessions, not ending them
      
      // Store sessionId before it gets cleared
      const currentSessionId = session.sessionId
      
      // Stop VAPI call first
      await vapi.endSession()
      
      // End session through both systems for proper synchronization
      // NOTE: Both hooks make the same API call to ensure they work independently.
      // The session completion lock in the API prevents race conditions.
      await Promise.all([
        session.endSession(),        // Handles metrics calculation and API call
        sessionState.endSession()     // Handles state broadcast and API call
      ])
      
      setError(null)
      
      // Remove session-active class to return to inactive state
      setSessionActive(false)
      
      // Clear any session recovery data
      safeSessionStorage.removeItem('session-recovery-pending')
      safeSessionStorage.removeItem('current-session-id')
      safeSessionStorage.removeItem('session-auto-start')
      
      // CRITICAL: Mark session as just ended to prevent recovery attempts
      if (currentSessionId) {
        safeSessionStorage.setItem('session-just-ended', JSON.stringify({
          sessionId: currentSessionId,
          timestamp: Date.now()
        }))
        console.log('🚫 Marked session as just ended to prevent recovery')
      }
      
      // Cleanup metrics calculator
      if (currentSessionId) {
        cleanupSessionMetrics(currentSessionId)
        console.log('🧹 Cleaned up metrics calculator for session:', currentSessionId)
      }
      
      // FIXED: Immediately clear UI state since we're not using loading anymore
      // Reset forceHidePhoneUI after session cleanup completes
      setForceHidePhoneUI(false)
      // Ensure session-active class is removed
      document.body.classList.remove('session-active')
      console.log('✅ Session ended, UI reset to inactive state')
      
      // Dispatch events to notify UI components
      window.dispatchEvent(new Event('sessionEnded'))
      window.dispatchEvent(new Event('creditUpdate')) // Trigger credit display update
      
      // Navigate to dashboard after session ends successfully
      // Check if redirect hasn't already been triggered
      if (!redirectInProgressRef.current && router) {
        redirectInProgressRef.current = true
        console.log('🚀 Navigating to dashboard after session end')
        
        setTimeout(() => {
          try {
            router.push('/dashboard')
          } catch (navError) {
            console.error('Failed to navigate to dashboard:', navError)
            // Fallback to window.location if router fails
            if (typeof window !== 'undefined') {
              window.location.href = '/dashboard'
            }
          }
        }, 500) // Small delay to ensure all cleanup is complete
      }
      
    } catch (error) {
      console.error('[TherapyButton] Failed to end session:', error)
      setError(error instanceof Error ? error.message : 'Failed to end session')
      // Still reset UI on error - no loading state to clear anymore
      setForceHidePhoneUI(false)
      setSessionActive(false)
    } finally {
      // Reset the flag after a delay to allow for potential retries
      setTimeout(() => {
        endSessionInProgressRef.current = false
      }, 2000)
    }
  }, [vapi, session, sessionState, setSessionActive, router])

  // Keep handleEndSessionRef in sync so handleVapiCallEnd can call it
  useEffect(() => {
    handleEndSessionRef.current = handleEndSession
  }, [handleEndSession])

  // Handle pause/resume with proper VAPI stop/restart to prevent billing
  const handlePauseResume = useCallback(async () => {
    // Debounce to prevent rapid clicking - check and set atomically
    if (pauseResumeDebounceRef.current) {
      console.log('⏱️ Pause/resume operation in progress, ignoring rapid click...')
      return
    }
    
    // Set debounce immediately to prevent race conditions
    pauseResumeDebounceRef.current = setTimeout(() => {
      pauseResumeDebounceRef.current = null
      console.log('⏱️ Pause/resume debounce cleared')
    }, 300) // 300ms debounce as per spec
    
    try {
      if (sessionState.isPaused) {
        // RESUME: Full VAPI restart with saved state
        console.log('🔄 Starting resume process...')
        
        // Set transitioning state to preserve UI
        setIsTransitioning(true)
        
        // Preserve UI state during transition
        const currentSessionActive = sessionActiveManaged.current
        
        // Resume through sessionState which will trigger onVapiResume callback
        await sessionState.resumeSession()
        
        // Wait for VAPI to fully initialize and inject conversation history
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Say personalized welcome back message after VAPI is connected and history is loaded
        if (vapi.vapi && typeof vapi.vapi.say === 'function') {
          try {
            const welcomeBackMessage = therapyType === 'couple' 
              ? "Welcome back. I can see our conversation history has been restored. Take a moment to settle back in, and when you're ready, we can continue from where we left off. How are you both feeling right now?"
              : therapyType === 'family'
              ? "Welcome back, everyone. I've restored our conversation, and I'm ready to continue when you are. Let's take a collective breath and pick up our discussion. How is everyone doing?"
              : "Welcome back. Our conversation has been restored, and I'm here to continue supporting you. Take your time to get comfortable again. How are you feeling in this moment?"
            
            vapi.vapi.say(welcomeBackMessage, false)
          } catch (error) {
            console.warn('Could not say welcome back message:', error)
          }
        }
        
        // Restore session-active state
        if (currentSessionActive) {
          setSessionActive(true)
        }
        
        // CRITICAL: Restart conversation timer after resume
        // The timer should continue from where it left off
        console.log('⏱️ Restarting conversation timer after resume')
        session.startConversationTimer(session.sessionId || undefined)
        
        // Force UI components to refresh after a delay
        // Use requestIdleCallback for better performance
        const refreshUI = () => {
          window.dispatchEvent(new Event('sessionResumed'))
          window.dispatchEvent(new Event('vapiReconnected'))
          setIsTransitioning(false)
        }
        
        if ('requestIdleCallback' in window) {
          const windowWithIdleCallback = window as Window & { requestIdleCallback: (cb: () => void, options?: { timeout: number }) => void }
          windowWithIdleCallback.requestIdleCallback(refreshUI, { timeout: 1500 })
        } else {
          setTimeout(refreshUI, 1000)
        }
        
        console.log('✅ Resume complete')
        
      } else {
        // PAUSE: Save state and stop VAPI to prevent billing
        console.log('⏸️ Starting pause process...')
        
        // Set transitioning state
        setIsTransitioning(true)
        
        // Announce pause before stopping
        if (vapi.vapi && typeof vapi.vapi.say === 'function') {
          vapi.vapi.say("I'll pause our session. Your time won't be billed while paused. See you when you're ready.", false)
          // Give time for message to be spoken
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
        
        // Pause through sessionState which will trigger onVapiPause callback
        // This saves conversation state, stops VAPI, and updates the database
        await sessionState.pauseSession()
        
        // Keep UI in session-active state during pause
        setSessionActive(true)
        
        // Dispatch event for UI components after a delay
        const notifyPause = () => {
          window.dispatchEvent(new Event('sessionPaused'))
          window.dispatchEvent(new Event('vapiDisconnected'))
          setIsTransitioning(false)
        }
        
        if ('requestIdleCallback' in window) {
          const windowWithIdleCallback = window as Window & { requestIdleCallback: (cb: () => void, options?: { timeout: number }) => void }
          windowWithIdleCallback.requestIdleCallback(notifyPause, { timeout: 750 })
        } else {
          setTimeout(notifyPause, 500)
        }
        
        console.log('✅ Pause complete - VAPI stopped, billing paused')
      }
    } catch (error) {
      console.error('Failed to pause/resume:', error)
      setError(error instanceof Error ? error.message : 'Failed to pause/resume')
      setIsTransitioning(false)
      
      // Clear debounce on error to allow retry
      if (pauseResumeDebounceRef.current) {
        clearTimeout(pauseResumeDebounceRef.current)
        pauseResumeDebounceRef.current = null
      }
    }
  }, [sessionState, vapi, setSessionActive])
  
  // Handle time updates from the timer
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleTimeUpdate = useCallback((_remainingMinutes: number, _remainingSeconds: number) => {
    // Time updates are for display/logging purposes only
    // All time warnings are handled by useSessionManagementV2's onTimeWarning callback
    // Timer expiration is handled by handleTimerExpire callback
  }, [])

  // Handle timer expiration
  const handleTimerExpire = useCallback(() => {
    // Prevent multiple expiry handling
    if (isHandlingExpiryRef.current || session.isEndingSession) {
      console.log('⚠️ Timer expiry already being handled, skipping...')
      return
    }
    
    isHandlingExpiryRef.current = true
    console.log('⏰ Timer expired, ending session gracefully...')
    
    // Use VAPI say() to provide a graceful ending message
    if (vapi.vapiManagerRef.current && vapi.vapiState.isActive) {
      try {
        // Have VAPI say goodbye and end the call after speaking
        let goodbyeMessage = '';
        
        if (therapyType === 'couple') {
          goodbyeMessage = "And with that, our time together comes to an end for today. Thank you both for your openness and willingness to engage with each other. I hope you'll take some time this week to practice what we discussed - whether that's the specific action step you identified or simply being more mindful of how you communicate with each other. Remember, progress happens in small moments. Take care of each other, and I look forward to hearing how things go. Until next time, goodbye!";
        } else if (therapyType === 'family') {
          goodbyeMessage = "Well, that brings us to the end of our session today. I want to thank each of you for participating and for being willing to share and listen to one another. Remember the goal we set together - even small steps toward that goal count as progress. Keep supporting each other this week. Take care, everyone, and I'll see you all next time. Goodbye!";
        } else {
          const userName = user?.name ? user.name.split(' ')[0] : '';
          if (userName) {
            goodbyeMessage = `${userName}, our time is up for today. Thank you for trusting me with your thoughts and feelings. Whether you chose to continue exploring or to reflect on our session, I hope you're leaving with something meaningful. Remember the insights or action steps we identified - you have the strength to work with them this week. Be gentle with yourself, and I look forward to hearing how things unfold. Take care, and goodbye!`;
          } else {
            goodbyeMessage = "Our session has come to an end for today. Thank you for your openness and willingness to explore what's on your mind. I hope you're taking something valuable from our conversation - whether it's a new insight, a different perspective, or simply the experience of being heard. Remember to practice self-compassion this week. I look forward to continuing our work together. Take care, and goodbye!";
          }
        }
        
        if (vapi.vapi && typeof vapi.vapi.say === 'function') {
          vapi.vapi.say(goodbyeMessage, true);
        }
        console.log('📤 Sent graceful goodbye message to VAPI');
        
        // Give VAPI time to say goodbye before ending the session
        setTimeout(() => {
          handleEndSession();
          isHandlingExpiryRef.current = false; // Reset after handling
        }, 5000); // 5 seconds for goodbye message (longer messages need more time)
      } catch (error) {
        console.error('Failed to send goodbye message to VAPI:', error);
        // Fall back to immediate end if VAPI fails
        handleEndSession();
        isHandlingExpiryRef.current = false; // Reset on error
      }
    } else {
      // No active VAPI connection, end immediately
      handleEndSession();
      isHandlingExpiryRef.current = false; // Reset when no VAPI
    }
  }, [handleEndSession, vapi, therapyType, session.isEndingSession, user]) // Include user for personalized goodbye

  // Check for VAPI function call session end request
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
    setSessionActive(false)
    console.log('🔙 Family selection modal cancelled - reverting UI state')
  }, [setSessionActive])

  const handleTherapyTypeChange = useCallback((newTherapyType: TherapyType) => {
    console.log('🔄 Switching therapy type to:', newTherapyType)
    setShowTherapyTypeSelector(false)
    setTherapyType(newTherapyType)
    
    // If session is active, show a message that they need to end current session first
    if (session.sessionId || vapi.isConnected) {
      setError('Please end your current session before switching therapists')
      return
    }
  }, [session.sessionId, vapi.isConnected])

  const handleRemoveFamilyMember = useCallback(async (index: number) => {
    // Find the family member by index
    const memberToRemove = familyMembers[index]
    if (memberToRemove && memberToRemove.id) {
      removeFamilyMember(memberToRemove.id)
      // Save the changes to the backend
      await saveFamilyMembers()
    }
  }, [familyMembers, removeFamilyMember, saveFamilyMembers])
  
  // Track new transcript messages
  useEffect(() => {
    if (transcript.transcriptChunks.length > 0 && !showTranscriptOverlay) {
      setHasNewTranscriptMessages(true)
    }
  }, [transcript.transcriptChunks.length, showTranscriptOverlay])
  
  // Reset new message indicator when overlay opens
  const handleOpenTranscriptOverlay = useCallback(() => {
    setShowTranscriptOverlay(true)
    setHasNewTranscriptMessages(false)
  }, [])
  
  const handleCloseTranscriptOverlay = useCallback(() => {
    setShowTranscriptOverlay(false)
  }, [])

  
  // Monitor session state and ensure session-active class is in sync
  useEffect(() => {
    const hasActiveSession = !!(session.sessionId || vapi.isConnected || isLoading || showDurationModal || showFamilySelectionModal)
    
    if (hasActiveSession && !sessionActiveManaged.current) {
      console.log('[Session Monitor] Detected active session, ensuring session-active class')
      setSessionActive(true)
    } else if (!hasActiveSession && sessionActiveManaged.current && !forceHidePhoneUI) {
      console.log('[Session Monitor] No active session, ensuring session-active class removed')
      setSessionActive(false)
    }
  }, [session.sessionId, vapi.isConnected, isLoading, showDurationModal, showFamilySelectionModal, forceHidePhoneUI, setSessionActive])
  
  // Monitor VAPI state and ensure conversation timer is in sync
  useEffect(() => {
    // Only run if we have an active session
    if (!session.sessionId || !vapi.isConnected) return
    
    // Check every 10 seconds if conversation timer needs to be restarted
    const syncInterval = setInterval(() => {
      // If VAPI is active but conversation timer is not, restart it
      if (vapi.isConnected && !session.isSessionPaused && session.conversationStartTime === null) {
        console.log('⚠️ VAPI active but conversation timer not running, restarting...')
        session.startConversationTimer(session.sessionId || undefined)
      }
      
      // Log sync status for monitoring
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 VAPI-Timer Sync Check:', {
          vapiActive: vapi.isConnected,
          sessionPaused: session.isSessionPaused,
          conversationActive: session.conversationStartTime !== null,
          conversationTime: session.conversationTimeSeconds
        })
      }
    }, 10000) // Check every 10 seconds
    
    return () => clearInterval(syncInterval)
  }, [session.sessionId, vapi.isConnected, session.isSessionPaused, session.conversationStartTime, session.conversationTimeSeconds])
  
  // Listen for explicit session end event to ensure proper cleanup
  useEffect(() => {
    const handleSessionEnded = () => {
      console.log('[Session Monitor] Received sessionEnded event, ensuring complete cleanup')
      // Force remove session-active class
      document.body.classList.remove('session-active')
      // Clear any lingering recovery data
      safeSessionStorage.removeItem('session-recovery-pending')
      safeSessionStorage.removeItem('current-session-id')
      safeSessionStorage.removeItem('session-auto-start')
      // Dispatch state change event
      window.dispatchEvent(new Event('sessionStateChanged'))
    }
    
    window.addEventListener('sessionEnded', handleSessionEnded)
    return () => window.removeEventListener('sessionEnded', handleSessionEnded)
  }, [])
  
  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      // Cleanup all timeout refs
      if (pauseResumeDebounceRef.current) {
        clearTimeout(pauseResumeDebounceRef.current)
        pauseResumeDebounceRef.current = null
      }
      if (sessionActiveTimeoutRef.current) {
        clearTimeout(sessionActiveTimeoutRef.current)
        sessionActiveTimeoutRef.current = null
      }
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current)
        cleanupTimeoutRef.current = null
      }
    }
  }, [])
  
  // Handle VAPI connection events for smoother transitions
  useEffect(() => {
    const handleVapiReconnected = () => {
      console.log('🔄 VAPI reconnected, refreshing UI components')
      // Force a re-render of audio-dependent components
      if (vapi.vapi) {
        const vapiInstance = vapi.vapi
        if (vapiInstance) {
          // Trigger audio level update
          vapiInstance.emit('volume-level', { volume: 0 })
        }
      }
    }
    
    const handleVapiDisconnected = () => {
      console.log('🔌 VAPI disconnected, preserving UI state')
    }
    
    window.addEventListener('vapiReconnected', handleVapiReconnected)
    window.addEventListener('vapiDisconnected', handleVapiDisconnected)
    
    return () => {
      window.removeEventListener('vapiReconnected', handleVapiReconnected)
      window.removeEventListener('vapiDisconnected', handleVapiDisconnected)
    }
  }, [vapi])

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (pauseResumeDebounceRef.current) {
        clearTimeout(pauseResumeDebounceRef.current)
        pauseResumeDebounceRef.current = null
      }
    }
  }, [])

  // Get therapist name based on therapy type
  const getTherapistName = () => {
    switch (therapyType) {
      case 'solo': return 'Dr. Elliot Mackaphy'
      case 'family': return 'Dr. Jada Pearson'
      case 'couple':
      default: return 'Dr. Maya Thompson'
    }
  }

  // Get therapist image based on therapy type
  const getTherapistImage = () => {
    switch (therapyType) {
      case 'solo': return '/images/dr-elliot-mackaphy.webp'
      case 'family': return '/images/dr-jada-pearson.webp'
      case 'couple':
      default: return '/images/dr-maya-thompson.webp'
    }
  }
  
  // Render different states
  // Show authentication loading state first
  if (isAuthLoading && !session.sessionId) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Authenticating...</p>
      </div>
    )
  }
  
  // Show authentication error if present and no active session
  if (authError && !session.sessionId && !vapi.isConnected) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-700">Authentication Error</p>
          <p className="text-red-600 text-sm mt-1">{authError}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    )
  }
  
  // Show session UI if we have a session ID OR if VAPI reports as active OR if loading OR if recovered session OR if transitioning
  // This ensures the phone container appears immediately when starting a session
  // But also ensures it hides properly when session ends
  const showPhoneUI = (session.sessionId || vapi.isConnected || vapi.isConnecting || isLoading || isRecoveredSession || isTransitioning || sessionState.isPaused) && !session.isEndingSession && !forceHidePhoneUI
  
  if (showPhoneUI || isLoading) {

    // Active session UI with proper phone container
    return (
      <div className="flex flex-col items-center w-full max-w-full sm:max-w-lg mx-auto px-2" style={{
        position: 'relative',
        zIndex: 10000
      }}>
        {/* iPhone chassis wrapper */}
        <motion.div
          className="relative mx-auto"
          animate={{ y: 0, opacity: 1, scale: 1 }}
          initial={{ opacity: 0, scale: 0.9 }}
          transition={{
            duration: 0.8,
            type: "spring",
            damping: 25,
            stiffness: 80,
            delay: isRecoveredSession ? 0.5 : 0
          }}
          style={{
            width: '320px',
            maxWidth: '90vw',
            height: 'calc(100vh - 80px)',
            maxHeight: '720px',
            minHeight: '420px',
          }}
        >
          {/* Side buttons - Left (Silent switch + Volume) */}
          <div className="absolute -left-[3px] top-[80px] w-[3px] h-[20px] rounded-l-sm bg-gradient-to-r from-zinc-500 to-zinc-600" />
          <div className="absolute -left-[3px] top-[120px] w-[3px] h-[36px] rounded-l-sm bg-gradient-to-r from-zinc-500 to-zinc-600" />
          <div className="absolute -left-[3px] top-[164px] w-[3px] h-[36px] rounded-l-sm bg-gradient-to-r from-zinc-500 to-zinc-600" />
          {/* Side button - Right (Power) */}
          <div className="absolute -right-[3px] top-[140px] w-[3px] h-[48px] rounded-r-sm bg-gradient-to-l from-zinc-500 to-zinc-600" />

          {/* Phone frame (titanium-style bezel) */}
          <div
            className="absolute inset-0 rounded-[44px] pointer-events-none"
            style={{
              background: 'linear-gradient(145deg, #3a3a3c, #2c2c2e, #1c1c1e)',
              padding: '3px',
              boxShadow: `
                0 0 0 1px rgba(255,255,255,0.08),
                0 20px 60px rgba(0,0,0,0.6),
                0 8px 20px rgba(0,0,0,0.4),
                inset 0 1px 0 rgba(255,255,255,0.1)
              `,
            }}
          >
            <div className="w-full h-full rounded-[41px] bg-black" />
          </div>

          {/* Screen area (inside the bezel) */}
          <div
            className="absolute rounded-[41px] overflow-hidden flex flex-col"
            style={{
              top: '3px',
              left: '3px',
              right: '3px',
              bottom: '3px',
              zIndex: 9999,
            }}
        >
            {/* Dynamic Island */}
            <div className="flex justify-center pt-2 pb-1 bg-black relative z-20">
              <div className="w-[90px] h-[24px] sm:w-[100px] sm:h-[26px] bg-black rounded-full border border-zinc-800/50 flex items-center justify-center gap-2">
                <div className="w-[8px] h-[8px] rounded-full bg-zinc-900 ring-1 ring-zinc-700/50" />
              </div>
            </div>

          {/* Call Header */}
          <CallHeader
            therapistName={getTherapistName()}
            therapistImage={getTherapistImage()}
            isPaused={sessionState.isPaused}
            isVisible={!isLoading && !vapi.isConnecting}
          />
          
          {/* Loading Animation - Show when loading but call not started */}
          {/* For recovered sessions, show UI immediately even if VAPI is still initializing */}
          {(isLoading || vapi.isConnecting) && !isRecoveredSession ? (
            <motion.div 
              className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-gradient-to-b from-black/90 via-black/95 to-black rounded-[41px] backdrop-blur-sm"
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
              <div className="px-4 sm:px-6 pb-3 sm:pb-4 flex flex-col items-center justify-between flex-1 overflow-y-auto bg-black">
                {/* Security Notice */}
                <div className="text-center py-1 text-gray-300 text-xs">
                  <span>End-to-end encrypted</span>
                </div>

                {/* Therapist Avatar */}
                <div className="py-2 sm:py-3 relative">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden shadow-lg mb-2 sm:mb-3 border-2 border-blue-300 mx-auto relative">
                    <Image
                      src={getTherapistImage()}
                      alt={getTherapistName()}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 96px, 112px"
                      priority
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-white text-center text-base sm:text-lg font-medium">
                      {getTherapistName()}
                    </p>
                    <button
                      onClick={() => setShowTherapyTypeSelector(true)}
                      className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                      aria-label="Switch therapist"
                    >
                      <svg 
                        className="w-5 h-5" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="2" 
                          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Voice Waveform */}
                <div className="w-full my-2 sm:my-3 relative">
                  <VoiceWaveform 
                    audioLevel={isMuted || sessionState.isPaused ? 0 : (vapi.audioLevel ?? 0)} 
                    isTransitioning={isTransitioning}
                  />
                  {isMuted && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full animate-pulse shadow-md">
                        Microphone Muted
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Session Timer V2 with react-timer-hook */}
                <div className="text-center py-1 sm:py-2">
                  {session.sessionDuration && (!isRecoveredSession || (isRecoveredSession && !isProcessingRecovery)) ? (
                    <SessionTimerV2
                      sessionId={session.sessionId || ''}
                      durationMinutes={session.sessionDuration}
                      conversationTimeSeconds={session.conversationTimeSeconds}
                      isConversationActive={vapi.isConnected && !sessionState.isPaused}
                      isPaused={sessionState.isPaused || session.isSessionPaused}
                      className="text-white"
                      showRecoveredIndicator={session.sessionRecovered}
                      onTimeUpdate={handleTimeUpdate}
                      onExpire={handleTimerExpire}
                    />
                  ) : (
                    <div className="text-white font-mono text-lg sm:text-xl font-bold">
                      {isRecoveredSession && isProcessingRecovery ? (
                        <span className="animate-pulse">--:--</span>
                      ) : (
                        <p className="text-base sm:text-lg">
                          <span className="text-green-400">●</span> Active
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Call Controls using extracted component */}
                <CallControls
                  isMuted={isMuted}
                  isSessionPaused={sessionState.isPaused}
                  totalPausedTimeSeconds={session.totalPausedTimeSeconds || sessionState.session?.totalPausedTimeSeconds || 0}
                  conversationTimeSeconds={session.conversationTimeSeconds}
                  isLoading={vapi.isConnecting || isLoading}
                  onMuteToggle={toggleMute}
                  onEndCall={handleEndSession}
                  onPauseResume={handlePauseResume}
                />
              </div>
            </>
          )}
          
          {/* Paused Overlay */}
          <PausedOverlay
            isPaused={sessionState.isPaused}
            totalPausedMinutes={Math.floor((session.totalPausedTimeSeconds || sessionState.session?.totalPausedTimeSeconds || 0) / 60)}
            onResume={handlePauseResume}
          />

            {/* Home indicator bar */}
            <div className="flex justify-center py-2 bg-black mt-auto">
              <div className="w-[100px] h-[4px] rounded-full bg-zinc-600" />
            </div>
          </div>{/* End screen area */}
        </motion.div>{/* End iPhone chassis */}
        
        {/* Session status message */}
        {(vapi.isConnected || sessionState.isPaused) && (
          <p className={`mt-4 font-medium text-sm sm:text-base opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards] text-center ${sessionState.isPaused ? 'text-orange-500' : 'text-green-600'}`}>
            {sessionState.isPaused ? 'Session paused - click Resume to continue' : 'Session active - speak with our AI therapist'}
          </p>
        )}
        
        {/* Live Transcript Button - Only show when session is active and on mobile */}
        {!isLoading && !vapi.isConnecting && vapi.isConnected && (
          <div className="mt-4 flex justify-center sm:hidden">
            <LiveTranscriptButton 
              onClick={handleOpenTranscriptOverlay}
              hasNewMessages={hasNewTranscriptMessages}
            />
          </div>
        )}
        
        {/* Transcript Overlay for Mobile */}
        <TranscriptOverlay
          isOpen={showTranscriptOverlay}
          onClose={handleCloseTranscriptOverlay}
          sessionId={session.sessionId || ''}
          therapistName={getTherapistName()}
          therapyType={therapyType}
          transcriptChunks={transcript.transcriptChunks.map((chunk, index) => ({
            id: `chunk-${index}`,
            speaker: chunk.startsWith('AI:') ? 'therapist' : 'user',
            text: chunk.replace(/^(AI:|User:)\s*/, ''),
            timestamp: new Date().toISOString(),
            isFinal: true
          }))}
        />
        
        {/* Error Display */}
        {error && (
          <ErrorDisplay 
            error={error}
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
          disabled={disabled || vapi.isConnecting || session.isEndingSession || isLoading || (!vapiApiKey && tokenLoading)}
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
          {vapi.isConnecting || session.isEndingSession || isLoading ? (
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
            key="duration-modal"
            isOpen={showDurationModal}
            onClose={() => {
              setShowDurationModal(false)
              // Reset UI state if user cancels the modal
              setIsLoading(false)
              setSessionActive(false)
              console.log('🔙 Duration modal cancelled - reverting UI state')
            }}
            onSelectDuration={handleDurationSelect}
            therapyType={therapyType}
          />
        )}
        
        {showFamilySelectionModal && (
          <FamilyMemberSelectionModal
            key="family-selection-modal"
            isOpen={showFamilySelectionModal}
            onClose={handleFamilySelectionClose}
            onSelectMembers={handleFamilyMembersSelected}
            familyMembers={familyMembers.map(member => ({
              name: member.name,
              age: member.age || 0,
              relation: member.relation || ''
            }))}
            onRemoveMember={handleRemoveFamilyMember}
            isLoading={vapi.isConnecting || familyMembersLoading}
          />
        )}
        
        {/* Note: ActiveSessionFoundModal manages its own visibility based on sessionStorage */}
        
        {/* Session conflict dialog */}
        {isConflictDialogOpen && (
          <SessionConflictDialog
            key="session-conflict-dialog"
            open={isConflictDialogOpen}
            onOpenChange={setIsConflictDialogOpen}
            existingSession={conflictSession}
            onResume={resumeExistingSession}
            onEndAndStartNew={handleEndAndStartNew}
            formatTime={formatSessionTime}
          />
        )}
        
        {/* Therapy Type Selector Modal */}
        {showTherapyTypeSelector && (
          <TherapyTypeSelector
            key="therapy-type-selector"
            isOpen={showTherapyTypeSelector}
            onClose={() => setShowTherapyTypeSelector(false)}
            onSelect={handleTherapyTypeChange}
            hasFamilyMembers={familyMembers.length > 0}
            familyMembersLoading={familyMembersLoading}
            hasPartner={user?.hasPartner || false}
            profileLoading={isAuthLoading}
            currentTherapyType={therapyType}
          />
        )}
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
})

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