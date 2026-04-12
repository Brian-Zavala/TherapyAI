// app/api/cron/session-reminders/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-optimized';
import { Resend } from 'resend';
import SessionReminderEmail from '@/emails/SessionReminder';
import SessionMissedEmail from '@/emails/SessionMissed';
import { sendSessionReminder } from '@/lib/sms-service';
import { createSessionNotificationToken, generateNotificationUrls } from '@/lib/notification-tokens';

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);
const CRON_SECRET = process.env.CRON_SECRET;

// Helper function to check if user wants SMS notifications
function shouldSendSMS(session: any): boolean {
  const profile = session.user?.profile;
  if (!profile || !profile.phone || !profile.smsConsent) {
    return false;
  }

  // Check if user has SMS in their notification preferences
  const notificationPrefs = profile.notificationPrefs;
  if (Array.isArray(notificationPrefs)) {
    return notificationPrefs.includes('sms');
  }
  
  // Fallback for string format (backwards compatibility)
  return notificationPrefs === 'sms';
}

// Helper function to check if user wants email notifications
function shouldSendEmail(session: any): boolean {
  const profile = session.user?.profile;
  if (!profile) return true; // Default to email if no profile

  const notificationPrefs = profile.notificationPrefs;
  if (Array.isArray(notificationPrefs)) {
    return notificationPrefs.includes('email');
  }
  
  // Fallback for string format (backwards compatibility)
  return notificationPrefs === 'email' || notificationPrefs !== 'none';
}

