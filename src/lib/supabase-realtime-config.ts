/**
 * Supabase Realtime Configuration
 * Unified architecture for session management and real-time updates
 */

import type { IncrementalMetrics } from './real-time-metrics-optimized'

// Channel naming conventions
export const REALTIME_CHANNELS = {
  // Broadcast channels for ephemeral data
  sessionMetrics: (sessionId: string) => `broadcast:session:${sessionId}:metrics`,
  sessionState: (sessionId: string) => `broadcast:session:${sessionId}:state`,
  
  // Presence channels for active users
  sessionPresence: (sessionId: string) => `presence:session:${sessionId}`,
  dashboardPresence: (userId: string) => `presence:dashboard:${userId}`,
  
  // Database change channels
  sessionsTable: 'realtime:sessions:changes',
  sessionMetricsTable: 'realtime:session_metrics:changes',
} as const

// Event types for broadcast channels
export const REALTIME_EVENTS = {
  // Metrics events
  METRICS_UPDATE: 'metrics_update',
  METRICS_AGGREGATE: 'metrics_aggregate',
  
  // Session state events
  SESSION_PAUSED: 'session_paused',
  SESSION_RESUMED: 'session_resumed',
  SESSION_ENDED: 'session_ended',
  SESSION_RECOVERED: 'session_recovered',
  
  // Connection events
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
} as const

// Type definitions for realtime payloads
export interface MetricsUpdatePayload {
  sessionId: string
  userId: string
  metrics: IncrementalMetrics
  timestamp: string
}

export interface SessionStatePayload {
  sessionId: string
  state: 'active' | 'paused' | 'ended'
  pausedAt?: string
  resumedAt?: string
  endedAt?: string
  totalPausedTime?: number
}

export interface SessionPresencePayload {
  userId: string
  userName?: string
  role: 'therapist' | 'patient' | 'viewer'
  joinedAt: string
}

// Configuration for different environments
const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

export const REALTIME_CONFIG = {
  // Broadcast intervals
  metricsUpdateInterval: isDevelopment ? 1000 : 1000, // 1 second for both
  metricsAggregateInterval: isDevelopment ? 10000 : 30000, // 10s dev, 30s prod
  
  // Reconnection settings
  maxReconnectAttempts: isProduction ? 10 : 5,
  reconnectDelay: isProduction ? 1000 : 500,
  
  // Channel limits
  maxChannelsPerClient: isProduction ? 100 : 20,
  
  // Message throttling
  messageThrottleMs: isProduction ? 100 : 50,
  
  // Heartbeat settings
  heartbeatInterval: isProduction ? 30000 : 15000, // 30s prod, 15s dev
  
  // Debug logging
  enableDebugLogging: isDevelopment,
  
  // Persistence settings
  persistMetricsAfterMs: 30000, // Save to DB every 30 seconds
  metricsBufferSize: 30, // Keep last 30 metrics in memory
} as const

// Helper to determine if we should persist metrics
export function shouldPersistMetrics(lastPersisted: Date | null): boolean {
  if (!lastPersisted) return true
  return Date.now() - lastPersisted.getTime() >= REALTIME_CONFIG.persistMetricsAfterMs
}

// Helper to format channel names with validation
export function getChannelName(type: keyof typeof REALTIME_CHANNELS, id?: string): string {
  const channelFn = REALTIME_CHANNELS[type]
  if (typeof channelFn === 'function' && id) {
    return channelFn(id)
  } else if (typeof channelFn === 'string') {
    return channelFn
  }
  throw new Error(`Invalid channel type: ${type}`)
}