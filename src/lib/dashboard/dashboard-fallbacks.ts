/**
 * Dashboard Fallback Data Patterns
 * Provides meaningful default data when queries fail
 * 
 * Key Features:
 * - Therapy-type-specific fallback data
 * - Progressive data degradation (recent > cached > defaults)
 * - Contextual placeholder content
 * - Error-aware data patterns
 */

import { TherapyType } from '@/components/dashboard/TherapyTypeTabs';

// ========================================
// FALLBACK DATA TYPES
// ========================================

export interface FallbackCommunicationMetrics {
  name: string;
  value: number;
  trend?: 'up' | 'down' | 'stable';
  lastUpdated?: string;
  isPlaceholder?: boolean;
}

export interface FallbackRelationshipProgress {
  overall: number;
  communication: number;
  intimacy: number;
  conflict: number;
  lastUpdated?: string;
  isPlaceholder?: boolean;
}

export interface FallbackSessionData {
  total: number;
  thisWeek: number;
  thisMonth: number;
  averageDuration: number;
  lastSession?: string;
  isPlaceholder?: boolean;
}

export interface FallbackAIInsights {
  insights: Array<{
    title: string;
    description: string;
    confidence: number;
    category: string;
  }>;
  lastGenerated?: string;
  isPlaceholder?: boolean;
}

// ========================================
// THERAPY-SPECIFIC DEFAULTS
// ========================================

const DEFAULT_COMMUNICATION_METRICS: Record<TherapyType, FallbackCommunicationMetrics[]> = {
  solo: [
    { name: "Self-awareness", value: 0, trend: 'stable', isPlaceholder: true },
    { name: "Emotional Regulation", value: 0, trend: 'stable', isPlaceholder: true },
    { name: "Personal Growth", value: 0, trend: 'stable', isPlaceholder: true },
    { name: "Coping Skills", value: 0, trend: 'stable', isPlaceholder: true }
  ],
  couple: [
    { name: "Active Listening", value: 0, trend: 'stable', isPlaceholder: true },
    { name: "Expressing Needs", value: 0, trend: 'stable', isPlaceholder: true },
    { name: "Conflict Resolution", value: 0, trend: 'stable', isPlaceholder: true },
    { name: "Emotional Support", value: 0, trend: 'stable', isPlaceholder: true }
  ],
  family: [
    { name: "Family Communication", value: 0, trend: 'stable', isPlaceholder: true },
    { name: "Role Definition", value: 0, trend: 'stable', isPlaceholder: true },
    { name: "Conflict Management", value: 0, trend: 'stable', isPlaceholder: true },
    { name: "Family Bonding", value: 0, trend: 'stable', isPlaceholder: true }
  ]
};

const DEFAULT_RELATIONSHIP_PROGRESS: Record<Exclude<TherapyType, 'solo'>, FallbackRelationshipProgress> = {
  couple: {
    overall: 0,
    communication: 0,
    intimacy: 0,
    conflict: 0,
    isPlaceholder: true
  },
  family: {
    overall: 0,
    communication: 0,
    intimacy: 0,
    conflict: 0,
    isPlaceholder: true
  }
};

const DEFAULT_SESSION_DATA: Record<TherapyType, FallbackSessionData> = {
  solo: { total: 0, thisWeek: 0, thisMonth: 0, averageDuration: 0, isPlaceholder: true },
  couple: { total: 0, thisWeek: 0, thisMonth: 0, averageDuration: 0, isPlaceholder: true },
  family: { total: 0, thisWeek: 0, thisMonth: 0, averageDuration: 0, isPlaceholder: true }
};

