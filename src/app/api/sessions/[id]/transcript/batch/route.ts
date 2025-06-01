import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Batch endpoint for transcript entries - saves multiple entries in a single transaction
 * This reduces database load compared to individual saves
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sessionId } = await params;
    const { entries } = await req.json();

    // Validate input
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'Invalid entries array' }, { status: 400 });
    }

    // Validate session exists and belongs to user
    const existingSession = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
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

    // Use a transaction to save all entries atomically
    const savedEntries = await prisma.$transaction(async (tx) => {
      // Create all transcript entries in a single transaction
      const transcriptEntries = await Promise.all(
        validEntries.map(entry => 
          tx.transcriptEntry.create({
            data: {
              sessionId,
              speaker: entry.speaker,
              text: entry.text,
              timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
              isFinal: entry.isFinal !== undefined ? entry.isFinal : true,
            },
          })
        )
      );

      // Update session metadata in the same transaction
      await tx.session.update({
        where: { id: sessionId },
        data: {
          // Update existing field instead of non-existent updatedAt
          status: existingSession.status, // Keep existing status
        },
      });

      return transcriptEntries;
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