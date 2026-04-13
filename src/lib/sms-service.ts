// @ts-nocheck
/**
 * Production-Ready SMS Service
 * Implements Twilio best practices with enterprise features
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma-optimized';

// Dynamic import to handle package availability
let twilioClient: any = null;
let twilioInitialized = false;

// Environment validation
const smsConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
  statusWebhookUrl: process.env.TWILIO_STATUS_WEBHOOK_URL || `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL}/api/webhooks/sms-status`,
  useMock: process.env.SMS_USE_MOCK === 'true' || !process.env.TWILIO_ACCOUNT_SID
};

// Initialize Twilio client lazily
const initializeTwilio = () => {
  if (twilioInitialized) return twilioClient;
  
  if (smsConfig.useMock) {
    console.log('📱 SMS Service: Using mock implementation');
    return null;
  }
  
  if (!smsConfig.accountSid || !smsConfig.authToken) {
    console.warn('📱 SMS Service: Missing Twilio credentials, falling back to mock');
    return null;
  }
  
  try {
    const twilio = require('twilio');
    twilioClient = twilio(smsConfig.accountSid, smsConfig.authToken);
    twilioInitialized = true;
    console.log('📱 SMS Service: Twilio initialized successfully');
    return twilioClient;
  } catch (error) {
    console.error('📱 SMS Service: Failed to initialize Twilio:', error);
    return null;
  }
};

// E.164 phone number formatting with validation
export const formatPhoneNumber = (phone: string, countryCode: string = 'US'): string => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Country-specific formatting
  switch (countryCode) {
    case 'US':
    case 'CA':
      // North American Numbering Plan
      if (cleaned.length === 10) {
        return `+1${cleaned}`;
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`;
      }
      break;
    case 'UK':
      if (cleaned.length === 10 && cleaned.startsWith('7')) {
        return `+44${cleaned}`;
      } else if (cleaned.length === 11 && cleaned.startsWith('07')) {
        return `+44${cleaned.substring(1)}`;
      }
      break;
    // Add more countries as needed
  }
  
  // If already has country code, just add +
  if (cleaned.length > 10 && !phone.startsWith('+')) {
    return `+${cleaned}`;
  }
  
  // Return as-is if already formatted
  if (phone.startsWith('+')) {
    return phone;
  }
  
  throw new Error(`Invalid phone number format: ${phone}`);
};

// Validate phone number format
export const validatePhoneNumber = (phone: string): boolean => {
  // E.164 format: + followed by country code and number (max 15 digits)
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
};

// SMS Options with validation
const SMSOptionsSchema = z.object({
  to: z.string().refine(validatePhoneNumber, 'Invalid E.164 phone number'),
  body: z.string().min(1).max(1600), // SMS character limit
  notificationId: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  priority: z.enum(['normal', 'high']).default('normal'),
  scheduledTime: z.date().optional(),
  validateOnly: z.boolean().default(false)
});

export type SMSOptions = z.infer<typeof SMSOptionsSchema>;

// SMS sending result
export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  segments?: number;
  price?: string;
  mock?: boolean;
}

// Modern 2025 Message Templates - Clean, Professional, No Emojis
export const SMS_TEMPLATES = {
  SESSION_REMINDER: {
    template: (data: { date: string; duration: number; shortUrl?: string }) =>
      data.shortUrl 
        ? `Therapy Space\n\nSession: ${data.date}\n${data.duration} minutes\n\nJoin: ${data.shortUrl}\n\nReply STOP to opt out`
        : `Therapy Space: Your ${data.duration}-minute session is ${data.date}. We're ready to support you. Reply STOP to opt out.`,
    maxLength: 160
  },
  SESSION_REMINDER_ONE_HOUR: {
    template: (data: { date: string; duration: number; shortUrl?: string }) =>
      data.shortUrl
        ? `Therapy Space\n\nStarting in 1 HOUR\n${data.date}\n\nQuick join: ${data.shortUrl}\n\nPrepare for your ${data.duration}min journey`
        : `Therapy Space: Session begins in 1 HOUR at ${data.date}. Time to prepare for your ${data.duration}-minute session.`,
    maxLength: 160
  },
  SESSION_CONFIRMATION: {
    template: (data: { date: string; duration: number; shortUrl?: string }) =>
      data.shortUrl
        ? `Therapy Space\n\nConfirmed: ${data.date}\n${data.duration} minutes\n\nDetails: ${data.shortUrl}\n\n24hr reminder scheduled`
        : `Therapy Space: Confirmed for ${data.date} (${data.duration} min). We'll remind you 24hrs before. Reply STOP to opt out.`,
    maxLength: 160
  },
  SESSION_CANCELLATION: {
    template: (data: { date: string; reason?: string; shortUrl?: string }) =>
      data.shortUrl
        ? `Therapy Space\n\nCancelled: ${data.date}\n${data.reason ? `Reason: ${data.reason}\n` : ''}\nReschedule: ${data.shortUrl}`
        : `Therapy Space: ${data.date} cancelled.${data.reason ? ` ${data.reason}.` : ''} Reschedule when ready.`,
    maxLength: 160
  },
  RESCHEDULE_REQUEST: {
    template: (data: { oldDate: string; newDate: string; shortUrl?: string }) =>
      data.shortUrl
        ? `Therapy Space\n\nReschedule needed:\nFrom: ${data.oldDate}\nTo: ${data.newDate}\n\nConfirm: ${data.shortUrl}`
        : `Therapy Space: Reschedule from ${data.oldDate} to ${data.newDate}? Reply YES/NO. STOP to opt out.`,
    maxLength: 160
  },
  SESSION_COMPLETED: {
    template: (data: { duration: number; nextSessionDate?: string; shortUrl?: string }) =>
      data.shortUrl
        ? `Therapy Space\n\nSession complete (${data.duration}min)\n${data.nextSessionDate ? `Next: ${data.nextSessionDate}\n` : ''}\nReflect: ${data.shortUrl}`
        : data.nextSessionDate
          ? `Therapy Space: Well done! ${data.duration}min completed. Next: ${data.nextSessionDate}. Keep growing!`
          : `Therapy Space: ${data.duration}min session complete. Ready to schedule your next step forward?`,
    maxLength: 160
  },
  // New template for instant session start
  SESSION_START_NOW: {
    template: (data: { shortUrl: string; duration: number }) =>
      `Therapy Space\n\nYour ${data.duration}min session is ready\n\nStart now: ${data.shortUrl}\n\nWe're here for you`,
    maxLength: 160
  },
  // Welcome message after scheduling
  WELCOME_SCHEDULED: {
    template: (data: { name: string; date: string; shortUrl?: string }) =>
      data.shortUrl
        ? `Welcome ${data.name}!\n\nFirst session: ${data.date}\n\nPrepare: ${data.shortUrl}\n\nYour journey begins`
        : `Welcome to Therapy Space, ${data.name}! First session: ${data.date}. We're honored to support you.`,
    maxLength: 160
  }
};

// Calculate message segments (SMS are sent in 160-char segments)
export const calculateSegments = (message: string): number => {
  const length = message.length;
  if (length <= 160) return 1;
  // Multi-part messages use 153 chars per segment (7 chars for headers)
  return Math.ceil(length / 153);
};

// Main SMS sending function with all enterprise features
export const sendSMS = async (options: SMSOptions): Promise<SMSResult> => {
  try {
    // Validate options
    const validated = SMSOptionsSchema.parse(options);
    
    // Check for opt-out
    if (validated.userId) {
      const optOut = await checkOptOut(validated.userId, validated.to);
      if (optOut) {
        return {
          success: false,
          error: 'User has opted out of SMS notifications'
        };
      }
    }
    
    // Calculate segments for cost awareness
    const segments = calculateSegments(validated.body);
    
    // Validate only mode (for testing)
    if (validated.validateOnly) {
      return {
        success: true,
        segments,
        mock: true
      };
    }
    
    // Use mock if configured or Twilio not available
    const client = initializeTwilio();
    if (!client || smsConfig.useMock) {
      return sendMockSMS(validated, segments);
    }
    
    // Send via Twilio with all best practices
    try {
      const messageOptions: any = {
        body: validated.body,
        to: validated.to
      };
      
      // Only add statusCallback if it's a public URL (not localhost)
      if (smsConfig.statusWebhookUrl && !smsConfig.statusWebhookUrl.includes('localhost')) {
        messageOptions.statusCallback = smsConfig.statusWebhookUrl;
      }
      
      // Use Messaging Service if available (better for high volume)
      if (smsConfig.messagingServiceSid) {
        messageOptions.messagingServiceSid = smsConfig.messagingServiceSid;
      } else {
        messageOptions.from = smsConfig.phoneNumber;
      }
      
      // Add scheduled sending if specified
      if (validated.scheduledTime && validated.scheduledTime > new Date()) {
        messageOptions.sendAt = validated.scheduledTime.toISOString();
        messageOptions.scheduleType = 'fixed';
      }
      
      const message = await client.messages.create(messageOptions);
      
      // Log to database for tracking
      if (validated.notificationId) {
        await logSMSSent(validated.notificationId, message.sid, segments);
      }
      
      return {
        success: true,
        messageId: message.sid,
        segments,
        price: message.price || 'pending'
      };
      
    } catch (twilioError: any) {
      console.error('📱 Twilio error:', twilioError);
      
      // Handle specific Twilio errors
      if (twilioError.code === 21211) {
        return { success: false, error: 'Invalid phone number' };
      } else if (twilioError.code === 21610) {
        return { success: false, error: 'Phone number is on the block list' };
      } else if (twilioError.code === 21408) {
        return { success: false, error: 'Permission to send to this region denied' };
      }
      
      return {
        success: false,
        error: twilioError.message || 'Failed to send SMS'
      };
    }
    
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors[0].message}`
      };
    }
    
    console.error('📱 SMS Service error:', error);
    return {
      success: false,
      error: error.message || 'Unexpected error'
    };
  }
};

// Mock SMS for development/testing
const sendMockSMS = async (options: SMSOptions, segments: number): Promise<SMSResult> => {
  console.log('📱 [MOCK SMS]', {
    to: options.to,
    body: options.body,
    segments,
    scheduled: options.scheduledTime
  });
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
  
  // Simulate occasional failures for testing
  if (Math.random() < 0.05) {
    return {
      success: false,
      error: 'Mock SMS failure for testing',
      mock: true
    };
  }
  
  return {
    success: true,
    messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    segments,
    price: `$${(segments * 0.0075).toFixed(4)}`, // Mock pricing
    mock: true
  };
};

// Check if user has opted out
const checkOptOut = async (userId: string, phoneNumber: string): Promise<boolean> => {
  try {
    const optOut = await prisma.sMSOptOut.findFirst({
      where: {
        OR: [
          { userId },
          { phoneNumber }
        ],
        active: true
      }
    });
    
    return !!optOut;
  } catch (error) {
    console.error('Failed to check opt-out status:', error);
    return false; // Fail open - allow sending if check fails
  }
};

// Log SMS sent for tracking and analytics
const logSMSSent = async (notificationId: string, messageSid: string, segments: number) => {
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        metadata: {
          messageSid,
          segments,
          sentAt: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Failed to log SMS sent:', error);
  }
};

// High-level functions for common use cases
export const sendSessionReminder = async (
  phoneNumber: string,
  sessionDate: Date,
  duration: number,
  options?: Partial<SMSOptions> & { shortUrl?: string; isOneHour?: boolean }
): Promise<SMSResult> => {
  // Format date for better readability in SMS
  const formattedDate = sessionDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).replace(',', ' at');

  const template = options?.isOneHour 
    ? SMS_TEMPLATES.SESSION_REMINDER_ONE_HOUR 
    : SMS_TEMPLATES.SESSION_REMINDER;
    
  const body = template.template({
    date: formattedDate,
    duration,
    shortUrl: options?.shortUrl
  });
  
  return sendSMS({
    to: formatPhoneNumber(phoneNumber),
    body,
    priority: 'high',
    ...options
  });
};

export const sendSessionConfirmation = async (
  phoneNumber: string,
  sessionDate: Date,
  duration: number,
  options?: Partial<SMSOptions> & { shortUrl?: string }
): Promise<SMSResult> => {
  // Shorter format for confirmation
  const formattedDate = sessionDate.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const body = SMS_TEMPLATES.SESSION_CONFIRMATION.template({
    date: formattedDate,
    duration,
    shortUrl: options?.shortUrl
  });
  
  return sendSMS({
    to: formatPhoneNumber(phoneNumber),
    body,
    ...options
  });
};

// Send instant session start notification
export const sendInstantSessionStart = async (
  phoneNumber: string,
  duration: number,
  shortUrl: string,
  options?: Partial<SMSOptions>
): Promise<SMSResult> => {
  const body = SMS_TEMPLATES.SESSION_START_NOW.template({
    duration,
    shortUrl
  });
  
  return sendSMS({
    to: formatPhoneNumber(phoneNumber),
    body,
    priority: 'high',
    ...options
  });
};

// Send welcome message after first scheduling
export const sendWelcomeScheduled = async (
  phoneNumber: string,
  name: string,
  sessionDate: Date,
  options?: Partial<SMSOptions> & { shortUrl?: string }
): Promise<SMSResult> => {
  const formattedDate = sessionDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const body = SMS_TEMPLATES.WELCOME_SCHEDULED.template({
    name: name.split(' ')[0], // First name only for SMS
    date: formattedDate,
    shortUrl: options?.shortUrl
  });
  
  return sendSMS({
    to: formatPhoneNumber(phoneNumber),
    body,
    ...options
  });
};

// Handle SMS opt-out (STOP keyword)
export const handleOptOut = async (phoneNumber: string, keyword: string): Promise<void> => {
  if (['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'OPTOUT'].includes(keyword.toUpperCase())) {
    // Find user by phone number
    const user = await prisma.user.findFirst({
      where: {
        profile: {
          phone: phoneNumber
        }
      }
    });
    
    // Create opt-out record
    await prisma.sMSOptOut.create({
      data: {
        phoneNumber,
        userId: user?.id,
        keyword,
        optOutAt: new Date()
      }
    });
    
    // Send confirmation (required by regulations) - clean, professional tone
    await sendSMS({
      to: phoneNumber,
      body: 'Therapy Space: You\'ve been unsubscribed from SMS notifications. Reply START to resubscribe anytime.',
      priority: 'high',
      validateOnly: false
    });
  }
};

// Handle SMS opt-in (START keyword)
export const handleOptIn = async (phoneNumber: string, keyword: string): Promise<void> => {
  if (['START', 'SUBSCRIBE', 'YES'].includes(keyword.toUpperCase())) {
    // Remove opt-out record
    await prisma.sMSOptOut.updateMany({
      where: {
        phoneNumber,
        active: true
      },
      data: {
        active: false,
        optInAt: new Date()
      }
    });
    
    // Send confirmation - welcoming tone
    await sendSMS({
      to: phoneNumber,
      body: 'Therapy Space: Welcome back! You\'ll receive session reminders via SMS. Reply STOP to opt out.',
      priority: 'high',
      validateOnly: false
    });
  }
};

// Export for use in other modules
export default {
  sendSMS,
  sendSessionReminder,
  sendSessionConfirmation,
  sendInstantSessionStart,
  sendWelcomeScheduled,
  formatPhoneNumber,
  validatePhoneNumber,
  calculateSegments,
  handleOptOut,
  handleOptIn,
  SMS_TEMPLATES
};