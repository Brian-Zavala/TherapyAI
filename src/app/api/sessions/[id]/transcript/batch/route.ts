import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-optimized';

/**
 * Batch endpoint for transcript entries - saves multiple entries in a single transaction
 * This reduces database load compared to individual saves
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const debug = process.env.DEBUG_BATCH === 'true';
  if (debug) {
    console.log('🔔 BATCH ENDPOINT: Received request');
  }
  
  try {
    // Start timer for performance monitoring
    const startTime = Date.now();
    
    const authSession = await getAuthSession();
    if (debug) {
      console.log('🔐 BATCH ENDPOINT: Auth status', {
        hasSession: !!authSession,
        hasEmail: !!authSession?.user?.email
      });
    }
    
    if (!authSession?.user?.email) {
      console.error('❌ BATCH ENDPOINT: Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sessionId } = await params;
    const body = await req.json();
    const { entries } = body;
    
    if (debug) {
      console.log('📦 BATCH ENDPOINT: Request data', {
        sessionId,
        hasEntries: !!entries,
        entriesCount: Array.isArray(entries) ? entries.length : 0,
        bodyKeys: Object.keys(body)
      });
    }

    // Validate input
    if (!Array.isArray(entries) || entries.length === 0) {
      console.error('❌ BATCH ENDPOINT: Invalid entries', {
        isArray: Array.isArray(entries),
        length: entries?.length
      });
      return NextResponse.json({ error: 'Invalid entries array' }, { status: 400 });
    }

    // Limit batch size to prevent timeouts
    const MAX_BATCH_SIZE = 100;
    if (entries.length > MAX_BATCH_SIZE) {
      return NextResponse.json({ 
        error: `Batch size too large. Maximum ${MAX_BATCH_SIZE} entries allowed.`,
        maxSize: MAX_BATCH_SIZE,
        receivedSize: entries.length
      }, { status: 400 });
    }

    // Optimize: Use a single query to validate session and user ownership
    const existingSession = await prisma.session.findFirst({
      where: {
        id: sessionId,
        user: {
          email: authSession.user.email
        },
      },
      select: {
        id: true,
        userId: true
      }
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found or unauthorized' }, { status: 404 });
    }

    // Validate each entry
    const validEntries = entries.filter(entry => {
      if (!entry.speaker || !entry.text?.trim()) {
        console.warn('Skipping invalid entry:', entry);
        return false;
      }
      return true;
    });

    if (validEntries.length === 0) {
      return NextResponse.json({ error: 'No valid entries to save' }, { status: 400 });
    }

    if (debug) {
      console.log(`💾 BATCH SAVE: Processing ${validEntries.length} entries for session ${sessionId}`);
    }

    // Use a transaction with increased timeout for large batches
    const savedEntries = await prisma.$transaction(async (tx) => {
      // Prepare data for batch creation
      const transcriptData = validEntries.map(entry => ({
        sessionId,
        speaker: entry.speaker,
        text: entry.text,
        timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
        isFinal: entry.isFinal !== undefined ? entry.isFinal : true,
      }));

      // Use createMany for better performance with large batches
      const result = await tx.transcriptEntry.createMany({
        data: transcriptData,
        // Remove skipDuplicates since TranscriptEntry has no unique constraints
        // and we don't want to silently drop any entries
      });

      // Update session's last activity timestamp
      await tx.session.update({
        where: { id: sessionId },
        data: {
          lastConversationStart: new Date(), // Update the last activity time
        },
      });

      return { count: result.count, transcriptData };
    }, {
      maxWait: 10000, // Maximum time to wait for a transaction slot (10s)
      timeout: 30000, // Maximum time for the transaction to complete (30s)
    });

    const duration = Date.now() - startTime;
    if (debug || duration > 1000) {
      console.log(`✅ BATCH SUCCESS: Saved ${savedEntries.count} entries in transaction (${duration}ms)`);
    }

    return NextResponse.json({
      success: true,
      count: savedEntries.count,
      savedAt: new Date().toISOString(),
      duration: `${Date.now() - startTime}ms`
    });

  } catch (error) {
    console.error('💥 BATCH SAVE ERROR:', error);
    
    // Return a more specific error message
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json({ error: 'Duplicate entry detected' }, { status: 409 });
      }
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json({ error: 'Invalid session reference' }, { status: 400 });
      }
    }
    
    return NextResponse.json({ error: 'Failed to save transcript batch' }, { status: 500 });
  }
}