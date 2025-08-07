// Phase 3: React Query Provider with Advanced Caching
// Ultra-optimized 2025 caching strategies

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import devtools to avoid production bundle
const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then(mod => mod.ReactQueryDevtools),
  { ssr: false }
);

interface ReactQueryProviderProps {
  children: ReactNode;
}

// Create query client with ultra-optimized defaults
function makeQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // 2025 best practices for caching
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
        retry: (failureCount, error) => {
          // Smart retry logic with AbortError handling
          if (error instanceof Error) {
            // Never retry AbortErrors (component unmount, request cancellation)
            if (error.name === 'AbortError') return false;
            // Don't retry on 4xx errors
            if (error.message.includes('4')) return false;
            // Retry up to 3 times for network errors
            if (error.message.includes('NetworkError')) return failureCount < 3;
          }
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false, // Disable for performance
        refetchOnReconnect: 'always',
        // Structural sharing for optimal re-renders
        structuralSharing: true,
        // Global error handling - React Query v5 uses throwOnError instead of useErrorBoundary
        throwOnError: (error) => {
          // Don't throw for AbortErrors to prevent error boundaries
          if (error instanceof Error && error.name === 'AbortError') {
            return false;
          }
          return true;
        },
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      },
    },
  });

  // Set up global error handling for query cache - React Query v5
  queryClient.getQueryCache().subscribe((event) => {
    // React Query v5 changed event types - handle query failures differently
    if (event.type === 'updated' && event.query.state.status === 'error') {
      const { error } = event.query.state;
      // Suppress AbortError logs in development
      if (error instanceof Error && error.name === 'AbortError') {
        // Don't log AbortErrors - they're normal during development hot reloads
        return;
      }
      // Log other errors normally only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Query failed:', error, 'Query key:', event.query.queryKey);
      }
    }
  });

  return queryClient;
}

// Global query client for SSR
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always create a new query client
    return makeQueryClient();
  } else {
    // Browser: reuse query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  // Use state to ensure we don't re-create on every render
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false} 
          buttonPosition="bottom-right"
          styleNonce={undefined}
        />
      )}
    </QueryClientProvider>
  );
}

// Export pre-configured query options for common use cases
export const queryOptions = {
  // User data - longer cache
  user: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
  
  // Session data - medium cache
  session: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  },
  
  // Metrics data - short cache
  metrics: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute
  },
  
  // Static data - long cache
  static: {
    staleTime: Infinity,
    gcTime: Infinity,
  },
  
  // Real-time data - no cache
  realtime: {
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 5000, // Poll every 5 seconds
  },
};

// Prefetch helper for server components
export async function prefetchQuery<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  options = {}
) {
  const queryClient = getQueryClient();
  
  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
    ...options,
  });
  
  return queryClient;
}