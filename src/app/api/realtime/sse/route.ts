// src/app/api/realtime/sse/route.ts
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// SSE endpoint for real-time updates fallback
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const sessionId = searchParams.get('sessionId');
  
  // Verify user access
  if (userId !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  // Create SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ 
          userId, 
          sessionId,
          timestamp: new Date().toISOString() 
        })}\n\n`)
      );

      // Keep connection alive with ping
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':ping\n\n'));
        } catch (error) {
          clearInterval(pingInterval);
        }
      }, 30000); // 30 seconds

      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        controller.close();
      });

      // Subscribe to Supabase realtime if available
      if (sessionId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );

          const channel = supabase
            .channel(`session:${sessionId}:metrics`)
            .on('broadcast', { event: 'metrics-update' }, (payload) => {
              controller.enqueue(
                encoder.encode(`event: metrics\ndata: ${JSON.stringify(payload.payload)}\n\n`)
              );
            })
            .subscribe();

          // Cleanup subscription on close
          req.signal.addEventListener('abort', () => {
            channel.unsubscribe();
          });
        } catch (error) {
          console.error('Failed to setup Supabase subscription:', error);
        }
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}