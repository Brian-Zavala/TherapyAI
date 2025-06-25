/**
 * Reminder Sending API Route
 * Connects user notification preferences to actual sending logic
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { z } from 'zod';
import { sendSMS, formatPhoneNumber } from '@/lib/sms-service';

const resend = new Resend(process.env.RESEND_API_KEY);

// Request validation schema
const SendReminderSchema = z.object({
  notificationId: z.string(),
  userId: z.string(),
  sessionId: z.string(),
  method: z.enum(['email', 'sms', 'push', 'in-app']),
  type: z.enum(['reminder', 'completion', 'update', 'alert']),
  title: z.string(),
  message: z.string(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  metadata: z.record(z.any()).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = SendReminderSchema.parse(body);

    // Get user and their preferences
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
      include: {
        profile: true,
        sessions: {
          where: { id: validatedData.sessionId },
          include: {
            sessionFamilyMembers: {
              include: {
                familyMember: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const session = user.sessions[0];
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check user's notification preferences
    const notificationPrefs = user.profile?.notificationPrefs || 'email';
    const preferredMethods = typeof notificationPrefs === 'string' 
      ? notificationPrefs.split(',').map((m: string) => m.trim())
      : Array.isArray(notificationPrefs) ? notificationPrefs : ['email'];

    // Override with specific method if provided and allowed
    const effectiveMethod = preferredMethods.includes(validatedData.method) 
      ? validatedData.method 
      : preferredMethods[0] || 'email';

    let deliveryResult = null;
    let deliveryStatus = 'pending';
    let errorMessage = null;

    try {
      switch (effectiveMethod) {
        case 'email':
          deliveryResult = await sendEmailReminder(
            user,
            session,
            validatedData.title,
            validatedData.message,
            validatedData.priority
          );
          break;

        case 'sms':
          if (user.profile?.phone) {
            const smsResult = await sendSMS({
              to: formatPhoneNumber(user.profile.phone),
              body: validatedData.message,
              notificationId: validatedData.notificationId,
              userId: validatedData.userId,
              sessionId: validatedData.sessionId,
              priority: validatedData.priority === 'urgent' || validatedData.priority === 'high' ? 'high' : 'normal',
              validateOnly: false
            });
            
            if (smsResult.success) {
              deliveryResult = {
                delivered: true,
                method: 'sms',
                messageId: smsResult.messageId,
                segments: smsResult.segments,
                mock: smsResult.mock
              };
            } else {
              throw new Error(smsResult.error || 'Failed to send SMS');
            }
          } else {
            throw new Error('No phone number available for SMS');
          }
          break;

        case 'push':
          // Push notifications would be handled by service worker
          deliveryResult = await sendPushNotification(
            validatedData.userId,
            validatedData.title,
            validatedData.message,
            validatedData.metadata
          );
          break;

        case 'in-app':
          // In-app notifications are handled by real-time system
          deliveryResult = { delivered: true, method: 'in-app' };
          break;

        default:
          throw new Error(`Unsupported delivery method: ${effectiveMethod}`);
      }

      deliveryStatus = 'delivered';
    } catch (error: any) {
      console.error(`Failed to send ${effectiveMethod} reminder:`, error);
      deliveryStatus = 'failed';
      errorMessage = error.message;
    }

    // Update notification record
    await prisma.notification.update({
      where: { id: validatedData.notificationId },
      data: {
        deliveryStatus,
        deliveryMethod: String(effectiveMethod),
        sentAt: new Date(),
        deliveredAt: deliveryStatus === 'delivered' ? new Date() : null,
        deliveryAttempts: {
          increment: 1
        }
      }
    });

    // Log the reminder event
    await prisma.auditLog.create({
      data: {
        userId: validatedData.userId,
        sessionId: validatedData.sessionId,
        action: 'REMINDER_SENT',
        entityType: 'Notification',
        entityId: validatedData.notificationId,
        metadata: {
          method: effectiveMethod,
          status: deliveryStatus,
          priority: validatedData.priority,
          error: errorMessage
        }
      }
    });

    return NextResponse.json({
      success: deliveryStatus === 'delivered',
      method: effectiveMethod,
      deliveryResult,
      error: errorMessage
    });

  } catch (error) {
    console.error('Failed to send reminder:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to send reminder'
    }, { status: 500 });
  }
}

/**
 * Send email reminder using Resend
 */
async function sendEmailReminder(
  user: any,
  session: any,
  title: string,
  message: string,
  priority: string
): Promise<any> {
  const sessionDate = new Date(session.date);
  const formattedDate = sessionDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const familyMembers = session.sessionFamilyMembers
    ?.map((sfm: any) => sfm.familyMember.name)
    .join(', ');

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #6b7280; }
          .priority-${priority} { border-left: 4px solid ${priority === 'urgent' ? '#ef4444' : priority === 'high' ? '#f97316' : '#3b82f6'}; padding-left: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">${title}</h1>
          </div>
          <div class="content priority-${priority}">
            <p>Hi ${user.name || 'there'},</p>
            <p>${message}</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e40af;">Session Details</h3>
              <p><strong>Date & Time:</strong> ${formattedDate}</p>
              <p><strong>Duration:</strong> ${session.duration} minutes</p>
              <p><strong>Theme:</strong> ${session.theme}</p>
              ${familyMembers ? `<p><strong>Participants:</strong> ${familyMembers}</p>` : ''}
              ${session.notes ? `<p><strong>Notes:</strong> ${session.notes}</p>` : ''}
            </div>
            
            <a href="${process.env.NEXTAUTH_URL}/dashboard" class="button">View in Dashboard</a>
            
            <p style="margin-top: 30px;">
              <strong>Need to reschedule?</strong><br>
              You can manage your session from your dashboard or reply to this email for assistance.
            </p>
          </div>
          <div class="footer">
            <p>You're receiving this because you have a scheduled therapy session.</p>
            <p><a href="${process.env.NEXTAUTH_URL}/settings/notifications" style="color: #3b82f6;">Manage notification preferences</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  const result = await resend.emails.send({
    from: `AI Therapy Platform <${process.env.EMAIL_FROM}>`,
    to: [user.email],
    subject: title,
    html: emailHtml,
    text: `${title}\n\n${message}\n\nSession Details:\nDate & Time: ${formattedDate}\nDuration: ${session.duration} minutes\nTheme: ${session.theme}\n\nView in Dashboard: ${process.env.NEXTAUTH_URL}/dashboard`
  });

  return result;
}


/**
 * Send push notification (placeholder for service worker integration)
 */
async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  _data?: any
): Promise<any> {
  // In a real implementation, this would:
  // 1. Get user's push subscription from database
  // 2. Send notification via web push protocol
  // 3. Handle errors and retry logic
  
  // For now, we'll create a notification record that the service worker can pick up
  const notification = await prisma.notification.create({
    data: {
      userId,
      type: 'reminder',
      title,
      message: body,
      priority: 'normal',
      deliveryMethod: 'push',
      deliveryStatus: 'sent',
      sentAt: new Date()
    }
  });

  return {
    delivered: true,
    method: 'push',
    notificationId: notification.id
  };
}