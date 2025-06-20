/**
 * Documentation Crawler Configuration
 * Manages documentation sources for all project dependencies
 */

export interface DocSource {
  name: string;
  urls: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  updateFrequency: 'daily' | 'weekly' | 'monthly';
  searchStrategy: 'crawl' | 'scrape' | 'map' | 'extract';
}

export const documentationSources: DocSource[] = [
  // Critical Dependencies
  {
    name: 'VAPI Voice AI',
    urls: [
      'https://docs.vapi.ai/introduction',
      'https://docs.vapi.ai/quickstart',
      'https://docs.vapi.ai/api-reference',
      'https://docs.vapi.ai/sdk/web',
      'https://docs.vapi.ai/sdk/typescript',
      'https://docs.vapi.ai/concepts',
      'https://docs.vapi.ai/examples'
    ],
    priority: 'critical',
    updateFrequency: 'weekly',
    searchStrategy: 'crawl'
  },
  {
    name: 'Next.js 15',
    urls: [
      'https://nextjs.org/docs',
      'https://nextjs.org/docs/app',
      'https://nextjs.org/docs/pages/api-reference',
      'https://nextjs.org/docs/app/building-your-application'
    ],
    priority: 'critical',
    updateFrequency: 'weekly',
    searchStrategy: 'crawl'
  },
  {
    name: 'React 19',
    urls: [
      'https://react.dev/reference/react',
      'https://react.dev/reference/react-dom',
      'https://react.dev/learn',
      'https://react.dev/blog'
    ],
    priority: 'critical',
    updateFrequency: 'weekly',
    searchStrategy: 'crawl'
  },
  {
    name: 'TypeScript',
    urls: [
      'https://www.typescriptlang.org/docs/',
      'https://www.typescriptlang.org/docs/handbook/',
      'https://www.typescriptlang.org/tsconfig'
    ],
    priority: 'high',
    updateFrequency: 'monthly',
    searchStrategy: 'crawl'
  },
  
  // UI & Animation Libraries
  {
    name: 'Framer Motion',
    urls: [
      'https://www.framer.com/motion/',
      'https://www.framer.com/motion/animation/',
      'https://www.framer.com/motion/gestures/',
      'https://www.framer.com/motion/layout-animations/'
    ],
    priority: 'high',
    updateFrequency: 'monthly',
    searchStrategy: 'crawl'
  },
  {
    name: 'TailwindCSS 4',
    urls: [
      'https://tailwindcss.com/docs',
      'https://tailwindcss.com/docs/installation',
      'https://tailwindcss.com/docs/configuration',
      'https://tailwindcss.com/docs/utility-first'
    ],
    priority: 'high',
    updateFrequency: 'monthly',
    searchStrategy: 'crawl'
  },
  {
    name: 'Lottie React',
    urls: [
      'https://lottiereact.com/',
      'https://github.com/LottieFiles/lottie-react',
      'https://github.com/dotlottie/dotlottie-web'
    ],
    priority: 'medium',
    updateFrequency: 'monthly',
    searchStrategy: 'scrape'
  },
  
  // Authentication
  {
    name: 'NextAuth.js',
    urls: [
      'https://next-auth.js.org/getting-started/introduction',
      'https://next-auth.js.org/configuration/options',
      'https://next-auth.js.org/adapters/prisma',
      'https://next-auth.js.org/providers'
    ],
    priority: 'high',
    updateFrequency: 'weekly',
    searchStrategy: 'crawl'
  },
  
  // Database & ORM
  {
    name: 'Prisma',
    urls: [
      'https://www.prisma.io/docs',
      'https://www.prisma.io/docs/orm/prisma-client',
      'https://www.prisma.io/docs/orm/prisma-schema',
      'https://www.prisma.io/docs/orm/prisma-migrate'
    ],
    priority: 'high',
    updateFrequency: 'weekly',
    searchStrategy: 'crawl'
  },
  {
    name: 'Supabase',
    urls: [
      'https://supabase.com/docs',
      'https://supabase.com/docs/guides/database',
      'https://supabase.com/docs/guides/auth',
      'https://supabase.com/docs/reference/javascript'
    ],
    priority: 'high',
    updateFrequency: 'weekly',
    searchStrategy: 'crawl'
  },
  
  // Real-time & Communication
  {
    name: 'Deepgram',
    urls: [
      'https://developers.deepgram.com/docs',
      'https://developers.deepgram.com/docs/sdks/javascript-sdk',
      'https://developers.deepgram.com/docs/getting-started'
    ],
    priority: 'medium',
    updateFrequency: 'monthly',
    searchStrategy: 'crawl'
  },
  
  // Rate Limiting & Caching
  {
    name: 'Upstash',
    urls: [
      'https://upstash.com/docs/redis',
      'https://upstash.com/docs/ratelimit',
      'https://github.com/upstash/ratelimit'
    ],
    priority: 'medium',
    updateFrequency: 'monthly',
    searchStrategy: 'scrape'
  },
  
  // Email Services
  {
    name: 'Resend',
    urls: [
      'https://resend.com/docs/introduction',
      'https://resend.com/docs/api-reference',
      'https://resend.com/docs/sdks/node'
    ],
    priority: 'medium',
    updateFrequency: 'monthly',
    searchStrategy: 'crawl'
  },
  {
    name: 'React Email',
    urls: [
      'https://react.email/docs/introduction',
      'https://react.email/docs/components',
      'https://react.email/docs/integrations/resend'
    ],
    priority: 'medium',
    updateFrequency: 'monthly',
    searchStrategy: 'crawl'
  },
  
  // Data Visualization
  {
    name: 'Recharts',
    urls: [
      'https://recharts.org/en-US/guide',
      'https://recharts.org/en-US/api',
      'https://recharts.org/en-US/examples'
    ],
    priority: 'low',
    updateFrequency: 'monthly',
    searchStrategy: 'crawl'
  },
  
  // Form Validation
  {
    name: 'Zod',
    urls: [
      'https://zod.dev/',
      'https://github.com/colinhacks/zod#readme'
    ],
    priority: 'medium',
    updateFrequency: 'monthly',
    searchStrategy: 'scrape'
  }
];

// Helper function to get documentation URLs by priority
export function getDocsByPriority(priority: DocSource['priority']): DocSource[] {
  return documentationSources.filter(doc => doc.priority === priority);
}

// Helper function to get all URLs for a specific library
export function getDocUrls(libraryName: string): string[] {
  const doc = documentationSources.find(
    d => d.name.toLowerCase() === libraryName.toLowerCase()
  );
  return doc?.urls || [];
}

// Helper function to get all critical documentation URLs
export function getCriticalDocs(): string[] {
  return documentationSources
    .filter(doc => doc.priority === 'critical')
    .flatMap(doc => doc.urls);
}