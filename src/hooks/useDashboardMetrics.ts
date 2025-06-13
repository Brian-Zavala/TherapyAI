/**
 * useDashboardMetrics - Adapter hook for dashboard components
 * Provides compatibility layer between old WebSocket metrics and new Supabase Realtime
 * This allows dashboard components to work without extensive refactoring
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSupabaseRealTimeMetrics } from './useSupabaseRealTimeMetrics'
import { useSession } from 'next-auth/react'
import type { IncrementalMetrics } from '@/lib/real-time-metrics-optimized'

interface UseDashboardMetricsOptions {
  autoConnect?: boolean
  onMetricsUpdate?: (metrics: IncrementalMetrics, sessionId: string) => void
  onSessionUpdate?: (status: string, sessionId: string, data?: any) => void
  onConnectionChange?: (connected: boolean) => void
  onError?: (error: string) => void
}

interface UseDashboardMetricsReturn {
  // Connection state
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  connectionAttempts: number
  maxAttempts: number
  
  // Current metrics
  currentMetrics: IncrementalMetrics | null
  metricsHistory: Array<{ metrics: IncrementalMetrics; timestamp: string }>
  
  // Connection control
  connect: () => void
  disconnect: () => void
  retry: () => void
  subscribeToSession: (sessionId: string) => void
  unsubscribeFromSession: () => void
  
  // Utilities
  clearHistory: () => void
  getMetricsForSession: (sessionId: string) => IncrementalMetrics | null
}

/**
 * Dashboard metrics adapter hook
 * Maintains compatibility with existing dashboard components while using Supabase Realtime
 */
export function useDashboardMetrics(options: UseDashboardMetricsOptions = {}): UseDashboardMetricsReturn {
  const { data: session } = useSession()
  const {
    autoConnect = true,
    onMetricsUpdate,
    onSessionUpdate,
    onConnectionChange,
    onError
  } = options

  // State
  const [subscribedSessionId, setSubscribedSessionId] = useState<string | null>(null)
  const [metricsHistory, setMetricsHistory] = useState<Array<{ metrics: IncrementalMetrics; timestamp: string }>>([])
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const isConnecting = useRef(false)
  
  // State to track if we need to recreate the Supabase connection
  const [supabaseKey, setSupabaseKey] = useState(0)
  
  // Use Supabase Realtime under the hood
  const {
    isConnected,
    currentMetrics,
    error: supabaseError,
    connect: supabaseConnect,
    disconnect: supabaseDisconnect,
  } = useSupabaseRealTimeMetrics({
    sessionId: subscribedSessionId || '',
    userId: session?.user?.id || '',
    role: 'consumer',
    autoConnect: !!subscribedSessionId && !!session?.user?.id, // Auto-connect when we have a session
    onMetricsUpdate: (metrics) => {
      // Add to history
      const timestamp = new Date().toISOString()
      setMetricsHistory(prev => [...prev.slice(-99), { metrics, timestamp }])
      
      // Call original callback with sessionId
      if (onMetricsUpdate && subscribedSessionId) {
        onMetricsUpdate(metrics, subscribedSessionId)
      }
      
      // Simulate session update for active status
      if (onSessionUpdate && subscribedSessionId && metrics.entryCount > 0) {
        onSessionUpdate('active', subscribedSessionId, { metrics })
      }
    },
    onError: (error) => {
      if (onError) {
        onError(error.message)
      }
    }
  })

  // Connection state change handler
  useEffect(() => {
    if (onConnectionChange) {
      onConnectionChange(isConnected)
    }
  }, [isConnected, onConnectionChange])

  // Auto-connect logic
  useEffect(() => {
    if (autoConnect && session?.user?.id && !isConnected && !isConnecting.current) {
      connect()
    }
  }, [autoConnect, session?.user?.id])

  // Connection control functions
  const connect = useCallback(() => {
    if (!session?.user?.id || isConnecting.current) return
    
    isConnecting.current = true
    setConnectionAttempts(prev => prev + 1)
    
    // For dashboard, trigger connection when we subscribe to a session
    if (!subscribedSessionId) {
      // No session to connect to yet
      isConnecting.current = false
      return
    }
    
    supabaseConnect()
    
    setTimeout(() => {
      isConnecting.current = false
    }, 1000)
  }, [session?.user?.id, subscribedSessionId, supabaseConnect])

  const disconnect = useCallback(() => {
    supabaseDisconnect()
    setSubscribedSessionId(null)
    setConnectionAttempts(0)
  }, [supabaseDisconnect])

  const retry = useCallback(() => {
    disconnect()
    setTimeout(() => {
      connect()
    }, 100)
  }, [connect, disconnect])

  const subscribeToSession = useCallback((sessionId: string) => {
    if (!sessionId || !session?.user?.id) return
    
    console.log(`📊 DASHBOARD ADAPTER: Subscribing to session ${sessionId}`)
    
    // If already subscribed to a different session, disconnect first
    if (subscribedSessionId && subscribedSessionId !== sessionId) {
      supabaseDisconnect()
      // Force recreation of the Supabase hook with new sessionId
      setSupabaseKey(prev => prev + 1)
    }
    
    setSubscribedSessionId(sessionId)
    
    // The Supabase hook will auto-connect when sessionId changes
    
    // Simulate initial session update
    if (onSessionUpdate) {
      onSessionUpdate('active', sessionId)
    }
  }, [session?.user?.id, subscribedSessionId, supabaseDisconnect, onSessionUpdate])

  const unsubscribeFromSession = useCallback(() => {
    if (subscribedSessionId && onSessionUpdate) {
      onSessionUpdate('completed', subscribedSessionId)
    }
    
    setSubscribedSessionId(null)
    supabaseDisconnect()
  }, [subscribedSessionId, supabaseDisconnect, onSessionUpdate])

  const clearHistory = useCallback(() => {
    setMetricsHistory([])
  }, [])

  const getMetricsForSession = useCallback((sessionId: string): IncrementalMetrics | null => {
    if (sessionId === subscribedSessionId) {
      return currentMetrics
    }
    
    // Check history
    const historicalEntry = metricsHistory
      .slice()
      .reverse()
      .find(entry => entry.timestamp.includes(sessionId))
    
    return historicalEntry?.metrics || null
  }, [subscribedSessionId, currentMetrics, metricsHistory])

  // Return WebSocket-compatible interface
  return {
    // Connection state
    isConnected,
    isConnecting: isConnecting.current,
    error: supabaseError,
    connectionAttempts,
    maxAttempts: 5,
    
    // Current metrics
    currentMetrics,
    metricsHistory,
    
    // Connection control
    connect,
    disconnect,
    retry,
    subscribeToSession,
    unsubscribeFromSession,
    
    // Utilities
    clearHistory,
    getMetricsForSession
  }
}

// Re-export as useRealTimeMetrics for drop-in replacement
export { useDashboardMetrics as useRealTimeMetrics }