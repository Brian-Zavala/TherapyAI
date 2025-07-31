// src/hooks/useDashboardDataWithTherapyTypes.ts
"use client";

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { TherapyType } from '@/components/dashboard/TherapyTypeTabs';
import { 
  getFallbackCommunicationMetrics,
  getFallbackRelationshipProgress,
  getFallbackSessionData,
  getFallbackAIInsights,
  cacheSuccessfulQueryData,
  withFallbackCaching
} from '@/lib/dashboard-fallbacks';

// Enhanced dashboard data fetcher with therapy type support
interface TherapyTypeAwareDashboardData {
  // Communication metrics per therapy type
  communicationMetrics: Record<TherapyType, any>;
  
  // Relationship progress per therapy type (excludes solo)
  relationshipProgress: Record<Exclude<TherapyType, 'solo'>, any>;
  
  // AI insights per therapy type
  aiInsights: Record<TherapyType, any>;
  
  // Session analytics per therapy type
  sessionAnalytics: Record<TherapyType, any>;
  
  // Loading states per therapy type
  loading: Record<string, boolean>;
  
  // Error states per therapy type
  errors: Record<string, string | null>;
  
  // Session counts per therapy type
  sessionCounts: Record<TherapyType, number>;
}

interface UseDashboardDataWithTherapyTypesOptions {
  // Which therapy types to fetch data for
  therapyTypes?: TherapyType[];
  
  // Enable real-time updates
  enableRealTime?: boolean;
  
  // Refetch interval
  refetchInterval?: number;
  
  // Stale time
  staleTime?: number;
  
  // Error callback
  onError?: (error: Error) => void;
}

// Generate cache keys for therapy-type-aware data
const generateCacheKey = (endpoint: string, therapyType: TherapyType, userId?: string) => {
  return ['dashboard', endpoint, therapyType, userId].filter(Boolean);
};