export async function GET(request: Request) {
  // Security check for cron job
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Find sessions happening in next 24 hours without reminders
    const upcomingSessions24h = await prisma.session.findMany({
      where: {
        status: 'SCHEDULED',
        OR: [
          { emailReminderSent: false },
          { smsReminderSent: false }
        ],
        date: {
          gt: new Date(),
          lt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        },
      },
      include: {
        user: {
          include: {
            profile: true, // Include user profile for notification preferences and phone
          }
        }
      },
    });

    // Find sessions happening in next 1 hour without 1-hour reminder
    const upcomingSessions1h = await prisma.session.findMany({
      where: {
        status: 'SCHEDULED',
        oneHourReminderSent: false,
        date: {
          gt: new Date(),
          lt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        },
      },
      include: {
        user: {
          include: {
            profile: true, // Include user profile for notification preferences and phone
          }
        }
      },
    });

    // Process 24-hour reminders: send notifications, then batch DB updates
    const emailSuccessIds24h: string[] = [];
    const smsSuccessIds24h: string[] = [];

    // Phase 1: Send all 24h email reminders in parallel
    const emailSessions24h = upcomingSessions24h.filter(
      s => !s.emailReminderSent && s.user.email && shouldSendEmail(s)
    );
    await Promise.allSettled(
      emailSessions24h.map(async (session) => {
        try {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          const { token } = await createSessionNotificationToken(session.id, session.userId, 'email');
          const urls = generateNotificationUrls(baseUrl, session.id, token);
          await resend.emails.send({
            from: `Therapy AI Support <${process.env.EMAIL_FROM}>`,
            to: session.user.email,
            subject: 'Reminder: Your Upcoming Therapy Session',
            react: SessionReminderEmail({
              username: session.user.name || 'Valued Client',
              sessionDate: session.date,
              duration: session.duration,
              notes: session.notes || '',
              baseUrl: baseUrl,
              trackingToken: token,
              sessionId: session.id,
              communicationStyle: session.user.profile?.communicationStyle as any,
              sessionTheme: session.theme,
            }) as any,
          });
          emailSuccessIds24h.push(session.id);
          console.log(`Email reminder sent for session ${session.id}`);
        } catch (emailError) {
          console.error(`Failed to send email reminder for session ${session.id}:`, emailError);
        }
      })
    );

    // Phase 2: Send all 24h SMS reminders in parallel
    const smsSessions24h = upcomingSessions24h.filter(
      s => !s.smsReminderSent && shouldSendSMS(s) && s.user.profile?.phone
    );
    await Promise.allSettled(
      smsSessions24h.map(async (session) => {
        try {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          const { token, shortToken } = await createSessionNotificationToken(session.id, session.userId, 'sms');
          const urls = generateNotificationUrls(baseUrl, session.id, token, shortToken);
          const smsResult = await sendSessionReminder(
            session.user.profile!.phone!,
            session.date,
            session.duration,
            {
              userId: session.user.id,
              sessionId: session.id,
              priority: 'high',
              shortUrl: urls.shortUrl
            }
          );
          if (smsResult.success) {
            smsSuccessIds24h.push(session.id);
            console.log(`SMS reminder sent for session ${session.id} to ${session.user.profile?.phone}`);
          } else {
            console.error(`Failed to send SMS reminder for session ${session.id}:`, smsResult.error);
          }
        } catch (smsError) {
          console.error(`SMS service error for session ${session.id}:`, smsError);
        }
      })
    );

    // Phase 3: Batch update reminder flags instead of per-session writes
    const reminder24hResults = await Promise.allSettled([
      emailSuccessIds24h.length > 0
        ? prisma.session.updateMany({
            where: { id: { in: emailSuccessIds24h } },
            data: { emailReminderSent: true },
          })
        : Promise.resolve(null),
      smsSuccessIds24h.length > 0
        ? prisma.session.updateMany({
            where: { id: { in: smsSuccessIds24h } },
            data: { smsReminderSent: true },
          })
        : Promise.resolve(null),
    ]);

    // Process 1-hour reminders: send notifications, then batch DB updates
    const oneHourSuccessIds: string[] = [];

    // Phase 1: Send all 1h email reminders in parallel
    const emailSessions1h = upcomingSessions1h.filter(
      s => s.user.email && shouldSendEmail(s)
    );
    await Promise.allSettled(
      emailSessions1h.map(async (session) => {
        try {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          const { token } = await createSessionNotificationToken(session.id, session.userId, 'email');
          const urls = generateNotificationUrls(baseUrl, session.id, token);
          await resend.emails.send({
            from: `Therapy AI Support <${process.env.EMAIL_FROM}>`,
            to: session.user.email,
            subject: 'Starting Soon: Your Therapy Session in 1 Hour',
            react: SessionReminderEmail({
              username: session.user.name || 'Valued Client',
              sessionDate: session.date,
              duration: session.duration,
              notes: session.notes || '',
              isOneHourReminder: true,
              baseUrl: baseUrl,
              trackingToken: token,
              sessionId: session.id,
              communicationStyle: session.user.profile?.communicationStyle as any,
              sessionTheme: session.theme,
            }) as any,
          });
          oneHourSuccessIds.push(session.id);
          console.log(`1-hour email reminder sent for session ${session.id}`);
        } catch (emailError) {
          console.error(`Failed to send 1-hour email reminder for session ${session.id}:`, emailError);
        }
      })
    );

    // Phase 2: Send all 1h SMS reminders in parallel
    const smsSessions1h = upcomingSessions1h.filter(
      s => shouldSendSMS(s) && s.user.profile?.phone
    );
    await Promise.allSettled(
      smsSessions1h.map(async (session) => {
        try {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          const { token, shortToken } = await createSessionNotificationToken(session.id, session.userId, 'sms');
          const urls = generateNotificationUrls(baseUrl, session.id, token, shortToken);
          const smsResult = await sendSessionReminder(
            session.user.profile!.phone!,
            session.date,
            session.duration,
            {
              userId: session.user.id,
              sessionId: session.id,
              priority: 'high',
              shortUrl: urls.shortUrl,
              isOneHour: true
            }
          );
          if (smsResult.success) {
            // Only add if not already added by email success
            if (!oneHourSuccessIds.includes(session.id)) {
              oneHourSuccessIds.push(session.id);
            }
            console.log(`1-hour SMS reminder sent for session ${session.id} to ${session.user.profile?.phone}`);
          } else {
            console.error(`Failed to send 1-hour SMS reminder for session ${session.id}:`, smsResult.error);
          }
        } catch (smsError) {
          console.error(`1-hour SMS service error for session ${session.id}:`, smsError);
        }
      })
    );

    // Phase 3: Batch update 1-hour reminder flags
    const reminder1hResults = oneHourSuccessIds.length > 0
      ? await prisma.session.updateMany({
          where: { id: { in: oneHourSuccessIds } },
          data: { oneHourReminderSent: true },
        })
      : { count: 0 };

    // Handle missed sessions (past scheduled time without completion)
    const missedSessionsToUpdate = await prisma.session.findMany({
      where: {
        status: 'SCHEDULED',
        date: {
          lt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      },
      include: {
        user: true,
      },
    });

    // Phase 1: Batch update all missed sessions to ABANDONED in a single query
    if (missedSessionsToUpdate.length > 0) {
      await prisma.session.updateMany({
        where: { id: { in: missedSessionsToUpdate.map(s => s.id) } },
        data: { status: 'ABANDONED' },
      });
    }

    // Phase 2: Send missed session emails in parallel (no per-session DB writes)
    const missedEmailResults = await Promise.allSettled(
      missedSessionsToUpdate.map(async (session) => {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        await resend.emails.send({
          from: `Therapy AI Support <${process.env.EMAIL_FROM}>`,
          to: session.user.email,
          subject: 'You Missed Your Therapy Session',
          react: SessionMissedEmail({
            userName: session.user.name || 'Valued Client',
            sessionDate: session.date.toLocaleDateString(),
            sessionTime: session.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            therapistName: 'Dr. Maya Thompson', // You might want to get this from your database
            sessionType: session.theme || 'Therapy Session',
            nextAvailableSlots: undefined, // Removed: sessions are user-specific, no generic available slots
            baseUrl: baseUrl,
          }) as any,
        });
        console.log(`Missed session email sent for session ${session.id}`);
      })
    );

    // Return processing results
    return NextResponse.json({
      reminders24hEmailsSent: emailSuccessIds24h.length,
      reminders24hSmsSent: smsSuccessIds24h.length,
      reminders1hSent: oneHourSuccessIds.length,
      missedSessionsUpdated: missedSessionsToUpdate.length,
      missedEmailsSent: missedEmailResults.filter(r => r.status === 'fulfilled').length,
      missedEmailsFailed: missedEmailResults.filter(r => r.status === 'rejected').length,
    });
  } catch (error) {
    console.error('Error processing session reminders:', error);
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 });
  }
}