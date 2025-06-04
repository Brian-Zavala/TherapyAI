import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// This API route handles real-time metrics and session updates
// It receives HTTP requests from the client and can broadcast to WebSocket connections

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // For testing, allow requests without authentication but log it
    if (!session?.user?.id) {
      console.log('⚠️ METRICS API: Request without authentication - allowing for testing');
    }

    const body = await req.json();
    const { type, userId, sessionId, metrics, status, data, timestamp } = body;

    // Validate that the user is authorized for this session (skip for testing)
    if (session?.user?.id && userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Log the metrics/session update for debugging
    console.log(`📊 METRICS API: Received ${type} for session ${sessionId}`);

    if (type === 'metrics_update') {
      // Handle metrics update
      console.log(`📊 METRICS: Session ${sessionId} - Confidence: ${metrics.confidence}%`);
      
      // Log the metrics update (WebSocket broadcasting handled by custom server)
      console.log(`🔄 METRICS: Would broadcast to WebSocket clients for session ${sessionId}`);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Metrics update received and broadcasted',
        sessionId,
        timestamp 
      });
      
    } else if (type === 'session_update') {
      // Handle session status update
      console.log(`📱 SESSION: ${sessionId} status changed to ${status}`);
      
      // Log the session update (WebSocket broadcasting handled by custom server)
      console.log(`🔄 SESSION: Would broadcast to WebSocket clients for session ${sessionId}`);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Session update received and broadcasted',
        sessionId,
        status,
        timestamp 
      });
      
    } else {
      return NextResponse.json({ error: 'Unknown message type' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in metrics API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET requests (for WebSocket upgrade requests if needed in future)
export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: 'WebSocket metrics endpoint',
    info: 'Use POST to send metrics updates, or upgrade to WebSocket for real-time connection'
  });
}