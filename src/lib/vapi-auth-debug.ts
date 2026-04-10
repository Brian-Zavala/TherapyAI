// @ts-nocheck
/**
 * VAPI Authentication Debugging Utilities
 * 
 * Based on VAPI documentation and community feedback:
 * 1. JWT tokens must have exact structure: { orgId, token: { tag } }
 * 2. Private endpoints require tag: "private"
 * 3. Public endpoints (web calls) require tag: "public" with restrictions
 * 4. Server keys might be different from API keys
 */

import jwt from 'jsonwebtoken';

export interface VAPIAuthDebugResult {
  keyType: 'jwt' | 'api-key' | 'unknown';
  keyFormat: 'uuid' | 'rsa-pem' | 'plain' | 'unknown';
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}

export function analyzeVAPIKey(key: string): VAPIAuthDebugResult {
  const result: VAPIAuthDebugResult = {
    keyType: 'unknown',
    keyFormat: 'unknown',
    isValid: false,
    issues: [],
    recommendations: [],
  };

  if (!key) {
    result.issues.push('Key is empty');
    return result;
  }

  // Check if it's a JWT token
  if (key.split('.').length === 3) {
    result.keyType = 'jwt';
    try {
      const decoded = jwt.decode(key, { complete: true });
      if (decoded) {
        result.isValid = true;
        if (!decoded.payload.orgId) {
          result.issues.push('JWT missing orgId');
        }
        if (!decoded.payload.token) {
          result.issues.push('JWT missing token object');
        }
        if (!decoded.payload.token?.tag) {
          result.issues.push('JWT missing token.tag');
        }
      }
    } catch (error) {
      result.issues.push('Invalid JWT format');
    }
  }
  // Check if it's an API key
  else if (key.startsWith('pk_')) {
    result.keyType = 'api-key';
    result.keyFormat = 'plain';
    result.isValid = true;
    result.recommendations.push('This is a public API key. For JWT auth, you need a private/server key.');
  }
  // Check if it's a UUID-style key
  else if (key.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    result.keyFormat = 'uuid';
    result.recommendations.push('This appears to be a UUID-style key. Use it to sign JWT tokens.');
  }
  // Check if it's an RSA key
  else if (key.includes('-----BEGIN')) {
    result.keyFormat = 'rsa-pem';
    result.recommendations.push('This is an RSA private key. Use RS256 algorithm for JWT signing.');
  }

  return result;
}

export function generateVAPIToken(
  privateKey: string,
  orgId: string,
  scope: 'public' | 'private',
  options?: {
    expiresIn?: string;
    allowedOrigins?: string[];
    allowTransientAssistant?: boolean;
  }
): string {
  const payload: any = {
    orgId: orgId,
    token: {
      tag: scope,
    },
  };

  // Add restrictions for public tokens
  if (scope === 'public' && options?.allowedOrigins) {
    payload.token.restrictions = {
      enabled: true,
      allowedOrigins: options.allowedOrigins,
      allowTransientAssistant: options.allowTransientAssistant ?? true,
    };
  }

  // Determine algorithm based on key format
  const isRSAKey = privateKey.includes('-----BEGIN');
  const algorithm = isRSAKey ? 'RS256' : 'HS256';

  return jwt.sign(payload, privateKey, {
    algorithm: algorithm as jwt.Algorithm,
    expiresIn: options?.expiresIn || '1h',
  });
}

export async function testVAPIAuthentication(token: string): Promise<{
  success: boolean;
  status?: number;
  error?: string;
  details?: any;
}> {
  try {
    const response = await fetch('https://api.vapi.ai/assistant', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const result = {
      success: response.ok,
      status: response.status,
      error: undefined as string | undefined,
      details: undefined as any,
    };

    if (!response.ok) {
      const errorText = await response.text();
      result.error = errorText;
      
      // Parse common VAPI error responses
      try {
        const errorJson = JSON.parse(errorText);
        result.details = errorJson;
      } catch {
        // Not JSON, use raw text
      }
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}