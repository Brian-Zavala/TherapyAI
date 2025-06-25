// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

// Initialize Sentry for server-side
Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Set environment - Railway-compatible
  environment: process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  
  // Set release - Railway provides git commit SHA
  release: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Only enable in production
  enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true',
  
  // Server-specific options
  // Note: autoSessionTracking has been removed in Sentry v8
  // Performance monitoring integrations are now automatic
  
  // Filtering
  beforeSend(event, hint) {
    // Filter out non-error events in development
    if (process.env.NODE_ENV === 'development' && event.level !== 'error') {
      return null;
    }
    
    // Add server context
    event.contexts = {
      ...event.contexts,
      runtime: {
        name: 'node',
        version: process.version,
      },
      app: {
        app_name: 'couple-therapy-api',
        app_version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      },
    };
    
    return event;
  },
});