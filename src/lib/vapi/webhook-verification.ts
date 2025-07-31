/**
 * VAPI Webhook Signature Verification
 * Verifies webhook signatures to ensure requests are from VAPI
 */

import crypto from 'crypto';
import { logger } from '@/lib/logger';

const VAPI_WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET || '';

export async function verifyVAPIWebhookSignature(
  body: string,
  signature: string
): Promise<boolean> {
  if (!VAPI_WEBHOOK_SECRET) {
    logger.warn('VAPI webhook secret not configured');
    // In development, allow webhooks without verification
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    return false;
  }

  try {
    // VAPI uses HMAC-SHA256 for webhook signatures
    const expectedSignature = crypto
      .createHmac('sha256', VAPI_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    // Compare signatures in a timing-safe manner
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    logger.error('Failed to verify VAPI webhook signature', {
      error: error instanceof Error ? error.message : error
    });
    return false;
  }
}