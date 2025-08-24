/**
 * Twilio SMS Status Webhook Handler
 * Tracks delivery status of SMS messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma-optimized';
import crypto from 'crypto';

// Verify webhook signature from Twilio
function verifyTwilioSignature(
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const params: Record<string, any> = {};
    
    // Convert FormData to object
    for (const [key, value] of body.entries()) {
      params[key] = value.toString();
    }
    
    // Verify webhook signature (optional but recommended)
    const twilioSignature = request.headers.get('x-twilio-signature');
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (twilioSignature && authToken) {
      const url = request.url;
      const isValid = verifyTwilioSignature(authToken, twilioSignature, url, params);
      
      if (!isValid) {
        console.error('Invalid Twilio webhook signature');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    // Extract status information
    const {
      MessageSid,
      MessageStatus,
      ErrorCode,
      ErrorMessage,
      To,
      From
    } = params;
    
    console.log('SMS Status Update:', {
      sid: MessageSid,
      status: MessageStatus,
      to: To,
      errorCode: ErrorCode
    });
    
    // Map Twilio status to our delivery status
    let deliveryStatus = 'pending';
    switch (MessageStatus) {
      case 'delivered':
        deliveryStatus = 'delivered';
        break;
      case 'failed':
      case 'undelivered':
        deliveryStatus = 'failed';
        break;
      case 'sent':
      case 'sending':
      case 'queued':
        deliveryStatus = 'sent';
        break;
    }
    
    // Update notification record based on MessageSid
    // Note: You'll need to store MessageSid when sending SMS
    const notification = await prisma.notification.findFirst({
      where: {
        deliveryMethod: 'sms',
        metadata: {
          path: ['messageSid'],
          equals: MessageSid
        }
      }
    });
    
    if (notification) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          deliveryStatus,
          deliveredAt: deliveryStatus === 'delivered' ? new Date() : null,
          metadata: {
            ...(notification.metadata as object || {}),
            twilioStatus: MessageStatus,
            errorCode: ErrorCode,
            errorMessage: ErrorMessage
          }
        }
      });
      
      // Log the status update
      await prisma.auditLog.create({
        data: {
          userId: notification.userId,
          action: 'SMS_STATUS_UPDATE',
          entityType: 'Notification',
          entityId: notification.id,
          metadata: {
            status: MessageStatus,
            deliveryStatus,
            errorCode: ErrorCode
          }
        }
      });
    }
    
    // Twilio expects a 200 OK response
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('SMS webhook error:', error);
    // Return 200 to prevent Twilio retries for processing errors
    return NextResponse.json({ error: 'Processing error' }, { status: 200 });
  }
}