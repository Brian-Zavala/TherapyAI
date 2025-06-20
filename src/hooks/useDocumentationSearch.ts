/**
 * useDocumentationSearch Hook
 * React hook for searching project documentation using MCP tools
 */

import { useState, useCallback } from 'react';
import { docSearch, type SearchResult, type DocSearchOptions } from '@/lib/docs-search';

interface UseDocumentationSearchResult {
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  search: (query: string, options?: DocSearchOptions) => Promise<void>;
  searchLibrary: (library: string, query: string, options?: DocSearchOptions) => Promise<void>;
  getAIAnswer: (query: string, context?: string) => Promise<string>;
  clearResults: () => void;
}

export function useDocumentationSearch(): UseDocumentationSearchResult {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const search = useCallback(async (query: string, options?: DocSearchOptions) => {
    setLoading(true);
    setError(null);
    
    try {
      const searchResults = await docSearch.searchAll(query, options);
      setResults(searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);
  
  const searchLibrary = useCallback(async (
    library: string, 
    query: string, 
    options?: DocSearchOptions
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const searchResults = await docSearch.searchLibrary(library, query, options);
      setResults(searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Library search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);
  
  const getAIAnswer = useCallback(async (query: string, context?: string): Promise<string> => {
    setLoading(true);
    setError(null);
    
    try {
      const answer = await docSearch.getAIAnswer(query, context);
      return answer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'AI answer failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  
  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);
  
  return {
    results,
    loading,
    error,
    search,
    searchLibrary,
    getAIAnswer,
    clearResults
  };
}

// Example usage in a component:
/*
function DocSearchComponent() {
  const { results, loading, error, search, searchLibrary } = useDocumentationSearch();
  
  // Search all documentation
  const handleSearch = async (query: string) => {
    await search(query, { limit: 20, searchType: 'web' });
  };
  
  // Search specific library
  const handleLibrarySearch = async (query: string) => {
    await searchLibrary('VAPI', query, { limit: 10 });
  };
  
  // Get AI-powered answer
  const handleAIAnswer = async (question: string) => {
    const answer = await getAIAnswer(question, 'Next.js 15 App Router');
    console.log(answer);
  };
  
  return (
    <div>
      {loading && <p>Searching...</p>}
      {error && <p>Error: {error}</p>}
      {results.map((result, index) => (
        <div key={index}>
          <h3>{result.title}</h3>
          <p>{result.snippet}</p>
          <a href={result.url}>{result.source}</a>
        </div>
      ))}
    </div>
  );
}
*/