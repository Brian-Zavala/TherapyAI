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
  Column,
  Row,
} from '@react-email/components';

interface SessionReminderProps {
  username: string;
  sessionDate: Date;
  duration: number;
  notes?: string;
  isOneHourReminder?: boolean;
  baseUrl: string;
  trackingToken?: string;
  sessionId?: string;
}

export default function SessionReminderEmail({
  username,
  sessionDate,
  duration,
  notes,
  isOneHourReminder = false,
  baseUrl,
  trackingToken,
  sessionId,
}: SessionReminderProps) {
  const formattedDate = new Date(sessionDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = new Date(sessionDate).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <Html>
      <Head />
      <Preview>
        {isOneHourReminder 
          ? 'Your therapy session starts in 1 hour' 
          : `Reminder: Therapy session on ${formattedDate}`}
      </Preview>
      <Body style={bodyStyle}>
        {/* Gradient Header */}
        <div style={isOneHourReminder ? urgentHeaderStyle : gradientHeaderStyle}>
          <Container style={headerContainerStyle}>
            <Text style={logoStyle}>Therapy Platform</Text>
          </Container>
        </div>

        <Container style={containerStyle}>
          {/* Alert Banner for 1-hour reminder */}
          {isOneHourReminder && (
            <Section style={alertBannerStyle}>
              <div style={alertIconStyle}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#F59E0B" strokeWidth="2"/>
                  <path d="M12 8V12L15 15" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <Text style={alertTextStyle}>Starting in 1 hour</Text>
            </Section>
          )}
          
          {/* Main Card */}
          <Section style={mainCardStyle}>
            <Text style={greetingStyle}>
              Hello {username},
            </Text>
            
            <Text style={reminderTextStyle}>
              {isOneHourReminder 
                ? 'Your therapy session is about to begin. Take a moment to prepare yourself for a meaningful conversation.'
                : 'This is a gentle reminder about your upcoming therapy session.'}
            </Text>
            
            {/* Session Details Card */}
            <div style={sessionDetailsCardStyle}>
              <Row>
                <Column style={iconColumnStyle}>
                  <div style={calendarIconStyle}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="4" width="18" height="18" rx="2" stroke="#667EEA" strokeWidth="2"/>
                      <path d="M16 2V6" stroke="#667EEA" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M8 2V6" stroke="#667EEA" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M3 10H21" stroke="#667EEA" strokeWidth="2"/>
                    </svg>
                  </div>
                </Column>
                <Column style={detailsColumnStyle}>
                  <Text style={sessionDateStyle}>{formattedDate}</Text>
                  <Text style={sessionTimeStyle}>{formattedTime}</Text>
                  <Text style={sessionDurationStyle}>{duration} minute session</Text>
                </Column>
              </Row>
            </div>
            
            {/* Session Notes */}
            {notes && (
              <div style={notesCardStyle}>
                <Text style={notesLabelStyle}>Session Focus</Text>
                <Text style={notesTextStyle}>{notes}</Text>
              </div>
            )}
            
            {/* Action Buttons */}
            {isOneHourReminder && trackingToken && sessionId && (
              <div style={instantStartContainerStyle}>
                <Text style={readyTextStyle}>Ready to begin?</Text>
                <Button 
                  href={`${baseUrl}/api/sessions/start-from-notification?token=${trackingToken}&action=instant`} 
                  style={instantStartButtonStyle}
                >
                  Start Session Now
                </Button>
                <Text style={instantStartHelpStyle}>
                  Click above to join your session immediately
                </Text>
              </div>
            )}
            
            <div style={buttonContainerStyle}>
              <Button 
                href={trackingToken && sessionId 
                  ? `${baseUrl}/dashboard?token=${trackingToken}&sessionId=${sessionId}` 
                  : `${baseUrl}/dashboard`
                } 
                style={dashboardButtonStyle}
              >
                View Dashboard
              </Button>
            </div>
          </Section>
          
          {/* Footer Actions */}
          <Section style={footerActionsStyle}>
            <Text style={footerTextStyle}>
              Need to make changes?
            </Text>
            <Link 
              href={trackingToken && sessionId 
                ? `${baseUrl}/schedule?reschedule=${sessionId}&token=${trackingToken}` 
                : `${baseUrl}/schedule`
              } 
              style={rescheduleLink}            >
              Reschedule Session
            </Link>
          </Section>
          
          <Hr style={dividerStyle} />
          
          <Text style={privacyTextStyle}>
            We respect your time and privacy. Sessions are confidential and conducted in a safe space.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Modern 2025 Styles - Clean, Therapeutic, Professional
const bodyStyle = {
  backgroundColor: '#F9FAFB',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: '0',
  padding: '0',
  WebkitTextSizeAdjust: '100%',
  msTextSizeAdjust: '100%',
};

const gradientHeaderStyle = {
  background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
  padding: '40px 0',
};

const urgentHeaderStyle = {
  background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
  padding: '40px 0',
};

const headerContainerStyle = {
  maxWidth: '600px',
  margin: '0 auto',
};

const logoStyle = {
  color: '#FFFFFF',
  fontSize: '22px',
  fontWeight: '600',
  letterSpacing: '-0.5px',
  margin: '0',
  textAlign: 'center' as const,
};

const containerStyle = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '0 20px',
};

const alertBannerStyle = {
  backgroundColor: '#FEF3C7',
  borderRadius: '12px',
  padding: '16px',
  margin: '24px 0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid #FCD34D',
};

const alertIconStyle = {
  marginRight: '12px',
  display: 'inline-flex',
};

const alertTextStyle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#92400E',
  margin: '0',
  display: 'inline',
};

const mainCardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '40px 32px',
  margin: '24px 0',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
};

const greetingStyle = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#1F2937',
  margin: '0 0 16px 0',
};

const reminderTextStyle = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#4B5563',
  margin: '0 0 32px 0',
};

const sessionDetailsCardStyle = {
  backgroundColor: '#F3F4F6',
  borderRadius: '12px',
  padding: '24px',
  margin: '0 0 24px 0',
};

const iconColumnStyle = {
  width: '64px',
  verticalAlign: 'middle',
};

const calendarIconStyle = {
  width: '48px',
  height: '48px',
  backgroundColor: '#EDE9FE',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const detailsColumnStyle = {
  paddingLeft: '16px',
  verticalAlign: 'middle',
};

const sessionDateStyle = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 4px 0',
};

const sessionTimeStyle = {
  fontSize: '18px',
  fontWeight: '500',
  color: '#667EEA',
  margin: '0 0 4px 0',
};

const sessionDurationStyle = {
  fontSize: '14px',
  color: '#6B7280',
  margin: '0',
};

const notesCardStyle = {
  backgroundColor: '#EDE9FE',
  borderRadius: '12px',
  padding: '20px',
  margin: '0 0 32px 0',
  border: '1px solid #DDD6FE',
};

const notesLabelStyle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#5B21B6',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px 0',
};

const notesTextStyle = {
  fontSize: '15px',
  lineHeight: '22px',
  color: '#6D28D9',
  margin: '0',
};

const instantStartContainerStyle = {
  textAlign: 'center' as const,
  margin: '32px 0',
  padding: '24px',
  backgroundColor: '#F0FDF4',
  borderRadius: '12px',
  border: '1px solid #BBF7D0',
};

const readyTextStyle = {
  fontSize: '16px',
  fontWeight: '500',
  color: '#15803D',
  margin: '0 0 16px 0',
};

const instantStartButtonStyle = {
  backgroundColor: '#10B981',
  borderRadius: '8px',
  color: '#FFFFFF',
  fontSize: '18px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 40px',
  border: 'none',
  boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.25)',
};

const instantStartHelpStyle = {
  fontSize: '14px',
  color: '#15803D',
  margin: '12px 0 0 0',
};

const buttonContainerStyle = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const dashboardButtonStyle = {
  backgroundColor: '#667EEA',
  borderRadius: '8px',
  color: '#FFFFFF',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  border: 'none',
};

const footerActionsStyle = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const footerTextStyle = {
  fontSize: '14px',
  color: '#6B7280',
  margin: '0 0 8px 0',
};

const rescheduleLink = {
  color: '#667EEA',
  fontSize: '14px',
  fontWeight: '500',
  textDecoration: 'underline',
};

const dividerStyle = {
  borderTop: '1px solid #E5E7EB',
  margin: '40px 0 24px 0',
};

const privacyTextStyle = {
  fontSize: '13px',
  lineHeight: '20px',
  color: '#9CA3AF',
  textAlign: 'center' as const,
  margin: '0 0 32px 0',
};