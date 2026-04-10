import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server';
import { listAssistants } from '@/lib/vapi-server';

/**
 * Endpoint to list all assistants
 * Requires authentication
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // TODO: Add role-based access control to restrict to admins
    
    const assistants = await listAssistants();
    return NextResponse.json(assistants);
  } catch (error) {
    console.error('Error listing assistants:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list assistants' },
      { status: 500 }
    );
  }
}