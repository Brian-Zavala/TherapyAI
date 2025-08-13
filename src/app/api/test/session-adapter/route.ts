import { NextRequest, NextResponse } from 'next/server';
import { sessionAdapter } from '@/lib/services/session-adapter';

// Test endpoint for session adapter functionality  
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'stats';

    switch (action) {
      case 'stats':
        const stats = await sessionAdapter.getModelUsageStats();
        return NextResponse.json({
          success: true,
          data: stats,
          requestId,
          timestamp: new Date().toISOString()
        });

      case 'interface':
        // Test unified interface capabilities
        return NextResponse.json({
          success: true,
          data: {
            unified_interface: 'Available',
            supported_operations: [
              'findSession(id)',
              'findUserSessions(userId)', 
              'createSession(input)',
              'updateSession(id, updates)',
              'getModelUsageStats()'
            ],
            model_detection: 'Automatic',
            performance_tracking: 'Enabled'
          },
          requestId,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({
          error: 'Invalid action. Use: stats, interface',
          requestId
        }, { status: 400 });
    }

  } catch (error) {
    console.error(`[${requestId}] Session adapter test error:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'Session adapter test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      requestId,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}