/**
 * Optimized transcript service with batched saves to reduce database load
 * and prevent VAPI session timeouts caused by excessive API calls
 */

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
  private batchSize = 10 // Increased from 5 to reduce database write frequency
  private batchTimeout = 60000 // Increased to 60 seconds to reduce timeout-based saves
  private timeouts: Map<string, NodeJS.Timeout> = new Map()
  private saving: Set<string> = new Set()

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
    
    const entriesToSave = [...sessionQueue]
    this.queue.set(sessionId, []) // Clear queue

    console.log(`💾 BATCH SAVE: Saving ${entriesToSave.length} entries for session ${sessionId}`)

    try {
      // Single API call to save all entries
      const response = await fetch(`/api/sessions/${sessionId}/transcript/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entries: entriesToSave.map(entry => ({
            speaker: entry.speaker,
            text: entry.text,
            timestamp: entry.timestamp,
            isFinal: entry.isFinal,
          }))
        }),
      })

      if (response.ok) {
        console.log(`✅ BATCH SUCCESS: Saved ${entriesToSave.length} entries`)
      } else {
        console.warn(`❌ BATCH FAILED: ${response.status}`)
        // Re-queue entries for retry
        const currentQueue = this.queue.get(sessionId) || []
        this.queue.set(sessionId, [...entriesToSave, ...currentQueue])
      }
    } catch (error) {
      console.error('💥 BATCH ERROR:', error)
      // Re-queue entries for retry
      const currentQueue = this.queue.get(sessionId) || []
      this.queue.set(sessionId, [...entriesToSave, ...currentQueue])
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

// Export batch manager for advanced usage
export { batchManager }