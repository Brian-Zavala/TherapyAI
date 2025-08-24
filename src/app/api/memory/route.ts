/**
 * API Route for MCP Memory operations
 * Provides a REST interface to the MCP memory system
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  getRelevantMemories, 
  saveConversationToMemory,
  formatMemoriesForPrompt
} from '@/lib/services/mcp-memory-context';

// GET /api/memory - Search for relevant memories
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('query');
    const context = searchParams.get('context');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
    }

    // Get relevant memories
    const memories = await getRelevantMemories(query, context || undefined);
    
    // Format for response
    const formattedMemories = memories.map(mem => ({
      name: mem.entity.name,
      type: mem.entity.entityType,
      relevanceScore: mem.relevanceScore,
      matchedTerms: mem.matchedTerms,
      observations: mem.entity.observations.slice(0, 3) // Limit observations
    }));

    // Also include formatted prompt context
    const promptContext = formatMemoriesForPrompt(memories);

    return NextResponse.json({
      success: true,
      memories: formattedMemories,
      promptContext,
      totalFound: memories.length
    });
  } catch (error) {
    console.error('[Memory API] Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search memories' },
      { status: 500 }
    );
  }
}

// POST /api/memory - Save conversation to memory
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { conversationId, summary, relatedEntities } = body;

    if (!conversationId || !summary || !Array.isArray(summary)) {
      return NextResponse.json(
        { error: 'conversationId and summary array required' },
        { status: 400 }
      );
    }

    // Add user context to conversation
    const enrichedSummary = [
      `User: ${session.user.email || session.user.id}`,
      `Date: ${new Date().toISOString()}`,
      ...summary
    ];

    await saveConversationToMemory(
      conversationId,
      enrichedSummary,
      relatedEntities
    );

    return NextResponse.json({
      success: true,
      message: 'Conversation saved to memory'
    });
  } catch (error) {
    console.error('[Memory API] Save error:', error);
    return NextResponse.json(
      { error: 'Failed to save conversation' },
      { status: 500 }
    );
  }
}