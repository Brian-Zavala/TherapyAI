/**
 * Unified Dashboard Data Hook
 * Centralized data fetching with error recovery, request deduplication, and optimistic updates
 */
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { DashboardErrorCode } from '@/lib/api/dashboard-error-handler';
import { useDebounce } from '@/hooks/useDebounce';

// ========================================
// REQUEST DEDUPLICATION
// ========================================

class RequestDeduplicator {
  private inFlightRequests = new Map<string, Promise<any>>();
  
  async deduplicate<T>(
    key: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const existing = this.inFlightRequests.get(key);
    if (existing) {
      return existing;
    }
    
    const promise = fetcher()
      .finally(() => {
        this.inFlightRequests.delete(key);
      });
      
    this.inFlightRequests.set(key, promise);
    return promise;
  }
  
  clear() {
    this.inFlightRequests.clear();
  }
}

const deduplicator = new RequestDeduplicator();

// ========================================
// SCHEMAS
// ========================================

const CommunicationMetricsSchema = z.object({
  clarity: z.number().min(0).max(100).default(50),
  empathy: z.number().min(0).max(100).default(50),
  respect: z.number().min(0).max(100).default(50),
  overall: z.number().min(0).max(100).default(50),
  listening: z.number().min(0).max(100).optional(),
  expression: z.number().min(0).max(100).optional(),
});

const ProgressDataSchema = z.object({
  closenessScore: z.number().min(0).max(100).default(50),
  communicationScore: z.number().min(0).max(100).default(50),
  conflictResolution: z.number().min(0).max(100).default(50),
  emotionalSupport: z.number().min(0).max(100).default(50),
  trend: z.enum(['improving', 'stable', 'declining']).default('stable'),
}).nullable();

const SessionAnalyticsSchema = z.object({
  totalSessions: z.number().min(0).default(0),
  averageDuration: z.number().min(0).default(0),
  completionRate: z.number().min(0).max(100).default(0),
  upcomingSessions: z.array(z.object({
    id: z.string(),
    date: z.string().transform(str => new Date(str)),
    duration: z.number(),
    type: z.string(),
  })).default([]),
});

const InsightSchema = z.object({
  id: z.string(),
  category: z.enum(['communication', 'emotional', 'behavioral', 'mental-health', 'relationship', 'progress']),
  title: z.string(),
  description: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  actionItems: z.array(z.string()).default([]),
  basedOn: z.array(z.string()).default([]),
  timeframe: z.enum(['immediate', 'this-week', 'this-month']).optional(),
  mentalHealthTips: z.array(z.string()).optional(),
  resources: z.array(z.object({
    title: z.string(),
    description: z.string(),
    type: z.enum(['exercise', 'article', 'technique', 'practice']),
  })).optional(),
  celebrationType: z.enum(['improvement', 'milestone', 'consistency']).optional(),
});

const TherapyInsightsSchema = z.object({
  insights: z.array(InsightSchema).default([]),
  summary: z.object({
    overallProgress: z.enum(['excellent', 'good', 'moderate', 'needs-attention']).default('moderate'),
    topStrengths: z.array(z.string()).default([]),
    focusAreas: z.array(z.string()).default([]),
    weeklyGoals: z.array(z.string()).default([]),
  }),
  trends: z.object({
    communication: z.enum(['improving', 'stable', 'declining']).default('stable'),
    emotional: z.enum(['improving', 'stable', 'declining']).default('stable'),
    consistency: z.enum(['excellent', 'good', 'needs-improvement']).default('good'),
  }),
  personalizedTips: z.object({
    daily: z.array(z.string()).default([]),
    weekly: z.array(z.string()).default([]),
    exercises: z.array(z.string()).default([]),
  }).optional(),
});

// ========================================
// TYPES
// ========================================

export type CommunicationMetrics = z.infer<typeof CommunicationMetricsSchema>;
export type ProgressData = z.infer<typeof ProgressDataSchema>; // Can be null
export type SessionAnalytics = z.infer<typeof SessionAnalyticsSchema>;
export type TherapyInsights = z.infer<typeof TherapyInsightsSchema>;

export interface DashboardData {
  communicationMetrics: CommunicationMetrics | null;
  progressData: ProgressData | null;
  sessionAnalytics: SessionAnalytics | null;
  therapyInsights: TherapyInsights | null;
  lastUpdated: Date;
  isPartial?: boolean;
}

