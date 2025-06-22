import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Simple debug endpoint to check environment variables
  const hasApiKey = !!process.env.VAPI_API_KEY;
  const hasPublicKey = !!process.env.NEXT_PUBLIC_VAPI_API_KEY;
  
  // Test the API key
  let apiTestResult: any = null;
  if (hasApiKey || hasPublicKey) {
    const keyToTest = process.env.VAPI_API_KEY || process.env.NEXT_PUBLIC_VAPI_API_KEY;
    try {
      const response = await fetch('https://api.vapi.ai/assistant', {
        headers: {
          'Authorization': `Bearer ${keyToTest}`,
          'Content-Type': 'application/json',
        },
      });
      
      apiTestResult = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        keyType: process.env.VAPI_API_KEY ? 'server' : 'public'
      };
      
      if (response.ok) {
        const data = await response.json();
        apiTestResult.assistantCount = Array.isArray(data) ? data.length : 'unknown';
      } else {
        apiTestResult.error = await response.text();
      }
    } catch (error) {
      apiTestResult = {
        error: error instanceof Error ? error.message : 'Unknown error',
        keyType: process.env.VAPI_API_KEY ? 'server' : 'public'
      };
    }
  }
  
  return NextResponse.json({
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasApiKey,
      hasPublicKey,
      useInlineAssistant: process.env.NEXT_PUBLIC_USE_INLINE_ASSISTANT === 'true',
    },
    apiTest: apiTestResult,
    timestamp: new Date().toISOString()
  });
}