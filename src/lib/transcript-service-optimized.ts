/**
 * Optimized transcript service with batched saves to reduce database load
 * and prevent VAPI session timeouts caused by excessive API calls
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

/**
 * Batched transcript manager to reduce database load
 */
class BatchedTranscriptManager {
  private queue: Map<string, TranscriptEntry[]> = new Map()
  private batchSize = 50 // Increased to handle more entries efficiently
  private maxBatchSize = 90 // Stay under API limit of 100
  private batchTimeout = 30000 // 30 seconds - balanced between frequency and responsiveness
  private timeouts: Map<string, NodeJS.Timeout> = new Map()
  private saving: Set<string> = new Set()
  
  // Real-time metrics calculators for active sessions
  private metricsCalculators: Map<string, RealTimeMetricsCalculator> = new Map()

  /**
   * Initialize metrics calculator for a session
   */
  initializeMetricsCalculator(sessionId: string, userId: string, therapyType: 'couple' | 'family' | 'solo', sessionDurationMinutes?: number): void {
    if (!this.metricsCalculators.has(sessionId)) {
      const calculator = new RealTimeMetricsCalculator({
        sessionId,
        therapyType,
        sessionDurationMinutes,
        userId
      });
      this.metricsCalculators.set(sessionId, calculator);
      console.log(`📊 METRICS: Initialized calculator for session ${sessionId} (${therapyType})`);
    }
  }

  /**
   * Add entry to batch queue instead of immediate save
   */
  async addEntry(entry: TranscriptEntry): Promise<TranscriptEntry> {
    const { sessionId } = entry
    
    // Validate entry
    if (!sessionId || !entry.text?.trim() || !entry.speaker) {
      throw new Error('Invalid transcript entry')
    }

    // Add timestamp if missing
    const completedEntry: TranscriptEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
      isFinal: entry.isFinal !== undefined ? entry.isFinal : true
    }

    // Save to session storage immediately as backup
    this.saveToSessionStorage(completedEntry)

    // Calculate real-time metrics if calculator is available
    await this.calculateAndBroadcastMetrics(completedEntry)

    // Add to batch queue
    if (!this.queue.has(sessionId)) {
      this.queue.set(sessionId, [])
    }
    
    const sessionQueue = this.queue.get(sessionId)!
    sessionQueue.push(completedEntry)

    console.log(`📝 BATCHED: Added entry to queue (${sessionQueue.length}/${this.batchSize})`)

    // Check if we should save this batch
    if (sessionQueue.length >= this.batchSize) {
      await this.saveBatch(sessionId)
    } else {
      // Set timeout to save batch if it doesn't fill up
      this.resetBatchTimeout(sessionId)
    }

