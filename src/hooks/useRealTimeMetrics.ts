// useRealTimeMetrics.ts
// React hook for subscribing to real-time metrics updates via WebSocket

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { IncrementalMetrics } from '../lib/real-time-metrics';

interface MetricsUpdate {
  type: 'metrics_update';
  sessionId: string;
  metrics: IncrementalMetrics;
  timestamp: string;
}

interface SessionUpdate {
  type: 'session_update';
  sessionId: string;
  status: string;
  data?: any;
  timestamp: string;
}

type WebSocketMessage = MetricsUpdate | SessionUpdate | {
  type: 'connection_established' | 'subscription_confirmed' | 'unsubscription_confirmed' | 'pong' | 'error';
  [key: string]: any;
};

interface UseRealTimeMetricsOptions {
  sessionId?: string;
  autoConnect?: boolean;
  onMetricsUpdate?: (metrics: IncrementalMetrics, sessionId: string) => void;
  onSessionUpdate?: (status: string, sessionId: string, data?: any) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
}

interface UseRealTimeMetricsReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  
  // Current metrics
  currentMetrics: IncrementalMetrics | null;
  metricsHistory: Array<{ metrics: IncrementalMetrics; timestamp: string }>;
  
  // Connection control
  connect: () => void;
  disconnect: () => void;
  subscribeToSession: (sessionId: string) => void;
  unsubscribeFromSession: () => void;
  
  // Utilities
  clearHistory: () => void;
  getMetricsForSession: (sessionId: string) => IncrementalMetrics | null;
}

