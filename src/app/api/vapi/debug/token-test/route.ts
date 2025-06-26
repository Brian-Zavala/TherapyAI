import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { vapiJWTRedisService } from '@/lib/vapi-jwt-redis.service';
import jwt from 'jsonwebtoken';

/**
 * Debug endpoint to test VAPI token generation and validation
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check environment variables
    const envCheck = {
      VAPI_API_KEY: !!process.env.VAPI_API_KEY,
      VAPI_ORG_ID: !!process.env.VAPI_ORG_ID,
      VAPI_PRIVATE_KEY: !!process.env.VAPI_PRIVATE_KEY,
    };

    // Check if JWT service is initialized
    const jwtServiceAvailable = !!vapiJWTRedisService;

    let tokenInfo = null;
    let decodedToken = null;
    let tokenError = null;

    if (jwtServiceAvailable) {
      try {
        // Generate a test token
        const tokenData = await vapiJWTRedisService.getOrCreateToken(
          session.user.id,
          'public',
          'standard'
        );
        tokenInfo = tokenData;

        // Decode the token to inspect its contents
        decodedToken = jwt.decode(tokenData.token, { complete: true });
      } catch (error) {
        tokenError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Check VAPI API Key format
    let apiKeyInfo = null;
    if (process.env.VAPI_API_KEY) {
      const apiKey = process.env.VAPI_API_KEY;
      apiKeyInfo = {
        length: apiKey.length,
        startsWithExpected: apiKey.startsWith('sk-') || apiKey.startsWith('pk-'),
        format: apiKey.match(/^[a-zA-Z0-9-_]+$/) ? 'valid' : 'invalid',
      };
    }

    // Check Private Key format
    let privateKeyInfo = null;
    if (process.env.VAPI_PRIVATE_KEY) {
      const privateKey = process.env.VAPI_PRIVATE_KEY;
      privateKeyInfo = {
        isRSAKey: privateKey.includes('-----BEGIN'),
        isPEMFormat: privateKey.includes('-----BEGIN') && privateKey.includes('-----END'),
        length: privateKey.length,
        // Check if it's a UUID-style key
        isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(privateKey),
      };
    }

    // Test VAPI API connection (if API key is available)
    let apiConnectionTest = null;
    if (process.env.VAPI_API_KEY) {
      try {
        const response = await fetch('https://api.vapi.ai/assistant', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        apiConnectionTest = {
          status: response.status,
          statusText: response.statusText,
          success: response.ok,
          headers: {
            'x-rate-limit-limit': response.headers.get('x-rate-limit-limit'),
            'x-rate-limit-remaining': response.headers.get('x-rate-limit-remaining'),
          },
        };

        if (!response.ok && response.status === 401) {
          apiConnectionTest.error = 'Invalid API key';
        }
      } catch (error) {
        apiConnectionTest = {
          error: error instanceof Error ? error.message : 'Connection failed',
        };
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      user: {
        id: session.user.id,
        email: session.user.email,
      },
      environment: {
        ...envCheck,
        jwtServiceAvailable,
      },
      apiKey: apiKeyInfo,
      privateKey: privateKeyInfo,
      token: tokenInfo ? {
        token: tokenInfo.token.substring(0, 50) + '...',
        expiresAt: tokenInfo.expiresAt,
        scope: tokenInfo.scope,
        cached: tokenInfo.cached,
      } : null,
      decodedToken: decodedToken ? {
        header: decodedToken.header,
        payload: decodedToken.payload,
      } : null,
      tokenError,
      apiConnectionTest,
      recommendations: generateRecommendations(envCheck, apiKeyInfo, privateKeyInfo, apiConnectionTest),
    });
  } catch (error) {
    console.error('Error in token debug route:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Debug test failed',
    }, { status: 500 });
  }
}

function generateRecommendations(
  envCheck: Record<string, boolean>,
  apiKeyInfo: any,
  privateKeyInfo: any,
  apiConnectionTest: any
): string[] {
  const recommendations: string[] = [];

  // Check environment variables
  if (!envCheck.VAPI_API_KEY) {
    recommendations.push('VAPI_API_KEY is missing. This is required for server-side VAPI operations.');
  }
  if (!envCheck.VAPI_ORG_ID) {
    recommendations.push('VAPI_ORG_ID is missing. This is required for JWT token generation.');
  }
  if (!envCheck.VAPI_PRIVATE_KEY) {
    recommendations.push('VAPI_PRIVATE_KEY is missing. This is required for JWT token generation.');
  }

  // Check API key format
  if (apiKeyInfo && !apiKeyInfo.startsWithExpected) {
    recommendations.push('VAPI_API_KEY should start with "sk-" or "pk-". Check if you have the correct key.');
  }

  // Check private key format
  if (privateKeyInfo) {
    if (!privateKeyInfo.isRSAKey && !privateKeyInfo.isUUID) {
      recommendations.push('VAPI_PRIVATE_KEY format is unclear. It should be either a PEM-formatted RSA key or a UUID.');
    }
  }

  // Check API connection
  if (apiConnectionTest) {
    if (apiConnectionTest.status === 401) {
      recommendations.push('VAPI API key is invalid. Please check your VAPI_API_KEY in the environment variables.');
    } else if (apiConnectionTest.status === 403) {
      recommendations.push('VAPI API key has insufficient permissions. Check your VAPI account settings.');
    } else if (apiConnectionTest.error) {
      recommendations.push(`VAPI API connection failed: ${apiConnectionTest.error}`);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('All VAPI configuration checks passed successfully.');
  }

  return recommendations;
}