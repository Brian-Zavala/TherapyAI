import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  react?: React.ReactElement;
  text?: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  react,
  text,
  from = 'Therapy Platform <noreply@therapy.app>',
  replyTo
}: EmailOptions) {
  try {
    const data = await resend.emails.send({
      from,
      to,
      subject,
      html,
      react,
      text,
      replyTo
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

// Helper function for sending alert emails
export async function sendAlertEmail(
  to: string,
  subject: string,
  message: string
) {
  return sendEmail({
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${subject}</h2>
        <p style="color: #666; line-height: 1.6;">${message}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          This is an automated message from your Therapy Platform.
        </p>
      </div>
    `
  });
}

// Helper function for sending notification emails
export async function sendNotificationEmail(
  to: string,
  title: string,
  body: string,
  ctaText?: string,
  ctaUrl?: string
) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${title}</h1>
      </div>
      <div style="background: #f7f7f7; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="color: #333; line-height: 1.6; font-size: 16px;">${body}</p>
        ${ctaText && ctaUrl ? `
          <div style="text-align: center; margin-top: 30px;">
            <a href="${ctaUrl}" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
              ${ctaText}
            </a>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: title,
    html
  });
}