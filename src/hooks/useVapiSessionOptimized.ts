// Phase 2: Memory leak-free VAPI session hook
// Fixes cleanup issues and prevents memory leaks

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface VapiSessionState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  callId: string | null;
  transcript: string[];
  metrics: {
    duration: number;
    confidence: number;
    engagement: number;
  };
}

interface UseVapiSessionOptimized {
  state: VapiSessionState;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  sendMessage: (message: string) => Promise<boolean>;
  clearError: () => void;
}

export function useVapiSessionOptimized(): UseVapiSessionOptimized {
  const { data: session } = useSession();
  const [state, setState] = useState<VapiSessionState>({
    isConnected: false,
    isLoading: false,
    error: null,
    callId: null,
    transcript: [],
    metrics: {
      duration: 0,
      confidence: 0,
      engagement: 0
    }
  });

  // Refs for cleanup tracking
  const vapiClientRef = useRef<any>(null);
  const eventListenersRef = useRef<Map<string, Function>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cleanupRef = useRef<boolean>(false);

  // Cleanup function - critical for memory leak prevention
  const cleanup = useCallback(() => {
    if (cleanupRef.current) return; // Prevent double cleanup
    cleanupRef.current = true;

    // Clear all timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Abort any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Remove all event listeners
    if (vapiClientRef.current) {
      eventListenersRef.current.forEach((removeListener, eventName) => {
        try {
          if (typeof removeListener === 'function') {
            removeListener();
          }
        } catch (error) {
          console.warn(`Failed to remove listener for ${eventName}:`, error);
        }
      });
      eventListenersRef.current.clear();

      // Disconnect VAPI client
      try {
        if (vapiClientRef.current.disconnect) {
          vapiClientRef.current.disconnect();
        }
      } catch (error) {
        console.warn('Error disconnecting VAPI client:', error);
      }
      
      vapiClientRef.current = null;
    }

    // Reset state
    setState({
      isConnected: false,
      isLoading: false,
      error: null,
      callId: null,
      transcript: [],
      metrics: {
        duration: 0,
        confidence: 0,
        engagement: 0
      }
    });

    reconnectAttemptRef.current = 0;
    cleanupRef.current = false;
  }, []);

  // Safe state update with component mount check
  const safeSetState = useCallback((updater: Partial<VapiSessionState> | ((prev: VapiSessionState) => VapiSessionState)) => {
    if (cleanupRef.current) return; // Don't update if component is unmounting
    
    setState(prev => {
      if (typeof updater === 'function') {
        return updater(prev);
      }
      return { ...prev, ...updater };
    });
  }, []);

  // Initialize VAPI client with proper cleanup
  const initializeVapi = useCallback(async () => {
    if (!session?.user?.id) {
      throw new Error('User session required');
    }

    // Create abort controller for this operation
    abortControllerRef.current = new AbortController();

    try {
      // Dynamic import to avoid SSR issues
      const { default: Vapi } = await import('@vapi-ai/web');
      
      const client = new Vapi({
        apiKey: process.env.NEXT_PUBLIC_VAPI_API_KEY!,
        baseUrl: process.env.NEXT_PUBLIC_VAPI_BASE_URL || 'https://api.vapi.ai'
      });

      vapiClientRef.current = client;

      // Setup event listeners with cleanup tracking
      const addEventListenerWithCleanup = (eventName: string, handler: Function) => {
        client.on(eventName, handler);
        eventListenersRef.current.set(eventName, () => client.off(eventName, handler));
      };

      addEventListenerWithCleanup('call-start', (call: any) => {
        safeSetState({
          isConnected: true,
          isLoading: false,
          callId: call.id,
          error: null
        });
      });

      addEventListenerWithCleanup('call-end', () => {
        safeSetState({
          isConnected: false,
          isLoading: false,
          callId: null
        });
      });

      addEventListenerWithCleanup('speech-start', () => {
        // Handle speech start
      });

      addEventListenerWithCleanup('speech-end', () => {
        // Handle speech end
      });

      addEventListenerWithCleanup('transcript', (transcript: any) => {
        if (transcript?.text) {
          safeSetState(prev => ({
            ...prev,
            transcript: [...prev.transcript, transcript.text]
          }));
        }
      });

      addEventListenerWithCleanup('error', (error: any) => {
        console.error('VAPI error:', error);
        safeSetState({
          error: error.message || 'Unknown VAPI error',
          isLoading: false,
          isConnected: false
        });
      });

      // Connection timeout with cleanup
      timeoutRef.current = setTimeout(() => {
        if (!cleanupRef.current) {
          safeSetState({
            error: 'Connection timeout',
            isLoading: false
          });
        }
      }, 30000);

      return client;
    } catch (error) {
      console.error('VAPI initialization error:', error);
      throw error;
    }
  }, [session?.user?.id, safeSetState]);

  const connect = useCallback(async (): Promise<boolean> => {
    if (state.isConnected || state.isLoading) {
      return state.isConnected;
    }

    safeSetState({ isLoading: true, error: null });

    try {
      const client = vapiClientRef.current || await initializeVapi();
      
      if (abortControllerRef.current?.signal.aborted) {
        return false;
      }

      // Get assistant config
      const response = await fetch('/api/vapi/assistant', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: abortControllerRef.current?.signal
      });

      if (!response.ok) {
        throw new Error('Failed to get assistant configuration');
      }

      const assistantConfig = await response.json();

      // Start call
      await client.start(assistantConfig);
      
      return true;
    } catch (error) {
      console.error('Connection error:', error);
      safeSetState({
        error: error instanceof Error ? error.message : 'Connection failed',
        isLoading: false
      });
      return false;
    }
  }, [state.isConnected, state.isLoading, initializeVapi, safeSetState]);

  const disconnect = useCallback(async (): Promise<void> => {
    if (!vapiClientRef.current) return;

    try {
      await vapiClientRef.current.stop();
    } catch (error) {
      console.error('Disconnect error:', error);
    } finally {
      cleanup();
    }
  }, [cleanup]);

  const sendMessage = useCallback(async (message: string): Promise<boolean> => {
    if (!vapiClientRef.current || !state.isConnected) {
      return false;
    }

    try {
      await vapiClientRef.current.send({
        type: 'add-message',
        message: {
          role: 'user',
          content: message
        }
      });
      return true;
    } catch (error) {
      console.error('Send message error:', error);
      safeSetState({
        error: error instanceof Error ? error.message : 'Failed to send message'
      });
      return false;
    }
  }, [state.isConnected, safeSetState]);

  const clearError = useCallback(() => {
    safeSetState({ error: null });
  }, [safeSetState]);

  // Cleanup on unmount - CRITICAL for preventing memory leaks
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Auto-cleanup on session change
  useEffect(() => {
    if (!session?.user?.id && vapiClientRef.current) {
      cleanup();
    }
  }, [session?.user?.id, cleanup]);

  // Page visibility cleanup - prevent background connections
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && state.isConnected) {
        console.log('Page hidden, disconnecting VAPI session');
        disconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.isConnected, disconnect]);

  // Prevent memory leaks on navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanup();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [cleanup]);

  return {
    state,
    connect,
    disconnect,
    sendMessage,
    clearError
  };
}