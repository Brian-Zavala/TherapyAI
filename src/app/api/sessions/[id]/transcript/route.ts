// route.ts for session transcript API endpoint
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import type { Session as NextAuthSession } from 'next-auth'

// POST endpoint to add a new transcript entry to a session
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions) as NextAuthSession | null
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 } as { status: number })
  }
  
  try {
    const { id: sessionId } = await params
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 } as { status: number })
    }
    
    // First, find the user by email
    const user = await prisma.user.findUnique({
      where: { 
        email: session.user.email as string 
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 } as { status: number })
    }
    
    // Verify the session exists and belongs to this user
    const therapySession = await prisma.session.findUnique({
      where: {
        id: sessionId
      }
    })
    
    if (!therapySession || therapySession.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 } as { status: number })
    }
    
    // Parse the request body
    const { speaker, text, timestamp, isFinal, assistantId } = await request.json()
    
    // Validate required fields
    if (!speaker || !text) {
      console.error(`VALIDATION ERROR: Missing speaker or text for session ${sessionId}`);
      return NextResponse.json(
        { error: 'Speaker and text are required fields' },
        { status: 400 } as { status: number }
      )
    }
    
    // Enhanced logging with distinctive formatting for traceability
    console.log(`
    *****************************************************************
    ✓ TRANSCRIPT API: Creating entry for session ${sessionId}
    *****************************************************************
    Speaker: ${speaker}
    Text length: ${text.length}
    Preview: ${text.substring(0, 50)}...
    Timestamp: ${timestamp}
    isFinal: ${isFinal}
    *****************************************************************
    `);
    
    // Create a new transcript entry
    // Try-catch to ensure proper error handling
    let newEntry;
    try {
      // Clean up the text to avoid any potential issues
      const cleanText = text.trim();
      
      // Extra validation to ensure we have valid data
      if (!cleanText || cleanText.length === 0) {
        console.error(`VALIDATION ERROR: Empty text for session ${sessionId}`);
        return NextResponse.json(
          { error: 'Text cannot be empty' },
          { status: 400 } as { status: number }
        );
      }
      
      // Create timestamp object from string or use current time
      let timestampObj = timestamp ? new Date(timestamp) : new Date();
      // Validate timestamp is a valid date
      if (isNaN(timestampObj.getTime())) {
        console.error(`VALIDATION ERROR: Invalid timestamp for session ${sessionId}`);
        timestampObj = new Date(); // Fall back to current time
      }
      
      // Standardize speaker to lowercase for consistency
      const normalizedSpeaker = speaker.toLowerCase();
      
      // Try to get the assistantId from the session if not provided
      let entryAssistantId = assistantId;
      if (!entryAssistantId) {
        try {
          // Get the assistantId from the session if available
          entryAssistantId = therapySession.assistantId || null;
        } catch (err) {
          console.log('Could not retrieve assistantId from session');
        }
      }

      newEntry = await prisma.transcriptEntry.create({
        data: {
          sessionId,
          speaker: normalizedSpeaker,
          text: cleanText,
          timestamp: timestampObj,
          isFinal: isFinal !== undefined ? Boolean(isFinal) : true,
          assistantId: entryAssistantId
        }
      });
      
      console.log(`TRANSCRIPT API SUCCESS: Created entry with ID: ${newEntry.id}`);
      console.log(`ENTRY DETAILS: ${speaker} - ${text.substring(0, 50)}...`);
      
      // Verify the entry was created by fetching it back
      const verifyEntry = await prisma.transcriptEntry.findUnique({
        where: { id: newEntry.id }
      });
      
      if (verifyEntry) {
        console.log(`VERIFIED: Entry ${newEntry.id} exists in database`);
      } else {
        console.error(`VERIFICATION FAILED: Entry ${newEntry.id} not found after creation`);
      }
    } catch (dbError) {
      console.error(`DATABASE ERROR creating transcript entry:`, dbError);
      return NextResponse.json(
        { error: `Database error: ${(dbError as Error).message}` },
        { status: 500 } as { status: number }
      );
    }
    
    // Update the legacy transcript field in the session for backward compatibility
    // Append the new entry in a format like "Speaker: Text"
    try {
      // Make sure we have the normalized speaker for consistency
      // (This was defined earlier but the variable scope is causing issues)
      const normalizedSpeaker = speaker.toLowerCase();
      const speakerPrefix = normalizedSpeaker === 'user' ? 'USER' : 'THERAPIST';
      const cleanText = text.trim();
      
      if (therapySession.transcript) {
        await prisma.session.update({
          where: { id: sessionId },
          data: {
            transcript: `${therapySession.transcript}\n${speakerPrefix}: ${cleanText}`
          }
        });
      } else {
        await prisma.session.update({
          where: { id: sessionId },
          data: {
            transcript: `${speakerPrefix}: ${cleanText}`
          }
        });
      }
      
      console.log(`Successfully updated legacy transcript field for session ${sessionId}`);
    } catch (transcriptUpdateError) {
      console.error(`Error updating legacy transcript:`, transcriptUpdateError);
      // Continue anyway since we have the structured entry
    }
    
    // Return the created entry
    return NextResponse.json(newEntry)
  } catch (error) {
    console.error('Error adding transcript entry:', error)
    return NextResponse.json(
      { error: 'Failed to add transcript entry' },
      { status: 500 } as { status: number }
    )
  }
}

