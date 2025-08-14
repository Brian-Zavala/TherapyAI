import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redis } from '@/lib/cache/redis-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Server-Sent Events endpoint for real-time credit updates
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  const encoder = new TextEncoder();
  const userId = session.user.id;

  // Create readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = `data: ${JSON.stringify({ 
        type: 'connected', 
        message: 'Credit updates connected',
        timestamp: new Date().toISOString()
      })}\n\n`;
      controller.enqueue(encoder.encode(data));

      // Set up Redis subscription for credit updates
      const subscriber = redis.duplicate();
      const channel = `credits:updates:${userId}`;

      subscriber.subscribe(channel, (err) => {
        if (err) {
          console.error('Failed to subscribe to credit updates:', err);
          controller.close();
        }
      });

      subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const updateData = JSON.parse(message);
            const sseMessage = `data: ${JSON.stringify({
              type: 'credit_update',
              data: updateData,
              timestamp: new Date().toISOString()
            })}\n\n`;
            controller.enqueue(encoder.encode(sseMessage));
          } catch (error) {
            console.error('Error parsing credit update message:', error);
          }
        }
      });

      // Send periodic heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const heartbeatMsg = `data: ${JSON.stringify({ 
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })}\n\n`;
          controller.enqueue(encoder.encode(heartbeatMsg));
        } catch (error) {
          console.error('Heartbeat failed:', error);
          clearInterval(heartbeat);
          controller.close();
        }
      }, 30000); // 30 seconds heartbeat

      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        subscriber.disconnect();
        controller.close();
      });
    },
  });

  return new Response(stream, { headers });
}