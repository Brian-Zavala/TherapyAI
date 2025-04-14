// route.ts for session transcript API endpoint
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// POST endpoint to add a new transcript entry to a session
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const sessionId = params.id
    
    // First, find the user by email
    const user = await prisma.user.findUnique({
      where: { 
        email: session.user.email as string 
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Verify the session exists and belongs to this user
    const therapySession = await prisma.session.findUnique({
      where: {
        id: sessionId
      }
    })
    
    if (!therapySession || therapySession.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    // Parse the request body
    const { speaker, text, timestamp, isFinal } = await request.json()
    
    // Validate required fields
    if (!speaker || !text) {
      console.error(`VALIDATION ERROR: Missing speaker or text for session ${sessionId}`);
      return NextResponse.json(
        { error: 'Speaker and text are required fields' },
        { status: 400 }
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
          { status: 400 }
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
      
      newEntry = await prisma.transcriptEntry.create({
        data: {
          sessionId,
          speaker: normalizedSpeaker,
          text: cleanText,
          timestamp: timestampObj,
          isFinal: isFinal !== undefined ? Boolean(isFinal) : true
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
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      );
    }
    
    // Update the legacy transcript field in the session for backward compatibility
    // Append the new entry in a format like "Speaker: Text"
    try {
      // Use normalized speaker and cleaned text for consistency
      const speakerPrefix = normalizedSpeaker === 'user' ? 'USER' : 'THERAPIST';
      
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
      { status: 500 }
    )
  }
}

// GET endpoint to fetch all transcript entries for a session
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const sessionId = params.id
    
    // First, find the user by email
    const user = await prisma.user.findUnique({
      where: { 
        email: session.user.email as string 
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Verify the session exists and belongs to this user
    const therapySession = await prisma.session.findUnique({
      where: {
        id: sessionId
      }
    })
    
    if (!therapySession || therapySession.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    console.log(`Looking for transcript entries for session ${sessionId}`);
    
    // Get all transcript entries for this session, including non-final entries
    const entries = await prisma.transcriptEntry.findMany({
      where: {
        sessionId: sessionId
        // Removed isFinal filter to ensure we get all entries
      },
      orderBy: {
        timestamp: 'asc'
      }
    });
    
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
        if (!entriesAdded) {
          console.log('No transcript data found, adding system notification entry');
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
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const sessionId = params.id
    
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Verify the session exists and belongs to this user
    const therapySession = await prisma.session.findUnique({
      where: {
        id: sessionId
      }
    })
    
    if (!therapySession || therapySession.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
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