// app/api/cron/session-reminders/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import SessionReminderEmail from '@/emails/SessionReminder';
import { sendSessionReminder } from '@/lib/sms-service'; // Currently using mock implementation

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // Security check for cron job
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Find sessions happening in next 24 hours without reminders
    const upcomingSessions = await prisma.session.findMany({
      where: {
        status: 'scheduled',
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
        user: true, // Include user data for email
      },
    });

    // Process each session
    const reminderResults = await Promise.allSettled(
      upcomingSessions.map(async (session) => {
        // Always use email for notifications
        const updates: any = {};
        
        // Send email reminder if needed
        if (!session.emailReminderSent && session.user.email) {
          try {
            await resend.emails.send({
              from: `Therapy Support <${process.env.EMAIL_FROM}>`,
              to: session.user.email,
              subject: 'Reminder: Your Upcoming Therapy Session',
              react: SessionReminderEmail({
                username: session.user.name || 'Valued Client',
                sessionDate: session.date,
                duration: session.duration,
                notes: session.notes || '',
              }),
            });
            updates.emailReminderSent = true;
            console.log(`Email reminder sent for session ${session.id}`);
          } catch (emailError) {
            console.error(`Failed to send email reminder for session ${session.id}:`, emailError);
          }
        }
        
        // Update the session with reminder status
        if (Object.keys(updates).length > 0) {
          return prisma.session.update({
            where: { id: session.id },
            data: updates,
          });
        }
        
        return null;
      })
    );

    // Handle missed sessions (past scheduled time without completion)
    const missedSessions = await prisma.session.updateMany({
      where: {
        status: 'scheduled',
        date: {
          lt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      },
      data: {
        status: 'missed',
      },
    });

    // Return processing results
    return NextResponse.json({
      remindersSent: reminderResults.filter(r => r.status === 'fulfilled').length,
      remindersFailed: reminderResults.filter(r => r.status === 'rejected').length,
      missedSessionsUpdated: missedSessions.count,
    });
  } catch (error) {
    console.error('Error processing session reminders:', error);
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 });
  }
}