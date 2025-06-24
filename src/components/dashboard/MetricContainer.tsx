// src/components/dashboard/MetricContainer.tsx
"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useSession } from "next-auth/react";

// ========================================
// TYPES & INTERFACES
// ========================================

export interface MetricData {
  id: string;
  name: string;
  value: number;
  maxValue?: number;
  previousValue?: number;
  trend?: 'up' | 'down' | 'stable';
  confidence?: number;
  lastUpdated?: Date;
  unit?: string;
  description?: string;
}

export interface MetricContainerProps {
  title: string;
  description?: string;
  fetchUrl: string;
  refreshInterval?: number;
  children: (data: {
    metrics: MetricData[];
    loading: boolean;
    error: string | null;
    retry: () => void;
    lastUpdated: Date | null;
  }) => ReactNode;
  onError?: (error: Error) => void;
  onDataUpdate?: (metrics: MetricData[]) => void;
  fallbackData?: MetricData[];
  enableRealTime?: boolean;
  sessionId?: string;
  cacheKey?: string;
  retryAttempts?: number;
  retryDelay?: number;
}

interface CacheEntry {
  data: MetricData[];
  timestamp: Date;
  expiresIn: number;
}

// ========================================
// CACHE MANAGEMENT
// ========================================

class MetricCache {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 30000; // 30 seconds

  set(key: string, data: MetricData[], ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data: [...data], // Create deep copy
      timestamp: new Date(),
      expiresIn: ttl
    });
  }

  get(key: string): MetricData[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const expiresAt = entry.timestamp.getTime() + entry.expiresIn;
    
    if (now > expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return [...entry.data]; // Return deep copy
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  size(): number {
    return this.cache.size;
  }
}

const metricCache = new MetricCache();

// ========================================
// ERROR HANDLING
// ========================================

class MetricError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = true
  ) {
    super(message);
    this.name = 'MetricError';
  }
}

const createErrorFromResponse = async (response: Response): Promise<MetricError> => {
  let message = 'Unknown error occurred';
  let code = 'UNKNOWN_ERROR';
  
  try {
    const errorData = await response.json();
    message = errorData.error || errorData.message || message;
    code = errorData.code || code;
  } catch {
    // Fallback to status text if JSON parsing fails
    message = response.statusText || message;
  }

  const retryable = response.status >= 500 || response.status === 429;
  
  return new MetricError(message, code, response.status, retryable);
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

const calculateTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
  const threshold = 0.05; // 5% threshold for trend detection
  const change = (current - previous) / previous;
  
  if (Math.abs(change) < threshold) return 'stable';
  return change > 0 ? 'up' : 'down';
};

const validateMetricData = (data: any): MetricData[] => {
  if (!Array.isArray(data)) {
    throw new MetricError('Invalid data format: expected array', 'INVALID_FORMAT', undefined, false);
  }

  return data.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new MetricError(`Invalid metric at index ${index}`, 'INVALID_METRIC', undefined, false);
    }

    const metric: MetricData = {
      id: item.id || `metric-${index}`,
      name: item.name || `Metric ${index + 1}`,
      value: typeof item.value === 'number' ? item.value : 0,
      maxValue: item.maxValue || 100,
      previousValue: item.previousValue,
      confidence: item.confidence,
      lastUpdated: item.lastUpdated ? new Date(item.lastUpdated) : new Date(),
      unit: item.unit,
      description: item.description
    };

    // Calculate trend if previous value exists
    if (metric.previousValue !== undefined) {
      metric.trend = calculateTrend(metric.value, metric.previousValue);
    }

    return metric;
  });
};

// ========================================
// METRIC CONTAINER COMPONENT
// ========================================

