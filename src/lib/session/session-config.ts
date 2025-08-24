/**
 * Session Configuration
 * Centralized configuration for session-related timings and intervals
 */

export const SESSION_CONFIG = {
  // Timer update intervals
  TIMER_UPDATE_INTERVAL_MS: 30000, // 30 seconds (was 5 seconds)
  
  // API rate limiting
  API_RATE_LIMIT_MS: 30000, // 30 seconds minimum between updates
  
  // Debounce timings
  CONVERSATION_UPDATE_DEBOUNCE_MS: 5000, // 5 seconds (was 1 second)
  SESSION_FETCH_DEBOUNCE_MS: 500, // 500ms for initial fetch
  
  // Session backup intervals
  SESSION_BACKUP_INTERVAL_MS: 60000, // 1 minute
  
  // Development overrides (faster updates for testing)
  ...(process.env.NODE_ENV === 'development' && {
    TIMER_UPDATE_INTERVAL_MS: 10000, // 10 seconds in dev
    API_RATE_LIMIT_MS: 10000, // 10 seconds in dev
  })
} as const

/**
 * Session Update Coordinator
 * Prevents multiple components from updating the same session simultaneously
 */
class SessionUpdateCoordinator {
  private static instance: SessionUpdateCoordinator
  private lastUpdates: Map<string, number> = new Map()
  private pendingUpdates: Map<string, NodeJS.Timeout> = new Map()
  
  static getInstance(): SessionUpdateCoordinator {
    if (!this.instance) {
      this.instance = new SessionUpdateCoordinator()
    }
    return this.instance
  }
  
  /**
   * Check if enough time has passed since the last update
   */
  canUpdate(sessionId: string, minIntervalMs: number = SESSION_CONFIG.API_RATE_LIMIT_MS): boolean {
    const lastUpdate = this.lastUpdates.get(sessionId) || 0
    const timeSinceLastUpdate = Date.now() - lastUpdate
    return timeSinceLastUpdate >= minIntervalMs
  }
  
  /**
   * Record that an update was made
   */
  recordUpdate(sessionId: string): void {
    this.lastUpdates.set(sessionId, Date.now())
    console.log(`[SessionUpdateCoordinator] Recorded update for session ${sessionId}`)
  }
  
  /**
   * Schedule a debounced update
   */
  scheduleUpdate(
    sessionId: string, 
    updateFn: () => Promise<void>, 
    delayMs: number = SESSION_CONFIG.CONVERSATION_UPDATE_DEBOUNCE_MS
  ): void {
    // Clear any pending update
    const existingTimeout = this.pendingUpdates.get(sessionId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }
    
    // Schedule new update
    const timeout = setTimeout(async () => {
      if (this.canUpdate(sessionId)) {
        try {
          await updateFn()
          this.recordUpdate(sessionId)
        } catch (error) {
          console.error(`[SessionUpdateCoordinator] Update failed for session ${sessionId}:`, error)
        }
      } else {
        console.log(`[SessionUpdateCoordinator] Skipping update for session ${sessionId} - too soon`)
      }
      this.pendingUpdates.delete(sessionId)
    }, delayMs)
    
    this.pendingUpdates.set(sessionId, timeout)
  }
  
  /**
   * Clean up resources for a session
   */
  cleanup(sessionId: string): void {
    const timeout = this.pendingUpdates.get(sessionId)
    if (timeout) {
      clearTimeout(timeout)
      this.pendingUpdates.delete(sessionId)
    }
    this.lastUpdates.delete(sessionId)
    console.log(`[SessionUpdateCoordinator] Cleaned up session ${sessionId}`)
  }
  
  /**
   * Get time until next allowed update
   */
  getTimeUntilNextUpdate(sessionId: string, minIntervalMs: number = SESSION_CONFIG.API_RATE_LIMIT_MS): number {
    const lastUpdate = this.lastUpdates.get(sessionId) || 0
    const timeSinceLastUpdate = Date.now() - lastUpdate
    return Math.max(0, minIntervalMs - timeSinceLastUpdate)
  }
}

export const sessionUpdateCoordinator = SessionUpdateCoordinator.getInstance()