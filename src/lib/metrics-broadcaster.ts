// metrics-broadcaster.ts
// Helper to broadcast real-time metrics updates to WebSocket clients

import type { IncrementalMetrics } from './real-time-metrics-optimized';

interface MetricsBroadcastOptions {
  userId: string;
  sessionId: string;
  metrics: IncrementalMetrics;
}

export async function broadcastMetrics({ userId, sessionId, metrics }: MetricsBroadcastOptions): Promise<void> {
  try {
    // Send metrics update to the WebSocket endpoint
    const response = await fetch('/api/ws/metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'metrics_update',
        userId,
        sessionId,
        metrics,
        timestamp: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      console.error('Failed to broadcast metrics:', await response.text());
    } else {
      console.log(`📊 METRICS BROADCAST: Sent update for session ${sessionId} - Confidence: ${metrics.confidence}%`);
    }
  } catch (error) {
    console.error('Error broadcasting metrics:', error);
  }
}

export async function broadcastSessionUpdate(
  userId: string,
  sessionId: string,
  status: 'started' | 'paused' | 'resumed' | 'completed' | 'error',
  data?: any
): Promise<void> {
  try {
    const response = await fetch('/api/ws/metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'session_update',
        userId,
        sessionId,
        status,
        data,
        timestamp: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      console.error('Failed to broadcast session update:', await response.text());
    } else {
      console.log(`📱 SESSION BROADCAST: ${status} for session ${sessionId}`);
    }
  } catch (error) {
    console.error('Error broadcasting session update:', error);
  }
}