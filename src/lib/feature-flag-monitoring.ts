/**
 * Monitoring service for feature flag rollout
 * Tracks performance, errors, and usage metrics for gradual rollout
 */

interface PerformanceMetric {
  component: string
  operation: string
  duration: number
  timestamp: number
  userId?: string
  version: 'original' | 'refactored'
}

interface ErrorMetric {
  component: string
  error: string
  stack?: string
  timestamp: number
  userId?: string
  version: 'original' | 'refactored'
}

interface UsageMetric {
  component: string
  action: string
  timestamp: number
  userId?: string
  version: 'original' | 'refactored'
  metadata?: Record<string, unknown>
}

class FeatureFlagMonitoring {
  private performanceBuffer: PerformanceMetric[] = []
  private errorBuffer: ErrorMetric[] = []
  private usageBuffer: UsageMetric[] = []
  private flushInterval: NodeJS.Timeout | null = null
  private readonly BUFFER_SIZE = 100
  private readonly FLUSH_INTERVAL = 30000 // 30 seconds
  
  constructor() {
    // Start periodic flush
    if (typeof window !== 'undefined') {
      this.startPeriodicFlush()
      
      // Flush on page unload
      window.addEventListener('beforeunload', () => {
        this.flush()
      })
    }
  }
  
  // Track performance metrics
  trackPerformance(
    component: string,
    operation: string,
    duration: number,
    version: 'original' | 'refactored',
    userId?: string
  ) {
    const metric: PerformanceMetric = {
      component,
      operation,
      duration,
      timestamp: Date.now(),
      userId,
      version
    }
    
    this.performanceBuffer.push(metric)
    
    // Log slow operations
    if (duration > 1000) {
      console.warn(`[FeatureFlagMonitoring] Slow operation detected:`, metric)
    }
    
    // Auto-flush if buffer is full
    if (this.performanceBuffer.length >= this.BUFFER_SIZE) {
      this.flushPerformance()
    }
  }
  
  // Track errors
  trackError(
    component: string,
    error: Error,
    version: 'original' | 'refactored',
    userId?: string
  ) {
    const metric: ErrorMetric = {
      component,
      error: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      userId,
      version
    }
    
    this.errorBuffer.push(metric)
    
    // Log all errors
    console.error(`[FeatureFlagMonitoring] Error in ${version} version:`, metric)
    
    // Auto-flush errors immediately
    this.flushErrors()
  }
  
  // Track usage
  trackUsage(
    component: string,
    action: string,
    version: 'original' | 'refactored',
    userId?: string,
    metadata?: Record<string, unknown>
  ) {
    const metric: UsageMetric = {
      component,
      action,
      timestamp: Date.now(),
      userId,
      version,
      metadata
    }
    
    this.usageBuffer.push(metric)
    
    // Auto-flush if buffer is full
    if (this.usageBuffer.length >= this.BUFFER_SIZE) {
      this.flushUsage()
    }
  }
  
  // Compare performance between versions
  compareVersions(component: string, operation: string): {
    original: { avg: number; count: number }
    refactored: { avg: number; count: number }
    improvement: number
  } {
    const originalMetrics = this.performanceBuffer.filter(
      m => m.component === component && 
           m.operation === operation && 
           m.version === 'original'
    )
    
    const refactoredMetrics = this.performanceBuffer.filter(
      m => m.component === component && 
           m.operation === operation && 
           m.version === 'refactored'
    )
    
    const originalAvg = originalMetrics.length > 0
      ? originalMetrics.reduce((sum, m) => sum + m.duration, 0) / originalMetrics.length
      : 0
      
    const refactoredAvg = refactoredMetrics.length > 0
      ? refactoredMetrics.reduce((sum, m) => sum + m.duration, 0) / refactoredMetrics.length
      : 0
    
    const improvement = originalAvg > 0
      ? ((originalAvg - refactoredAvg) / originalAvg) * 100
      : 0
    
    return {
      original: { avg: originalAvg, count: originalMetrics.length },
      refactored: { avg: refactoredAvg, count: refactoredMetrics.length },
      improvement
    }
  }
  
  // Get error rate for each version
  getErrorRates(component: string): {
    original: number
    refactored: number
  } {
    const now = Date.now()
    const timeWindow = 3600000 // 1 hour
    
    const recentErrors = this.errorBuffer.filter(
      e => e.component === component && (now - e.timestamp) < timeWindow
    )
    
    const originalErrors = recentErrors.filter(e => e.version === 'original').length
    const refactoredErrors = recentErrors.filter(e => e.version === 'refactored').length
    
    const originalUsage = this.usageBuffer.filter(
      u => u.component === component && 
           u.version === 'original' && 
           (now - u.timestamp) < timeWindow
    ).length
    
    const refactoredUsage = this.usageBuffer.filter(
      u => u.component === component && 
           u.version === 'refactored' && 
           (now - u.timestamp) < timeWindow
    ).length
    
    return {
      original: originalUsage > 0 ? (originalErrors / originalUsage) * 100 : 0,
      refactored: refactoredUsage > 0 ? (refactoredErrors / refactoredUsage) * 100 : 0
    }
  }
  
