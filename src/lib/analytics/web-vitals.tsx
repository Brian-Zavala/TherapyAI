// @ts-nocheck
'use client'

import { useEffect } from 'react'
import { analytics } from './posthog'

// Web Vitals types
interface Metric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  entries: PerformanceEntry[]
}

// Thresholds based on Web Vitals standards
const thresholds = {
  FCP: [1800, 3000],
  LCP: [2500, 4000],
  FID: [100, 300],
  CLS: [0.1, 0.25],
  TTFB: [800, 1800],
  INP: [200, 500],
}

function getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = thresholds[metric as keyof typeof thresholds]
  if (!threshold) return 'good'
  
  if (value <= threshold[0]) return 'good'
  if (value <= threshold[1]) return 'needs-improvement'
  return 'poor'
}

// Send metrics to analytics
function sendToAnalytics(metric: Metric) {
  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
    })
  }
  
  // Send to PostHog
  analytics.webVitals({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
  })
  
  // Custom logging for poor performance
  if (metric.rating === 'poor') {
    console.warn(`[Web Vitals] Poor ${metric.name} performance:`, metric.value)
  }
}

// Component to track Web Vitals
export function WebVitalsReporter() {
  useEffect(() => {
    // Only run on client and not on localhost (unless explicitly enabled)
    if (typeof window === 'undefined') return
    if (window.location.hostname === 'localhost' && !process.env.NEXT_PUBLIC_ENABLE_LOCAL_ANALYTICS) {
      return
    }
    
    // Dynamically import web-vitals to reduce bundle size
    import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB, onINP }) => {
      // Core Web Vitals
      onCLS((metric) => sendToAnalytics({ ...metric, rating: getRating('CLS', metric.value) }))
      onFID((metric) => sendToAnalytics({ ...metric, rating: getRating('FID', metric.value) }))
      onFCP((metric) => sendToAnalytics({ ...metric, rating: getRating('FCP', metric.value) }))
      onLCP((metric) => sendToAnalytics({ ...metric, rating: getRating('LCP', metric.value) }))
      onTTFB((metric) => sendToAnalytics({ ...metric, rating: getRating('TTFB', metric.value) }))
      onINP((metric) => sendToAnalytics({ ...metric, rating: getRating('INP', metric.value) }))
    }).catch((error) => {
      console.error('[Web Vitals] Failed to load web-vitals library:', error)
    })
  }, [])
  
  return null
}

// Custom performance observer for additional metrics
export function usePerformanceObserver() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return
    
    // Observe long tasks
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            analytics.track('long_task_detected', {
              duration: entry.duration,
              start_time: entry.startTime,
              name: entry.name,
            })
          }
        }
      })
      
      longTaskObserver.observe({ entryTypes: ['longtask'] })
      
      return () => {
        longTaskObserver.disconnect()
      }
    } catch (error) {
      // Some browsers don't support longtask
      console.debug('[Performance] Long task observer not supported')
    }
  }, [])
}

// Export a combined performance monitoring component
export function PerformanceMonitoring() {
  usePerformanceObserver()
  
  return <WebVitalsReporter />
}