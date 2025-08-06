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
  communicationStyle?: 'gentle' | 'direct' | 'balanced';
  language?: string;
  currentConcerns?: any;
  sessionTheme?: string;
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
  communicationStyle = 'balanced',
  language = 'en',
  currentConcerns,
  sessionTheme,
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
        {/* Modern Minimal Header */}
        <div style={isOneHourReminder ? urgentHeaderStyle : headerStyle}>
          <Container style={headerContainerStyle}>
            <div style={logoContainerStyle}>
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" stroke="white" strokeWidth="2" opacity="0.9"/>
                <path d="M20 10C20 10 26 16 26 22C26 25.3137 23.3137 28 20 28C16.6863 28 14 25.3137 14 22C14 16 20 10 20 10Z" fill="white" opacity="0.9"/>
                <circle cx="20" cy="22" r="3" fill={isOneHourReminder ? "#DC2626" : "#4F46E5"} opacity="0.8"/>
              </svg>
              <Text style={logoTextStyle}>Therapy Space</Text>
            </div>
          </Container>
        </div>

        <Container style={containerStyle}>
          {/* Modern Alert Card for 1-hour reminder */}
          {isOneHourReminder && (
            <div style={alertCardStyle}>
              <div style={alertIconContainerStyle}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="#FEF3C7"/>
                  <path d="M12 6V12L16 14" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={alertContentStyle}>
                <Text style={alertTitleStyle}>Session Starting Soon</Text>
                <Text style={alertSubtitleStyle}>Your therapy session begins in 60 minutes</Text>
              </div>
            </div>
          )}
          
          {/* Main Card */}
          <Section style={mainCardStyle}>
            <Text style={modernGreetingStyle}>
              {getPersonalizedGreeting(username, communicationStyle)}
            </Text>
            
            <Text style={modernReminderTextStyle}>
              {getPersonalizedMessage(isOneHourReminder, communicationStyle, sessionTheme)}
            </Text>
            
            {/* Modern Session Details Card */}
            <div style={modernSessionCardStyle}>
              <div style={sessionCardHeaderStyle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="#6366F1" strokeWidth="2"/>
                  <path d="M16 2V4" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M8 2V4" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M3 9H21" stroke="#6366F1" strokeWidth="2"/>
                  <circle cx="12" cy="15" r="2" fill="#6366F1"/>
                </svg>
                <Text style={sessionCardTitleStyle}>Session Details</Text>
              </div>
              <div style={sessionInfoGridStyle}>
                <div style={sessionInfoItemStyle}>
                  <Text style={sessionLabelStyle}>Date</Text>
                  <Text style={sessionValueStyle}>{formattedDate}</Text>
                </div>
                <div style={sessionInfoItemStyle}>
                  <Text style={sessionLabelStyle}>Time</Text>
                  <Text style={sessionValueStyle}>{formattedTime}</Text>
                </div>
                <div style={sessionInfoItemStyle}>
                  <Text style={sessionLabelStyle}>Duration</Text>
                  <Text style={sessionValueStyle}>{duration} minutes</Text>
                </div>
                {sessionTheme && (
                  <div style={sessionInfoItemStyle}>
                    <Text style={sessionLabelStyle}>Focus</Text>
                    <Text style={sessionValueStyle}>{sessionTheme}</Text>
                  </div>
                )}
              </div>
            </div>
            
            {/* Modern Notes Section */}
            {notes && (
              <div style={modernNotesCardStyle}>
                <div style={notesHeaderStyle}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L14.09 8.26L21 9.27L16.45 13.97L17.82 21L12 17.77L6.18 21L7.55 13.97L3 9.27L9.91 8.26L12 2Z" fill="#8B5CF6" opacity="0.2"/>
                    <path d="M12 2L14.09 8.26L21 9.27L16.45 13.97L17.82 21L12 17.77L6.18 21L7.55 13.97L3 9.27L9.91 8.26L12 2Z" stroke="#8B5CF6" strokeWidth="2" strokeLinejoin="round"/>
                  </svg>
                  <Text style={notesHeaderTextStyle}>Your Focus Areas</Text>
                </div>
                <Text style={modernNotesTextStyle}>{notes}</Text>
              </div>
            )}
            
            {/* Modern CTA Section */}
            {isOneHourReminder && trackingToken && sessionId && (
              <div style={modernCTAContainerStyle}>
                <div style={ctaIconStyle}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#10B981" opacity="0.1"/>
                    <path d="M10 8L14 12L10 16" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <Text style={ctaTitleStyle}>Your session is ready</Text>
                <Text style={ctaSubtitleStyle}>Join now for your {duration}-minute journey of growth</Text>
                <Button 
                  href={`${baseUrl}/api/sessions/start-from-notification?token=${trackingToken}&action=instant`} 
                  style={modernInstantStartButtonStyle}
                >
                  Begin Session
                </Button>
              </div>
            )}
            
            <div style={modernButtonContainerStyle}>
              <Button 
                href={trackingToken && sessionId 
                  ? `${baseUrl}/dashboard?token=${trackingToken}&sessionId=${sessionId}` 
                  : `${baseUrl}/dashboard`
                } 
                style={modernDashboardButtonStyle}
              >
                <span style={buttonIconStyle}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                  </svg>
                </span>
                Access Dashboard
              </Button>
            </div>
          </Section>
          
          {/* Modern Footer */}
          <Section style={modernFooterStyle}>
            <div style={footerLinksContainerStyle}>
              <Link 
                href={trackingToken && sessionId 
                  ? `${baseUrl}/schedule?reschedule=${sessionId}&token=${trackingToken}` 
                  : `${baseUrl}/schedule`
                } 
                style={modernFooterLinkStyle}
              >
                Reschedule
              </Link>
              <Text style={footerSeparatorStyle}>•</Text>
              <Link href={`${baseUrl}/support`} style={modernFooterLinkStyle}>
                Get Support
              </Link>
              <Text style={footerSeparatorStyle}>•</Text>
              <Link href={`${baseUrl}/resources`} style={modernFooterLinkStyle}>
                Resources
              </Link>
            </div>
          </Section>
          
          <div style={footerBrandingStyle}>
            <Text style={brandingTextStyle}>
              Creating safe spaces for growth and healing
            </Text>
            <Text style={confidentialityTextStyle}>
              All sessions are confidential and HIPAA-compliant
            </Text>
          </div>
        </Container>
      </Body>
    </Html>
  );
}

