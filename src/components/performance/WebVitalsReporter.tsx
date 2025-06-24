// Phase 3: Web Vitals Reporter Component
// Real-time performance monitoring with 2025 best practices

'use client';

import { useEffect } from 'react';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

type MetricName = 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';

interface Metric {
  name: MetricName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'back-forward-cache' | 'prerender' | 'restore';
}

const thresholds = {
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  INP: { good: 200, poor: 500 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 }
};

function getRating(metric: MetricName, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = thresholds[metric];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

async function sendToAnalytics(metric: Metric) {
  // Send to your analytics endpoint
  const body = JSON.stringify({
    metric: metric.name,
    value: metric.value,
    rating: metric.rating,
    navigationType: metric.navigationType,
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    connection: (navigator as any).connection?.effectiveType || 'unknown'
  });

  // Use sendBeacon for reliability
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/vitals', body);
  } else {
    // Fallback to fetch
    fetch('/api/analytics/vitals', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true
    }).catch(() => {
      // Silently fail - don't impact user experience
    });
  }

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      navigationType: metric.navigationType
    });
  }
}

export function WebVitalsReporter() {
  useEffect(() => {
    // Cumulative Layout Shift
    onCLS((metric) => {
      sendToAnalytics({
        name: 'CLS',
        value: metric.value,
        rating: getRating('CLS', metric.value),
        navigationType: metric.navigationType || 'navigate'
      });
    });

    // First Contentful Paint
    onFCP((metric) => {
      sendToAnalytics({
        name: 'FCP',
        value: metric.value,
        rating: getRating('FCP', metric.value),
        navigationType: metric.navigationType || 'navigate'
      });
    });

    // Interaction to Next Paint (replaced FID in web-vitals v5)
    onINP((metric) => {
      sendToAnalytics({
        name: 'INP',
        value: metric.value,
        rating: getRating('INP', metric.value),
        navigationType: metric.navigationType || 'navigate'
      });
    });

    // Largest Contentful Paint
    onLCP((metric) => {
      sendToAnalytics({
        name: 'LCP',
        value: metric.value,
        rating: getRating('LCP', metric.value),
        navigationType: metric.navigationType || 'navigate'
      });
    });

    // Time to First Byte
    onTTFB((metric) => {
      sendToAnalytics({
        name: 'TTFB',
        value: metric.value,
        rating: getRating('TTFB', metric.value),
        navigationType: metric.navigationType || 'navigate'
      });
    });

    // Additional performance monitoring
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Monitor long tasks
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              console.warn('[Performance] Long task detected:', {
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name
              });
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });

        return () => observer.disconnect();
      } catch (e) {
        // Some browsers don't support longtask
      }
    }
  }, []);

  return null; // This component doesn't render anything
}