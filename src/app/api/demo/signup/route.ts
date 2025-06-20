// Demo signup endpoint to capture leads
import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/config/demo.config';

export async function POST(request: NextRequest) {
  try {
    // Only allow in demo mode
    if (!isDemoMode()) {
      return NextResponse.json(
        { error: 'Demo signup only available in demo mode' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { email, interest } = data;

    // In production, you'd save this to your database
    // For demo, we'll just log it and send a follow-up email
    console.log('📧 Demo signup:', { email, interest });

    // Track the signup
    if (process.env.NEXT_PUBLIC_ANALYTICS_ID) {
      // Send to Google Analytics or your analytics provider
    }

    // In production, send welcome email via Resend
    if (process.env.RESEND_API_KEY !== 'demo-disabled') {
      // await sendDemoWelcomeEmail(email, interest);
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Demo access granted',
      demoConfig: {
        sessionLimit: 5,
        features: ['voice-ai', 'transcript', 'basic-analytics']
      }
    });
  } catch (error) {
    console.error('Demo signup error:', error);
    return NextResponse.json(
      { error: 'Failed to process demo signup' },
      { status: 500 }
    );
  }
}