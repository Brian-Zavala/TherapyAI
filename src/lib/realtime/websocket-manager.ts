// src/lib/realtime/websocket-manager.ts
"use client";

import { EventEmitter } from 'events';

export type ConnectionState = 
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export type RealtimeEvent = {
  type: 'metrics' | 'session' | 'notification' | 'presence' | 'system';
  data: any;
  timestamp: string;
  userId?: string;
  sessionId?: string;
};

export interface WebSocketConfig {
  url?: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  reconnectDecay?: number;
  reconnectAttempts?: number;
  timeout?: number;
  pingInterval?: number;
  enableSSEFallback?: boolean;
  enablePollingFallback?: boolean;
  pollingInterval?: number;
  debug?: boolean;
}

const DEFAULT_CONFIG: Required<WebSocketConfig> = {
  url: process.env.NEXT_PUBLIC_WS_URL || (
    process.env.RAILWAY_PUBLIC_DOMAIN 
      ? `wss://${process.env.RAILWAY_PUBLIC_DOMAIN}/ws`
      : 'ws://localhost:3001'
  ),
  reconnect: true,
  reconnectInterval: 1000,
  reconnectDecay: 1.5,
  reconnectAttempts: 10,
  timeout: 30000,
  pingInterval: 25000,
  enableSSEFallback: true,
  enablePollingFallback: true,
  pollingInterval: 5000,
  debug: process.env.NODE_ENV === 'development'
};

