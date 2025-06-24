// src/components/dashboard/RealTimeMetricProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { createClient, RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

// ========================================
// TYPES & INTERFACES
// ========================================

export interface MetricUpdate {
  id: string;
  userId: string;
  sessionId?: string;
  metricType: string;
  metrics: {
    clarity: number;
    empathy: number;
    respect: number;
    overall: number;
    listening?: number;
    expression?: number;
  };
  confidence: number;
  timestamp: Date;
  source: 'live' | 'calculated' | 'assessment';
}

export interface SessionStatus {
  sessionId: string;
  status: 'active' | 'paused' | 'completed' | 'terminated';
  userId: string;
  timestamp: Date;
}

interface RealTimeMetricContextValue {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  currentMetrics: MetricUpdate | null;
  sessionStatus: SessionStatus | null;
  error: Error | null;
  subscribe: (callback: (update: MetricUpdate) => void) => () => void;
  subscribeToSession: (callback: (status: SessionStatus) => void) => () => void;
  reconnect: () => Promise<void>;
  disconnect: () => void;
}

// ========================================
// CONTEXT
// ========================================

const RealTimeMetricContext = createContext<RealTimeMetricContextValue | null>(null);

export function useRealTimeMetrics() {
  const context = useContext(RealTimeMetricContext);
  if (!context) {
    throw new Error('useRealTimeMetrics must be used within a RealTimeMetricProvider');
  }
  return context;
}

// ========================================
// PROVIDER COMPONENT
// ========================================

interface RealTimeMetricProviderProps {
  children: ReactNode;
  userId?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function RealTimeMetricProvider({
  children,
  userId,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  autoConnect = true,
  reconnectInterval = 5000,
  maxReconnectAttempts = 5
}: RealTimeMetricProviderProps) {
  // ========================================
  // STATE
  // ========================================
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [currentMetrics, setCurrentMetrics] = useState<MetricUpdate | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // ========================================
  // REFS
  // ========================================
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribersRef = useRef<Set<(update: MetricUpdate) => void>>(new Set());
  const sessionSubscribersRef = useRef<Set<(status: SessionStatus) => void>>(new Set());

  // ========================================
  // SUPABASE INITIALIZATION
  // ========================================
  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setError(new Error('Supabase configuration missing'));
      setConnectionStatus('error');
      return;
    }

