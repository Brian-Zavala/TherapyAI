/**
 * Transcript service for managing structured transcript entries
 * This service provides functions to add, get, and handle transcript entries
 * in a structured way, rather than using a single string.
 */

/**
 * Represents a single transcript entry
 */
export type TranscriptEntry = {
  id?: string
  sessionId: string
  speaker: string
  text: string
  timestamp?: string
  isFinal?: boolean
}

/**
 * Add a new transcript entry to a session via API with enhanced reliability
 */
export async function addTranscriptEntry(entry: TranscriptEntry): Promise<TranscriptEntry> {
  try {
    // Validate entry data before sending
    if (!entry.sessionId) {
      console.error('Cannot add transcript entry: Missing sessionId');
      throw new Error('Missing sessionId');
    }
    
    if (!entry.text || entry.text.trim() === '') {
      console.error('Cannot add transcript entry: Empty text');
      throw new Error('Empty text');
    }
    
    if (!entry.speaker) {
      console.error('Cannot add transcript entry: Missing speaker');
      throw new Error('Missing speaker');
    }
    
    // Make sure we have a timestamp
    const timestamp = entry.timestamp || new Date().toISOString();
    const isFinal = entry.isFinal !== undefined ? entry.isFinal : true;
    
    // Always save to session storage first as an immediate backup
    try {
      const storageKey = `api-backup-${entry.sessionId}`;
      const existingEntries = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
      existingEntries.push({
        speaker: entry.speaker,
        text: entry.text,
        timestamp: timestamp,
        isFinal: isFinal
      });
      sessionStorage.setItem(storageKey, JSON.stringify(existingEntries));
      
      // Also save individual entries with unique keys
      const uniqueKey = `api-entry-${entry.sessionId}-${Date.now()}`;
      sessionStorage.setItem(uniqueKey, JSON.stringify({
        speaker: entry.speaker,
        text: entry.text,
        timestamp: timestamp,
        isFinal: isFinal
      }));
      
      console.log(`Saved API backup to session storage (${uniqueKey}, ${existingEntries.length} total entries)`);
    } catch (storageError) {
      console.warn('Could not save API backup to session storage:', storageError);
      // Continue with API attempts anyway
    }
    
    // ATTEMPT 1: Try primary transcript API endpoint
    console.log(`🔄 TRANSCRIPT API ATTEMPT 1: Saving ${entry.speaker} entry to session ${entry.sessionId}`);
    try {
      const response = await fetch(`/api/sessions/${entry.sessionId}/transcript`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          speaker: entry.speaker,
          text: entry.text,
          timestamp: timestamp,
          isFinal: isFinal,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ PRIMARY API SUCCESS: Entry saved with ID ${result.id}`);
        return result;
      }
      
      // Log detailed error for debugging
      let errorDetails = `Status: ${response.status}`;
      try {
        const errorText = await response.text();
        errorDetails += ` - ${errorText}`;
      } catch (textError) {
        // Ignore text extraction errors
      }
      
      console.warn(`❌ PRIMARY API FAILED: ${errorDetails}`);
      throw new Error(`Transcript API failed: ${errorDetails}`);
    } catch (firstAttemptError) {
      console.error('⚠️ FIRST ATTEMPT FAILED:', firstAttemptError);
      
      // ATTEMPT 2: Try sessions PATCH API with transcriptEntry
      console.log(`🔄 TRANSCRIPT API ATTEMPT 2: Using PATCH API for session ${entry.sessionId}`);
      try {
        const fallbackResponse = await fetch(`/api/sessions/${entry.sessionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcriptEntry: {
              speaker: entry.speaker,
              text: entry.text,
              timestamp: timestamp,
              isFinal: isFinal,
            },
          }),
        });
        
        if (fallbackResponse.ok) {
          console.log(`✅ FALLBACK API SUCCESS: Entry saved via PATCH API`);
          const fallbackResult = await fallbackResponse.json();
          
          // If the response includes transcript entries, find and return the matching one
          if (fallbackResult.transcriptEntries && Array.isArray(fallbackResult.transcriptEntries)) {
            const matchingEntry = fallbackResult.transcriptEntries.find(
              e => e.speaker === entry.speaker && e.text === entry.text
            );
            
            if (matchingEntry) {
              return matchingEntry;
            }
          }
          
          // Return a synthetic entry if we can't find the real one
          return {
            id: `fallback-${Date.now()}`,
            sessionId: entry.sessionId,
            speaker: entry.speaker,
            text: entry.text,
            timestamp: timestamp,
            isFinal: isFinal,
          };
        }
        
        // Log detailed error for debugging
        let errorDetails = `Status: ${fallbackResponse.status}`;
        try {
          const errorText = await fallbackResponse.text();
          errorDetails += ` - ${errorText}`;
        } catch (textError) {
          // Ignore text extraction errors
        }
        
        console.warn(`❌ FALLBACK API FAILED: ${errorDetails}`);
        throw new Error(`PATCH API failed: ${errorDetails}`);
      } catch (secondAttemptError) {
        console.error('⚠️ SECOND ATTEMPT FAILED:', secondAttemptError);
        
        // ATTEMPT 3: Update legacy transcript field directly
        console.log(`🔄 TRANSCRIPT API ATTEMPT 3: Using legacy transcript field for session ${entry.sessionId}`);
        try {
          // First try to get current transcript to append to it
          let currentTranscript = '';
          
          try {
            const getResponse = await fetch(`/api/sessions/${entry.sessionId}`);
            if (getResponse.ok) {
              const sessionData = await getResponse.json();
              currentTranscript = sessionData.transcript || '';
              console.log('Retrieved current transcript for appending');
            }
          } catch (getError) {
            console.warn('Could not get current transcript, will create new one:', getError);
            // Continue with empty transcript
          }
          
          const speakerPrefix = entry.speaker === 'user' ? 'USER' : 'THERAPIST';
          
          // Append to the existing transcript with proper format
          const updatedTranscript = currentTranscript 
            ? `${currentTranscript}\n${speakerPrefix}: ${entry.text}`
            : `${speakerPrefix}: ${entry.text}`;
            
          // Update just the transcript field
          const updateResponse = await fetch(`/api/sessions/${entry.sessionId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transcript: updatedTranscript
            }),
          });
          
          if (updateResponse.ok) {
            console.log(`✅ LEGACY UPDATE SUCCESS: Updated transcript field`);
            // Return a synthetic result
            return {
              id: `legacy-${Date.now()}`,
              sessionId: entry.sessionId,
              speaker: entry.speaker,
              text: entry.text,
              timestamp: timestamp,
              isFinal: isFinal,
            };
          }
          
          // Log detailed error for debugging
          let errorDetails = `Status: ${updateResponse.status}`;
          try {
            const errorText = await updateResponse.text();
            errorDetails += ` - ${errorText}`;
          } catch (textError) {
            // Ignore text extraction errors
          }
          
          console.warn(`❌ LEGACY UPDATE FAILED: ${errorDetails}`);
          throw new Error(`Legacy transcript update failed: ${errorDetails}`);
        } catch (thirdAttemptError) {
          console.error('⚠️ THIRD ATTEMPT FAILED:', thirdAttemptError);
          
          // ATTEMPT 4: Final direct attempt using a different approach
          console.log(`🔄 TRANSCRIPT API ATTEMPT 4: Last resort direct method for session ${entry.sessionId}`);
          try {
            // Use a simplified POST request with minimal data
            const finalResponse = await fetch(`/api/sessions/${entry.sessionId}/complete`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: `${entry.speaker}: ${entry.text}`,
                timestamp: timestamp
              }),
            });
            
            if (finalResponse.ok) {
              console.log(`✅ LAST RESORT SUCCESS: Saved via complete endpoint`);
              return {
                id: `last-resort-${Date.now()}`,
                sessionId: entry.sessionId,
                speaker: entry.speaker,
                text: entry.text,
                timestamp: timestamp,
                isFinal: isFinal,
              };
            }
            
            throw new Error('All API attempts failed');
          } catch (lastAttemptError) {
            console.error('❌ ALL ATTEMPTS FAILED:', lastAttemptError);
            throw new Error(`All transcript update methods failed: ${lastAttemptError.message}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('💥 TRANSCRIPT ENTRY ERROR:', error);
    
    // Even if all API attempts fail, still create a synthetic entry to maintain UI flow
    // This prevents cascading errors from breaking the user experience
    const syntheticEntry = {
      id: `error-${Date.now()}`,
      sessionId: entry.sessionId,
      speaker: entry.speaker,
      text: entry.text, // Keep original text for UI display
      timestamp: entry.timestamp || new Date().toISOString(),
      isFinal: true
    };
    
    // Try to save error info to session storage for debugging
    try {
      const errorKey = `error-entry-${entry.sessionId}-${Date.now()}`;
      sessionStorage.setItem(errorKey, JSON.stringify({
        error: error.message,
        originalEntry: entry,
        timestamp: new Date().toISOString()
      }));
    } catch (storageError) {
      // Ignore storage errors at this point
    }
    
    return syntheticEntry;
  }
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

    return await response.json()
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
 * Real-time transcript handler for Vapi or other speech recognition services
 * This function can be attached to various speech event handlers to automatically
 * add transcript entries as they occur.
 */
export function createTranscriptHandler(sessionId: string) {
  // Enhanced helper function to save to session storage with multiple backups
  const saveToSessionStorage = (speaker: string, text: string) => {
    try {
      // Skip empty content
      if (!text || text.trim() === '') {
        console.log(`Skipping empty ${speaker} transcript entry for session storage`);
        return;
      }
      
      // 1. Save to main transcript array
      try {
        const storageKey = `transcript-${sessionId}`;
        const existingTranscripts = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
        
        // Create entry object
        const entryObj = {
          speaker,
          text,
          timestamp: new Date().toISOString()
        };
        
        existingTranscripts.push(entryObj);
        
        // Save array back to storage
        sessionStorage.setItem(storageKey, JSON.stringify(existingTranscripts));
        console.log(`Saved ${speaker} transcript to main sessionStorage, total: ${existingTranscripts.length}`);
      } catch (mainStorageError) {
        console.error('Error saving to main session storage:', mainStorageError);
        // Continue to backups even if main storage fails
      }
      
      // 2. Save as individual JSON backup with a unique key
      try {
        const uniqueKey = `msg-${sessionId}-${Date.now()}`;
        sessionStorage.setItem(uniqueKey, JSON.stringify({
          speaker,
          text,
          timestamp: new Date().toISOString()
        }));
        console.log(`Saved JSON backup with key: ${uniqueKey}`);
      } catch (jsonBackupError) {
        console.error('Error saving JSON backup:', jsonBackupError);
      }
      
      // 3. Save raw text as additional backup
      try {
        const rawTextKey = `backup-${speaker}-${sessionId}-${Date.now()}`;
        sessionStorage.setItem(rawTextKey, text);
        console.log(`Saved raw text backup with key: ${rawTextKey}`);
      } catch (rawBackupError) {
        console.error('Error saving raw text backup:', rawBackupError);
      }
      
      // 4. Save to a single continuously updated record as another backup strategy
      try {
        const continuousKey = `continuous-${sessionId}`;
        const existingText = sessionStorage.getItem(continuousKey) || '';
        const speakerPrefix = speaker === 'user' ? 'USER' : 'THERAPIST';
        const newText = existingText 
          ? `${existingText}\n${speakerPrefix}: ${text}`
          : `${speakerPrefix}: ${text}`;
        
        sessionStorage.setItem(continuousKey, newText);
      } catch (continuousError) {
        console.error('Error saving to continuous backup:', continuousError);
      }
    } catch (storageError) {
      console.error('Error in storage operations:', storageError);
    }
  };
  
  return {
    /**
     * Handle assistant/AI message for the transcript
     */
    handleAssistantMessage: async (text: string, isFinal: boolean = true) => {
      if (!text || text.trim() === '') return
      
      // First save to session storage as a backup
      saveToSessionStorage('assistant', text);
      
      try {
        return await addTranscriptEntry({
          sessionId,
          speaker: 'assistant',
          text,
          timestamp: new Date().toISOString(),
          isFinal,
        })
      } catch (error) {
        console.error('Failed to add assistant transcript entry:', error)
      }
    },
    
    /**
     * Handle user message for the transcript
     */
    handleUserMessage: async (text: string, isFinal: boolean = true) => {
      if (!text || text.trim() === '') return
      
      // First save to session storage as a backup
      saveToSessionStorage('user', text);
      
      try {
        return await addTranscriptEntry({
          sessionId,
          speaker: 'user',
          text,
          timestamp: new Date().toISOString(),
          isFinal,
        })
      } catch (error) {
        console.error('Failed to add user transcript entry:', error)
      }
    },
  }
}

/**
 * Utility function to convert structured transcript entries to a single string
 * This is useful for backward compatibility or for services that expect a flat string
 */
export function transcriptEntriesToString(entries: TranscriptEntry[]): string {
  return entries
    .sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    })
    .map((entry) => `${entry.speaker}: ${entry.text}`)
    .join('\n')
}

