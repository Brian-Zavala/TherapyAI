/**
 * MCP Memory Server Integration for Production
 * This handles the actual MCP server communication
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { z } from 'zod';

// Singleton MCP client instance
let mcpClient: Client | null = null;

// Initialize MCP client
export async function initializeMCPClient() {
  if (mcpClient) return mcpClient;

  try {
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
      env: {
        ...process.env,
        MEMORY_FILE_PATH: process.env.MCP_MEMORY_FILE_PATH || 
          '/home/quadcode/workspace/github.com/Brian-Zavala/couple-therapy-website/.mcp-memory.json'
      }
    });

    mcpClient = new Client({
      name: 'therapy-platform-client',
      version: '1.0.0',
    }, {
      capabilities: {}
    });

    await mcpClient.connect(transport);
    console.log('[MCP Memory] Client connected successfully');
    
    return mcpClient;
  } catch (error) {
    console.error('[MCP Memory] Failed to initialize client:', error);
    throw error;
  }
}

// Memory operation schemas
const EntitySchema = z.object({
  name: z.string(),
  entityType: z.string(),
  observations: z.array(z.string())
});

const RelationSchema = z.object({
  from: z.string(),
  to: z.string(),
  relationType: z.string()
});

// MCP Memory Operations
export const mcpMemoryOps = {
  async searchNodes(query: string) {
    const client = await initializeMCPClient();
    
    const result = await client.callTool({
      name: 'mcp__memory__search_nodes',
      arguments: { query }
    });

    return result;
  },

  async createEntities(entities: z.infer<typeof EntitySchema>[]) {
    const client = await initializeMCPClient();
    
    const result = await client.callTool({
      name: 'mcp__memory__create_entities',
      arguments: { entities }
    });

    return result;
  },

  async createRelations(relations: z.infer<typeof RelationSchema>[]) {
    const client = await initializeMCPClient();
    
    const result = await client.callTool({
      name: 'mcp__memory__create_relations',
      arguments: { relations }
    });

    return result;
  },

  async readGraph() {
    const client = await initializeMCPClient();
    
    const result = await client.callTool({
      name: 'mcp__memory__read_graph',
      arguments: {}
    });

    return result;
  },

  async addObservations(observations: Array<{
    entityName: string;
    contents: string[];
  }>) {
    const client = await initializeMCPClient();
    
    const result = await client.callTool({
      name: 'mcp__memory__add_observations',
      arguments: { observations }
    });

    return result;
  }
};

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', async () => {
    if (mcpClient) {
      await mcpClient.close();
    }
  });
}