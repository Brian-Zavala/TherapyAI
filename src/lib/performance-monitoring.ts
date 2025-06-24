// Performance monitoring utilities for the therapy application
// Using web-vitals v5.0.3 (latest 2025)
import { onCLS, onFCP, onFID, onLCP, onTTFB, Metric } from 'web-vitals'

interface PerformanceMetric {
  name: string
  value: number
  id: string
  delta: number
  rating: 'good' | 'needs-improvement' | 'poor'
}

interface PerformanceReport {
  page: string
  metrics: PerformanceMetric[]
  timestamp: number
  userAgent: string
  connectionType?: string
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private page: string = ''
  
  constructor(page?: string) {
    this.page = page || window.location.pathname
    this.initializeMonitoring()
  }
  
  private initializeMonitoring() {
    const reportCallback = (metric: Metric) => {
      this.metrics.push({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        delta: metric.delta,
        rating: metric.rating
      })
      
      // Log critical performance issues immediately
      if (metric.rating === 'poor') {
        console.warn(`🚨 Poor performance detected: ${metric.name} = ${metric.value}`)
      }
      
      // Send to analytics in production
      if (process.env.NODE_ENV === 'production') {
        this.sendToAnalytics(metric)
      }
    }
    
    // Monitor all Core Web Vitals with new v5 API
    onCLS(reportCallback)
    onFCP(reportCallback) 
    onFID(reportCallback)
    onLCP(reportCallback)
    onTTFB(reportCallback)
  }
  
  private sendToAnalytics(metric: PerformanceMetric) {
    // Integration with analytics service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'performance_metric', {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_rating: metric.rating,
        page_path: this.page
      })
    }
    
    // Optional: Send to custom analytics endpoint
    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: this.page,
        metric,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        connectionType: (navigator as any).connection?.effectiveType
      })
    }).catch(err => console.warn('Failed to send performance metrics:', err))
  }
  
  public getReport(): PerformanceReport {
    return {
      page: this.page,
      metrics: this.metrics,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      connectionType: (navigator as any).connection?.effectiveType
    }
  }
  
  public logComponentPerformance(componentName: string, renderTime: number) {
    if (renderTime > 16) { // More than 1 frame (60fps)
      console.warn(`🐌 Slow component render: ${componentName} took ${renderTime}ms`)
      
      // Track slow components
      if (process.env.NODE_ENV === 'production') {
        fetch('/api/analytics/slow-components', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            component: componentName,
            renderTime,
            page: this.page,
            timestamp: Date.now()
          })
        }).catch(() => {}) // Silent fail
      }
    }
  }
}

// React hook for performance monitoring
export function usePerformanceMonitoring(pageName?: string) {
  const monitor = new PerformanceMonitor(pageName)
  
  return {
    monitor,
    logComponentPerformance: monitor.logComponentPerformance.bind(monitor),
    getReport: monitor.getReport.bind(monitor)
  }
}

// Higher-order component for automatic performance monitoring
import React from 'react'

export function withPerformanceMonitoring<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  componentName?: string
) {
  const WrappedComponent = (props: T) => {
    const startTime = performance.now()
    
    React.useEffect(() => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      const monitor = new PerformanceMonitor()
      monitor.logComponentPerformance(
        componentName || Component.displayName || Component.name || 'UnknownComponent',
        renderTime
      )
    })
    
    return React.createElement(Component, props)
  }
  
  WrappedComponent.displayName = `withPerformanceMonitoring(${Component.displayName || Component.name || 'Component'})`
  return WrappedComponent
}

// Bundle size analyzer utilities
export const bundleAnalyzer = {
  logImportSize: (moduleName: string, moduleSize?: number) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📦 Import: ${moduleName}${moduleSize ? ` (${moduleSize}KB)` : ''}`)
    }
  },
  
  measureAsyncImport: async (importFn: () => Promise<any>, moduleName: string) => {
    const start = performance.now()
    const module = await importFn()
    const loadTime = performance.now() - start
    
    if (loadTime > 100) { // Slow import
      console.warn(`🐌 Slow import: ${moduleName} took ${loadTime}ms`)
    }
    
    return module
  }
}

// Performance-aware component profiler
export function PerformanceProfiler({ 
  children, 
  id 
}: { 
  children: React.ReactNode
  id: string 
}) {
  const onRender = React.useCallback((
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    if (actualDuration > 16) {
      console.warn(`🚨 Slow ${phase}: ${id} took ${actualDuration}ms (baseline: ${baseDuration}ms)`)
    }
  }, [])
  
  return React.createElement(
    React.Profiler,
    { id, onRender },
    children
  )
}

export default PerformanceMonitor