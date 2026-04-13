import { getAuthSession } from '@/lib/auth'
// src/app/api/support/contact/route.ts
import { NextResponse } from 'next/server';
import { sendEmail, DEFAULT_EMAIL_FROM } from '@/lib/email';

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@therapyai.us';

export async function POST(request: Request) {
  console.log('Support contact API called');
  try {
    console.log('Getting session');
    // Get the current session (optional, can allow unauthenticated messages)
    const session = await getAuthSession();
    console.log('Session:', session ? 'Found' : 'Not found');
    
    // Parse request body
    const body = await request.json();
    console.log('Request body:', JSON.stringify(body));
    const { name, email, subject, message } = body;
    
    // Basic validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }
    
    // Format subject based on selection
    const subjectMap: Record<string, string> = {
      account: 'Account Issue',
      billing: 'Billing Question',
      technical: 'Technical Support',
      therapy: 'Therapy Services',
      feedback: 'Feedback',
      other: 'Other Inquiry'
    };
    
    const formattedSubject = `Support Request: ${subjectMap[subject] || subject}`;
    
    // Build the HTML for the support email
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">New Support Request</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subjectMap[subject] || subject}</p>
        <p><strong>User Authenticated:</strong> ${session ? 'Yes' : 'No'}</p>
        ${session ? `<p><strong>User ID:</strong> ${session.user?.email}</p>` : ''}
        <div style="margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 5px;">
          <h3 style="margin-top: 0;">Message:</h3>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
      </div>
    `;
    
    // Log email information
    console.log('Attempting to send email with:');
    console.log('From:', DEFAULT_EMAIL_FROM);
    console.log('To:', SUPPORT_EMAIL);
    console.log('Subject:', formattedSubject);

    // Send email to support
    try {
      const result = await sendEmail({
        to: SUPPORT_EMAIL,
        replyTo: email,
        subject: formattedSubject,
        html: html,
      });

      if (!result.success) {
        console.error('Error sending support email:', result.error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
      }

      console.log('Email sent successfully');
    } catch (emailError) {
      console.error('Exception sending email:', emailError);
      return NextResponse.json({ error: `Email exception: ${emailError instanceof Error ? emailError.message : String(emailError)}` }, { status: 500 });
    }

    // Also send confirmation email to the user
    await sendEmail({
      to: email,
      subject: 'We received your support request',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Support Request Received</h2>
          <p>Hi ${name},</p>
          <p>Thank you for contacting our support team. We've received your message regarding "${subjectMap[subject] || subject}".</p>
          <p>Our team will review your inquiry and get back to you as soon as possible, usually within 24 hours during business days.</p>
          <p>For your reference, here's a copy of your message:</p>
          <div style="margin-top: 10px; padding: 15px; background-color: #f3f4f6; border-radius: 5px;">
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
          <p style="margin-top: 20px;">Best regards,<br>Therapy Support Team</p>
        </div>
      `,
    });
    
    // Return success response
    return NextResponse.json({ 
      success: true,
      message: 'Support request sent successfully' 
    });
    
  } catch (error) {
    console.error('Error processing support request:', error);
    return NextResponse.json({ 
      error: `Failed to process request: ${error instanceof Error ? error.message : String(error)}` 
    }, { 
      status: 500 
    });
  }
}