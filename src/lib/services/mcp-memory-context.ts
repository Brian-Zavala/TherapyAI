/**
 * MCP Memory Context System
 * Automatically loads relevant memories based on conversation context
 */

import { cache } from 'react';

// Types for MCP memory structures
export interface MemoryEntity {
  name: string;
  entityType: string;
  observations: string[];
}

export interface MemoryRelation {
  from: string;
  to: string;
  relationType: string;
}

export interface SearchResult {
  entities: MemoryEntity[];
  relations: MemoryRelation[];
}

export interface ContextMemory {
  entity: MemoryEntity;
  relevanceScore: number;
  matchedTerms: string[];
}

// Configuration
const MEMORY_CONFIG = {
  maxMemories: 5,           // Maximum memories to include in context
  minRelevanceScore: 0.3,   // Minimum relevance score to include
  cacheTimeout: 300000,     // 5 minutes cache
  searchStrategies: {
    exact: 1.0,             // Exact match weight
    partial: 0.7,           // Partial match weight
    semantic: 0.5,          // Semantic similarity weight
  }
};

// Keyword extraction and concept mapping
const CONCEPT_MAPPINGS = {
  // Technical concepts
  'vapi': ['voice', 'ai', 'assistant', 'voice therapy', 'audio', 'speech'],
  'authentication': ['auth', 'token', 'jwt', 'login', 'session', 'unauthorized'],
  'error': ['bug', 'issue', 'problem', 'fail', 'crash', 'exception'],
  'database': ['db', 'postgres', 'supabase', 'prisma', 'sql'],
  'realtime': ['real-time', 'websocket', 'broadcast', 'live', 'streaming'],
  'hook': ['hooks', 'react hook', 'custom hook', 'use'],
  'session': ['therapy session', 'call', 'conversation', 'meeting'],
  
  // Problem domains
  'performance': ['slow', 'optimize', 'speed', 'lag', 'memory', 'cpu'],
  'ui': ['interface', 'component', 'display', 'render', 'layout', 'css'],
  'deployment': ['deploy', 'vercel', 'production', 'build', 'ci/cd'],
};

