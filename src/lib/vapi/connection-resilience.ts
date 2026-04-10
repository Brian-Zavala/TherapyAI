// @ts-nocheck
/**
 * VAPI Connection Resilience and Retry Logic
 * Handles network issues, reconnections, and recovery during voice sessions
 */

import Vapi from '@vapi-ai/web';

export interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'unknown';
  lastConnectionTime: number | null;
  failureCount: number;
  lastError: string | null;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  connectionTimeoutMs: number;
}

export interface ConnectionMetrics {
  totalConnections: number;
  totalFailures: number;
  averageConnectionTime: number;
  currentSession: {
    startTime: number;
    reconnections: number;
    totalDowntime: number;
  };
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  connectionTimeoutMs: 15000
};

export class VapiConnectionManager {
  private vapiInstance: Vapi | null = null;
  private retryConfig: RetryConfig;
  private connectionState: ConnectionState;
  private metrics: ConnectionMetrics;
  private retryTimeouts: Set<NodeJS.Timeout> = new Set();
  private eventListeners: Map<string, Function[]> = new Map();
  private isDestroyed = false;

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.connectionState = {
      isConnected: false,
      isConnecting: false,
      connectionQuality: 'unknown',
      lastConnectionTime: null,
      failureCount: 0,
      lastError: null
    };
    this.metrics = {
      totalConnections: 0,
      totalFailures: 0,
      averageConnectionTime: 0,
      currentSession: {
        startTime: Date.now(),
        reconnections: 0,
        totalDowntime: 0
      }
    };
  }

  /**
   * Initialize VAPI with retry logic
   */
  async initializeWithRetry(apiKey: string, assistantConfig?: any): Promise<Vapi> {
    if (this.isDestroyed) {
      throw new Error('Connection manager has been destroyed');
    }

    this.connectionState.isConnecting = true;
    this.connectionState.lastError = null;

    try {
      const instance = await this.attemptConnection(apiKey, assistantConfig);
      this.vapiInstance = instance;
      this.setupEventHandlers(instance);
      
      this.connectionState.isConnected = true;
      this.connectionState.isConnecting = false;
      this.connectionState.lastConnectionTime = Date.now();
      this.connectionState.failureCount = 0;
      this.metrics.totalConnections++;

      this.emit('connection:established', { instance, metrics: this.getMetrics() });
      console.log('[VapiConnection] ✅ Connection established successfully');

      return instance;
    } catch (error) {
      this.connectionState.isConnecting = false;
      this.connectionState.lastError = error instanceof Error ? error.message : String(error);
      this.connectionState.failureCount++;
      this.metrics.totalFailures++;

      this.emit('connection:failed', { error, state: this.connectionState });
      console.error('[VapiConnection] ❌ Failed to establish connection:', error);
      
      throw error;
    }
  }

  /**
   * Attempt a single connection with timeout
   */
  private async attemptConnection(apiKey: string, assistantConfig?: any): Promise<Vapi> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Connection timeout after ${this.retryConfig.connectionTimeoutMs}ms`));
      }, this.retryConfig.connectionTimeoutMs);

      try {
        const instance = new Vapi(apiKey);
        
        // Wait for call-start to confirm connection
        const onCallStart = () => {
          clearTimeout(timeout);
          instance.off('call-start', onCallStart);
          instance.off('error', onError);
          resolve(instance);
        };

        const onError = (error: any) => {
          clearTimeout(timeout);
          instance.off('call-start', onCallStart);
          instance.off('error', onError);
          reject(error);
        };

        instance.on('call-start', onCallStart);
        instance.on('error', onError);

        // Start the call
        if (assistantConfig) {
          instance.start(assistantConfig);
        }
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Reconnect with exponential backoff
   */
  async reconnectWithBackoff(apiKey: string, assistantConfig?: any): Promise<void> {
    if (this.isDestroyed || this.connectionState.isConnecting) {
      return;
    }

    const attemptReconnection = async (attemptNumber: number): Promise<void> => {
      if (attemptNumber > this.retryConfig.maxRetries) {
        this.emit('connection:exhausted', { 
          attempts: attemptNumber - 1, 
          state: this.connectionState 
        });
        throw new Error(`Failed to reconnect after ${this.retryConfig.maxRetries} attempts`);
      }

      try {
        console.log(`[VapiConnection] 🔄 Reconnection attempt ${attemptNumber}/${this.retryConfig.maxRetries}`);
        this.metrics.currentSession.reconnections++;

        await this.initializeWithRetry(apiKey, assistantConfig);
        
        console.log(`[VapiConnection] ✅ Reconnected successfully on attempt ${attemptNumber}`);
        this.emit('connection:recovered', { 
          attempt: attemptNumber, 
          instance: this.vapiInstance 
        });

      } catch (error) {
        const delay = Math.min(
          this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attemptNumber - 1),
          this.retryConfig.maxDelayMs
        );

        console.log(`[VapiConnection] ⏳ Retry ${attemptNumber} failed, waiting ${delay}ms before next attempt`);
        this.emit('connection:retry', { 
          attempt: attemptNumber, 
          delay, 
          error: error instanceof Error ? error.message : String(error) 
        });

        const timeout = setTimeout(() => {
          this.retryTimeouts.delete(timeout);
          attemptReconnection(attemptNumber + 1);
        }, delay);

        this.retryTimeouts.add(timeout);
      }
    };

    await attemptReconnection(1);
  }

  /**
   * Setup event handlers for connection monitoring
   */
  private setupEventHandlers(instance: Vapi): void {
    // Connection quality monitoring
    instance.on('transport-state-change', (data: any) => {
      const state = data?.state || 'unknown';
      console.log(`[VapiConnection] 📊 Transport state: ${state}`);

      switch (state) {
        case 'connected':
          this.connectionState.connectionQuality = 'excellent';
          break;
        case 'connecting':
          this.connectionState.connectionQuality = 'poor';
          break;
        case 'disconnected':
        case 'failed':
          this.connectionState.isConnected = false;
          this.connectionState.connectionQuality = 'poor';
          this.emit('connection:lost', { state, timestamp: Date.now() });
          break;
      }
    });

    // ICE connection state monitoring
    instance.on('ice-connection-state-change', (data: any) => {
      const state = data?.state || 'unknown';
      console.log(`[VapiConnection] 🧊 ICE state: ${state}`);

      if (state === 'disconnected' || state === 'failed') {
        this.connectionState.isConnected = false;
        this.emit('connection:ice-failed', { state, timestamp: Date.now() });
      }
    });

    // Call state monitoring
    instance.on('call-end', (data: any) => {
      console.log('[VapiConnection] 📞 Call ended');
      this.connectionState.isConnected = false;
      this.emit('connection:call-ended', { data, timestamp: Date.now() });
    });

    // Error monitoring
    instance.on('error', (error: any) => {
      console.error('[VapiConnection] ❌ VAPI error:', error);
      this.connectionState.lastError = typeof error === 'string' ? error : error?.message || 'Unknown error';
      this.connectionState.isConnected = false;
      this.emit('connection:error', { error, timestamp: Date.now() });
    });
  }

  /**
   * Check connection health
   */
  checkHealth(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!this.connectionState.isConnected) {
      issues.push('Not connected to VAPI');
    }

    if (this.connectionState.connectionQuality === 'poor') {
      issues.push('Poor connection quality detected');
    }

    if (this.connectionState.failureCount > 3) {
      issues.push(`High failure count: ${this.connectionState.failureCount}`);
    }

    const timeSinceConnection = this.connectionState.lastConnectionTime ? 
      Date.now() - this.connectionState.lastConnectionTime : 0;
    
    if (timeSinceConnection > 300000) { // 5 minutes
      issues.push('Connection is stale (>5 minutes old)');
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }

  /**
   * Get current connection metrics
   */
  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Event emitter functionality
   */
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[VapiConnection] Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Stop all retry attempts and cleanup
   */
  destroy(): void {
    console.log('[VapiConnection] 🧹 Destroying connection manager');
    
    this.isDestroyed = true;
    
    // Clear all retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();

    // Stop VAPI instance
    if (this.vapiInstance) {
      try {
        this.vapiInstance.stop();
      } catch (error) {
        console.warn('[VapiConnection] Error stopping VAPI instance:', error);
      }
      this.vapiInstance = null;
    }

    // Clear event listeners
    this.eventListeners.clear();

    // Reset state
    this.connectionState.isConnected = false;
    this.connectionState.isConnecting = false;
  }

  /**
   * Get current VAPI instance
   */
  getInstance(): Vapi | null {
    return this.vapiInstance;
  }
}