    return completedEntry
  }

  /**
   * Calculate metrics and broadcast to real-time dashboard
   */
  private async calculateAndBroadcastMetrics(entry: TranscriptEntry): Promise<void> {
    const calculator = this.metricsCalculators.get(entry.sessionId);
    if (!calculator) {
      return; // No calculator means metrics not enabled for this session
    }

    try {
      // Add transcript entry to calculator
      const metrics = await calculator.addTranscriptEntry({
        speaker: entry.speaker as 'user' | 'assistant',
        text: entry.text,
        timestamp: entry.timestamp || new Date().toISOString()
      });

      // Metrics broadcasting is now handled within the calculator itself
      console.log(`📊 METRICS CALCULATED: Session ${entry.sessionId} - Confidence: ${metrics.confidence}%`);
    } catch (error) {
      console.error(`Error calculating metrics for session ${entry.sessionId}:`, error);
    }
  }

  /**
   * Send metrics to API endpoint for WebSocket broadcasting
   */
  private async sendMetricsToAPI(sessionId: string, userId: string, metrics: IncrementalMetrics): Promise<void> {
    try {
      const response = await fetch('/api/ws/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'metrics_update',
          userId,
          sessionId,
          metrics,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        console.warn(`Failed to send metrics to API: ${response.status}`);
      } else {
        console.log(`✅ METRICS API: Successfully sent metrics for session ${sessionId}`);
      }
    } catch (error) {
      console.error('Error sending metrics to API:', error);
    }
  }

  /**
   * Save a batch of entries for a session
   */
  private async saveBatch(sessionId: string): Promise<void> {
    if (this.saving.has(sessionId)) {
      console.log(`⏳ BATCH: Already saving session ${sessionId}, skipping`)
      return
    }

    const sessionQueue = this.queue.get(sessionId)
    if (!sessionQueue || sessionQueue.length === 0) {
      return
    }

    // Clear timeout since we're saving now
    this.clearBatchTimeout(sessionId)
    
    // Mark as saving
    this.saving.add(sessionId)
    
    // Handle large batches by splitting them
    const allEntries = [...sessionQueue]
    this.queue.set(sessionId, []) // Clear queue

    console.log(`💾 BATCH SAVE: Processing ${allEntries.length} entries for session ${sessionId}`)

    try {
      // Split into chunks if necessary
      const chunks = []
      for (let i = 0; i < allEntries.length; i += this.maxBatchSize) {
        chunks.push(allEntries.slice(i, i + this.maxBatchSize))
      }

      console.log(`📦 BATCH: Split into ${chunks.length} chunks`)

      // Save each chunk
      let failedEntries: TranscriptEntry[] = []
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        console.log(`💾 Saving chunk ${i + 1}/${chunks.length} with ${chunk.length} entries`)
        
        try {
          const response = await fetch(`/api/sessions/${sessionId}/transcript/batch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              entries: chunk.map(entry => ({
                speaker: entry.speaker,
                text: entry.text,
                timestamp: entry.timestamp,
                isFinal: entry.isFinal,
              }))
            }),
          })

          if (response.ok) {
            console.log(`✅ CHUNK ${i + 1}/${chunks.length} SUCCESS: Saved ${chunk.length} entries`)
          } else {
            const errorText = await response.text()
            console.warn(`❌ CHUNK ${i + 1}/${chunks.length} FAILED: ${response.status} - ${errorText}`)
            failedEntries.push(...chunk)
          }
        } catch (error) {
          console.error(`💥 CHUNK ${i + 1}/${chunks.length} ERROR:`, error)
          failedEntries.push(...chunk)
        }
        
        // Small delay between chunks to avoid overwhelming the server
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // Re-queue failed entries for retry
      if (failedEntries.length > 0) {
        console.warn(`⚠️ Re-queuing ${failedEntries.length} failed entries`)
        const currentQueue = this.queue.get(sessionId) || []
        this.queue.set(sessionId, [...failedEntries, ...currentQueue])
      }
      
    } catch (error) {
      console.error('💥 BATCH ERROR:', error)
      // Re-queue all entries for retry
      const currentQueue = this.queue.get(sessionId) || []
      this.queue.set(sessionId, [...allEntries, ...currentQueue])
    } finally {
      this.saving.delete(sessionId)
    }
  }

  /**
   * Set/reset timeout for batch save
   */
  private resetBatchTimeout(sessionId: string): void {
    this.clearBatchTimeout(sessionId)
    
    const timeout = setTimeout(() => {
      this.saveBatch(sessionId)
    }, this.batchTimeout)
    
    this.timeouts.set(sessionId, timeout)
  }

  /**
   * Clear timeout for session
   */
  private clearBatchTimeout(sessionId: string): void {
    const timeout = this.timeouts.get(sessionId)
    if (timeout) {
      clearTimeout(timeout)
      this.timeouts.delete(sessionId)
    }
  }

  /**
   * Force save all pending batches (e.g., when session ends)
   */
  async flushAll(): Promise<void> {
    const sessionIds = Array.from(this.queue.keys())
    await Promise.all(sessionIds.map(sessionId => this.saveBatch(sessionId)))
  }

  /**
   * Cleanup metrics calculator for a session
   */
  cleanupMetricsCalculator(sessionId: string): void {
    const calculator = this.metricsCalculators.get(sessionId);
    if (calculator) {
      calculator.cleanupSession();
      this.metricsCalculators.delete(sessionId);
      console.log(`🧹 METRICS: Cleaned up calculator for session ${sessionId}`);
    }
  }

  /**
   * Force save pending batch for specific session
   */
  async flushSession(sessionId: string): Promise<void> {
    await this.saveBatch(sessionId)
  }

  /**
   * Save to session storage as immediate backup
   */
  private saveToSessionStorage(entry: TranscriptEntry): void {
    try {
      const storageKey = `transcript-batch-${entry.sessionId}`
      const existing = JSON.parse(sessionStorage.getItem(storageKey) || '[]')
      existing.push({
        speaker: entry.speaker,
        text: entry.text,
        timestamp: entry.timestamp,
        isFinal: entry.isFinal
      })
      sessionStorage.setItem(storageKey, JSON.stringify(existing))
    } catch (error) {
      console.warn('Session storage backup failed:', error)
    }
  }
}

// Global instance
const batchManager = new BatchedTranscriptManager()

/**
 * Optimized add transcript entry function - uses batching
 */
export async function addTranscriptEntry(entry: TranscriptEntry): Promise<TranscriptEntry> {
  return await batchManager.addEntry(entry)
}

/**
 * Force flush all pending transcript batches
 */
export async function flushTranscriptBatches(): Promise<void> {
  await batchManager.flushAll()
}

/**
 * Force flush pending batch for a specific session
 */
export async function flushSessionTranscripts(sessionId: string): Promise<void> {
  await batchManager.flushSession(sessionId)
}

/**
 * Get all transcript entries for a session
 */
export async function getTranscriptEntries(sessionId: string): Promise<TranscriptEntry[]> {
  try {
    const response = await fetch(`/api/sessions/${sessionId}/transcript`)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to fetch transcript entries')
    }

    const data = await response.json()
    const entries = Array.isArray(data) ? data : data.entries || []
    
    console.log(`📊 TRANSCRIPT COUNT: Session ${sessionId} has ${entries.length} entries`)
    
    return entries
  } catch (error) {
    console.error('Error fetching transcript entries:', error)
    throw error
  }
}

/**
 * Delete a transcript entry
 */
export async function deleteTranscriptEntry(sessionId: string, entryId: string): Promise<void> {
  try {
    const response = await fetch(`/api/sessions/${sessionId}/transcript?entryId=${entryId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete transcript entry')
    }
  } catch (error) {
    console.error('Error deleting transcript entry:', error)
    throw error
  }
}

/**
 * Optimized transcript handler with batching
 */
export function createTranscriptHandler(sessionId: string, assistantId?: string) {
  return {
    /**
     * Handle assistant message - batched
     */
    handleAssistantMessage: async (text: string, isFinal: boolean = true) => {
      if (!text || text.trim() === '') return
      
      try {
        return await addTranscriptEntry({
          sessionId,
          speaker: 'assistant',
          text,
          timestamp: new Date().toISOString(),
          isFinal,
          assistantId,
        })
      } catch (error) {
        console.error('Failed to add assistant transcript entry:', error)
      }
    },
    
    /**
     * Handle user message - batched
     */
    handleUserMessage: async (text: string, isFinal: boolean = true) => {
      if (!text || text.trim() === '') return
      
      try {
        return await addTranscriptEntry({
          sessionId,
          speaker: 'user',
          text,
          timestamp: new Date().toISOString(),
          isFinal,
          assistantId,
        })
      } catch (error) {
        console.error('Failed to add user transcript entry:', error)
      }
    },

    /**
     * Flush any pending transcripts for this session
     */
    flush: async () => {
      await flushSessionTranscripts(sessionId)
    }
  }
}

// Utility functions (keeping same as original)
export function transcriptEntriesToString(entries: TranscriptEntry[]): string {
  return entries
    .sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    })
    .map((entry) => `${entry.speaker}: ${entry.text}`)
    .join('\n')
}

