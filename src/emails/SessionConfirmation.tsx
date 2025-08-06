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

interface SessionConfirmationProps {
  username: string;
  sessionDate: Date;
  duration: number;
  therapyType: string;
  notes?: string;
  baseUrl: string;
  sessionId: string;
}

export default function SessionConfirmationEmail({
  username,
  sessionDate,
  duration,
  therapyType,
  notes,
  baseUrl,
  sessionId,
}: SessionConfirmationProps) {
  const formattedDate = new Date(sessionDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = new Date(sessionDate).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Calculate end time
  const endTime = new Date(sessionDate);
  endTime.setMinutes(endTime.getMinutes() + duration);
  const formattedEndTime = endTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <Html>
      <Head />
      <Preview>Your therapy session is confirmed for {formattedDate}</Preview>
      <Body style={bodyStyle}>
        {/* Gradient Header */}
        <div style={gradientHeaderStyle}>
          <Container style={headerContainerStyle}>
            <Text style={logoStyle}>Therapy Platform</Text>
          </Container>
        </div>

        <Container style={containerStyle}>
          {/* Success Banner */}
          <Section style={successBannerStyle}>
            <div style={successIconContainerStyle}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <Text style={successTextStyle}>Session Confirmed</Text>
          </Section>
          
          {/* Main Card */}
          <Section style={mainCardStyle}>
            <Text style={greetingStyle}>
              Great news, {username}!
            </Text>
            
            <Text style={confirmationTextStyle}>
              Your {therapyType.toLowerCase()} therapy session has been successfully scheduled.
              We've reserved this time just for you.
            </Text>
            
            {/* Session Details Grid */}
            <div style={detailsGridStyle}>
              <Row>
                <Column style={detailColumnStyle}>
                  <div style={detailCardStyle}>
                    <div style={iconStyle}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="#667EEA" strokeWidth="2"/>
                        <path d="M3 10H21" stroke="#667EEA" strokeWidth="2"/>
                      </svg>
                    </div>
                    <Text style={detailLabelStyle}>Date</Text>
                    <Text style={detailValueStyle}>{formattedDate}</Text>
                  </div>
                </Column>
                
                <Column style={detailColumnStyle}>
                  <div style={detailCardStyle}>
                    <div style={iconStyle}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#667EEA" strokeWidth="2"/>
                        <path d="M12 6V12L16 16" stroke="#667EEA" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <Text style={detailLabelStyle}>Time</Text>
                    <Text style={detailValueStyle}>{formattedTime} - {formattedEndTime}</Text>
                  </div>
                </Column>
              </Row>
              
              <Row style={{ marginTop: '16px' }}>
                <Column style={detailColumnStyle}>
                  <div style={detailCardStyle}>
                    <div style={iconStyle}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L12 12L20 12" stroke="#667EEA" strokeWidth="2" strokeLinecap="round"/>
                        <circle cx="12" cy="12" r="10" stroke="#667EEA" strokeWidth="2"/>
                      </svg>
                    </div>
                    <Text style={detailLabelStyle}>Duration</Text>
                    <Text style={detailValueStyle}>{duration} minutes</Text>
                  </div>
                </Column>
                
                <Column style={detailColumnStyle}>
                  <div style={detailCardStyle}>
                    <div style={iconStyle}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="#667EEA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="9" cy="7" r="4" stroke="#667EEA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="#667EEA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="#667EEA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <Text style={detailLabelStyle}>Type</Text>
                    <Text style={detailValueStyle}>{therapyType}</Text>
                  </div>
                </Column>
              </Row>
            </div>
            
            {/* Session Notes */}
            {notes && (
              <div style={notesContainerStyle}>
                <Text style={notesHeaderStyle}>Session Focus</Text>
                <Text style={notesContentStyle}>{notes}</Text>
              </div>
            )}
            
            {/* Important Reminders */}
            <div style={remindersContainerStyle}>
              <Text style={remindersHeaderStyle}>Before Your Session</Text>
              <ul style={remindersListStyle}>
                <li style={reminderItemStyle}>Find a quiet, private space where you won't be interrupted</li>
                <li style={reminderItemStyle}>Test your internet connection and device audio/video</li>
                <li style={reminderItemStyle}>Have a glass of water nearby</li>
                <li style={reminderItemStyle}>Take a few deep breaths to center yourself</li>
              </ul>
            </div>
            
            {/* Action Buttons */}
            <div style={buttonContainerStyle}>
              <Button 
                href={`${baseUrl}/dashboard?sessionId=${sessionId}`} 
                style={primaryButtonStyle}
              >
                View in Dashboard
              </Button>
            </div>
            
            <div style={secondaryActionsStyle}>
              <Link 
                href={`${baseUrl}/schedule?reschedule=${sessionId}`} 
                style={secondaryLinkStyle}
              >
                Need to reschedule?
              </Link>
            </div>
          </Section>
          
          {/* Calendar Integration */}
          <Section style={calendarSectionStyle}>
            <Text style={calendarHeaderStyle}>Add to your calendar</Text>
            <Text style={calendarTextStyle}>
              We'll send you a reminder 24 hours and 1 hour before your session.
            </Text>
          </Section>
          
          <Hr style={dividerStyle} />
          
          <Text style={footerStyle}>
            Your journey towards wellness is important to us.
            <br />
            If you have any questions, please don't hesitate to reach out.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}// Modern 2025 Styles - Clean, Professional, Therapeutic
const bodyStyle = {
  backgroundColor: '#F9FAFB',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: '0',
  padding: '0',
};

const gradientHeaderStyle = {
  background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
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

const successBannerStyle = {
  backgroundColor: '#F0FDF4',
  borderRadius: '12px',
  padding: '16px',
  margin: '24px 0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid #BBF7D0',
};

const successIconContainerStyle = {
  marginRight: '12px',
  display: 'inline-flex',
};

const successTextStyle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#15803D',
  margin: '0',
  display: 'inline',
};

const mainCardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '40px 32px',
  margin: '0 0 24px 0',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
};

const greetingStyle = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#111827',
  margin: '0 0 8px 0',
  letterSpacing: '-0.5px',
};

