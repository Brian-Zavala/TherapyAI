import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    
    // Check VAPI environment variables
    const vapiEnvVars = {
      // Server-side
      VAPI_API_KEY: !!process.env.VAPI_API_KEY,
      VAPI_SERVER_API_KEY: !!process.env.VAPI_SERVER_API_KEY,
      VAPI_ORG_ID: !!process.env.VAPI_ORG_ID,
      VAPI_PRIVATE_KEY: !!process.env.VAPI_PRIVATE_KEY,
      VAPI_TRANSCRIBER_SECRET: !!process.env.VAPI_TRANSCRIBER_SECRET,
      
      // Client-side
      NEXT_PUBLIC_VAPI_API_KEY: !!process.env.NEXT_PUBLIC_VAPI_API_KEY,
      NEXT_PUBLIC_USE_INLINE_ASSISTANT: process.env.NEXT_PUBLIC_USE_INLINE_ASSISTANT,
      NEXT_PUBLIC_VAPI_ASSISTANT_ID: !!process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID,
      NEXT_PUBLIC_VAPI_COUPLE_ASSISTANT_ID: !!process.env.NEXT_PUBLIC_VAPI_COUPLE_ASSISTANT_ID,
      NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID: !!process.env.NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID,
      NEXT_PUBLIC_VAPI_FAMILY_ASSISTANT_ID: !!process.env.NEXT_PUBLIC_VAPI_FAMILY_ASSISTANT_ID,
      
      // Voice IDs
      NEXT_PUBLIC_VAPI_MAYA_VOICE_ID: !!process.env.NEXT_PUBLIC_VAPI_MAYA_VOICE_ID,
      NEXT_PUBLIC_VAPI_ELLIOT_VOICE_ID: !!process.env.NEXT_PUBLIC_VAPI_ELLIOT_VOICE_ID,
      NEXT_PUBLIC_VAPI_JADA_VOICE_ID: !!process.env.NEXT_PUBLIC_VAPI_JADA_VOICE_ID,
    };
    
    // Check auth environment variables
    const authEnvVars = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      DATABASE_URL: !!process.env.DATABASE_URL,
    };
    
    // Count missing variables
    const missingVapi = Object.entries(vapiEnvVars).filter(([_, value]) => !value).map(([key]) => key);
    const missingAuth = Object.entries(authEnvVars).filter(([_, value]) => !value).map(([key]) => key);
    
    const diagnostic = {
      timestamp: new Date().toISOString(),
      auth: {
        session: {
          exists: !!session,
          user: session ? {
            id: session.user?.id,
            email: session.user?.email,
            name: session.user?.name,
          } : null,
        },
        envVars: authEnvVars,
        missingVars: missingAuth,
      },
      vapi: {
        envVars: vapiEnvVars,
        missingVars: missingVapi,
        useInlineAssistant: process.env.NEXT_PUBLIC_USE_INLINE_ASSISTANT === 'true',
      },
      summary: {
        authConfigured: missingAuth.length === 0,
        vapiConfigured: missingVapi.length === 0,
        sessionActive: !!session,
        totalMissingVars: missingAuth.length + missingVapi.length,
      }
    };
    
    return NextResponse.json(diagnostic);
  } catch (error) {
    console.error('[Auth Diagnostic] Error:', error);
    return NextResponse.json({
      error: 'Diagnostic check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}