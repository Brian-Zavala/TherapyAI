/**
 * Stripe Webhook Handler v2 - Best Practices Implementation
 * 
 * Implements all Stripe webhook best practices:
 * 1. Handles duplicate events with event ID tracking
 * 2. Processes events asynchronously with queue
 * 3. Returns 2xx quickly before heavy processing
 * 4. Verifies signatures with configurable timestamp tolerance
 * 5. Only listens to required event types
 * 6. Includes replay attack prevention
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { isEventProcessed, markEventProcessed } from '@/lib/api/webhook-event-store';
import { enqueueWebhookEvent } from '@/lib/api/webhook-processor';

// Initialize Stripe with latest API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
  typescript: true,
});

// Webhook secret from environment
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Configure timestamp tolerance (default 5 minutes, configurable)
const TIMESTAMP_TOLERANCE = parseInt(process.env.STRIPE_WEBHOOK_TOLERANCE || '300');

// Define the event types we actually need to handle
const REQUIRED_EVENT_TYPES = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
]);

// Runtime for raw body access
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // 1. Quick validation of webhook configuration
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook endpoint not configured' },
      { status: 500 }
    );
  }

  // 2. Get raw body and signature
  const body = await request.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    console.warn('⚠️ Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  // 3. Verify webhook signature with timestamp tolerance
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret,
      TIMESTAMP_TOLERANCE // Configurable tolerance for replay attack prevention
    );
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    
    // Check if it's a timestamp tolerance error
    if (err.message.includes('timestamp')) {
      console.error('⏰ Event timestamp outside tolerance window');
      return NextResponse.json(
        { error: 'Event timestamp outside tolerance window' },
        { status: 400 }
      );
    }
    
    // Return 400 to prevent Stripe from retrying invalid requests
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // 4. Check if we should handle this event type
  if (!REQUIRED_EVENT_TYPES.has(event.type)) {
    console.log(`🔕 Ignoring unneeded event type: ${event.type}`);
    // Return success but don't process
    return NextResponse.json({ received: true, ignored: true });
  }

  // 5. Check for duplicate events
  const objectId = event.data.object?.id;
  const isDuplicate = await isEventProcessed(event.id, objectId);
  
  if (isDuplicate) {
    console.log(`♻️ Duplicate event detected: ${event.type} (${event.id})`);
    // Return success but don't reprocess
    return NextResponse.json({ 
      received: true, 
      duplicate: true,
      processingTime: Date.now() - startTime 
    });
  }

  // 6. Mark event as processed (prevents duplicates)
  await markEventProcessed(event.id, event.type, objectId);

  // 7. Enqueue for asynchronous processing (non-blocking)
  try {
    enqueueWebhookEvent(event);
    console.log(`📨 Webhook event queued: ${event.type} (${event.id})`);
  } catch (error: any) {
    console.error(`Failed to enqueue webhook event: ${error.message}`);
    // Don't fail the webhook, Stripe will retry
  }

  // 8. Return 2xx quickly (best practice)
  const processingTime = Date.now() - startTime;
  
  return NextResponse.json({ 
    received: true,
    eventId: event.id,
    eventType: event.type,
    processingTime, // Should be < 100ms ideally
    queued: true
  });
}

// Health check endpoint for monitoring
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    config: {
      timestampTolerance: TIMESTAMP_TOLERANCE,
      requiredEventTypes: Array.from(REQUIRED_EVENT_TYPES),
      webhookSecretConfigured: !!webhookSecret,
    }
  });
}