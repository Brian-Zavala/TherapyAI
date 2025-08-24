/**
 * Ultra-optimized transcript service with adaptive dynamic batching
 * Based on 2025 research: memory-aware and SLA-constrained dynamic batching
 * 
 * Key innovations:
 * - Adaptive batch sizing based on load and latency
 * - Memory-aware queue management
 * - Exponential backoff for timeouts
 * - Ring buffer for efficient memory usage
 * - Metrics-driven batch optimization
 */

import { RealTimeMetricsCalculator, type IncrementalMetrics } from './real-time-metrics-optimized';

export type TranscriptEntry = {
  id?: string
  sessionId: string
  speaker: string
  text: string
  timestamp?: string
  isFinal?: boolean
  assistantId?: string
}

interface BatchMetrics {
  avgLatency: number
  throughput: number
  queueDepth: number
  memoryUsage: number
  lastBatchTime: number
}

interface AdaptiveConfig {
  minBatchSize: number
  maxBatchSize: number
  targetLatencyMs: number
  memoryThreshold: number
  adaptationRate: number
}

/**
 * Ring buffer for efficient memory management
 * Prevents memory leaks and improves cache locality
 */
class RingBuffer<T> {
  private buffer: (T | undefined)[]
  private head = 0
  private tail = 0
  private size = 0
  private capacity: number

  constructor(capacity: number) {
    this.capacity = capacity
    this.buffer = new Array(capacity)
  }

  push(item: T): boolean {
    if (this.size === this.capacity) {
      return false // Buffer full
    }
    this.buffer[this.tail] = item
    this.tail = (this.tail + 1) % this.capacity
    this.size++
    return true
  }

  pop(): T | undefined {
    if (this.size === 0) {
      return undefined
    }
    const item = this.buffer[this.head]
    this.buffer[this.head] = undefined // Help GC
    this.head = (this.head + 1) % this.capacity
    this.size--
    return item
  }

  drain(count: number): T[] {
    const items: T[] = []
    const toDrain = Math.min(count, this.size)
    for (let i = 0; i < toDrain; i++) {
      const item = this.pop()
      if (item) items.push(item)
    }
    return items
  }

  getSize(): number {
    return this.size
  }

  clear(): void {
    this.buffer.fill(undefined)
    this.head = 0
    this.tail = 0
    this.size = 0
  }
}

/**
 * Ultra-optimized batched transcript manager with adaptive batching
 * Implements memory-aware and SLA-constrained dynamic batching
 */
class UltraOptimizedTranscriptManager {
  // Adaptive batching configuration
  private adaptiveConfig: AdaptiveConfig = {
    minBatchSize: 25,      // Minimum batch size (increased from 10)
    maxBatchSize: 90,      // Maximum batch size (API limit)
    targetLatencyMs: 500,  // Target latency for batches
    memoryThreshold: 0.85, // Memory usage threshold
    adaptationRate: 0.2    // How quickly to adapt batch size
  }

  // Dynamic batch size (adapts based on load)
  private currentBatchSize = 50 // Start with optimized default
  
  // Exponential backoff for timeouts
  private baseTimeout = 5000     // 5 seconds base (was 2s)
  private maxTimeout = 30000     // 30 seconds max
  private currentTimeout = this.baseTimeout
  private backoffMultiplier = 1.5
  
  // Efficient queue management with ring buffers
  private queues: Map<string, RingBuffer<TranscriptEntry>> = new Map()
  private queueCapacity = 1000   // Max entries per session queue
  
  // Batch metrics for adaptive optimization
  private metrics: Map<string, BatchMetrics> = new Map()
  
  // Timeout management
  private timeouts: Map<string, NodeJS.Timeout> = new Map()
  
  // Concurrent save tracking
  private saving: Set<string> = new Set()
  private savePromises: Map<string, Promise<void>> = new Map()
  
  // Real-time metrics calculators
  private metricsCalculators: Map<string, RealTimeMetricsCalculator> = new Map()
  
  // Global metrics for system-wide optimization
  private globalMetrics = {
    totalBatches: 0,
    totalEntries: 0,
    totalLatency: 0,
    lastAdaptation: Date.now()
  }

