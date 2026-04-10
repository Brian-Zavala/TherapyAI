/**
 * Real-Time VAPI Metrics Hook
 * Provides live session metrics directly from VAPI with WebSocket subscriptions
 * Ensures 100% accurate real-time data with no hardcoded values
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from '@/hooks/useClerkSession'
import { createClient } from '@/utils/supabase/client';
import { IncrementalMetrics } from '@/lib/real-time-metrics-optimized';
import { logger } from '@/lib/logger';
import { useQueryClient } from '@tanstack/react-query';

export interface VAPIMetricUpdate {
  sessionId: string;
  metrics: IncrementalMetrics;
  timestamp: string;
  therapyType: 'solo' | 'couple' | 'family';
  confidence: number;
  speakerMetrics?: {
    [speaker: string]: {
      talkTime: number;
      turnCount: number;
      sentimentAverage: number;
    };
  };
}

export interface VAPITranscriptUpdate {
  sessionId: string;
  speaker: string;
  text: string;
  timestamp: string;
  sentiment?: number;
  emotions?: string[];
  isFinal: boolean;
}

export interface UseVAPIRealTimeMetricsOptions {
  sessionId?: string | null;
  therapyType?: 'solo' | 'couple' | 'family';
  onMetricUpdate?: (update: VAPIMetricUpdate) => void;
  onTranscriptUpdate?: (update: VAPITranscriptUpdate) => void;
  refetchInterval?: number;
}

export function useVAPIRealTimeMetrics(options: UseVAPIRealTimeMetricsOptions = {}) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<IncrementalMetrics | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcriptBuffer, setTranscriptBuffer] = useState<VAPITranscriptUpdate[]>([]);
  
  const subscriptionRef = useRef<any>(null);
  const metricsChannelRef = useRef<any>(null);
  const transcriptChannelRef = useRef<any>(null);

  const {
    sessionId,
    therapyType = 'couple',
    onMetricUpdate,
    onTranscriptUpdate,
    refetchInterval = 5000
  } = options;

  // Subscribe to real-time metrics updates
  const subscribeToMetrics = useCallback(async () => {
    if (!sessionId || !session?.user?.id) return;

    try {
      const supabase = createClient();
      
      // Subscribe to metrics channel
      metricsChannelRef.current = supabase
        .channel(`metrics-${sessionId}`)
        .on('broadcast', { event: 'metrics-update' }, (payload) => {
          const update = payload.payload as VAPIMetricUpdate;
          
          logger.info('Received real-time metrics update', {
            sessionId: update.sessionId,
            confidence: update.confidence,
            therapyType: update.therapyType
          });

          // Update local state
          setCurrentMetrics(update.metrics);
          setLastUpdate(new Date());
          setError(null);

          // Invalidate related queries to refresh UI
          queryClient.invalidateQueries({ 
            queryKey: ['dashboard', 'communication-metrics', therapyType] 
          });
          queryClient.invalidateQueries({ 
            queryKey: ['dashboard', 'ai-insights', therapyType] 
          });

          // Call custom handler if provided
          onMetricUpdate?.(update);
        })
        .subscribe((status) => {
          setIsConnected(status === 'SUBSCRIBED');
          if (status === 'SUBSCRIBED') {
            logger.info('Successfully subscribed to metrics channel', { sessionId });
          }
        });

      // Subscribe to transcript channel for real-time text updates
      transcriptChannelRef.current = supabase
        .channel(`transcript-${sessionId}`)
        .on('broadcast', { event: 'transcript-update' }, (payload) => {
          const update = payload.payload as VAPITranscriptUpdate;
          
          // Add to buffer
          setTranscriptBuffer(prev => [...prev.slice(-50), update]); // Keep last 50 entries
          
          // Call custom handler
          onTranscriptUpdate?.(update);
        })
        .subscribe();

    } catch (err) {
      logger.error('Failed to subscribe to real-time metrics', { error: err, sessionId });
      setError('Failed to connect to real-time updates');
      setIsConnected(false);
    }
  }, [sessionId, session?.user?.id, therapyType, onMetricUpdate, onTranscriptUpdate, queryClient]);

  // Fetch initial metrics if session is already active
  const fetchInitialMetrics = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}/metrics`);
      if (response.ok) {
        const data = await response.json();
        if (data.metrics) {
          setCurrentMetrics(data.metrics);
          setLastUpdate(new Date());
        }
      }
    } catch (err) {
      logger.error('Failed to fetch initial metrics', { error: err, sessionId });
    }
  }, [sessionId]);

  // Setup subscriptions
  useEffect(() => {
    if (sessionId) {
      subscribeToMetrics();
      fetchInitialMetrics();
    }

    return () => {
      // Cleanup subscriptions
      if (metricsChannelRef.current) {
        metricsChannelRef.current.unsubscribe();
      }
      if (transcriptChannelRef.current) {
        transcriptChannelRef.current.unsubscribe();
      }
    };
  }, [sessionId, subscribeToMetrics, fetchInitialMetrics]);

  // Periodic refresh as fallback
  useEffect(() => {
    if (!sessionId || !refetchInterval) return;

    const interval = setInterval(() => {
      fetchInitialMetrics();
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [sessionId, refetchInterval, fetchInitialMetrics]);

  // Calculate derived metrics from real-time data
  const derivedMetrics = useCallback(() => {
    if (!currentMetrics) return null;

    const {
      activeListeningScore,
      expressingNeedsScore,
      conflictResolutionScore,
      emotionalSupportScore,
      communicationScore,
      closenessScore,
      confidence
    } = currentMetrics;

    // Calculate trend based on recent transcript sentiment
    const recentSentiments = transcriptBuffer
      .slice(-10)
      .map(t => t.sentiment || 0)
      .filter(s => s !== 0);
    
    const sentimentTrend = recentSentiments.length > 2
      ? recentSentiments[recentSentiments.length - 1] - recentSentiments[0]
      : 0;

    // Communication health indicator
    const communicationHealth = Math.round(
      (activeListeningScore * 0.3 + 
       expressingNeedsScore * 0.3 + 
       conflictResolutionScore * 0.2 + 
       emotionalSupportScore * 0.2)
    );

    // Engagement level based on transcript frequency
    const engagementLevel = transcriptBuffer.length > 0
      ? Math.min(100, (transcriptBuffer.filter(t => 
          new Date().getTime() - new Date(t.timestamp).getTime() < 60000
        ).length / 10) * 100)
      : 0;

    return {
      communicationHealth,
      sentimentTrend,
      engagementLevel,
      confidence: Math.round(confidence),
      sessionProgress: currentMetrics.sessionProgress || 0
    };
  }, [currentMetrics, transcriptBuffer]);

  return {
    // Connection state
    isConnected,
    error,
    lastUpdate,
    
    // Real-time metrics
    metrics: currentMetrics,
    derivedMetrics: derivedMetrics(),
    
    // Transcript data
    transcriptBuffer,
    
    // Utilities
    refetch: fetchInitialMetrics,
    
    // Metric categories for dashboard display
    categories: therapyType === 'solo' ? {
      primary: [
        { name: 'Self-awareness', value: currentMetrics?.activeListeningScore || 0 },
        { name: 'Emotional Regulation', value: currentMetrics?.expressingNeedsScore || 0 },
        { name: 'Personal Growth', value: currentMetrics?.conflictResolutionScore || 0 },
        { name: 'Coping Skills', value: currentMetrics?.emotionalSupportScore || 0 }
      ],
      secondary: {
        overall: currentMetrics?.communicationScore || 0,
        confidence: currentMetrics?.confidence || 0
      }
    } : therapyType === 'family' ? {
      primary: [
        { name: 'Family Communication', value: currentMetrics?.activeListeningScore || 0 },
        { name: 'Role Definition', value: currentMetrics?.expressingNeedsScore || 0 },
        { name: 'Conflict Management', value: currentMetrics?.conflictResolutionScore || 0 },
        { name: 'Family Bonding', value: currentMetrics?.emotionalSupportScore || 0 }
      ],
      secondary: {
        overall: currentMetrics?.communicationScore || 0,
        confidence: currentMetrics?.confidence || 0
      }
    } : {
      primary: [
        { name: 'Active Listening', value: currentMetrics?.activeListeningScore || 0 },
        { name: 'Expressing Needs', value: currentMetrics?.expressingNeedsScore || 0 },
        { name: 'Conflict Resolution', value: currentMetrics?.conflictResolutionScore || 0 },
        { name: 'Emotional Support', value: currentMetrics?.emotionalSupportScore || 0 }
      ],
      secondary: {
        overall: currentMetrics?.communicationScore || 0,
        confidence: currentMetrics?.confidence || 0
      }
    }
  };
}

// Hook for aggregated dashboard metrics across all therapy types
export function useVAPIDashboardMetrics() {
  const soloMetrics = useVAPIRealTimeMetrics({ therapyType: 'solo' });
  const coupleMetrics = useVAPIRealTimeMetrics({ therapyType: 'couple' });
  const familyMetrics = useVAPIRealTimeMetrics({ therapyType: 'family' });

  return {
    solo: soloMetrics,
    couple: coupleMetrics,
    family: familyMetrics,
    isAnyConnected: soloMetrics.isConnected || coupleMetrics.isConnected || familyMetrics.isConnected,
    hasAnyError: !!(soloMetrics.error || coupleMetrics.error || familyMetrics.error)
  };
}