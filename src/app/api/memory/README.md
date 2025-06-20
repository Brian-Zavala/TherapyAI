# MCP Memory System Integration

This directory contains the API routes and implementation for the MCP (Model Context Protocol) memory system that provides persistent conversation memory across sessions.

## Overview

The memory system uses a knowledge graph structure to store:
- **Entities**: Named concepts (e.g., "VoiceTherapySessions", "CommonIssues")
- **Observations**: Facts/details about entities
- **Relations**: Connections between entities

## How It Works

### 1. **Automatic Context Loading**

When a user asks a question, the system:
1. Extracts keywords from the message
2. Searches the memory graph for relevant entities
3. Ranks results by relevance score
4. Returns the most relevant memories as context

### 2. **Memory Storage**

After conversations, you can save summaries:
```typescript
await saveConversation(
  'conversation-id',
  ['Summary point 1', 'Summary point 2'],
  ['RelatedEntity1', 'RelatedEntity2']
);
```

### 3. **Integration Flow**

```
User Message → Keyword Extraction → Memory Search → Relevant Context
                                                         ↓
                                            Include in AI Prompt
```

## Files

- **`/src/lib/mcp-memory-context.ts`**: Core memory context system
- **`/src/lib/mcp-client.ts`**: MCP server communication (server-side)
- **`/src/app/api/memory/route.ts`**: REST API for memory operations
- **`/src/hooks/useMemory.ts`**: React hook for client-side usage

## Usage Examples

### In a Chat Component

```typescript
import { useMemory } from '@/hooks/useMemory';

function ChatAssistant() {
  const { searchMemories, autoSearchMemories, triggerAutoSearch } = useMemory();
  const [userMessage, setUserMessage] = useState('');
  
  // Auto-search as user types
  useEffect(() => {
    if (userMessage.length > 10) {
      triggerAutoSearch(userMessage);
    }
  }, [userMessage]);
  
  // Include memories in AI prompt
  const handleSendMessage = async () => {
    const memories = autoSearchMemories;
    
    const enhancedPrompt = memories?.promptContext 
      ? `${memories.promptContext}\n\n${userMessage}`
      : userMessage;
    
    // Send to AI with context...
  };
}
```

### In API Routes

```typescript
import { getRelevantMemories } from '@/lib/mcp-memory-context';

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  
  // Get relevant memories
  const memories = await getRelevantMemories(message);
  
  // Include in AI prompt
  const contextPrompt = formatMemoriesForPrompt(memories);
  
  // Process with AI...
}
```

## Memory Structure Example

```json
{
  "entities": [
    {
      "name": "CommonIssues",
      "entityType": "KnownProblem",
      "observations": [
        "Infinite loops: Use refs for callbacks in hooks",
        "VAPI 400 errors: Fixed by supporting inline configs",
        "Session recovery: Only inherit isPaused when active"
      ]
    }
  ],
  "relations": [
    {
      "from": "CommonIssues",
      "to": "RefactoredHooks",
      "relationType": "fixed_in"
    }
  ]
}
```

## Configuration

The system can be configured in `/src/lib/mcp-memory-context.ts`:

```typescript
const MEMORY_CONFIG = {
  maxMemories: 5,          // Max memories to include
  minRelevanceScore: 0.3,  // Minimum relevance threshold
  cacheTimeout: 300000,    // Cache duration (5 min)
};
```

## Best Practices

1. **Summarize Conversations**: After fixing issues or implementing features, save a summary
2. **Use Relations**: Connect conversations to relevant entities (e.g., "CommonIssues")
3. **Keep Observations Concise**: Each observation should be a single, clear fact
4. **Regular Cleanup**: Periodically review and clean up old/irrelevant memories

## Security

- All memory operations require authentication
- User context is automatically added to saved conversations
- Memory file is stored locally (not in version control)

## Initialization

The memory system is initialized with project knowledge via:
```bash
node scripts/init-mcp-memory.js
```

This creates the base knowledge graph with entities like:
- TherapyPlatform
- TechStack
- VoiceTherapySessions
- CriticalConfig
- CommonIssues
- RefactoredHooks