/**
 * Next.js client-side instrumentation file
 * Runs once when the client application starts
 * This replaces the deprecated sentry.client.config.ts for Turbopack compatibility
 */

import * as Sentry from '@sentry/nextjs';
import { initSentry } from '@/lib/monitoring/sentry';

// Initialize Sentry for client-side with production-ready configuration
initSentry({
  // Client-specific configuration for session replay
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0,
  
  // Enable debug logging in development for easier troubleshooting
  debug: process.env.NODE_ENV === 'development',
  
  // Control when Sentry is enabled
  // - Always enabled in production
  // - Can be explicitly enabled in development with NEXT_PUBLIC_SENTRY_ENABLED=true
  enabled: process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true',
});

// Export required hook for navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// Log initialization status for debugging
if (process.env.NODE_ENV === 'development') {
  console.log('[instrumentation-client] Client-side Sentry initialization completed');
}