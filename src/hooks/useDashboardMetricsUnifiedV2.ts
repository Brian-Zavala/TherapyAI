// src/hooks/useDashboardMetricsUnifiedV2.ts
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { z } from 'zod';
import { useDebounce } from '@/hooks/useDebounce';

// ========================================
// SCHEMAS FOR VALIDATION
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
});

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

const TherapyInsightSchema = z.object({
  id: z.string(),
  category: z.enum(['communication', 'emotional', 'behavioral', 'mental-health', 'relationship', 'progress']),
  title: z.string(),
  description: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  actionItems: z.array(z.string()).default([]),
  basedOn: z.array(z.string()).default([]),
  mentalHealthTips: z.array(z.string()).optional(),
  resources: z.array(z.object({
    title: z.string(),
    description: z.string(),
    type: z.enum(['exercise', 'article', 'technique', 'practice']),
  })).optional(),
  timeframe: z.enum(['immediate', 'this-week', 'this-month']).optional(),
  celebrationType: z.enum(['improvement', 'milestone', 'consistency']).optional(),
});

const TherapyInsightsSchema = z.object({
  insights: z.array(TherapyInsightSchema).default([]),
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
  }),
});

// ========================================
// TYPES
// ========================================

export type CommunicationMetrics = z.infer<typeof CommunicationMetricsSchema>;
export type ProgressData = z.infer<typeof ProgressDataSchema>;
export type SessionAnalytics = z.infer<typeof SessionAnalyticsSchema>;
export type TherapyInsights = z.infer<typeof TherapyInsightsSchema>;

export interface UnifiedMetricData {
  communicationMetrics?: CommunicationMetrics | null;
  progressData?: ProgressData | null;
  sessionAnalytics?: SessionAnalytics | null;
  therapyInsights?: TherapyInsights | null;
  lastUpdated: Date;
  dataSource: 'realtime' | 'cache' | 'api';
}

export interface UseDashboardMetricsOptions {
  enableRealTime?: boolean;
  refreshInterval?: number;
  includeInsights?: boolean;
  period?: 'week' | 'month' | 'quarter' | 'year';
}

export interface UseDashboardMetricsResult {
  data: UnifiedMetricData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isRefetching: boolean;
  loadingState: {
    type: 'brain' | 'skeleton' | 'spinner' | 'none';
    message: string;
  };
}

// ========================================
// UTILITIES
// ========================================

function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const output = { ...target };
  
  Object.keys(source).forEach(key => {
    const sourceValue = source[key as keyof T];
    const targetValue = target[key as keyof T];
    
    if (sourceValue === undefined) return;
    
    if (
      typeof sourceValue === 'object' && 
      sourceValue !== null && 
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      output[key as keyof T] = deepMerge(targetValue, sourceValue as any) as any;
    } else {
      output[key as keyof T] = sourceValue as any;
    }
  });
  
  return output;
}

