import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { constructWebhookEvent, stripe, getSubscription } from '@/lib/stripe';
import { prisma } from '@/lib/prisma-optimized';
import Stripe from 'stripe';

// Stripe requires the raw body to verify webhook signatures.
// We need to export config to tell Next.js not to parse the body
export const runtime = 'nodejs';

// Webhook secret from environment
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  // Validate webhook secret is configured
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook endpoint not configured' },
      { status: 500 }
    );
  }

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

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (!session.subscription) {
          console.warn('⚠️ Checkout completed but no subscription ID found');
          break;
        }
        
        // Get the subscription and customer info
        const subscription = await getSubscription(
          session.subscription as string
        );
        
        // Update user subscription in database with transaction
        if (session.metadata?.userId) {
          try {
            await prisma.$transaction(async (tx) => {
              // Check if user exists
              const user = await tx.user.findUnique({
                where: { id: session.metadata.userId },
              });
              
              if (!user) {
                throw new Error(`User ${session.metadata.userId} not found`);
              }
              
              // Update user subscription
              await tx.user.update({
                where: { id: session.metadata.userId },
                data: {
                  subscriptionStatus: 'active',
                  subscriptionId: subscription.id,
                  stripeCustomerId: session.customer as string,
                  billingEmail: session.customer_email || user.email,
                },
              });
            });
            
            console.log(`✅ Subscription activated for user ${session.metadata.userId}`);
          } catch (error: any) {
            console.error(`❌ Failed to update user subscription: ${error.message}`);
            throw error; // Re-throw to trigger webhook retry
          }
        } else {
          console.warn('⚠️ No userId in checkout session metadata');
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
    // Return success to avoid Stripe retrying
    return NextResponse.json({ received: true, error: error.message });
  }
}