const DEFAULT_AI_INSIGHTS: Record<TherapyType, FallbackAIInsights> = {
  solo: {
    insights: [
      {
        title: "Begin Your Journey",
        description: "Start your first session to receive personalized insights about your growth.",
        confidence: 100,
        category: "motivation"
      }
    ],
    isPlaceholder: true
  },
  couple: {
    insights: [
      {
        title: "Strengthen Your Bond",
        description: "Complete therapy sessions to receive insights about your relationship dynamics.",
        confidence: 100,
        category: "relationship"
      }
    ],
    isPlaceholder: true
  },
  family: {
    insights: [
      {
        title: "Build Family Unity",
        description: "Start family sessions to get insights about communication patterns and growth areas.",
        confidence: 100,
        category: "family"
      }
    ],
    isPlaceholder: true
  }
};

// ========================================
// FALLBACK DATA SERVICE
// ========================================

export class DashboardFallbackService {
  private static instance: DashboardFallbackService;
  private cachedData = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  static getInstance(): DashboardFallbackService {
    if (!DashboardFallbackService.instance) {
      DashboardFallbackService.instance = new DashboardFallbackService();
    }
    return DashboardFallbackService.instance;
  }
  
  /**
   * Get fallback data with progressive degradation
   * 1. Try cached successful response
   * 2. Try localStorage backup
   * 3. Return therapy-specific defaults
   */
  getFallbackData<T>(
    queryKey: string,
    dataType: 'communication' | 'progress' | 'sessions' | 'insights',
    therapyType: TherapyType,
    error?: Error
  ): T {
    // Step 1: Check for cached successful response
    const cached = this.getCachedData<T>(queryKey);
    if (cached && !this.isStaleData(cached)) {
      return { ...cached.data, isFromCache: true, cacheAge: Date.now() - cached.timestamp };
    }
    
    // Step 2: Try localStorage backup
    const backupData = this.getBackupData<T>(queryKey);
    if (backupData) {
      return { ...backupData, isFromBackup: true };
    }
    
    // Step 3: Return therapy-specific defaults
    return this.getDefaultData<T>(dataType, therapyType, error);
  }
  
  /**
   * Cache successful data for fallback use
   */
  cacheSuccessfulData(queryKey: string, data: any, ttl: number = 5 * 60 * 1000): void {
    if (!data || (data.isPlaceholder && !data.isFromCache)) {
      return; // Don't cache placeholder data
    }
    
    this.cachedData.set(queryKey, {
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      timestamp: Date.now(),
      ttl
    });
    
    // Also backup to localStorage for persistence
    try {
      const backupKey = `dashboard_backup_${queryKey}`;
      localStorage.setItem(backupKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to backup data to localStorage:', error);
    }
  }
  
  /**
   * Clear stale cached data
   */
  clearStaleCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cachedData.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cachedData.delete(key);
      }
    }
  }
  
  private getCachedData<T>(queryKey: string): { data: T; timestamp: number } | null {
    const cached = this.cachedData.get(queryKey);
    if (!cached) return null;
    
    return {
      data: cached.data,
      timestamp: cached.timestamp
    };
  }
  
  private getBackupData<T>(queryKey: string): T | null {
    try {
      const backupKey = `dashboard_backup_${queryKey}`;
      const backup = localStorage.getItem(backupKey);
      if (!backup) return null;
      
      const parsed = JSON.parse(backup);
      
      // Check if backup is not too old (24 hours)
      const age = Date.now() - parsed.timestamp;
      if (age > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(backupKey);
        return null;
      }
      
      return parsed.data;
    } catch (error) {
      console.warn('Failed to retrieve backup data:', error);
      return null;
    }
  }
  
  private getDefaultData<T>(
    dataType: 'communication' | 'progress' | 'sessions' | 'insights',
    therapyType: TherapyType,
    error?: Error
  ): T {
    const errorContext = error ? {
      errorType: error.name,
      errorMessage: error.message,
      isNetworkError: error.message?.toLowerCase().includes('fetch') || error.message?.toLowerCase().includes('network')
    } : undefined;
    
    switch (dataType) {
      case 'communication':
        return {
          ...DEFAULT_COMMUNICATION_METRICS[therapyType],
          errorContext,
          fallbackReason: 'default_data'
        } as T;
        
      case 'progress':
        if (therapyType === 'solo') {
          return { errorContext, fallbackReason: 'solo_therapy_no_progress' } as T;
        }
        return {
          ...DEFAULT_RELATIONSHIP_PROGRESS[therapyType as Exclude<TherapyType, 'solo'>],
          errorContext,
          fallbackReason: 'default_data'
        } as T;
        
      case 'sessions':
        return {
          ...DEFAULT_SESSION_DATA[therapyType],
          errorContext,
          fallbackReason: 'default_data'
        } as T;
        
      case 'insights':
        return {
          ...DEFAULT_AI_INSIGHTS[therapyType],
          errorContext,
          fallbackReason: 'default_data'
        } as T;
        
      default:
        return {
          isPlaceholder: true,
          errorContext,
          fallbackReason: 'unknown_data_type'
        } as T;
    }
  }
  
  private isStaleData(cached: { timestamp: number; ttl: number }): boolean {
    return Date.now() - cached.timestamp > cached.ttl;
  }
}

