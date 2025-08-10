/**
 * Asynchronous Webhook Event Processor
 * Implements Stripe best practice for handling events asynchronously
 */

import { prisma } from '@/lib/prisma-optimized';
import { stripe, getSubscription } from '@/lib/stripe';
import Stripe from 'stripe';
import { markEventProcessed, markEventFailed } from './webhook-event-store';

export interface WebhookJob {
  eventId: string;
  eventType: string;
  eventData: any;
  metadata?: Record<string, any>;
  timestamp: number;
}

// Queue for processing webhook events
const eventQueue: WebhookJob[] = [];
let isProcessing = false;

/**
 * Add event to processing queue
 * Returns immediately to allow webhook to respond with 2xx quickly
 */
export function enqueueWebhookEvent(event: Stripe.Event): void {
  const job: WebhookJob = {
    eventId: event.id,
    eventType: event.type,
    eventData: event.data.object,
    timestamp: event.created,
  };
  
  eventQueue.push(job);
  
  // Start processing if not already running
  if (!isProcessing) {
    processQueue();
  }
}

/**
 * Process queued webhook events
 * Runs asynchronously in the background
 */
async function processQueue(): Promise<void> {
  if (isProcessing || eventQueue.length === 0) {
    return;
  }
  
  isProcessing = true;
  
  while (eventQueue.length > 0) {
    const job = eventQueue.shift();
    if (!job) continue;
    
    try {
      await processWebhookEvent(job);
    } catch (error: any) {
      console.error(`Failed to process webhook event ${job.eventId}:`, error);
      // Could implement retry logic here
    }
  }
  
  isProcessing = false;
}

/**
 * Process individual webhook event
 * Handles all business logic for different event types
 */
async function processWebhookEvent(job: WebhookJob): Promise<void> {
  const { eventId, eventType, eventData } = job;
  
  console.log(`⚙️ Processing webhook event: ${eventType} (${eventId})`);
  
  try {
    switch (eventType) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(eventData as Stripe.Checkout.Session);
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(eventData as Stripe.Subscription, eventType);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(eventData as Stripe.Subscription);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(eventData as Stripe.Invoice);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(eventData as Stripe.Invoice);
        break;
        
      default:
        console.log(`📋 Unhandled event type: ${eventType}`);
    }
    
    // Mark event as successfully processed
    await markEventProcessed(eventId, eventType, eventData.id);
    
  } catch (error: any) {
    console.error(`❌ Error processing ${eventType}:`, error);
    await markEventFailed(eventId, eventType, error.message, eventData.id);
    throw error; // Re-throw for potential retry logic
  }
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  console.log('💳 Processing checkout completion:', {
    sessionId: session.id,
    customer: session.customer,
    subscription: session.subscription,
    userId: session.metadata?.userId,
  });
  
  if (!session.subscription) {
    console.warn('⚠️ Checkout completed but no subscription ID found');
    return;
  }
  
  if (!session.metadata?.userId) {
    console.warn('⚠️ No userId in checkout session metadata');
    return;
  }
  
  // Get subscription details
  let subscription: Stripe.Subscription;
  
  try {
    // Handle test webhooks gracefully
    if (session.metadata?.testWebhook === 'true') {
      subscription = {
        id: session.subscription as string,
        status: 'active',
      } as Stripe.Subscription;
    } else {
      subscription = await getSubscription(session.subscription as string);
    }
  } catch (error: any) {
    console.error(`Failed to fetch subscription: ${error.message}`);
    // Proceed with minimal data if we have userId
    subscription = {
      id: session.subscription as string,
      status: 'active',
    } as Stripe.Subscription;
  }
  
  // Update user subscription in database
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: session.metadata!.userId },
    });
    
    if (!user) {
      throw new Error(`User ${session.metadata!.userId} not found`);
    }
    
    await tx.user.update({
      where: { id: session.metadata!.userId },
      data: {
        subscriptionStatus: subscription.status,
        subscriptionId: subscription.id,
        stripeCustomerId: session.customer as string,
        billingEmail: session.customer_email || user.email,
      },
    });
    
    console.log(`✅ Subscription activated for user ${session.metadata!.userId}`);
  });
}

/**
 * Handle subscription created/updated events
 */
async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  eventType: string
): Promise<void> {
  console.log(`🔄 Processing ${eventType}:`, subscription.id);
  
  // Get customer metadata
  const customer = await stripe.customers.retrieve(
    subscription.customer as string
  ) as Stripe.Customer;
  
  if (!customer.metadata?.userId) {
    console.warn('⚠️ No userId in customer metadata');
    return;
  }
  
  // Update user subscription status
  await prisma.user.update({
    where: { id: customer.metadata.userId },
    data: {
      subscriptionStatus: subscription.status,
      subscriptionId: subscription.id,
    },
  });
  
  console.log(`✅ Subscription ${eventType} for user ${customer.metadata.userId}`);
}

/**
 * Handle subscription deleted event
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  console.log('🗑️ Processing subscription deletion:', subscription.id);
  
  const customer = await stripe.customers.retrieve(
    subscription.customer as string
  ) as Stripe.Customer;
  
  if (!customer.metadata?.userId) {
    console.warn('⚠️ No userId in customer metadata');
    return;
  }
  
  await prisma.user.update({
    where: { id: customer.metadata.userId },
    data: {
      subscriptionStatus: 'canceled',
      subscriptionId: null,
    },
  });
  
  console.log(`✅ Subscription canceled for user ${customer.metadata.userId}`);
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  console.log(`💰 Payment succeeded for invoice ${invoice.id}`);
  
  // Could send receipt email here
  // Could update payment history
  // Could track metrics
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  console.log(`❌ Payment failed for invoice ${invoice.id}`);
  
  const customer = await stripe.customers.retrieve(
    invoice.customer as string
  ) as Stripe.Customer;
  
  if (customer.metadata?.userId) {
    await prisma.user.update({
      where: { id: customer.metadata.userId },
      data: {
        subscriptionStatus: 'past_due',
      },
    });
    
    console.log(`⚠️ User ${customer.metadata.userId} marked as past_due`);
    
    // Could send payment failed email here
    // Could trigger dunning process
  }
}

/**
 * Get queue status for monitoring
 */
export function getQueueStatus(): {
  queueLength: number;
  isProcessing: boolean;
} {
  return {
    queueLength: eventQueue.length,
    isProcessing,
  };
}