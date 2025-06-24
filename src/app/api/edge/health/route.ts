// Phase 3: Edge Runtime API Route
// Ultra-fast health check endpoint running on edge

import { NextRequest } from 'next/server';

export const runtime = 'edge'; // Enable edge runtime
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Edge runtime benefits:
  // - Runs closer to users (global edge network)
  // - Faster cold starts
  // - Lower latency
  // - Better scalability
  
  const startTime = Date.now();
  
  // Basic health checks
  const health: {
    status: string;
    timestamp: string;
    edge: boolean;
    region: string;
    responseTime: number;
    services?: {
      vapi: string;
      supabase: string;
    };
    error?: string;
  } = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    edge: true,
    region: request.headers.get('x-vercel-edge-region') || 'unknown',
    responseTime: 0, // Will be calculated
  };
  
  // Check critical services (lightweight checks only)
  try {
    // Example: Check if API key exists
    const hasVapiKey = !!process.env.VAPI_API_KEY;
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    health.services = {
      vapi: hasVapiKey ? 'configured' : 'missing',
      supabase: hasSupabaseUrl ? 'configured' : 'missing',
    };
  } catch (error) {
    health.status = 'degraded';
    health.error = 'Failed to check services';
  }
  
  // Calculate response time
  health.responseTime = Date.now() - startTime;
  
  return new Response(JSON.stringify(health, null, 2), {
    status: health.status === 'healthy' ? 200 : 503,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Response-Time': `${health.responseTime}ms`,
    },
  });
}