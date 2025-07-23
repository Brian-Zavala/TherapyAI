/**
 * Next.js instrumentation file - runs once when the server starts
 * Used for application initialization tasks
 */

import * as Sentry from '@sentry/nextjs'

export async function register() {
  // Initialize Sentry based on runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Starting Node.js application initialization...')
    
    // Initialize Sentry for Node.js runtime
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
          return null
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
        }
        
        return event
      },
    })
    
    try {
      // Warm up database connection to prevent cold start delays
      const { warmupDatabase } = await import('./lib/db-warmup')
      await warmupDatabase()
      
      // Initialize other services that might have cold start issues
      // For example, you could pre-initialize VAPI client, Redis, etc.
      
      console.log('[Instrumentation] Application initialization completed')
    } catch (error) {
      console.error('[Instrumentation] Error during initialization:', error)
      // Don't throw - let the application continue
    }
  } else if (process.env.NEXT_RUNTIME === 'edge') {
    console.log('[Instrumentation] Starting Edge runtime initialization...')
    
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
      // Note: maxValueLength has been removed in Sentry v8
      // Performance monitoring is now automatic
      
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
        }
        
        return event
      },
    })
  }
}

export async function onRequestError(
  error: Error,
  request: {
    path: string
    method: string
    headers: { [key: string]: string }
  },
  context: {
    routerKind: 'App Router' | 'Pages Router'
    routePath: string
    routeType: 'render' | 'route' | 'action' | 'middleware'
  }
): Promise<void> {
  // Capture request errors with Sentry
  await Sentry.captureRequestError(error, request, context)
}