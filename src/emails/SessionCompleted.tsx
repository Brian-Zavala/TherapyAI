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
  Img,
} from '@react-email/components';

interface SessionCompletedProps {
  username: string;
  sessionDate: Date | string;
  duration: number;
  sessionNotes?: string;
  nextSessionDate?: Date | string;
  baseUrl: string;
}

export default function SessionCompletedEmail({
  username,
  sessionDate,
  duration,
  sessionNotes,
  nextSessionDate,
  baseUrl,
}: SessionCompletedProps) {
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

  return (
    <Html>
      <Head />
      <Preview>Your therapy session has been completed</Preview>
      <Body style={bodyStyle}>
        {/* Gradient Header */}
        <div style={gradientHeaderStyle}>
          <Container style={headerContainerStyle}>
            <Text style={logoStyle}>Therapy Platform</Text>
          </Container>
        </div>

        <Container style={containerStyle}>
          {/* Main Content Card */}
          <Section style={cardStyle}>
            {/* Success Icon */}
            <div style={iconContainerStyle}>
              <div style={checkmarkStyle}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            
            <Text style={headerStyle}>
              Session Completed
            </Text>
            
            <Text style={greetingStyle}>Well done, {username}</Text>
            <Text style={subtitleStyle}>
              You've taken another important step in your wellness journey.
            </Text>
          </Section>
          
          {/* Session Metrics */}
          <Section style={metricsContainerStyle}>
            <Row>
              <Column style={metricColumnStyle}>
                <div style={metricCardStyle}>
                  <Text style={metricValueStyle}>{duration}</Text>
                  <Text style={metricLabelStyle}>minutes</Text>
                </div>
              </Column>
              <Column style={metricColumnStyle}>
                <div style={metricCardStyle}>
                  <Text style={metricValueStyle}>{formattedTime}</Text>
                  <Text style={metricLabelStyle}>completed at</Text>
                </div>
              </Column>
            </Row>
          </Section>
          
          {/* Session Notes */}
          {sessionNotes && (
            <Section style={notesContainerStyle}>
              <div style={notesHeaderContainerStyle}>
                <Text style={notesHeaderStyle}>Key Takeaways</Text>
              </div>
              <div style={notesContentStyle}>
                <Text style={notesTextStyle}>{sessionNotes}</Text>
              </div>
            </Section>
          )}
          
          {/* Next Session or Schedule CTA */}
          {nextSessionDate ? (
            <Section style={nextSessionContainerStyle}>
              <Text style={nextSessionHeaderStyle}>Your journey continues</Text>
              <div style={nextSessionCardStyle}>
                <Text style={nextSessionDateStyle}>
                  {new Date(nextSessionDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={nextSessionTimeStyle}>
                  {new Date(nextSessionDate).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </Text>
              </div>
            </Section>
          ) : (
            <Section style={ctaContainerStyle}>
              <Text style={ctaHeaderStyle}>
                Ready to continue your growth?
              </Text>
              <Button href={`${baseUrl}/schedule`} style={primaryButtonStyle}>
                Schedule Next Session
              </Button>
            </Section>
          )}
          
          {/* Progress Dashboard Link */}
          <Section style={dashboardLinkContainerStyle}>
            <Button href={`${baseUrl}/dashboard`} style={secondaryButtonStyle}>
              View Your Progress Dashboard
            </Button>
          </Section>
          
          {/* Footer */}
          <Hr style={dividerStyle} />
          
          <Text style={footerStyle}>
            Every session brings new insights and growth.
            <br />
            Thank you for investing in your wellbeing.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Modern 2025 Styles - Therapeutic & Minimalist
const bodyStyle = {
  backgroundColor: '#FAFBFC',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: '0',
  padding: '0',
};

const gradientHeaderStyle = {
  background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
  padding: '32px 0',
};

const headerContainerStyle = {
  maxWidth: '600px',
  margin: '0 auto',
};

const logoStyle = {
  color: '#FFFFFF',
  fontSize: '20px',
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

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '40px 32px',
  margin: '-20px 0 24px 0',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
  textAlign: 'center' as const,
};

const iconContainerStyle = {
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const checkmarkStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '64px',
  height: '64px',
  backgroundColor: '#F0FDF4',
  borderRadius: '50%',
  border: '2px solid #BBF7D0',
};

const headerStyle = {
  fontSize: '28px',
  lineHeight: '32px',
  fontWeight: '700',
  color: '#1F2937',
  margin: '0 0 16px 0',
  letterSpacing: '-0.75px',
};

const greetingStyle = {
  fontSize: '18px',
  lineHeight: '24px',
  fontWeight: '600',
  color: '#374151',
  margin: '0 0 8px 0',
};

const subtitleStyle = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#6B7280',
  margin: '0',
};

const metricsContainerStyle = {
  margin: '24px 0',
};

const metricColumnStyle = {
  width: '50%',
  padding: '0 8px',
};

const metricCardStyle = {
  backgroundColor: '#F9FAFB',
  borderRadius: '12px',
  padding: '24px 16px',
  textAlign: 'center' as const,
  border: '1px solid #E5E7EB',
};

const metricValueStyle = {
  fontSize: '32px',
  lineHeight: '36px',
  fontWeight: '700',
  color: '#667EEA',
  margin: '0 0 4px 0',
};

const metricLabelStyle = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#6B7280',
  margin: '0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const notesContainerStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  overflow: 'hidden',
  margin: '24px 0',
  border: '1px solid #E5E7EB',
};

const notesHeaderContainerStyle = {
  backgroundColor: '#F3F4F6',
  padding: '16px 24px',
  borderBottom: '1px solid #E5E7EB',
};

const notesHeaderStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#374151',
  margin: '0',
};

const notesContentStyle = {
  padding: '24px',
};

const notesTextStyle = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#4B5563',
  margin: '0',
};

const nextSessionContainerStyle = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const nextSessionHeaderStyle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#374151',
  margin: '0 0 16px 0',
};

const nextSessionCardStyle = {
  backgroundColor: '#EDE9FE',
  borderRadius: '12px',
  padding: '24px',
  border: '1px solid #DDD6FE',
};

const nextSessionDateStyle = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#5B21B6',
  margin: '0 0 4px 0',
};

const nextSessionTimeStyle = {
  fontSize: '16px',
  color: '#6D28D9',
  margin: '0',
};

const ctaContainerStyle = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const ctaHeaderStyle = {
  fontSize: '18px',
  lineHeight: '24px',
  color: '#374151',
  margin: '0 0 20px 0',
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
  transition: 'all 0.2s',
};

const dashboardLinkContainerStyle = {
  textAlign: 'center' as const,
  margin: '16px 0 32px 0',
};

const secondaryButtonStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  color: '#667EEA',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  border: '2px solid #E0E7FF',
  transition: 'all 0.2s',
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