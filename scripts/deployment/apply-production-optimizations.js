#!/usr/bin/env node

/**
 * Production Optimization Script
 * Run this after deploying to apply all database optimizations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Applying Production Optimizations...\n');

// Check if we're in production
if (process.env.NODE_ENV !== 'production' && !process.argv.includes('--force')) {
  console.log('⚠️  This script should be run in production environment.');
  console.log('   Use --force to run in development.\n');
  process.exit(1);
}

async function runOptimizations() {
  try {
    // 1. Apply database indexes
    console.log('📊 Applying database indexes...');
    try {
      execSync('npx prisma db execute --file prisma/migrations/add_performance_indexes.sql', {
        stdio: 'inherit'
      });
      console.log('✅ Database indexes applied successfully\n');
    } catch (error) {
      console.log('⚠️  Could not apply indexes. You may need to run this manually:\n');
      console.log('   npx prisma db execute --file prisma/migrations/add_performance_indexes.sql\n');
    }

    // 2. Generate Prisma Client
    console.log('🔧 Regenerating Prisma Client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma Client regenerated\n');

    // 3. Check environment variables
    console.log('🔍 Checking environment variables...');
    const requiredEnvVars = [
      'DATABASE_URL',
      'DIRECT_URL',
      'NEXTAUTH_URL',
      'NEXTAUTH_SECRET',
      'VAPI_API_KEY',
      'RESEND_API_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log('❌ Missing required environment variables:');
      missingVars.forEach(varName => console.log(`   - ${varName}`));
      console.log('\n');
    } else {
      console.log('✅ All required environment variables are set\n');
    }

    // 4. Check optional performance enhancers
    console.log('🎯 Checking optional performance enhancers...');
    const optionalEnvVars = [
      { name: 'UPSTASH_REDIS_REST_URL', purpose: 'Redis caching' },
      { name: 'UPSTASH_REDIS_REST_TOKEN', purpose: 'Redis authentication' },
      { name: 'SENTRY_DSN', purpose: 'Error monitoring' },
      { name: 'VERCEL_URL', purpose: 'Deployment URL' }
    ];

    const missingOptional = optionalEnvVars.filter(({ name }) => !process.env[name]);
    
    if (missingOptional.length > 0) {
      console.log('💡 Optional environment variables not set:');
      missingOptional.forEach(({ name, purpose }) => 
        console.log(`   - ${name} (${purpose})`)
      );
      console.log('\n');
    } else {
      console.log('✅ All optional performance enhancers are configured\n');
    }

    // 5. Test database connection
    console.log('🔌 Testing database connection...');
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.$connect();
      await prisma.$disconnect();
      console.log('✅ Database connection successful\n');
    } catch (error) {
      console.log('❌ Database connection failed:', error.message, '\n');
    }

    // 6. Create .env.production.local template if it doesn't exist
    const envTemplate = path.join(process.cwd(), '.env.production.local.template');
    if (!fs.existsSync(envTemplate)) {
      console.log('📝 Creating .env.production.local.template...');
      const template = `# Production Environment Variables Template
# Copy this to .env.production.local and fill in your values

# Database (Supabase with Supavisor)
DATABASE_URL="postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.[PROJECT_ID]:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres"

# Authentication
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="[GENERATE WITH: openssl rand -base64 32]"

# Services
VAPI_API_KEY="[YOUR_VAPI_KEY]"
VAPI_ORG_ID="[YOUR_VAPI_ORG_ID]"
RESEND_API_KEY="[YOUR_RESEND_KEY]"
EMAIL_FROM="noreply@your-domain.com"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR_ANON_KEY]"

# Redis Caching (Optional but Recommended)
UPSTASH_REDIS_REST_URL="https://[YOUR_REDIS_URL].upstash.io"
UPSTASH_REDIS_REST_TOKEN="[YOUR_REDIS_TOKEN]"

# SMS (Optional)
TWILIO_ACCOUNT_SID="[YOUR_TWILIO_SID]"
TWILIO_AUTH_TOKEN="[YOUR_TWILIO_TOKEN]"
TWILIO_PHONE_NUMBER="+1234567890"
SMS_USE_MOCK=false

# Monitoring (Optional)
SENTRY_DSN="[YOUR_SENTRY_DSN]"
SENTRY_AUTH_TOKEN="[YOUR_SENTRY_AUTH_TOKEN]"

# Environment
NODE_ENV=production
`;
      fs.writeFileSync(envTemplate, template);
      console.log('✅ Created .env.production.local.template\n');
    }

    // 7. Summary
    console.log('📋 Optimization Summary:');
    console.log('=======================');
    console.log('✅ Database indexes script created');
    console.log('✅ Prisma Client regenerated');
    console.log(missingVars.length === 0 ? '✅ All required env vars set' : '❌ Some required env vars missing');
    console.log(missingOptional.length === 0 ? '✅ All optional features enabled' : '💡 Some optional features available');
    console.log('\n🎉 Production optimizations complete!');
    
    if (missingVars.length > 0) {
      console.log('\n⚠️  Please set the missing environment variables before deploying.');
    }

    console.log('\n📚 Next Steps:');
    console.log('1. Run "npm run build" to create production build');
    console.log('2. Run "npm run typecheck" and fix any errors');
    console.log('3. Deploy to your hosting platform');
    console.log('4. Check /api/health endpoint after deployment');
    console.log('5. Monitor performance metrics\n');

  } catch (error) {
    console.error('❌ Error during optimization:', error);
    process.exit(1);
  }
}

// Run the optimizations
runOptimizations();