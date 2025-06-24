/**
 * Notification Worker API Route
 * Endpoint for triggering notification processing (can be called by cron job)
 */

import { NextRequest, NextResponse } from 'next/server';
import { notificationWorker } from '@/lib/workers/notification-worker';

// Protect this endpoint with a secret key
const WORKER_SECRET = process.env.NOTIFICATION_WORKER_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Verify worker secret
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${WORKER_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    switch (action) {
      case 'process':
        // Process pending notifications
        const processResult = await notificationWorker.processPendingNotifications();
        console.log('Notification processing complete:', processResult);
        
        return NextResponse.json({
          success: true,
          result: processResult,
          timestamp: new Date().toISOString()
        });

      case 'retry':
        // Retry failed notifications
        const retryResult = await notificationWorker.retryFailedNotifications();
        console.log('Retry processing complete:', retryResult);
        
        return NextResponse.json({
          success: true,
          result: retryResult,
          timestamp: new Date().toISOString()
        });

      case 'cleanup':
        // Clean up old notifications
        const cleanupCount = await notificationWorker.cleanupOldNotifications();
        console.log(`Cleaned up ${cleanupCount} old notifications`);
        
        return NextResponse.json({
          success: true,
          cleanedUp: cleanupCount,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({
          error: 'Invalid action',
          validActions: ['process', 'retry', 'cleanup']
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Worker error:', error);
    return NextResponse.json({
      error: 'Worker processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    worker: 'notification-worker',
    timestamp: new Date().toISOString()
  });
}