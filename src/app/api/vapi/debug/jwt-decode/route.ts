import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

/**
 * Debug endpoint to decode and analyze JWT tokens
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await req.json();
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Decode without verification first
    const decoded = jwt.decode(token, { complete: true });
    
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
    }

    // Check if we can verify with current private key
    let verificationResult = null;
    try {
      const privateKey = process.env.VAPI_PRIVATE_KEY;
      if (privateKey) {
        const verified = jwt.verify(token, privateKey);
        verificationResult = {
          success: true,
          verified: verified,
        };
      }
    } catch (error) {
      verificationResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }

    // Test the token with VAPI API
    let apiTestResult = null;
    try {
      const response = await fetch('https://api.vapi.ai/assistant', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      apiTestResult = {
        status: response.status,
        statusText: response.statusText,
        success: response.ok,
        error: !response.ok ? await response.text() : null,
      };
    } catch (error) {
      apiTestResult = {
        error: error instanceof Error ? error.message : 'API test failed',
      };
    }

    return NextResponse.json({
      decoded: {
        header: decoded.header,
        payload: decoded.payload,
        signature: decoded.signature ? 'Present' : 'Missing',
      },
      verification: verificationResult,
      apiTest: apiTestResult,
      analysis: analyzeToken(decoded),
    });
  } catch (error) {
    console.error('JWT decode endpoint error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Decode failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

function analyzeToken(decoded: any): any {
  const analysis: any = {
    algorithm: decoded.header?.alg,
    type: decoded.header?.typ,
    hasOrgId: !!decoded.payload?.orgId,
    hasToken: !!decoded.payload?.token,
    tokenTag: decoded.payload?.token?.tag,
    hasRestrictions: !!decoded.payload?.token?.restrictions,
    issuedAt: decoded.payload?.iat ? new Date(decoded.payload.iat * 1000).toISOString() : null,
    expiresAt: decoded.payload?.exp ? new Date(decoded.payload.exp * 1000).toISOString() : null,
  };

  // Check for common issues
  const issues = [];
  
  if (!analysis.hasOrgId) {
    issues.push('Missing orgId in payload');
  }
  
  if (!analysis.hasToken) {
    issues.push('Missing token object in payload');
  }
  
  if (!analysis.tokenTag) {
    issues.push('Missing token.tag (should be "public" or "private")');
  }
  
  if (analysis.tokenTag === 'public' && !analysis.hasRestrictions) {
    issues.push('Public tokens should have restrictions');
  }
  
  if (analysis.algorithm !== 'HS256' && analysis.algorithm !== 'RS256') {
    issues.push(`Unexpected algorithm: ${analysis.algorithm}`);
  }

  analysis.issues = issues;
  analysis.isValid = issues.length === 0;

  return analysis;
}