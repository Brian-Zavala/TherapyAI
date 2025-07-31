'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase-singleton'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

interface DashboardMetrics {
  activeSessions: number
  totalSessions: number
  averageSessionDuration: number
  weeklyProgress: number
  communicationMetrics: {
    clarity: number
    empathy: number
    respect: number
    overall: number
    listening: number
    expression: number
  }
  recentSessions: SessionSummary[]
  upcomingSessions: SessionSummary[]
}

interface SessionSummary {
  id: string
  date: Date
  status: string
  theme: string
  duration: number
  metrics?: {
    clarity: number
    empathy: number
    respect: number
    overall: number
  }
}

interface UseDashboardRealTimeReturn {
  metrics: DashboardMetrics | null
  loading: boolean
  error: string | null
  refreshMetrics: () => Promise<void>
  isConnected: boolean
}

export function useDashboardRealTimeEnhanced(): UseDashboardRealTimeReturn {
  const { data: session } = useSession()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  
  const supabase = getSupabaseClient()
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map())
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  // Load initial metrics
  const loadMetrics = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/dashboard/metrics/enhanced')
      if (!response.ok) {
        throw new Error('Failed to load dashboard metrics')
      }

      const data = await response.json()
      setMetrics(data)
    } catch (err) {
      console.error('Error loading dashboard metrics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  // Setup real-time subscriptions
  const setupRealtimeSubscriptions = useCallback(async () => {
    if (!session?.user?.id) return

    const userId = session.user.id

    try {
      // Clean up existing channels
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel)
      })
      channelsRef.current.clear()

      // 1. Subscribe to user's session changes
      const sessionsChannel = supabase
        .channel(`dashboard:sessions:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'Session',
            filter: `userId=eq.${userId}`
          },
          async (payload: RealtimePostgresChangesPayload<any>) => {
            console.log('Session change detected:', payload)
            
            // Reload metrics on any session change
            await loadMetrics()
            
            // Show notification for specific events
            if (payload.eventType === 'INSERT') {
              toast.success('New session created')
            } else if (payload.eventType === 'UPDATE' && payload.new?.status === 'completed') {
              toast.success('Session completed')
            }
          }
        )

      // 2. Subscribe to communication metrics updates
      const metricsChannel = supabase
        .channel(`dashboard:metrics:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'CommunicationMetric',
            filter: `userId=eq.${userId}`
          },
          async (payload: RealtimePostgresChangesPayload<any>) => {
            console.log('Metrics change detected:', payload)
            
            // Update metrics in real-time
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const newMetric = payload.new
              
              setMetrics(prev => {
                if (!prev) return prev
                
                return {
                  ...prev,
                  communicationMetrics: {
                    clarity: newMetric.clarity || prev.communicationMetrics.clarity,
                    empathy: newMetric.empathy || prev.communicationMetrics.empathy,
                    respect: newMetric.respect || prev.communicationMetrics.respect,
                    overall: newMetric.overall || prev.communicationMetrics.overall,
                    listening: newMetric.listening || prev.communicationMetrics.listening,
                    expression: newMetric.expression || prev.communicationMetrics.expression
                  }
                }
              })
            }
          }
        )

      // 3. Subscribe to broadcast events for real-time session updates
      const broadcastChannel = supabase
        .channel(`dashboard:broadcast:${userId}`)
        .on('broadcast', { event: 'metrics-update' }, (payload: any) => {
          console.log('Broadcast metrics update:', payload)
          
          if (payload.payload?.metrics) {
            setMetrics(prev => ({
              ...prev!,
              communicationMetrics: payload.payload.metrics
            }))
          }
        })
        .on('broadcast', { event: 'session-state-change' }, (payload: any) => {
          console.log('Session state change:', payload)
          
          // Reload metrics on state changes
          loadMetrics()
        })

      // 4. Subscribe to family member changes
      const familyMembersChannel = supabase
        .channel(`dashboard:family:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'FamilyMember',
            filter: `userId=eq.${userId}`
          },
          async (payload: RealtimePostgresChangesPayload<any>) => {
            console.log('Family member change detected:', payload)
            
            // Reload dashboard if family members change
            await loadMetrics()
          }
        )

      // Subscribe to all channels
      const channels = [sessionsChannel, metricsChannel, broadcastChannel, familyMembersChannel]
      
      for (const channel of channels) {
        await channel.subscribe((status: any) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Subscribed to channel: ${channel.topic}`)
          }
        })
        
        channelsRef.current.set(channel.topic, channel)
      }

      setIsConnected(true)
    } catch (err) {
      console.error('Error setting up real-time subscriptions:', err)
      setError('Failed to connect to real-time updates')
      setIsConnected(false)
      
      // Attempt reconnection after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        setupRealtimeSubscriptions()
      }, 5000)
    }
  }, [session?.user?.id, supabase, loadMetrics])

  // Handle connection state changes
  useEffect(() => {
    const handleOnline = () => {
      toast.success('Connection restored')
      setupRealtimeSubscriptions()
    }

    const handleOffline = () => {
      toast.error('Connection lost - updates may be delayed')
      setIsConnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setupRealtimeSubscriptions])

  // Initialize dashboard
  useEffect(() => {
    if (session?.user?.id) {
      loadMetrics()
      setupRealtimeSubscriptions()
    }

    return () => {
      // Cleanup channels
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel)
      })
      channelsRef.current.clear()
      
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [session?.user?.id, loadMetrics, setupRealtimeSubscriptions])

  // Manual refresh function
  const refreshMetrics = useCallback(async () => {
    await loadMetrics()
    
    // Ensure subscriptions are active
    if (!isConnected) {
      await setupRealtimeSubscriptions()
    }
  }, [loadMetrics, isConnected, setupRealtimeSubscriptions])

  return {
    metrics,
    loading,
    error,
    refreshMetrics,
    isConnected
  }
}

