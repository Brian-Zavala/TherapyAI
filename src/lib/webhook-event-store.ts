/**
 * Webhook Event Store for Deduplication
 * Implements Stripe best practice for handling duplicate events
 */

import { prisma } from '@/lib/prisma-optimized';
import { Redis } from '@upstash/redis';

// Initialize Redis client for fast event deduplication
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// In-memory fallback for development
const memoryStore = new Map<string, number>();

export interface WebhookEventRecord {
  eventId: string;
  eventType: string;
  objectId: string;
  processedAt: Date;
  status: 'processing' | 'completed' | 'failed';
  retryCount?: number;
  error?: string;
}

/**
 * Check if an event has already been processed
 * Uses Redis for production, in-memory for development
 */
export async function isEventProcessed(
  eventId: string,
  objectId?: string
): Promise<boolean> {
  const key = objectId ? `webhook:${eventId}:${objectId}` : `webhook:${eventId}`;
  
  if (redis) {
    // Redis check (production)
    const exists = await redis.exists(key);
    return exists === 1;
  } else {
    // In-memory check (development)
    return memoryStore.has(key);
  }
}

/**
 * Mark an event as processed
 * Stores for 30 days to handle retries and late duplicates
 */
export async function markEventProcessed(
  eventId: string,
  eventType: string,
  objectId?: string
): Promise<void> {
  const key = objectId ? `webhook:${eventId}:${objectId}` : `webhook:${eventId}`;
  const ttl = 30 * 24 * 60 * 60; // 30 days in seconds
  
  if (redis) {
    // Store in Redis with TTL
    await redis.setex(key, ttl, JSON.stringify({
      eventId,
      eventType,
      objectId,
      processedAt: new Date().toISOString(),
      status: 'completed'
    }));
  } else {
    // Store in memory (development)
    memoryStore.set(key, Date.now());
    
    // Clean up old entries in memory (simple TTL simulation)
    if (memoryStore.size > 1000) {
      const now = Date.now();
      const oldestAllowed = now - (ttl * 1000);
      for (const [k, timestamp] of memoryStore.entries()) {
        if (timestamp < oldestAllowed) {
          memoryStore.delete(k);
        }
      }
    }
  }
  
  // Also log to database for audit trail (async, non-blocking)
  logEventToDatabase(eventId, eventType, objectId).catch(err => {
    console.error('Failed to log webhook event to database:', err);
  });
}

/**
 * Mark an event as failed
 * Allows for retry logic
 */
export async function markEventFailed(
  eventId: string,
  eventType: string,
  error: string,
  objectId?: string
): Promise<void> {
  const key = objectId ? `webhook:${eventId}:${objectId}:failed` : `webhook:${eventId}:failed`;
  const ttl = 7 * 24 * 60 * 60; // 7 days for failed events
  
  if (redis) {
    await redis.setex(key, ttl, JSON.stringify({
      eventId,
      eventType,
      objectId,
      failedAt: new Date().toISOString(),
      error,
      status: 'failed'
    }));
  }
}

/**
 * Log event to database for audit trail
 * Non-blocking, best-effort logging
 */
async function logEventToDatabase(
  eventId: string,
  eventType: string,
  objectId?: string
): Promise<void> {
  try {
    // Create a webhook event log table if needed
    // For now, we'll use a simple log
    console.log(`📝 Webhook event logged: ${eventType} - ${eventId}${objectId ? ` (${objectId})` : ''}`);
    
    // In production, you'd want to create a WebhookEvent model in Prisma:
    // await prisma.webhookEvent.create({
    //   data: {
    //     eventId,
    //     eventType,
    //     objectId,
    //     processedAt: new Date(),
    //     status: 'completed'
    //   }
    // });
  } catch (error) {
    // Don't throw, just log - this is best-effort
    console.error('Failed to log webhook event:', error);
  }
}

/**
 * Clean up old events (maintenance task)
 * Run periodically to prevent unbounded growth
 */
export async function cleanupOldEvents(daysToKeep = 30): Promise<number> {
  if (!redis) {
    // Clean memory store
    const now = Date.now();
    const oldestAllowed = now - (daysToKeep * 24 * 60 * 60 * 1000);
    let cleaned = 0;
    
    for (const [key, timestamp] of memoryStore.entries()) {
      if (timestamp < oldestAllowed) {
        memoryStore.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
  
  // For Redis, TTL handles cleanup automatically
  return 0;
}

/**
 * Get event processing status
 * Useful for debugging and monitoring
 */
export async function getEventStatus(
  eventId: string,
  objectId?: string
): Promise<'unprocessed' | 'processing' | 'completed' | 'failed'> {
  const key = objectId ? `webhook:${eventId}:${objectId}` : `webhook:${eventId}`;
  const failedKey = `${key}:failed`;
  
  if (redis) {
    const [exists, failed] = await Promise.all([
      redis.exists(key),
      redis.exists(failedKey)
    ]);
    
    if (failed === 1) return 'failed';
    if (exists === 1) return 'completed';
    return 'unprocessed';
  } else {
    if (memoryStore.has(failedKey)) return 'failed';
    if (memoryStore.has(key)) return 'completed';
    return 'unprocessed';
  }
}