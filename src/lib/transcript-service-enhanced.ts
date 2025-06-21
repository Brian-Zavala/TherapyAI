/**
 * Enhanced transcript service with new schema integration
 * Optimized for performance with batching, deduplication, and real-time updates
 */

import { prisma, withTransaction, withRetry } from './prisma-enhanced'
import { createSupabaseServerClient } from './supabase-server'
import { RealTimeMetricsCalculator } from './real-time-metrics-optimized'
import { validateTranscriptEntry, extractConversationMetrics } from './vapi-message-validator'
import { z } from 'zod'

// Enhanced transcript entry with metadata
export interface EnhancedTranscriptEntry {
  id?: string
  sessionId: string
  speaker: string
  text: string
  timestamp: Date
  isFinal: boolean
  sequence: number
  metadata?: {
    confidence?: number
    emotion?: string
    familyMemberId?: string
    languageCode?: string
    [key: string]: unknown
  }
}

// Batch configuration
interface BatchConfig {
  batchSize: number
  maxBatchSize: number
  flushIntervalMs: number
  retryAttempts: number
  retryDelayMs: number
}

const DEFAULT_BATCH_CONFIG: BatchConfig = {
  batchSize: 50,
  maxBatchSize: 100,
  flushIntervalMs: 3000, // 3 seconds
  retryAttempts: 3,
  retryDelayMs: 1000
}

/**
 * Enhanced transcript manager with advanced features
 */