const confirmationTextStyle = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#4B5563',
  margin: '0 0 32px 0',
};

const detailsGridStyle = {
  margin: '32px 0',
};

const detailColumnStyle = {
  width: '50%',
  padding: '0 8px',
};

const detailCardStyle = {
  backgroundColor: '#F9FAFB',
  borderRadius: '12px',
  padding: '20px',
  textAlign: 'center' as const,
  border: '1px solid #E5E7EB',
};

const iconStyle = {
  marginBottom: '12px',
  display: 'inline-flex',
};

const detailLabelStyle = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#6B7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px 0',
};

const detailValueStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#111827',
  margin: '0',
};

const notesContainerStyle = {
  backgroundColor: '#EDE9FE',
  borderRadius: '12px',
  padding: '24px',
  margin: '32px 0',
  border: '1px solid #DDD6FE',
};

const notesHeaderStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#5B21B6',
  margin: '0 0 8px 0',
};

const notesContentStyle = {
  fontSize: '15px',
  lineHeight: '22px',
  color: '#6D28D9',
  margin: '0',
};

const remindersContainerStyle = {
  backgroundColor: '#FEF3C7',
  borderRadius: '12px',
  padding: '24px',
  margin: '32px 0',
  border: '1px solid #FCD34D',
};

const remindersHeaderStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#92400E',
  margin: '0 0 12px 0',
};

const remindersListStyle = {
  margin: '0',
  paddingLeft: '20px',
};

const reminderItemStyle = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#92400E',
  marginBottom: '8px',
};

const buttonContainerStyle = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const primaryButtonStyle = {
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

const secondaryActionsStyle = {
  textAlign: 'center' as const,
  margin: '16px 0',
};

const secondaryLinkStyle = {
  color: '#667EEA',
  fontSize: '14px',
  fontWeight: '500',
  textDecoration: 'underline',
};

const calendarSectionStyle = {
  backgroundColor: '#F3F4F6',
  borderRadius: '12px',
  padding: '24px',
  textAlign: 'center' as const,
  margin: '24px 0',
};

const calendarHeaderStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#374151',
  margin: '0 0 8px 0',
};

const calendarTextStyle = {
  fontSize: '14px',
  color: '#6B7280',
  margin: '0',
};

const dividerStyle = {
  borderTop: '1px solid #E5E7EB',
  margin: '40px 0 24px 0',
};

const footerStyle = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#9CA3AF',
  textAlign: 'center' as const,
  margin: '0 0 32px 0',
};