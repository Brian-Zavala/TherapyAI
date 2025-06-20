/**
 * Client-side hook for interacting with MCP memory system
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface Memory {
  name: string;
  type: string;
  relevanceScore: number;
  matchedTerms: string[];
  observations: string[];
}

interface MemorySearchResult {
  memories: Memory[];
  promptContext: string;
  totalFound: number;
}

interface UseMemoryReturn {
  // Search functionality
  searchMemories: (query: string, context?: string) => Promise<MemorySearchResult | null>;
  isSearching: boolean;
  searchError: string | null;
  
  // Save functionality
  saveConversation: (
    conversationId: string,
    summary: string[],
    relatedEntities?: string[]
  ) => Promise<boolean>;
  isSaving: boolean;
  saveError: string | null;
  
  // Auto-search functionality
  autoSearchMemories: MemorySearchResult | null;
  isAutoSearching: boolean;
}

export function useMemory(): UseMemoryReturn {
  const { data: session } = useSession();
  
  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [autoSearchMemories, setAutoSearchMemories] = useState<MemorySearchResult | null>(null);
  const [isAutoSearching, setIsAutoSearching] = useState(false);
  
  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Debounced auto-search state
  const [pendingSearch, setPendingSearch] = useState<{
    query: string;
    context?: string;
  } | null>(null);
  
  // Search memories
  const searchMemories = useCallback(async (
    query: string,
    context?: string
  ): Promise<MemorySearchResult | null> => {
    if (!session) {
      setSearchError('Not authenticated');
      return null;
    }
    
    if (!query || query.trim().length < 3) {
      return null;
    }
    
    setIsSearching(true);
    setSearchError(null);
    
    try {
      const params = new URLSearchParams({ query });
      if (context) params.append('context', context);
      
      const response = await fetch(`/api/memory?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Search failed');
      }
      
      return {
        memories: data.memories,
        promptContext: data.promptContext,
        totalFound: data.totalFound
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      setSearchError(errorMessage);
      console.error('[useMemory] Search error:', error);
      return null;
    } finally {
      setIsSearching(false);
    }
  }, [session]);
  
  // Save conversation to memory
  const saveConversation = useCallback(async (
    conversationId: string,
    summary: string[],
    relatedEntities?: string[]
  ): Promise<boolean> => {
    if (!session) {
      setSaveError('Not authenticated');
      return false;
    }
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          summary,
          relatedEntities
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Save failed');
      }
      
      console.log('[useMemory] Conversation saved successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Save failed';
      setSaveError(errorMessage);
      console.error('[useMemory] Save error:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [session]);
  
  // Auto-search effect with debouncing
  useEffect(() => {
    if (!pendingSearch) {
      setAutoSearchMemories(null);
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      setIsAutoSearching(true);
      const result = await searchMemories(pendingSearch.query, pendingSearch.context);
      if (result) {
        setAutoSearchMemories(result);
      }
      setIsAutoSearching(false);
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [pendingSearch, searchMemories]);
  
  // Public method to trigger auto-search
  const triggerAutoSearch = useCallback((query: string, context?: string) => {
    if (!query || query.trim().length < 3) {
      setPendingSearch(null);
      return;
    }
    
    setPendingSearch({ query, context });
  }, []);
  
  return {
    // Search functionality
    searchMemories,
    isSearching,
    searchError,
    
    // Save functionality
    saveConversation,
    isSaving,
    saveError,
    
    // Auto-search functionality
    autoSearchMemories,
    isAutoSearching,
    
    // Additional utility
    triggerAutoSearch
  } as UseMemoryReturn;
}

// Example usage in a component:
/*
function ChatComponent() {
  const { searchMemories, saveConversation, autoSearchMemories } = useMemory();
  const [userMessage, setUserMessage] = useState('');
  
  // Auto-search as user types
  useEffect(() => {
    if (userMessage.length > 10) {
      triggerAutoSearch(userMessage);
    }
  }, [userMessage]);
  
  // Display relevant memories
  if (autoSearchMemories && autoSearchMemories.memories.length > 0) {
    console.log('Found relevant memories:', autoSearchMemories.memories);
  }
  
  // Save conversation when done
  const handleEndConversation = async () => {
    await saveConversation(
      'unique-conversation-id',
      [
        'User asked about VAPI authentication',
        'Fixed timing issue in useVapiToken hook',
        'Solution: Set initial loading state to true'
      ],
      ['CommonIssues', 'RefactoredHooks']
    );
  };
}
*/