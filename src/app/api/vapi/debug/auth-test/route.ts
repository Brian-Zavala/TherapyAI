import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

/**
 * Comprehensive VAPI authentication test endpoint
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: any = {
      timestamp: new Date().toISOString(),
      environment: {
        hasApiKey: !!process.env.VAPI_API_KEY,
        apiKeyPrefix: process.env.VAPI_API_KEY?.substring(0, 3),
        hasPrivateKey: !!process.env.VAPI_PRIVATE_KEY,
        privateKeyLength: process.env.VAPI_PRIVATE_KEY?.length,
        hasOrgId: !!process.env.VAPI_ORG_ID,
        orgIdLength: process.env.VAPI_ORG_ID?.length,
      },
      tests: []
    };

    // Test 1: Direct API key authentication
    if (process.env.VAPI_API_KEY) {
      try {
        const response = await fetch('https://api.vapi.ai/assistant', {
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          },
        });
        
        results.tests.push({
          test: 'Direct API Key',
          method: 'Bearer API_KEY',
          endpoint: '/assistant',
          status: response.status,
          success: response.ok,
          error: !response.ok ? await response.text() : null,
        });
      } catch (error) {
        results.tests.push({
          test: 'Direct API Key',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Test 2: JWT with private scope
    if (process.env.VAPI_ORG_ID && process.env.VAPI_PRIVATE_KEY) {
      try {
        const payload = {
          orgId: process.env.VAPI_ORG_ID,
          token: {
            tag: 'private',
          },
        };
        
        const token = jwt.sign(payload, process.env.VAPI_PRIVATE_KEY, {
          algorithm: 'HS256',
          expiresIn: '1h',
        });
        
        const response = await fetch('https://api.vapi.ai/assistant', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        results.tests.push({
          test: 'JWT Private Scope',
          method: 'JWT with HS256',
          payload: payload,
          endpoint: '/assistant',
          status: response.status,
          success: response.ok,
          error: !response.ok ? await response.text() : null,
        });
      } catch (error) {
        results.tests.push({
          test: 'JWT Private Scope',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Test 3: Test public web call endpoint with JWT
    if (process.env.VAPI_ORG_ID && process.env.VAPI_PRIVATE_KEY) {
      try {
        const payload = {
          orgId: process.env.VAPI_ORG_ID,
          token: {
            tag: 'public',
            restrictions: {
              enabled: true,
              allowedOrigins: ['http://localhost:3000', 'http://localhost:3001'],
              allowTransientAssistant: true,
            },
          },
        };
        
        const token = jwt.sign(payload, process.env.VAPI_PRIVATE_KEY, {
          algorithm: 'HS256',
          expiresIn: '1h',
        });
        
        // Test if we can at least validate the token format
        const decoded = jwt.decode(token);
        
        results.tests.push({
          test: 'JWT Public Scope',
          method: 'JWT with HS256',
          payload: payload,
          tokenDecoded: decoded,
          tokenLength: token.length,
          note: 'Public tokens are for web client use only',
        });
      } catch (error) {
        results.tests.push({
          test: 'JWT Public Scope',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Test 4: Check account info endpoint (different auth method?)
    if (process.env.VAPI_API_KEY) {
      try {
        const response = await fetch('https://api.vapi.ai/account', {
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          },
        });
        
        results.tests.push({
          test: 'Account Endpoint',
          method: 'Bearer API_KEY',
          endpoint: '/account',
          status: response.status,
          success: response.ok,
          data: response.ok ? await response.json() : null,
          error: !response.ok ? await response.text() : null,
        });
      } catch (error) {
        results.tests.push({
          test: 'Account Endpoint',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Generate recommendations
    const recommendations = [];
    const hasWorkingAuth = results.tests.some((t: any) => t.success);
    
    if (!hasWorkingAuth) {
      recommendations.push('❌ No authentication method is working');
      
      // Check for specific patterns
      const has401 = results.tests.some((t: any) => t.status === 401);
      const has403 = results.tests.some((t: any) => t.status === 403);
      
      if (has401) {
        recommendations.push('💡 401 errors suggest invalid credentials');
        recommendations.push('💡 Verify your VAPI_API_KEY starts with "pk_" for public key');
        recommendations.push('💡 Check if VAPI_PRIVATE_KEY and VAPI_ORG_ID match your VAPI account');
      }
      
      if (has403) {
        recommendations.push('💡 403 errors suggest valid auth but insufficient permissions');
      }
    } else {
      const workingTest = results.tests.find((t: any) => t.success);
      recommendations.push(`✅ Authentication working with: ${workingTest.test}`);
    }
    
    // Check API key format
    if (process.env.VAPI_API_KEY && !process.env.VAPI_API_KEY.startsWith('pk_')) {
      recommendations.push('⚠️ VAPI_API_KEY should start with "pk_" for public keys');
    }

    results.recommendations = recommendations;

    return NextResponse.json(results);
  } catch (error) {
    console.error('Auth test endpoint error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Test failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}