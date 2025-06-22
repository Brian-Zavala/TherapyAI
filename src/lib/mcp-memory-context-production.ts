/**
 * Production implementation of MCP Memory Context
 * This replaces the mock implementation with real MCP server calls
 */

import { cache } from 'react';
import { mcpMemoryOps } from './mcp-memory-server';

// Re-export types and utilities from the base module
export * from './mcp-memory-context';

// Override the search and get functions to use real MCP
export async function searchMemoryProduction(keywords: string[]): Promise<any> {
  try {
    const searchQuery = keywords.join(' ');
    const result = await mcpMemoryOps.searchNodes(searchQuery);
    return result;
  } catch (error) {
    console.error('[Memory Context Production] Search error:', error);
    return { entities: [], relations: [] };
  }
}

export async function getAllEntitiesProduction(): Promise<any[]> {
  try {
    const graph = await mcpMemoryOps.readGraph();
    const entities = graph?.entities;
    return Array.isArray(entities) ? entities : [];
  } catch (error) {
    console.error('[Memory Context Production] Read error:', error);
    return [];
  }
}

export async function saveConversationProduction(
  conversationId: string,
  summary: string[],
  relatedEntities?: string[]
): Promise<void> {
  try {
    const entityName = `Conversation_${new Date().toISOString().split('T')[0]}_${conversationId}`;
    
    // Create conversation entity
    await mcpMemoryOps.createEntities([{
      name: entityName,
      entityType: 'Conversation',
      observations: summary
    }]);
    
    // Create relations to other entities
    if (relatedEntities && relatedEntities.length > 0) {
      await mcpMemoryOps.createRelations(
        relatedEntities.map(entity => ({
          from: entityName,
          to: entity,
          relationType: 'related_to'
        }))
      );
    }
    
    console.log('[Memory Context Production] Saved conversation:', entityName);
  } catch (error) {
    console.error('[Memory Context Production] Save error:', error);
    throw error;
  }
}