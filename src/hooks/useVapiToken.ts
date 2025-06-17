import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import type { VapiTokenResponse } from '@/lib/vapi-jwt.service';

interface UseVapiTokenOptions {
  scope?: 'public' | 'private';
  autoRefresh?: boolean;
  onError?: (error: Error) => void;
}

interface UseVapiTokenReturn {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  refreshToken: () => Promise<void>;
  isExpiringSoon: boolean;
  expiresAt: number | null;
}

export function useVapiToken({
  scope = 'public',
  autoRefresh = true,
  onError,
}: UseVapiTokenOptions = {}): UseVapiTokenReturn {
  const { data: session, status } = useSession();
  const [tokenData, setTokenData] = useState<VapiTokenResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const isRefreshingRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchToken = useCallback(async (): Promise<void> => {
    // Prevent concurrent refresh requests
    if (isRefreshingRef.current || !mountedRef.current) return;
    
    // Don't fetch if no session
    if (status !== 'authenticated' || !session?.user?.id) {
      setError('No authenticated session');
      return;
    }
    
    isRefreshingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/vapi/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scope, userId: session?.user?.id }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - extract retry information
          const retryAfter = response.headers.get('Retry-After');
          const resetTime = response.headers.get('X-RateLimit-Reset');
          
          const errorData = await response.json();
          const retrySeconds = retryAfter ? parseInt(retryAfter) : 60;
          
          throw new Error(
            `Rate limit exceeded. Please try again in ${Math.ceil(retrySeconds / 60)} minutes.`
          );
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const newTokenData: VapiTokenResponse = await response.json();
      
      if (!mountedRef.current) return; // Component unmounted
      
      setTokenData(newTokenData);
      setError(null);

      // Set up auto-refresh if enabled
      if (autoRefresh && newTokenData.expiresAt) {
        // Calculate time until refresh (5 minutes before expiry)
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = newTokenData.expiresAt - now;
        const refreshTime = Math.max((timeUntilExpiry - 300) * 1000, 10000); // At least 10 seconds
        
        if (refreshTime > 0) {
          console.log(`[useVapiToken] Scheduling token refresh in ${Math.round(refreshTime / 1000)}s`);
          refreshTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              console.log('[useVapiToken] Auto-refreshing token...');
              fetchToken();
            }
          }, refreshTime);
        }
      }
    } catch (err) {
      if (!mountedRef.current) return; // Component unmounted
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch token';
      setError(errorMessage);
      console.error('[useVapiToken] Token fetch error:', err);
      
      // Notify parent component
      if (onError && err instanceof Error) {
        onError(err);
      }
      
      // Implement exponential backoff for rate limit errors
      if (errorMessage.includes('Rate limit')) {
        // Don't retry immediately for rate limit errors
        console.log('[useVapiToken] Rate limited, not retrying automatically');
        return;
      }
      
      // Retry after 5 seconds on other errors
      if (autoRefresh) {
        refreshTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            console.log('[useVapiToken] Retrying after error...');
            fetchToken();
          }
        }, 5000);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        isRefreshingRef.current = false;
      }
    }
  }, [session?.user?.id, status, scope, autoRefresh, onError]);

  const refreshToken = useCallback(async (): Promise<void> => {
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    await fetchToken();
  }, [fetchToken]);

  // Initial token fetch when session is ready
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchToken();
    } else if (status === 'unauthenticated') {
      setError('User not authenticated');
      setTokenData(null);
    }
  }, [status, session?.user?.id, fetchToken]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Check if token is expiring soon (within 5 minutes)
  const isExpiringSoon = tokenData ? 
    (tokenData.expiresAt - Math.floor(Date.now() / 1000)) <= 300 : 
    false;

  return {
    token: tokenData?.token || null,
    isLoading,
    error,
    refreshToken,
    isExpiringSoon,
    expiresAt: tokenData?.expiresAt || null,
  };
}