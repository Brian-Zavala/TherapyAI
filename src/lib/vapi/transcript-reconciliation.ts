/**
 * Transcript Reconciliation Service
 * Detects and merges duplicate transcripts, prioritizing webhook data as source of truth
 */

import { prisma } from '@/lib/prisma-optimized'
import { 
  getTranscriptStrategy, 
  shouldRunReconciliation,
  getReconciliationDelay 
} from './transcript-strategy'

interface TranscriptEntry {
  id: string
  sessionId: string
  speaker: string
  text: string
  timestamp: Date
  isFinal: boolean
  sequence?: number | null
  metadata?: any
  createdAt: Date
}

interface ReconciliationResult {
  sessionId: string
  duplicatesFound: number
  duplicatesRemoved: number
  entriesMerged: number
  finalEntryCount: number
  errors: string[]
}

/**
 * Calculate similarity between two transcript texts
 * Returns a score between 0 and 1 (1 = identical)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  if (text1 === text2) return 1
  
  // Normalize texts
  const norm1 = text1.toLowerCase().trim()
  const norm2 = text2.toLowerCase().trim()
  
  if (norm1 === norm2) return 0.95
  
  // Calculate Levenshtein distance ratio
  const maxLen = Math.max(norm1.length, norm2.length)
  if (maxLen === 0) return 1
  
  const distance = levenshteinDistance(norm1, norm2)
  return 1 - (distance / maxLen)
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

/**
 * Detect duplicate transcript entries within a session
 */
async function detectDuplicates(
  sessionId: string,
  windowMs: number = 2000
): Promise<Map<string, TranscriptEntry[]>> {
  const entries = await prisma.transcriptEntry.findMany({
    where: { sessionId },
    orderBy: [{ timestamp: 'asc' }, { createdAt: 'asc' }]
  })
  
  const duplicateGroups = new Map<string, TranscriptEntry[]>()
  const processed = new Set<string>()
  
  for (let i = 0; i < entries.length; i++) {
    if (processed.has(entries[i].id)) continue
    
    const current = entries[i]
    const group: TranscriptEntry[] = [current]
    processed.add(current.id)
    
    // Look for similar entries within time window
    for (let j = i + 1; j < entries.length; j++) {
      if (processed.has(entries[j].id)) continue
      
      const candidate = entries[j]
      
      // Check if within time window
      const timeDiff = Math.abs(
        candidate.timestamp.getTime() - current.timestamp.getTime()
      )
      
      if (timeDiff > windowMs) continue
      
      // Check speaker match
      if (candidate.speaker !== current.speaker) continue
      
      // Calculate text similarity
      const similarity = calculateTextSimilarity(current.text, candidate.text)
      
      // Consider as duplicate if similarity > 0.85
      if (similarity > 0.85) {
        group.push(candidate)
        processed.add(candidate.id)
      }
    }
    
    // Only add groups with duplicates
    if (group.length > 1) {
      duplicateGroups.set(current.id, group)
    }
  }
  
  return duplicateGroups
}

/**
 * Merge duplicate transcript entries, prioritizing webhook data
 */
async function mergeDuplicates(
  duplicateGroups: Map<string, TranscriptEntry[]>
): Promise<{ kept: string[], removed: string[] }> {
  const kept: string[] = []
  const removed: string[] = []
  
  for (const [, group] of duplicateGroups) {
    // Sort by priority: webhook > final > timestamp
    const sorted = group.sort((a, b) => {
      // Check metadata source
      const aIsWebhook = a.metadata?.source === 'webhook'
      const bIsWebhook = b.metadata?.source === 'webhook'
      
      if (aIsWebhook && !bIsWebhook) return -1
      if (!aIsWebhook && bIsWebhook) return 1
      
      // Check isFinal flag
      if (a.isFinal && !b.isFinal) return -1
      if (!a.isFinal && b.isFinal) return 1
      
      // Use creation time as tiebreaker
      return a.createdAt.getTime() - b.createdAt.getTime()
    })
    
    // Keep the first (highest priority) entry
    const keepEntry = sorted[0]
    kept.push(keepEntry.id)
    
    // Mark others for removal
    for (let i = 1; i < sorted.length; i++) {
      removed.push(sorted[i].id)
    }
  }
  
  // Delete duplicate entries
  if (removed.length > 0) {
    await prisma.transcriptEntry.deleteMany({
      where: { id: { in: removed } }
    })
  }
  
  return { kept, removed }
}

/**
 * Update session metrics to use final webhook data
 */
async function updateSessionMetrics(sessionId: string): Promise<void> {
  const strategy = getTranscriptStrategy()
  
  // Only update if webhook is primary source
  if (!strategy.useWebhookAsSource) return
  
  try {
    // Get final transcript entries
    const entries = await prisma.transcriptEntry.findMany({
      where: { 
        sessionId,
        isFinal: true
      },
      orderBy: { timestamp: 'asc' }
    })
    
    // Calculate word counts
    const userWords = entries
      .filter(e => e.speaker === 'user')
      .reduce((sum, e) => sum + e.text.split(' ').filter(w => w.length > 0).length, 0)
    
    const assistantWords = entries
      .filter(e => e.speaker === 'assistant')
      .reduce((sum, e) => sum + e.text.split(' ').filter(w => w.length > 0).length, 0)
    
    // Update session with final metrics
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        metadata: {
          transcriptCount: entries.length,
          userWordCount: userWords,
          assistantWordCount: assistantWords,
          reconciliationCompleted: true,
          reconciliationTimestamp: new Date().toISOString()
        }
      }
    })
    
    console.log(`📊 Updated session metrics: ${entries.length} transcripts, ${userWords} user words, ${assistantWords} assistant words`)
  } catch (error) {
    console.error('Error updating session metrics:', error)
  }
}

