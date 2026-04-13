import crypto from 'crypto';

/**
 * Verify Twilio webhook request signature.
 * See: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function verifyTwilioSignature(
  authToken: string,
  twilioSignature: string,
  url: string,
  params: Record<string, any>
): boolean {
  const data = Object.keys(params)
    .sort()
    .map(key => `${key}${params[key]}`)
    .join('');

  const signature = crypto
    .createHmac('sha1', authToken)
    .update(url + data)
    .digest('base64');

  return signature === twilioSignature;
}
