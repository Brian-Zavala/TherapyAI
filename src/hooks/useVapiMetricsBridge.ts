/**
 * useVapiMetricsBridge Hook
 * Bridges VAPI session events with Supabase Realtime metrics broadcasting
 * Replaces the old WebSocket-based metrics system
 */

import { useEffect, useRef } from 'react'
import { useSupabaseRealTimeMetrics } from './useSupabaseRealTimeMetrics'
import { RealTimeMetricsCalculator } from '@/lib/real-time-metrics-optimized'
import type { TranscriptEntry } from '@/types/therapy-session'

interface UseVapiMetricsBridgeOptions {
  sessionId: string
  userId: string
  vapiState: {
    isActive: boolean
  }
  transcriptChunks?: string[]
  therapyType?: 'couple' | 'solo' | 'family'
  sessionDuration?: number
  enabled?: boolean
}

// Throttle configuration
const METRICS_THROTTLE_MS = 5000 // 5 seconds between broadcasts
const TRANSCRIPT_BATCH_SIZE = 3 // Process 3 chunks at a time

export function useVapiMetricsBridge({
  sessionId,
  userId,
  vapiState,
  transcriptChunks = [],
  therapyType = 'couple',
  sessionDuration = 60,
  enabled = true
}: UseVapiMetricsBridgeOptions) {
  const metricsCalculatorRef = useRef<RealTimeMetricsCalculator | null>(null)
  const lastTranscriptCountRef = useRef(0)
  const lastBroadcastTimeRef = useRef(0)
  const pendingChunksRef = useRef<string[]>([])
  const processTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Use Supabase realtime as provider
  const { broadcastMetrics, isConnected } = useSupabaseRealTimeMetrics({
    sessionId,
    userId,
    role: 'provider',
    onError: (error) => {
      console.error('[VapiMetricsBridge] Error:', error)
    }
  })

  // Initialize metrics calculator when session becomes active
  useEffect(() => {
    if (enabled && sessionId && vapiState?.isActive && !metricsCalculatorRef.current) {
      console.log('[VapiMetricsBridge] Initializing metrics calculator for session:', sessionId)
      metricsCalculatorRef.current = new RealTimeMetricsCalculator({
        sessionId,
        userId,
        therapyType,
        sessionDurationMinutes: sessionDuration
      })
    }

    // Cleanup calculator when session ends
    if (!vapiState?.isActive && metricsCalculatorRef.current) {
      console.log('[VapiMetricsBridge] Cleaning up metrics calculator')
      metricsCalculatorRef.current.cleanupSession()
      metricsCalculatorRef.current = null
      
      // Clear any pending timeout
      if (processTimeoutRef.current) {
        clearTimeout(processTimeoutRef.current)
        processTimeoutRef.current = null
      }
      
      // Clear pending chunks
      pendingChunksRef.current = []
    }
  }, [enabled, sessionId, vapiState?.isActive, userId, therapyType, sessionDuration])

  // Process new transcript chunks with throttling
  useEffect(() => {
    if (!enabled || !sessionId || !vapiState?.isActive || !isConnected || !metricsCalculatorRef.current) {
      return
    }

    const currentTranscriptCount = transcriptChunks.length
    if (currentTranscriptCount > lastTranscriptCountRef.current) {
      // Add new chunks to pending buffer
      const newChunks = transcriptChunks.slice(lastTranscriptCountRef.current)
      pendingChunksRef.current.push(...newChunks)
      lastTranscriptCountRef.current = currentTranscriptCount
      
      // Process chunks in batches with throttling
      const processChunks = async () => {
        const now = Date.now()
        const timeSinceLastBroadcast = now - lastBroadcastTimeRef.current
        
        // Skip if we've broadcast too recently
        if (timeSinceLastBroadcast < METRICS_THROTTLE_MS && pendingChunksRef.current.length < TRANSCRIPT_BATCH_SIZE * 2) {
          return // Silently throttle to reduce log spam
        }
        
        // Process up to TRANSCRIPT_BATCH_SIZE chunks
        const chunksToProcess = pendingChunksRef.current.splice(0, TRANSCRIPT_BATCH_SIZE)
        if (chunksToProcess.length === 0) return
        
        let lastMetrics = null
        
        for (const chunk of chunksToProcess) {
          // Parse transcript chunk format: "AI: text" or "You: text"
          const match = chunk.match(/^(AI|You): (.+)$/)
          if (match) {
            const [, speaker, text] = match
            const transcriptEntry: TranscriptEntry = {
              speaker: speaker === 'AI' ? 'assistant' : 'user',
              text: text.trim(),
              timestamp: new Date().toISOString(),
              isFinal: true
            }
            
            try {
              // Check if calculator still exists before using it
              if (!metricsCalculatorRef.current) {
                console.warn('[VapiMetricsBridge] Metrics calculator was cleaned up, skipping transcript processing')
                return
              }
              // Add to metrics calculator and get updated metrics
              lastMetrics = await metricsCalculatorRef.current.addTranscriptEntry(transcriptEntry)
            } catch (error) {
              console.error('[VapiMetricsBridge] Error processing transcript:', error)
            }
          }
        }
        
        // Broadcast only the final metrics after processing batch
        if (lastMetrics && timeSinceLastBroadcast >= METRICS_THROTTLE_MS) {
          broadcastMetrics(lastMetrics)
          lastBroadcastTimeRef.current = now
          
          // Log only significant metric changes (every 10 entries)
          if (lastMetrics.entryCount % 10 === 0) {
            console.log('[VapiMetricsBridge] Metrics milestone:', {
              entryCount: lastMetrics.entryCount,
              confidence: lastMetrics.confidence.toFixed(2)
            })
          }
        }
      }
      
      // Execute processing
      processChunks()
      
      // Set up delayed processing for remaining chunks
      if (pendingChunksRef.current.length > 0) {
        // Clear any existing timeout
        if (processTimeoutRef.current) {
          clearTimeout(processTimeoutRef.current)
        }
        processTimeoutRef.current = setTimeout(processChunks, METRICS_THROTTLE_MS)
      }
    }
  }, [enabled, sessionId, vapiState.isActive, isConnected, broadcastMetrics, transcriptChunks])

  return {
    isMetricsConnected: isConnected,
    isBroadcasting: !!metricsCalculatorRef.current,
    metricsCalculator: metricsCalculatorRef.current
  }
}