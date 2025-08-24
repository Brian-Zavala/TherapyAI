'use client'

import { useState, useEffect } from 'react';
import type { ContextMemory } from '@/lib/services/mcp-memory-context';

// Hook for React components to use memory context
export function useMemoryContext(userMessage: string): {
  memories: ContextMemory[];
  isLoading: boolean;
  error: Error | null;
} {
  const [memories, setMemories] = useState<ContextMemory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (!userMessage || userMessage.trim().length < 3) {
      setMemories([]);
      return;
    }
    
    const fetchMemories = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Call the API endpoint instead of the server-side function
        const response = await fetch(`/api/memory?query=${encodeURIComponent(userMessage)}`);
        const data = await response.json();
        
        if (data.success && data.memories) {
          // Convert API response format to ContextMemory format
          const contextMemories: ContextMemory[] = data.memories.map((mem: any) => ({
            entity: {
              name: mem.name,
              entityType: mem.type,
              observations: mem.observations
            },
            relevanceScore: mem.relevanceScore,
            matchedTerms: mem.matchedTerms
          }));
          setMemories(contextMemories);
        } else {
          setMemories([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch memories'));
        setMemories([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Debounce to avoid too many requests
    const timeoutId = setTimeout(fetchMemories, 300);
    
    return () => clearTimeout(timeoutId);
  }, [userMessage]);
  
  return { memories, isLoading, error };
}