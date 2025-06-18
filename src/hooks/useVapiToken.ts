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
  const isRateLimitedRef = useRef(false);
  const rateLimitResetTimeRef = useRef<number>(0);
  const onErrorRef = useRef(onError);
  
  // Update ref when onError prop changes
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const fetchToken = useCallback(async (): Promise<void> => {
    // Prevent concurrent refresh requests
    if (isRefreshingRef.current || !mountedRef.current) return;
    
    // Check if we're rate limited and should wait (with 100ms buffer for timing precision)
    if (isRateLimitedRef.current && Date.now() < rateLimitResetTimeRef.current - 100) {
      const remainingTime = Math.ceil((rateLimitResetTimeRef.current - Date.now()) / 1000);
      console.log(`[useVapiToken] Still rate limited for ${remainingTime}s, skipping fetch`);
      return;
    }
    
    // Don't fetch if no session
    if (status !== 'authenticated' || !session?.user?.id) {
      const errorMsg = status === 'loading' 
        ? 'Authentication in progress, please wait...' 
        : 'No authenticated session - please log in';
      setError(errorMsg);
      console.log(`[useVapiToken] Auth status: ${status}, session: ${session ? 'exists' : 'null'}`);
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
          
          // Set rate limit state
          isRateLimitedRef.current = true;
          rateLimitResetTimeRef.current = Date.now() + (retrySeconds * 1000);
          
          throw new Error(
            `Rate limit exceeded. Please try again in ${Math.ceil(retrySeconds / 60)} minutes.`
          );
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const newTokenData: VapiTokenResponse = await response.json();
      
      if (!mountedRef.current) return; // Component unmounted
      
      // Validate token response
      if (!newTokenData.token || !newTokenData.expiresAt || typeof newTokenData.expiresAt !== 'number') {
        throw new Error('Invalid token response format');
      }
      
      // Check if token is already expired
      const currentTime = Math.floor(Date.now() / 1000);
      if (newTokenData.expiresAt <= currentTime) {
        throw new Error('Received token is already expired');
      }
      
      // Clear rate limit state on successful fetch
      isRateLimitedRef.current = false;
      rateLimitResetTimeRef.current = 0;
      
      setTokenData(newTokenData);
      setError(null);

      // Set up auto-refresh if enabled
      if (autoRefresh && newTokenData.expiresAt) {
        // Calculate time until refresh (5 minutes before expiry)
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = newTokenData.expiresAt - now;
        const refreshTime = Math.max((timeUntilExpiry - 300) * 1000, 10000); // At least 10 seconds
        
        // Only schedule refresh if token won't expire too soon (10 second buffer)
        if (refreshTime > 0 && timeUntilExpiry > 310) {
          console.log(`[useVapiToken] Scheduling token refresh in ${Math.round(refreshTime / 1000)}s`);
          refreshTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              console.log('[useVapiToken] Auto-refreshing token...');
              fetchToken();
            }
          }, refreshTime);
        } else if (timeUntilExpiry > 0) {
          // Token expiring too soon, refresh immediately
          console.log('[useVapiToken] Token expiring soon, refreshing immediately');
          setTimeout(() => {
            if (mountedRef.current) {
              fetchToken();
            }
          }, 100); // Small delay to avoid tight loop
        }
      }
    } catch (err) {
      if (!mountedRef.current) return; // Component unmounted
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch token';
      setError(errorMessage);
      console.error('[useVapiToken] Token fetch error:', err);
      
      // Notify parent component
      if (onErrorRef.current && err instanceof Error) {
        onErrorRef.current(err);
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
  }, [session?.user?.id, status, scope, autoRefresh]); // Removed onError to prevent re-creation

  const refreshToken = useCallback(async (): Promise<void> => {
    // Check if we're rate limited before attempting refresh
    if (isRateLimitedRef.current && Date.now() < rateLimitResetTimeRef.current - 100) {
      const remainingTime = Math.ceil((rateLimitResetTimeRef.current - Date.now()) / 1000);
      console.log(`[useVapiToken] Manual refresh blocked - rate limited for ${remainingTime}s`);
      return;
    }
    
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = undefined;
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
  
  // Clear rate limit state when user changes
  useEffect(() => {
    // Clear rate limit state to prevent cross-user rate limit contamination
    isRateLimitedRef.current = false;
    rateLimitResetTimeRef.current = 0;
    
    // Clear any existing refresh timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = undefined;
    }
  }, [session?.user?.id]);

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
  
  // Periodic token validity check to catch edge cases (e.g., clock drift, missed refresh)
  useEffect(() => {
    if (!autoRefresh || !tokenData || !tokenData.expiresAt) return;
    
    const checkInterval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = tokenData.expiresAt - now;
      
      // If token is expired or about to expire in less than 30 seconds
      if (timeUntilExpiry <= 30 && mountedRef.current && !isRefreshingRef.current) {
        console.log('[useVapiToken] Token validity check: token expired or expiring soon, refreshing...');
        refreshToken();
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(checkInterval);
  }, [autoRefresh, tokenData, refreshToken]);

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