// Extract keywords and concepts from text
function extractKeywords(text: string): string[] {
  const normalizedText = text.toLowerCase();
  const keywords = new Set<string>();
  
  // Direct word extraction (split by spaces and punctuation)
  const words = normalizedText.split(/[\s,.\-!?;:()[\]{}'"]+/)
    .filter(word => word.length > 2);
  
  words.forEach(word => keywords.add(word));
  
  // Check for concept mappings
  Object.entries(CONCEPT_MAPPINGS).forEach(([concept, variants]) => {
    if (normalizedText.includes(concept)) {
      keywords.add(concept);
      variants.forEach(v => keywords.add(v));
    }
    
    // Check if any variant is mentioned
    variants.forEach(variant => {
      if (normalizedText.includes(variant)) {
        keywords.add(concept);
        keywords.add(variant);
      }
    });
  });
  
  // Extract technical terms (camelCase, PascalCase, snake_case)
  const technicalTerms = normalizedText.match(/[a-z]+([A-Z][a-z]+)+|[A-Z][a-z]+([A-Z][a-z]+)+|[a-z]+(_[a-z]+)+/g);
  if (technicalTerms) {
    technicalTerms.forEach(term => keywords.add(term.toLowerCase()));
  }
  
  return Array.from(keywords);
}

// Calculate relevance score between query and memory entity
function calculateRelevance(
  queryKeywords: string[],
  entity: MemoryEntity
): { score: number; matchedTerms: string[] } {
  const matchedTerms = new Set<string>();
  let score = 0;
  
  // Combine entity name and observations for matching
  const entityText = [
    entity.name,
    entity.entityType,
    ...entity.observations
  ].join(' ').toLowerCase();
  
  // Check each query keyword
  queryKeywords.forEach(keyword => {
    // Exact match in entity name (highest weight)
    if (entity.name.toLowerCase().includes(keyword)) {
      score += MEMORY_CONFIG.searchStrategies.exact * 2;
      matchedTerms.add(keyword);
    }
    
    // Match in observations
    if (entityText.includes(keyword)) {
      score += MEMORY_CONFIG.searchStrategies.exact;
      matchedTerms.add(keyword);
    }
    
    // Partial matches (e.g., "auth" matches "authentication")
    const partialMatches = entityText.match(new RegExp(`\\b\\w*${keyword}\\w*\\b`, 'gi'));
    if (partialMatches && partialMatches.length > 0) {
      score += MEMORY_CONFIG.searchStrategies.partial * partialMatches.length;
      matchedTerms.add(keyword);
    }
  });
  
  // Normalize score by number of keywords
  score = score / Math.max(queryKeywords.length, 1);
  
  // Boost recent conversations
  if (entity.entityType === 'Conversation' && entity.name.includes(new Date().toISOString().split('T')[0])) {
    score *= 1.2; // 20% boost for today's conversations
  }
  
  return { score, matchedTerms: Array.from(matchedTerms) };
}

// Mock memory data for demo purposes
const MOCK_MEMORY_DATA = {
  entities: [
    {
      name: "CommonIssues",
      entityType: "KnownProblem",
      observations: [
        "Infinite loops: Use refs for callbacks in hooks to prevent re-renders",
        "UI flicker: Centralized session-active class management in useVapiSession",
        "Timer sync drift: Rate-limited syncing only during active conversations",
        "VAPI 400 errors: Fixed by supporting inline assistant configurations",
        "Session recovery: Sessions only inherit isPaused from DB when status is 'active'",
        "React timer hooks: Use refs for timer functions to prevent re-render cycles",
        "Duplicate session state logging: client.tsx has both MutationObserver and custom event listener watching session-active class changes, causing duplicate 'Session active state changed' logs"
      ]
    },
    {
      name: "RefactoredHooks",
      entityType: "Component",
      observations: [
        "useVapiSession: Core VAPI integration with initialization order fixes",
        "useSessionManagement: Orchestrates session state across components",
        "useTranscriptHandler: Processes real-time speech transcriptions",
        "useTherapySessionRecovery: Handles interrupted session restoration",
        "useSupabaseRealTimeMetrics: Broadcasts session metrics via Supabase",
        "useVapiToken: JWT management with rate limiting and retry logic",
        "TherapyButtonRefactored dispatches 'sessionStateChanged' event when adding/removing session-active class",
        "client.tsx dashboard listens for both DOM mutations and custom events on session state"
      ]
    },
    {
      name: "VoiceTherapySessions",
      entityType: "Feature",
      observations: [
        "Real-time voice conversations with AI therapist",
        "Session duration: 5-120 minutes (configurable)",
        "Automatic transcription and conversation history",
        "Pause/resume functionality with state persistence",
        "Session recovery for interrupted calls",
        "Cost: approximately $0.13 per minute of voice AI"
      ]
    },
    {
      name: "CriticalConfig",
      entityType: "Configuration",
      observations: [
        "Database connection MUST use .env file (never .env.local)",
        "VAPI requires HTTPS in development (use mkcert)",
        "No stage directions (*action*, <emotion>) in VAPI prompts",
        "React Portals required for modals to avoid CSS stacking issues",
        "Rate limiting implemented with exponential backoff for JWT tokens",
        "Session state synced via Supabase Realtime, not WebSocket"
      ]
    },
    {
      name: "Conversation_2024_12_20_VAPI_Auth_Fix",
      entityType: "Conversation",
      observations: [
        "User reported VAPI authentication token errors preventing voice therapy session initialization",
        "Error: 'Failed to obtain authentication token' occurring during component initialization",
        "Root cause: useVapiToken hook had isLoading initially set to false, causing premature VAPI initialization",
        "Solution: Set initial isLoading to true and added proper session loading checks",
        "Fixed timing issue between token fetching and VAPI initialization",
        "Also discovered duplicate session state logging due to both MutationObserver and custom event listener in client.tsx"
      ]
    }
  ]
};

// Search MCP memory for relevant entities
async function searchMemory(keywords: string[]): Promise<SearchResult> {
  // For demo, use mock data
  // In production, this would call the actual MCP memory API
  const searchQuery = keywords.join(' ').toLowerCase();
  
  const filteredEntities = MOCK_MEMORY_DATA.entities.filter(entity => {
    const entityText = [
      entity.name,
      entity.entityType,
      ...entity.observations
    ].join(' ').toLowerCase();
    
    return keywords.some(keyword => entityText.includes(keyword.toLowerCase()));
  });
  
  return { entities: filteredEntities, relations: [] };
}

// Get all entities from memory
async function getAllEntities(): Promise<MemoryEntity[]> {
  // For demo, return mock data
  // In production, this would call the actual MCP memory API
  return MOCK_MEMORY_DATA.entities;
}

// Main function to get relevant context memories
export const getRelevantMemories = cache(async (
  userMessage: string,
  systemContext?: string
): Promise<ContextMemory[]> => {
  try {
    // Extract keywords from user message and system context
    const allText = `${userMessage} ${systemContext || ''}`;
    const keywords = extractKeywords(allText);
    
    if (keywords.length === 0) {
      return [];
    }
    
    // Search for relevant entities
    const searchResults = await searchMemory(keywords);
    let entities = searchResults.entities;
    
    // If search returns too few results, get all entities and filter
    if (entities.length < 3) {
      const allEntities = await getAllEntities();
      entities = [...entities, ...allEntities];
    }
    
    // Calculate relevance scores
    const scoredMemories: ContextMemory[] = entities
      .map(entity => {
        const { score, matchedTerms } = calculateRelevance(keywords, entity);
        return { entity, relevanceScore: score, matchedTerms };
      })
      .filter(memory => memory.relevanceScore >= MEMORY_CONFIG.minRelevanceScore)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, MEMORY_CONFIG.maxMemories);
    
    // Log selected memories for debugging
    console.log('[Memory Context] Selected memories:', {
      query: userMessage.substring(0, 100),
      keywords,
      memories: scoredMemories.map(m => ({
        name: m.entity.name,
        score: m.relevanceScore.toFixed(2),
        matched: m.matchedTerms
      }))
    });
    
    return scoredMemories;
  } catch (error) {
    console.error('[Memory Context] Failed to get relevant memories:', error);
    return [];
  }
});

// Format memories for inclusion in prompt
export function formatMemoriesForPrompt(memories: ContextMemory[]): string {
  if (memories.length === 0) {
    return '';
  }
  
  const sections = memories.map(memory => {
    const { entity } = memory;
    const header = `### ${entity.name} (${entity.entityType})`;
    const observations = entity.observations
      .slice(0, 3) // Limit observations to prevent context bloat
      .map(obs => `- ${obs}`)
      .join('\n');
    
    return `${header}\n${observations}`;
  });
  
  return `## Relevant Context from Memory\n\n${sections.join('\n\n')}`;
}

// Utility to save conversation to memory
export async function saveConversationToMemory(
  conversationId: string,
  summary: string[],
  relatedEntities?: string[]
): Promise<void> {
  // For demo, just log the conversation
  // In production, this would save to the actual MCP memory
  const entityName = `Conversation_${new Date().toISOString().split('T')[0]}_${conversationId}`;
  
  console.log('[Memory Context] Would save conversation:', {
    name: entityName,
    entityType: 'Conversation',
    observations: summary,
    relatedEntities
  });
  
  // For demo, add to mock data
  MOCK_MEMORY_DATA.entities.push({
    name: entityName,
    entityType: 'Conversation',
    observations: summary
  });
}

// Example integration for Claude Code
export function createMemoryContextPrompt(
  userMessage: string,
  memories: ContextMemory[]
): string {
  const memoryContext = formatMemoriesForPrompt(memories);
  
  if (!memoryContext) {
    return userMessage;
  }
  
  return `${memoryContext}\n\n## Current Question\n${userMessage}`;
}