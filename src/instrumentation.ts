/**
 * Next.js instrumentation file - runs once when the server starts
 * Used for application initialization tasks
 */

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Starting application initialization...')
    
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
  }
}