import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Endpoint to validate VAPI assistant configuration and check status
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const assistantId = searchParams.get('assistantId');

    if (!assistantId) {
      return NextResponse.json({ error: 'Assistant ID required' }, { status: 400 });
    }

    // Get API key
    const apiKey = process.env.VAPI_SERVER_API_KEY || process.env.NEXT_PUBLIC_VAPI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'VAPI API key not configured',
        diagnosis: 'Missing API key in environment variables'
      }, { status: 500 });
    }

    console.log(`Validating assistant ${assistantId}...`);

    // Try to fetch the assistant from VAPI
    const assistantResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!assistantResponse.ok) {
      const errorData = await assistantResponse.json().catch(() => ({ message: 'Unknown error' }));
      
      console.error('Assistant validation failed:', {
        status: assistantResponse.status,
        error: errorData
      });

      // Provide diagnostic information
      let diagnosis = 'Unknown issue';
      
      if (assistantResponse.status === 404) {
        diagnosis = 'Assistant does not exist in VAPI. It may have been deleted.';
      } else if (assistantResponse.status === 401) {
        diagnosis = 'API key is invalid or expired. Check VAPI dashboard.';
      } else if (assistantResponse.status === 403) {
        diagnosis = 'API key does not have permission to access this assistant.';
      } else if (assistantResponse.status === 402) {
        diagnosis = 'Payment required. Check VAPI account billing status.';
      }

      return NextResponse.json({
        valid: false,
        assistantId,
        error: errorData.message || 'Failed to validate assistant',
        diagnosis,
        status: assistantResponse.status
      }, { status: 400 });
    }

    const assistantData = await assistantResponse.json();

    // Check account status by trying to list assistants
    const accountResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    let accountStatus = 'unknown';
    if (accountResponse.ok) {
      accountStatus = 'active';
    } else if (accountResponse.status === 402) {
      accountStatus = 'payment_required';
    } else if (accountResponse.status === 401) {
      accountStatus = 'invalid_api_key';
    }

    // Get list of all available assistants
    let availableAssistants = [];
    if (accountResponse.ok) {
      const assistants = await accountResponse.json();
      availableAssistants = assistants.map((a: any) => ({
        id: a.id,
        name: a.name,
        createdAt: a.createdAt,
        provider: a.model?.provider,
        model: a.model?.model
      }));
    }

    return NextResponse.json({
      valid: true,
      assistantId,
      assistant: {
        id: assistantData.id,
        name: assistantData.name,
        createdAt: assistantData.createdAt,
        provider: assistantData.model?.provider,
        model: assistantData.model?.model,
        voice: assistantData.voice,
        transcriber: assistantData.transcriber
      },
      accountStatus,
      availableAssistants,
      diagnosis: 'Assistant is valid and accessible'
    });

  } catch (error) {
    console.error('Error validating assistant:', error);
    
    // Check if it's a network error
    if (error instanceof Error && error.message.includes('fetch')) {
      return NextResponse.json({
        valid: false,
        error: 'Network error connecting to VAPI',
        diagnosis: 'Unable to reach VAPI API. Check network connection and VAPI service status.'
      }, { status: 503 });
    }

    return NextResponse.json(
      { 
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to validate assistant',
        diagnosis: 'Unexpected error during validation'
      },
      { status: 500 }
    );
  }
}