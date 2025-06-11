import { METRICS_CONFIG, STORAGE_KEYS } from './constants';
import { FamilyMember, TranscriptEntry } from '@/types/therapy-session';

/**
 * Creates a hash from conversation content for deduplication
 * @param conversation - The conversation object from VAPI
 * @returns A 32-character hash string
 */
export function createConversationHash(conversation: unknown): string {
  const conversationContent = JSON.stringify(conversation || []);
  // Use a safer hash that handles Unicode characters
  return btoa(encodeURIComponent(conversationContent)).substring(0, 32);
}

/**
 * Calculates billable minutes based on total time minus paused time
 * @param totalSeconds - Total session duration in seconds
 * @param pausedSeconds - Total paused time in seconds
 * @returns Billable minutes (rounded up)
 */
export function calculateBillableMinutes(totalSeconds: number, pausedSeconds: number): number {
  const billableSeconds = Math.max(0, totalSeconds - pausedSeconds);
  return Math.ceil(billableSeconds / 60);
}

/**
 * Normalizes audio level for waveform visualization
 * Creates natural transitions between silence and speech
 * @param level - Raw audio level (0-100+)
 * @returns Normalized level (0-100)
 */
export function normalizeAudioLevel(level: number): number {
  let normalizedLevel = 0;
  
  if (level < 30) {
    // Complete silence or very low background noise (0-3)
    normalizedLevel = level < 10 ? 0 : level / 3; 
  } else if (level < 50) {
    // Low sounds (3-15)
    normalizedLevel = 10 + ((level - 30) / 20) * 10;
  } else if (level < 80) {
    // Normal speech (15-50)
    normalizedLevel = 20 + ((level - 50) / 30) * 30;
  } else {
    // Loud speech (50-100)
    normalizedLevel = 50 + Math.min(50, (level - 80) * 1.5);
  }
  
  return normalizedLevel;
}

/**
 * Formats session duration for display
 * @param minutes - Duration in minutes
 * @returns Formatted string (e.g., "30 minutes", "1 hour")
 */
export function formatSessionDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return hours === 1 ? '1 hour' : `${hours} hours`;
    }
    return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes`;
  }
}

/**
 * Parses transcript chunk into speaker and text
 * @param chunk - Raw transcript chunk (e.g., "THERAPIST: Hello...")
 * @returns Object with speaker and text
 */
export function parseTranscriptChunk(chunk: string): { speaker: string; text: string } {
  const colonIndex = chunk.indexOf(':');
  if (colonIndex === -1) {
    return { speaker: 'unknown', text: chunk };
  }
  
  const speaker = chunk.substring(0, colonIndex).trim().toLowerCase();
  const text = chunk.substring(colonIndex + 1).trim();
  
  // Normalize speaker names
  const speakerMap: Record<string, string> = {
    'therapist': 'assistant',
    'user': 'user',
    'system': 'system',
    'assistant': 'assistant'
  };
  
  return {
    speaker: speakerMap[speaker] || speaker,
    text
  };
}

/**
 * Calculates word count from text
 * @param text - The text to count words in
 * @returns Number of words
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length >= METRICS_CONFIG.MIN_WORD_LENGTH).length;
}

/**
 * Estimates speaking duration based on word count
 * @param wordCount - Number of words
 * @param wpm - Words per minute (default: 150)
 * @returns Estimated duration in seconds
 */
export function estimateSpeakingDuration(wordCount: number, wpm: number = METRICS_CONFIG.SPEAKING_RATE_WPM): number {
  return Math.round((wordCount / wpm) * 60);
}

/**
 * Creates a storage key for transcripts
 * @param sessionId - The session ID
 * @returns Storage key string
 */
export function getTranscriptStorageKey(sessionId: string): string {
  return `${STORAGE_KEYS.TRANSCRIPT_PREFIX}${sessionId}`;
}

/**
 * Validates family member data
 * @param member - Family member object
 * @returns True if valid
 */
export function isValidFamilyMember(member: FamilyMember): boolean {
  return (
    member.name.trim().length > 0 &&
    member.age > 0 &&
    member.age < 150 &&
    member.relation.trim().length > 0
  );
}

/**
 * Formats family members for display
 * @param members - Array of family members
 * @returns Formatted string (e.g., "Julie (daughter, 11), Charles (son, 9)")
 */
export function formatFamilyMembers(members: FamilyMember[]): string {
  return members
    .map(member => `${member.name} (${member.relation}, ${member.age})`)
    .join(', ');
}

/**
 * Checks if a session has expired
 * @param startTime - Session start time
 * @param durationMinutes - Session duration in minutes
 * @param conversationMinutes - Already used conversation minutes
 * @returns True if session has expired
 */
export function isSessionExpired(
  startTime: Date | string, 
  durationMinutes: number, 
  conversationMinutes: number
): boolean {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const now = new Date();
  const elapsedMinutes = (now.getTime() - start.getTime()) / (1000 * 60);
  
  // Session is expired if either:
  // 1. Total elapsed time exceeds duration
  // 2. Conversation time exceeds duration
  return elapsedMinutes >= durationMinutes || conversationMinutes >= durationMinutes;
}

/**
 * Sanitizes text for display (removes special characters that could break UI)
 * @param text - Raw text
 * @returns Sanitized text
 */
export function sanitizeTranscriptText(text: string): string {
  return text
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\*/g, '') // Remove asterisks (used for actions)
    .replace(/<[^>]*>/g, '') // Remove HTML-like tags
    .trim();
}

/**
 * Deduplicates transcript entries based on speaker and text
 * @param entries - Array of transcript entries
 * @returns Deduplicated array
 */
export function deduplicateTranscripts(entries: TranscriptEntry[]): TranscriptEntry[] {
  const seen = new Set<string>();
  return entries.filter(entry => {
    const key = `${entry.speaker}:${entry.text}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Calculates session metrics summary
 * @param transcripts - Array of transcript entries
 * @returns Metrics summary object
 */
export function calculateSessionMetrics(transcripts: TranscriptEntry[]) {
  const userTranscripts = transcripts.filter(t => t.speaker === 'user');
  const assistantTranscripts = transcripts.filter(t => t.speaker === 'assistant');
  
  const userWordCount = userTranscripts.reduce((sum, t) => sum + countWords(t.text), 0);
  const assistantWordCount = assistantTranscripts.reduce((sum, t) => sum + countWords(t.text), 0);
  
  return {
    totalTranscripts: transcripts.length,
    userTranscripts: userTranscripts.length,
    assistantTranscripts: assistantTranscripts.length,
    userWordCount,
    assistantWordCount,
    totalWordCount: userWordCount + assistantWordCount,
    estimatedDurationSeconds: estimateSpeakingDuration(userWordCount + assistantWordCount),
    averageUserMessageLength: userTranscripts.length > 0 
      ? Math.round(userWordCount / userTranscripts.length)
      : 0,
    averageAssistantMessageLength: assistantTranscripts.length > 0
      ? Math.round(assistantWordCount / assistantTranscripts.length)
      : 0
  };
}