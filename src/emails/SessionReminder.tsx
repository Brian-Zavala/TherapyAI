// emails/SessionReminder.tsx
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

interface SessionReminderProps {
  username: string;
  sessionDate: Date;
  duration: number;
  notes?: string;
  isOneHourReminder?: boolean;
}

export default function SessionReminderEmail({
  username,
  sessionDate,
  duration,
  notes,
  isOneHourReminder = false,
}: SessionReminderProps) {
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
      <Preview>{isOneHourReminder ? 'Your session starts in 1 hour' : 'Your therapy session is coming up soon'}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Text style={headerStyle}>
            {isOneHourReminder ? '⏰ Starting Soon!' : 'Session Reminder'}
          </Text>
          
          <Text style={textStyle}>Hello {username},</Text>
          <Text style={textStyle}>
            {isOneHourReminder 
              ? 'Your therapy session is starting in just 1 hour! Please prepare for your session.'
              : 'This is a friendly reminder that you have a therapy session scheduled for:'}
          </Text>
          
          <Section style={dateBlockStyle}>
            <Text style={dateStyle}>{formattedDate}</Text>
            <Text style={durationStyle}>Duration: {duration} minutes</Text>
          </Section>
          
          {notes && (
            <Section style={notesBlockStyle}>
              <Text style={notesHeaderStyle}>Session Notes:</Text>
              <Text style={notesStyle}>{notes}</Text>
            </Section>
          )}
          
          <Button href="https://yourplatform.com/dashboard" style={buttonStyle}>
            View Your Dashboard
          </Button>
          
          <Hr style={dividerStyle} />
          
          <Text style={footerStyle}>
            Need to reschedule? Please do so at least 24 hours in advance.
          </Text>
          
          <Link href="https://yourplatform.com/reschedule" style={linkStyle}>
            Reschedule Here
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