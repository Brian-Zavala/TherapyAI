/**
 * MCP Client for interacting with MCP servers
 * This is a server-side module that communicates with MCP memory server
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

// MCP Memory function types
interface MCPMemoryFunctions {
  create_entities: (params: {
    entities: Array<{
      name: string;
      entityType: string;
      observations: string[];
    }>;
  }) => Promise<any>;
  
  create_relations: (params: {
    relations: Array<{
      from: string;
      to: string;
      relationType: string;
    }>;
  }) => Promise<any>;
  
  add_observations: (params: {
    observations: Array<{
      entityName: string;
      contents: string[];
    }>;
  }) => Promise<any>;
  
  search_nodes: (params: {
    query: string;
  }) => Promise<{
    entities: Array<{
      name: string;
      entityType: string;
      observations: string[];
    }>;
    relations: Array<{
      from: string;
      to: string;
      relationType: string;
    }>;
  }>;
  
  read_graph: (params: {}) => Promise<{
    entities: Array<{
      name: string;
      entityType: string;
      observations: string[];
    }>;
    relations: Array<{
      from: string;
      to: string;
      relationType: string;
    }>;
  }>;
  
  open_nodes: (params: {
    names: string[];
  }) => Promise<{
    entities: Array<{
      name: string;
      entityType: string;
      observations: string[];
    }>;
  }>;
}

class MCPClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }>();
  
  constructor(private config: {
    command: string;
    args: string[];
    env?: Record<string, string>;
  }) {
    super();
  }
  
  async connect(): Promise<void> {
    if (this.process) {
      throw new Error('Already connected');
    }
    
    this.process = spawn(this.config.command, this.config.args, {
      env: { ...process.env, ...this.config.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    this.process.stdout?.on('data', (data) => {
      try {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          const message = JSON.parse(line);
          this.handleMessage(message);
        }
      } catch (error) {
        console.error('[MCPClient] Failed to parse message:', error);
      }
    });
    
    this.process.stderr?.on('data', (data) => {
      console.error('[MCPClient] stderr:', data.toString());
    });
    
    this.process.on('error', (error) => {
      console.error('[MCPClient] Process error:', error);
      this.emit('error', error);
    });
    
    this.process.on('exit', (code) => {
      console.log(`[MCPClient] Process exited with code ${code}`);
      this.cleanup();
    });
    
    // Wait for initialization
    await this.initialize();
  }
  
  private async initialize(): Promise<void> {
    // Send initialization message
    await this.sendRequest('initialize', {
      protocolVersion: '1.0',
      capabilities: {}
    });
  }
  
  private handleMessage(message: any): void {
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);
      
      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }
    }
  }
  
  private async sendRequest(method: string, params: any): Promise<any> {
    if (!this.process || !this.process.stdin) {
      throw new Error('Not connected');
    }
    
    const id = ++this.requestId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      this.process!.stdin!.write(JSON.stringify(request) + '\n', (error) => {
        if (error) {
          this.pendingRequests.delete(id);
          reject(error);
        }
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }
  
  async callFunction(name: string, params: any): Promise<any> {
    return this.sendRequest('callFunction', { name, arguments: params });
  }
  
  disconnect(): void {
    this.cleanup();
  }
  
  private cleanup(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    
    // Reject all pending requests
    for (const [id, { reject }] of this.pendingRequests) {
      reject(new Error('Client disconnected'));
    }
    this.pendingRequests.clear();
  }
}

// Singleton instance
let memoryClient: MCPClient | null = null;

// Initialize MCP memory client
export async function initializeMCPMemory(): Promise<void> {
  if (memoryClient) {
    return;
  }
  
  memoryClient = new MCPClient({
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    env: {
      MEMORY_FILE_PATH: process.env.MCP_MEMORY_FILE_PATH || 
        '/home/quadcode/workspace/github.com/Brian-Zavala/couple-therapy-website/.mcp-memory.json'
    }
  });
  
  await memoryClient.connect();
  console.log('[MCPClient] Memory server connected');
}

// Memory API functions
export const mcpMemory: MCPMemoryFunctions = {
  create_entities: async (params) => {
    if (!memoryClient) await initializeMCPMemory();
    return memoryClient!.callFunction('mcp__memory__create_entities', params);
  },
  
  create_relations: async (params) => {
    if (!memoryClient) await initializeMCPMemory();
    return memoryClient!.callFunction('mcp__memory__create_relations', params);
  },
  
  add_observations: async (params) => {
    if (!memoryClient) await initializeMCPMemory();
    return memoryClient!.callFunction('mcp__memory__add_observations', params);
  },
  
  search_nodes: async (params) => {
    if (!memoryClient) await initializeMCPMemory();
    return memoryClient!.callFunction('mcp__memory__search_nodes', params);
  },
  
  read_graph: async (params) => {
    if (!memoryClient) await initializeMCPMemory();
    return memoryClient!.callFunction('mcp__memory__read_graph', params);
  },
  
  open_nodes: async (params) => {
    if (!memoryClient) await initializeMCPMemory();
    return memoryClient!.callFunction('mcp__memory__open_nodes', params);
  }
};

// Cleanup on process exit
process.on('exit', () => {
  if (memoryClient) {
    memoryClient.disconnect();
  }
});