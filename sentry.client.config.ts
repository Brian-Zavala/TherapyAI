// sentry.client.config.ts
import { initSentry } from '@/lib/monitoring/sentry';

// Initialize Sentry for client-side
initSentry({
  // Client-specific configuration
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0,
  
  // Enable debug in development
  debug: process.env.NODE_ENV === 'development',
  
  // Only enable in production or if explicitly enabled
  enabled: process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true',
});