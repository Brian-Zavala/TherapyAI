import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateVapiKey } from '@/lib/vapi-key-validator';

/**
 * Debug endpoint to check VAPI configuration
 * Only accessible in development mode
 */
export async function GET(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.VAPI_API_KEY;
  const orgId = process.env.VAPI_ORG_ID;
  const privateKey = process.env.VAPI_PRIVATE_KEY;

  const keyValidation = apiKey ? validateVapiKey(apiKey) : null;

  const config = {
    hasApiKey: !!apiKey,
    hasOrgId: !!orgId,
    hasPrivateKey: !!privateKey,
    keyValidation: keyValidation,
    keyPrefix: apiKey ? apiKey.substring(0, 5) + '...' : null,
    recommendations: [],
  };

  // Add recommendations
  if (!apiKey) {
    config.recommendations.push('Set VAPI_API_KEY in your .env file');
  } else if (keyValidation && !keyValidation.isValid) {
    config.recommendations.push(...(keyValidation.recommendations || []));
  } else if (keyValidation && keyValidation.type === 'secret') {
    config.recommendations.push(
      'You are using a secret key (sk_). For web usage, create a public key (pk_) in VAPI dashboard.'
    );
  } else if (keyValidation && keyValidation.type === 'public') {
    config.recommendations.push(
      'Great! You have a public key configured. This is the recommended setup for web SDK.'
    );
  }

  if (!orgId && privateKey) {
    config.recommendations.push(
      'You have VAPI_PRIVATE_KEY but no VAPI_ORG_ID. Both are needed for JWT generation.'
    );
  }

  return NextResponse.json({
    status: 'debug',
    timestamp: new Date().toISOString(),
    config,
    authMethod: keyValidation?.type === 'public' ? 'public-key' : 'jwt',
    webSdkReady: keyValidation?.isValid && keyValidation.type === 'public',
  });
}