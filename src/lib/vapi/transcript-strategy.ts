/**
 * Transcript Strategy Manager
 * Defines when to use real-time vs webhook transcripts to avoid duplicates
 * and ensure a single source of truth for session transcripts
 */

export interface TranscriptStrategyConfig {
  // Feature flags
  useWebhookAsSource: boolean // If true, webhook transcripts are the source of truth
  enableRealtimeBuffering: boolean // If true, buffer real-time transcripts for UI display
  enableRealtimeSaving: boolean // If true, save real-time transcripts to database
  enableMetricsCalculation: boolean // If true, calculate metrics from real-time transcripts
  
  // Reconciliation settings
  reconciliationEnabled: boolean // If true, run reconciliation process
  reconciliationDelayMs: number // Delay before running reconciliation after session end
  deduplicationWindowMs: number // Time window to consider transcripts as duplicates
  
  // Debug settings
  debugLogging: boolean // Enable detailed logging
}

// Default configuration - prioritize webhook transcripts
export const DEFAULT_TRANSCRIPT_STRATEGY: TranscriptStrategyConfig = {
  // In production, use webhook as source of truth
  useWebhookAsSource: process.env.NEXT_PUBLIC_USE_WEBHOOK_TRANSCRIPTS === 'true' || process.env.NODE_ENV === 'production',
  enableRealtimeBuffering: true, // Always buffer for UI display
  enableRealtimeSaving: process.env.NEXT_PUBLIC_ENABLE_REALTIME_SAVING !== 'false', // Default true for now
  enableMetricsCalculation: true, // Always calculate metrics for real-time feedback
  
  // Reconciliation settings
  reconciliationEnabled: true,
  reconciliationDelayMs: 5000, // 5 seconds after session end
  deduplicationWindowMs: 2000, // 2 second window for duplicates
  
  // Debug
  debugLogging: process.env.NODE_ENV === 'development'
}

/**
 * Get transcript strategy configuration
 * Can be overridden with environment variables
 */
export function getTranscriptStrategy(): TranscriptStrategyConfig {
  const config = { ...DEFAULT_TRANSCRIPT_STRATEGY }
  
  // Override with environment variables if set
  if (process.env.NEXT_PUBLIC_USE_WEBHOOK_TRANSCRIPTS !== undefined) {
    config.useWebhookAsSource = process.env.NEXT_PUBLIC_USE_WEBHOOK_TRANSCRIPTS === 'true'
  }
  
  if (process.env.NEXT_PUBLIC_ENABLE_REALTIME_SAVING !== undefined) {
    config.enableRealtimeSaving = process.env.NEXT_PUBLIC_ENABLE_REALTIME_SAVING === 'true'
  }
  
  if (process.env.NEXT_PUBLIC_ENABLE_TRANSCRIPT_RECONCILIATION !== undefined) {
    config.reconciliationEnabled = process.env.NEXT_PUBLIC_ENABLE_TRANSCRIPT_RECONCILIATION === 'true'
  }
  
  // In webhook mode, disable real-time saving to prevent duplicates
  if (config.useWebhookAsSource) {
    config.enableRealtimeSaving = false
  }
  
  return config
}

/**
 * Log transcript strategy configuration
 */
export function logTranscriptStrategy(sessionId: string): void {
  const strategy = getTranscriptStrategy()
  
  console.log(`📋 TRANSCRIPT STRATEGY for session ${sessionId}:`, {
    mode: strategy.useWebhookAsSource ? 'WEBHOOK' : 'REALTIME',
    realtimeSaving: strategy.enableRealtimeSaving ? 'ENABLED' : 'DISABLED',
    realtimeBuffering: strategy.enableRealtimeBuffering ? 'ENABLED' : 'DISABLED',
    metricsCalculation: strategy.enableMetricsCalculation ? 'ENABLED' : 'DISABLED',
    reconciliation: strategy.reconciliationEnabled ? 'ENABLED' : 'DISABLED',
    environment: process.env.NODE_ENV
  })
}

/**
 * Determine if a transcript should be saved based on strategy
 */
export function shouldSaveTranscript(source: 'realtime' | 'webhook'): boolean {
  const strategy = getTranscriptStrategy()
  
  if (source === 'webhook') {
    // Always save webhook transcripts if webhook mode is enabled
    return strategy.useWebhookAsSource
  }
  
  // For real-time transcripts, check if real-time saving is enabled
  return strategy.enableRealtimeSaving
}

/**
 * Determine if metrics should be calculated
 */
export function shouldCalculateMetrics(source: 'realtime' | 'webhook'): boolean {
  const strategy = getTranscriptStrategy()
  
  // Always calculate metrics from real-time for immediate feedback
  if (source === 'realtime') {
    return strategy.enableMetricsCalculation
  }
  
  // Don't calculate metrics from webhook (already done in real-time)
  return false
}

/**
 * Mark transcript entries with source metadata
 */
export function markTranscriptSource(
  transcript: any,
  source: 'realtime' | 'webhook'
): any {
  return {
    ...transcript,
    metadata: {
      ...transcript.metadata,
      source,
      strategy: getTranscriptStrategy().useWebhookAsSource ? 'webhook-primary' : 'realtime-primary',
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Check if reconciliation should run for a session
 */
export function shouldRunReconciliation(sessionId: string): boolean {
  const strategy = getTranscriptStrategy()
  
  if (!strategy.reconciliationEnabled) {
    return false
  }
  
  // Only run reconciliation if we're in a mixed mode
  // (both real-time and webhook transcripts might exist)
  const hasRealtimeSaving = strategy.enableRealtimeSaving
  const hasWebhookSaving = strategy.useWebhookAsSource
  
  return hasRealtimeSaving || hasWebhookSaving
}

/**
 * Get reconciliation delay for a session
 */
export function getReconciliationDelay(): number {
  return getTranscriptStrategy().reconciliationDelayMs
}

/**
 * Strategy recommendations based on deployment environment
 */
export function getStrategyRecommendation(): string {
  const env = process.env.NODE_ENV
  const isProduction = env === 'production'
  
  if (isProduction) {
    return 'WEBHOOK mode recommended for production to ensure transcript integrity'
  }
  
  return 'REALTIME mode acceptable for development with faster UI updates'
}

/**
 * Validate strategy configuration
 */
export function validateStrategyConfig(config: Partial<TranscriptStrategyConfig>): string[] {
  const errors: string[] = []
  
  // Check for conflicting settings
  if (config.useWebhookAsSource && config.enableRealtimeSaving) {
    errors.push('Warning: Both webhook and realtime saving enabled may cause duplicates')
  }
  
  if (!config.enableRealtimeBuffering && !config.useWebhookAsSource) {
    errors.push('Error: Must have at least one transcript source enabled')
  }
  
  if (config.reconciliationDelayMs && config.reconciliationDelayMs < 1000) {
    errors.push('Warning: Reconciliation delay less than 1 second may be too aggressive')
  }
  
  return errors
}

// Export types
export type TranscriptSource = 'realtime' | 'webhook'
export type TranscriptMode = 'webhook-primary' | 'realtime-primary' | 'hybrid'

/**
 * Get current transcript mode
 */
export function getTranscriptMode(): TranscriptMode {
  const strategy = getTranscriptStrategy()
  
  if (strategy.useWebhookAsSource && !strategy.enableRealtimeSaving) {
    return 'webhook-primary'
  }
  
  if (!strategy.useWebhookAsSource && strategy.enableRealtimeSaving) {
    return 'realtime-primary'
  }
  
  return 'hybrid'
}