export class EnhancedTranscriptManager {
  private queues: Map<string, EnhancedTranscriptEntry[]> = new Map()
  private flushTimers: Map<string, NodeJS.Timeout> = new Map()
  private processingSet: Set<string> = new Set()
  private sequenceCounters: Map<string, number> = new Map()
  private metricsCalculators: Map<string, RealTimeMetricsCalculator> = new Map()
  private config: BatchConfig
  private deduplicationCache: Map<string, Set<string>> = new Map()
  private sessionMetadata: Map<string, { userId: string; sessionType: string }> = new Map()

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = { ...DEFAULT_BATCH_CONFIG, ...config }
  }

  /**
   * Initialize session with metadata for enhanced processing
   */
  async initializeSession(
    sessionId: string,
    userId: string,
    sessionType: 'individual' | 'couple' | 'family' = 'couple',
    sessionDurationMinutes: number = 60
  ): Promise<void> {
    // Store session metadata
    this.sessionMetadata.set(sessionId, { userId, sessionType })

    // Initialize metrics calculator
    if (!this.metricsCalculators.has(sessionId)) {
      const calculator = new RealTimeMetricsCalculator({
        sessionId,
        therapyType: sessionType === 'individual' ? 'solo' : sessionType,
        sessionDurationMinutes,
        userId
      })
      this.metricsCalculators.set(sessionId, calculator)
    }

    // Initialize deduplication cache
    if (!this.deduplicationCache.has(sessionId)) {
      this.deduplicationCache.set(sessionId, new Set())
    }

    // Initialize sequence counter
    if (!this.sequenceCounters.has(sessionId)) {
      // Get the latest sequence number from the database
      const latestEntry = await prisma.transcriptEntry.findFirst({
        where: { sessionId },
        orderBy: { sequence: 'desc' },
        select: { sequence: true }
      })
      this.sequenceCounters.set(sessionId, (latestEntry?.sequence || 0) + 1)
    }

    console.log(`✅ Initialized enhanced transcript manager for session ${sessionId}`)
  }

  /**
   * Add transcript entry with validation and deduplication
   */
  async addEntry(entry: Omit<EnhancedTranscriptEntry, 'sequence'>): Promise<EnhancedTranscriptEntry | null> {
    const { sessionId } = entry

    // Validate entry
    const validation = validateTranscriptEntry(entry)
    if (!validation.valid) {
      console.error(`Invalid transcript entry: ${validation.error}`)
      return null
    }

    const sanitized = validation.sanitized!

    // Create deduplication key
    const dedupKey = `${sanitized.speaker}:${sanitized.text}:${sanitized.timestamp.getTime()}`
    const dedupCache = this.deduplicationCache.get(sessionId)
    
    if (dedupCache?.has(dedupKey)) {
      console.log(`Duplicate entry detected for session ${sessionId}, skipping`)
      return null
    }

    dedupCache?.add(dedupKey)

    // Assign sequence number
    const sequence = this.sequenceCounters.get(sessionId) || 0
    this.sequenceCounters.set(sessionId, sequence + 1)

    // Create enhanced entry
    const enhancedEntry: EnhancedTranscriptEntry = {
      ...entry,
      text: sanitized.text,
      speaker: sanitized.speaker,
      timestamp: sanitized.timestamp,
      isFinal: sanitized.isFinal,
      sequence,
      metadata: {
        ...entry.metadata,
        ...sanitized.metadata
      }
    }

    // Process metrics in real-time
    await this.processMetrics(enhancedEntry)

    // Add to queue
    if (!this.queues.has(sessionId)) {
      this.queues.set(sessionId, [])
    }
    
    this.queues.get(sessionId)!.push(enhancedEntry)

    // Check if we should flush
    const queue = this.queues.get(sessionId)!
    if (queue.length >= this.config.batchSize) {
      await this.flushSession(sessionId)
    } else {
      this.scheduleFlush(sessionId)
    }

    return enhancedEntry
  }

  /**
   * Process real-time metrics for transcript entry
   */
  private async processMetrics(entry: EnhancedTranscriptEntry): Promise<void> {
    const calculator = this.metricsCalculators.get(entry.sessionId)
    if (!calculator) return

    try {
      const metrics = await calculator.addTranscriptEntry({
        speaker: entry.speaker as 'user' | 'assistant',
        text: entry.text,
        timestamp: entry.timestamp.toISOString()
      })

      // Broadcast metrics update via Supabase
      const metadata = this.sessionMetadata.get(entry.sessionId)
      if (metadata) {
        const supabase = createSupabaseServerClient()
        await supabase
          .channel(`session:${entry.sessionId}:metrics`)
          .send({
            type: 'broadcast',
            event: 'metrics-update',
            payload: {
              sessionId: entry.sessionId,
              userId: metadata.userId,
              metrics,
              timestamp: new Date().toISOString()
            }
          })
      }
    } catch (error) {
      console.error(`Error processing metrics for session ${entry.sessionId}:`, error)
    }
  }

  /**
   * Schedule flush with debouncing
   */
  private scheduleFlush(sessionId: string): void {
    // Clear existing timer
    const existingTimer = this.flushTimers.get(sessionId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.flushSession(sessionId)
    }, this.config.flushIntervalMs)

    this.flushTimers.set(sessionId, timer)
  }

  /**
   * Flush transcript entries for a session
   */
  async flushSession(sessionId: string): Promise<void> {
    if (this.processingSet.has(sessionId)) {
      console.log(`Already processing session ${sessionId}, skipping flush`)
      return
    }

    const queue = this.queues.get(sessionId)
    if (!queue || queue.length === 0) return

    // Clear timer
    const timer = this.flushTimers.get(sessionId)
    if (timer) {
      clearTimeout(timer)
      this.flushTimers.delete(sessionId)
    }

    // Mark as processing
    this.processingSet.add(sessionId)
    
    // Move queue to processing
    const entriesToProcess = [...queue]
    this.queues.set(sessionId, [])

    console.log(`💾 Flushing ${entriesToProcess.length} entries for session ${sessionId}`)

    try {
      await this.saveEntriesWithRetry(sessionId, entriesToProcess)
    } finally {
      this.processingSet.delete(sessionId)
    }
  }

  /**
   * Save entries with retry logic and chunking
   */
  private async saveEntriesWithRetry(
    sessionId: string,
    entries: EnhancedTranscriptEntry[]
  ): Promise<void> {
    // Split into chunks
    const chunks: EnhancedTranscriptEntry[][] = []
    for (let i = 0; i < entries.length; i += this.config.maxBatchSize) {
      chunks.push(entries.slice(i, i + this.config.maxBatchSize))
    }

    const failedEntries: EnhancedTranscriptEntry[] = []

    for (const [index, chunk] of chunks.entries()) {
      let success = false
      let attempts = 0

      while (!success && attempts < this.config.retryAttempts) {
        try {
          await withTransaction(async (tx) => {
            // Create transcript entries
            const created = await tx.transcriptEntry.createMany({
              data: chunk.map(entry => ({
                sessionId: entry.sessionId,
                speaker: entry.speaker,
                text: entry.text,
                timestamp: entry.timestamp,
                isFinal: entry.isFinal,
                sequence: entry.sequence,
                metadata: entry.metadata || {}
              }))
            })

            // Update session metrics if this is the last chunk
            if (index === chunks.length - 1) {
              const conversationMetrics = extractConversationMetrics(
                entries.map(e => ({
                  role: e.speaker === 'assistant' ? 'assistant' : 'user',
                  content: e.text,
                  timestamp: e.timestamp.getTime(),
                  metadata: e.metadata
                }))
              )

              await tx.session.update({
                where: { id: sessionId },
                data: {
                  transcriptCount: { increment: entries.length },
                  conversationTimeSeconds: { increment: Math.floor(entries.length * 2) }, // Rough estimate
                  lastActivity: new Date()
                }
              })

              // Store aggregated metrics
              const metadata = this.sessionMetadata.get(sessionId)
              if (metadata) {
                const calculator = this.metricsCalculators.get(sessionId)
                const currentMetrics = calculator?.getCurrentMetrics()

                if (currentMetrics) {
                  await tx.communicationMetric.create({
                    data: {
                      sessionId,
                      userId: metadata.userId,
                      clarity: currentMetrics.clarity,
                      empathy: currentMetrics.empathy,
                      respect: currentMetrics.respect,
                      overall: currentMetrics.overall,
                      listening: currentMetrics.listening || 50,
                      expression: currentMetrics.expression || 50,
                      metricType: 'real-time',
                      calculatedAt: new Date(),
                      metadata: {
                        turnCount: conversationMetrics.turnCount,
                        topics: conversationMetrics.topics,
                        emotionalTone: conversationMetrics.emotionalTone
                      }
                    }
                  })
                }
              }
            }
          })

          success = true
          console.log(`✅ Saved chunk ${index + 1}/${chunks.length} (${chunk.length} entries)`)
        } catch (error) {
          attempts++
          console.error(`❌ Failed to save chunk ${index + 1}, attempt ${attempts}:`, error)
          
          if (attempts < this.config.retryAttempts) {
            await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs * attempts))
          } else {
            failedEntries.push(...chunk)
          }
        }
      }
    }

    // Re-queue failed entries
    if (failedEntries.length > 0) {
      console.warn(`⚠️ Re-queuing ${failedEntries.length} failed entries`)
      const currentQueue = this.queues.get(sessionId) || []
      this.queues.set(sessionId, [...failedEntries, ...currentQueue])
      this.scheduleFlush(sessionId)
    }
  }

  /**
   * Flush all pending sessions
   */
  async flushAll(): Promise<void> {
    const sessionIds = Array.from(this.queues.keys())
    console.log(`🔄 Flushing ${sessionIds.length} sessions`)

    await Promise.all(sessionIds.map(sessionId => this.flushSession(sessionId)))
  }

  /**
   * Get metrics for a session
   */
  getSessionMetrics(sessionId: string) {
    const calculator = this.metricsCalculators.get(sessionId)
    return calculator?.getCurrentMetrics() || null
  }

  /**
   * Clean up resources for a session
   */
  async cleanup(sessionId: string): Promise<void> {
    // Flush any pending entries
    await this.flushSession(sessionId)

    // Clear all session data
    this.queues.delete(sessionId)
    this.sequenceCounters.delete(sessionId)
    this.metricsCalculators.delete(sessionId)
    this.deduplicationCache.delete(sessionId)
    this.sessionMetadata.delete(sessionId)
    
    const timer = this.flushTimers.get(sessionId)
    if (timer) {
      clearTimeout(timer)
      this.flushTimers.delete(sessionId)
    }

    console.log(`🧹 Cleaned up resources for session ${sessionId}`)
  }

  /**
   * Get session statistics
   */
  getStats() {
    return {
      activeSessions: this.queues.size,
      pendingEntries: Array.from(this.queues.values()).reduce((sum, queue) => sum + queue.length, 0),
      processingSessions: this.processingSet.size,
      metricsCalculators: this.metricsCalculators.size
    }
  }
}

// Export singleton instance
export const transcriptManager = new EnhancedTranscriptManager()