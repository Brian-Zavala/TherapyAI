// src/hooks/useDashboardMetricsUnified.ts
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useMetricSubscription } from '@/components/dashboard/RealTimeMetricProvider';

// ========================================
// TYPES
// ========================================

export interface UnifiedMetricData {
  // Communication Metrics
  communicationMetrics?: {
    clarity: number;
    empathy: number;
    respect: number;
    overall: number;
    listening?: number;
    expression?: number;
  };
  
  // Progress Data
  progressData?: {
    closenessScore: number;
    communicationScore: number;
    conflictResolution: number;
    emotionalSupport: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  
  // Session Analytics
  sessionAnalytics?: {
    totalSessions: number;
    averageDuration: number;
    completionRate: number;
    upcomingSessions: Array<{
      id: string;
      date: Date;
      duration: number;
      type: string;
    }>;
  };
  
  // Therapy Insights (AI-generated)
  therapyInsights?: {
    insights: Array<{
      id: string;
      category: string;
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      actionItems: string[];
    }>;
    summary: {
      overallProgress: 'excellent' | 'good' | 'moderate' | 'needs-attention';
      topStrengths: string[];
      focusAreas: string[];
      weeklyGoals: string[];
    };
    trends: {
      communication: 'improving' | 'stable' | 'declining';
      emotional: 'improving' | 'stable' | 'declining';
      consistency: 'excellent' | 'good' | 'needs-improvement';
    };
    personalizedTips: {
      daily: string[];
      weekly: string[];
      exercises: string[];
    };
  };
  
  // Metadata
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
    type: 'brain' | 'skeleton' | 'spinner';
    message: string;
  };
}

// ========================================
// CONSTANTS
// ========================================

const CACHE_KEY_PREFIX = 'dashboard-metrics-unified';
const DEFAULT_STALE_TIME = 1000 * 60 * 5; // 5 minutes
const DEFAULT_CACHE_TIME = 1000 * 60 * 30; // 30 minutes

// ========================================
// MAIN HOOK
// ========================================

export function useDashboardMetricsUnified(
  options: UseDashboardMetricsOptions = {}
): UseDashboardMetricsResult {
  const {
    enableRealTime = true,
    refreshInterval = 30000, // 30 seconds
    includeInsights = true,
    period = 'month'
  } = options;
  
  const { data: session } = useSession();
  const [realtimeData, setRealtimeData] = useState<Partial<UnifiedMetricData>>({});
  const lastFetchRef = useRef<Date>(new Date());
  
  // ========================================
  // MAIN DATA FETCHING
  // ========================================
  
  const fetchMetrics = useCallback(async (): Promise<UnifiedMetricData> => {
    if (!session?.user?.id) {
      throw new Error('No authenticated user');
    }
    
    // Parallel fetch all metric endpoints
    const [
      communicationResponse,
      progressResponse,
      sessionResponse,
      insightsResponse
    ] = await Promise.allSettled([
      fetch('/api/dashboard/communication-metrics'),
      fetch('/api/dashboard/relationship-progress'),
      fetch('/api/dashboard/session-time'),
      includeInsights ? fetch('/api/therapy-insights') : Promise.resolve(null)
    ]);
    
    // Process responses
    const communicationData = communicationResponse.status === 'fulfilled' && communicationResponse.value.ok
      ? await communicationResponse.value.json()
      : null;
      
    const progressData = progressResponse.status === 'fulfilled' && progressResponse.value.ok
      ? await progressResponse.value.json()
      : null;
      
    const sessionData = sessionResponse.status === 'fulfilled' && sessionResponse.value.ok
      ? await sessionResponse.value.json()
      : null;
      
    const insightsData = includeInsights && insightsResponse.status === 'fulfilled' && 
      insightsResponse.value && insightsResponse.value.ok
      ? await insightsResponse.value.json()
      : null;
    
    // Combine all data
    const unifiedData: UnifiedMetricData = {
      communicationMetrics: communicationData?.metrics || null,
      progressData: progressData?.progress || null,
      sessionAnalytics: sessionData?.analytics || null,
      therapyInsights: insightsData || null,
      lastUpdated: new Date(),
      dataSource: 'api'
    };
    
    lastFetchRef.current = new Date();
    return unifiedData;
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
    queryKey: [CACHE_KEY_PREFIX, session?.user?.id, period, includeInsights],
    queryFn: fetchMetrics,
    enabled: !!session?.user?.id,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    refetchInterval: refreshInterval,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
  
  // ========================================
  // REAL-TIME UPDATES
  // ========================================
  
  useEffect(() => {
    if (!enableRealTime || !session?.user?.id) return;
    
    const unsubscribe = useMetricSubscription((update) => {
      // Update only the relevant part of the data
      setRealtimeData(prev => {
        const newData = { ...prev };
        
        // Map real-time updates to our unified structure
        if (update.type === 'communication_metric') {
          newData.communicationMetrics = {
            ...newData.communicationMetrics,
            ...update.data
          };
        } else if (update.type === 'progress_update') {
          newData.progressData = {
            ...newData.progressData,
            ...update.data
          };
        }
        
        newData.dataSource = 'realtime';
        newData.lastUpdated = new Date();
        
        return newData;
      });
    }, [session?.user?.id]);
    
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [enableRealTime, session?.user?.id]);
  
  // ========================================
  // MERGE REAL-TIME WITH FETCHED DATA
  // ========================================
  
  const mergedData = useCallback((): UnifiedMetricData | null => {
    if (!data) return null;
    
    // If we have real-time updates, merge them with the fetched data
    if (Object.keys(realtimeData).length > 0) {
      return {
        ...data,
        ...realtimeData,
        dataSource: realtimeData.dataSource || data.dataSource
      };
    }
    
    return data;
  }, [data, realtimeData]);
  
  // ========================================
  // LOADING STATE MANAGEMENT
  // ========================================
  
  const getLoadingState = useCallback(() => {
    if (!isLoading && !isRefetching) {
      return { type: 'none' as const, message: '' };
    }
    
    // Use brain spinner for AI insights
    if (includeInsights && !data?.therapyInsights) {
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
  
  // ========================================
  // RETURN
  // ========================================
  
  return {
    data: mergedData(),
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    isRefetching,
    loadingState: getLoadingState()
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