/**
 * TherapyAI Welcome Message System
 * Creative, nurturing, energetic welcome messages for new users
 */

import { sendEmail, DEFAULT_EMAIL_FROM } from '@/lib/email';
import { sendSMS, formatPhoneNumber } from '@/lib/sms-service';
import { prisma } from '@/lib/prisma-optimized';
import { z } from 'zod';
import { Redis } from '@upstash/redis';

// User welcome data schema
const WelcomeUserSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().email(),
  notificationPrefs: z.any(),
  phone: z.string().optional(),
  smsConsent: z.boolean().optional(),
  therapyGoals: z.string().optional(),
  relationshipStatus: z.string().optional(),
  age: z.number().optional()
});

export type WelcomeUser = z.infer<typeof WelcomeUserSchema>;

// Ultra-crafted welcome message templates that make users feel amazing
export const WELCOME_TEMPLATES = {
  SMS: (name: string) => `Hi ${name}! Welcome to TherapyAI. Your journey to stronger relationships starts now. Reply STOP to unsubscribe.`,
  
  EMAIL_SUBJECT: (name: string) => `${name}, you've just made a beautiful choice 🌱`,
}

// Universal welcome message - perfect for everyone

// SMS Welcome Message Service
export const sendWelcomeSMS = async (user: WelcomeUser): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if user has SMS enabled and phone number
    const notificationPrefs = Array.isArray(user.notificationPrefs) ? user.notificationPrefs : [];
    if (!notificationPrefs.includes('sms') || !user.phone || !user.smsConsent) {
      return { success: false, error: 'SMS not enabled or no phone number' };
    }

    // Use universal welcome message
    const displayName = user.name || 'Friend';
    const message = WELCOME_TEMPLATES.SMS(displayName);

    // Format phone number to E.164 format
    let formattedPhone: string;
    try {
      formattedPhone = formatPhoneNumber(user.phone, 'US'); // Default to US, could be made configurable
    } catch (formatError) {
      console.error(`❌ Failed to format phone number ${user.phone}:`, formatError);
      return { success: false, error: 'Invalid phone number format' };
    }

    // Send SMS with high priority
    console.log(`📱 Attempting to send welcome SMS to ${formattedPhone} (original: ${user.phone}): "${message}"`);
    
    const result = await sendSMS({
      to: formattedPhone,
      body: message,
      userId: user.id,
      priority: 'high',
      validateOnly: false
    });

    console.log(`📱 SMS send result:`, result);

    if (result.success) {
      // Log welcome message sent
      await logWelcomeMessage(user.id, 'sms', result.messageId);
      console.log(`✅ Welcome SMS sent to ${formattedPhone}`);
    } else {
      console.error(`❌ SMS send failed:`, result.error);
    }

    return result;
  } catch (error) {
    console.error('Failed to send welcome SMS:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Email Welcome Message Service  
export const sendWelcomeEmail = async (user: WelcomeUser): Promise<{ success: boolean; error?: string }> => {
  
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY environment variable not set');
      return { success: false, error: 'Email service not configured' };
    }

    // Check if user has email enabled
    const notificationPrefs = Array.isArray(user.notificationPrefs) ? user.notificationPrefs : [];
    if (!notificationPrefs.includes('email')) {
      return { success: false, error: 'Email notifications not enabled' };
    }

    // Use universal welcome message
    const displayName = user.name || 'Friend';
    
    // Generate email content
    const subject = WELCOME_TEMPLATES.EMAIL_SUBJECT(displayName);
    const emailContent = generateWelcomeEmailHTML(user);

    // Send email
    console.log(`📧 Attempting to send welcome email to ${user.email} from ${DEFAULT_EMAIL_FROM}`);

    const response = await sendEmail({
      to: user.email,
      subject,
      html: emailContent,
    });

    console.log(`📧 Email send response:`, response);

    if (response.success) {
      // Log welcome message sent
      const emailId = (response.data as any)?.id || 'unknown';
      await logWelcomeMessage(user.id, 'email', emailId);
      console.log(`✅ Welcome email sent to ${user.email}`);
      return { success: true };
    } else {
      // Extract more specific error message
      let errorMessage = 'Failed to send email';
      if (response.error) {
        errorMessage = response.error instanceof Error ? response.error.message : String(response.error);
      }
      console.error(`❌ Email send failed:`, errorMessage, response);
      return { success: false, error: errorMessage };
    }
    
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Generate universal HTML email content
const generateWelcomeEmailHTML = (user: WelcomeUser): string => {
  const displayName = user.name || 'Friend';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  // Ultra-crafted content that makes users feel amazing
  const content = {
    emoji: '💝🌱',
    title: `You've just made a beautiful choice`,
    greeting: `${displayName}, what you did today took real courage.`,
    message: `Seeking support for your relationships isn't just brave—it's one of the most loving things you can do. You're not broken; you're growing. You're not starting from zero; you're building on the love that's already there. TherapyAI is honored to walk alongside you as you create the deeper connections your heart desires.`,
    cta: `Begin Your Transformation 🌟`,
    closing: `You have everything within you to create the relationships you dream of. We believe in you completely.`
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${content.title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
      <div style="max-width: 600px; margin: 0 auto; background: white; min-height: 100vh;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
          <div style="background: white; padding: 20px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            <h1 style="margin: 0; color: #2D1B69; font-size: 28px; font-weight: bold;">
              ${content.emoji} TherapyAI ${content.emoji}
            </h1>
            <p style="margin: 10px 0 0 0; color: #6B46C1; font-size: 18px; font-weight: 600;">
              ${content.title}
            </p>
          </div>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px 30px;">
          
          <!-- Greeting -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #1F2937; font-size: 24px; margin: 0 0 15px 0; font-weight: 600;">
              ${content.greeting}
            </h2>
          </div>

          <!-- Message -->
          <div style="background: #F8FAFC; padding: 25px; border-radius: 12px; border-left: 4px solid #6B46C1; margin-bottom: 30px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0;">
              ${content.message}
            </p>
          </div>

          <!-- What Awaits You -->
          <div style="margin-bottom: 30px;">
            <h3 style="color: #1F2937; font-size: 18px; margin-bottom: 20px; text-align: center;">
              Here's what we'll create together:
            </h3>
            <div style="display: grid; gap: 15px;">
              <div style="display: flex; align-items: center; padding: 15px; background: #EFF6FF; border-radius: 8px;">
                <span style="font-size: 24px; margin-right: 15px;">💫</span>
                <span style="color: #1E40AF; font-weight: 500;">Conversations that feel safe, heard, and understood</span>
              </div>
              <div style="display: flex; align-items: center; padding: 15px; background: #F0FDF4; border-radius: 8px;">
                <span style="font-size: 24px; margin-right: 15px;">🌉</span>
                <span style="color: #166534; font-weight: 500;">Bridges of connection where walls once stood</span>
              </div>
              <div style="display: flex; align-items: center; padding: 15px; background: #FEF3F2; border-radius: 8px;">
                <span style="font-size: 24px; margin-right: 15px;">🦋</span>
                <span style="color: #B91C1C; font-weight: 500;">The joy of watching your relationships transform</span>
              </div>
            </div>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${baseUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #6B46C1 0%, #8B5CF6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(107, 70, 193, 0.3); transition: transform 0.2s;">
              ${content.cta}
            </a>
          </div>

          <!-- Heart-centered Message -->
          <div style="background: linear-gradient(135deg, #FEF3F2 0%, #FEF2F2 100%); padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <p style="color: #7C2D12; font-size: 16px; margin: 0; font-style: italic; line-height: 1.5;">
              "${content.closing}"
            </p>
            <p style="color: #92400E; font-size: 14px; margin: 15px 0 0 0; font-weight: 500;">
              — Your TherapyAI Support Team 💜
            </p>
          </div>

          <!-- Always Here for You -->
          <div style="text-align: center; padding: 20px; background: #F9FAFB; border-radius: 8px;">
            <p style="color: #6B7280; font-size: 14px; margin: 0 0 10px 0;">
              Need a friendly voice? We're always here for you 💙
            </p>
            <a href="mailto:support@therapyai.com" style="color: #6B46C1; text-decoration: none; font-weight: 500;">
              support@therapyai.com
            </a>
          </div>

        </div>

        <!-- Footer -->
        <div style="background: #1F2937; padding: 20px; text-align: center;">
          <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
            © 2025 TherapyAI. Helping hearts connect, one conversation at a time ✨
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
};

// Main welcome message orchestrator
export const sendWelcomeMessages = async (user: WelcomeUser): Promise<{
  sms: { success: boolean; error: string };
  email: { success: boolean; error: string };
}> => {
  console.log(`🚀 [Welcome Messages] Starting welcome message send for user ${user.id} (${user.email})`);
  
  // Initialize Redis for deduplication
  let redis: Redis | null = null;
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    }
  } catch (error) {
    console.error('Failed to initialize Redis:', error);
  }
  
  // DEDUPLICATION CHECK - Prevent duplicate welcome messages
  if (redis) {
    const dedupKey = `welcome_sent:${user.id}`;
    
    try {
      // Check if welcome messages were already sent in Redis
      const alreadySent = await redis.get(dedupKey);
      if (alreadySent) {
        console.log(`✅ [Redis Dedup] Welcome messages already sent for user ${user.id} (found in Redis cache)`);
        return {
          sms: { success: false, error: 'Already sent (cached)' },
          email: { success: false, error: 'Already sent (cached)' }
        };
      }
      
      // Try to acquire lock using SETNX pattern
      const lockAcquired = await redis.set(dedupKey, '1', {
        nx: true, // Only set if not exists
        ex: 86400 * 7 // 7 days TTL
      });
      
      if (!lockAcquired) {
        console.log(`🔒 [Redis Dedup] Another process is sending welcome messages for user ${user.id}`);
        return {
          sms: { success: false, error: 'In progress (locked)' },
          email: { success: false, error: 'In progress (locked)' }
        };
      }
      
      console.log(`🔓 [Redis Dedup] Lock acquired for user ${user.id}, proceeding with send`);
    } catch (redisError) {
      console.error('Redis deduplication error:', redisError);
      // Continue without Redis deduplication if it fails
    }
  }
  
  console.log(`[Welcome Messages] User preferences:`, {
    notificationPrefs: user.notificationPrefs,
    phone: user.phone ? '***' + user.phone.slice(-4) : 'none',
    smsConsent: user.smsConsent
  });
  
  const results: {
    sms: { success: boolean; error: string };
    email: { success: boolean; error: string };
  } = {
    sms: { success: false, error: 'Not attempted' },
    email: { success: false, error: 'Not attempted' }
  };

  try {
    // Check if welcome messages were already sent
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { welcomeMessageSent: true, welcomeMessageSentAt: true }
    });
    
    if (existingUser?.welcomeMessageSent) {
      console.log(`⚠️ [Welcome Messages] User ${user.id} already received welcome messages at ${existingUser.welcomeMessageSentAt}`);
      return {
        sms: { success: false, error: 'Already sent' },
        email: { success: false, error: 'Already sent' }
      };
    }
    
    console.log(`[Welcome Messages] No previous welcome messages found, proceeding to send...`);
    
    // Send messages in parallel for better performance
    const [smsResult, emailResult] = await Promise.allSettled([
      sendWelcomeSMS(user),
      sendWelcomeEmail(user)
    ]);

    if (smsResult.status === 'fulfilled') {
      results.sms = { 
        success: smsResult.value.success, 
        error: smsResult.value.error || (smsResult.value.success ? '' : 'Unknown error')
      };
    } else {
      results.sms = { success: false, error: smsResult.reason?.message || 'SMS sending failed' };
    }

    if (emailResult.status === 'fulfilled') {
      results.email = { 
        success: emailResult.value.success, 
        error: emailResult.value.error || (emailResult.value.success ? '' : 'Unknown error')
      };
    } else {
      results.email = { success: false, error: emailResult.reason?.message || 'Email sending failed' };
    }

    // Log overall welcome completion
    const successCount = (results.sms.success ? 1 : 0) + (results.email.success ? 1 : 0);
    if (successCount > 0) {
      try {
        await logWelcomeCompletion(user.id, successCount);
        console.log(`🎉 Welcome messages sent to ${user.name || user.email}: ${successCount} successful`);
      } catch (dbError) {
        // If we successfully sent messages but failed to update the database,
        // we should still return success to prevent infinite retries
        console.error(`⚠️ Messages sent successfully but failed to update database:`, dbError);
        // Return partial success - messages were sent even if DB update failed
        return results;
      }
    }

    // If at least one message was sent successfully, consider the job successful
    // This prevents retries when email succeeds but SMS fails (or vice versa)
    if (successCount > 0) {
      // The logWelcomeCompletion call above already updates the database
      // Just return the results here
      return results;
    }
    
    // Check for permanent failures that shouldn't trigger retries
    const isPermanentEmailFailure = results.email.error && (
      results.email.error.includes('rate_limit_exceeded') ||
      results.email.error.includes('daily_quota_exceeded') ||
      results.email.error.includes('Too many requests') ||
      results.email.error.includes('daily email sending quota')
    );
    
    const isPermanentSMSFailure = results.sms.error && (
      results.sms.error.includes('Invalid phone number') ||
      results.sms.error.includes('opted out') ||
      results.sms.error.includes('block list')
    );
    
    // Only throw error if both failed AND they're not permanent failures
    if (successCount === 0 && 
        results.email.error !== 'Already sent' && 
        results.sms.error !== 'Already sent' &&
        !isPermanentEmailFailure && 
        !isPermanentSMSFailure) {
      // Remove Redis key to allow retry since both failed
      if (redis) {
        try {
          const dedupKey = `welcome_sent:${user.id}`;
          await redis.del(dedupKey);
          console.log(`🗑️ [Redis Dedup] Removed dedup key for retry after total failure`);
        } catch (redisError) {
          console.error('Failed to remove Redis dedup key:', redisError);
        }
      }
      throw new Error(`Failed to send any welcome messages: Email: ${results.email.error}, SMS: ${results.sms.error}`);
    }
    
    // Log permanent failures without throwing (prevents retries)
    if (isPermanentEmailFailure || isPermanentSMSFailure) {
      console.log(`⚠️ Permanent failure detected - not retrying:`, {
        email: isPermanentEmailFailure ? results.email.error : 'OK',
        sms: isPermanentSMSFailure ? results.sms.error : 'OK'
      });
    }
    
    // Log final results
    console.log(`[Welcome Messages] Final results for user ${user.id}:`, {
      email: results.email.success ? 'sent' : results.email.error,
      sms: results.sms.success ? 'sent' : results.sms.error,
      welcomeMessageSent: existingUser?.welcomeMessageSent || (successCount > 0)
    });
    
    return results;
    
  } catch (error) {
    console.error('Failed to send welcome messages:', error);
    return {
      sms: { success: false, error: 'Service error' },
      email: { success: false, error: 'Service error' }
    };
  }
};

// Helper function to generate email text version
const generateWelcomeEmailText = (user: WelcomeUser): string => {
  const displayName = user.name || 'Friend';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  return `${displayName}, what you did today took real courage.

Seeking support for your relationships isn't just brave—it's one of the most loving things you can do.

You're not broken; you're growing. You're not starting from zero; you're building on the love that's already there.

TherapyAI is honored to walk alongside you as you create the deeper connections your heart desires.

Begin Your Transformation: ${baseUrl}/dashboard

You have everything within you to create the relationships you dream of. We believe in you completely.

— Your TherapyAI Support Team 💜

Need a friendly voice? We're always here for you: support@therapyai.com

© 2025 TherapyAI. Helping hearts connect, one conversation at a time ✨`;
};

// Logging functions
const logWelcomeMessage = async (
  userId: string, 
  channel: 'sms' | 'email', 
  messageId?: string
): Promise<void> => {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: 'welcome_message',
        title: `Welcome to TherapyAI!`,
        message: `Welcome message sent via ${channel}`,
        priority: 'high',
        deliveryMethod: channel,
        deliveryStatus: 'sent',
        deliveredAt: new Date(),
        sentAt: new Date(),
        metadata: {
          type: 'welcome_message',
          messageId,
          timestamp: new Date().toISOString(),
          channel
        }
      }
    });
  } catch (error) {
    console.error('Failed to log welcome message:', error);
  }
};

const logWelcomeCompletion = async (userId: string, successCount: number): Promise<void> => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        welcomeMessageSent: true,
        welcomeMessageSentAt: new Date()
      }
    });
    console.log(`✅ Successfully marked welcome messages as sent for user ${userId}`);
  } catch (error) {
    console.error('Failed to log welcome completion:', error);
    // Re-throw the error to ensure the job fails and can be retried
    throw new Error(`Failed to update welcomeMessageSent flag: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export default {
  sendWelcomeMessages,
  sendWelcomeSMS,
  sendWelcomeEmail,
  WELCOME_TEMPLATES
};