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
    if (enabled && sessionId && vapiState.isActive && !metricsCalculatorRef.current) {
      console.log('[VapiMetricsBridge] Initializing metrics calculator for session:', sessionId)
      metricsCalculatorRef.current = new RealTimeMetricsCalculator({
        sessionId,
        userId,
        therapyType,
        sessionDurationMinutes: sessionDuration
      })
    }

    // Cleanup calculator when session ends
    if (!vapiState.isActive && metricsCalculatorRef.current) {
      console.log('[VapiMetricsBridge] Cleaning up metrics calculator')
      metricsCalculatorRef.current.cleanupSession()
      metricsCalculatorRef.current = null
    }
  }, [enabled, sessionId, vapiState.isActive, userId, therapyType, sessionDuration])

  // Process new transcript chunks
  useEffect(() => {
    if (!enabled || !sessionId || !vapiState.isActive || !isConnected || !metricsCalculatorRef.current) {
      return
    }

    const currentTranscriptCount = transcriptChunks.length
    if (currentTranscriptCount > lastTranscriptCountRef.current) {
      // Process new transcript chunks
      const newChunks = transcriptChunks.slice(lastTranscriptCountRef.current)
      
      // Process chunks sequentially to maintain order
      const processChunks = async () => {
        for (const chunk of newChunks) {
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
              // Add to metrics calculator and get updated metrics
              const metrics = await metricsCalculatorRef.current!.addTranscriptEntry(transcriptEntry)
              
              // Broadcast metrics through Supabase
              broadcastMetrics(metrics)
              
              console.log('[VapiMetricsBridge] Processed transcript and broadcast metrics:', {
                speaker: transcriptEntry.speaker,
                textLength: transcriptEntry.text.length,
                metrics: {
                  confidence: metrics.confidence,
                  entryCount: metrics.entryCount,
                  communicationScore: metrics.communicationScore
                }
              })
            } catch (error) {
              console.error('[VapiMetricsBridge] Error processing transcript:', error)
            }
          }
        }
      }
      
      // Execute async processing
      processChunks()
      
      lastTranscriptCountRef.current = currentTranscriptCount
    }
  }, [enabled, sessionId, vapiState.isActive, isConnected, broadcastMetrics, transcriptChunks])

  return {
    isMetricsConnected: isConnected,
    isBroadcasting: !!metricsCalculatorRef.current,
    metricsCalculator: metricsCalculatorRef.current
  }
}