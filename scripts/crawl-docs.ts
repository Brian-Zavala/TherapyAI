#!/usr/bin/env tsx
/**
 * Documentation Crawler Script
 * Crawls and indexes documentation for all project dependencies
 * 
 * Usage:
 *   npm run crawl-docs              # Crawl all critical docs
 *   npm run crawl-docs -- --all     # Crawl all documentation
 *   npm run crawl-docs -- --library vapi  # Crawl specific library
 */

import { documentationSources, getDocsByPriority, type DocSource } from '../src/lib/docs-crawler';

interface CrawlOptions {
  all?: boolean;
  library?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  dryRun?: boolean;
}

async function crawlDocumentation(sources: DocSource[], options: CrawlOptions) {
  console.log(`🔍 Starting documentation crawl...`);
  console.log(`📚 Total sources to crawl: ${sources.length}`);
  
  if (options.dryRun) {
    console.log('\n🏃 DRY RUN MODE - No actual crawling will occur\n');
  }
  
  for (const source of sources) {
    console.log(`\n📖 Processing: ${source.name}`);
    console.log(`   Priority: ${source.priority}`);
    console.log(`   Strategy: ${source.searchStrategy}`);
    console.log(`   URLs: ${source.urls.length}`);
    
    if (!options.dryRun) {
      // TODO: Implement actual MCP crawling here
      // This would call the appropriate MCP tools based on searchStrategy
      
      for (const url of source.urls) {
        console.log(`   ↳ ${url}`);
        
        // Example MCP calls (to be implemented with actual MCP client):
        switch (source.searchStrategy) {
          case 'crawl':
            // await mcp__omnisearch__firecrawl_crawl_process({ 
            //   url, 
            //   extract_depth: source.priority === 'critical' ? 'advanced' : 'basic' 
            // });
            break;
            
          case 'scrape':
            // await mcp__omnisearch__firecrawl_scrape_process({ 
            //   url, 
            //   extract_depth: 'basic' 
            // });
            break;
            
          case 'map':
            // await mcp__omnisearch__firecrawl_map_process({ url });
            break;
            
          case 'extract':
            // await mcp__omnisearch__tavily_extract_process({ 
            //   url, 
            //   extract_depth: 'advanced' 
            // });
            break;
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  console.log('\n✅ Documentation crawl completed!');
}

async function main() {
  const args = process.argv.slice(2);
  const options: CrawlOptions = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--all':
        options.all = true;
        break;
      case '--library':
        options.library = args[++i];
        break;
      case '--priority':
        options.priority = args[++i] as any;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
        console.log(`
Documentation Crawler

Usage:
  npm run crawl-docs                    # Crawl critical priority docs
  npm run crawl-docs -- --all          # Crawl all documentation
  npm run crawl-docs -- --library vapi # Crawl specific library
  npm run crawl-docs -- --priority high # Crawl by priority level
  npm run crawl-docs -- --dry-run      # Show what would be crawled

Options:
  --all              Crawl all documentation sources
  --library <name>   Crawl specific library documentation
  --priority <level> Crawl by priority (critical, high, medium, low)
  --dry-run          Show what would be crawled without actually crawling
  --help             Show this help message
        `);
        process.exit(0);
    }
  }
  
  let sourcesToCrawl: DocSource[] = [];
  
  if (options.library) {
    // Crawl specific library
    const source = documentationSources.find(
      s => s.name.toLowerCase() === options.library!.toLowerCase()
    );
    
    if (!source) {
      console.error(`❌ Library not found: ${options.library}`);
      console.log('\nAvailable libraries:');
      documentationSources.forEach(s => console.log(`  - ${s.name}`));
      process.exit(1);
    }
    
    sourcesToCrawl = [source];
  } else if (options.priority) {
    // Crawl by priority
    sourcesToCrawl = getDocsByPriority(options.priority);
  } else if (options.all) {
    // Crawl all
    sourcesToCrawl = documentationSources;
  } else {
    // Default: crawl critical docs only
    sourcesToCrawl = getDocsByPriority('critical');
  }
  
  if (sourcesToCrawl.length === 0) {
    console.log('❌ No documentation sources found matching criteria');
    process.exit(1);
  }
  
  await crawlDocumentation(sourcesToCrawl, options);
}

// Run the script
main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});