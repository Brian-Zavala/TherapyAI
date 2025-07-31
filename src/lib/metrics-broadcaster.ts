// metrics-broadcaster.ts
// Helper to broadcast real-time metrics updates via Supabase Realtime

import { createClient } from '@/utils/supabase/client';
import type { IncrementalMetrics } from './real-time-metrics-optimized';
import { REALTIME_CHANNELS, REALTIME_EVENTS } from './supabase-realtime-config';

interface MetricsBroadcastOptions {
  userId: string;
  sessionId: string;
  metrics: IncrementalMetrics;
}

// Map to store channels per session to avoid conflicts
const broadcastChannels = new Map<string, any>();

export async function broadcastMetrics({ userId, sessionId, metrics }: MetricsBroadcastOptions): Promise<void> {
  try {
    const supabase = createClient();
    const channelKey = REALTIME_CHANNELS.sessionMetrics(sessionId);
    
    // Get or create broadcast channel for this specific session
    let channel = broadcastChannels.get(sessionId);
    
    if (!channel) {
      // Create new channel for this session
      channel = supabase.channel(channelKey);
      
      // Subscribe and wait for subscription to be ready
      const { error } = await new Promise<{ error: any }>((resolve) => {
        channel
          .on('broadcast', { event: '*' }, () => {}) // Need at least one listener
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              resolve({ error: null });
            }
          });
        
        // Timeout after 5 seconds
        setTimeout(() => resolve({ error: new Error('Subscription timeout') }), 5000);
      });
      
      if (error) {
        console.error('Failed to subscribe to channel:', error);
        return;
      }
      
      broadcastChannels.set(sessionId, channel);
    }
    
    // Broadcast metrics update
    await channel.send({
      type: 'broadcast',
      event: REALTIME_EVENTS.METRICS_UPDATE,
      payload: {
        userId,
        sessionId,
        metrics,
        timestamp: new Date().toISOString()
      }
    });
    
    console.log(`📊 METRICS BROADCAST: Sent update for session ${sessionId} - Confidence: ${metrics.confidence}%`);
  } catch (error) {
    console.error('Error broadcasting metrics:', error);
  }
}

// Map to store state channels per session (reuse if possible)
const stateChannels = new Map<string, any>();

export async function broadcastSessionUpdate(
  userId: string,
  sessionId: string,
  status: 'started' | 'paused' | 'resumed' | 'completed' | 'error',
  data?: any
): Promise<void> {
  try {
    const supabase = createClient();
    
    // Get or create session state channel
    let stateChannel = stateChannels.get(sessionId);
    
    if (!stateChannel) {
      stateChannel = supabase.channel(REALTIME_CHANNELS.sessionState(sessionId));
      
      // Subscribe and wait for it to be ready
      const { error } = await new Promise<{ error: any }>((resolve) => {
        stateChannel
          .on('broadcast', { event: '*' }, () => {}) // Need at least one listener
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              resolve({ error: null });
            }
          });
        
        // Timeout after 5 seconds
        setTimeout(() => resolve({ error: new Error('State channel subscription timeout') }), 5000);
      });
      
      if (error) {
        console.error('Failed to subscribe to state channel:', error);
        return;
      }
      
      stateChannels.set(sessionId, stateChannel);
    }
    
    // Map status to event
    const eventMap = {
      'paused': REALTIME_EVENTS.SESSION_PAUSED,
      'resumed': REALTIME_EVENTS.SESSION_RESUMED,
      'completed': REALTIME_EVENTS.SESSION_ENDED,
      'error': REALTIME_EVENTS.SESSION_ENDED,
      'started': 'session_started'
    };
    
    const event = eventMap[status] || 'session_update';
    
    // Broadcast session state update
    await stateChannel.send({
      type: 'broadcast',
      event,
      payload: {
        userId,
        sessionId,
        state: status === 'completed' || status === 'error' ? 'ended' : status === 'paused' ? 'paused' : 'active',
        status,
        data,
        timestamp: new Date().toISOString()
      }
    });
    
    console.log(`📱 SESSION BROADCAST: ${status} for session ${sessionId}`);
    
    // Clean up channel immediately for terminal states
    if (status === 'completed' || status === 'error') {
      supabase.removeChannel(stateChannel);
      stateChannels.delete(sessionId);
    }
  } catch (error) {
    console.error('Error broadcasting session update:', error);
  }
}

// Broadcast any data to a specific channel
export async function broadcastToChannel(
  channelName: string,
  event: string,
  payload: any
): Promise<void> {
  try {
    const supabase = createClient();
    
    // Create channel
    const channel = supabase.channel(channelName);
    
    // Subscribe and wait for it to be ready
    const { error } = await new Promise<{ error: any }>((resolve) => {
      channel
        .on('broadcast', { event: '*' }, () => {}) // Need at least one listener
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            resolve({ error: null });
          }
        });
      
      // Timeout after 5 seconds
      setTimeout(() => resolve({ error: new Error('Channel subscription timeout') }), 5000);
    });
    
    if (error) {
      console.error('Failed to subscribe to channel:', error);
      return;
    }
    
    // Broadcast data
    await channel.send({
      type: 'broadcast',
      event,
      payload
    });
    
    console.log(`📨 BROADCAST: Sent ${event} to ${channelName}`);
    
    // Clean up channel after broadcast
    await supabase.removeChannel(channel);
  } catch (error) {
    console.error('Error broadcasting to channel:', error);
  }
}

// Clean up broadcast channels when session ends
export async function cleanupBroadcastChannels(sessionId?: string): Promise<void> {
  const supabase = createClient();
  
  if (sessionId) {
    // Clean up specific session channels
    const metricsChannel = broadcastChannels.get(sessionId);
    if (metricsChannel) {
      await supabase.removeChannel(metricsChannel);
      broadcastChannels.delete(sessionId);
      console.log(`🧹 Cleaned up metrics broadcast channel for session ${sessionId}`);
    }
    
    const stateChannel = stateChannels.get(sessionId);
    if (stateChannel) {
      await supabase.removeChannel(stateChannel);
      stateChannels.delete(sessionId);
      console.log(`🧹 Cleaned up state broadcast channel for session ${sessionId}`);
    }
  } else {
    // Clean up all channels
    for (const [id, channel] of broadcastChannels.entries()) {
      await supabase.removeChannel(channel);
      console.log(`🧹 Cleaned up metrics broadcast channel for session ${id}`);
    }
    broadcastChannels.clear();
    
    for (const [id, channel] of stateChannels.entries()) {
      await supabase.removeChannel(channel);
      console.log(`🧹 Cleaned up state broadcast channel for session ${id}`);
    }
    stateChannels.clear();
  }
}