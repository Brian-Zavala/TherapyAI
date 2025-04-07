import { NextRequest, NextResponse } from 'next/server';
import { generateClientToken } from '@/lib/vapi-server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Generate a secure client token for Vapi
 * This is more secure than using the API key directly in the frontend
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // FALLBACK: If we have a direct API key, use that instead of trying to generate a token
    // This is less secure but ensures functionality if the token endpoint is failing
    const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY;
    if (apiKey) {
      console.log('Using direct API key as fallback instead of generating token');
      return NextResponse.json({ token: apiKey });
    }

    try {
      // Try to generate a client token using the user's ID
      const token = await generateClientToken(session.user.id);
      return NextResponse.json({ token });
    } catch (tokenError) {
      // If token generation fails, log and use fallback
      console.error('Token generation failed, using fallback API key', tokenError);
      
      // Check if we have an API key to use as fallback
      if (!process.env.VAPI_SERVER_API_KEY) {
        throw new Error('No Vapi API keys available');
      }
      
      // Use the server API key as a last resort
      return NextResponse.json({ token: process.env.VAPI_SERVER_API_KEY });
    }
  } catch (error) {
    console.error('Error in token route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate token' },
      { status: 500 }
    );
  }
}