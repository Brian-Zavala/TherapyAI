import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

/**
 * Debug endpoint to test JWT token generation and decoding
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check environment variables
    const orgId = process.env.VAPI_ORG_ID;
    const privateKey = process.env.VAPI_PRIVATE_KEY;
    
    const envCheck = {
      hasOrgId: !!orgId,
      orgIdLength: orgId?.length || 0,
      hasPrivateKey: !!privateKey,
      privateKeyType: privateKey?.includes('-----BEGIN') ? 'RSA/PEM' : 'Plain/UUID',
      privateKeyLength: privateKey?.length || 0,
    };

    if (!orgId || !privateKey) {
      return NextResponse.json({
        error: 'Missing required environment variables',
        envCheck,
      }, { status: 500 });
    }

    // Format private key
    const formattedKey = privateKey.includes('-----BEGIN') 
      ? privateKey.replace(/\\n/g, '\n') 
      : privateKey;

    // Generate test token with different structures
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 3600; // 1 hour

    // Test 1: Current implementation structure
    const payload1 = {
      orgId: orgId,
      token: {
        tag: 'public',
        restrictions: {
          enabled: true,
          allowedOrigins: ['http://localhost:3000', 'http://localhost:3001'],
          allowTransientAssistant: true,
        },
      },
      sub: session.user.id,
      iat: now,
      exp: expiresAt,
      iss: 'vapi-therapy-app',
    };

    // Test 2: Simplified structure (just orgId and token)
    const payload2 = {
      orgId: orgId,
      token: {
        tag: 'public',
      },
    };

    try {
      const algorithm = formattedKey.includes('-----BEGIN') ? 'RS256' : 'HS256';
      
      // Generate tokens
      const token1 = jwt.sign(payload1, formattedKey, { algorithm: algorithm as jwt.Algorithm });
      const token2 = jwt.sign(payload2, formattedKey, { 
        algorithm: algorithm as jwt.Algorithm,
        expiresIn: '1h'
      });

      // Decode tokens to show structure
      const decoded1 = jwt.decode(token1);
      const decoded2 = jwt.decode(token2);

      // Test VAPI API with generated token
      let vapiTestResults = [];
      
      // Test with token1
      try {
        const response1 = await fetch('https://api.vapi.ai/assistant', {
          headers: {
            'Authorization': `Bearer ${token1}`,
            'Content-Type': 'application/json',
          },
        });
        
        vapiTestResults.push({
          tokenVersion: 'Full payload with restrictions',
          status: response1.status,
          statusText: response1.statusText,
          success: response1.ok,
          error: !response1.ok ? await response1.text() : null,
        });
      } catch (error) {
        vapiTestResults.push({
          tokenVersion: 'Full payload with restrictions',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Test with token2
      try {
        const response2 = await fetch('https://api.vapi.ai/assistant', {
          headers: {
            'Authorization': `Bearer ${token2}`,
            'Content-Type': 'application/json',
          },
        });
        
        vapiTestResults.push({
          tokenVersion: 'Minimal payload',
          status: response2.status,
          statusText: response2.statusText,
          success: response2.ok,
          error: !response2.ok ? await response2.text() : null,
        });
      } catch (error) {
        vapiTestResults.push({
          tokenVersion: 'Minimal payload',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      return NextResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        envCheck,
        algorithm,
        tokens: {
          token1: {
            structure: 'Full payload with restrictions',
            payload: decoded1,
            tokenLength: token1.length,
            tokenPreview: token1.substring(0, 50) + '...',
          },
          token2: {
            structure: 'Minimal payload',
            payload: decoded2,
            tokenLength: token2.length,
            tokenPreview: token2.substring(0, 50) + '...',
          },
        },
        vapiTestResults,
        recommendations: generateRecommendations(vapiTestResults),
      });
    } catch (error) {
      return NextResponse.json({
        error: 'JWT generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        envCheck,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('JWT test endpoint error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Test failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(testResults: any[]): string[] {
  const recommendations: string[] = [];
  
  const successfulTest = testResults.find(r => r.success);
  const allFailed = testResults.every(r => !r.success);
  
  if (successfulTest) {
    recommendations.push(`✅ JWT authentication working with ${successfulTest.tokenVersion}`);
  }
  
  if (allFailed) {
    recommendations.push('❌ All JWT token formats failed - check your VAPI_ORG_ID and VAPI_PRIVATE_KEY');
    
    // Check for specific error patterns
    const has401 = testResults.some(r => r.status === 401);
    const has403 = testResults.some(r => r.status === 403);
    
    if (has401) {
      recommendations.push('❌ 401 Unauthorized - Your JWT token is not being recognized by VAPI');
      recommendations.push('💡 Verify your VAPI_ORG_ID matches your VAPI account');
      recommendations.push('💡 Ensure your VAPI_PRIVATE_KEY is the correct format (RSA or plain)');
    }
    
    if (has403) {
      recommendations.push('❌ 403 Forbidden - Your JWT token is recognized but not authorized');
      recommendations.push('💡 Check if your VAPI account has the necessary permissions');
    }
  }
  
  return recommendations;
}