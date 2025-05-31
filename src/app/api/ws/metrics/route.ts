import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// This API route handles real-time metrics and session updates
// It receives HTTP requests from the client and can broadcast to WebSocket connections

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, userId, sessionId, metrics, status, data, timestamp } = body;

    // Validate that the user is authorized for this session
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Log the metrics/session update for debugging
    console.log(`📊 METRICS API: Received ${type} for session ${sessionId}`);

    if (type === 'metrics_update') {
      // Handle metrics update
      console.log(`📊 METRICS: Session ${sessionId} - Confidence: ${metrics.confidence}%`);
      
      // In a full implementation, you would:
      // 1. Validate the metrics data
      // 2. Store metrics in database if needed
      // 3. Broadcast to WebSocket connections via the server-side WebSocket handler
      
      // For now, we'll just acknowledge receipt
      return NextResponse.json({ 
        success: true, 
        message: 'Metrics update received',
        sessionId,
        timestamp 
      });
      
    } else if (type === 'session_update') {
      // Handle session status update
      console.log(`📱 SESSION: ${sessionId} status changed to ${status}`);
      
      // In a full implementation, you would:
      // 1. Update session status in database
      // 2. Broadcast to dashboard components via WebSocket
      // 3. Send notifications if needed
      
      return NextResponse.json({ 
        success: true, 
        message: 'Session update received',
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