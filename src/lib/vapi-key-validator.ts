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

  // Check for public key format
  if (key.startsWith('pk_') || key.startsWith('pk-')) {
    return {
      isValid: true,
      type: 'public',
      message: 'Valid public key detected. Safe for browser use.',
    };
  }

  // Check for secret key format
  if (key.startsWith('sk_') || key.startsWith('sk-')) {
    return {
      isValid: true,
      type: 'secret',
      message: 'Secret key detected. DO NOT use in browser!',
      recommendations: [
        'Secret keys should only be used server-side',
        'For browser/web usage, create a public key in VAPI dashboard',
        'Public keys start with pk_ or pk-',
        'Update VAPI_API_KEY with your public key for web client usage'
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
        'Get your public API key from https://dashboard.vapi.ai',
        'Public keys start with pk_ or pk-'
      ]
    };
  }

  // Unknown format
  return {
    isValid: false,
    type: 'invalid',
    message: 'Unknown key format',
    recommendations: [
      'VAPI API keys should start with pk_ (public) or sk_ (secret)',
      'Check your key in the VAPI dashboard',
      'For web usage, use a public key (pk_)'
    ]
  };
}

/**
 * Get the appropriate key for VAPI web client usage
 */
export function getVapiWebKey(): string | null {
  const apiKey = process.env.VAPI_API_KEY;
  const validation = validateVapiKey(apiKey);

  if (validation.isValid && validation.type === 'public') {
    return apiKey!;
  }

  console.error('[VapiKeyValidator] Invalid key for web usage:', validation);
  return null;
}