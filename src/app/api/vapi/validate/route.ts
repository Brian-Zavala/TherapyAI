import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Validation endpoint to check VAPI configuration and API status
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check environment variables
    const configCheck = {
      apiKey: !!process.env.VAPI_API_KEY,
      jwtConfigured: !!process.env.VAPI_ORG_ID && !!process.env.VAPI_PRIVATE_KEY,
      useInlineAssistant: process.env.NEXT_PUBLIC_USE_INLINE_ASSISTANT === 'true',
      assistantIds: {
        couple: !!process.env.NEXT_PUBLIC_VAPI_COUPLE_ASSISTANT_ID,
        individual: !!process.env.NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID,
        family: !!process.env.NEXT_PUBLIC_VAPI_FAMILY_ASSISTANT_ID,
      },
      voiceIds: {
        maya: !!process.env.NEXT_PUBLIC_VAPI_MAYA_VOICE_ID,
        elliot: !!process.env.NEXT_PUBLIC_VAPI_ELLIOT_VOICE_ID,
        jada: !!process.env.NEXT_PUBLIC_VAPI_JADA_VOICE_ID,
      },
      deepgramKey: !!process.env.DEEPGRAM_API_KEY,
    };

    // Test VAPI API connectivity (server-side)
    let vapiStatus = {
      connected: false,
      error: null as string | null,
      accountInfo: null as any,
    };

    if (configCheck.apiKey) {
      try {
        // Try to list assistants as a connectivity test
        const response = await fetch('https://api.vapi.ai/assistant', {
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('VAPI API Response status:', response.status);
        
        if (response.ok) {
          vapiStatus.connected = true;
          const assistants = await response.json();
          vapiStatus.accountInfo = { 
            assistantCount: Array.isArray(assistants) ? assistants.length : 0,
            message: 'API connection successful'
          };
          console.log('VAPI API connected successfully, found', vapiStatus.accountInfo.assistantCount, 'assistants');
        } else {
          vapiStatus.error = `API returned ${response.status}: ${response.statusText}`;
          const errorBody = await response.text();
          console.error('VAPI API Error:', response.status, errorBody);
        }
      } catch (error) {
        vapiStatus.error = error instanceof Error ? error.message : 'Unknown error';
        console.error('VAPI connectivity test failed:', error);
        // Don't mark as failed if it's a network error - the key might still be valid
        if (error instanceof Error && error.message.includes('fetch')) {
          vapiStatus.error = 'Network error - could not reach VAPI API';
        }
      }
    }

    // Client-side uses JWT tokens, not API keys
    let clientVapiStatus = {
      connected: false,
      error: null as string | null,
      accountInfo: null as any,
    };

    // Test JWT generation instead of API key for client
    if (configCheck.jwtConfigured) {
      try {
        // Check if JWT can be generated for client use
        const testResponse = await fetch(`${req.nextUrl.origin}/api/vapi/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': req.headers.get('cookie') || '',
          },
          body: JSON.stringify({ scope: 'public' }),
        });

        if (testResponse.ok) {
          const tokenData = await testResponse.json();
          clientVapiStatus.connected = true;
          clientVapiStatus.accountInfo = { 
            message: 'JWT generation successful',
            tokenGenerated: true,
            expiresAt: tokenData.expiresAt
          };
          console.log('Client JWT generation successful');
        } else {
          clientVapiStatus.error = `JWT generation failed: ${testResponse.status}`;
          const errorBody = await testResponse.text();
          console.error('JWT generation error:', errorBody);
        }
      } catch (error) {
        clientVapiStatus.error = error instanceof Error ? error.message : 'Unknown error';
        console.error('Client VAPI connectivity test failed:', error);
      }
    }

    // Check if using inline configuration
    const inlineConfig = process.env.NEXT_PUBLIC_USE_INLINE_ASSISTANT === 'true';
    
    // Get sample personalized config
    let sampleConfig = null;
    if (inlineConfig) {
      try {
        const { getPersonalizedAssistantConfig } = await import('@/lib/vapi');
        const userProfile = {
          id: session.user.id,
          userName: session.user.name || 'User',
          therapyType: 'couple',
        };
        sampleConfig = getPersonalizedAssistantConfig(userProfile, 'couple', { duration: 60 });
        
        // Validate the configuration structure
        const configValidation = {
          hasModel: !!sampleConfig.model,
          hasVoice: !!sampleConfig.voice,
          hasTranscriber: !!sampleConfig.transcriber,
          hasFirstMessage: !!sampleConfig.firstMessage,
          hasSystemPrompt: !!(sampleConfig.model?.messages?.[0]?.content),
          modelProvider: sampleConfig.model?.provider,
          modelName: sampleConfig.model?.model,
          voiceProvider: sampleConfig.voice?.provider,
          voiceId: sampleConfig.voice?.voiceId,
        };
        
        sampleConfig = {
          ...configValidation,
          fullConfig: process.env.NODE_ENV === 'development' ? sampleConfig : 'Hidden in production',
        };
      } catch (error) {
        sampleConfig = {
          error: error instanceof Error ? error.message : 'Failed to generate config',
        };
      }
    }

    // Return diagnostic information
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        useInlineAssistant: inlineConfig,
      },
      configCheck,
      vapiStatus,
      clientVapiStatus,
      sampleConfig,
      recommendations: getRecommendations(configCheck, vapiStatus, clientVapiStatus, inlineConfig),
    });
  } catch (error) {
    console.error('Validation endpoint error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Validation failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

function getRecommendations(configCheck: any, vapiStatus: any, clientVapiStatus: any, inlineConfig: boolean): string[] {
  const recommendations: string[] = [];

  if (!configCheck.apiKey) {
    recommendations.push('❌ VAPI_API_KEY is missing - this is required for VAPI to work');
  }

  if (!configCheck.jwtConfigured) {
    recommendations.push('❌ JWT configuration missing - VAPI_ORG_ID and VAPI_PRIVATE_KEY are required for client authentication');
  }

  if (!vapiStatus.connected && configCheck.apiKey) {
    recommendations.push('❌ VAPI server API connection failed - check if your VAPI_API_KEY is valid and not expired');
  }

  if (!clientVapiStatus.connected && configCheck.jwtConfigured) {
    recommendations.push('❌ JWT generation failed - check your VAPI_ORG_ID and VAPI_PRIVATE_KEY configuration');
  }

  if (clientVapiStatus.connected && vapiStatus.connected) {
    recommendations.push('✅ Both server API and client JWT authentication are working correctly');
  }

  // Since we're using /assistant endpoint, we can't check credits
  // Remove credit checks as they're not available from this endpoint

  if (inlineConfig) {
    recommendations.push('✅ Using inline assistant configuration - assistant IDs are not required');
    
    if (!configCheck.voiceIds.maya || !configCheck.voiceIds.elliot || !configCheck.voiceIds.jada) {
      recommendations.push('⚠️ Some voice IDs are missing - using default voices may affect quality');
    }
  } else {
    if (!configCheck.assistantIds.couple || !configCheck.assistantIds.individual || !configCheck.assistantIds.family) {
      recommendations.push('❌ Assistant IDs are missing - these are required when not using inline mode');
    }
  }

  if (!configCheck.deepgramKey) {
    recommendations.push('⚠️ DEEPGRAM_API_KEY is missing - transcription quality may be affected');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All configurations appear to be correct');
  }

  return recommendations;
}