export default function MetricContainer({
  title,
  description,
  fetchUrl,
  refreshInterval = 30000,
  children,
  onError,
  onDataUpdate,
  fallbackData = [],
  enableRealTime = false,
  sessionId,
  cacheKey,
  retryAttempts = 3,
  retryDelay = 1000
}: MetricContainerProps) {
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  const { data: session } = useSession();
  const [metrics, setMetrics] = useState<MetricData[]>(fallbackData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const effectiveCacheKey = cacheKey || `metrics-${fetchUrl}`;

  // ========================================
  // DATA FETCHING
  // ========================================
  const fetchMetrics = useCallback(async (attempt: number = 0): Promise<void> => {
    try {
      // Check cache first
      if (attempt === 0 && !isRetrying) {
        const cachedData = metricCache.get(effectiveCacheKey);
        if (cachedData) {
          setMetrics(cachedData);
          setError(null);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      if (attempt > 0) {
        setIsRetrying(true);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await createErrorFromResponse(response);
        throw error;
      }

      const data = await response.json();
      const validatedMetrics = validateMetricData(data);

      // Update state
      setMetrics(validatedMetrics);
      setError(null);
      setLastUpdated(new Date());
      setRetryCount(0);

      // Update cache
      metricCache.set(effectiveCacheKey, validatedMetrics);

      // Notify parent component
      onDataUpdate?.(validatedMetrics);

    } catch (err) {
      console.error(`Metric fetch error (attempt ${attempt + 1}):`, err);
      
      const error = err instanceof MetricError ? err : 
        new MetricError(err instanceof Error ? err.message : 'Unknown error', 'FETCH_ERROR');

      // Retry logic
      if (error.retryable && attempt < retryAttempts) {
        const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
        setTimeout(() => {
          fetchMetrics(attempt + 1);
        }, delay);
        return;
      }

      // Final error state
      setError(error.message);
      setRetryCount(attempt + 1);
      onError?.(error);

      // Use fallback data if available
      if (fallbackData.length > 0 && metrics.length === 0) {
        setMetrics(fallbackData);
      }
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, [fetchUrl, effectiveCacheKey, onDataUpdate, onError, fallbackData, retryAttempts, retryDelay, isRetrying, metrics.length]);

  // ========================================
  // MANUAL RETRY
  // ========================================
  const retry = useCallback(() => {
    setError(null);
    setRetryCount(0);
    metricCache.clear(effectiveCacheKey);
    fetchMetrics(0);
  }, [fetchMetrics, effectiveCacheKey]);

  // ========================================
  // EFFECTS
  // ========================================

  // Initial fetch
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchMetrics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchMetrics, refreshInterval]);

  // Real-time updates (if enabled)
  useEffect(() => {
    if (!enableRealTime || !session?.user?.id) return;

    // Import WebSocket manager dynamically to avoid SSR issues
    let wsManager: any = null;
    let unsubscribe: (() => void) | null = null;

    const setupRealtime = async () => {
      try {
        const { getWebSocketManager } = await import('@/lib/realtime/websocket-manager');
        wsManager = getWebSocketManager();

        // Get auth token from session
        const authToken = await fetch('/api/auth/session')
          .then(res => res.json())
          .then(data => data?.accessToken || session.user?.id);

        // Connect to WebSocket
        await wsManager.connect(authToken, session.user.id, sessionId);

        // Subscribe to metrics updates
        unsubscribe = wsManager.subscribeToSession(sessionId || session.user.id, (data: any) => {
          console.log('📊 Real-time metric update:', data);
          
          // Merge with existing data
          setMetrics((prevMetrics: MetricData[]) => {
            if (!prevMetrics || prevMetrics.length === 0) {
              // If data is an array of metrics, use it directly
              if (Array.isArray(data)) {
                return data;
              }
              // If data is a single metric, wrap it
              return [data];
            }
            
            // Handle array data (time series metrics)
            if (Array.isArray(data)) {
              // Merge and deduplicate by id
              const merged = [...prevMetrics, ...data];
              const uniqueMap = new Map();
              merged.forEach(metric => {
                uniqueMap.set(metric.id || metric.name, metric);
              });
              
              // Convert back to array and keep only last 100 data points
              return Array.from(uniqueMap.values()).slice(-100);
            }
            
            // Handle single metric update
            const metricIndex = prevMetrics.findIndex(m => m.id === data.id || m.name === data.name);
            if (metricIndex >= 0) {
              const updated = [...prevMetrics];
              updated[metricIndex] = { ...updated[metricIndex], ...data };
              return updated;
            }
            
            // Add new metric
            return [...prevMetrics, data];
          });
          
          setLastUpdated(new Date());
        });

        // Listen for connection state changes
        wsManager.on('state_change', ({ to }: { to: string }) => {
          console.log('🔌 WebSocket state:', to);
          if (to === 'error' || to === 'disconnected') {
            // Fallback to polling
            if (refetchInterval) {
              console.log('📊 Falling back to polling mode');
            }
          }
        });
      } catch (error) {
        console.error('❌ Real-time connection failed:', error);
        // Continue with polling fallback
      }
    };

    setupRealtime();
    
    return () => {
      // Cleanup real-time connection
      unsubscribe?.();
      wsManager?.disconnect();
    };
  }, [enableRealTime, session?.user?.id, sessionId, refreshInterval]);

  // ========================================
  // RENDER
  // ========================================
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          {description && (
            <p className="text-sm text-white/70 mt-1">{description}</p>
          )}
        </div>
        
        {/* Status Indicators */}
        <div className="flex items-center gap-2">
          {enableRealTime && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-white/60">Live</span>
            </div>
          )}
          
          {lastUpdated && !loading && (
            <span className="text-xs text-white/60">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          
          <button
            onClick={retry}
            disabled={loading}
            className="p-1.5 text-white/60 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-200">{error}</span>
            {retryCount < retryAttempts && (
              <button
                onClick={retry}
                className="ml-auto text-xs text-red-200 hover:text-white underline"
              >
                Retry ({retryCount}/{retryAttempts})
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="relative">
        {children({
          metrics,
          loading,
          error,
          retry,
          lastUpdated
        })}
      </div>
    </motion.div>
  );
}

// ========================================
// METRIC DISPLAY COMPONENTS
// ========================================

export function MetricValue({ metric, className = "" }: { metric: MetricData; className?: string }) {
  const getTrendIcon = () => {
    switch (metric.trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-400" />;
      default: return <Minus className="w-4 h-4 text-white/60" />;
    }
  };

  const getTrendColor = () => {
    switch (metric.trend) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      default: return 'text-white/60';
    }
  };

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div>
        <h4 className="text-sm font-medium text-white/90">{metric.name}</h4>
        {metric.description && (
          <p className="text-xs text-white/60 mt-1">{metric.description}</p>
        )}
      </div>
      
      <div className="text-right">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">
            {metric.value}{metric.unit || ''}
          </span>
          {metric.trend && getTrendIcon()}
        </div>
        
        {metric.previousValue !== undefined && (
          <span className={`text-xs ${getTrendColor()}`}>
            {metric.trend === 'up' ? '+' : metric.trend === 'down' ? '-' : ''}
            {Math.abs(metric.value - metric.previousValue).toFixed(1)}
          </span>
        )}
        
        {metric.confidence !== undefined && (
          <div className="text-xs text-white/60 mt-1">
            {Math.round(metric.confidence)}% confidence
          </div>
        )}
      </div>
    </div>
  );
}

export function MetricSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 bg-white/20 rounded w-24 animate-pulse" />
            <div className="h-3 bg-white/10 rounded w-32 animate-pulse" />
          </div>
          <div className="text-right space-y-2">
            <div className="h-6 bg-white/20 rounded w-16 animate-pulse" />
            <div className="h-3 bg-white/10 rounded w-12 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}