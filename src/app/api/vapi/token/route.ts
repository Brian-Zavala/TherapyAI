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

    // Generate client token using the user's ID
    const token = await generateClientToken(session.user.id);

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating client token:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate token' },
      { status: 500 }
    );
  }
}