  // Flush performance metrics
  private async flushPerformance() {
    if (this.performanceBuffer.length === 0) return
    
    const metrics = [...this.performanceBuffer]
    this.performanceBuffer = []
    
    try {
      // In production, send to analytics service
      if (process.env.NODE_ENV === 'production') {
        await fetch('/api/monitoring/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metrics })
        })
      } else {
        console.log('[FeatureFlagMonitoring] Performance metrics:', metrics)
      }
    } catch (error) {
      console.error('[FeatureFlagMonitoring] Failed to flush performance metrics:', error)
      // Re-add metrics to buffer if flush failed
      this.performanceBuffer.unshift(...metrics)
    }
  }
  
  // Flush error metrics
  private async flushErrors() {
    if (this.errorBuffer.length === 0) return
    
    const metrics = [...this.errorBuffer]
    this.errorBuffer = []
    
    try {
      // In production, send to error tracking service
      if (process.env.NODE_ENV === 'production') {
        await fetch('/api/monitoring/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metrics })
        })
      } else {
        console.log('[FeatureFlagMonitoring] Error metrics:', metrics)
      }
    } catch (error) {
      console.error('[FeatureFlagMonitoring] Failed to flush error metrics:', error)
      // Re-add metrics to buffer if flush failed
      this.errorBuffer.unshift(...metrics)
    }
  }
  
  // Flush usage metrics
  private async flushUsage() {
    if (this.usageBuffer.length === 0) return
    
    const metrics = [...this.usageBuffer]
    this.usageBuffer = []
    
    try {
      // In production, send to analytics service
      if (process.env.NODE_ENV === 'production') {
        await fetch('/api/monitoring/usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metrics })
        })
      } else {
        console.log('[FeatureFlagMonitoring] Usage metrics:', metrics)
      }
    } catch (error) {
      console.error('[FeatureFlagMonitoring] Failed to flush usage metrics:', error)
      // Re-add metrics to buffer if flush failed
      this.usageBuffer.unshift(...metrics)
    }
  }
  
  // Flush all metrics
  private flush() {
    this.flushPerformance()
    this.flushErrors()
    this.flushUsage()
  }
  
  // Start periodic flush
  private startPeriodicFlush() {
    this.flushInterval = setInterval(() => {
      this.flush()
    }, this.FLUSH_INTERVAL)
  }
  
  // Stop monitoring
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    this.flush()
  }
}

// Singleton instance
export const featureFlagMonitoring = new FeatureFlagMonitoring()

// React hook for easy usage
export const useFeatureFlagMonitoring = (
  component: string,
  version: 'original' | 'refactored'
) => {
  const trackPerformance = useCallback(
    (operation: string, duration: number, userId?: string) => {
      featureFlagMonitoring.trackPerformance(component, operation, duration, version, userId)
    },
    [component, version]
  )
  
  const trackError = useCallback(
    (error: Error, userId?: string) => {
      featureFlagMonitoring.trackError(component, error, version, userId)
    },
    [component, version]
  )
  
  const trackUsage = useCallback(
    (action: string, userId?: string, metadata?: Record<string, unknown>) => {
      featureFlagMonitoring.trackUsage(component, action, version, userId, metadata)
    },
    [component, version]
  )
  
  return {
    trackPerformance,
    trackError,
    trackUsage
  }
}

// Performance timing helper
export const measurePerformance = async <T>(
  operation: () => Promise<T>,
  component: string,
  operationName: string,
  version: 'original' | 'refactored',
  userId?: string
): Promise<T> => {
  const start = performance.now()
  
  try {
    const result = await operation()
    const duration = performance.now() - start
    
    featureFlagMonitoring.trackPerformance(
      component,
      operationName,
      duration,
      version,
      userId
    )
    
    return result
  } catch (error) {
    const duration = performance.now() - start
    
    featureFlagMonitoring.trackPerformance(
      component,
      operationName,
      duration,
      version,
      userId
    )
    
    if (error instanceof Error) {
      featureFlagMonitoring.trackError(component, error, version, userId)
    }
    
    throw error
  }
}

// Import React for the hook
import { useCallback } from 'react'