// Fetch function for individual therapy type data
const fetchTherapyTypeData = async (
  endpoint: string, 
  therapyType: TherapyType,
  signal?: AbortSignal,
  activeSessionId?: string | null
): Promise<any> => {
  const url = new URL(`/api/dashboard/${endpoint}`, window.location.origin);
  url.searchParams.set('type', therapyType);
  
  // Add session ID for real-time data if available
  if (activeSessionId) {
    url.searchParams.set('sessionId', activeSessionId);
  }
  
  const response = await fetch(url.toString(), { signal });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to fetch ${endpoint} for ${therapyType}`);
  }
  
  return response.json();
};

// Main hook for therapy-type-aware dashboard data
export function useDashboardDataWithTherapyTypes(
  options: UseDashboardDataWithTherapyTypesOptions = {}
) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  
  const {
    therapyTypes = ['solo', 'couple', 'family'],
    enableRealTime = true,
    refetchInterval = 5 * 60 * 1000, // 5 minutes
    staleTime = 2 * 60 * 1000, // 2 minutes
    onError
  } = options;

  const userId = session?.user?.id;

  // Communication metrics queries - Individual queries to prevent AbortError cascade
  const communicationQueries = therapyTypes.reduce((acc, type) => {
    acc[type] = useQuery({
      queryKey: ['dashboard', 'communication-metrics', type, userId],
      queryFn: async ({ signal }) => {
        try {
          return await fetchTherapyTypeData('communication-metrics', type, signal);
        } catch (error) {
          // Only log non-AbortErrors to prevent console flooding during development
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error(`Failed to fetch communication metrics for ${type}:`, error);
          }
          if (onError && error instanceof Error && error.name !== 'AbortError') {
            onError(error);
          }
          throw error;
        }
      },
      enabled: !!userId,
      staleTime,
      refetchInterval: enableRealTime ? refetchInterval : false,
      retry: (failureCount, error) => {
        // Don't retry on AbortError to prevent cascade issues
        if (error.name === 'AbortError') return false;
        return failureCount < 2;
      }
    });
    return acc;
  }, {} as Record<TherapyType, any>);

  // Relationship progress queries (excludes solo) - Individual queries to prevent AbortError cascade
  const relationshipTypes = therapyTypes.filter(type => type !== 'solo') as Exclude<TherapyType, 'solo'>[];
  const progressQueries = relationshipTypes.reduce((acc, type) => {
    acc[type] = useQuery({
      queryKey: ['dashboard', 'relationship-progress', type, userId],
      queryFn: async ({ signal }) => {
        try {
          return await fetchTherapyTypeData('relationship-progress', type, signal);
        } catch (error) {
          // Only log non-AbortErrors to prevent console flooding during development
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error(`Failed to fetch relationship progress for ${type}:`, error);
          }
          if (onError && error instanceof Error && error.name !== 'AbortError') {
            onError(error);
          }
          throw error;
        }
      },
      enabled: !!userId,
      staleTime,
      refetchInterval: enableRealTime ? refetchInterval : false,
      retry: (failureCount, error) => {
        // Don't retry on AbortError to prevent cascade issues
        if (error.name === 'AbortError') return false;
        return failureCount < 2;
      }
    });
    return acc;
  }, {} as Record<Exclude<TherapyType, 'solo'>, any>);

  // AI insights queries - Individual queries to prevent AbortError cascade
  const insightsQueries = therapyTypes.reduce((acc, type) => {
    acc[type] = useQuery({
      queryKey: ['dashboard', 'ai-insights', type, userId],
      queryFn: async ({ signal }) => {
        try {
          // For now, AI insights might use a different endpoint or same data
          // We'll use communication-metrics as a base and enhance later
          return await fetchTherapyTypeData('communication-metrics', type, signal);
        } catch (error) {
          // Only log non-AbortErrors to prevent console flooding during development
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error(`Failed to fetch AI insights for ${type}:`, error);
          }
          if (onError && error instanceof Error && error.name !== 'AbortError') {
            onError(error);
          }
          throw error;
        }
      },
      enabled: !!userId,
      staleTime,
      refetchInterval: enableRealTime ? refetchInterval : false,
      retry: (failureCount, error) => {
        // Don't retry on AbortError to prevent cascade issues
        if (error.name === 'AbortError') return false;
        return failureCount < 2;
      }
    });
    return acc;
  }, {} as Record<TherapyType, any>);

  // Session counts query
  const sessionCountsQuery = useQuery({
    queryKey: ['dashboard', 'session-counts', 'all-types', userId],
    queryFn: async ({ signal }) => {
      const url = new URL('/api/sessions/counts', window.location.origin);
      const response = await fetch(url.toString(), { signal });
      
      if (!response.ok) {
        throw new Error('Failed to fetch session counts');
      }
      
      const data = await response.json();
      return data as Record<TherapyType, number>;
    },
    enabled: !!userId,
    staleTime,
    refetchInterval: enableRealTime ? refetchInterval : false,
    retry: (failureCount, error) => {
      // Don't retry on AbortError to prevent cascade issues
      if (error.name === 'AbortError') return false;
      return failureCount < 2;
    }
  });

  // Refetch functions for individual therapy types
  const refetchForTherapyType = useCallback(async (
    endpoint: 'communication-metrics' | 'relationship-progress' | 'ai-insights',
    therapyType: TherapyType
  ) => {
    const cacheKey = generateCacheKey(endpoint, therapyType, userId);
    await queryClient.invalidateQueries({ queryKey: cacheKey });
  }, [queryClient, userId]);

  // Refetch all data for a specific therapy type
  const refetchTherapyType = useCallback(async (therapyType: TherapyType) => {
    const promises = [
      refetchForTherapyType('communication-metrics', therapyType),
      refetchForTherapyType('ai-insights', therapyType)
    ];
    
    // Only refetch relationship progress for non-solo types
    if (therapyType !== 'solo') {
      promises.push(refetchForTherapyType('relationship-progress', therapyType));
    }
    
    await Promise.all(promises);
  }, [refetchForTherapyType]);

  // Compute loading and error states from individual queries
  const loading = useMemo(() => ({
    communicationMetrics: Object.values(communicationQueries).some((query: any) => query.isLoading),
    relationshipProgress: Object.values(progressQueries).some((query: any) => query.isLoading),
    aiInsights: Object.values(insightsQueries).some((query: any) => query.isLoading),
    sessionCounts: sessionCountsQuery.isLoading
  }), [
    communicationQueries,
    progressQueries,
    insightsQueries,
    sessionCountsQuery.isLoading
  ]);

  const errors = useMemo(() => ({
    communicationMetrics: Object.values(communicationQueries).find((query: any) => query.error)?.error?.message || null,
    relationshipProgress: Object.values(progressQueries).find((query: any) => query.error)?.error?.message || null,
    aiInsights: Object.values(insightsQueries).find((query: any) => query.error)?.error?.message || null,
    sessionCounts: sessionCountsQuery.error?.message || null
  }), [
    communicationQueries,
    progressQueries,
    insightsQueries,
    sessionCountsQuery.error
  ]);

  // Aggregate data from individual queries
  const communicationData = useMemo(() => {
    const result: Record<TherapyType, any> = {} as Record<TherapyType, any>;
    Object.entries(communicationQueries).forEach(([type, query]: [string, any]) => {
      result[type as TherapyType] = query.data || null;
    });
    return result;
  }, [communicationQueries]);

  const progressData = useMemo(() => {
    const result: Record<Exclude<TherapyType, 'solo'>, any> = {} as Record<Exclude<TherapyType, 'solo'>, any>;
    Object.entries(progressQueries).forEach(([type, query]: [string, any]) => {
      result[type as Exclude<TherapyType, 'solo'>] = query.data || null;
    });
    return result;
  }, [progressQueries]);

  const insightsData = useMemo(() => {
    const result: Record<TherapyType, any> = {} as Record<TherapyType, any>;
    Object.entries(insightsQueries).forEach(([type, query]: [string, any]) => {
      result[type as TherapyType] = query.data || null;
    });
    return result;
  }, [insightsQueries]);

  // Main data object
  const data: TherapyTypeAwareDashboardData = useMemo(() => ({
    communicationMetrics: communicationData,
    relationshipProgress: progressData,
    aiInsights: insightsData,
    sessionAnalytics: {}, // Placeholder for future session analytics
    loading,
    errors,
    sessionCounts: sessionCountsQuery.data || { solo: 0, couple: 0, family: 0 }
  }), [
    communicationData,
    progressData,
    insightsData,
    sessionCountsQuery.data,
    loading,
    errors
  ]);

  return {
    data,
    isLoading: Object.values(loading).some(Boolean),
    isError: Object.values(errors).some(Boolean),
    errors,
    loading,
    refetchTherapyType,
    refetchForTherapyType,
    // Individual query objects for fine-grained control
    queries: {
      communicationMetrics: communicationQueries,
      relationshipProgress: progressQueries,
      aiInsights: insightsQueries,
      sessionCounts: sessionCountsQuery
    }
  };
}

// Optimized hook for individual therapy type data to prevent AbortErrors
export function useTherapyTypeData(therapyType: TherapyType, activeSessionId?: string | null) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  
  // Memoize values to prevent unnecessary re-renders
  const memoizedTherapyType = useMemo(() => therapyType, [therapyType]);
  const memoizedUserId = useMemo(() => userId, [userId]);
  const memoizedSessionId = useMemo(() => activeSessionId, [activeSessionId]);
  const sessionKey = memoizedSessionId || 'historical';

  // Individual queries per therapy type to prevent cancellation cascade
  const communicationQuery = useQuery(withFallbackCaching({
    queryKey: ['dashboard', 'communication-metrics', memoizedTherapyType, memoizedUserId, sessionKey],
    queryFn: async ({ signal }) => {
      try {
        const data = await fetchTherapyTypeData('communication-metrics', memoizedTherapyType, signal, memoizedSessionId);
        // Cache successful data for fallback use
        cacheSuccessfulQueryData(['communication-metrics', memoizedTherapyType], data);
        return data;
      } catch (error) {
        // Only log non-AbortErrors to prevent console flooding during development
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error(`Failed to fetch communication metrics for ${memoizedTherapyType}:`, error);
        }
        throw error;
      }
    },
    enabled: !!memoizedUserId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      // Don't retry on AbortError to prevent cascade issues
      if (error.name === 'AbortError') return false;
      return failureCount < 2;
    },
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    // Use fallback data on error
    useErrorBoundary: false,
    keepPreviousData: true
  }, 'communication-metrics', memoizedTherapyType));

  const progressQuery = useQuery(withFallbackCaching({
    queryKey: ['dashboard', 'relationship-progress', memoizedTherapyType, memoizedUserId, sessionKey],
    queryFn: async ({ signal }) => {
      if (memoizedTherapyType === 'solo') return null; // Skip for solo therapy
      try {
        const data = await fetchTherapyTypeData('relationship-progress', memoizedTherapyType, signal, memoizedSessionId);
        // Cache successful data for fallback use
        cacheSuccessfulQueryData(['relationship-progress', memoizedTherapyType], data);
        return data;
      } catch (error) {
        // Only log non-AbortErrors to prevent console flooding during development
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error(`Failed to fetch relationship progress for ${memoizedTherapyType}:`, error);
        }
        throw error;
      }
    },
    enabled: !!memoizedUserId && memoizedTherapyType !== 'solo',
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.name === 'AbortError') return false;
      return failureCount < 2;
    },
    refetchInterval: 5 * 60 * 1000,
    useErrorBoundary: false,
    keepPreviousData: true
  }, 'relationship-progress', memoizedTherapyType));

  const insightsQuery = useQuery(withFallbackCaching({
    queryKey: ['dashboard', 'ai-insights', memoizedTherapyType, memoizedUserId, sessionKey],
    queryFn: async ({ signal }) => {
      try {
        // For AI insights, use the therapy-insights endpoint instead
        const url = new URL('/api/therapy-insights', window.location.origin);
        url.searchParams.set('type', memoizedTherapyType);
        if (memoizedSessionId) {
          url.searchParams.set('sessionId', memoizedSessionId);
        }
        
        const response = await fetch(url.toString(), { signal });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch' }));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        // Cache successful data for fallback use
        cacheSuccessfulQueryData(['ai-insights', memoizedTherapyType], data);
        return data;
      } catch (error) {
        // Only log non-AbortErrors to prevent console flooding during development
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error(`Failed to fetch AI insights for ${memoizedTherapyType}:`, error);
        }
        throw error;
      }
    },
    enabled: !!memoizedUserId,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.name === 'AbortError') return false;
      return failureCount < 2;
    },
    refetchInterval: 5 * 60 * 1000,
    useErrorBoundary: false,
    keepPreviousData: true
  }, 'ai-insights', memoizedTherapyType));

  const sessionCountQuery = useQuery(withFallbackCaching({
    queryKey: ['dashboard', 'session-counts', memoizedTherapyType, memoizedUserId],
    queryFn: async ({ signal }) => {
      try {
        const url = new URL('/api/sessions/counts', window.location.origin);
        const response = await fetch(url.toString(), { signal });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `Failed to fetch session counts (${response.status})`);
        }
        
        const data = await response.json();
        const sessionCount = data[memoizedTherapyType] || 0;
        // Cache successful data for fallback use
        cacheSuccessfulQueryData(['session-counts', memoizedTherapyType], sessionCount);
        return sessionCount;
      } catch (error) {
        // Only log non-AbortErrors to prevent console flooding during development
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error(`Failed to fetch session counts for ${memoizedTherapyType}:`, error);
        }
        throw error;
      }
    },
    enabled: !!memoizedUserId,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.name === 'AbortError') return false;
      return failureCount < 2;
    },
    refetchInterval: 5 * 60 * 1000,
    useErrorBoundary: false,
    keepPreviousData: true
  }, 'session-counts', memoizedTherapyType));

  // Enhanced refetch with better error handling and cleanup
  const refetch = useCallback(async () => {
    try {
      const promises = [
        communicationQuery.refetch(),
        insightsQuery.refetch(),
        sessionCountQuery.refetch()
      ];
      
      if (memoizedTherapyType !== 'solo') {
        promises.push(progressQuery.refetch());
      }
      
      const results = await Promise.allSettled(promises);
      
      // Check for any rejected promises (but ignore AbortErrors)
      const failures = results.filter((result, index) => {
        if (result.status === 'rejected') {
          const error = result.reason;
          if (error?.name === 'AbortError') {
            return false; // Don't count AbortErrors as failures
          }
          return true;
        }
        return false;
      });
      
      if (failures.length > 0) {
        console.warn(`Some queries failed to refetch for ${memoizedTherapyType}:`, failures);
      }
      
      return results;
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error(`Refetch failed for ${memoizedTherapyType}:`, error);
      }
      throw error;
    }
  }, [communicationQuery, insightsQuery, sessionCountQuery, progressQuery, memoizedTherapyType]);

  // Memoized computed values to prevent unnecessary re-renders
  const isLoading = useMemo(() => {
    return communicationQuery.isLoading || 
           insightsQuery.isLoading || 
           sessionCountQuery.isLoading || 
           (memoizedTherapyType !== 'solo' && progressQuery.isLoading);
  }, [
    communicationQuery.isLoading,
    insightsQuery.isLoading,
    sessionCountQuery.isLoading,
    progressQuery.isLoading,
    memoizedTherapyType
  ]);
  
  // Filter out AbortErrors from the error state
  const error = useMemo(() => {
    const errors = [
      communicationQuery.error,
      progressQuery.error,
      insightsQuery.error,
      sessionCountQuery.error
    ].filter(err => err && err.name !== 'AbortError');
    
    return errors[0] || null;
  }, [
    communicationQuery.error,
    progressQuery.error,
    insightsQuery.error,
    sessionCountQuery.error
  ]);
  
  // Enhanced data with fallbacks
  const data = useMemo(() => {
    // CRITICAL FIX: Only use real data, no fallbacks to ensure accuracy
    const communicationMetrics = communicationQuery.data || null;
    
    const relationshipProgress = memoizedTherapyType === 'solo' ? null : 
      (progressQuery.data || null);
    
    const aiInsights = insightsQuery.data || null;
    
    const sessionCount = sessionCountQuery.data ?? 0;
    
    return {
      communicationMetrics,
      relationshipProgress,
      aiInsights,
      sessionCount,
    };
  }, [
    communicationQuery.data,
    communicationQuery.error,
    progressQuery.data,
    progressQuery.error,
    insightsQuery.data,
    insightsQuery.error,
    sessionCountQuery.data,
    sessionCountQuery.error,
    memoizedTherapyType
  ]);
  
  // Enhanced status tracking
  const status = useMemo(() => {
    if (isLoading) return 'loading';
    if (error) return 'error';
    if (data.communicationMetrics || data.sessionCount > 0) return 'success';
    return 'idle';
  }, [isLoading, error, data.communicationMetrics, data.sessionCount]);

  return {
    ...data,
    isLoading,
    error,
    status,
    refetch,
    // Additional utility flags
    hasData: !!(data.communicationMetrics || data.sessionCount > 0),
    isError: !!error,
    isSuccess: status === 'success',
    isIdle: status === 'idle',
    // Query states for debugging
    queryStates: process.env.NODE_ENV === 'development' ? {
      communication: { loading: communicationQuery.isLoading, error: communicationQuery.error?.name },
      progress: { loading: progressQuery.isLoading, error: progressQuery.error?.name },
      insights: { loading: insightsQuery.isLoading, error: insightsQuery.error?.name },
      sessionCount: { loading: sessionCountQuery.isLoading, error: sessionCountQuery.error?.name }
    } : undefined
  };
}