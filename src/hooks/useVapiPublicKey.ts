import { useState, useEffect } from 'react';

interface UseVapiPublicKeyReturn {
  publicKey: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to get the VAPI public key for client-side usage
 * This is a simpler approach than JWT when you have a public API key
 */
export function useVapiPublicKey(): UseVapiPublicKeyReturn {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In production, you might want to fetch this from an endpoint
    // For now, we'll use the environment variable directly
    const key = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    
    if (key && key.startsWith('pk_')) {
      setPublicKey(key);
      setError(null);
    } else {
      setError('VAPI public key not configured or invalid format');
    }
    
    setIsLoading(false);
  }, []);

  return {
    publicKey,
    isLoading,
    error,
  };
}