export function useRealTimeMetrics(options: UseRealTimeMetricsOptions = {}): UseRealTimeMetricsReturn {
  const { data: session } = useSession();
  const {
    sessionId,
    autoConnect = true,
    onMetricsUpdate,
    onSessionUpdate,
    onConnectionChange,
    onError
  } = options;

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMetrics, setCurrentMetrics] = useState<IncrementalMetrics | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<Array<{ metrics: IncrementalMetrics; timestamp: string }>>([]);
  const [subscribedSessionId, setSubscribedSessionId] = useState<string | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = useRef(1000); // Start with 1 second

  // Session-specific metrics cache
  const sessionMetricsRef = useRef<Map<string, IncrementalMetrics>>(new Map());

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!session?.user?.id || isConnecting || isConnected) {
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('📡 METRICS WebSocket already connected');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws/metrics`;
      
      console.log(`📡 METRICS: Connecting to WebSocket at ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('📡 METRICS WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttempts.current = 0;
        reconnectDelay.current = 1000;
        
        onConnectionChange?.(true);
        
        // Auto-subscribe to session if provided
        if (sessionId) {
          subscribeToSession(sessionId);
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('📡 METRICS WebSocket message:', message.type);

          switch (message.type) {
            case 'metrics_update':
              const metricsMsg = message as MetricsUpdate;
              console.log(`📊 METRICS UPDATE: Session ${metricsMsg.sessionId} - Confidence: ${metricsMsg.metrics.confidence}%`);
              
              // Update current metrics
              setCurrentMetrics(metricsMsg.metrics);
              
              // Add to history
              setMetricsHistory(prev => [...prev, {
                metrics: metricsMsg.metrics,
                timestamp: metricsMsg.timestamp
              }].slice(-50)); // Keep only last 50 updates
              
              // Cache session-specific metrics
              sessionMetricsRef.current.set(metricsMsg.sessionId, metricsMsg.metrics);
              
              // Trigger callback
              onMetricsUpdate?.(metricsMsg.metrics, metricsMsg.sessionId);
              break;

            case 'session_update':
              const sessionMsg = message as SessionUpdate;
              console.log(`📱 SESSION UPDATE: ${sessionMsg.status} for session ${sessionMsg.sessionId}`);
              onSessionUpdate?.(sessionMsg.status, sessionMsg.sessionId, sessionMsg.data);
              break;

            case 'connection_established':
              console.log('📡 METRICS: Connection established');
              break;

            case 'subscription_confirmed':
              console.log(`📡 METRICS: Subscribed to session ${message.sessionId}`);
              setSubscribedSessionId(message.sessionId);
              break;

            case 'unsubscription_confirmed':
              console.log('📡 METRICS: Unsubscribed from session');
              setSubscribedSessionId(null);
              break;

            case 'pong':
              // Heartbeat response
              break;

            case 'error':
              console.error('📡 METRICS WebSocket server error:', message.message);
              setError(message.message || 'WebSocket server error');
              onError?.(message.message || 'WebSocket server error');
              break;

            default:
              console.log(`📡 METRICS: Unknown message type: ${message.type}`);
          }
        } catch (parseError) {
          console.error('Error parsing WebSocket message:', parseError);
          setError('Failed to parse WebSocket message');
          onError?.('Failed to parse WebSocket message');
        }
      };

      ws.onclose = (event) => {
        console.log(`📡 METRICS WebSocket closed: ${event.code} ${event.reason}`);
        setIsConnected(false);
        setIsConnecting(false);
        setSubscribedSessionId(null);
        onConnectionChange?.(false);

        // Attempt reconnection if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, 10000); // Max 10 seconds
          
          console.log(`📡 METRICS: Reconnecting in ${reconnectDelay.current}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay.current);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError('Max reconnection attempts reached');
          onError?.('Max reconnection attempts reached');
        }
      };

      ws.onerror = (error) => {
        console.error('📡 METRICS WebSocket error:', error);
        setError('WebSocket connection error');
        setIsConnecting(false);
        onError?.('WebSocket connection error');
      };

    } catch (connectError) {
      console.error('Error creating WebSocket connection:', connectError);
      setError('Failed to create WebSocket connection');
      setIsConnecting(false);
      onError?.('Failed to create WebSocket connection');
    }
  }, [session?.user?.id, isConnecting, isConnected, sessionId, onConnectionChange, onMetricsUpdate, onSessionUpdate, onError]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setSubscribedSessionId(null);
    setError(null);
    reconnectAttempts.current = 0;
    
    onConnectionChange?.(false);
  }, [onConnectionChange]);

  // Subscribe to session updates
  const subscribeToSession = useCallback((newSessionId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('📡 METRICS: Cannot subscribe - WebSocket not connected');
      return;
    }

    try {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe_session',
        sessionId: newSessionId
      }));
      console.log(`📡 METRICS: Subscribing to session ${newSessionId}`);
    } catch (sendError) {
      console.error('Error subscribing to session:', sendError);
      onError?.('Failed to subscribe to session');
    }
  }, [onError]);

  // Unsubscribe from session updates
  const unsubscribeFromSession = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe_session'
      }));
      console.log('📡 METRICS: Unsubscribing from session');
    } catch (sendError) {
      console.error('Error unsubscribing from session:', sendError);
    }
  }, []);

  // Clear metrics history
  const clearHistory = useCallback(() => {
    setMetricsHistory([]);
    setCurrentMetrics(null);
    sessionMetricsRef.current.clear();
  }, []);

  // Get metrics for specific session
  const getMetricsForSession = useCallback((targetSessionId: string): IncrementalMetrics | null => {
    return sessionMetricsRef.current.get(targetSessionId) || null;
  }, []);

  // Auto-connect on mount if enabled and user is authenticated
  useEffect(() => {
    if (autoConnect && session?.user?.id && !isConnected && !isConnecting) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [session?.user?.id, autoConnect]); // Only depend on essential values

  // Subscribe to sessionId changes
  useEffect(() => {
    if (sessionId && isConnected && subscribedSessionId !== sessionId) {
      subscribeToSession(sessionId);
    }
  }, [sessionId, isConnected, subscribedSessionId, subscribeToSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    // Connection state
    isConnected,
    isConnecting,
    error,
    
    // Current metrics
    currentMetrics,
    metricsHistory,
    
    // Connection control
    connect,
    disconnect,
    subscribeToSession,
    unsubscribeFromSession,
    
    // Utilities
    clearHistory,
    getMetricsForSession
  };
}