// GET endpoint to fetch all transcript entries for a session
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions) as NextAuthSession | null
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 } as { status: number })
  }
  
  try {
    const { id: sessionId } = await params
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 } as { status: number })
    }
    
    // First, find the user by email
    const user = await prisma.user.findUnique({
      where: { 
        email: session.user.email as string 
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 } as { status: number })
    }
    
    // Verify the session exists and belongs to this user
    const therapySession = await prisma.session.findUnique({
      where: {
        id: sessionId
      },
      include: {
        // Include transcript entries to check if we need to inject history
        transcriptEntries: {
          take: 10, // Just enough to check the first few entries
          orderBy: { timestamp: 'asc' as const }
        }
      }
    } as any)
    
    if (!therapySession || therapySession.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 } as { status: number })
    }
    
    console.log(`Looking for transcript entries for session ${sessionId}`);
    
    // Before getting entries, check if we need to inject session history first
    // Only do this if we don't already have history injected
    // We've changed the format to use assistant messages with therapist notes, so check for that
    const hasHistoryInjected = therapySession.transcriptEntries?.some(entry => 
      (entry.speaker === 'system' && entry.text.includes('Previous Session History')) ||
      (entry.speaker === 'assistant' && entry.text.includes("I've reviewed my notes from our previous sessions"))
    );
    
    if (!hasHistoryInjected) {
      console.log('No history injected yet, checking for previous sessions...');
      
      // Find previous completed sessions for this user
      const previousSessions = await prisma.session.findMany({
        where: {
          userId: user.id,
          status: 'completed',
          id: { not: sessionId } // Exclude current session
        },
        include: {
          transcriptEntries: {
            orderBy: { timestamp: 'asc' as const },
            // Only include user and assistant entries, not system
            where: { speaker: { in: ['user', 'assistant'] as const } }
          }
        },
        orderBy: { date: 'desc' as const },
        take: 3 // Get most recent 3 sessions
      } as any);
      
      if (previousSessions.length > 0) {
        console.log(`Found ${previousSessions.length} previous sessions to include as context`);
        
        // Format the session history in a more natural way, as therapist's notes
        let historyText = "I've reviewed my notes from our previous sessions before today. Here's what I recall:\n\n";
        
        for (const prevSession of previousSessions) {
          // Format date
          const sessionDate = new Date(prevSession.date).toLocaleDateString();
          historyText += `From our session on ${sessionDate} (${prevSession.theme || 'Therapy Session'}):\n`;
          
          // Include transcript entries
          const entries = prevSession.transcriptEntries || [];
          
          // First, create a summary section
          // Get separate user and therapist messages
          const userMessages = entries.filter(entry => entry.speaker === 'user')
            .map(entry => entry.text.substring(0, 300));
          
          const therapistMessages = entries.filter(entry => entry.speaker === 'assistant')
            .map(entry => entry.text.substring(0, 300));
          
          // Create a summary of key topics
          if (userMessages.length > 0) {
            // Select a sample of client statements
            const sampleUserMessages = userMessages.length > 3 
              ? [userMessages[0], userMessages[Math.floor(userMessages.length/2)], userMessages[userMessages.length-1]]
              : userMessages;
              
            historyText += "Key client concerns discussed:\n";
            for (const msg of sampleUserMessages.slice(0, 3)) {
              if (msg && msg.length > 20) {
                historyText += `- ${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}\n`;
              }
            }
          } else if (prevSession.transcript) {
            // Fall back to legacy transcript - extract client concerns
            const transcriptLines = prevSession.transcript.split('\n');
            const userLines = transcriptLines.filter(line => 
              line.startsWith('USER:') || line.startsWith('CLIENT:')
            ).map(line => line.replace(/^(USER|CLIENT):\s*/, ''));
            
            if (userLines.length > 0) {
              historyText += "Key client concerns from our discussion:\n";
              for (const line of userLines.slice(0, 3)) {
                historyText += `- ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}\n`;
              }
            }
          }
          
          // Add therapist guidance summary
          if (therapistMessages.length > 0) {
            // Select key therapeutic interventions
            const sample = therapistMessages.length > 2 
              ? [therapistMessages[Math.floor(therapistMessages.length/2)], therapistMessages[therapistMessages.length-1]]
              : therapistMessages;
              
            historyText += "\nGuidance I provided:\n";
            for (const msg of sample.slice(0, 2)) {
              if (msg && msg.length > 30) {
                historyText += `- ${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}\n`;
              }
            }
          }
          
          // Now add the full conversation transcript
          historyText += "\nFull conversation transcript:\n";
          
          // Sort entries by timestamp
          const sortedEntries = [...entries].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          
          if (sortedEntries.length > 0) {
            for (const entry of sortedEntries) {
              const speakerName = entry.speaker === 'user' ? 'Client' : 'Therapist';
              historyText += `${speakerName}: ${entry.text}\n`;
            }
          } else if (prevSession.transcript) {
            // Fall back to legacy transcript format
            historyText += prevSession.transcript;
          } else {
            historyText += "No detailed transcript available for this session.\n";
          }
          
          historyText += "\n-----\n\n";
        }
        
        console.log('Created session history, injecting into transcript');
        
        // Add history directly as assistantNote in a more natural way
        // This avoids synthetic system messages that may be ignored
        await prisma.transcriptEntry.create({
          data: {
            sessionId,
            speaker: 'assistant',
            text: historyText,
            timestamp: new Date(Date.now() - 1000000), // Make it appear at the beginning
            isFinal: true
          }
        });
        
        console.log('Successfully injected session history as therapist notes');
        
        // Create timestamp just after the notes but before the session really starts
        const earlyTimestamp = new Date(Date.now() - 900000);
        
        console.log('Added user question and assistant response about previous sessions');
      } else {
        console.log('No previous sessions found, no history to inject');
      }
    } else {
      console.log('History already injected, not adding duplicate history');
    }
    
    // Now get all transcript entries for this session, including non-final entries
    const entries = await prisma.transcriptEntry.findMany({
      where: {
        sessionId: sessionId
        // Removed isFinal filter to ensure we get all entries
      },
      orderBy: {
        timestamp: 'asc' as const
      }
    } as any);
    
    console.log(`Found ${entries.length} transcript entries in database for session ${sessionId}`);
    
    // Log the first few entries for debugging
    if (entries.length > 0) {
      console.log(`First 2 entries:`);
      entries.slice(0, 2).forEach((entry, i) => {
        console.log(`  ${i+1}. ${entry.speaker}: ${entry.text.substring(0, 30)}... (${entry.timestamp})`);
      });
    }
    
    // Advanced deduplication with enhanced phrase matching and semantic similarity
    let dedupedEntries = [];
    const processedTexts = new Map();
    
    // Sort entries by timestamp to ensure proper order
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Simplify text for comparison (lowercase, remove extra spaces, etc.)
    const normalizeText = (text) => {
      if (!text) return '';
      return text.toLowerCase().trim().replace(/\s+/g, ' ');
    };
    
    // Check if text is semantically similar to another text
    const isSignificantlyDifferent = (text1, text2) => {
      // Normalized versions for comparison
      const norm1 = normalizeText(text1);
      const norm2 = normalizeText(text2);
      
      // Check if one string contains most of the other
      const containsSignificantPart = (a, b) => {
        // If a is a very short fragment, it's probably just the beginning of b
        if (a.split(' ').length <= 3 && b.includes(a)) {
          return true;
        }
        
        // If a contains more than 80% of b's words, consider them similar
        const aWords = new Set(a.split(' '));
        const bWords = b.split(' ');
        const commonWords = bWords.filter(word => aWords.has(word));
        
        return commonWords.length >= bWords.length * 0.8;
      };
      
      // Check both directions of containment
      return !containsSignificantPart(norm1, norm2) && !containsSignificantPart(norm2, norm1);
    };
    
    // Process entries in chronological order
    sortedEntries.forEach(entry => {
      const speaker = entry.speaker.toLowerCase();
      const text = entry.text.trim();
      
      // Skip empty entries
      if (!text) return;
      
      // Get previous entries from this speaker
      const speakerEntries = processedTexts.get(speaker) || [];
      
      // Check if this text is redundant with any existing entry
      let isRedundant = false;
      let replacedEntries = [];
      
      // Check the last 10 entries from this speaker (or all if fewer)
      // Process in reverse to prioritize the most recent entries
      for (let i = speakerEntries.length - 1; i >= Math.max(0, speakerEntries.length - 10); i--) {
        const prevEntry = speakerEntries[i];
        const prevText = prevEntry.text;
        
        // CASE 1: Current text is completely contained in a previous entry - skip it
        if (normalizeText(prevText).includes(normalizeText(text))) {
          // This text is fully contained in a previous message
          isRedundant = true;
          break;
        }
        
        // CASE 2: Previous text is completely contained in current text - replace it
        if (normalizeText(text).includes(normalizeText(prevText))) {
          // Current text contains the previous one - mark for replacement
          replacedEntries.push({
            index: i,
            id: prevEntry.id
          });
          continue;
        }
        
        // CASE 3: Check for significant phrase overlap
        // If a message starts with the same first few words (like greetings)
        // or if one message is a small fragment of the beginning of the other
        const normText = normalizeText(text);
        const normPrevText = normalizeText(prevText);
        
        // Check if one is the beginning of the other
        const isBeginningFragment = (
          (normText.length < normPrevText.length * 0.5 && normPrevText.startsWith(normText)) ||
          (normPrevText.length < normText.length * 0.5 && normText.startsWith(normPrevText))
        );
        
        if (isBeginningFragment) {
          // If current text is shorter, it's redundant with a more complete message
          if (text.length < prevText.length) {
            isRedundant = true;
            break;
          } else {
            // Current text is more complete, replace the shorter one
            replacedEntries.push({
              index: i,
              id: prevEntry.id
            });
            continue;
          }
        }
        
        // CASE 4: Check for semantically similar content
        // Skip if entries are too different to be considered duplicates
        if (!isSignificantlyDifferent(text, prevText)) {
          // Keep the longer, more complete message
          if (text.length >= prevText.length) {
            // Current is more complete, replace the shorter one
            replacedEntries.push({
              index: i,
              id: prevEntry.id
            });
          } else {
            // Previous is more complete, skip the current one
            isRedundant = true;
            break;
          }
        }
      }
      
      // Skip adding this entry if it's redundant
      if (isRedundant) return;
      
      // Remove all entries marked for replacement
      if (replacedEntries.length > 0) {
        // Sort indices in descending order to avoid index shifting issues
        replacedEntries.sort((a, b) => b.index - a.index);
        
        for (const replaced of replacedEntries) {
          // Remove from the speaker's history
          speakerEntries.splice(replaced.index, 1);
          
          // Also remove from output array
          const indexInDeduped = dedupedEntries.findIndex(e => e.id === replaced.id);
          if (indexInDeduped >= 0) {
            dedupedEntries.splice(indexInDeduped, 1);
          }
        }
      }
      
      // Add this entry as a new entry
      speakerEntries.push({
        id: entry.id,
        text: text
      });
      
      // Update the speaker map
      processedTexts.set(speaker, speakerEntries);
      
      // Add to deduped entries list
      dedupedEntries.push(entry);
    });
    
    // Final quality check - remove very short greetings if longer ones exist
    // Instead of reassigning dedupedEntries, we'll clear it and push new entries
    
    // Create a temporary map for grouping
    const byIndex = new Map();
    
    // Group by speaker and index in conversation flow
    dedupedEntries.forEach((entry, idx) => {
      const speaker = entry.speaker.toLowerCase();
      const key = `${speaker}-${Math.floor(idx / 2)}`; // Group by rough position in conversation
      
      if (!byIndex.has(key)) {
        byIndex.set(key, []);
      }
      byIndex.get(key).push(entry);
    });
    
    // Clear the existing entries and refill with grouped results
    dedupedEntries.length = 0;
    
    // For each group, keep only the most informative message
    byIndex.forEach(group => {
      if (group.length === 1) {
        dedupedEntries.push(group[0]);
        return;
      }
      
      // Sort by length (longer is usually more complete)
      group.sort((a, b) => b.text.length - a.text.length);
      
      // Keep the longest message
      dedupedEntries.push(group[0]);
    });
    
    // Sort final entries by timestamp again to ensure order
    dedupedEntries.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    console.log(`GET /api/sessions/${sessionId}/transcript - Found ${entries.length} entries, deduped to ${dedupedEntries.length}`);
    
    // If we have no transcript entries, check if there's a legacy transcript in the session
    if (dedupedEntries.length === 0) {
      console.log('No transcript entries found, checking for legacy transcript and session storage');
      
      try {
        // First, get complete session data with transcript field
        const sessionWithTranscript = await prisma.session.findUnique({
          where: { id: sessionId }
        });
        
        let entriesAdded = false;
        
        // Check if session has a transcript field with actual content
        if (sessionWithTranscript?.transcript && 
            typeof sessionWithTranscript.transcript === 'string' && 
            sessionWithTranscript.transcript.trim() !== '') {
          console.log('Found legacy transcript, parsing it into entries');
          
          // Parse the legacy transcript into entries
          const lines = sessionWithTranscript.transcript.split('\n').filter(line => line.trim());
          
          console.log(`Processing ${lines.length} lines from legacy transcript`);
          
          lines.forEach((line, index) => {
            console.log(`Line ${index}: ${line}`);
            const speakerMatch = line.match(/^([^:]+):\s*(.+)$/);
            if (speakerMatch) {
              const speaker = speakerMatch[1].trim().toLowerCase();
              const text = speakerMatch[2].trim();
              
              const normalizedSpeaker = 
                (speaker === 'user' || speaker === 'you' || speaker === 'client' || 
                 speaker === 'human' || speaker === 'customer' || speaker === 'person') 
                ? 'user' : 'assistant';
              
              console.log(`  Speaker: ${speaker} → ${normalizedSpeaker}`);
              console.log(`  Text: ${text.substring(0, 30)}...`);
              
              if (text) {
                // Create entry with consistent naming
                const entry = {
                  id: `legacy-${index}`,
                  sessionId: sessionId,
                  speaker: normalizedSpeaker,
                  text,
                  timestamp: new Date(Date.now() - (lines.length - index) * 10000), // Fake timestamps
                  isFinal: true
                };
                
                // Also migrate to database for future calls
                try {
                  prisma.transcriptEntry.create({
                    data: {
                      sessionId: sessionId,
                      speaker: normalizedSpeaker,
                      text: text,
                      timestamp: entry.timestamp,
                      isFinal: true
                    }
                  }).then(() => {
                    console.log(`  Migrated entry to database: ${normalizedSpeaker}: ${text.substring(0, 20)}...`);
                  }).catch(err => {
                    console.error(`  Failed to migrate: ${err.message}`);
                  });
                } catch (migrationError) {
                  console.error(`Error migrating transcript entry: ${migrationError.message}`);
                }
                
                dedupedEntries.push(entry);
                entriesAdded = true;
              }
            }
          });
          
          console.log(`Parsed ${dedupedEntries.length} entries from legacy transcript`);
        }
        
        // If we still don't have entries, add a "Full session transcript" entry with the legacy transcript
        // This allows the client to extract data using its own parsing logic
        if (!entriesAdded && sessionWithTranscript?.transcript) {
          console.log('Adding full session transcript entry for client-side parsing');
          dedupedEntries.push({
            id: 'full-transcript',
            sessionId: sessionId,
            speaker: 'system',
            text: `Full session transcript: ${sessionWithTranscript.transcript}`,
            timestamp: new Date(),
            isFinal: true
          });
          entriesAdded = true;
        }
        
        // If we still don't have any entries, add a placeholder
        // First check if there are any existing entries in the database for this session
        const existingEntries = await prisma.transcriptEntry.count({
          where: { sessionId: sessionId }
        });
        
        // Only add a placeholder if there are truly no entries at all
        if (!entriesAdded && existingEntries === 0) {
          console.log('No transcript data found and no entries in database, adding system notification entry');
          // Create and persist a proper entry
          try {
            // Create in database first
            const placeholderEntry = await prisma.transcriptEntry.create({
              data: {
                sessionId: sessionId,
                speaker: 'system',
                text: 'This session does not have any recorded conversation yet.',
                timestamp: new Date(),
                isFinal: true
              }
            });
            
            console.log('Created permanent placeholder entry in database with ID:', placeholderEntry.id);
            
            // Add to response
            dedupedEntries.push(placeholderEntry);
          } catch (placeholderError) {
            console.error('Error creating placeholder entry:', placeholderError);
            
            // Fallback to temporary entry
            dedupedEntries.push({
              id: 'system-notification',
              sessionId: sessionId,
              speaker: 'system',
              text: 'This session does not have any recorded conversation yet.',
              timestamp: new Date(),
              isFinal: true
            });
          }
        }
      } catch (error) {
        console.error('Error checking for legacy transcript:', error);
        
        // First check if there are any existing entries in the database for this session
        try {
          const existingEntries = await prisma.transcriptEntry.count({
            where: { sessionId: sessionId }
          });
          
          // Only add a placeholder if there are truly no entries at all
          if (existingEntries === 0) {
            // Add informative system entry as fallback
            dedupedEntries.push({
              id: 'system-error',
              sessionId: sessionId,
              speaker: 'system',
              text: 'This session does not have any recorded conversation yet.',
              timestamp: new Date(),
              isFinal: true
            });
          }
        } catch (countError) {
          console.error('Error checking for existing entries:', countError);
          // If we can't check, default to showing nothing rather than a potentially incorrect message
        }
      }
    }
    
    console.log(`API returning ${dedupedEntries.length} entries`);
    
    return NextResponse.json(dedupedEntries)
  } catch (error) {
    console.error('Error fetching transcript entries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transcript entries' },
      { status: 500 }
    )
  }
}

