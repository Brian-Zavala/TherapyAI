import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { constructWebhookEvent, stripe, getSubscription } from '@/lib/stripe';
import { prisma } from '@/lib/prisma-optimized';
import Stripe from 'stripe';
import { deduplicateWebhookEvent } from '@/lib/webhook-deduplication';

// Stripe requires the raw body to verify webhook signatures.
// We need to export config to tell Next.js not to parse the body
export const runtime = 'nodejs';

// Webhook secret from environment
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
  // Validate webhook secret is configured
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook endpoint not configured' },
      { status: 500 }
    );
  }

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    console.warn('⚠️ Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = await constructWebhookEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    // Return 400 to prevent Stripe from retrying invalid requests
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Atomic deduplication check (Best Practice #1)
  const eventObject = event.data.object as any;
  const objectId = eventObject && 'id' in eventObject ? eventObject.id : undefined;
  const isNewEvent = await deduplicateWebhookEvent(event.id, event.type, objectId);
  
  if (!isNewEvent) {
    console.log(`♻️ Duplicate event detected: ${event.type} (${event.id})`);
    return NextResponse.json({ received: true, duplicate: true });
  }
  
  // For critical events, process immediately; for others, queue
  const criticalEvents = ['checkout.session.completed'];
  const shouldProcessImmediately = criticalEvents.includes(event.type);
  
  // Handle the event
  try {
    console.log(`📨 Processing webhook event: ${event.type}`);
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.log('📋 Checkout session completed:', {
          sessionId: session.id,
          customer: session.customer,
          subscription: session.subscription,
          metadata: session.metadata,
          customerEmail: session.customer_email,
        });
        
        // Log the raw metadata to debug
        console.log('🔍 Raw metadata:', JSON.stringify(session.metadata, null, 2));
        console.log('🔍 User ID from metadata:', session.metadata?.userId);
        
        if (!session.subscription) {
          console.warn('⚠️ Checkout completed but no subscription ID found');
          break;
        }
        
        // Get the subscription and customer info
        let subscription: any;
        
        // Check if this is a test webhook
        const isTestWebhook = session.metadata?.testWebhook === 'true';
        
        if (isTestWebhook) {
          console.log('🧪 Test webhook detected, using mock subscription data');
          subscription = {
            id: session.subscription as string,
            status: 'active',
            items: { data: [] }
          };
        } else {
          try {
            subscription = await getSubscription(
              session.subscription as string
            );
            
            console.log('📊 Subscription details:', {
              id: subscription.id,
              status: subscription.status,
              items: subscription.items.data.map(item => ({
                price: item.price.id,
                product: item.price.product,
              })),
            });
          } catch (error: any) {
            console.error(`❌ Failed to fetch subscription: ${error.message}`);
            // If subscription fetch fails but we have metadata, try to update anyway
            if (session.metadata?.userId) {
              console.log('⚠️ Proceeding with metadata despite subscription fetch failure');
              subscription = {
                id: session.subscription as string,
                status: 'active',
                items: { data: [] }
              };
            } else {
              throw error;
            }
          }
        }
        
        // Update user subscription in database with transaction
        if (session.metadata?.userId) {
          console.log(`🔄 Attempting to update user ${session.metadata.userId} subscription...`);
          try {
            await prisma.$transaction(async (tx) => {
              // Check if user exists
              const user = await tx.user.findUnique({
                where: { id: session.metadata.userId },
              });
              
              console.log(`👤 Found user:`, user ? `${user.email} (${user.id})` : 'NOT FOUND');
              
              if (!user) {
                throw new Error(`User ${session.metadata.userId} not found`);
              }
              
              // Update user subscription
              const updatedUser = await tx.user.update({
                where: { id: session.metadata.userId },
                data: {
                  subscriptionStatus: 'active',
                  subscriptionId: subscription.id,
                  stripeCustomerId: session.customer as string,
                  billingEmail: session.customer_email || user.email,
                },
              });
              
              console.log(`📝 User updated:`, {
                id: updatedUser.id,
                email: updatedUser.email,
                subscriptionStatus: updatedUser.subscriptionStatus,
                subscriptionId: updatedUser.subscriptionId,
                stripeCustomerId: updatedUser.stripeCustomerId,
              });
            });
            
            console.log(`✅ Subscription activated for user ${session.metadata.userId}`);
          } catch (error: any) {
            console.error(`❌ Failed to update user subscription: ${error.message}`);
            console.error('Full error:', error);
            throw error; // Re-throw to trigger webhook retry
          }
        } else {
          console.warn('⚠️ No userId in checkout session metadata');
          console.warn('Session metadata:', session.metadata);
        }
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Get the customer
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        ) as Stripe.Customer;
        
        // Update user subscription status
        if (customer.metadata?.userId) {
          await prisma.user.update({
            where: { id: customer.metadata.userId },
            data: {
              subscriptionStatus: subscription.status,
              subscriptionId: subscription.id,
            },
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Get the customer
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        ) as Stripe.Customer;
        
        // Update user subscription status
        if (customer.metadata?.userId) {
          await prisma.user.update({
            where: { id: customer.metadata.userId },
            data: {
              subscriptionStatus: subscription.status,
              subscriptionId: subscription.id,
            },
          });
          
          console.log(`📝 Subscription updated for user ${customer.metadata.userId}: ${subscription.status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Get the customer
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        ) as Stripe.Customer;
        
        // Update user subscription status to canceled
        if (customer.metadata?.userId) {
          await prisma.user.update({
            where: { id: customer.metadata.userId },
            data: {
              subscriptionStatus: 'canceled',
              subscriptionId: null,
            },
          });
          
          console.log(`❌ Subscription canceled for user ${customer.metadata.userId}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`💰 Payment succeeded for invoice ${invoice.id}`);
        // You can add logic here to send a receipt email
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Get the customer
        const customer = await stripe.customers.retrieve(
          invoice.customer as string
        ) as Stripe.Customer;
        
        // Update subscription status to past_due
        if (customer.metadata?.userId) {
          await prisma.user.update({
            where: { id: customer.metadata.userId },
            data: {
              subscriptionStatus: 'past_due',
            },
          });
          
          console.log(`⚠️ Payment failed for user ${customer.metadata.userId}`);
          // You can add logic here to send a payment failed email
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    
    // For non-critical events, we could queue for retry
    // For now, just log the error
    if (!shouldProcessImmediately) {
      console.log('Non-critical event failed, would queue for retry');
      return NextResponse.json({ received: true });
    }
    
    // For critical events, return error to trigger Stripe retry
    return NextResponse.json(
      { error: 'Failed to process critical event', details: error.message },
      { status: 500 }
    );
  }
  } catch (globalError: any) {
    console.error('Global webhook error:', globalError);
    return NextResponse.json(
      { error: 'Internal server error', message: globalError.message },
      { status: 500 }
    );
  }
}