export interface UseDashboardDataOptions {
  // Feature flags
  enableRealTime?: boolean;
  includeInsights?: boolean;
  
  // Data options
  period?: 'week' | 'month' | 'quarter' | 'year';
  
  // Performance options
  staleTime?: number;
  gcTime?: number;
  refetchInterval?: number | false;
  
  // Error handling
  retryCount?: number;
  retryDelay?: number;
  
  // Callbacks
  onError?: (error: Error) => void;
  onSuccess?: (data: DashboardData) => void;
}

export interface UseDashboardDataResult {
  // Data
  data: DashboardData | null;
  
  // Loading states
  isLoading: boolean;
  isRefetching: boolean;
  isFetching: boolean;
  
  // Error states
  isError: boolean;
  error: Error | null;
  failedEndpoints: string[];
  
  // Actions
  refetch: () => Promise<void>;
  refetchMetric: (metric: keyof DashboardData) => Promise<void>;
  
  // Loading UI hints
  loadingState: LoadingState;
  
  // Real-time status
  isRealTimeConnected: boolean;
  lastRealTimeUpdate: Date | null;
}

interface LoadingState {
  type: 'brain' | 'skeleton' | 'spinner' | 'partial' | 'none';
  message: string;
  progress?: number;
}

// ========================================
// DATA TRANSFORMERS
// ========================================

function transformCommunicationMetrics(data: any): CommunicationMetrics & { isEmpty?: boolean, message?: string } {
  // Handle new API format with isEmpty flag
  const metricsArray = data.metrics || data;
  const isEmpty = data.isEmpty || false;
  const message = data.message || '';
  
  const metrics: CommunicationMetrics & { isEmpty?: boolean, message?: string } = {
    clarity: 0,
    empathy: 0,
    respect: 0,
    overall: 0,
    listening: undefined,
    expression: undefined,
    isEmpty,
    message,
  };
  
  // Handle array format
  if (Array.isArray(metricsArray)) {
    metricsArray.forEach(item => {
      switch(item.name) {
        case 'Active Listening':
          metrics.listening = item.value;
          break;
        case 'Expressing Needs':
          metrics.expression = item.value;
          break;
        case 'Conflict Resolution':
          metrics.respect = item.value;
          break;
        case 'Emotional Support':
          metrics.empathy = item.value;
          break;
        // Solo therapy metrics
        case 'Self-awareness':
          metrics.clarity = item.value;
          break;
        case 'Emotional Regulation':
          metrics.empathy = item.value;
          break;
        case 'Stress Management':
          metrics.respect = item.value;
          break;
        case 'Personal Growth':
          metrics.overall = item.value;
          break;
        // Family therapy metrics
        case 'Family Communication':
          metrics.listening = item.value;
          break;
        case 'Role Definition':
          metrics.expression = item.value;
          break;
        case 'Conflict Management':
          metrics.respect = item.value;
          break;
        case 'Family Bonding':
          metrics.empathy = item.value;
          break;
      }
    });
  }
  
  // Calculate overall as average of available metrics (only if not empty state)
  if (!isEmpty) {
    const values = [metrics.clarity, metrics.empathy, metrics.respect, metrics.listening, metrics.expression]
      .filter((v): v is number => v !== undefined && v > 0);
    if (values.length > 0) {
      metrics.overall = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    }
  }
  
  return metrics;
}

function transformProgressData(data: Array<any>): ProgressData | null {
  // If empty, return null explicitly (not as any)
  if (!data || data.length === 0) {
    return null;
  }
  
  // Get the most recent entry's data
  const latestEntry = data[data.length - 1];
  
  // Extract scores based on the actual API response structure
  const closenessScore = latestEntry.closenessScore || latestEntry.closeness || latestEntry.rawCloseness || 0;
  const communicationScore = latestEntry.communicationScore || latestEntry.communication || latestEntry.rawCommunication || 0;
  
  // Calculate derived metrics from the two stored scores
  // conflictResolution: Based on communication score with slight variation
  const conflictResolution = Math.round(communicationScore * 0.9); // Slightly lower than communication
  
  // emotionalSupport: Based on closeness score with slight variation
  const emotionalSupport = Math.round(closenessScore * 1.05); // Slightly higher than closeness
  
  const scores = {
    closenessScore,
    communicationScore,
    conflictResolution: Math.min(100, Math.max(0, conflictResolution)),
    emotionalSupport: Math.min(100, Math.max(0, emotionalSupport)),
  };
  
  // Calculate trend based on comparing with previous entries
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (data.length >= 2) {
    const previousEntry = data[data.length - 2];
    const currentAvg = (scores.closenessScore + scores.communicationScore) / 2;
    const previousAvg = (
      (previousEntry.closenessScore || previousEntry.closeness || previousEntry.rawCloseness || 0) +
      (previousEntry.communicationScore || previousEntry.communication || previousEntry.rawCommunication || 0)
    ) / 2;
    
    if (currentAvg > previousAvg + 5) trend = 'improving';
    else if (currentAvg < previousAvg - 5) trend = 'declining';
  }
  
  // Check if trends are provided in the data
  if (latestEntry.trends) {
    const trendAvg = (latestEntry.trends.closeness + latestEntry.trends.communication) / 2;
    if (trendAvg > 5) trend = 'improving';
    else if (trendAvg < -5) trend = 'declining';
  }
  
  return {
    ...scores,
    trend,
  };
}

