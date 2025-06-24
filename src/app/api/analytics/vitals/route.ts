// Phase 3: Web Vitals Analytics Endpoint
// Collects and processes performance metrics

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface VitalMetric {
  metric: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  navigationType: string;
  timestamp: number;
  url: string;
  userAgent: string;
  connection: string;
}

// In-memory storage for demo (use database in production)
const metricsBuffer: VitalMetric[] = [];
const BUFFER_SIZE = 1000;
const FLUSH_INTERVAL = 60 * 1000; // 1 minute

// Type declaration for global variables
declare global {
  var metricsFlushInterval: NodeJS.Timeout | undefined;
  var cleanupMetrics: (() => void) | undefined;
}

// Flush metrics periodically
if (typeof global.metricsFlushInterval === 'undefined') {
  global.metricsFlushInterval = setInterval(async () => {
    if (metricsBuffer.length > 0) {
      await flushMetrics();
    }
  }, FLUSH_INTERVAL);
}

async function flushMetrics() {
  const metrics = [...metricsBuffer];
  metricsBuffer.length = 0;
  
  // In production, send to analytics service or database
  console.log(`[Analytics] Flushing ${metrics.length} metrics`);
  
  // Calculate aggregates
  const aggregates = metrics.reduce((acc, metric) => {
    if (!acc[metric.metric]) {
      acc[metric.metric] = {
        count: 0,
        sum: 0,
        good: 0,
        needsImprovement: 0,
        poor: 0,
      };
    }
    
    acc[metric.metric].count++;
    acc[metric.metric].sum += metric.value;
    acc[metric.metric][metric.rating.replace('-', '')] = 
      (acc[metric.metric][metric.rating.replace('-', '')] || 0) + 1;
    
    return acc;
  }, {} as Record<string, any>);
  
  // Log aggregates
  Object.entries(aggregates).forEach(([metric, data]) => {
    const average = data.sum / data.count;
    const goodPercentage = (data.good / data.count) * 100;
    
    console.log(`[Analytics] ${metric}: avg=${average.toFixed(2)}, good=${goodPercentage.toFixed(1)}%`);
  });
}

export async function POST(req: NextRequest) {
  try {
    const metric: VitalMetric = await req.json();
    
    // Validate metric
    if (!metric.metric || typeof metric.value !== 'number') {
      return NextResponse.json(
        { error: 'Invalid metric data' },
        { status: 400 }
      );
    }
    
    // Get session (optional - metrics work without auth)
    const session = await getServerSession(authOptions);
    
    // Enhance metric with server data
    const enhancedMetric = {
      ...metric,
      userId: session?.user?.id || 'anonymous',
      serverTimestamp: Date.now(),
      // Add geolocation from headers if available
      country: req.headers.get('x-vercel-ip-country') || 'unknown',
      city: req.headers.get('x-vercel-ip-city') || 'unknown',
    };
    
    // Add to buffer
    metricsBuffer.push(enhancedMetric);
    
    // Flush if buffer is full
    if (metricsBuffer.length >= BUFFER_SIZE) {
      setImmediate(flushMetrics);
    }
    
    // Log critical metrics immediately
    if (metric.rating === 'poor') {
      console.warn(`[Analytics] Poor ${metric.metric}:`, {
        value: metric.value,
        url: metric.url,
        userAgent: metric.userAgent,
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Analytics] Error processing metric:', error);
    return NextResponse.json(
      { error: 'Failed to process metric' },
      { status: 500 }
    );
  }
}

// GET endpoint for retrieving metrics (admin only)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // In production, check for admin role
  // if (!session.user.isAdmin) {
  //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // }
  
  // Return current buffer stats
  const stats = {
    bufferSize: metricsBuffer.length,
    metrics: metricsBuffer.slice(-100), // Last 100 metrics
    timestamp: Date.now(),
  };
  
  return NextResponse.json(stats);
}

// Cleanup on module unload
if (typeof global.cleanupMetrics === 'undefined') {
  global.cleanupMetrics = () => {
    if (global.metricsFlushInterval) {
      clearInterval(global.metricsFlushInterval);
      delete global.metricsFlushInterval;
    }
  };
}