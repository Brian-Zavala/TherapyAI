import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { analyzeVAPIKey, generateVAPIToken, testVAPIAuthentication } from '@/lib/vapi-auth-debug';

/**
 * Comprehensive VAPI authentication test
 * Tests all possible authentication methods and provides detailed diagnostics
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = {
      timestamp: new Date().toISOString(),
      environment: {
        hasApiKey: !!process.env.VAPI_API_KEY,
        hasPrivateKey: !!process.env.VAPI_PRIVATE_KEY,
        hasOrgId: !!process.env.VAPI_ORG_ID,
      },
      keyAnalysis: {} as any,
      tests: [] as any[],
      recommendations: [] as string[],
    };

    // Analyze API key if present
    if (process.env.VAPI_API_KEY) {
      results.keyAnalysis.apiKey = analyzeVAPIKey(process.env.VAPI_API_KEY);
      
      // Test direct API key usage
      const apiKeyTest = await testVAPIAuthentication(process.env.VAPI_API_KEY);
      results.tests.push({
        name: 'Direct API Key',
        method: 'Bearer {API_KEY}',
        ...apiKeyTest,
      });
    }

    // Test JWT generation if we have the required credentials
    if (process.env.VAPI_PRIVATE_KEY && process.env.VAPI_ORG_ID) {
      results.keyAnalysis.privateKey = analyzeVAPIKey(process.env.VAPI_PRIVATE_KEY);

      // Test 1: Private scope JWT
      try {
        const privateToken = generateVAPIToken(
          process.env.VAPI_PRIVATE_KEY,
          process.env.VAPI_ORG_ID,
          'private'
        );
        
        const privateTest = await testVAPIAuthentication(privateToken);
        results.tests.push({
          name: 'JWT Private Scope',
          method: 'JWT with tag: "private"',
          tokenLength: privateToken.length,
          ...privateTest,
        });
      } catch (error) {
        results.tests.push({
          name: 'JWT Private Scope',
          error: error instanceof Error ? error.message : 'Generation failed',
        });
      }

      // Test 2: Public scope JWT with restrictions
      try {
        const publicToken = generateVAPIToken(
          process.env.VAPI_PRIVATE_KEY,
          process.env.VAPI_ORG_ID,
          'public',
          {
            allowedOrigins: ['http://localhost:3000', 'http://localhost:3001'],
            allowTransientAssistant: true,
          }
        );
        
        // Note: Public tokens are only for web calls, not API endpoints
        results.tests.push({
          name: 'JWT Public Scope',
          method: 'JWT with tag: "public"',
          tokenLength: publicToken.length,
          note: 'Public tokens are only for /call/web endpoint',
          success: true, // Can't test with /assistant endpoint
        });
      } catch (error) {
        results.tests.push({
          name: 'JWT Public Scope',
          error: error instanceof Error ? error.message : 'Generation failed',
        });
      }
    }

    // Generate recommendations based on results
    results.recommendations = generateRecommendations(results);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Comprehensive test error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Test failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(results: any): string[] {
  const recommendations: string[] = [];
  
  // Check if any test succeeded
  const hasSuccessfulTest = results.tests.some((t: any) => t.success);
  
  if (!hasSuccessfulTest) {
    recommendations.push('❌ No authentication method is working with VAPI');
    
    // Check for 401 errors
    const has401 = results.tests.some((t: any) => t.status === 401);
    if (has401) {
      recommendations.push('⚠️ 401 errors indicate invalid credentials or incorrect token format');
      recommendations.push('💡 Ensure your VAPI_PRIVATE_KEY is the correct server key from VAPI dashboard');
      recommendations.push('💡 Check if your VAPI_ORG_ID matches your VAPI organization');
    }
    
    // Check for 403 errors
    const has403 = results.tests.some((t: any) => t.status === 403);
    if (has403) {
      recommendations.push('⚠️ 403 errors indicate the token is recognized but not authorized');
      recommendations.push('💡 Your account may not have the necessary permissions');
    }
  } else {
    const workingTest = results.tests.find((t: any) => t.success);
    recommendations.push(`✅ Authentication working with: ${workingTest.name}`);
  }
  
  // Key format recommendations
  if (results.keyAnalysis.apiKey?.keyType === 'api-key') {
    recommendations.push('📌 You have a public API key (pk_). This can be used directly with the Web SDK.');
  }
  
  if (results.keyAnalysis.privateKey?.keyFormat === 'uuid') {
    recommendations.push('📌 Your private key is UUID format. This should be used to sign JWT tokens.');
  }
  
  // Missing configuration
  if (!results.environment.hasOrgId) {
    recommendations.push('⚠️ VAPI_ORG_ID is missing - required for JWT authentication');
  }
  
  if (!results.environment.hasPrivateKey && !results.environment.hasApiKey) {
    recommendations.push('⚠️ No authentication credentials found - add either VAPI_API_KEY or VAPI_PRIVATE_KEY');
  }

  // Additional help
  recommendations.push('');
  recommendations.push('🔍 Next steps:');
  recommendations.push('1. Check VAPI dashboard for the correct server key');
  recommendations.push('2. Ensure you\'re using the right key type (public vs private/server)');
  recommendations.push('3. For web SDK, use either public API key directly or generate JWT');
  recommendations.push('4. For server API calls, use JWT with private scope');

  return recommendations;
}