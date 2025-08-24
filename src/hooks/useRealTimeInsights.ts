/**
 * Real-time Insights Hook
 * Subscribes to insight updates and handles dashboard refresh
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';
import type { InsightUpdatePayload } from '@/lib/ai-insights/real-time-insights-broadcaster';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface RealTimeInsightsState {
  isConnected: boolean;
  lastUpdate: Date | null;
  hasNewInsights: boolean;
  latestTip: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export function useRealTimeInsights() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);
  const [state, setState] = useState<RealTimeInsightsState>({
    isConnected: false,
    lastUpdate: null,
    hasNewInsights: false,
    latestTip: null,
    connectionStatus: 'disconnected'
  });

  // Update state helper
  const updateState = useCallback((updates: Partial<RealTimeInsightsState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Mark insights as viewed
  const markInsightsViewed = useCallback(() => {
    updateState({ hasNewInsights: false });
  }, [updateState]);

  // Refresh insights data
  const refreshInsights = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      // Invalidate and refetch therapy insights
      await queryClient.invalidateQueries({
        queryKey: ['dashboard-data-unified', session.user.id]
      });

      logger.debug('Refreshed insights after real-time update', { 
        userId: session.user.id 
      });
    } catch (error) {
      logger.error('Failed to refresh insights', { 
        userId: session.user.id,
        error: error instanceof Error ? error.message : error 
      });
    }
  }, [session?.user?.id, queryClient]);

  // Handle insight updates
  const handleInsightUpdate = useCallback((payload: InsightUpdatePayload) => {
    logger.info('Received real-time insight update', { 
      type: payload.type,
      userId: payload.userId 
    });

    switch (payload.type) {
      case 'insights_generated':
        updateState({
          hasNewInsights: true,
          lastUpdate: new Date(payload.timestamp)
        });
        
        // Auto-refresh if this is from a session completion
        if (payload.data.shouldRefreshInsights) {
          setTimeout(refreshInsights, 1000); // Small delay to allow for processing
        }
        break;

      case 'daily_tip_updated':
        updateState({
          latestTip: payload.data.tip,
          lastUpdate: new Date(payload.timestamp)
        });
        break;

      case 'patterns_updated':
        updateState({
          lastUpdate: new Date(payload.timestamp)
        });
        // Optionally refresh insights for pattern updates
        setTimeout(refreshInsights, 500);
        break;
    }
  }, [updateState, refreshInsights]);

  // Setup real-time subscription
  useEffect(() => {
    if (!session?.user?.id || !supabaseUrl || !supabaseAnonKey) {
      updateState({ connectionStatus: 'disconnected' });
      return;
    }

    const userId = session.user.id;
    updateState({ connectionStatus: 'connecting' });

    try {
      // Create user-specific channel
      const channel = supabase
        .channel(`insights:${userId}`)
        .on('broadcast', { event: 'insights_updated' }, (payload) => {
          handleInsightUpdate(payload.payload as InsightUpdatePayload);
        })
        .on('broadcast', { event: 'daily_tip_updated' }, (payload) => {
          handleInsightUpdate(payload.payload as InsightUpdatePayload);
        })
        .on('broadcast', { event: 'patterns_updated' }, (payload) => {
          handleInsightUpdate(payload.payload as InsightUpdatePayload);
        })
        .on('broadcast', { event: 'session_completed' }, (payload) => {
          handleInsightUpdate(payload.payload as InsightUpdatePayload);
        })
        .subscribe((status) => {
          logger.debug('Real-time insights subscription status', { userId, status });
          
          switch (status) {
            case 'SUBSCRIBED':
              updateState({ 
                isConnected: true, 
                connectionStatus: 'connected' 
              });
              break;
            case 'CHANNEL_ERROR':
            case 'TIMED_OUT':
            case 'CLOSED':
              updateState({ 
                isConnected: false, 
                connectionStatus: 'error' 
              });
              break;
            default:
              updateState({ connectionStatus: 'connecting' });
          }
        });

      channelRef.current = channel;

      logger.info('Real-time insights subscription established', { userId });

    } catch (error) {
      logger.error('Failed to setup real-time insights subscription', { 
        userId,
        error: error instanceof Error ? error.message : error 
      });
      updateState({ connectionStatus: 'error' });
    }

    // Cleanup function
    return () => {
      if (channelRef.current) {
        logger.debug('Cleaning up real-time insights subscription', { userId });
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      updateState({
        isConnected: false,
        connectionStatus: 'disconnected'
      });
    };
  }, [session?.user?.id, handleInsightUpdate, updateState]);

  return {
    ...state,
    markInsightsViewed,
    refreshInsights
  };
}

/**
 * Hook for components that need to show insight update notifications
 */
export function useInsightNotifications() {
  const { hasNewInsights, latestTip, lastUpdate, markInsightsViewed } = useRealTimeInsights();
  const [hasShownNotification, setHasShownNotification] = useState(false);

  // Show notification for new insights
  const shouldShowInsightNotification = hasNewInsights && !hasShownNotification;

  // Mark notification as shown
  const markNotificationShown = useCallback(() => {
    setHasShownNotification(true);
    // Auto-clear the notification after user acknowledges
    setTimeout(() => {
      markInsightsViewed();
      setHasShownNotification(false);
    }, 5000);
  }, [markInsightsViewed]);

  // Reset notification state when new insights arrive
  useEffect(() => {
    if (hasNewInsights && hasShownNotification) {
      setHasShownNotification(false);
    }
  }, [hasNewInsights, hasShownNotification]);

  return {
    shouldShowInsightNotification,
    latestTip,
    lastUpdate,
    markNotificationShown
  };
}