  /**
   * Initialize metrics calculator for a session
   */
  initializeMetricsCalculator(
    sessionId: string, 
    userId: string, 
    therapyType: 'couple' | 'family' | 'solo', 
    sessionDurationMinutes?: number
  ): void {
    if (!this.metricsCalculators.has(sessionId)) {
      const calculator = new RealTimeMetricsCalculator({
        sessionId,
        therapyType,
        sessionDurationMinutes,
        userId
      });
      this.metricsCalculators.set(sessionId, calculator);
      
      // Initialize session queue with ring buffer
      if (!this.queues.has(sessionId)) {
        this.queues.set(sessionId, new RingBuffer(this.queueCapacity))
      }
      
      // Initialize metrics tracking
      this.metrics.set(sessionId, {
        avgLatency: 0,
        throughput: 0,
        queueDepth: 0,
        memoryUsage: 0,
        lastBatchTime: Date.now()
      })
    }
  }

  /**
   * Adaptive batch size calculation based on system metrics
   * Implements Algorithm 1 from memory-aware dynamic batching paper
   */
  private calculateOptimalBatchSize(sessionId: string): number {
    const metrics = this.metrics.get(sessionId)
    if (!metrics) return this.currentBatchSize

    const now = Date.now()
    
    // Only adapt every 10 seconds to avoid thrashing
    if (now - this.globalMetrics.lastAdaptation < 10000) {
      return this.currentBatchSize
    }

    // Calculate memory pressure (simplified version)
    const memoryPressure = metrics.memoryUsage / this.adaptiveConfig.memoryThreshold
    
    // Calculate latency pressure
    const latencyRatio = metrics.avgLatency / this.adaptiveConfig.targetLatencyMs
    
    // Adaptive formula based on research
    let newBatchSize = this.currentBatchSize

    if (latencyRatio > 1.2 && this.currentBatchSize > this.adaptiveConfig.minBatchSize) {
      // Reduce batch size if latency is too high
      newBatchSize = Math.max(
        this.adaptiveConfig.minBatchSize,
        Math.floor(this.currentBatchSize * (1 - this.adaptiveConfig.adaptationRate))
      )
    } else if (latencyRatio < 0.8 && memoryPressure < 0.8) {
      // Increase batch size if we have headroom
      newBatchSize = Math.min(
        this.adaptiveConfig.maxBatchSize,
        Math.ceil(this.currentBatchSize * (1 + this.adaptiveConfig.adaptationRate))
      )
    }

    // Apply memory constraint
    if (memoryPressure > 1) {
      newBatchSize = Math.min(
        newBatchSize,
        Math.floor(this.currentBatchSize * 0.8)
      )
    }

    // Update if changed
    if (newBatchSize !== this.currentBatchSize) {
      console.log(`📊 ADAPTIVE BATCHING: Adjusting batch size ${this.currentBatchSize} → ${newBatchSize}`)
      this.currentBatchSize = newBatchSize
      this.globalMetrics.lastAdaptation = now
    }

    return newBatchSize
  }

  /**
   * Calculate adaptive timeout with exponential backoff
   */
  private calculateAdaptiveTimeout(sessionId: string): number {
    const metrics = this.metrics.get(sessionId)
    if (!metrics) return this.currentTimeout

    // If throughput is high, use shorter timeouts
    if (metrics.throughput > 10) {
      this.currentTimeout = Math.max(
        this.baseTimeout,
        this.currentTimeout / this.backoffMultiplier
      )
    } else if (metrics.throughput < 2) {
      // Low throughput, increase timeout
      this.currentTimeout = Math.min(
        this.maxTimeout,
        this.currentTimeout * this.backoffMultiplier
      )
    }

    return this.currentTimeout
  }

  /**
   * Add entry to optimized queue with adaptive batching
   */
  async addEntry(entry: TranscriptEntry): Promise<TranscriptEntry> {
    const { sessionId } = entry
    
    // Validate entry
    if (!sessionId || !entry.text?.trim() || !entry.speaker) {
      throw new Error('Invalid transcript entry')
    }

    // Complete the entry
    const completedEntry: TranscriptEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
      isFinal: entry.isFinal !== undefined ? entry.isFinal : true
    }

    // Save to session storage immediately as backup
    this.saveToSessionStorage(completedEntry)

    // Calculate real-time metrics if available
    await this.calculateAndBroadcastMetrics(completedEntry)