export function parseTranscriptString(sessionId: string, transcript: string): TranscriptEntry[] {
  if (!transcript) return []
  
  const lines = transcript.split('\n').filter((line) => line.trim() !== '')
  const entries: TranscriptEntry[] = []
  
  lines.forEach((line, index) => {
    const speakerMatch = line.match(/^([^:]+):\s*(.+)$/)
    
    if (speakerMatch) {
      const speaker = speakerMatch[1].trim().toLowerCase()
      const text = speakerMatch[2].trim()
      
      if (!text) return
      
      entries.push({
        id: `legacy-${index}`,
        sessionId,
        speaker: speaker === 'user' || 
                speaker === 'you' ||
                speaker === 'human' ||
                speaker === 'client' ||
                speaker === 'customer' ||
                speaker === 'person'
                ? 'user' : 'assistant',
        text,
        timestamp: new Date(Date.now() - (lines.length - index) * 10000).toISOString(),
        isFinal: true,
      })
    }
  })
  
  return entries
}

/**
 * Function to get transcripts from previous sessions for context
 * Will be used to make the AI aware of past conversations
 */
export async function getPreviousSessionsTranscript(userId?: string, currentSessionId?: string, maxSessions = 3): Promise<string> {
  try {
    if (!userId) {
      console.log('No user ID provided to getPreviousSessionsTranscript');
      return '';
    }
    
    console.log('Fetching previous sessions for user', userId);
    const response = await fetch('/api/sessions');
    
    if (!response.ok) {
      console.error('Failed to fetch previous sessions:', response.statusText);
      return '';
    }
    
    const sessions = await response.json();
    
    const previousSessions = sessions
      .filter((s: any) => s.status === 'completed' && s.id !== currentSessionId)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, maxSessions);
    
    if (previousSessions.length === 0) {
      console.log('No previous completed sessions found');
      return '';
    }
    
    console.log(`Found ${previousSessions.length} previous sessions`);
    
    let formattedTranscript = "I've reviewed my notes from our previous sessions before today. Here's what I recall:\n\n";
    
    for (const session of previousSessions) {
      const sessionDate = new Date(session.date).toLocaleDateString();
      formattedTranscript += `From our session on ${sessionDate} (${session.theme || 'Therapy Session'}):\n`;
      
      if (session.transcriptEntries && session.transcriptEntries.length > 0) {
        const entries = session.transcriptEntries
          .filter((entry: any) => entry.speaker !== 'system')
          .sort((a: any, b: any) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        
        const userMessages = entries
          .filter((entry: any) => entry.speaker === 'user')
          .map((entry: any) => entry.text);
          
        const therapistMessages = entries
          .filter((entry: any) => entry.speaker === 'assistant')
          .map((entry: any) => entry.text);
        
        if (userMessages.length > 0) {
          const sampleUserMessages = userMessages.length > 3 
            ? [userMessages[0], userMessages[Math.floor(userMessages.length/2)], userMessages[userMessages.length-1]]
            : userMessages;
            
          formattedTranscript += "Key client concerns discussed:\n";
          for (const msg of sampleUserMessages.slice(0, 3)) {
            if (msg && msg.length > 20) {
              formattedTranscript += `- ${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}\n`;
            }
          }
        }
        
        if (therapistMessages.length > 0) {
          const sample = therapistMessages.length > 2 
            ? [therapistMessages[Math.floor(therapistMessages.length/2)], therapistMessages[therapistMessages.length-1]]
            : therapistMessages;
            
          formattedTranscript += "\nGuidance I provided:\n";
          for (const msg of sample.slice(0, 2)) {
            if (msg && msg.length > 30) {
              formattedTranscript += `- ${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}\n`;
            }
          }
        }
        
        formattedTranscript += "\nFull conversation transcript:\n";
        for (const entry of entries) {
          const speakerName = entry.speaker === 'user' ? 'Client' : 'Therapist';
          formattedTranscript += `${speakerName}: ${entry.text}\n`;
        }
      } else if (session.transcript) {
        const lines = session.transcript.split('\n');
        
        const userLines = lines
          .filter(line => line.startsWith('USER:') || line.startsWith('CLIENT:')) 
          .map(line => line.replace(/^(USER|CLIENT):\s*/, ''));
          
        const therapistLines = lines
          .filter(line => line.startsWith('THERAPIST:') || line.startsWith('ASSISTANT:'))
          .map(line => line.replace(/^(THERAPIST|ASSISTANT):\s*/, ''));
        
        if (userLines.length > 0) {
          formattedTranscript += "Key client concerns from our discussion:\n";
          for (const line of userLines.slice(0, 3)) {
            formattedTranscript += `- ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}\n`;
          }
        }
        
        if (therapistLines.length > 0) {
          formattedTranscript += "\nGuidance I provided:\n";
          for (const line of therapistLines.slice(-2)) {
            formattedTranscript += `- ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}\n`;
          }
        }
        
        formattedTranscript += "\nFull conversation transcript:\n";
        formattedTranscript += session.transcript;
      } else {
        formattedTranscript += 'I don\'t have detailed notes from this session, but I recall we had a productive conversation.\n';
      }
      
      formattedTranscript += "\n-----\n\n";
    }
    
    return formattedTranscript;
  } catch (error) {
    console.error('Error getting previous sessions transcript:', error);
    return '';
  }
}

/**
 * Initialize real-time metrics for a session
 */
export function initializeSessionMetrics(sessionId: string, userId: string, therapyType: 'couple' | 'family' | 'solo', sessionDurationMinutes?: number): void {
  batchManager.initializeMetricsCalculator(sessionId, userId, therapyType, sessionDurationMinutes);
}

/**
 * Cleanup real-time metrics for a session
 */
export function cleanupSessionMetrics(sessionId: string): void {
  batchManager.cleanupMetricsCalculator(sessionId);
}

// Export batch manager for advanced usage
export { batchManager }