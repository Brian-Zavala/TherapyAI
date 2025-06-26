'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// PostHog configuration
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || ''
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'

// Initialize PostHog client
if (typeof window !== 'undefined' && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') posthog.debug()
    },
    autocapture: false, // We'll manually track important events
    capture_pageview: false, // We'll handle this ourselves for better control
    capture_pageleave: true,
    disable_session_recording: process.env.NODE_ENV === 'development',
    person_profiles: 'identified_only', // Only create profiles for logged-in users
    persistence: 'localStorage+cookie', // Use both for reliability
    bootstrap: {
      distinctID: undefined,
      isIdentifiedID: false,
    },
    // Performance optimizations
    loaded_callback: () => {
      console.log('[Analytics] PostHog loaded successfully')
    },
    sanitize_properties: (properties) => {
      // Remove sensitive data
      const sanitized = { ...properties }
      delete sanitized.password
      delete sanitized.email
      delete sanitized.phone
      return sanitized
    },
  })
}

// Custom hook for page view tracking
export function usePostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname && POSTHOG_KEY) {
      let url = window.origin + pathname
      if (searchParams.toString()) {
        url = url + '?' + searchParams.toString()
      }
      posthog.capture('$pageview', {
        $current_url: url,
        $pathname: pathname,
      })
    }
  }, [pathname, searchParams])
}

// Analytics event helpers
export const analytics = {
  // User events
  identify: (userId: string, traits?: Record<string, any>) => {
    if (!POSTHOG_KEY) return
    posthog.identify(userId, traits)
  },
  
  reset: () => {
    if (!POSTHOG_KEY) return
    posthog.reset()
  },
  
  // Track custom events
  track: (event: string, properties?: Record<string, any>) => {
    if (!POSTHOG_KEY) return
    posthog.capture(event, properties)
  },
  
  // Session events
  sessionStarted: (sessionType: string, sessionId: string) => {
    analytics.track('session_started', {
      session_type: sessionType,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
    })
  },
  
  sessionEnded: (sessionId: string, duration: number, reason: string) => {
    analytics.track('session_ended', {
      session_id: sessionId,
      duration_seconds: duration,
      end_reason: reason,
      timestamp: new Date().toISOString(),
    })
  },
  
  // Feature usage
  featureUsed: (feature: string, metadata?: Record<string, any>) => {
    analytics.track('feature_used', {
      feature_name: feature,
      ...metadata,
    })
  },
  
  // Error tracking
  error: (error: Error, context?: Record<string, any>) => {
    analytics.track('error_occurred', {
      error_message: error.message,
      error_stack: error.stack,
      ...context,
    })
  },
  
  // Performance metrics
  webVitals: (metric: { name: string; value: number; rating: string }) => {
    analytics.track('web_vital_measured', {
      metric_name: metric.name,
      metric_value: metric.value,
      metric_rating: metric.rating,
      timestamp: new Date().toISOString(),
    })
  },
}

// Export PostHog instance for advanced usage
export { posthog, PHProvider as PostHogProvider }

// Analytics context provider
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  usePostHogPageView()
  
  if (!POSTHOG_KEY) {
    console.warn('[Analytics] PostHog key not configured')
    return children as React.ReactElement
  }
  
  return React.createElement(PHProvider, { client: posthog }, children)
}