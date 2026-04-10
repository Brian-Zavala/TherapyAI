import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from '@/hooks/useClerkSession'

export interface MetricsUpdate {
  type: 'metrics_update' | 'session_update';
  sessionId: string;
  metrics?: any;
  status?: string;
  data?: any;
  timestamp: number;
}

interface UseMetricsWebSocketOptions {
  sessionId?: string;
  onMetricsUpdate?: (metrics: MetricsUpdate) => void;
  onSessionUpdate?: (update: MetricsUpdate) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useMetricsWebSocket(options: UseMetricsWebSocketOptions = {}) {
  const {
    sessionId,
    onMetricsUpdate,
    onSessionUpdate,
    autoReconnect = true,
    reconnectInterval = 1000,
    maxReconnectAttempts = 10
  } = options;

  const { data: session } = useSession();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      // Use the new path that doesn't conflict with API routes
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const userId = session?.user?.id || 'dev-user';
      const wsUrl = `${protocol}//${host}/ws/realtime/metrics?userId=${userId}${sessionId ? `&sessionId=${sessionId}` : ''}`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setLastError(null);
        reconnectAttemptsRef.current = 0;

        // Subscribe to session if provided
        if (sessionId) {
          ws.send(JSON.stringify({
            type: 'subscribe',
            sessionId
          }));
        }

        // Start client-side ping
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000); // Every 25 seconds
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'metrics_update' && onMetricsUpdate) {
            onMetricsUpdate(data);
          } else if (data.type === 'session_update' && onSessionUpdate) {
            onSessionUpdate(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setLastError('Connection error');
      };

      ws.onclose = (event) => {
        console.log(`WebSocket closed - Code: ${event.code}, Reason: ${event.reason}`);
        setIsConnected(false);
        wsRef.current = null;

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Handle reconnection
        if (autoReconnect && event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(reconnectInterval * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setLastError('Failed to connect');
    }
  }, [session?.user?.id, sessionId, onMetricsUpdate, onSessionUpdate, autoReconnect, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
  }, []);

  const sendMetrics = useCallback((metrics: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'metrics',
        data: metrics
      }));
    } else {
      console.warn('Cannot send metrics - WebSocket not connected');
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastError,
    sendMetrics,
    reconnect: connect,
    disconnect
  };
}