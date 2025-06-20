// Example of how to update your useVapiSession hook for demo mode
import { useEffect, useState } from 'react';
import { createVapiInstance, VapiInterface } from '@/lib/vapi/vapi-factory';
import { isDemoMode } from '@/config/demo.config';

export function useVapiDemo() {
  const [vapi, setVapi] = useState<VapiInterface | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initializeVapi() {
      try {
        let token: string | undefined;
        
        // Only fetch token in production mode
        if (!isDemoMode()) {
          const response = await fetch('/api/vapi/token');
          const data = await response.json();
          token = data.token;
        }

        // Factory will return appropriate instance
        const vapiInstance = await createVapiInstance(token);
        setVapi(vapiInstance);
      } catch (error) {
        console.error('Failed to initialize VAPI:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initializeVapi();
  }, []);

  return { vapi, isLoading, isDemoMode: isDemoMode() };
}