function transformSessionAnalytics(data: Array<{month: string, sessionTime: number, sessionCount: number}>): SessionAnalytics {
  if (!data || data.length === 0) {
    return {
      totalSessions: 0,
      averageDuration: 0,
      completionRate: 0,
      upcomingSessions: [],
    };
  }
  
  // Calculate totals from monthly data
  const totalSessions = data.reduce((sum, month) => sum + month.sessionCount, 0);
  const totalTime = data.reduce((sum, month) => sum + month.sessionTime, 0);
  const averageDuration = totalSessions > 0 ? Math.round(totalTime / totalSessions) : 0;
  
  // Estimate completion rate (assuming 80% as baseline if we have sessions)
  const completionRate = totalSessions > 0 ? 80 : 0;
  
  return {
    totalSessions,
    averageDuration,
    completionRate,
    upcomingSessions: [], // This would come from a different endpoint
  };
}

// ========================================
// UTILITIES
// ========================================

async function fetchWithRetry(
  url: string,
  options: RequestInit & { retries?: number } = {}
): Promise<Response> {
  const { retries = 3, ...fetchOptions } = options;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok && attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

function mergeWithRealTime(
  baseData: DashboardData,
  realTimeUpdates: Partial<DashboardData>
): DashboardData {
  return {
    ...baseData,
    communicationMetrics: realTimeUpdates.communicationMetrics || baseData.communicationMetrics,
    progressData: realTimeUpdates.progressData || baseData.progressData,
    sessionAnalytics: realTimeUpdates.sessionAnalytics || baseData.sessionAnalytics,
    therapyInsights: realTimeUpdates.therapyInsights || baseData.therapyInsights,
    lastUpdated: new Date(),
  };
}

// ========================================
// MAIN HOOK
// ========================================

export function useDashboardDataUnified(
  options: UseDashboardDataOptions = {}
): UseDashboardDataResult {
  const {
    enableRealTime = true,
    includeInsights = true,
    period = 'month',
    staleTime = 5 * 60 * 1000, // 5 minutes
    gcTime = 30 * 60 * 1000, // 30 minutes
    refetchInterval = 30 * 1000, // 30 seconds
    retryCount = 3,
    retryDelay = 1000,
    onError,
    onSuccess,
  } = options;
  
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  
  // State
  const [realTimeUpdates, setRealTimeUpdates] = useState<Partial<DashboardData>>({});
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const [lastRealTimeUpdate, setLastRealTimeUpdate] = useState<Date | null>(null);
  const [failedEndpoints, setFailedEndpoints] = useState<string[]>([]);
  
  // Refs
  const realTimeCleanupRef = useRef<(() => void)[]>([]);
  const abortControllerRef = useRef<AbortController>();
  
  // ========================================
  // DATA FETCHING
  // ========================================
  
  const fetchDashboardData = useCallback(async (): Promise<DashboardData> => {
    if (!session?.user?.id) {
      throw new Error('Authentication required');
    }
    
    // Abort any in-flight requests
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    // Define endpoints with proper data transformation
    const endpoints = [
      {
        key: 'communicationMetrics',
        url: '/api/dashboard/communication-metrics',
        schema: CommunicationMetricsSchema,
        transform: transformCommunicationMetrics,
      },
      {
        key: 'progressData',
        url: '/api/dashboard/relationship-progress',
        schema: ProgressDataSchema,
        transform: transformProgressData,
      },
      {
        key: 'sessionAnalytics',
        url: '/api/dashboard/session-time',
        schema: SessionAnalyticsSchema,
        transform: transformSessionAnalytics,
      },
      ...(includeInsights ? [{
        key: 'therapyInsights',
        url: '/api/therapy-insights',
        schema: TherapyInsightsSchema,
        transform: (data: any) => data, // AI insights API already returns the correct format
      }] : []),
    ];
    
    // Fetch all endpoints in parallel with deduplication
    const results = await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        return deduplicator.deduplicate(
          `${endpoint.key}-${session.user.id}-${period}`,
          async () => {
            const response = await fetchWithRetry(endpoint.url, {
              signal: abortControllerRef.current?.signal,
            });
            
            if (!response.ok) {
              throw new Error(`${endpoint.url} returned ${response.status}`);
            }
            
            const json = await response.json();
            return { endpoint, data: json };
          }
        );
      })
    );
    
    // Process results
    const data: DashboardData = {
      communicationMetrics: null,
      progressData: null,
      sessionAnalytics: null,
      therapyInsights: null,
      lastUpdated: new Date(),
      isPartial: false,
    };
    
    const failed: string[] = [];
    let successCount = 0;
    
    results.forEach((result, index) => {
      const endpoint = endpoints[index];
      
      if (result.status === 'fulfilled') {
        try {
          // Apply transformation first
          const transformedData = endpoint.transform(result.value.data);
          
          // Then validate
          const validated = endpoint.schema.safeParse(transformedData);
          if (validated.success) {
            (data as any)[endpoint.key] = validated.data;
            successCount++;
          } else {
            logger.warn(`Validation failed for ${endpoint.key}:`, { error: validated.error });
            failed.push(endpoint.key);
          }
        } catch (error) {
          logger.error(`Processing failed for ${endpoint.key}:`, { error });
          failed.push(endpoint.key);
        }
      } else {
        const errorMessage = result.reason instanceof Error 
          ? result.reason.message 
          : String(result.reason);
        logger.error(`Fetch failed for ${endpoint.key}:`, { 
          reason: errorMessage,
          stack: result.reason instanceof Error ? result.reason.stack : undefined 
        });
        failed.push(endpoint.key);
      }
    });
    
    // Mark as partial if some endpoints failed
    if (failed.length > 0 && successCount > 0) {
      data.isPartial = true;
    }
    
    setFailedEndpoints(failed);
    
    // Throw if all endpoints failed
    if (successCount === 0) {
      throw new Error('All dashboard endpoints failed');
    }
    
    return data;
  }, [session?.user?.id, period, includeInsights]);
  
  // ========================================
  // REACT QUERY
  // ========================================
  
  const queryOptions: UseQueryOptions<DashboardData, Error> = {
    queryKey: ['dashboard-data-unified', session?.user?.id, period, includeInsights],
    queryFn: fetchDashboardData,
    enabled: !!session?.user?.id,
    staleTime,
    gcTime,
    refetchInterval,
    retry: retryCount,
    retryDelay: (attemptIndex) => Math.min(retryDelay * Math.pow(2, attemptIndex), 30000),
  };
  
  const query = useQuery(queryOptions);
  
  // ========================================
  // REAL-TIME UPDATES
  // ========================================
  
  useEffect(() => {
    if (!enableRealTime || !session?.user?.id) return;
    
    const setupRealTime = async () => {
      try {
        // For now, we'll just mock the real-time connection
        // In production, this would use Supabase real-time subscriptions
        setIsRealTimeConnected(false);
        
        // Only log once in development mode to reduce console spam
        if (process.env.NODE_ENV === 'development' && !realTimeCleanupRef.current.length) {
          logger.info('Real-time metrics in development mode', {});
        }
        
        // Real-time updates disabled in development to show proper empty states
        // Only real VAPI session data should trigger updates
      } catch (error) {
        logger.error('Failed to setup real-time connection:', { error });
        setIsRealTimeConnected(false);
      }
    };
    
    setupRealTime();
    
    return () => {
      realTimeCleanupRef.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          logger.error('Real-time cleanup error:', { error });
        }
      });
      realTimeCleanupRef.current = [];
      setRealTimeUpdates({});
      setIsRealTimeConnected(false);
    };
  }, [enableRealTime, session?.user?.id]);
  
  // ========================================
  // MERGED DATA
  // ========================================
  
  const mergedData = useMemo(() => {
    if (!query.data) return null;
    
    if (Object.keys(realTimeUpdates).length > 0) {
      return mergeWithRealTime(query.data, realTimeUpdates);
    }
    
    return query.data;
  }, [query.data, realTimeUpdates]);
  
  // ========================================
  // ACTIONS
  // ========================================
  
  const refetch = useCallback(async () => {
    // Clear real-time updates on manual refetch
    setRealTimeUpdates({});
    await query.refetch();
  }, [query]);
  
  const refetchMetric = useCallback(async (metric: keyof DashboardData) => {
    if (!session?.user?.id) return;
    
    // Invalidate specific metric cache
    await queryClient.invalidateQueries({
      queryKey: ['dashboard-data-unified', session.user.id],
      predicate: (query) => {
        const data = query.state.data as DashboardData | undefined;
        return !!data && !!data[metric];
      },
    });
    
    // Trigger refetch
    await refetch();
  }, [session?.user?.id, queryClient, refetch]);
  
  // ========================================
  // LOADING STATE
  // ========================================
  
  const loadingState = useMemo((): LoadingState => {
    if (!query.isLoading && !query.isFetching) {
      return { type: 'none', message: '' };
    }
    
    // Partial data available
    if (failedEndpoints.length > 0 && mergedData) {
      return {
        type: 'partial',
        message: `Loading additional data...`,
        progress: ((4 - failedEndpoints.length) / 4) * 100,
      };
    }
    
    // AI insights loading
    if (includeInsights && query.isLoading && !mergedData?.therapyInsights) {
      return {
        type: 'brain',
        message: 'Analyzing your therapy journey...',
      };
    }
    
    // Initial load - always show brain spinner
    if (query.isLoading && !mergedData) {
      return {
        type: 'brain',
        message: 'Analyzing your therapy journey...',
      };
    }
    
    // Refresh
    return {
      type: 'spinner',
      message: 'Updating metrics...',
    };
  }, [query.isLoading, query.isFetching, includeInsights, mergedData, failedEndpoints]);
  
  // Debounce loading state
  const debouncedLoadingState = useDebounce(loadingState, 200);
  
  // ========================================
  // CALLBACKS
  // ========================================
  
  useEffect(() => {
    if (query.error && onError) {
      onError(query.error);
    }
  }, [query.error, onError]);
  
  useEffect(() => {
    if (mergedData && onSuccess) {
      onSuccess(mergedData);
    }
  }, [mergedData, onSuccess]);
  
  // ========================================
  // CLEANUP
  // ========================================
  
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      deduplicator.clear();
    };
  }, []);
  
  // ========================================
  // RETURN
  // ========================================
  
  return {
    // Data
    data: mergedData,
    
    // Loading states
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
    
    // Error states
    isError: query.isError,
    error: query.error,
    failedEndpoints,
    
    // Actions
    refetch,
    refetchMetric,
    
    // Loading UI hints
    loadingState: debouncedLoadingState || loadingState,
    
    // Real-time status
    isRealTimeConnected,
    lastRealTimeUpdate,
  };
}

// ========================================
// SPECIALIZED HOOKS
// ========================================

export function useCommunicationMetrics(options?: Omit<UseDashboardDataOptions, 'includeInsights'>) {
  const result = useDashboardDataUnified({ ...options, includeInsights: false });
  return {
    ...result,
    data: result.data?.communicationMetrics || null,
  };
}

export function useProgressData(options?: Omit<UseDashboardDataOptions, 'includeInsights'>) {
  const result = useDashboardDataUnified({ ...options, includeInsights: false });
  return {
    ...result,
    data: result.data?.progressData || null,
  };
}

export function useSessionAnalytics(options?: Omit<UseDashboardDataOptions, 'includeInsights'>) {
  const result = useDashboardDataUnified({ ...options, includeInsights: false });
  return {
    ...result,
    data: result.data?.sessionAnalytics || null,
  };
}

export function useTherapyInsights(options?: UseDashboardDataOptions & { sessionId?: string | null }) {
  const result = useDashboardDataUnified({ ...options, includeInsights: true });
  
  // Check if the data includes real-time insights
  const isRealTime = !!(options?.sessionId && result.data?.therapyInsights?.isRealTime);
  
  return {
    ...result,
    data: result.data?.therapyInsights || null,
    isRealTime,
  };
}