export class WebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private eventSource: EventSource | null = null;
  private config: Required<WebSocketConfig>;
  private state: ConnectionState = 'disconnected';
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private reconnectAttempt = 0;
  private messageQueue: any[] = [];
  private lastMessageTime = Date.now();
  private connectionMode: 'websocket' | 'sse' | 'polling' | null = null;
  private authToken: string | null = null;
  private userId: string | null = null;
  private sessionId: string | null = null;

  constructor(config: WebSocketConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setMaxListeners(20); // Prevent memory leak warnings
  }

  // ========================================
  // CONNECTION MANAGEMENT
  // ========================================

  async connect(authToken: string, userId: string, sessionId?: string): Promise<void> {
    this.authToken = authToken;
    this.userId = userId;
    this.sessionId = sessionId;
    
    this.log('🔌 Initiating connection...');
    this.setState('connecting');
    
    try {
      // Try WebSocket first
      await this.connectWebSocket();
    } catch (wsError) {
      this.log('⚠️ WebSocket failed, trying SSE fallback...', wsError);
      
      if (this.config.enableSSEFallback) {
        try {
          await this.connectSSE();
        } catch (sseError) {
          this.log('⚠️ SSE failed, falling back to polling...', sseError);
          
          if (this.config.enablePollingFallback) {
            this.startPolling();
          } else {
            throw new Error('All connection methods failed');
          }
        }
      } else if (this.config.enablePollingFallback) {
        this.startPolling();
      } else {
        throw wsError;
      }
    }
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = new URL(this.config.url);
      wsUrl.searchParams.set('token', this.authToken!);
      wsUrl.searchParams.set('userId', this.userId!);
      if (this.sessionId) {
        wsUrl.searchParams.set('sessionId', this.sessionId);
      }

      this.ws = new WebSocket(wsUrl.toString());
      
      const timeout = setTimeout(() => {
        this.ws?.close();
        reject(new Error('WebSocket connection timeout'));
      }, this.config.timeout);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        this.connectionMode = 'websocket';
        this.setState('connected');
        this.reconnectAttempt = 0;
        this.startPing();
        this.flushMessageQueue();
        this.log('✅ WebSocket connected');
        resolve();
      };

      this.ws.onerror = (error) => {
        clearTimeout(timeout);
        this.log('❌ WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = (event) => {
        clearTimeout(timeout);
        this.stopPing();
        this.log(`🔌 WebSocket closed: ${event.code} - ${event.reason}`);
        
        if (this.state === 'connected' && this.config.reconnect) {
          this.handleReconnect();
        } else {
          this.setState('disconnected');
        }
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    });
  }

  private async connectSSE(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sseUrl = new URL(this.config.url.replace('ws://', 'http://').replace('wss://', 'https://'));
      sseUrl.pathname = '/api/realtime/sse';
      sseUrl.searchParams.set('token', this.authToken!);
      sseUrl.searchParams.set('userId', this.userId!);
      if (this.sessionId) {
        sseUrl.searchParams.set('sessionId', this.sessionId);
      }

      this.eventSource = new EventSource(sseUrl.toString());
      
      const timeout = setTimeout(() => {
        this.eventSource?.close();
        reject(new Error('SSE connection timeout'));
      }, this.config.timeout);

      this.eventSource.onopen = () => {
        clearTimeout(timeout);
        this.connectionMode = 'sse';
        this.setState('connected');
        this.reconnectAttempt = 0;
        this.log('✅ SSE connected');
        resolve();
      };

      this.eventSource.onerror = (error) => {
        clearTimeout(timeout);
        this.log('❌ SSE error:', error);
        
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.eventSource = null;
          
          if (this.state === 'connected' && this.config.reconnect) {
            this.handleReconnect();
          } else {
            reject(error);
          }
        }
      };

      this.eventSource.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      // Custom event types
      this.eventSource.addEventListener('metrics', (event) => {
        this.handleMessage(event.data, 'metrics');
      });

      this.eventSource.addEventListener('session', (event) => {
        this.handleMessage(event.data, 'session');
      });

      this.eventSource.addEventListener('notification', (event) => {
        this.handleMessage(event.data, 'notification');
      });
    });
  }

  private startPolling(): void {
    this.connectionMode = 'polling';
    this.setState('connected');
    this.log('📊 Started polling mode');
    
    const poll = async () => {
      try {
        const response = await fetch('/api/realtime/poll', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({
            userId: this.userId,
            sessionId: this.sessionId,
            lastMessageTime: this.lastMessageTime
          })
        });

        if (response.ok) {
          const events = await response.json();
          events.forEach((event: RealtimeEvent) => {
            this.handleMessage(JSON.stringify(event));
          });
        }
      } catch (error) {
        this.log('❌ Polling error:', error);
      }
    };

    poll(); // Initial poll
    this.pollingTimer = setInterval(poll, this.config.pollingInterval);
  }

  // ========================================
  // MESSAGE HANDLING
  // ========================================

  private handleMessage(data: string, eventType?: string): void {
    try {
      const message: RealtimeEvent = JSON.parse(data);
      this.lastMessageTime = Date.now();
      
      // Apply event type if provided (for SSE)
      if (eventType) {
        message.type = eventType as RealtimeEvent['type'];
      }
      
      this.log('📨 Received:', message.type, message);
      
      // Emit typed events
      this.emit('message', message);
      this.emit(message.type, message.data);
      
      // Emit specific events for common patterns
      if (message.type === 'metrics' && message.sessionId) {
        this.emit(`session:${message.sessionId}:metrics`, message.data);
      }
      
      if (message.type === 'presence' && message.userId) {
        this.emit(`user:${message.userId}:presence`, message.data);
      }
    } catch (error) {
      this.log('❌ Message parsing error:', error, data);
      this.emit('error', error);
    }
  }

  send(type: RealtimeEvent['type'], data: any): void {
    const message: RealtimeEvent = {
      type,
      data,
      timestamp: new Date().toISOString(),
      userId: this.userId!,
      sessionId: this.sessionId
    };

    if (this.state !== 'connected') {
      this.log('⏳ Queueing message (not connected):', message);
      this.messageQueue.push(message);
      return;
    }

    switch (this.connectionMode) {
      case 'websocket':
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(message));
          this.log('📤 Sent via WebSocket:', message);
        } else {
          this.messageQueue.push(message);
        }
        break;
        
      case 'sse':
        // SSE is receive-only, use HTTP for sending
        this.sendViaHTTP(message);
        break;
        
      case 'polling':
        // Polling mode uses HTTP for sending
        this.sendViaHTTP(message);
        break;
    }
  }

  private async sendViaHTTP(message: RealtimeEvent): Promise<void> {
    try {
      const response = await fetch('/api/realtime/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`HTTP send failed: ${response.status}`);
      }
      
      this.log('📤 Sent via HTTP:', message);
    } catch (error) {
      this.log('❌ HTTP send error:', error);
      this.emit('error', error);
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message.type, message.data);
    }
  }

  // ========================================
  // CONNECTION HEALTH
  // ========================================

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
        this.log('🏓 Ping sent');
      }
    }, this.config.pingInterval);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  // ========================================
  // RECONNECTION LOGIC
  // ========================================

  private handleReconnect(): void {
    if (this.reconnectAttempt >= this.config.reconnectAttempts) {
      this.log('❌ Max reconnection attempts reached');
      this.setState('error');
      this.emit('max_reconnect_attempts');
      return;
    }

    this.setState('reconnecting');
    this.reconnectAttempt++;
    
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(this.config.reconnectDecay, this.reconnectAttempt - 1),
      30000 // Max 30 seconds
    );
    
    this.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt}/${this.config.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.authToken!, this.userId!, this.sessionId);
    }, delay);
  }

  // ========================================
  // LIFECYCLE MANAGEMENT
  // ========================================

  disconnect(): void {
    this.log('👋 Disconnecting...');
    
    // Clear all timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    
    this.stopPing();
    
    // Close connections
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.setState('disconnected');
    this.connectionMode = null;
    this.messageQueue = [];
  }

  // ========================================
  // STATE MANAGEMENT
  // ========================================

  private setState(state: ConnectionState): void {
    const prevState = this.state;
    this.state = state;
    
    if (prevState !== state) {
      this.log(`📊 State: ${prevState} → ${state}`);
      this.emit('state_change', { from: prevState, to: state });
      this.emit(state);
    }
  }

  getState(): ConnectionState {
    return this.state;
  }

  getConnectionMode(): typeof this.connectionMode {
    return this.connectionMode;
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }

  // ========================================
  // UTILITIES
  // ========================================

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log(`[WebSocketManager]`, ...args);
    }
  }

  // ========================================
  // EVENT SUBSCRIPTIONS
  // ========================================

  subscribeToSession(sessionId: string, callback: (data: any) => void): () => void {
    const eventName = `session:${sessionId}:metrics`;
    this.on(eventName, callback);
    
    return () => {
      this.off(eventName, callback);
    };
  }

  subscribeToUser(userId: string, callback: (data: any) => void): () => void {
    const eventName = `user:${userId}:presence`;
    this.on(eventName, callback);
    
    return () => {
      this.off(eventName, callback);
    };
  }
}

// Singleton instance
let instance: WebSocketManager | null = null;

export function getWebSocketManager(config?: WebSocketConfig): WebSocketManager {
  if (!instance) {
    instance = new WebSocketManager(config);
  }
  return instance;
}

export function destroyWebSocketManager(): void {
  if (instance) {
    instance.disconnect();
    instance.removeAllListeners();
    instance = null;
  }
}