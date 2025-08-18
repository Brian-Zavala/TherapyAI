'use client'

import { useState, useEffect } from 'react';

interface UseVapiPublicKeyReturn {
  publicKey: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch VAPI public key at runtime
 * This ensures the key is available even when environment variables aren't accessible client-side
 */
export function useVapiPublicKey(): UseVapiPublicKeyReturn {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchPublicKey() {
      try {
        // First check if it's available in the environment (for build-time injection)
        const envKey = process.env.NEXT_PUBLIC_VAPI_API_KEY;
        if (envKey) {
          console.log('[useVapiPublicKey] Using environment variable');
          if (mounted) {
            setPublicKey(envKey);
            setIsLoading(false);
          }
          return;
        }

        // Fallback to fetching from API
        console.log('[useVapiPublicKey] Fetching from API endpoint');
        const response = await fetch('/api/vapi/public-key');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch public key');
        }

        const data = await response.json();
        
        if (!data.publicKey) {
          throw new Error('No public key in response');
        }

        console.log('[useVapiPublicKey] Successfully fetched public key');
        
        if (mounted) {
          setPublicKey(data.publicKey);
          setError(null);
        }
      } catch (err) {
        console.error('[useVapiPublicKey] Error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load VAPI key');
          setPublicKey(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchPublicKey();

    return () => {
      mounted = false;
    };
  }, []);

  return { publicKey, isLoading, error };
}