// Enhanced hook for session-specific real-time updates
export function useSessionRealTimeEnhanced(sessionId: string | null) {
  const { data: session } = useSession()
  const [sessionData, setSessionData] = useState<any>(null)
  const [transcript, setTranscript] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>(null)
  const [isActive, setIsActive] = useState(false)
  
  const supabase = getSupabaseClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!sessionId || !session?.user?.id) return

    const setupSessionSubscription = async () => {
      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }

      // Create session-specific channel
      const channel = supabase
        .channel(`session:${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'Session',
            filter: `id=eq.${sessionId}`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            console.log('Session update:', payload)
            setSessionData(payload.new)
            setIsActive(payload.new?.status === 'active')
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'TranscriptEntry',
            filter: `sessionId=eq.${sessionId}`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            console.log('New transcript entry:', payload)
            setTranscript(prev => [...prev, payload.new])
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'CommunicationMetric',
            filter: `sessionId=eq.${sessionId}`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            console.log('Metrics update:', payload)
            setMetrics(payload.new)
          }
        )
        .on('broadcast', { event: 'transcript-update' }, (payload: any) => {
          if (payload.payload?.entry) {
            setTranscript(prev => [...prev, payload.payload.entry])
          }
        })
        .on('broadcast', { event: 'metrics-update' }, (payload: any) => {
          if (payload.payload?.metrics) {
            setMetrics(payload.payload.metrics)
          }
        })

      await channel.subscribe()
      channelRef.current = channel
      
      // Load initial data
      const [sessionResp, transcriptResp, metricsResp] = await Promise.all([
        supabase.from('Session').select('*').eq('id', sessionId).single(),
        supabase.from('TranscriptEntry').select('*').eq('sessionId', sessionId).order('timestamp', { ascending: true }),
        supabase.from('CommunicationMetric').select('*').eq('sessionId', sessionId).order('createdAt', { ascending: false }).limit(1)
      ])

      if (sessionResp.data) setSessionData(sessionResp.data)
      if (transcriptResp.data) setTranscript(transcriptResp.data)
      if (metricsResp.data?.[0]) setMetrics(metricsResp.data[0])
      
      setIsActive(sessionResp.data?.status === 'active')
    }

    setupSessionSubscription()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [sessionId, session?.user?.id, supabase])

  return {
    sessionData,
    transcript,
    metrics,
    isActive
  }
}