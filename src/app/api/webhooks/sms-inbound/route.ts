/**
 * Twilio Inbound SMS Webhook Handler
 * Handles STOP/START keywords and other SMS responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleOptOut, handleOptIn } from '@/lib/sms-service';
import { verifyTwilioSignature } from '@/lib/twilio-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const params: Record<string, any> = {};
    
    // Convert FormData to object
    for (const [key, value] of body.entries()) {
      params[key] = value.toString();
    }
    
    // Extract message details
    const {
      From: fromNumber,
      To: toNumber,
      Body: messageBody,
      MessageSid
    } = params;
    
    console.log('Inbound SMS:', {
      from: fromNumber,
      body: messageBody,
      sid: MessageSid
    });
    
    // Verify webhook signature
    const twilioSignature = request.headers.get('x-twilio-signature');
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (process.env.NODE_ENV === 'production') {
      if (!twilioSignature || !authToken) {
        console.error('Missing Twilio signature or auth token in production');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const isValid = verifyTwilioSignature(authToken, twilioSignature, request.url, params);
      if (!isValid) {
        console.error('Invalid Twilio webhook signature');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else if (twilioSignature && authToken) {
      const isValid = verifyTwilioSignature(authToken, twilioSignature, request.url, params);
      if (!isValid) {
        console.warn('Invalid Twilio webhook signature (dev mode, continuing)');
      }
    }
    
    // Process the message body
    const keyword = messageBody.trim().split(' ')[0]; // Get first word
    
    // Handle opt-out keywords
    await handleOptOut(fromNumber, keyword);
    
    // Handle opt-in keywords
    await handleOptIn(fromNumber, keyword);
    
    // Handle other keywords (future expansion)
    // For example: YES/NO for appointment confirmations
    // HELP for support information
    // etc.
    
    // Twilio expects TwiML response or empty 200 OK
    // Return empty response to acknowledge receipt without sending a reply
    return new NextResponse('', { 
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    });
    
  } catch (error) {
    console.error('Inbound SMS webhook error:', error);
    
    // Return 200 to prevent Twilio retries for processing errors
    return new NextResponse('', { status: 200 });
  }
}