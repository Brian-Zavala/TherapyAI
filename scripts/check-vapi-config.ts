#!/usr/bin/env tsx

/**
 * Script to check VAPI configuration and environment variables
 * Run with: npx tsx scripts/check-vapi-config.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

interface ConfigCheck {
  name: string;
  value: string | undefined;
  required: boolean;
  description: string;
  valid: boolean;
  error?: string;
}

function checkConfig(): void {
  console.log('🔍 Checking VAPI Configuration...\n');

  const checks: ConfigCheck[] = [
    {
      name: 'VAPI_ORG_ID',
      value: process.env.VAPI_ORG_ID,
      required: true,
      description: 'VAPI Organization ID for JWT authentication',
      valid: false,
    },
    {
      name: 'VAPI_PRIVATE_KEY',
      value: process.env.VAPI_PRIVATE_KEY,
      required: true,
      description: 'VAPI Private Key for JWT signing (RSA or HS256)',
      valid: false,
    },
    {
      name: 'NEXT_PUBLIC_VAPI_COUPLE_ASSISTANT_ID',
      value: process.env.NEXT_PUBLIC_VAPI_COUPLE_ASSISTANT_ID,
      required: false,
      description: 'VAPI Assistant ID for couple therapy (optional if using inline config)',
      valid: false,
    },
    {
      name: 'NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID',
      value: process.env.NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID,
      required: false,
      description: 'VAPI Assistant ID for individual therapy (optional if using inline config)',
      valid: false,
    },
    {
      name: 'NEXT_PUBLIC_VAPI_FAMILY_ASSISTANT_ID',
      value: process.env.NEXT_PUBLIC_VAPI_FAMILY_ASSISTANT_ID,
      required: false,
      description: 'VAPI Assistant ID for family therapy (optional if using inline config)',
      valid: false,
    },
    {
      name: 'NEXT_PUBLIC_VAPI_MAYA_VOICE_ID',
      value: process.env.NEXT_PUBLIC_VAPI_MAYA_VOICE_ID,
      required: false,
      description: 'Voice ID for Dr. Maya Thompson (couple therapy)',
      valid: false,
    },
    {
      name: 'NEXT_PUBLIC_VAPI_ELLIOT_VOICE_ID',
      value: process.env.NEXT_PUBLIC_VAPI_ELLIOT_VOICE_ID,
      required: false,
      description: 'Voice ID for Dr. Elliot Mackaphy (individual therapy)',
      valid: false,
    },
    {
      name: 'NEXT_PUBLIC_VAPI_JADA_VOICE_ID',
      value: process.env.NEXT_PUBLIC_VAPI_JADA_VOICE_ID,
      required: false,
      description: 'Voice ID for Dr. Jada Pearson (family therapy)',
      valid: false,
    },
  ];

  // Validate each configuration
  checks.forEach((check) => {
    if (!check.value) {
      check.valid = !check.required;
      if (check.required) {
        check.error = 'Missing required environment variable';
      }
    } else {
      // Validate format based on variable type
      if (check.name === 'VAPI_ORG_ID') {
        // VAPI Org IDs are typically UUIDs or similar format
        check.valid = check.value.length > 10;
        if (!check.valid) {
          check.error = 'Invalid format - expected VAPI organization ID';
        }
      } else if (check.name === 'VAPI_PRIVATE_KEY') {
        // Check if it's an RSA key or a simple string key
        const isRSAKey = check.value.includes('-----BEGIN');
        const isValidLength = check.value.length > 20;
        check.valid = isRSAKey || isValidLength;
        if (!check.valid) {
          check.error = 'Invalid key format';
        } else if (isRSAKey) {
          check.description += ' (RSA key detected - will use RS256)';
        } else {
          check.description += ' (Simple key detected - will use HS256)';
        }
      } else if (check.name.includes('ASSISTANT_ID') || check.name.includes('VOICE_ID')) {
        // Assistant and Voice IDs should be non-empty strings
        check.valid = check.value.length > 0;
      } else {
        check.valid = true;
      }
    }
  });

  // Display results
  const requiredChecks = checks.filter((c) => c.required);
  const optionalChecks = checks.filter((c) => !c.required);
  
  console.log('📋 Required Configuration:');
  console.log('─'.repeat(80));
  
  requiredChecks.forEach((check) => {
    const status = check.valid ? '✅' : '❌';
    const value = check.value ? `${check.value.substring(0, 20)}...` : 'NOT SET';
    console.log(`${status} ${check.name.padEnd(30)} ${value.padEnd(25)} ${check.description}`);
    if (check.error) {
      console.log(`   ⚠️  ${check.error}`);
    }
  });

  console.log('\n📋 Optional Configuration:');
  console.log('─'.repeat(80));
  
  optionalChecks.forEach((check) => {
    const status = check.value ? '✅' : '⚪';
    const value = check.value ? `${check.value.substring(0, 20)}...` : 'NOT SET';
    console.log(`${status} ${check.name.padEnd(30)} ${value.padEnd(25)} ${check.description}`);
  });

  // Summary
  const allRequiredValid = requiredChecks.every((c) => c.valid);
  const someOptionalSet = optionalChecks.some((c) => c.value);

  console.log('\n📊 Summary:');
  console.log('─'.repeat(80));
  
  if (allRequiredValid) {
    console.log('✅ All required VAPI environment variables are configured correctly!');
    console.log('   JWT token generation should work properly.');
  } else {
    console.log('❌ Missing required VAPI configuration!');
    console.log('   The application will not be able to generate VAPI tokens.');
    console.log('\n   To fix this:');
    console.log('   1. Add the missing environment variables to your .env file');
    console.log('   2. Contact VAPI support to get your Organization ID and Private Key');
    console.log('   3. Restart your development server after adding the variables');
  }

  if (!someOptionalSet) {
    console.log('\n⚠️  No optional assistant or voice IDs are set.');
    console.log('   The application will use inline assistant configuration instead.');
  }

  // Test JWT generation if config is valid
  if (allRequiredValid) {
    console.log('\n🧪 Testing JWT Generation...');
    try {
      const jwt = require('jsonwebtoken');
      const privateKey = process.env.VAPI_PRIVATE_KEY!;
      const isRSAKey = privateKey.includes('-----BEGIN');
      const algorithm = isRSAKey ? 'RS256' : 'HS256';
      
      const testPayload = {
        orgId: process.env.VAPI_ORG_ID,
        sub: 'test-user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      
      const token = jwt.sign(testPayload, privateKey, { algorithm: algorithm as any });
      console.log(`✅ Successfully generated test JWT token using ${algorithm} algorithm`);
      console.log(`   Token preview: ${token.substring(0, 50)}...`);
    } catch (error) {
      console.error('❌ Failed to generate test JWT token:', error);
    }
  }
}

// Run the check
checkConfig();