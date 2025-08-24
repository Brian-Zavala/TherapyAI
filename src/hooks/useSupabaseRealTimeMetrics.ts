/**
 * useSupabaseRealTimeMetrics Hook
 * Unified real-time metrics using Supabase Realtime
 * Handles both broadcast (ephemeral) and database (persistent) updates
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/database/supabase-singleton'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { IncrementalMetrics } from '@/lib/metrics/real-time-metrics-optimized'
import { 
  REALTIME_CHANNELS, 
  REALTIME_EVENTS, 
  REALTIME_CONFIG,
  shouldPersistMetrics,
  type MetricsUpdatePayload 
} from '@/lib/database/supabase-realtime-config'

interface UseSupabaseRealTimeMetricsOptions {
  sessionId: string
  userId: string
  role?: 'provider' | 'consumer'
  onMetricsUpdate?: (metrics: IncrementalMetrics) => void
  onError?: (error: Error) => void
  autoConnect?: boolean
}

interface BufferedMetrics {
  metrics: IncrementalMetrics
  timestamp: Date
}

interface MetricsBuffer {
  metrics: BufferedMetrics[]
  lastPersisted: Date | null
  aggregated: IncrementalMetrics | null
}

export function useSupabaseRealTimeMetrics({
  sessionId,
  userId,
  role = 'consumer',
  onMetricsUpdate,
  onError,
  autoConnect = true,
}: UseSupabaseRealTimeMetricsOptions) {
  const supabase = getSupabaseClient()
  const [isConnected, setIsConnected] = useState(false)
  const [currentMetrics, setCurrentMetrics] = useState<IncrementalMetrics | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Refs for channel management
  const metricsChannelRef = useRef<RealtimeChannel | null>(null)
  const metricsBufferRef = useRef<MetricsBuffer>({
    metrics: [],
    lastPersisted: null,
    aggregated: null,
  })
  const persistenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastConnectionTimeRef = useRef<number>(0)
  const connectionCountRef = useRef<number>(0)
  const isSetupInProgressRef = useRef<boolean>(false)
  const channelSetupCompleteRef = useRef<boolean>(false)

  // Aggregate metrics for database persistence
  const aggregateMetrics = useCallback((bufferedMetrics: BufferedMetrics[]): IncrementalMetrics | null => {
    if (bufferedMetrics.length === 0) return null
    
    const metrics = bufferedMetrics.map(bm => bm.metrics)
    
    // Calculate averages for the actual IncrementalMetrics structure
    const aggregated: IncrementalMetrics = {
      activeListeningScore: metrics.reduce((sum, m) => sum + m.activeListeningScore, 0) / metrics.length,
      expressingNeedsScore: metrics.reduce((sum, m) => sum + m.expressingNeedsScore, 0) / metrics.length,
      conflictResolutionScore: metrics.reduce((sum, m) => sum + m.conflictResolutionScore, 0) / metrics.length,
      emotionalSupportScore: metrics.reduce((sum, m) => sum + m.emotionalSupportScore, 0) / metrics.length,
      communicationScore: metrics.reduce((sum, m) => sum + m.communicationScore, 0) / metrics.length,
      closenessScore: metrics.reduce((sum, m) => sum + m.closenessScore, 0) / metrics.length,
      confidence: metrics.reduce((sum, m) => sum + m.confidence, 0) / metrics.length,
      entryCount: metrics[metrics.length - 1].entryCount, // Use latest entry count
      sessionProgress: metrics[metrics.length - 1].sessionProgress, // Use latest progress
    }
    
    return aggregated
  }, [])

  // Persist metrics to database
  const persistMetrics = useCallback(async () => {
    const buffer = metricsBufferRef.current
    if (buffer.metrics.length === 0) return
    
    try {
      const aggregated = aggregateMetrics(buffer.metrics)
      if (!aggregated) return
      
      // Save to database via API route
      const response = await fetch('/api/sessions/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          sessionId,
          metrics: aggregated,
          metricsCount: buffer.metrics.length,
          periodStart: buffer.metrics[0].timestamp.toISOString(),
          periodEnd: buffer.metrics[buffer.metrics.length - 1].timestamp.toISOString(),
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to persist metrics')
      }
      
      // Clear buffer after successful persistence
      buffer.metrics = []
      buffer.lastPersisted = new Date()
      buffer.aggregated = aggregated
      
      if (REALTIME_CONFIG.enableDebugLogging) {
        console.log('📊 Metrics persisted to database:', { sessionId, count: buffer.metrics.length })
      }
    } catch (error) {
      console.error('Failed to persist metrics:', error)
      onError?.(error as Error)
    }
  }, [sessionId, aggregateMetrics, onError])

  // Handle incoming metrics
  const handleMetricsUpdate = useCallback((payload: MetricsUpdatePayload) => {
    const { metrics } = payload
    
    // Update current metrics
    setCurrentMetrics(metrics)
    onMetricsUpdate?.(metrics)
    
    // Buffer metrics for persistence (only if provider)
    if (role === 'provider') {
      const buffer = metricsBufferRef.current
      buffer.metrics.push({
        metrics,
        timestamp: new Date()
      })
      
      // Keep buffer size limited
      if (buffer.metrics.length > REALTIME_CONFIG.metricsBufferSize) {
        buffer.metrics.shift()
      }
      
      // Check if we should persist
      if (shouldPersistMetrics(buffer.lastPersisted)) {
        persistMetrics()
      }
    }
  }, [role, onMetricsUpdate, persistMetrics])

  // Broadcast metrics (for providers)
  const broadcastMetrics = useCallback(async (metrics: IncrementalMetrics) => {
    if (!metricsChannelRef.current || role !== 'provider') return
    
    const payload: MetricsUpdatePayload = {
      sessionId,
      userId,
      metrics,
      timestamp: new Date().toISOString(),
    }
    
    await metricsChannelRef.current.send({
      type: 'broadcast',
      event: REALTIME_EVENTS.METRICS_UPDATE,
      payload,
    })
  }, [sessionId, userId, role])

  // Subscribe to metrics channel
  useEffect(() => {
    if (!autoConnect || !sessionId) return
    
    // Prevent duplicate setup
    if (isSetupInProgressRef.current || channelSetupCompleteRef.current) {
      return // Remove log to avoid spam
    }
    
    // Debounce rapid reconnections
    const now = Date.now()
    if (now - lastConnectionTimeRef.current < 2000) { // Increase debounce to 2s
      return // Remove log to avoid spam
    }
    lastConnectionTimeRef.current = now
    
    let isSubscribed = true
    isSetupInProgressRef.current = true
    
    const setupChannel = async () => {
      try {
        // Create metrics broadcast channel
        const metricsChannel = supabase.channel(
          REALTIME_CHANNELS.sessionMetrics(sessionId),
          {
            config: {
              broadcast: {
                self: role === 'consumer', // Consumers receive own broadcasts
                ack: role === 'provider', // Providers get acknowledgment
              },
            },
          }
        )
        
        // Subscribe to metrics updates
        metricsChannel
          .on('broadcast', { event: REALTIME_EVENTS.METRICS_UPDATE }, ({ payload }) => {
            if (isSubscribed) {
              handleMetricsUpdate(payload as MetricsUpdatePayload)
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              connectionCountRef.current++
              // Only log first connection to reduce spam
              if (connectionCountRef.current === 1) {
                console.log(`✅ Connected to session metrics: ${sessionId}`)
              }
              setIsConnected(true)
              setError(null)
              channelSetupCompleteRef.current = true
            } else if (status === 'CHANNEL_ERROR') {
              setError('Failed to connect to metrics channel')
              setIsConnected(false)
            } else if (status === 'TIMED_OUT') {
              setError('Connection timed out')
              setIsConnected(false)
            }
          })
        
        metricsChannelRef.current = metricsChannel
        
        // Set up persistence timer for providers
        if (role === 'provider') {
          persistenceTimerRef.current = setInterval(() => {
            persistMetrics()
          }, REALTIME_CONFIG.metricsAggregateInterval)
        }
        
      } catch (error) {
        console.error('Failed to setup metrics channel:', error)
        setError('Failed to setup real-time connection')
        onError?.(error as Error)
      } finally {
        isSetupInProgressRef.current = false
      }
    }
    
    setupChannel()
    
    // Cleanup
    return () => {
      isSubscribed = false
      
      // Persist any remaining metrics before cleanup
      if (role === 'provider' && metricsBufferRef.current.metrics.length > 0) {
        persistMetrics()
      }
      
      if (persistenceTimerRef.current) {
        clearInterval(persistenceTimerRef.current)
        persistenceTimerRef.current = null
      }
      
      if (metricsChannelRef.current) {
        supabase.removeChannel(metricsChannelRef.current)
        metricsChannelRef.current = null
      }
      
      setIsConnected(false)
      channelSetupCompleteRef.current = false
      isSetupInProgressRef.current = false
    }
  }, [sessionId, userId, role, autoConnect, handleMetricsUpdate, persistMetrics, onError])

  // Public methods
  const connect = useCallback(() => {
    // Trigger reconnection by toggling autoConnect
    // In a real implementation, you might want to manage this differently
    console.log('Manual connect requested')
  }, [])

  const disconnect = useCallback(() => {
    if (metricsChannelRef.current) {
      supabase.removeChannel(metricsChannelRef.current)
      metricsChannelRef.current = null
      setIsConnected(false)
    }
  }, [supabase])

  return {
    // State
    isConnected,
    currentMetrics,
    error,
    
    // Methods
    broadcastMetrics,
    connect,
    disconnect,
    
    // For debugging
    ...(REALTIME_CONFIG.enableDebugLogging && {
      _buffer: metricsBufferRef.current,
      _channel: metricsChannelRef.current,
    }),
  }
}