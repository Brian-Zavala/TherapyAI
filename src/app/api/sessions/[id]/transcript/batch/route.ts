import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma-optimized';

/**
 * Batch endpoint for transcript entries - saves multiple entries in a single transaction
 * This reduces database load compared to individual saves
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🔔 BATCH ENDPOINT: Received request');
  
  try {
    const authSession = await getServerSession(authOptions);
    console.log('🔐 BATCH ENDPOINT: Auth status', {
      hasSession: !!authSession,
      hasEmail: !!authSession?.user?.email
    });
    
    if (!authSession?.user?.email) {
      console.error('❌ BATCH ENDPOINT: Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sessionId } = await params;
    const body = await req.json();
    const { entries } = body;
    
    console.log('📦 BATCH ENDPOINT: Request data', {
      sessionId,
      hasEntries: !!entries,
      entriesCount: Array.isArray(entries) ? entries.length : 0,
      bodyKeys: Object.keys(body)
    });

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

    // First, find the user by email
    const user = await prisma.user.findUnique({
      where: { 
        email: authSession.user.email
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate session exists and belongs to user
    const existingSession = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
      },
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
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

    console.log(`💾 BATCH SAVE: Processing ${validEntries.length} entries for session ${sessionId}`);

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
      await tx.transcriptEntry.createMany({
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

      // Fetch the created entries for the response
      const transcriptEntries = await tx.transcriptEntry.findMany({
        where: {
          sessionId,
          timestamp: {
            gte: transcriptData[0].timestamp,
          }
        },
        orderBy: { timestamp: 'desc' },
        take: transcriptData.length,
      });

      return transcriptEntries;
    }, {
      maxWait: 10000, // Maximum time to wait for a transaction slot (10s)
      timeout: 30000, // Maximum time for the transaction to complete (30s)
    });

    console.log(`✅ BATCH SUCCESS: Saved ${savedEntries.length} entries in transaction`);

    return NextResponse.json({
      success: true,
      count: savedEntries.length,
      entries: savedEntries.map(entry => ({
        id: entry.id,
        sessionId: entry.sessionId,
        speaker: entry.speaker,
        text: entry.text,
        timestamp: entry.timestamp.toISOString(),
        isFinal: entry.isFinal,
      }))
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