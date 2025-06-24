// React Query setup with optimized caching for therapy application
import { 
  QueryClient, 
  MutationCache, 
  QueryCache,
  DefaultOptions 
} from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client-core'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

// Cache configuration for different data types
const CACHE_TIMES = {
  // User data - frequently accessed, medium freshness
  user: {
    staleTime: 5 * 60 * 1000,    // 5 minutes fresh
    gcTime: 30 * 60 * 1000       // 30 minutes in cache
  },
  
  // Session data - real-time important, short freshness
  session: {
    staleTime: 30 * 1000,        // 30 seconds fresh
    gcTime: 5 * 60 * 1000        // 5 minutes in cache
  },
  
  // Profile data - changes rarely, long freshness
  profile: {
    staleTime: 10 * 60 * 1000,   // 10 minutes fresh
    gcTime: 60 * 60 * 1000       // 1 hour in cache
  },
  
  // Metrics data - analytical, can be stale
  metrics: {
    staleTime: 2 * 60 * 1000,    // 2 minutes fresh
    gcTime: 15 * 60 * 1000       // 15 minutes in cache
  },
  
  // Static data - rarely changes, very long freshness
  static: {
    staleTime: 60 * 60 * 1000,   // 1 hour fresh
    gcTime: 24 * 60 * 60 * 1000  // 24 hours in cache
  }
}

// Query key factories for consistent caching
export const queryKeys = {
  user: {
    all: ['user'] as const,
    profile: (userId: string) => ['user', 'profile', userId] as const,
    sessions: (userId: string) => ['user', 'sessions', userId] as const,
    metrics: (userId: string, timeRange?: string) => 
      ['user', 'metrics', userId, timeRange] as const,
    familyMembers: (userId: string) => ['user', 'familyMembers', userId] as const
  },
  
  session: {
    all: ['session'] as const,
    active: ['session', 'active'] as const,
    byId: (sessionId: string) => ['session', 'byId', sessionId] as const,
    transcript: (sessionId: string) => ['session', 'transcript', sessionId] as const,
    recovery: ['session', 'recovery'] as const
  },
  
  dashboard: {
    all: ['dashboard'] as const,
    metrics: (timeRange: string) => ['dashboard', 'metrics', timeRange] as const,
    progress: (userId: string) => ['dashboard', 'progress', userId] as const
  },
  
  static: {
    plans: ['static', 'plans'] as const,
    faqs: ['static', 'faqs'] as const,
    assistants: ['static', 'assistants'] as const
  }
}

// Error handling for queries and mutations
const handleQueryError = (error: Error, query: any) => {
  console.error(`Query failed: ${query.queryKey.join('.')}`, error)
  
  // Report critical errors to monitoring
  if (error.message.includes('500') || error.message.includes('network')) {
    // Send to error tracking service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'query_error', {
        query_key: query.queryKey.join('.'),
        error_message: error.message,
        page_path: window.location.pathname
      })
    }
  }
}

const handleMutationError = (error: Error, variables: any, context: any, mutation: any) => {
  console.error(`Mutation failed: ${mutation.mutationKey?.join('.')}`, error)
  
  // Show user-friendly error message
  if (typeof window !== 'undefined') {
    // You can integrate with your toast/notification system here
    console.warn('Mutation failed, showing user notification')
  }
}

// Default query options
const defaultQueryOptions: DefaultOptions = {
  queries: {
    staleTime: CACHE_TIMES.user.staleTime,
    gcTime: CACHE_TIMES.user.gcTime,
    retry: (failureCount, error: any) => {
      // Don't retry 4xx errors
      if (error?.status >= 400 && error?.status < 500) {
        return false
      }
      // Retry up to 3 times for network errors
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
  },
  
  mutations: {
    retry: 1,
    retryDelay: 1000
  }
}

// Create optimized query client
export function createOptimizedQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: defaultQueryOptions,
    
    queryCache: new QueryCache({
      onError: handleQueryError,
      onSuccess: (data, query) => {
        // Optional: Log successful queries in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Query success: ${query.queryKey.join('.')}`)
        }
      }
    }),
    
    mutationCache: new MutationCache({
      onError: handleMutationError,
      onSuccess: (data, variables, context, mutation) => {
        // Invalidate related queries after successful mutations
        const mutationKey = mutation.mutationKey?.[0]
        
        switch (mutationKey) {
          case 'updateProfile':
            queryClient.invalidateQueries({ queryKey: queryKeys.user.all })
            break
          case 'createSession':
            queryClient.invalidateQueries({ queryKey: queryKeys.session.all })
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
            break
          case 'updateMetrics':
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics() })
            break
        }
      }
    })
  })
  
  return queryClient
}

// Persist query client for offline support
export function setupQueryPersistence(queryClient: QueryClient) {
  if (typeof window === 'undefined') return
  
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: 'therapy-app-cache',
    throttleTime: 1000,
    serialize: JSON.stringify,
    deserialize: JSON.parse
  })
  
  persistQueryClient({
    queryClient,
    persister,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    buster: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
  })
}

// Hook for optimistic updates
export function useOptimisticMutation<TData, TVariables>({
  mutationFn,
  queryKey,
  updateFn,
  mutationKey
}: {
  mutationFn: (variables: TVariables) => Promise<TData>
  queryKey: readonly unknown[]
  updateFn: (oldData: TData | undefined, variables: TVariables) => TData
  mutationKey?: readonly unknown[]
}) {
  const queryClient = new QueryClient()
  
  return {
    mutate: async (variables: TVariables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey })
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData<TData>(queryKey)
      
      // Optimistically update
      queryClient.setQueryData<TData>(queryKey, (old) => updateFn(old, variables))
      
      // Return context with rollback function
      return { previousData }
    },
    
    onError: (error: Error, variables: TVariables, context: any) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
    },
    
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey })
    }
  }
}

// Custom hooks for common queries
export const useOptimizedQuery = {
  userProfile: (userId: string, options?: any) => ({
    queryKey: queryKeys.user.profile(userId),
    queryFn: () => fetch(`/api/user/profile`).then(res => res.json()),
    ...CACHE_TIMES.profile,
    ...options
  }),
  
  activeSessions: (userId: string, options?: any) => ({
    queryKey: queryKeys.session.active,
    queryFn: () => fetch(`/api/sessions/active`).then(res => res.json()),
    ...CACHE_TIMES.session,
    ...options
  }),
  
  dashboardMetrics: (timeRange: string = '7d', options?: any) => ({
    queryKey: queryKeys.dashboard.metrics(timeRange),
    queryFn: () => fetch(`/api/dashboard/metrics?range=${timeRange}`).then(res => res.json()),
    ...CACHE_TIMES.metrics,
    ...options
  })
}

export default createOptimizedQueryClient