/**
 * Utility function to extract transcript entries from a flat string transcript
 * This is useful for migrating legacy data
 */
export function parseTranscriptString(sessionId: string, transcript: string): TranscriptEntry[] {
  if (!transcript) return []
  
  const lines = transcript.split('\n').filter((line) => line.trim() !== '')
  const entries: TranscriptEntry[] = []
  
  lines.forEach((line, index) => {
    // Try to extract speaker from line (format: "Speaker: Text")
    const speakerMatch = line.match(/^([^:]+):\s*(.+)$/)
    
    if (speakerMatch) {
      const speaker = speakerMatch[1].trim().toLowerCase()
      const text = speakerMatch[2].trim()
      
      // Skip empty content
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
        timestamp: new Date(Date.now() - (lines.length - index) * 10000).toISOString(), // Fake timestamps spread out
        isFinal: true,
      })
    } else {
      // No speaker prefix, use heuristics to determine speaker
      const probablyUser = /\?\s*$/.test(line) || 
                         /\b(I feel|I think|I am|I'm|I need|I want|I have|I've|I'd|I would|my)\b/i.test(line)
      
      const probablyTherapist = /\b(let me|what I hear|I understand|it sounds like|have you considered|tell me more|how does that make you|you mentioned|would you like to|we could|let's explore)\b/i.test(line)
      
      const speaker = probablyUser && !probablyTherapist ? 'user' : 'assistant'
      
      entries.push({
        id: `legacy-${index}`,
        sessionId,
        speaker,
        text: line.trim(),
        timestamp: new Date(Date.now() - (lines.length - index) * 10000).toISOString(), // Fake timestamps spread out
        isFinal: true,
      })
    }
  })
  
  return entries
}

/**
 * Utility function to migrate a legacy transcript string to structured entries
 */
export async function migrateTranscriptToEntries(sessionId: string, transcript: string): Promise<TranscriptEntry[]> {
  if (!transcript) return []
  
  const entries = parseTranscriptString(sessionId, transcript)
  const createdEntries: TranscriptEntry[] = []
  
  // Create each entry in the database
  for (const entry of entries) {
    try {
      const createdEntry = await addTranscriptEntry(entry)
      createdEntries.push(createdEntry)
    } catch (error) {
      console.error('Error migrating transcript entry:', error)
    }
  }
  
  return createdEntries
}