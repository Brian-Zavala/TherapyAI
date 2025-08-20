/**
 * Utility to validate VAPI API key format and type
 */

export type VapiKeyType = 'public' | 'secret' | 'invalid';

export interface VapiKeyValidation {
  isValid: boolean;
  type: VapiKeyType;
  message: string;
  recommendations?: string[];
}

/**
 * Validates a VAPI API key and returns information about it
 */
export function validateVapiKey(key: string | undefined): VapiKeyValidation {
  if (!key) {
    return {
      isValid: false,
      type: 'invalid',
      message: 'No API key provided',
      recommendations: [
        'Set VAPI_API_KEY in your environment variables',
        'Get your API key from https://dashboard.vapi.ai'
      ]
    };
  }

  // Check if it might be a JWT token (contains dots)
  if (key.includes('.') && key.split('.').length === 3) {
    return {
      isValid: false,
      type: 'invalid',
      message: 'This appears to be a JWT token, not a VAPI API key',
      recommendations: [
        'VAPI Web SDK expects an API key, not a JWT token',
        'Get your API key from https://dashboard.vapi.ai',
        'API keys are UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      ]
    };
  }

  // VAPI uses UUID format keys - validate UUID pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (uuidPattern.test(key)) {
    // VAPI keys are all considered "public" for web client use
    // The distinction between public/private is handled by VAPI internally
    return {
      isValid: true,
      type: 'public',
      message: 'Valid VAPI UUID key detected. Safe for client use.',
    };
  }

  // Check for legacy prefixed format (deprecated)
  if (key.startsWith('pk_') || key.startsWith('pk-')) {
    return {
      isValid: true,
      type: 'public',
      message: 'Valid legacy public key detected.',
      recommendations: [
        'Consider updating to UUID format for consistency with VAPI standards'
      ]
    };
  }

  if (key.startsWith('sk_') || key.startsWith('sk-')) {
    return {
      isValid: true,
      type: 'secret',
      message: 'Legacy secret key detected. Use with caution.',
      recommendations: [
        'Secret keys should only be used server-side',
        'For browser/web usage, use UUID format keys from VAPI dashboard',
        'Consider updating to UUID format for consistency'
      ]
    };
  }

  // Unknown format
  return {
    isValid: false,
    type: 'invalid',
    message: 'Invalid VAPI key format',
    recommendations: [
      'VAPI API keys should be UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      'Get your API key from https://dashboard.vapi.ai',
      'Ensure the key is copied correctly without extra characters'
    ]
  };
}

/**
 * Get the appropriate key for VAPI web client usage
 */
export function getVapiWebKey(): string | null {
  // Try VAPI_PUBLIC_KEY first (preferred for web client)
  const publicKey = process.env.VAPI_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
  if (publicKey) {
    const validation = validateVapiKey(publicKey);
    if (validation.isValid) {
      return publicKey;
    }
  }

  // Fall back to VAPI_API_KEY
  const apiKey = process.env.VAPI_API_KEY;
  const validation = validateVapiKey(apiKey);

  if (validation.isValid && validation.type === 'public') {
    return apiKey!;
  }

  console.error('[VapiKeyValidator] No valid key for web usage found:', validation);
  return null;
}