// DELETE endpoint to remove a transcript entry
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions) as NextAuthSession | null
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 } as { status: number })
  }
  
  try {
    const { id: sessionId } = await params
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 } as { status: number })
    }
    
    // Get the entry ID to delete from the query parameters
    const { searchParams } = new URL(request.url)
    const entryId = searchParams.get('entryId')
    
    if (!entryId) {
      return NextResponse.json(
        { error: 'Entry ID is required as a query parameter' },
        { status: 400 }
      )
    }
    
    // First, find the user by email
    const user = await prisma.user.findUnique({
      where: { 
        email: session.user.email as string 
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 } as { status: number })
    }
    
    // Verify the session exists and belongs to this user
    const therapySession = await prisma.session.findUnique({
      where: {
        id: sessionId
      }
    })
    
    if (!therapySession || therapySession.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 } as { status: number })
    }
    
    // Verify the entry exists and belongs to this session
    const entry = await prisma.transcriptEntry.findUnique({
      where: { id: entryId }
    })
    
    if (!entry || entry.sessionId !== sessionId) {
      return NextResponse.json({ error: 'Transcript entry not found' }, { status: 404 })
    }
    
    // Delete the entry
    await prisma.transcriptEntry.delete({
      where: { id: entryId }
    })
    
    // Recalculate the legacy transcript field (optional, may be complex)
    // This requires fetching all entries and rebuilding the transcript string
    const allEntries = await prisma.transcriptEntry.findMany({
      where: { sessionId: sessionId },
      orderBy: { timestamp: 'asc' }
    })
    
    const newTranscript = allEntries
      .map(entry => `${entry.speaker}: ${entry.text}`)
      .join('\n')
    
    await prisma.session.update({
      where: { id: sessionId },
      data: { transcript: newTranscript || null }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transcript entry:', error)
    return NextResponse.json(
      { error: 'Failed to delete transcript entry' },
      { status: 500 }
    )
  }
}