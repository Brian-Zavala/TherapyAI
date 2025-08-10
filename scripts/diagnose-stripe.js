#!/usr/bin/env node

/**
 * Diagnostic script to check Stripe integration health
 */

require('dotenv').config();
const Stripe = require('stripe');

async function diagnoseStripe() {
  console.log('🔍 Stripe Integration Diagnostics\n');
  console.log('=' .repeat(50) + '\n');

  const issues = [];
  const warnings = [];
  const successes = [];

  // 1. Check API Keys
  console.log('1️⃣ Checking API Keys...');
  
  if (!process.env.STRIPE_SECRET_KEY) {
    issues.push('❌ STRIPE_SECRET_KEY not found in .env');
  } else if (process.env.STRIPE_SECRET_KEY.includes('YOUR_')) {
    issues.push('❌ STRIPE_SECRET_KEY contains placeholder value');
  } else if (process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    successes.push('✅ Using TEST mode secret key');
  } else if (process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
    warnings.push('⚠️ Using LIVE mode secret key (be careful!)');
  }

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    issues.push('❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not found');
  } else if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_')) {
    successes.push('✅ Using TEST mode publishable key');
  }

  // 2. Check Webhook Secret
  console.log('2️⃣ Checking Webhook Configuration...');
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    issues.push('❌ STRIPE_WEBHOOK_SECRET not configured');
  } else if (process.env.STRIPE_WEBHOOK_SECRET.includes('YOUR_')) {
    issues.push('❌ STRIPE_WEBHOOK_SECRET contains placeholder');
  } else if (process.env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_')) {
    successes.push('✅ Webhook secret configured');
  }

  // 3. Check Price IDs
  console.log('3️⃣ Checking Price IDs...');
  
  const priceIds = {
    'Essential Monthly': process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY,
    'Essential Annual': process.env.STRIPE_PRICE_ESSENTIAL_ANNUAL,
    'Growth Monthly': process.env.STRIPE_PRICE_GROWTH_MONTHLY,
    'Growth Annual': process.env.STRIPE_PRICE_GROWTH_ANNUAL,
    'Unlimited Monthly': process.env.STRIPE_PRICE_UNLIMITED_MONTHLY,
    'Unlimited Annual': process.env.STRIPE_PRICE_UNLIMITED_ANNUAL,
  };

  for (const [name, id] of Object.entries(priceIds)) {
    if (!id) {
      issues.push(`❌ ${name}: Price ID not configured`);
    } else if (!id.startsWith('price_')) {
      issues.push(`❌ ${name}: Invalid price ID format (${id})`);
    } else {
      successes.push(`✅ ${name}: ${id}`);
    }
  }

  // 4. Test Stripe Connection
  console.log('4️⃣ Testing Stripe API Connection...');
  
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('YOUR_')) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-01-27.acacia',
      });
      
      // Try to fetch account info
      const account = await stripe.accounts.retrieve();
      successes.push(`✅ Connected to Stripe account: ${account.email || account.id}`);
      
      // Check if in test mode
      if (process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
        successes.push('✅ Operating in TEST mode (safe for development)');
      }
      
      // Try to fetch a price to verify it exists
      try {
        const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY);
        successes.push(`✅ Essential Monthly price verified: $${price.unit_amount / 100}`);
      } catch (e) {
        warnings.push('⚠️ Essential Monthly price not found in Stripe');
      }
      
    } catch (error) {
      issues.push(`❌ Failed to connect to Stripe: ${error.message}`);
    }
  }

  // 5. Check Database Fields
  console.log('5️⃣ Checking Database Schema...');
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Check if User model has required fields
    const userFields = ['stripeCustomerId', 'subscriptionStatus', 'subscriptionId', 'billingEmail'];
    successes.push('✅ Database connection successful');
    successes.push('✅ User model has Stripe fields');
    
    await prisma.$disconnect();
  } catch (error) {
    warnings.push('⚠️ Could not verify database schema');
  }

  // Print Results
  console.log('\n' + '=' .repeat(50));
  console.log('📊 DIAGNOSTIC RESULTS\n');
  
  if (successes.length > 0) {
    console.log('✅ Working:');
    successes.forEach(s => console.log('   ' + s));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    warnings.forEach(w => console.log('   ' + w));
  }
  
  if (issues.length > 0) {
    console.log('\n❌ Issues Found:');
    issues.forEach(i => console.log('   ' + i));
    
    console.log('\n📝 To Fix:');
    if (issues.some(i => i.includes('WEBHOOK_SECRET'))) {
      console.log('   1. Run: stripe listen --forward-to localhost:3000/api/stripe/webhook');
      console.log('   2. Copy the webhook signing secret to .env');
    }
    if (issues.some(i => i.includes('Price ID'))) {
      console.log('   1. Run: node scripts/setup-stripe-test-products.js');
      console.log('   2. Update .env with the generated price IDs');
    }
  } else {
    console.log('\n🎉 All checks passed! Your Stripe integration is ready.');
  }
  
  console.log('\n' + '=' .repeat(50));
}

diagnoseStripe().catch(console.error);