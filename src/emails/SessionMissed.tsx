import React from 'react';

interface SessionMissedEmailProps {
  userName: string;
  sessionDate: string;
  sessionTime: string;
  therapistName: string;
  sessionType: string;
  nextAvailableSlots?: Array<{
    date: string;
    time: string;
  }>;
}

export const SessionMissedEmail: React.FC<SessionMissedEmailProps> = ({
  userName,
  sessionDate,
  sessionTime,
  therapistName,
  sessionType,
  nextAvailableSlots,
}) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Missed Session</title>
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        backgroundColor: '#f5f5f5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}>
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#f5f5f5' }}>
          <tr>
            <td align="center" style={{ padding: '20px' }}>
              <table
                width="600"
                cellPadding="0"
                cellSpacing="0"
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden',
                }}
              >
                <tr>
                  <td
                    style={{
                      backgroundColor: '#ef4444',
                      padding: '40px 20px',
                      textAlign: 'center',
                    }}
                  >
                    <h1
                      style={{
                        color: '#ffffff',
                        fontSize: '28px',
                        fontWeight: '600',
                        margin: '0',
                      }}
                    >
                      Missed Session
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td style={{ padding: '40px 20px' }}>
                    <h2
                      style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        color: '#333333',
                        marginBottom: '20px',
                      }}
                    >
                      Hi {userName},
                    </h2>

                    <p
                      style={{
                        fontSize: '16px',
                        lineHeight: '24px',
                        color: '#666666',
                        marginBottom: '30px',
                      }}
                    >
                      We noticed you missed your scheduled therapy session. We understand that life can get busy, 
                      and we&apos;re here to support you when you&apos;re ready to continue your journey.
                    </p>

                    <div
                      style={{
                        backgroundColor: '#fef2f2',
                        borderLeft: '4px solid #ef4444',
                        padding: '15px',
                        marginBottom: '30px',
                        borderRadius: '6px',
                      }}
                    >
                      <h3
                        style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#dc2626',
                          margin: '0 0 10px 0',
                        }}
                      >
                        Missed Session Details
                      </h3>
                      <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                        <tr>
                          <td style={{ padding: '5px 0' }}>
                            <strong style={{ color: '#333333' }}>Date:</strong>{' '}
                            <span style={{ color: '#666666' }}>{sessionDate}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '5px 0' }}>
                            <strong style={{ color: '#333333' }}>Time:</strong>{' '}
                            <span style={{ color: '#666666' }}>{sessionTime}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '5px 0' }}>
                            <strong style={{ color: '#333333' }}>Therapist:</strong>{' '}
                            <span style={{ color: '#666666' }}>{therapistName}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '5px 0' }}>
                            <strong style={{ color: '#333333' }}>Session Type:</strong>{' '}
                            <span style={{ color: '#666666' }}>{sessionType}</span>
                          </td>
                        </tr>
                      </table>
                    </div>

                    {nextAvailableSlots && nextAvailableSlots.length > 0 && (
                      <div style={{ marginBottom: '30px' }}>
                        <h3
                          style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#333333',
                            marginBottom: '15px',
                          }}
                        >
                          Available Reschedule Options
                        </h3>
                        <div
                          style={{
                            backgroundColor: '#f8f9fa',
                            borderRadius: '6px',
                            padding: '15px',
                          }}
                        >
                          {nextAvailableSlots.map((slot, index) => (
                            <div key={index} style={{ marginBottom: index < nextAvailableSlots.length - 1 ? '10px' : '0' }}>
                              <span style={{ color: '#666666' }}>
                                • {slot.date} at {slot.time}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div
                      style={{
                        backgroundColor: '#eff6ff',
                        borderRadius: '6px',
                        padding: '20px',
                        marginBottom: '30px',
                      }}
                    >
                      <p
                        style={{
                          fontSize: '16px',
                          color: '#1e40af',
                          margin: '0',
                          fontWeight: '500',
                        }}
                      >
                        🎯 Pro tip: Regular sessions help maintain progress
                      </p>
                      <p
                        style={{
                          fontSize: '14px',
                          color: '#3730a3',
                          margin: '10px 0 0 0',
                        }}
                      >
                        Consistency is key to achieving your mental health goals. Try to maintain a regular schedule 
                        for optimal results.
                      </p>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '40px' }}>
                      <a
                        href="https://therapy.ai/schedule"
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#6366f1',
                          color: '#ffffff',
                          textDecoration: 'none',
                          padding: '12px 30px',
                          borderRadius: '6px',
                          fontWeight: '600',
                          fontSize: '16px',
                          marginBottom: '15px',
                        }}
                      >
                        Reschedule Now
                      </a>
                      <p
                        style={{
                          fontSize: '14px',
                          color: '#666666',
                          margin: '15px 0 0 0',
                        }}
                      >
                        Or log in to your <a href="https://therapy.ai/dashboard" style={{ color: '#6366f1', textDecoration: 'none' }}>dashboard</a> to manage your sessions
                      </p>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td
                    style={{
                      backgroundColor: '#f8f9fa',
                      padding: '30px 20px',
                      textAlign: 'center',
                      borderTop: '1px solid #e5e7eb',
                    }}
                  >
                    <p
                      style={{
                        fontSize: '14px',
                        color: '#666666',
                        margin: '0 0 10px 0',
                      }}
                    >
                      Remember, taking care of your mental health is a journey, not a destination.
                    </p>
                    <p
                      style={{
                        fontSize: '12px',
                        color: '#999999',
                        margin: '0',
                      }}
                    >
                      © 2024 TherapyAI. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
};

export default SessionMissedEmail;