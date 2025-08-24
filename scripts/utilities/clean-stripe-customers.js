#!/usr/bin/env node

/**
 * Script to clean up invalid Stripe customer IDs from the database
 * This can happen when switching between test/live modes or after Stripe data reset
 */

require('dotenv').config();
const Stripe = require('stripe');
const { PrismaClient } = require('@prisma/client');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
});

const prisma = new PrismaClient();

async function cleanStripeCustomers() {
  console.log('🧹 Cleaning up invalid Stripe customer IDs...\n');
  
  try {
    // Get all users with Stripe customer IDs
    const users = await prisma.user.findMany({
      where: {
        stripeCustomerId: {
          not: null,
        },
      },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
      },
    });
    
    console.log(`Found ${users.length} users with Stripe customer IDs\n`);
    
    let invalidCount = 0;
    let validCount = 0;
    
    for (const user of users) {
      try {
        // Try to retrieve the customer from Stripe
        await stripe.customers.retrieve(user.stripeCustomerId);
        console.log(`✅ Valid: ${user.email} (${user.stripeCustomerId})`);
        validCount++;
      } catch (error) {
        // Customer doesn't exist in Stripe
        console.log(`❌ Invalid: ${user.email} (${user.stripeCustomerId})`);
        invalidCount++;
        
        // Clear the invalid customer ID
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            stripeCustomerId: null,
            // Also reset subscription info if customer doesn't exist
            subscriptionStatus: 'free',
            subscriptionId: null,
          },
        });
        
        console.log(`   → Cleared invalid customer ID for ${user.email}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Valid customers: ${validCount}`);
    console.log(`❌ Invalid customers cleaned: ${invalidCount}`);
    console.log('='.repeat(50) + '\n');
    
    if (invalidCount > 0) {
      console.log('💡 The invalid customer IDs have been cleared.');
      console.log('   New customers will be created on next checkout attempt.');
    }
    
  } catch (error) {
    console.error('Error cleaning Stripe customers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanStripeCustomers();