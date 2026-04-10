import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server';
import bunnyConfig from '../../../../../config/bunny-cdn.config';

/**
 * CDN Cache Purge API
 * Allows administrators to purge CDN cache for specific paths
 */

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Add admin role check
    // For now, any authenticated user can purge cache
    // In production, restrict to admin users only

    // Check if CDN is configured
    if (!bunnyConfig.enabled || !bunnyConfig.apiKey || !bunnyConfig.pullZoneId) {
      return NextResponse.json(
        { error: 'CDN not configured' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { paths = ['*'] } = body;

    // Validate paths
    if (!Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json(
        { error: 'Invalid paths provided' },
        { status: 400 }
      );
    }

    // Purge cache using Bunny CDN API
    const response = await fetch(
      `https://api.bunny.net/pullzone/${bunnyConfig.pullZoneId}/purgeCache`,
      {
        method: 'POST',
        headers: {
          'AccessKey': bunnyConfig.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paths),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('CDN purge failed:', errorData);
      
      return NextResponse.json(
        { error: 'Failed to purge CDN cache', details: errorData },
        { status: response.status }
      );
    }

    // Success response
    return NextResponse.json({
      success: true,
      message: `Successfully purged ${paths.length} path(s)`,
      paths,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('CDN purge error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check CDN status
export async function GET() {
  try {
    // Check authentication
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      enabled: bunnyConfig.enabled,
      configured: !!(bunnyConfig.apiKey && bunnyConfig.pullZoneId),
      cdnUrl: bunnyConfig.cdnUrl,
      optimizerEnabled: bunnyConfig.pullZone?.optimizer?.enabled || false,
      features: {
        imageOptimization: bunnyConfig.pullZone?.optimizer?.settings?.webpCompression || false,
        autoWebp: bunnyConfig.pullZone?.optimizer?.settings?.autoWebp || false,
        minification: bunnyConfig.pullZone?.optimizer?.settings?.minifyCSS && bunnyConfig.pullZone?.optimizer?.settings?.minifyJS || false,
        lazyLoading: bunnyConfig.pullZone?.optimizer?.settings?.lazyLoading || false,
      },
      rateLimiting: bunnyConfig.pullZone?.security?.rateLimiting || {},
      ddosProtection: bunnyConfig.pullZone?.security?.ddosProtection || {},
    });

  } catch (error) {
    console.error('CDN status error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}