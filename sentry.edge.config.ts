// sentry.edge.config.ts
import * as Sentry from '@sentry/nextjs';

// Initialize Sentry for Edge runtime (middleware, edge routes)
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
  
  // Edge-specific options
  transportOptions: {
    // Reduce request size for edge runtime
    maxValueLength: 250,
  },
  
  // Filtering
  beforeSend(event) {
    // Add edge context
    event.contexts = {
      ...event.contexts,
      runtime: {
        name: 'edge',
      },
      app: {
        app_name: 'couple-therapy-edge',
        app_version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      },
    };
    
    return event;
  },
});