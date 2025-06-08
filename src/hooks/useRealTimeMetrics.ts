// useRealTimeMetrics.ts
// React hook for subscribing to real-time metrics updates via WebSocket

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { IncrementalMetrics } from '../lib/real-time-metrics-optimized';

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
  connectionAttempts: number;
  maxAttempts: number;
  
  // Current metrics
  currentMetrics: IncrementalMetrics | null;
  metricsHistory: Array<{ metrics: IncrementalMetrics; timestamp: string }>;
  
  // Connection control
  connect: () => void;
  disconnect: () => void;
  retry: () => void;
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
    // In development, allow connection without authentication
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!isDevelopment && !session?.user?.id) {
      console.log('📡 METRICS: Cannot connect - no user session');
      setError('User not authenticated');
      return;
    }

    if (isConnecting) {
      console.log('📡 METRICS: Connection already in progress');
      return;
    }

    if (isConnected && wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('📡 METRICS: WebSocket already connected');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws/metrics`;
      
      console.log(`📡 METRICS: Connecting to WebSocket at ${wsUrl} (attempt ${reconnectAttempts.current + 1})`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.error('📡 METRICS: Connection timeout');
          ws.close();
          setError('Connection timeout');
          setIsConnecting(false);
        }
      }, 10000); // 10 second timeout

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('📡 METRICS WebSocket connected successfully');
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
        clearTimeout(connectionTimeout);
        
        const isNormalClosure = event.code === 1000;
        const closeReasons: Record<number, string> = {
          1001: 'Browser navigating away',
          1006: 'Connection lost unexpectedly',
          1008: 'Authentication failed',
          1011: 'Server error',
          1012: 'Server restarting'
        };
        
        const reason = closeReasons[event.code] || event.reason || 'Unknown reason';
        console.log(`📡 METRICS WebSocket closed: ${event.code} (${reason})`);
        
        setIsConnected(false);
        setIsConnecting(false);
        setSubscribedSessionId(null);
        onConnectionChange?.(false);

        // Don't reconnect if it was a normal closure or authentication failed
        if (isNormalClosure || event.code === 1008) {
          if (event.code === 1008) {
            setError('Authentication failed - please refresh the page');
            onError?.('Authentication failed - please refresh the page');
          }
          return;
        }

        // Attempt reconnection for unexpected closures
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000); // Max 30 seconds
          
          const attemptInfo = `${reconnectAttempts.current}/${maxReconnectAttempts}`;
          console.log(`📡 METRICS: Reconnecting in ${reconnectDelay.current}ms (attempt ${attemptInfo}) due to: ${reason}`);
          setError(`Connection lost: ${reason}. Reconnecting... (${attemptInfo})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (reconnectAttempts.current < maxReconnectAttempts) {
              connect();
            }
          }, reconnectDelay.current);
        } else {
          const finalError = `Max reconnection attempts reached after ${maxReconnectAttempts} tries. Please refresh the page.`;
          setError(finalError);
          onError?.(finalError);
          console.error('📡 METRICS:', finalError);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error('📡 METRICS WebSocket error:', error);
        
        const errorMessage = reconnectAttempts.current > 0 
          ? `Connection error (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`
          : 'WebSocket connection error';
          
        setError(errorMessage);
        setIsConnecting(false);
        onError?.(errorMessage);
      };

    } catch (connectError) {
      console.error('Error creating WebSocket connection:', connectError);
      const errorMessage = 'Failed to create WebSocket connection - please check your network';
      setError(errorMessage);
      setIsConnecting(false);
      onError?.(errorMessage);
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

  // Manual retry function - resets attempts and tries to connect
  const retry = useCallback(() => {
    console.log('📡 METRICS: Manual retry requested');
    reconnectAttempts.current = 0;
    reconnectDelay.current = 1000;
    setError(null);
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    disconnect();
    setTimeout(() => {
      connect();
    }, 500); // Small delay to ensure disconnect is complete
  }, [connect, disconnect]);

  // Auto-connect on mount if enabled and user is authenticated (or in development)
  useEffect(() => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const canConnect = isDevelopment || session?.user?.id;
    
    if (autoConnect && canConnect && !isConnected && !isConnecting) {
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
    connectionAttempts: reconnectAttempts.current,
    maxAttempts: maxReconnectAttempts,
    
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
  };
}