    // Get or create queue
    let queue = this.queues.get(sessionId)
    if (!queue) {
      queue = new RingBuffer(this.queueCapacity)
      this.queues.set(sessionId, queue)
    }
    
    // Add to ring buffer
    if (!queue.push(completedEntry)) {
      // Buffer full - force immediate save
      console.warn(`⚠️ TRANSCRIPT: Queue full for session ${sessionId}, forcing save`)
      await this.saveBatch(sessionId, true)
      queue.push(completedEntry) // Retry after save
    }

    // Update metrics
    const metrics = this.metrics.get(sessionId)
    if (metrics) {
      metrics.queueDepth = queue.getSize()
      metrics.memoryUsage = queue.getSize() / this.queueCapacity
    }

    // Get optimal batch size
    const optimalBatchSize = this.calculateOptimalBatchSize(sessionId)

    // Check if we should save this batch
    if (queue.getSize() >= optimalBatchSize) {
      // Batch is ready
      await this.saveBatch(sessionId)
    } else {
      // Set adaptive timeout
      this.resetBatchTimeout(sessionId)
    }

    return completedEntry
  }

  /**
   * Reset batch timeout with adaptive timing
   */
  private resetBatchTimeout(sessionId: string): void {
    // Clear existing timeout
    const existingTimeout = this.timeouts.get(sessionId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Calculate adaptive timeout
    const timeout = this.calculateAdaptiveTimeout(sessionId)

    // Set new timeout
    const newTimeout = setTimeout(async () => {
      const queue = this.queues.get(sessionId)
      if (queue && queue.getSize() > 0) {
        await this.saveBatch(sessionId)
      }
    }, timeout)

    this.timeouts.set(sessionId, newTimeout)
  }

  /**
   * Save batch with optimized transaction handling
   */
  private async saveBatch(sessionId: string, force = false): Promise<void> {
    // Prevent concurrent saves
    if (this.saving.has(sessionId) && !force) {
      // Wait for existing save to complete
      const existingSave = this.savePromises.get(sessionId)
      if (existingSave) {
        await existingSave
      }
      return
    }

    const queue = this.queues.get(sessionId)
    if (!queue || queue.getSize() === 0) {
      return
    }

    // Mark as saving
    this.saving.add(sessionId)
    
    // Clear timeout
    const timeout = this.timeouts.get(sessionId)
    if (timeout) {
      clearTimeout(timeout)
      this.timeouts.delete(sessionId)
    }

    // Get optimal batch size
    const optimalBatchSize = this.calculateOptimalBatchSize(sessionId)
    
    // Drain entries from ring buffer
    const entries = queue.drain(optimalBatchSize)
    
    if (entries.length === 0) {
      this.saving.delete(sessionId)
      return
    }

    const startTime = Date.now()

    // Create save promise
    const savePromise = this.performBatchSave(sessionId, entries)
      .then(() => {
        // Update metrics on success
        const duration = Date.now() - startTime
        this.updateMetrics(sessionId, entries.length, duration, true)
      })
      .catch((error) => {
        console.error(`💥 BATCH SAVE ERROR for session ${sessionId}:`, error)
        // Re-queue entries on failure
        entries.forEach(entry => queue.push(entry))
        this.updateMetrics(sessionId, entries.length, Date.now() - startTime, false)
      })
      .finally(() => {
        this.saving.delete(sessionId)
        this.savePromises.delete(sessionId)
      })

    this.savePromises.set(sessionId, savePromise)
    await savePromise
  }

  /**
   * Update metrics after batch save
   */
  private updateMetrics(
    sessionId: string, 
    batchSize: number, 
    latency: number, 
    success: boolean
  ): void {
    const metrics = this.metrics.get(sessionId)
    if (!metrics) return

    // Update session metrics with exponential moving average
    const alpha = 0.3 // Smoothing factor
    metrics.avgLatency = alpha * latency + (1 - alpha) * metrics.avgLatency
    metrics.throughput = batchSize / (latency / 1000) // entries per second
    metrics.lastBatchTime = Date.now()

    // Update global metrics
    if (success) {
      this.globalMetrics.totalBatches++
      this.globalMetrics.totalEntries += batchSize
      this.globalMetrics.totalLatency += latency
    }

    // Log performance metrics periodically
    if (this.globalMetrics.totalBatches % 10 === 0) {
      const avgGlobalLatency = this.globalMetrics.totalLatency / this.globalMetrics.totalBatches
      console.log(`📈 TRANSCRIPT METRICS: Batches: ${this.globalMetrics.totalBatches}, ` +
                  `Avg Latency: ${avgGlobalLatency.toFixed(0)}ms, ` +
                  `Current Batch Size: ${this.currentBatchSize}`)
    }
  }

  /**
   * Perform the actual batch save to database
   */
  private async performBatchSave(sessionId: string, entries: TranscriptEntry[]): Promise<void> {
    const baseUrl = typeof window !== 'undefined' 
      ? ''
      : process.env.NEXTAUTH_URL || 'http://localhost:3000'
    
    const url = `${baseUrl}/api/sessions/${sessionId}/transcript/batch`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ entries }),
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Batch save failed: ${error}`)
    }
  }

  /**
   * Calculate metrics and broadcast
   */
  private async calculateAndBroadcastMetrics(entry: TranscriptEntry): Promise<void> {
    const calculator = this.metricsCalculators.get(entry.sessionId)
    if (!calculator) return

    try {
      const metrics = await calculator.processEntry({
        speaker: entry.speaker,
        text: entry.text,
        timestamp: entry.timestamp || new Date().toISOString()
      })

      // Only broadcast significant updates
      if (this.shouldBroadcastMetrics(metrics)) {
        await calculator.broadcastMetrics(metrics)
      }
    } catch (error) {
      // Silent fail for metrics
    }
  }

  /**
   * Determine if metrics should be broadcast
   */
  private shouldBroadcastMetrics(metrics: IncrementalMetrics): boolean {
    // Broadcast every 10 entries or on significant changes
    return metrics.messageCount % 10 === 0 || 
           metrics.confidence.overall > 80 ||
           metrics.engagement.score > 80
  }

  /**
   * Save to session storage as backup
   */
  private saveToSessionStorage(entry: TranscriptEntry): void {
    if (typeof window === 'undefined') return
    
    try {
      const key = `transcript_backup_${entry.sessionId}`
      const existing = sessionStorage.getItem(key)
      const entries = existing ? JSON.parse(existing) : []
      entries.push(entry)
      
      // Keep only last 100 entries
      if (entries.length > 100) {
        entries.shift()
      }
      
      sessionStorage.setItem(key, JSON.stringify(entries))
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Force save all pending batches
   */
  async flushAll(): Promise<void> {
    const promises: Promise<void>[] = []
    
    for (const sessionId of this.queues.keys()) {
      promises.push(this.saveBatch(sessionId, true))
    }
    
    await Promise.all(promises)
  }

  /**
   * Clean up session resources
   */
  cleanup(sessionId: string): void {
    // Clear timeout
    const timeout = this.timeouts.get(sessionId)
    if (timeout) {
      clearTimeout(timeout)
      this.timeouts.delete(sessionId)
    }
    
    // Clear queue
    const queue = this.queues.get(sessionId)
    if (queue) {
      queue.clear()
      this.queues.delete(sessionId)
    }
    
    // Clear metrics
    this.metrics.delete(sessionId)
    this.metricsCalculators.delete(sessionId)
  }

  /**
   * Get current statistics
   */
  getStats(): {
    sessions: number
    totalQueued: number
    currentBatchSize: number
    avgLatency: number
    throughput: number
  } {
    let totalQueued = 0
    let totalLatency = 0
    let totalThroughput = 0
    let sessionCount = 0

    for (const [sessionId, queue] of this.queues) {
      totalQueued += queue.getSize()
      const metrics = this.metrics.get(sessionId)
      if (metrics) {
        totalLatency += metrics.avgLatency
        totalThroughput += metrics.throughput
        sessionCount++
      }
    }

    return {
      sessions: this.queues.size,
      totalQueued,
      currentBatchSize: this.currentBatchSize,
      avgLatency: sessionCount > 0 ? totalLatency / sessionCount : 0,
      throughput: totalThroughput
    }
  }
}

// Export singleton instance
export const transcriptService = new UltraOptimizedTranscriptManager()

// Export class for testing
export { UltraOptimizedTranscriptManager }