    try {
      supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10 // Limit rate for performance
          }
        }
      });
    } catch (err) {
      setError(err as Error);
      setConnectionStatus('error');
    }
  }, [supabaseUrl, supabaseAnonKey]);

  // ========================================
  // CONNECTION MANAGEMENT
  // ========================================
  const connect = useCallback(async () => {
    if (!supabaseRef.current || !userId) return;

    try {
      setConnectionStatus('connecting');
      setError(null);

      // Clean up existing channel
      if (channelRef.current) {
        await supabaseRef.current.removeChannel(channelRef.current);
      }

      // Create new channel with user-specific topic
      const channel = supabaseRef.current
        .channel(`dashboard:metrics:${userId}`)
        .on('broadcast', { event: 'metric_update' }, (payload) => {
          console.log('📊 Received metric update:', payload);
          
          const update: MetricUpdate = {
            id: payload.payload.id || `metric-${Date.now()}`,
            userId: payload.payload.userId,
            sessionId: payload.payload.sessionId,
            metricType: payload.payload.metricType || 'real-time',
            metrics: payload.payload.metrics,
            confidence: payload.payload.confidence || 0,
            timestamp: new Date(payload.payload.timestamp || Date.now()),
            source: payload.payload.source || 'live'
          };

          setCurrentMetrics(update);
          
          // Notify all subscribers
          subscribersRef.current.forEach(callback => {
            try {
              callback(update);
            } catch (err) {
              console.error('Subscriber error:', err);
            }
          });
        })
        .on('broadcast', { event: 'session_status' }, (payload) => {
          console.log('📱 Received session status:', payload);
          
          const status: SessionStatus = {
            sessionId: payload.payload.sessionId,
            status: payload.payload.status,
            userId: payload.payload.userId,
            timestamp: new Date(payload.payload.timestamp || Date.now())
          };

          setSessionStatus(status);
          
          // Notify session subscribers
          sessionSubscribersRef.current.forEach(callback => {
            try {
              callback(status);
            } catch (err) {
              console.error('Session subscriber error:', err);
            }
          });
        })
        .on('presence', { event: 'sync' }, () => {
          console.log('🔄 Presence sync');
        })
        .subscribe((status) => {
          console.log('📡 Channel status:', status);
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setConnectionStatus('connected');
            reconnectAttemptsRef.current = 0;
            
            // Track presence
            channel.track({
              online_at: new Date().toISOString(),
              user_id: userId
            });
          } else if (status === 'CHANNEL_ERROR') {
            setIsConnected(false);
            setConnectionStatus('error');
            handleReconnect();
          } else if (status === 'CLOSED') {
            setIsConnected(false);
            setConnectionStatus('disconnected');
          }
        });

      channelRef.current = channel;

    } catch (err) {
      console.error('Connection error:', err);
      setError(err as Error);
      setConnectionStatus('error');
      handleReconnect();
    }
  }, [userId]);

  // ========================================
  // RECONNECTION LOGIC
  // ========================================
  const handleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      setConnectionStatus('error');
      setError(new Error('Unable to establish connection after multiple attempts'));
      return;
    }

    reconnectAttemptsRef.current++;
    
    // Clear existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Exponential backoff
    const delay = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1);
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, reconnectInterval, maxReconnectAttempts]);

  // ========================================
  // PUBLIC METHODS
  // ========================================
  const reconnect = useCallback(async () => {
    reconnectAttemptsRef.current = 0;
    await disconnect();
    await connect();
  }, [connect]);

  const disconnect = useCallback(async () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (channelRef.current && supabaseRef.current) {
      await supabaseRef.current.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
    setCurrentMetrics(null);
    setSessionStatus(null);
  }, []);

  const subscribe = useCallback((callback: (update: MetricUpdate) => void) => {
    subscribersRef.current.add(callback);
    
    // Send current metrics if available
    if (currentMetrics) {
      callback(currentMetrics);
    }

    // Return unsubscribe function
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, [currentMetrics]);

  const subscribeToSession = useCallback((callback: (status: SessionStatus) => void) => {
    sessionSubscribersRef.current.add(callback);
    
    // Send current status if available
    if (sessionStatus) {
      callback(sessionStatus);
    }

    // Return unsubscribe function
    return () => {
      sessionSubscribersRef.current.delete(callback);
    };
  }, [sessionStatus]);

  // ========================================
  // LIFECYCLE
  // ========================================
  useEffect(() => {
    if (autoConnect && userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, userId, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // ========================================
  // CONTEXT VALUE
  // ========================================
  const contextValue: RealTimeMetricContextValue = {
    isConnected,
    connectionStatus,
    currentMetrics,
    sessionStatus,
    error,
    subscribe,
    subscribeToSession,
    reconnect,
    disconnect
  };

  return (
    <RealTimeMetricContext.Provider value={contextValue}>
      {children}
    </RealTimeMetricContext.Provider>
  );
}

// ========================================
// HOOK FOR COMPONENT-LEVEL SUBSCRIPTIONS
// ========================================

export function useMetricSubscription(
  onUpdate: (update: MetricUpdate) => void,
  deps: React.DependencyList = []
) {
  const { subscribe, isConnected } = useRealTimeMetrics();

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribe(onUpdate);
    return unsubscribe;
  }, [isConnected, subscribe, ...deps]);
}

export function useSessionSubscription(
  onStatusChange: (status: SessionStatus) => void,
  deps: React.DependencyList = []
) {
  const { subscribeToSession, isConnected } = useRealTimeMetrics();

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribeToSession(onStatusChange);
    return unsubscribe;
  }, [isConnected, subscribeToSession, ...deps]);
}