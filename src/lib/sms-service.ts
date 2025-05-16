// src/lib/sms-service.ts
import twilio from 'twilio';

// Initialize Twilio client
const getClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    console.error('Missing Twilio credentials');
    return null;
  }
  
  return twilio(accountSid, authToken);
};

export interface SMSOptions {
  to: string;
  body: string;
}

export const sendSMS = async (options: SMSOptions): Promise<boolean> => {
  try {
    const client = getClient();
    if (!client) {
      console.error('Twilio client not initialized');
      return false;
    }

    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!from) {
      console.error('Missing Twilio phone number');
      return false;
    }

    // Send the message
    const message = await client.messages.create({
      body: options.body,
      from: from,
      to: options.to
    });

    console.log(`SMS sent successfully. Message SID: ${message.sid}`);
    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
};

export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Add +1 if it's a 10-digit US number
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // If it already has country code, just add +
  if (cleaned.length > 10 && !cleaned.startsWith('+')) {
    return `+${cleaned}`;
  }
  
  return phone;
};

export const sendSessionReminder = async (
  phoneNumber: string,
  sessionDate: Date,
  duration: number
): Promise<boolean> => {
  const formattedDate = sessionDate.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const body = `Reminder: You have a therapy session scheduled for ${formattedDate} (${duration} minutes). Reply STOP to unsubscribe.`;
  
  return sendSMS({
    to: formatPhoneNumber(phoneNumber),
    body
  });
};

export const sendSessionConfirmation = async (
  phoneNumber: string,
  sessionDate: Date,
  duration: number
): Promise<boolean> => {
  const formattedDate = sessionDate.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const body = `Your therapy session has been scheduled for ${formattedDate} (${duration} minutes). We'll send you a reminder 24 hours before. Reply STOP to unsubscribe.`;
  
  return sendSMS({
    to: formatPhoneNumber(phoneNumber),
    body
  });
};