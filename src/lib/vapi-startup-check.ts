import { validateVapiKey } from './vapi-key-validator';

/**
 * Performs startup checks for VAPI configuration
 * Logs warnings and recommendations for common misconfigurations
 */
export function performVapiStartupCheck(): void {
  console.log('🔍 [VAPI] Performing startup configuration check...');

  const apiKey = process.env.VAPI_API_KEY;
  const orgId = process.env.VAPI_ORG_ID;
  const privateKey = process.env.VAPI_PRIVATE_KEY;

  // Check API Key
  const keyValidation = validateVapiKey(apiKey);
  
  if (!apiKey) {
    console.error('❌ [VAPI] VAPI_API_KEY is not set');
    console.error('   → Get your API key from https://dashboard.vapi.ai');
    return;
  }

  if (!keyValidation.isValid) {
    console.error(`❌ [VAPI] Invalid API key: ${keyValidation.message}`);
    if (keyValidation.recommendations) {
      console.error('   Recommendations:');
      keyValidation.recommendations.forEach(rec => {
        console.error(`   → ${rec}`);
      });
    }
    return;
  }

  // Log key type
  console.log(`✅ [VAPI] API key validated: ${keyValidation.type} key detected`);

  if (keyValidation.type === 'secret') {
    console.warn('⚠️  [VAPI] Secret key detected!');
    console.warn('   → For web/browser usage, create a public key (pk_) in VAPI dashboard');
    console.warn('   → Secret keys should only be used server-side');
  }

  // Check Org ID
  if (!orgId) {
    console.warn('⚠️  [VAPI] VAPI_ORG_ID is not set');
    console.warn('   → Required for JWT token generation');
  } else {
    console.log('✅ [VAPI] Org ID configured');
  }

  // Check Private Key
  if (!privateKey) {
    console.warn('⚠️  [VAPI] VAPI_PRIVATE_KEY is not set');
    console.warn('   → Required for JWT token generation');
    console.warn('   → Will use API key directly for web client');
  } else {
    console.log('✅ [VAPI] Private key configured for JWT generation');
  }

  // Summary
  console.log('📊 [VAPI] Configuration summary:');
  console.log(`   - Authentication method: ${privateKey ? 'JWT tokens' : 'Direct API key'}`);
  console.log(`   - Key type: ${keyValidation.type}`);
  console.log(`   - Web client ready: ${keyValidation.type === 'public' ? 'Yes' : 'No'}`);
  
  if (keyValidation.type !== 'public') {
    console.error('');
    console.error('🚨 [VAPI] ACTION REQUIRED:');
    console.error('   1. Log into https://dashboard.vapi.ai');
    console.error('   2. Create a new PUBLIC key (starts with pk_)');
    console.error('   3. Update VAPI_API_KEY in your .env file');
    console.error('   4. Restart your development server');
  }
}

// Run the check if this module is imported
if (typeof window === 'undefined') {
  // Only run on server-side
  performVapiStartupCheck();
}