// ========================================
// CONVENIENCE FUNCTIONS
// ========================================

/**
 * Get fallback communication metrics for a therapy type
 */
export function getFallbackCommunicationMetrics(
  therapyType: TherapyType,
  error?: Error
): FallbackCommunicationMetrics[] {
  const service = DashboardFallbackService.getInstance();
  return service.getFallbackData(
    `communication-metrics-${therapyType}`,
    'communication',
    therapyType,
    error
  );
}

/**
 * Get fallback relationship progress for couple/family therapy
 */
export function getFallbackRelationshipProgress(
  therapyType: Exclude<TherapyType, 'solo'>,
  error?: Error
): FallbackRelationshipProgress {
  const service = DashboardFallbackService.getInstance();
  return service.getFallbackData(
    `relationship-progress-${therapyType}`,
    'progress',
    therapyType,
    error
  );
}

/**
 * Get fallback session data
 */
export function getFallbackSessionData(
  therapyType: TherapyType,
  error?: Error
): FallbackSessionData {
  const service = DashboardFallbackService.getInstance();
  return service.getFallbackData(
    `session-data-${therapyType}`,
    'sessions',
    therapyType,
    error
  );
}

/**
 * Get fallback AI insights
 */
export function getFallbackAIInsights(
  therapyType: TherapyType,
  error?: Error
): FallbackAIInsights {
  const service = DashboardFallbackService.getInstance();
  return service.getFallbackData(
    `ai-insights-${therapyType}`,
    'insights',
    therapyType,
    error
  );
}

/**
 * Cache successful query data for future fallback use
 */
export function cacheSuccessfulQueryData(
  queryKey: string | string[],
  data: any,
  ttl?: number
): void {
  const service = DashboardFallbackService.getInstance();
  const keyString = Array.isArray(queryKey) ? queryKey.join('-') : queryKey;
  service.cacheSuccessfulData(keyString, data, ttl);
}

/**
 * Clear stale fallback cache (call periodically)
 */
export function clearStaleCache(): void {
  const service = DashboardFallbackService.getInstance();
  service.clearStaleCache();
}

// ========================================
// REACT HOOK INTEGRATION
// ========================================

/**
 * Enhanced query options with automatic fallback caching
 */
export function withFallbackCaching(queryOptions: any, dataType: string, therapyType: TherapyType) {
  return {
    ...queryOptions,
    onSuccess: (data: any) => {
      // Cache successful data
      if (data && !data.isPlaceholder) {
        cacheSuccessfulQueryData([dataType, therapyType], data);
      }
      
      // Call original onSuccess if provided
      if (queryOptions.onSuccess) {
        queryOptions.onSuccess(data);
      }
    },
    onError: (error: Error) => {
      // Don't cache errors, but could add error-specific logic here
      console.debug(`Query failed for ${dataType}-${therapyType}:`, error.message);
      
      // Call original onError if provided
      if (queryOptions.onError) {
        queryOptions.onError(error);
      }
    }
  };
}