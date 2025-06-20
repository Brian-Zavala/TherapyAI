/**
 * Documentation Search Utility
 * Uses MCP Omnisearch tools to search and retrieve documentation
 */

import { documentationSources, type DocSource } from './docs-crawler';

export interface SearchResult {
  source: string;
  url: string;
  title: string;
  snippet: string;
  relevance?: number;
}

export interface DocSearchOptions {
  includeDomains?: string[];
  excludeDomains?: string[];
  limit?: number;
  searchType?: 'web' | 'ai' | 'both';
}

/**
 * Search documentation using MCP Omnisearch tools
 * This is a placeholder that shows how to structure the search
 * Actual implementation requires MCP client integration
 */
export class DocumentationSearch {
  /**
   * Search across all documentation sources
   */
  async searchAll(query: string, options: DocSearchOptions = {}): Promise<SearchResult[]> {
    const { limit = 10, searchType = 'web' } = options;
    
    // Get all critical and high priority documentation domains
    const criticalDocs = documentationSources.filter(
      d => d.priority === 'critical' || d.priority === 'high'
    );
    
    const domains = criticalDocs.flatMap(doc => 
      doc.urls.map(url => new URL(url).hostname)
    );
    
    // Remove duplicates
    const uniqueDomains = [...new Set(domains)];
    
    // Structure for MCP search
    const searchParams = {
      query,
      include_domains: options.includeDomains || uniqueDomains,
      exclude_domains: options.excludeDomains || [],
      limit
    };
    
    console.log('Search params for MCP:', searchParams);
    
    // TODO: Integrate with actual MCP client
    // Example calls:
    // - mcp__omnisearch__tavily_search(searchParams)
    // - mcp__omnisearch__brave_search(searchParams)
    // - mcp__omnisearch__kagi_search(searchParams)
    
    return [];
  }
  
  /**
   * Search specific library documentation
   */
  async searchLibrary(
    libraryName: string, 
    query: string, 
    options: DocSearchOptions = {}
  ): Promise<SearchResult[]> {
    const doc = documentationSources.find(
      d => d.name.toLowerCase() === libraryName.toLowerCase()
    );
    
    if (!doc) {
      throw new Error(`Documentation source not found for: ${libraryName}`);
    }
    
    const domains = doc.urls.map(url => new URL(url).hostname);
    const uniqueDomains = [...new Set(domains)];
    
    return this.searchAll(query, {
      ...options,
      includeDomains: uniqueDomains
    });
  }
  
  /**
   * Get AI-powered answer from documentation
   */
  async getAIAnswer(query: string, context?: string): Promise<string> {
    const searchQuery = context ? `${context} ${query}` : query;
    
    // Structure for MCP AI search
    const aiParams = {
      query: searchQuery
    };
    
    console.log('AI search params for MCP:', aiParams);
    
    // TODO: Integrate with actual MCP client
    // Example call: mcp__omnisearch__kagi_fastgpt_search(aiParams)
    
    return '';
  }
  
  /**
   * Crawl and index documentation pages
   */
  async crawlDocumentation(source: DocSource): Promise<void> {
    const crawlParams = {
      url: source.urls,
      extract_depth: source.priority === 'critical' ? 'advanced' : 'basic'
    };
    
    console.log(`Crawling ${source.name} documentation:`, crawlParams);
    
    // TODO: Integrate with actual MCP client
    // Example calls based on strategy:
    // - mcp__omnisearch__firecrawl_crawl_process(crawlParams) for 'crawl'
    // - mcp__omnisearch__firecrawl_scrape_process(crawlParams) for 'scrape'
    // - mcp__omnisearch__firecrawl_map_process(crawlParams) for 'map'
  }
  
  /**
   * Extract content from documentation URL
   */
  async extractContent(url: string | string[]): Promise<any> {
    const extractParams = {
      url,
      extract_depth: 'advanced'
    };
    
    console.log('Extract params for MCP:', extractParams);
    
    // TODO: Integrate with actual MCP client
    // Example call: mcp__omnisearch__tavily_extract_process(extractParams)
    
    return null;
  }
}

// Export singleton instance
export const docSearch = new DocumentationSearch();

// Example usage patterns for MCP integration:
export const mcpSearchExamples = {
  // Web search with domain filtering
  webSearch: {
    tavily: "mcp__omnisearch__tavily_search({ query: 'VAPI webhook configuration', include_domains: ['docs.vapi.ai'], limit: 10 })",
    brave: "mcp__omnisearch__brave_search({ query: 'site:nextjs.org App Router middleware', limit: 10 })",
    kagi: "mcp__omnisearch__kagi_search({ query: 'Prisma relations one-to-many', include_domains: ['prisma.io'], limit: 10 })"
  },
  
  // AI-powered answers
  aiAnswers: {
    fastGPT: "mcp__omnisearch__kagi_fastgpt_search({ query: 'How to implement JWT authentication in Next.js 15 with NextAuth?' })"
  },
  
  // Content extraction
  extraction: {
    tavily: "mcp__omnisearch__tavily_extract_process({ url: ['https://docs.vapi.ai/introduction', 'https://docs.vapi.ai/quickstart'], extract_depth: 'advanced' })",
    firecrawl: "mcp__omnisearch__firecrawl_scrape_process({ url: 'https://www.framer.com/motion/animation/', extract_depth: 'basic' })"
  },
  
  // Documentation crawling
  crawling: {
    full: "mcp__omnisearch__firecrawl_crawl_process({ url: 'https://docs.vapi.ai', extract_depth: 'advanced' })",
    map: "mcp__omnisearch__firecrawl_map_process({ url: 'https://nextjs.org/docs' })"
  }
};