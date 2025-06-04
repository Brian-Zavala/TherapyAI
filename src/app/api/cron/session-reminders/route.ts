// app/api/cron/session-reminders/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import SessionReminderEmail from '@/emails/SessionReminder';
import SessionMissedEmail from '@/emails/SessionMissed';
// import { sendSessionReminder } from '@/lib/sms-service'; // Currently using mock implementation

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
    const upcomingSessions24h = await prisma.session.findMany({
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

    // Find sessions happening in next 1 hour without 1-hour reminder
    const upcomingSessions1h = await prisma.session.findMany({
      where: {
        status: 'scheduled',
        oneHourReminderSent: false,
        date: {
          gt: new Date(),
          lt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        },
      },
      include: {
        user: true,
      },
    });

    // Process 24-hour reminders
    const reminder24hResults = await Promise.allSettled(
      upcomingSessions24h.map(async (session) => {
        // Always use email for notifications
        const updates: { emailReminderSent?: boolean } = {};
        
        // Send email reminder if needed
        if (!session.emailReminderSent && session.user.email) {
          try {
            const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
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

    // Process 1-hour reminders
    const reminder1hResults = await Promise.allSettled(
      upcomingSessions1h.map(async (session) => {
        if (!session.oneHourReminderSent && session.user.email) {
          try {
            const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
            await resend.emails.send({
              from: `Therapy AI Support <${process.env.EMAIL_FROM}>`,
              to: session.user.email,
              subject: 'Starting Soon: Your Therapy Session in 1 Hour',
              react: SessionReminderEmail({
                username: session.user.name || 'Valued Client',
                sessionDate: session.date,
                duration: session.duration,
                notes: session.notes || '',
                isOneHourReminder: true, // Add this to customize the email template
                baseUrl: baseUrl,
              }),
            });
            
            // Update the session to mark 1-hour reminder as sent
            await prisma.session.update({
              where: { id: session.id },
              data: { oneHourReminderSent: true },
            });
            
            console.log(`1-hour reminder sent for session ${session.id}`);
          } catch (emailError) {
            console.error(`Failed to send 1-hour reminder for session ${session.id}:`, emailError);
          }
        }
      })
    );

    // Handle missed sessions (past scheduled time without completion)
    const missedSessionsToUpdate = await prisma.session.findMany({
      where: {
        status: 'scheduled',
        date: {
          lt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      },
      include: {
        user: true,
      },
    });

    // Send SessionMissed emails for each missed session
    const missedEmailResults = await Promise.allSettled(
      missedSessionsToUpdate.map(async (session) => {
        try {
          // Update session status to missed
          await prisma.session.update({
            where: { id: session.id },
            data: { status: 'missed' },
          });

          // Find available slots for rescheduling (next 7 days)
          const nextAvailableSlots = await prisma.session.findMany({
            where: {
              status: 'available',
              date: {
                gte: new Date(),
                lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
              },
            },
            orderBy: {
              date: 'asc',
            },
            take: 3, // Show only 3 options
          });

          const formattedSlots = nextAvailableSlots.map(slot => ({
            date: slot.date.toLocaleDateString(),
            time: slot.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));

          // Send missed session email
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
              nextAvailableSlots: formattedSlots.length > 0 ? formattedSlots : undefined,
              baseUrl: baseUrl,
            }),
          });
          console.log(`Missed session email sent for session ${session.id}`);
        } catch (error) {
          console.error(`Failed to process missed session ${session.id}:`, error);
          throw error;
        }
      })
    );

    // Return processing results
    return NextResponse.json({
      reminders24hSent: reminder24hResults.filter(r => r.status === 'fulfilled').length,
      reminders24hFailed: reminder24hResults.filter(r => r.status === 'rejected').length,
      reminders1hSent: reminder1hResults.filter(r => r.status === 'fulfilled').length,
      reminders1hFailed: reminder1hResults.filter(r => r.status === 'rejected').length,
      missedSessionsUpdated: missedSessionsToUpdate.length,
      missedEmailsSent: missedEmailResults.filter(r => r.status === 'fulfilled').length,
      missedEmailsFailed: missedEmailResults.filter(r => r.status === 'rejected').length,
    });
  } catch (error) {
    console.error('Error processing session reminders:', error);
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 });
  }
}