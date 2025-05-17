// src/lib/sms-service-mock.ts
// Mock SMS service that logs messages instead of sending them
// Use this for development/testing without SMS costs

export interface SMSOptions {
  to: string;
  body: string;
}

export const sendSMS = async (options: SMSOptions): Promise<boolean> => {
  console.log('📱 [MOCK SMS] Would send to:', options.to);
  console.log('📱 [MOCK SMS] Message:', options.body);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Always return success in mock mode
  return true;
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