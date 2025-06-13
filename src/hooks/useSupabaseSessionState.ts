/**
 * useSupabaseSessionState Hook
 * Manages session state using Supabase Realtime
 * Handles database changes, broadcast events, and presence
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
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
}: UseSupabaseSessionStateOptions) {
  const supabase = createClient()
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
            isActive: updatedSession.status === 'active' || updatedSession.status === 'scheduled',
            isPaused: updatedSession.isPaused || false,
          }))
          onSessionUpdate?.(updatedSession)
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
  }, [sessionId, onSessionUpdate])

  // Handle session state broadcasts
  const handleStateUpdate = useCallback((payload: SessionStatePayload) => {
    if (payload.sessionId !== sessionId) return
    
    setState(prev => ({
      ...prev,
      isActive: payload.state === 'active',
      isPaused: payload.state === 'paused',
      session: {
        ...prev.session,
        isPaused: payload.state === 'paused',
        pausedAt: payload.pausedAt,
        resumedAt: payload.resumedAt,
        totalPausedTimeSeconds: payload.totalPausedTime,
        // Note: endedAt doesn't exist in our schema, would need to add if required
      },
    }))
  }, [sessionId])

  // Broadcast session state change
  const broadcastStateChange = useCallback(async (
    state: 'active' | 'paused' | 'ended',
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
      event: REALTIME_EVENTS[`SESSION_${state.toUpperCase()}`],
      payload,
    })
  }, [sessionId])

  // Pause session
  const pauseSession = useCallback(async () => {
    if (!sessionId) return
    
    try {
      // Update database
      const response = await fetch(`/api/sessions/${sessionId}/pause`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to pause session')
      }
      
      const data = await response.json()
      
      // Update local state with response data
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
      await broadcastStateChange('paused', {
        pausedAt: data.session.pausedAt,
        totalPausedTime: data.session.totalPausedTimeSeconds,
      })
      
    } catch (error) {
      console.error('Failed to pause session:', error)
      setState(prev => ({ ...prev, error: 'Failed to pause session' }))
    }
  }, [sessionId, broadcastStateChange])

  // Resume session
  const resumeSession = useCallback(async () => {
    if (!sessionId) return
    
    try {
      // Update database
      const response = await fetch(`/api/sessions/${sessionId}/resume`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to resume session')
      }
      
      const data = await response.json()
      
      // Update local state with response data
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
      
      // Broadcast state change
      await broadcastStateChange('active', {
        resumedAt: data.session.resumedAt,
        totalPausedTime: data.session.totalPausedTimeSeconds,
      })
      
    } catch (error) {
      console.error('Failed to resume session:', error)
      setState(prev => ({ ...prev, error: 'Failed to resume session' }))
    }
  }, [sessionId, broadcastStateChange])

  // End session
  const endSession = useCallback(async () => {
    if (!sessionId) return
    
    try {
      // Update database - use complete endpoint
      const response = await fetch(`/api/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actualDurationMinutes: 0, // This should be calculated from session data
          completionNotes: 'Session ended by user'
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to end session')
      }
      
      // Broadcast state change
      await broadcastStateChange('ended', {
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
      console.error('Failed to end session:', error)
      setState(prev => ({ ...prev, error: 'Failed to end session' }))
    }
  }, [sessionId, broadcastStateChange])

  // Subscribe to all channels
  useEffect(() => {
    if (!autoSubscribe || !sessionId) return
    
    let isSubscribed = true
    
    const setupChannels = async () => {
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
            const users = Object.values(state).flatMap(
              (presences) => presences as SessionPresencePayload[]
            )
            setState(prev => ({ ...prev, onlineUsers: users }))
            onPresenceUpdate?.(users)
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
        
        setState(prev => ({ ...prev, isConnected: true, error: null }))
        
        // Fetch initial session data
        const { data: sessionData, error: fetchError } = await supabase
          .from('Session')
          .select('*')
          .eq('id', sessionId)
          .single()
        
        if (sessionData && !fetchError) {
          setState(prev => ({
            ...prev,
            session: sessionData,
            isActive: sessionData.status === 'active' || sessionData.status === 'scheduled',
            isPaused: sessionData.isPaused || false,
          }))
        }
        
      } catch (error) {
        console.error('Failed to setup session channels:', error)
        setState(prev => ({ ...prev, error: 'Failed to connect to session' }))
      }
    }
    
    setupChannels()
    
    // Cleanup
    return () => {
      isSubscribed = false
      
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
      
      setState(prev => ({ ...prev, isConnected: false }))
    }
  }, [sessionId, userId, autoSubscribe, supabase, handleSessionChange, handleStateUpdate, onPresenceUpdate])

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