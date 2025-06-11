#!/usr/bin/env node

/**
 * Test script to validate VAPI configuration and diagnose connection issues
 */

const https = require('https');

// Load environment variables
require('dotenv').config();

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_API_KEY;

console.log('🔍 VAPI Configuration Test\n');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Using inline assistant:', process.env.NEXT_PUBLIC_USE_INLINE_ASSISTANT === 'true' ? 'Yes' : 'No');
console.log('API Key present:', !!VAPI_API_KEY);
console.log('Public Key present:', !!VAPI_PUBLIC_KEY);

if (!VAPI_API_KEY) {
  console.error('\n❌ VAPI_API_KEY is missing! This is required for VAPI to work.');
  console.error('Please add VAPI_API_KEY to your .env file');
  process.exit(1);
}

if (!VAPI_PUBLIC_KEY) {
  console.error('\n❌ NEXT_PUBLIC_VAPI_API_KEY is missing! This is required for client-side VAPI.');
  console.error('Please add NEXT_PUBLIC_VAPI_API_KEY to your .env file');
}

console.log('\n📡 Testing VAPI API connection...\n');

// Test VAPI assistant endpoint (since /account might not exist)
const options = {
  hostname: 'api.vapi.ai',
  path: '/assistant',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${VAPI_API_KEY}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const assistants = JSON.parse(data);
        console.log('✅ VAPI API connection successful!\n');
        console.log('Assistant Info:');
        console.log('- Assistant count:', Array.isArray(assistants) ? assistants.length : 'Unknown');
        console.log('- API access: Verified');
        
        // Show first assistant info if available
        if (Array.isArray(assistants) && assistants.length > 0) {
          const first = assistants[0];
          console.log('- First assistant:', first.name || first.id || 'Unnamed');
        }

        // Test creating a simple inline call
        console.log('\n🧪 Testing inline assistant configuration...\n');
        testInlineCall();
        
      } catch (e) {
        console.error('❌ Failed to parse assistants response:', e.message);
        console.error('Response:', data);
      }
    } else {
      console.error(`❌ VAPI API request failed with status ${res.statusCode}`);
      console.error('Response:', data);
      
      if (res.statusCode === 401) {
        console.error('\n❌ Authentication failed - your VAPI_API_KEY is invalid or expired.');
        console.error('   Get a new API key from https://dashboard.vapi.ai');
      }
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Network error connecting to VAPI:', e.message);
});

req.end();

function testInlineCall() {
  const testConfig = {
    type: 'outboundPhoneCall',
    phoneNumberId: 'test', // This will fail but shows if config is accepted
    assistant: {
      model: {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        temperature: 1,
        maxTokens: 750,
        messages: [{
          role: 'system',
          content: 'You are a helpful assistant.'
        }]
      },
      voice: {
        provider: '11labs',
        voiceId: 'b5RPB35vTODb3BEmR3Fc'
      },
      transcriber: {
        provider: 'deepgram',
        model: 'nova-3',
        language: 'en-US'
      },
      firstMessage: 'Hello, this is a test.'
    }
  };

  const postData = JSON.stringify(testConfig);

  const callOptions = {
    hostname: 'api.vapi.ai',
    path: '/call',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const callReq = https.request(callOptions, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 201 || res.statusCode === 200) {
        console.log('✅ Inline assistant configuration is accepted by VAPI!');
        console.log('   Your inline configuration structure is valid.');
      } else if (res.statusCode === 400) {
        const error = JSON.parse(data);
        if (error.message && error.message.includes('phoneNumberId')) {
          console.log('✅ Inline assistant configuration structure is valid!');
          console.log('   (The call creation failed as expected due to test phone number)');
        } else {
          console.error('❌ Inline assistant configuration rejected:', error.message || data);
        }
      } else {
        console.error(`❌ Call creation failed with status ${res.statusCode}`);
        console.error('Response:', data);
      }

      console.log('\n📋 Summary:');
      console.log('- VAPI API Key:', VAPI_API_KEY ? '✅ Valid' : '❌ Missing');
      console.log('- NEXT_PUBLIC_VAPI_API_KEY:', VAPI_PUBLIC_KEY ? '✅ Present' : '❌ Missing');
      console.log('- API Connection:', res.statusCode < 500 ? '✅ Working' : '❌ Failed');
      console.log('- Inline Config:', process.env.NEXT_PUBLIC_USE_INLINE_ASSISTANT === 'true' ? '✅ Enabled' : '⚠️  Disabled');
    });
  });

  callReq.on('error', (e) => {
    console.error('❌ Network error testing call creation:', e.message);
  });

  callReq.write(postData);
  callReq.end();
}