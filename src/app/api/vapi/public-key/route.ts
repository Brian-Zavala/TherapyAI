import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server';

/**
 * Returns the VAPI public key for client-side initialization
 * This endpoint ensures the key is available at runtime, not just build time
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the public key from environment
    const publicKey = process.env.NEXT_PUBLIC_VAPI_API_KEY || process.env.VAPI_API_KEY;
    
    if (!publicKey) {
      console.error('[VAPI Public Key] No API key found in environment variables');
      return NextResponse.json({ 
        error: 'VAPI configuration missing',
        details: 'No public API key available'
      }, { status: 503 });
    }

    // Validate it's a public key
    if (!publicKey.startsWith('pk_')) {
      console.error('[VAPI Public Key] Invalid key format - expected pk_ prefix');
      return NextResponse.json({ 
        error: 'Invalid VAPI configuration',
        details: 'API key is not a public key'
      }, { status: 500 });
    }

    console.log('[VAPI Public Key] Returning public key for user:', session.user.email);

    return NextResponse.json({ 
      publicKey,
      type: 'public',
      cached: false 
    });

  } catch (error) {
    console.error('Error in public key route:', error);
    return NextResponse.json({
      error: 'Failed to retrieve public key',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}