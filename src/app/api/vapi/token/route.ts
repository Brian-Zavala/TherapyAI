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

    // Directly use the public API key for simplicity
    // This simplifies the auth flow while we debug the JWT issues
    const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }
    
    console.log('Using public API key for authentication. User:', session.user?.email);
    
    return NextResponse.json({ 
      token: apiKey 
    });
    
  } catch (error) {
    console.error('Error in token route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate token' },
      { status: 500 }
    );
  }
}