/**
 * Fix sequence numbers after reconciliation
 */
async function fixSequenceNumbers(sessionId: string): Promise<void> {
  const entries = await prisma.transcriptEntry.findMany({
    where: { sessionId },
    orderBy: { timestamp: 'asc' }
  })
  
  // Update sequence numbers
  const updates = entries.map((entry, index) => 
    prisma.transcriptEntry.update({
      where: { id: entry.id },
      data: { sequence: index }
    })
  )
  
  await prisma.$transaction(updates)
}

/**
 * Main reconciliation function for a session
 */
export async function reconcileSessionTranscripts(
  sessionId: string
): Promise<ReconciliationResult> {
  const result: ReconciliationResult = {
    sessionId,
    duplicatesFound: 0,
    duplicatesRemoved: 0,
    entriesMerged: 0,
    finalEntryCount: 0,
    errors: []
  }
  
  try {
    // Check if reconciliation should run
    if (!shouldRunReconciliation(sessionId)) {
      console.log(`🔍 Reconciliation skipped for session ${sessionId} (disabled by strategy)`)
      return result
    }
    
    const strategy = getTranscriptStrategy()
    console.log(`🔍 Starting transcript reconciliation for session ${sessionId}`)
    
    // Step 1: Detect duplicates
    const duplicateGroups = await detectDuplicates(
      sessionId, 
      strategy.deduplicationWindowMs
    )
    
    result.duplicatesFound = duplicateGroups.size
    
    if (duplicateGroups.size > 0) {
      console.log(`📋 Found ${duplicateGroups.size} duplicate groups`)
      
      // Step 2: Merge duplicates
      const { kept, removed } = await mergeDuplicates(duplicateGroups)
      result.duplicatesRemoved = removed.length
      result.entriesMerged = kept.length
      
      console.log(`✅ Kept ${kept.length} entries, removed ${removed.length} duplicates`)
    }
    
    // Step 3: Fix sequence numbers
    await fixSequenceNumbers(sessionId)
    
    // Step 4: Update session metrics
    await updateSessionMetrics(sessionId)
    
    // Get final count
    const finalCount = await prisma.transcriptEntry.count({
      where: { sessionId }
    })
    result.finalEntryCount = finalCount
    
    console.log(`✅ Reconciliation complete: ${finalCount} final entries`)
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(errorMsg)
    console.error(`❌ Reconciliation error for session ${sessionId}:`, error)
  }
  
  return result
}

/**
 * Schedule reconciliation for a session after delay
 */
export function scheduleSessionReconciliation(sessionId: string): void {
  const delay = getReconciliationDelay()
  
  console.log(`⏰ Scheduling reconciliation for session ${sessionId} in ${delay}ms`)
  
  setTimeout(async () => {
    try {
      const result = await reconcileSessionTranscripts(sessionId)
      console.log(`📋 Reconciliation result:`, result)
    } catch (error) {
      console.error(`Failed to reconcile session ${sessionId}:`, error)
    }
  }, delay)
}

/**
 * Bulk reconciliation for multiple sessions
 */
export async function reconcileMultipleSessions(
  sessionIds: string[]
): Promise<ReconciliationResult[]> {
  const results: ReconciliationResult[] = []
  
  for (const sessionId of sessionIds) {
    const result = await reconcileSessionTranscripts(sessionId)
    results.push(result)
    
    // Small delay between sessions to avoid overload
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return results
}

/**
 * Find sessions that need reconciliation
 */
export async function findSessionsNeedingReconciliation(
  limit: number = 10
): Promise<string[]> {
  const strategy = getTranscriptStrategy()
  
  if (!strategy.reconciliationEnabled) {
    return []
  }
  
  // Find completed sessions without reconciliation
  const sessions = await prisma.session.findMany({
    where: {
      status: 'completed',
      metadata: {
        path: ['reconciliationCompleted'],
        not: true
      }
    },
    select: { id: true },
    take: limit,
    orderBy: { completedAt: 'desc' }
  })
  
  return sessions.map(s => s.id)
}

/**
 * Cleanup function to remove all duplicate transcripts across all sessions
 * Use with caution - this is a destructive operation
 */
export async function cleanupAllDuplicateTranscripts(): Promise<{
  sessionsProcessed: number
  totalDuplicatesRemoved: number
}> {
  const sessionsNeedingCleanup = await findSessionsNeedingReconciliation(100)
  
  console.log(`🧹 Starting cleanup for ${sessionsNeedingCleanup.length} sessions`)
  
  let totalDuplicatesRemoved = 0
  
  for (const sessionId of sessionsNeedingCleanup) {
    const result = await reconcileSessionTranscripts(sessionId)
    totalDuplicatesRemoved += result.duplicatesRemoved
  }
  
  return {
    sessionsProcessed: sessionsNeedingCleanup.length,
    totalDuplicatesRemoved
  }
}

/**
 * Mark transcripts from a specific source
 * Useful for identifying which system created each transcript
 */
export async function markTranscriptSource(
  sessionId: string,
  source: 'realtime' | 'webhook'
): Promise<void> {
  await prisma.transcriptEntry.updateMany({
    where: { 
      sessionId,
      metadata: {
        path: ['source'],
        equals: undefined
      }
    },
    data: {
      metadata: {
        source,
        markedAt: new Date().toISOString()
      }
    }
  })
}