async function fetchWithTimeout(url: string, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ========================================
// MAIN HOOK
// ========================================

export function useDashboardMetricsUnified(
  options: UseDashboardMetricsOptions = {}
): UseDashboardMetricsResult {
  const {
    enableRealTime = true,
    refreshInterval = 30000,
    includeInsights = true,
    period = 'month'
  } = options;
  
  const { data: session } = useSession();
  const [realtimeData, setRealtimeData] = useState<Partial<UnifiedMetricData>>({});
  const lastFetchRef = useRef<Date>(new Date());
  const cleanupRef = useRef<(() => void)[]>([]);
  
  // ========================================
  // MAIN DATA FETCHING
  // ========================================
  
  const fetchMetrics = useCallback(async (): Promise<UnifiedMetricData> => {
    if (!session?.user?.id) {
      throw new Error('No authenticated user');
    }
    
    // Parallel fetch all metric endpoints
    const endpoints = [
      { url: '/api/dashboard/communication-metrics', schema: CommunicationMetricsSchema, key: 'metrics' },
      { url: '/api/dashboard/relationship-progress', schema: ProgressDataSchema, key: 'progress' },
      { url: '/api/dashboard/session-time', schema: SessionAnalyticsSchema, key: 'analytics' },
      ...(includeInsights ? [{ url: '/api/therapy-insights', schema: TherapyInsightsSchema, key: null }] : [])
    ];
    
    const results = await Promise.allSettled(
      endpoints.map(async ({ url }) => {
        const response = await fetchWithTimeout(url);
        if (!response.ok) {
          throw new Error(`${url} returned ${response.status}`);
        }
        return response.json();
      })
    );
    
    // Process and validate responses
    const processedData: UnifiedMetricData = {
      lastUpdated: new Date(),
      dataSource: 'api'
    };
    
    endpoints.forEach((endpoint, index) => {
      const result = results[index];
      
      if (result.status === 'fulfilled') {
        try {
          const rawData = endpoint.key ? result.value[endpoint.key] : result.value;
          
          switch (endpoint.url) {
            case '/api/dashboard/communication-metrics':
              const validatedComm = CommunicationMetricsSchema.safeParse(rawData);
              processedData.communicationMetrics = validatedComm.success ? validatedComm.data : null;
              break;
              
            case '/api/dashboard/relationship-progress':
              const validatedProg = ProgressDataSchema.safeParse(rawData);
              processedData.progressData = validatedProg.success ? validatedProg.data : null;
              break;
              
            case '/api/dashboard/session-time':
              const validatedSess = SessionAnalyticsSchema.safeParse(rawData);
              processedData.sessionAnalytics = validatedSess.success ? validatedSess.data : null;
              break;
              
            case '/api/therapy-insights':
              const validatedInsights = TherapyInsightsSchema.safeParse(rawData);
              processedData.therapyInsights = validatedInsights.success ? validatedInsights.data : null;
              break;
          }
        } catch (error) {
          console.error(`Failed to validate ${endpoint.url}:`, error);
        }
      } else {
        console.error(`Failed to fetch ${endpoints[index].url}:`, result.reason);
      }
    });
    
    lastFetchRef.current = new Date();
    return processedData;
  }, [session?.user?.id, includeInsights]);
  
  // ========================================
  // REACT QUERY
  // ========================================
  
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['dashboard-metrics-unified', session?.user?.id, period, includeInsights],
    queryFn: fetchMetrics,
    enabled: !!session?.user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchInterval: refreshInterval,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
  
  // ========================================
  // REAL-TIME UPDATES
  // ========================================
  
  useEffect(() => {
    if (!enableRealTime || !session?.user?.id) return;
    
    const setupRealtime = async () => {
      try {
        const { useMetricSubscription } = await import('@/components/dashboard/RealTimeMetricProvider');
        
        const unsubscribe = useMetricSubscription((update) => {
          setRealtimeData(prev => {
            const newData = { ...prev };
            
            // Safely update only the relevant part
            if (update.type === 'communication_metric' && update.data) {
              newData.communicationMetrics = deepMerge(
                prev.communicationMetrics || {},
                update.data as Partial<CommunicationMetrics>
              );
            } else if (update.type === 'progress_update' && update.data) {
              newData.progressData = deepMerge(
                prev.progressData || {},
                update.data as Partial<ProgressData>
              );
            }
            
            newData.dataSource = 'realtime';
            newData.lastUpdated = new Date();
            
            return newData;
          });
        }, [session.user.id]);
        
        if (typeof unsubscribe === 'function') {
          cleanupRef.current.push(unsubscribe);
        }
      } catch (error) {
        console.error('Failed to setup realtime connection:', error);
      }
    };
    
    setupRealtime();
    
    return () => {
      // Cleanup all subscriptions
      cleanupRef.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      });
      cleanupRef.current = [];
      setRealtimeData({});
    };
  }, [enableRealTime, session?.user?.id]);
  
  // ========================================
  // MERGE REAL-TIME WITH FETCHED DATA
  // ========================================
  
  const mergedData = useMemo((): UnifiedMetricData | null => {
    if (!data) return null;
    
    if (Object.keys(realtimeData).length > 0) {
      return deepMerge(data, realtimeData);
    }
    
    return data;
  }, [data, realtimeData]);
  
  // ========================================
  // LOADING STATE MANAGEMENT
  // ========================================
  
  const loadingState = useMemo(() => {
    if (!isLoading && !isRefetching) {
      return { type: 'none' as const, message: '' };
    }
    
    // Use brain spinner for AI insights
    if (includeInsights && isLoading && !data?.therapyInsights) {
      return {
        type: 'brain' as const,
        message: 'Analyzing your therapy journey...'
      };
    }
    
    // Use skeleton for initial load
    if (isLoading && !data) {
      return {
        type: 'skeleton' as const,
        message: 'Loading dashboard metrics...'
      };
    }
    
    // Use spinner for refresh
    return {
      type: 'spinner' as const,
      message: 'Updating metrics...'
    };
  }, [isLoading, isRefetching, includeInsights, data]);
  
  // Debounce loading state to prevent flicker
  const debouncedLoadingState = useDebounce(loadingState, 200);
  
  // ========================================
  // RETURN
  // ========================================
  
  return {
    data: mergedData,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    isRefetching,
    loadingState: debouncedLoadingState || loadingState
  };
}

// ========================================
// HELPER HOOKS FOR SPECIFIC METRICS
// ========================================

export function useCommunicationMetrics(options?: Omit<UseDashboardMetricsOptions, 'includeInsights'>) {
  const result = useDashboardMetricsUnified({ ...options, includeInsights: false });
  return {
    ...result,
    data: result.data?.communicationMetrics || null
  };
}

export function useProgressMetrics(options?: Omit<UseDashboardMetricsOptions, 'includeInsights'>) {
  const result = useDashboardMetricsUnified({ ...options, includeInsights: false });
  return {
    ...result,
    data: result.data?.progressData || null
  };
}

export function useSessionAnalytics(options?: Omit<UseDashboardMetricsOptions, 'includeInsights'>) {
  const result = useDashboardMetricsUnified({ ...options, includeInsights: false });
  return {
    ...result,
    data: result.data?.sessionAnalytics || null
  };
}

export function useTherapyInsights(options?: UseDashboardMetricsOptions) {
  const result = useDashboardMetricsUnified({ ...options, includeInsights: true });
  return {
    ...result,
    data: result.data?.therapyInsights || null
  };
}