// Helper Functions for Personalization
const getPersonalizedGreeting = (username: string, style: string) => {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  
  switch (style) {
    case 'gentle':
      return `Dear ${username}`;
    case 'direct':
      return `Hi ${username}`;
    default:
      return `Good ${timeOfDay}, ${username}`;
  }
};

const getPersonalizedMessage = (isOneHour: boolean, style: string, theme?: string) => {
  if (isOneHour) {
    switch (style) {
      case 'gentle':
        return 'Your healing journey continues soon. Take a few moments to center yourself and prepare for meaningful connection.';
      case 'direct':
        return 'Session starting in 1 hour. Time to wrap up and prepare.';
      default:
        return 'Your therapy session begins shortly. This is your time for growth and self-discovery.';
    }
  } else {
    const themeMessage = theme ? ` Today's focus: ${theme}.` : '';
    switch (style) {
      case 'gentle':
        return `A gentle reminder of your upcoming session.${themeMessage} We're here to support your journey.`;
      case 'direct':
        return `Therapy session scheduled.${themeMessage} See details below.`;
      default:
        return `Your wellness session is approaching.${themeMessage} We look forward to supporting you.`;
    }
  }
};

// Modern 2025 Styles - Minimal, Therapeutic, Professional
const bodyStyle = {
  backgroundColor: '#F9FAFB',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: '0',
  padding: '0',
  WebkitTextSizeAdjust: '100%',
  msTextSizeAdjust: '100%',
};

const headerStyle = {
  backgroundColor: '#FFFFFF',
  borderBottom: '1px solid #E5E7EB',
  padding: '24px 0',
};

const urgentHeaderStyle = {
  backgroundColor: '#FEF2F2',
  borderBottom: '1px solid #FCA5A5',
  padding: '24px 0',
};

const headerContainerStyle = {
  maxWidth: '600px',
  margin: '0 auto',
};

const logoContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
};

const logoTextStyle = {
  color: '#1F2937',
  fontSize: '20px',
  fontWeight: '600',
  letterSpacing: '-0.025em',
  margin: '0',
};

const containerStyle = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '0 20px',
};

