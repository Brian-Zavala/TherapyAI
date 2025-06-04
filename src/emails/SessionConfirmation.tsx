// emails/SessionConfirmation.tsx
import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Link,
  Preview,
  Section,
  Button,
  Hr,
} from '@react-email/components';

interface SessionConfirmationProps {
  username: string;
  sessionDate: Date;
  duration: number;
  theme?: string;
  notes?: string;
  baseUrl: string;
}

export default function SessionConfirmationEmail({
  username,
  sessionDate,
  duration,
  theme,
  notes,
  baseUrl,
}: SessionConfirmationProps) {
  const formattedDate = new Date(sessionDate).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <Html>
      <Head />
      <Preview>Your therapy session has been scheduled</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Text style={headerStyle}>Session Confirmed!</Text>
          
          <Text style={textStyle}>Hi {username},</Text>
          <Text style={textStyle}>
            Your therapy session has been successfully scheduled. We look forward to meeting with you!
          </Text>
          
          <Section style={dateBlockStyle}>
            <Text style={dateStyle}>{formattedDate}</Text>
            <Text style={durationStyle}>Duration: {duration} minutes</Text>
            {theme && theme !== 'AI Therapy Session' && (
              <Text style={themeStyle}>Theme: {theme}</Text>
            )}
          </Section>
          
          {notes && (
            <Section style={notesBlockStyle}>
              <Text style={notesHeaderStyle}>Your Notes:</Text>
              <Text style={notesStyle}>{notes}</Text>
            </Section>
          )}
          
          <Button href={`${baseUrl}/dashboard/sessions`} style={buttonStyle}>
            View Your Sessions
          </Button>
          
          <Hr style={dividerStyle} />
          
          <Text style={footerStyle}>
            We'll send you a reminder 24 hours before your session.
          </Text>
          
          <Text style={footerStyle}>
            Need to reschedule? Please do so at least 24 hours in advance.
          </Text>
          
          <Link href={`${baseUrl}/schedule`} style={linkStyle}>
            Manage Your Schedule
          </Link>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const bodyStyle = {
  backgroundColor: '#f6f9fc',
  fontFamily: 'Arial, sans-serif',
  margin: '0',
  padding: '0',
};

const containerStyle = {
  margin: '0 auto',
  padding: '20px',
  backgroundColor: '#ffffff',
  borderRadius: '5px',
  maxWidth: '600px',
};

const headerStyle = {
  fontSize: '24px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#0F172A',
  marginBottom: '15px',
  textAlign: 'center' as const,
};

const textStyle = {
  fontSize: '16px',
  lineHeight: '1.4',
  color: '#334155',
  marginBottom: '10px',
};

const dateBlockStyle = {
  margin: '20px 0',
  padding: '15px',
  backgroundColor: '#F0F9FF',
  borderRadius: '4px',
  border: '1px solid #E0F2FE',
};

const dateStyle = {
  fontSize: '18px',
  fontWeight: '700',
  color: '#0369A1',
  marginBottom: '5px',
  textAlign: 'center' as const,
};

const durationStyle = {
  fontSize: '16px',
  color: '#0369A1',
  textAlign: 'center' as const,
  margin: '0',
};

const themeStyle = {
  fontSize: '14px',
  color: '#0369A1',
  textAlign: 'center' as const,
  marginTop: '8px',
};

const notesBlockStyle = {
  margin: '20px 0',
  padding: '15px',
  backgroundColor: '#F8FAFC',
  borderRadius: '4px',
  border: '1px solid #F1F5F9',
};

const notesHeaderStyle = {
  fontSize: '16px',
  fontWeight: '700',
  color: '#334155',
  marginBottom: '5px',
};

const notesStyle = {
  fontSize: '15px',
  lineHeight: '1.4',
  color: '#64748B',
  margin: '0',
};

const buttonStyle = {
  backgroundColor: '#0284C7',
  borderRadius: '4px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 16px',
  margin: '25px 0',
};

const dividerStyle = {
  borderTop: '1px solid #E2E8F0',
  margin: '20px 0',
};

const footerStyle = {
  fontSize: '14px',
  lineHeight: '1.5',
  color: '#64748B',
  textAlign: 'center' as const,
  marginBottom: '10px',
};

const linkStyle = {
  color: '#0284C7',
  textDecoration: 'underline',
  textAlign: 'center' as const,
  display: 'block',
  fontSize: '14px',
};