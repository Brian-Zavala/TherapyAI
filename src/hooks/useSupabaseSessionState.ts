// @ts-nocheck
/**
 * useSupabaseSessionState Hook
 * Manages session state using Supabase Realtime
 * Handles database changes, broadcast events, and presence
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase-singleton'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { 
  REALTIME_CHANNELS, 
  REALTIME_EVENTS, 
  REALTIME_CONFIG,
  type SessionStatePayload,
  type SessionPresencePayload 
} from '@/lib/supabase-realtime-config'
import type { Session } from '@prisma/client'

interface UseSupabaseSessionStateOptions {
  sessionId?: string
  userId: string
  onSessionUpdate?: (session: Partial<Session>) => void
  onPresenceUpdate?: (users: SessionPresencePayload[]) => void
  autoSubscribe?: boolean
  onVapiPause?: (sessionId: string) => Promise<string | null>
  onVapiResume?: (sessionId: string) => Promise<void>
}

interface SessionState {
  session: Partial<Session> | null
  isActive: boolean
  isPaused: boolean
  onlineUsers: SessionPresencePayload[]
  isConnected: boolean
  error: string | null
}

export function useSupabaseSessionState({
  sessionId,
  userId,
  onSessionUpdate,
  onPresenceUpdate,
  autoSubscribe = true,
  onVapiPause,
  onVapiResume,
}: UseSupabaseSessionStateOptions) {
  const supabase = getSupabaseClient()
  const [state, setState] = useState<SessionState>({
    session: null,
    isActive: false,
    isPaused: false,
    onlineUsers: [],
    isConnected: false,
    error: null,
  })
  
  // Refs for channel management
  const stateChannelRef = useRef<RealtimeChannel | null>(null)
  const presenceChannelRef = useRef<RealtimeChannel | null>(null)
  const dbChannelRef = useRef<RealtimeChannel | null>(null)
  
  // Track if we've already fetched session data
  const sessionFetchedRef = useRef<string | null>(null)
  // Track if channels are already set up for this session
  const channelsSetupRef = useRef<string | null>(null)
  
  // Store callbacks in refs to avoid dependency issues
  const onSessionUpdateRef = useRef(onSessionUpdate)
  const onPresenceUpdateRef = useRef(onPresenceUpdate)
  
  // Update refs when callbacks change
  useEffect(() => {
    onSessionUpdateRef.current = onSessionUpdate
  }, [onSessionUpdate])
  
  useEffect(() => {
    onPresenceUpdateRef.current = onPresenceUpdate
  }, [onPresenceUpdate])

  // Handle session database changes
  const handleSessionChange = useCallback((payload: RealtimePostgresChangesPayload<Session>) => {
    if (REALTIME_CONFIG.enableDebugLogging) {
      console.log('📊 Session DB change:', payload.eventType, payload)
    }
    
    switch (payload.eventType) {
      case 'UPDATE':
        if (payload.new && payload.new.id === sessionId) {
          const updatedSession = payload.new
          setState(prev => ({
            ...prev,
            session: updatedSession,
            isActive: updatedSession.status === 'ACTIVE' || updatedSession.status === 'SCHEDULED',
            // Only update isPaused if session is active
            isPaused: updatedSession.status === 'ACTIVE' ? (updatedSession.isPaused || false) : false,
          }))
          onSessionUpdateRef.current?.(updatedSession)
        }
        break
        
      case 'DELETE':
        if (payload.old && payload.old.id === sessionId) {
          setState(prev => ({
            ...prev,
            session: null,
            isActive: false,
            isPaused: false,
          }))
        }
        break
    }
  }, [sessionId])

  // Handle session state broadcasts
  const handleStateUpdate = useCallback((payload: SessionStatePayload) => {
    if (payload.sessionId !== sessionId) return
    
    setState(prev => ({
      ...prev,
      isActive: payload.state === 'ACTIVE',
      isPaused: payload.state === 'PAUSED',
      session: {
        ...prev.session,
        isPaused: payload.state === 'PAUSED',
        pausedAt: payload.pausedAt ? new Date(payload.pausedAt) : undefined,
        resumedAt: payload.resumedAt ? new Date(payload.resumedAt) : undefined,
        totalPausedTimeSeconds: payload.totalPausedTime,
        // Note: endedAt doesn't exist in our schema, would need to add if required
      } as Partial<Session>,
    }))
  }, [sessionId])

  // Broadcast session state change
  const broadcastStateChange = useCallback(async (
    state: 'ACTIVE' | 'PAUSED' | 'ENDED',
    metadata?: Partial<SessionStatePayload>
  ) => {
    if (!stateChannelRef.current || !sessionId) return
    
    const payload: SessionStatePayload = {
      sessionId,
      state,
      ...metadata,
    }
    
    await stateChannelRef.current.send({
      type: 'broadcast',
      event: REALTIME_EVENTS[`SESSION_${state.toUpperCase()}` as keyof typeof REALTIME_EVENTS],
      payload,
    })
  }, [sessionId])

  // Store VAPI callbacks in refs
  const onVapiPauseRef = useRef(onVapiPause)
  const onVapiResumeRef = useRef(onVapiResume)
  
  useEffect(() => {
    onVapiPauseRef.current = onVapiPause
  }, [onVapiPause])
  
  useEffect(() => {
    onVapiResumeRef.current = onVapiResume
  }, [onVapiResume])

  // Pause session
  const pauseSession = useCallback(async () => {
    if (!sessionId) return
    
    // Optimistic update - update UI immediately
    setState(prev => ({
      ...prev,
      isPaused: true,
      session: prev.session ? {
        ...prev.session,
        isPaused: true,
        pausedAt: new Date(),
      } as Partial<Session> : null
    }))
    
    try {
      // First pause VAPI to stop billing and save conversation state
      let conversationStateId: string | null = null
      if (onVapiPauseRef.current) {
        console.log('🎙️ Pausing VAPI session...')
        conversationStateId = await onVapiPauseRef.current(sessionId)
        if (!conversationStateId) {
          console.warn('VAPI pause returned no conversation state ID')
        }
      }
      
      // Update database
      const response = await fetch(`/api/sessions/${sessionId}/pause`, {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationStateId
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to pause session')
      }
      
      const data = await response.json()
      
      // Update local state with actual response data
      setState(prev => ({
        ...prev,
        isPaused: true,
        session: {
          ...prev.session,
          isPaused: true,
          pausedAt: data.session.pausedAt,
          conversationTimeSeconds: data.session.conversationTimeSeconds,
          totalPausedTimeSeconds: data.session.totalPausedTimeSeconds,
        }
      }))
      
      // Broadcast state change
      await broadcastStateChange('PAUSED', {
        pausedAt: data.session.pausedAt,
        totalPausedTime: data.session.totalPausedTimeSeconds,
      })
      
    } catch (error) {
      console.error('Failed to pause session:', error)
      // Revert optimistic update on error
      setState(prev => ({ 
        ...prev, 
        isPaused: false,
        session: prev.session ? {
          ...prev.session,
          isPaused: false,
          pausedAt: null
        } : null,
        error: 'Failed to pause session' 
      }))
    }
  }, [sessionId, broadcastStateChange])

  // Resume session
  const resumeSession = useCallback(async () => {
    if (!sessionId) return
    
    // Optimistic update - update UI immediately
    setState(prev => ({
      ...prev,
      isPaused: false,
      session: prev.session ? {
        ...prev.session,
        isPaused: false,
        resumedAt: new Date(),
      } as Partial<Session> : null
    }))
    
    try {
      // Update database first
      const response = await fetch(`/api/sessions/${sessionId}/resume`, {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
      })
      
      if (!response.ok) {
        throw new Error('Failed to resume session')
      }
      
      const data = await response.json()
      
      // Update local state with actual response data
      setState(prev => ({
        ...prev,
        isPaused: false,
        session: {
          ...prev.session,
          isPaused: false,
          resumedAt: data.session.resumedAt,
          conversationTimeSeconds: data.session.conversationTimeSeconds,
          totalPausedTimeSeconds: data.session.totalPausedTimeSeconds,
        }
      }))
      
      // Resume VAPI session with saved state
      if (onVapiResumeRef.current) {
        console.log('🎙️ Resuming VAPI session...')
        try {
          await onVapiResumeRef.current(sessionId)
          console.log('✅ VAPI session resumed successfully')
        } catch (vapiError) {
          console.error('Failed to resume VAPI session:', vapiError)
          // Don't throw here - database update succeeded, just log VAPI error
        }
      }
      
      // Broadcast state change
      await broadcastStateChange('ACTIVE', {
        resumedAt: data.session.resumedAt,
        totalPausedTime: data.session.totalPausedTimeSeconds,
      })
      
    } catch (error) {
      console.error('Failed to resume session:', error)
      // Revert optimistic update on error
      setState(prev => ({ 
        ...prev, 
        isPaused: true,
        session: prev.session ? {
          ...prev.session,
          isPaused: true,
          resumedAt: null
        } : null,
        error: 'Failed to resume session' 
      }))
    }
  }, [sessionId, broadcastStateChange])

  // End session
  // NOTE: This hook does NOT call the complete API - that is handled by useSessionManagementV2.
  // This hook only broadcasts the state change and clears local state to avoid a race condition
  // where both hooks calling the same endpoint simultaneously causes a Redis lock conflict.
  const endSession = useCallback(async () => {
    if (!sessionId) return

    try {
      // Broadcast state change so other clients know the session ended
      await broadcastStateChange('ENDED', {
        endedAt: new Date().toISOString(),
      })

      // Clear local state
      setState(prev => ({
        ...prev,
        session: null,
        isActive: false,
        isPaused: false,
      }))

    } catch (error) {
      console.error('Failed to broadcast session end:', error)
      // Still clear local state even if broadcast fails
      setState(prev => ({
        ...prev,
        session: null,
        isActive: false,
        isPaused: false,
        error: 'Failed to broadcast session end',
      }))
    }
  }, [sessionId, broadcastStateChange])

  // Subscribe to all channels
  useEffect(() => {
    console.log('[useSupabaseSessionState] Effect running - sessionId:', sessionId, 'autoSubscribe:', autoSubscribe)
    if (!autoSubscribe || !sessionId) {
      // Reset refs if sessionId is null
      if (!sessionId) {
        sessionFetchedRef.current = null
        channelsSetupRef.current = null
      }
      return
    }
    
    let isSubscribed = true
    let setupTimeout: NodeJS.Timeout | null = null
    let fetchDebounceTimeout: NodeJS.Timeout | null = null
    
    const setupChannels = async () => {
      // Check if channels are already set up for this session
      if (channelsSetupRef.current === sessionId) {
        console.log('[useSupabaseSessionState] Channels already set up for session:', sessionId)
        return
      }
      
      console.log('[useSupabaseSessionState] Setting up channels for session:', sessionId)
      try {
        
        // 1. Subscribe to database changes for sessions table
        const dbChannel = supabase
          .channel(REALTIME_CHANNELS.sessionsTable)
          .on(
            'postgres_changes',
            { 
              event: '*', 
              schema: 'public', 
              table: 'Session',
              filter: `id=eq.${sessionId}` 
            },
            (payload) => {
              if (isSubscribed) {
                handleSessionChange(payload as RealtimePostgresChangesPayload<Session>)
              }
            }
          )
        
        // 2. Subscribe to session state broadcasts
        const stateChannel = supabase
          .channel(REALTIME_CHANNELS.sessionState(sessionId))
          .on('broadcast', { event: '*' }, ({ event, payload }) => {
            if (isSubscribed && event.startsWith('session_')) {
              handleStateUpdate(payload as SessionStatePayload)
            }
          })
        
        // 3. Subscribe to presence for active users
        const presenceChannel = supabase
          .channel(REALTIME_CHANNELS.sessionPresence(sessionId), {
            config: {
              presence: {
                key: userId,
              },
            },
          })
          .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState()
            // Transform Supabase presence format to our format
            const users: SessionPresencePayload[] = Object.entries(state).map(([, presences]) => {
              // Each presence entry includes the payload we sent in track()
              const presence = presences[0] as unknown // First presence for this key
              return presence as SessionPresencePayload
            }).filter(Boolean)
            setState(prev => ({ ...prev, onlineUsers: users }))
            onPresenceUpdateRef.current?.(users)
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            if (REALTIME_CONFIG.enableDebugLogging) {
              console.log('👤 User joined session:', key, newPresences)
            }
          })
          .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            if (REALTIME_CONFIG.enableDebugLogging) {
              console.log('👤 User left session:', key, leftPresences)
            }
          })
        
        // Subscribe to all channels
        await Promise.all([
          dbChannel.subscribe(),
          stateChannel.subscribe(),
          presenceChannel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              // Track presence
              await presenceChannel.track({
                userId,
                role: 'patient', // This should be dynamic based on user role
                joinedAt: new Date().toISOString(),
              } as SessionPresencePayload)
            }
          }),
        ])
        
        // Store channel refs
        dbChannelRef.current = dbChannel
        stateChannelRef.current = stateChannel
        presenceChannelRef.current = presenceChannel
        
        // Mark channels as set up for this session
        channelsSetupRef.current = sessionId
        
        setState(prev => ({ ...prev, isConnected: true, error: null }))
        
        // Fetch initial session data from API (only if not already fetched)
        if (sessionFetchedRef.current !== sessionId) {
          // Debounce the fetch to prevent rapid repeated calls
          fetchDebounceTimeout = setTimeout(async () => {
            // Double-check we still need to fetch and component is still subscribed
            if (!isSubscribed || sessionFetchedRef.current === sessionId) {
              return
            }
            
            console.log('[useSupabaseSessionState] Fetching initial session data for:', sessionId)
            try {
              const response = await fetch(`/api/sessions/${sessionId}?lite=true`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                },
              })
              
              if (response.ok) {
                const sessionData = await response.json()
                if (sessionData && isSubscribed) {
                  setState(prev => ({
                    ...prev,
                    session: sessionData,
                    isActive: sessionData.status === 'ACTIVE' || sessionData.status === 'SCHEDULED',
                    // Only set isPaused from DB if session is active, otherwise default to false
                    isPaused: sessionData.status === 'ACTIVE' ? (sessionData.isPaused || false) : false,
                  }))
                  // Mark this session as fetched
                  sessionFetchedRef.current = sessionId
                }
              } else {
                console.error('Failed to fetch session data:', response.statusText)
              }
            } catch (error) {
              console.error('Error fetching session data:', error)
            }
          }, 500) // 500ms debounce
        } else {
          console.log('[useSupabaseSessionState] Session data already fetched for:', sessionId)
        }
        
      } catch (error) {
        console.error('Failed to setup session channels:', error)
        setState(prev => ({ ...prev, error: 'Failed to connect to session' }))
      }
    }
    
    setupChannels()
    
    // Cleanup
    return () => {
      console.log('[useSupabaseSessionState] Cleaning up channels for session:', sessionId)
      isSubscribed = false
      
      // Clear debounce timeout
      if (fetchDebounceTimeout) {
        clearTimeout(fetchDebounceTimeout)
      }
      
      // Untrack presence
      if (presenceChannelRef.current) {
        presenceChannelRef.current.untrack()
      }
      
      // Remove all channels
      const channels = [dbChannelRef.current, stateChannelRef.current, presenceChannelRef.current]
      channels.forEach(channel => {
        if (channel) {
          supabase.removeChannel(channel)
        }
      })
      
      // Clear refs
      dbChannelRef.current = null
      stateChannelRef.current = null
      presenceChannelRef.current = null
      
      // Reset channel setup tracking
      channelsSetupRef.current = null
      
      setState(prev => ({ ...prev, isConnected: false }))
    }
  }, [sessionId, userId, autoSubscribe, handleSessionChange, handleStateUpdate, broadcastStateChange])

  return {
    // State
    ...state,
    
    // Actions
    pauseSession,
    resumeSession,
    endSession,
    
    // For debugging
    ...(REALTIME_CONFIG.enableDebugLogging && {
      _channels: {
        db: dbChannelRef.current,
        state: stateChannelRef.current,
        presence: presenceChannelRef.current,
      },
    }),
  }
}