// route.ts for session transcript API endpoint
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import type { Session as NextAuthSession } from 'next-auth'
import { sessionCache, cacheKeys } from '@/lib/session-cache'

// POST endpoint to add a new transcript entry to a session
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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
      
      // Invalidate transcript cache for this session
      sessionCache.invalidate(cacheKeys.sessionTranscript(sessionId));
      // Also invalidate all paginated cache entries
      for (let i = 0; i < 10; i++) {
        sessionCache.invalidate(`${cacheKeys.sessionTranscript(sessionId)}:${i * 100}:100`);
      }
      
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
  { params }: { params: Promise<{ id: string }> }
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
    
    // Get pagination parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    
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
    
    console.log(`Looking for transcript entries for session ${sessionId}`);
    
    // Check cache first
    const cacheKey = `${cacheKeys.sessionTranscript(sessionId)}:${offset}:${limit}`;
    const cachedData = sessionCache.get<{entries: unknown[], pagination: {offset: number, limit: number, total: number}}>(cacheKey);
    
    if (cachedData) {
      console.log(`Returning cached transcript for session ${sessionId}`);
      return NextResponse.json(cachedData);
    }
    
    // Skip complex history injection to improve performance
    // This can be handled separately if needed
    
    // Get transcript entries with pagination
    const [entries, totalCount] = await Promise.all([
      prisma.transcriptEntry.findMany({
        where: {
          sessionId: sessionId
        },
        orderBy: {
          timestamp: 'asc' as const
        },
        take: limit,
        skip: offset
      }),
      prisma.transcriptEntry.count({
        where: {
          sessionId: sessionId
        }
      })
    ]);
    
    console.log(`Found ${entries.length} transcript entries (${totalCount} total) for session ${sessionId}`);
    
    // Simple deduplication - just remove exact duplicates
    const seenTexts = new Set();
    const dedupedEntries = entries.filter(entry => {
      const key = `${entry.speaker}:${entry.text}`;
      if (seenTexts.has(key)) {
        return false;
      }
      seenTexts.add(key);
      return true;
    });
    
    // If we have no transcript entries and there's a legacy transcript in the session
    if (dedupedEntries.length === 0 && therapySession?.transcript) {
      console.log('No transcript entries found, returning legacy transcript');
      dedupedEntries.push({
        id: 'legacy-transcript',
        sessionId: sessionId,
        speaker: 'system',
        text: `Legacy transcript: ${therapySession.transcript}`,
        timestamp: new Date(),
        isFinal: true
      });
    }
    
    console.log(`API returning ${dedupedEntries.length} entries`);
    
    const responseData = {
      entries: dedupedEntries,
      pagination: {
        offset,
        limit,
        total: totalCount
      }
    };
    
    // Cache the response
    sessionCache.set(cacheKey, responseData, 2 * 60 * 1000); // Cache for 2 minutes
    
    return NextResponse.json(responseData)
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
  { params }: { params: Promise<{ id: string }> }
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