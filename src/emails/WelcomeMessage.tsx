// emails/WelcomeMessage.tsx
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

interface WelcomeMessageProps {
  username: string;
  email: string;
  style: 'ENERGETIC' | 'NURTURING' | 'INSPIRING' | 'PLAYFUL';
  therapyGoals?: string;
  relationshipStatus?: string;
  baseUrl: string;
}

export default function WelcomeMessageEmail({
  username,
  email,
  style,
  therapyGoals,
  relationshipStatus,
  baseUrl,
}: WelcomeMessageProps) {
  
  // Style-specific content configuration
  const styleContent = {
    ENERGETIC: {
      emoji: '🚀✨',
      title: `Welcome to Your Relationship Revolution!`,
      greeting: `Hey ${username}! You've just joined something AMAZING!`,
      message: `You've taken the most powerful step toward creating stronger, more fulfilling relationships. TherapyAI is here to support you every step of the way as you embark on this incredible journey of growth and connection.`,
      cta: `Let's Get Started! 🎯`,
      closing: `Here's to your beautiful transformation ahead!`,
      bgGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      primaryColor: '#6B46C1',
      accentColor: '#8B5CF6'
    },
    NURTURING: {
      emoji: '💚🌱',
      title: `Your Safe Space for Growth Awaits`,
      greeting: `Welcome home, ${username}.`,
      message: `You're exactly where you need to be. TherapyAI is your gentle companion on this journey of healing and growth. We understand that seeking support takes courage, and we're honored to be part of your story.`,
      cta: `Take Your First Step 🌿`,
      closing: `With love and support, we're here for you.`,
      bgGradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      primaryColor: '#059669',
      accentColor: '#10B981'
    },
    INSPIRING: {
      emoji: '✨🌟',
      title: `Your Journey to Deeper Connection Begins`,
      greeting: `${username}, you've just unlocked something extraordinary!`,
      message: `Every great relationship has chapters of growth, discovery, and transformation. Today marks the beginning of yours. TherapyAI is here to guide you toward the deeper connections you're seeking.`,
      cta: `Begin Your Journey 🗝️`,
      closing: `Your story of connection starts now.`,
      bgGradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      primaryColor: '#DC2626',
      accentColor: '#EF4444'
    },
    PLAYFUL: {
      emoji: '🎉👨‍👩‍👧‍👦',
      title: `Welcome to the TherapyAI Family!`,
      greeting: `${username}, you're officially part of our amazing community!`,
      message: `Get ready for some relationship magic! We're here to help you and your loved ones flourish, grow, and create beautiful memories together. The adventure begins now!`,
      cta: `Let the Magic Begin! ✨`,
      closing: `Welcome to the family - we're so excited to have you!`,
      bgGradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      primaryColor: '#EC4899',
      accentColor: '#F472B6'
    }
  };

  const content = styleContent[style];

  return (
    <Html>
      <Head />
      <Preview>{content.title}</Preview>
      <Body style={{
        margin: '0',
        padding: '0',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        background: content.bgGradient,
        minHeight: '100vh'
      }}>
        <Container style={{
          maxWidth: '600px',
          margin: '0 auto',
          background: 'white',
          minHeight: '100vh'
        }}>
          
          {/* Header */}
          <Section style={{
            background: content.bgGradient,
            padding: '40px 20px',
            textAlign: 'center'
          }}>
            <Section style={{
              background: 'white',
              padding: '20px',
              borderRadius: '15px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <Text style={{
                margin: '0',
                color: '#2D1B69',
                fontSize: '28px',
                fontWeight: 'bold'
              }}>
                {content.emoji} TherapyAI {content.emoji}
              </Text>
              <Text style={{
                margin: '10px 0 0 0',
                color: content.primaryColor,
                fontSize: '18px',
                fontWeight: '600'
              }}>
                {content.title}
              </Text>
            </Section>
          </Section>

          {/* Main Content */}
          <Section style={{ padding: '40px 30px' }}>
            
            {/* Greeting */}
            <Section style={{ textAlign: 'center', marginBottom: '30px' }}>
              <Text style={{
                color: '#1F2937',
                fontSize: '24px',
                margin: '0 0 15px 0',
                fontWeight: '600'
              }}>
                {content.greeting}
              </Text>
            </Section>

            {/* Message */}
            <Section style={{
              background: '#F8FAFC',
              padding: '25px',
              borderRadius: '12px',
              borderLeft: `4px solid ${content.primaryColor}`,
              marginBottom: '30px'
            }}>
              <Text style={{
                color: '#374151',
                fontSize: '16px',
                lineHeight: '1.6',
                margin: '0'
              }}>
                {content.message}
              </Text>
            </Section>

            {/* Personalized Section */}
            {(therapyGoals || relationshipStatus) && (
              <Section style={{ marginBottom: '30px' }}>
                <Text style={{
                  color: '#1F2937',
                  fontSize: '16px',
                  marginBottom: '15px',
                  fontWeight: '600'
                }}>
                  Your Journey Ahead:
                </Text>
                {therapyGoals && (
                  <Text style={{
                    color: '#6B7280',
                    fontSize: '14px',
                    margin: '5px 0',
                    padding: '10px 15px',
                    background: '#EFF6FF',
                    borderRadius: '6px'
                  }}>
                    🎯 Goals: {therapyGoals}
                  </Text>
                )}
                {relationshipStatus && (
                  <Text style={{
                    color: '#6B7280',
                    fontSize: '14px',
                    margin: '5px 0',
                    padding: '10px 15px',
                    background: '#F0FDF4',
                    borderRadius: '6px'
                  }}>
                    💕 Status: {relationshipStatus}
                  </Text>
                )}
              </Section>
            )}

            {/* Features Highlight */}
            <Section style={{ marginBottom: '30px' }}>
              <Text style={{
                color: '#1F2937',
                fontSize: '18px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                What's waiting for you:
              </Text>
              <Section style={{ gap: '15px' }}>
                <Section style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '15px',
                  background: '#EFF6FF',
                  borderRadius: '8px',
                  marginBottom: '10px'
                }}>
                  <Text style={{
                    fontSize: '24px',
                    marginRight: '15px',
                    display: 'inline-block'
                  }}>🎯</Text>
                  <Text style={{
                    color: '#1E40AF',
                    fontWeight: '500',
                    margin: '0'
                  }}>Personalized therapy sessions designed just for you</Text>
                </Section>
                <Section style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '15px',
                  background: '#F0FDF4',
                  borderRadius: '8px',
                  marginBottom: '10px'
                }}>
                  <Text style={{
                    fontSize: '24px',
                    marginRight: '15px',
                    display: 'inline-block'
                  }}>💬</Text>
                  <Text style={{
                    color: '#166534',
                    fontWeight: '500',
                    margin: '0'
                  }}>AI-powered insights to improve communication</Text>
                </Section>
                <Section style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '15px',
                  background: '#FEF3F2',
                  borderRadius: '8px',
                  marginBottom: '10px'
                }}>
                  <Text style={{
                    fontSize: '24px',
                    marginRight: '15px',
                    display: 'inline-block'
                  }}>📈</Text>
                  <Text style={{
                    color: '#B91C1C',
                    fontWeight: '500',
                    margin: '0'
                  }}>Progress tracking to celebrate your growth</Text>
                </Section>
              </Section>
            </Section>

            {/* CTA Button */}
            <Section style={{ textAlign: 'center', marginBottom: '30px' }}>
              <Button
                href={`${baseUrl}/dashboard`}
                style={{
                  background: `linear-gradient(135deg, ${content.primaryColor} 0%, ${content.accentColor} 100%)`,
                  color: 'white',
                  padding: '15px 30px',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '16px',
                  boxShadow: `0 4px 15px ${content.primaryColor}4D`,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {content.cta}
              </Button>
            </Section>

            {/* Personal Touch */}
            <Section style={{
              background: 'linear-gradient(135deg, #FEF3F2 0%, #FEF2F2 100%)',
              padding: '20px',
              borderRadius: '12px',
              textAlign: 'center',
              marginBottom: '30px'
            }}>
              <Text style={{
                color: '#7C2D12',
                fontSize: '16px',
                margin: '0',
                fontStyle: 'italic'
              }}>
                "{content.closing}"
              </Text>
              <Text style={{
                color: '#92400E',
                fontSize: '14px',
                margin: '10px 0 0 0',
                fontWeight: '500'
              }}>
                — The TherapyAI Team
              </Text>
            </Section>

            {/* Support */}
            <Section style={{
              textAlign: 'center',
              padding: '20px',
              background: '#F9FAFB',
              borderRadius: '8px'
            }}>
              <Text style={{
                color: '#6B7280',
                fontSize: '14px',
                margin: '0 0 10px 0'
              }}>
                Questions? We're here to help!
              </Text>
              <Link
                href="mailto:support@therapyai.com"
                style={{
                  color: content.primaryColor,
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
              >
                support@therapyai.com
              </Link>
            </Section>

          </Section>

          {/* Footer */}
          <Section style={{
            background: '#1F2937',
            padding: '20px',
            textAlign: 'center'
          }}>
            <Text style={{
              color: '#9CA3AF',
              fontSize: '12px',
              margin: '0'
            }}>
              © 2025 TherapyAI. Building stronger relationships, one conversation at a time.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}