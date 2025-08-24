/**
 * Advanced Webhook Deduplication with Upstash Redis
 * Uses SET NX (only set if not exists) for atomic deduplication
 */

import { redis } from '@/lib/cache/redis-client';

// Memory store fallback for development
const processedEvents = new Set<string>();

/**
 * Atomic deduplication check and mark as processed
 * Returns true if this is a new event (not duplicate)
 * Returns false if event was already processed (duplicate)
 */
export async function deduplicateWebhookEvent(
  eventId: string,
  eventType: string,
  objectId?: string
): Promise<boolean> {
  const key = objectId 
    ? `webhook:${eventType}:${objectId}:${eventId}` 
    : `webhook:${eventType}:${eventId}`;
  
  const ttl = 30 * 24 * 60 * 60; // 30 days in seconds
  
  try {
    // Atomic operation: SET if Not eXists with TTL
    // Returns "OK" or value if key was set (new event)
    // Returns null if key already exists (duplicate)
    const result = await redis.set(
      key,
      JSON.stringify({
        eventId,
        eventType,
        objectId,
        processedAt: new Date().toISOString(),
        timestamp: Date.now()
      }),
      'EX', // Expire after
      ttl,  // TTL in seconds
      'NX'  // Only set if not exists
    );
    
    // If result is truthy (not null), it was a new event
    // If result is null, it was a duplicate
    return result !== null;
  } catch (error) {
    console.warn('[WebhookDeduplication] Redis not available, using memory store', error);
    
    // Fallback to memory store
    if (processedEvents.has(key)) {
      return false; // Duplicate
    }
    
    processedEvents.add(key);
    
    // Clean up old entries if memory store gets too large
    if (processedEvents.size > 10000) {
      // Clear oldest half of entries (simple cleanup)
      const entries = Array.from(processedEvents);
      const halfSize = Math.floor(entries.length / 2);
      entries.slice(0, halfSize).forEach(k => processedEvents.delete(k));
    }
    
    return true; // New event
  }
}

/**
 * Check if an event has been processed without marking it
 * Useful for debugging and monitoring
 */
export async function checkEventProcessed(
  eventId: string,
  eventType: string,
  objectId?: string
): Promise<boolean> {
  const key = objectId 
    ? `webhook:${eventType}:${objectId}:${eventId}` 
    : `webhook:${eventType}:${eventId}`;
  
  try {
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    // Fallback to memory store
    return processedEvents.has(key);
  }
}

/**
 * Remove an event from deduplication store
 * Useful for testing or manual retry scenarios
 */
export async function clearEventDeduplication(
  eventId: string,
  eventType: string,
  objectId?: string
): Promise<boolean> {
  const key = objectId 
    ? `webhook:${eventType}:${objectId}:${eventId}` 
    : `webhook:${eventType}:${eventId}`;
  
  try {
    const deleted = await redis.del(key);
    processedEvents.delete(key); // Also clear from memory
    return deleted === 1;
  } catch (error) {
    const hadInMemory = processedEvents.has(key);
    processedEvents.delete(key);
    return hadInMemory;
  }
}

/**
 * Get statistics about deduplication
 */
export async function getDeduplicationStats(): Promise<{
  redisAvailable: boolean;
  memoryStoreSize: number;
  recentDuplicates?: number;
}> {
  const stats: any = {
    redisAvailable: false,
    memoryStoreSize: processedEvents.size,
  };
  
  try {
    // Check if Redis is available
    const ping = await redis.ping();
    stats.redisAvailable = ping === 'PONG';
  } catch (error) {
    stats.redisAvailable = false;
  }
  
  return stats;
}

/**
 * Batch check multiple events for deduplication
 * Useful for webhook replay scenarios
 */
export async function batchCheckEvents(
  events: Array<{ eventId: string; eventType: string; objectId?: string }>
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();
  
  // Check all events in parallel
  const checks = await Promise.all(
    events.map(async (event) => {
      const isProcessed = await checkEventProcessed(
        event.eventId,
        event.eventType,
        event.objectId
      );
      return { 
        key: `${event.eventType}:${event.eventId}`,
        isProcessed 
      };
    })
  );
  
  checks.forEach(({ key, isProcessed }) => {
    results.set(key, isProcessed);
  });
  
  return results;
}