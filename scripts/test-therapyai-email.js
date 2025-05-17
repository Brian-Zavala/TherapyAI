// scripts/test-therapyai-email.js
// This script tests email sending with the therapyai.us domain

require('dotenv').config();
const { Resend } = require('resend');

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  console.log('Testing Resend email sending with therapyai.us domain...');
  console.log(`Using API key: ${process.env.RESEND_API_KEY ? 'Configured (value hidden)' : 'NOT SET'}`);
  console.log(`From address: ${process.env.EMAIL_FROM}`);
  console.log(`');
  
  if (!process.env.EMAIL_FROM) {
    console.error('ERROR: EMAIL_FROM is not set in environment variables');
    return;
  }
  
  // Test recipient - you can change this to your email address
  const testRecipient = process.env.TEST_EMAIL || 'your-email@example.com';
  console.log(`Sending test email to: ${testRecipient}`);
  
  try {
    const { data, error } = await resend.emails.send({
      from: `Therapy AI Support <${process.env.EMAIL_FROM}>`,
      to: testRecipient,
      subject: 'Test Email from Therapy AI',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Test Email from Therapy AI</h2>
          <p>This is a test email from your Therapy AI website using the therapyai.us domain.</p>
          <p>If you're receiving this, it means your email configuration is working correctly!</p>
          <p style="margin-top: 20px;">Email details:</p>
          <ul>
            <li>From: ${process.env.EMAIL_FROM}</li>
            <li>Domain: therapyai.us</li>
            <li>Timestamp: ${new Date().toISOString()}</li>
          </ul>
          <p style="margin-top: 20px;">Best regards,<br>Therapy AI Team</p>
        </div>
      `
    });
    
    if (error) {
      console.error('Error sending email:', error);
      return;
    }
    
    console.log('');
    console.log('Email sent successfully!');
    console.log('Email ID:', data.id);
    console.log('');
    console.log('Next steps:');
    console.log('1. Check the recipient inbox for the test email');
    console.log('2. Verify the sender shows as support@therapyai.us');
    console.log('3. Update TEST_EMAIL in .env to test with different recipients');
  } catch (error) {
    console.error('Exception sending email:', error);
  }
}

main().catch(console.error);