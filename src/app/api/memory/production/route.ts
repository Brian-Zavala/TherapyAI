/**
 * Production API Route for MCP Memory operations
 * This uses the actual MCP server instead of mock data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { mcpMemoryOps } from '@/lib/mcp-memory-server';
import { 
  extractKeywords, 
  calculateRelevance,
  formatMemoriesForPrompt,
  MEMORY_CONFIG
} from '@/lib/mcp-memory-context';

// GET /api/memory/production - Search real MCP memory
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
    }

    // Extract keywords
    const keywords = extractKeywords(query);
    
    // Search MCP memory
    const searchResult = await mcpMemoryOps.searchNodes(keywords.join(' '));
    
    // If not enough results, get all entities
    let entities = searchResult.entities || [];
    if (entities.length < 3) {
      const graph = await mcpMemoryOps.readGraph();
      entities = [...entities, ...(graph.entities || [])];
    }
    
    // Calculate relevance and sort
    const scoredMemories = entities
      .map(entity => {
        const { score, matchedTerms } = calculateRelevance(keywords, entity);
        return { entity, relevanceScore: score, matchedTerms };
      })
      .filter(memory => memory.relevanceScore >= MEMORY_CONFIG.minRelevanceScore)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, MEMORY_CONFIG.maxMemories);
    
    // Format response
    const formattedMemories = scoredMemories.map(mem => ({
      name: mem.entity.name,
      type: mem.entity.entityType,
      relevanceScore: mem.relevanceScore,
      matchedTerms: mem.matchedTerms,
      observations: mem.entity.observations.slice(0, 3)
    }));

    const promptContext = formatMemoriesForPrompt(scoredMemories);

    return NextResponse.json({
      success: true,
      memories: formattedMemories,
      promptContext,
      totalFound: scoredMemories.length,
      isProduction: true
    });
  } catch (error) {
    console.error('[Memory API Production] Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search memories' },
      { status: 500 }
    );
  }
}

// POST /api/memory/production - Save to real MCP memory
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

    const entityName = `Conversation_${new Date().toISOString().split('T')[0]}_${conversationId}`;
    
    // Add user context
    const enrichedSummary = [
      `User: ${session.user.email || session.user.id}`,
      `Date: ${new Date().toISOString()}`,
      ...summary
    ];

    // Create entity in MCP memory
    await mcpMemoryOps.createEntities([{
      name: entityName,
      entityType: 'Conversation',
      observations: enrichedSummary
    }]);

    // Create relations if provided
    if (relatedEntities && relatedEntities.length > 0) {
      await mcpMemoryOps.createRelations(
        relatedEntities.map(entity => ({
          from: entityName,
          to: entity,
          relationType: 'related_to'
        }))
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation saved to MCP memory',
      entityName,
      isProduction: true
    });
  } catch (error) {
    console.error('[Memory API Production] Save error:', error);
    return NextResponse.json(
      { error: 'Failed to save conversation' },
      { status: 500 }
    );
  }
}

// PATCH /api/memory/production - Add observations to existing entity
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { entityName, observations } = body;

    if (!entityName || !observations || !Array.isArray(observations)) {
      return NextResponse.json(
        { error: 'entityName and observations array required' },
        { status: 400 }
      );
    }

    await mcpMemoryOps.addObservations([{
      entityName,
      contents: observations
    }]);

    return NextResponse.json({
      success: true,
      message: 'Observations added successfully',
      isProduction: true
    });
  } catch (error) {
    console.error('[Memory API Production] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to add observations' },
      { status: 500 }
    );
  }
}