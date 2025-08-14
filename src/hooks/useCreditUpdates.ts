"use client";

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

interface CreditUpdateMessage {
  type: 'connected' | 'credit_update' | 'heartbeat';
  data?: {
    userId: string;
    updateType: 'subscription_change' | 'usage_update' | 'plan_upgrade' | 'plan_downgrade';
    credits: {
      available: number;
      total: number;
      used: number;
      bonus: number;
      planType: string;
      billingPeriodStart: string;
      billingPeriodEnd: string;
    };
  };
  message?: string;
  timestamp: string;
}

export function useCreditUpdates() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    if (!isAuthenticated || eventSourceRef.current) {
      return;
    }

    try {
      console.log('[CreditUpdates] Connecting to real-time credit updates...');
      
      const eventSource = new EventSource('/api/credits/events');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('[CreditUpdates] Connected to credit updates stream');
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const message: CreditUpdateMessage = JSON.parse(event.data);
          
          console.log('[CreditUpdates] Received message:', message.type, message);

          switch (message.type) {
            case 'connected':
              console.log('[CreditUpdates] Stream connected successfully');
              break;
              
            case 'credit_update':
              if (message.data) {
                console.log('[CreditUpdates] Credit update received:', message.data.updateType);
                
                // Invalidate credit queries to trigger refetch with new data
                queryClient.invalidateQueries({
                  queryKey: ['credits-display'],
                  exact: false
                });
                
                queryClient.invalidateQueries({
                  queryKey: ['credits'],
                  exact: false
                });

                queryClient.invalidateQueries({
                  queryKey: ['user-credits'],
                  exact: false
                });

                // Show notification based on update type
                if (message.data.updateType === 'subscription_change') {
                  console.log('🎉 Subscription updated - credits refreshed');
                } else if (message.data.updateType === 'plan_downgrade') {
                  console.log('⬇️ Plan downgraded - credits updated');
                } else if (message.data.updateType === 'plan_upgrade') {
                  console.log('⬆️ Plan upgraded - credits updated');
                }
              }
              break;
              
            case 'heartbeat':
              // Keep connection alive - no action needed
              break;
              
            default:
              console.log('[CreditUpdates] Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('[CreditUpdates] Error parsing message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('[CreditUpdates] EventSource error:', error);
        eventSource.close();
        eventSourceRef.current = null;
        
        // Implement exponential backoff for reconnection
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`[CreditUpdates] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current += 1;
            connect();
          }, delay);
        } else {
          console.error('[CreditUpdates] Max reconnection attempts reached');
        }
      };

    } catch (error) {
      console.error('[CreditUpdates] Failed to create EventSource:', error);
    }
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      console.log('[CreditUpdates] Disconnecting from credit updates stream');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    reconnectAttempts.current = 0;
  };

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup on component unmount
    return () => {
      disconnect();
    };
  }, [isAuthenticated]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        // Reconnect when page becomes visible
        if (!eventSourceRef.current) {
          connect();
        }
      } else {
        // Disconnect when page is hidden to save resources
        disconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);

  return {
    isConnected: !!eventSourceRef.current,
    reconnect: () => {
      disconnect();
      setTimeout(connect, 1000);
    }
  };
}