const alertCardStyle = {
  background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
  borderRadius: '16px',
  padding: '20px 24px',
  margin: '24px 0',
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  boxShadow: '0 2px 4px rgba(251, 191, 36, 0.1)',
};

const alertIconContainerStyle = {
  flexShrink: 0,
};

const alertContentStyle = {
  flex: 1,
};

const alertTitleStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#92400E',
  margin: '0 0 4px 0',
};

const alertSubtitleStyle = {
  fontSize: '14px',
  color: '#B45309',
  margin: '0',
};

const mainCardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '20px',
  padding: '32px',
  margin: '0',
  border: '1px solid #E5E7EB',
};

const modernGreetingStyle = {
  fontSize: '24px',
  fontWeight: '500',
  color: '#111827',
  margin: '0 0 12px 0',
  letterSpacing: '-0.025em',
};

const modernReminderTextStyle = {
  fontSize: '16px',
  lineHeight: '28px',
  color: '#6B7280',
  margin: '0 0 32px 0',
};

const modernSessionCardStyle = {
  background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)',
  borderRadius: '16px',
  padding: '24px',
  margin: '0 0 24px 0',
  border: '1px solid #E5E7EB',
};

const sessionCardHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '20px',
};

const sessionCardTitleStyle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#6366F1',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0',
};

const sessionInfoGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '16px',
};

const sessionInfoItemStyle = {
  borderLeft: '3px solid #E0E7FF',
  paddingLeft: '12px',
};

const sessionLabelStyle = {
  fontSize: '12px',
  fontWeight: '500',
  color: '#9CA3AF',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0 0 4px 0',
};

const sessionValueStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1F2937',
  margin: '0',
};

const modernNotesCardStyle = {
  background: 'linear-gradient(135deg, #FAFAF9 0%, #F5F5F4 100%)',
  borderRadius: '12px',
  padding: '20px',
  margin: '0 0 32px 0',
  borderLeft: '4px solid #8B5CF6',
};

const notesHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '12px',
};

const notesHeaderTextStyle = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#7C3AED',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0',
};

const modernNotesTextStyle = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#4B5563',
  margin: '0',
};

const modernCTAContainerStyle = {
  textAlign: 'center' as const,
  margin: '40px 0',
  padding: '32px',
  background: 'linear-gradient(135deg, #F0FDF4 0%, #DBEAFE 100%)',
  borderRadius: '20px',
  position: 'relative' as const,
  overflow: 'hidden',
};

const ctaIconStyle = {
  marginBottom: '16px',
};

const ctaTitleStyle = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#065F46',
  margin: '0 0 8px 0',
  letterSpacing: '-0.025em',
};

const ctaSubtitleStyle = {
  fontSize: '15px',
  color: '#047857',
  margin: '0 0 24px 0',
};

const modernInstantStartButtonStyle = {
  backgroundColor: '#10B981',
  borderRadius: '12px',
  color: '#FFFFFF',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  border: 'none',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  transition: 'all 0.2s',
};

const modernButtonContainerStyle = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const modernDashboardButtonStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '10px',
  color: '#4F46E5',
  fontSize: '15px',
  fontWeight: '500',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '12px 24px',
  border: '1px solid #E0E7FF',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
};

const buttonIconStyle = {
  display: 'inline-flex',
  alignItems: 'center',
};

const modernFooterStyle = {
  textAlign: 'center' as const,
  margin: '48px 0 24px 0',
};

const footerLinksContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  marginBottom: '32px',
};

const modernFooterLinkStyle = {
  color: '#6B7280',
  fontSize: '14px',
  fontWeight: '500',
  textDecoration: 'none',
  padding: '4px 8px',
  borderRadius: '6px',
  transition: 'background-color 0.2s',
};

const footerSeparatorStyle = {
  color: '#D1D5DB',
  fontSize: '12px',
  margin: '0',
};

const footerBrandingStyle = {
  paddingTop: '24px',
  borderTop: '1px solid #F3F4F6',
  marginTop: '24px',
};

const brandingTextStyle = {
  fontSize: '13px',
  fontWeight: '500',
  color: '#9CA3AF',
  textAlign: 'center' as const,
  margin: '0 0 8px 0',
  fontStyle: 'italic' as const,
};

const confidentialityTextStyle = {
  fontSize: '12px',
  color: '#D1D5DB',
  textAlign: 'center' as const,
  margin: '0 0 24px 0',
};