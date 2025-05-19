import React from 'react';

interface SessionCompletedEmailProps {
  userName: string;
  sessionDate: string;
  sessionTime: string;
  therapistName: string;
  sessionDuration: number;
  sessionNotes?: string;
  nextSessionDate?: string;
  nextSessionTime?: string;
}

export const SessionCompletedEmail: React.FC<SessionCompletedEmailProps> = ({
  userName,
  sessionDate,
  sessionTime,
  therapistName,
  sessionDuration,
  sessionNotes,
  nextSessionDate,
  nextSessionTime,
}) => {
  const durationInMinutes = Math.round(sessionDuration / 60);
  
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Session Completed</title>
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
                      backgroundColor: '#6366f1',
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
                      Session Completed
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
                      Great job, {userName}!
                    </h2>

                    <p
                      style={{
                        fontSize: '16px',
                        lineHeight: '24px',
                        color: '#666666',
                        marginBottom: '30px',
                      }}
                    >
                      You&apos;ve successfully completed your therapy session. Here&apos;s a summary:
                    </p>

                    <div
                      style={{
                        backgroundColor: '#f8f9fa',
                        borderRadius: '6px',
                        padding: '20px',
                        marginBottom: '30px',
                      }}
                    >
                      <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                        <tr>
                          <td style={{ padding: '8px 0' }}>
                            <strong style={{ color: '#333333' }}>Date:</strong>{' '}
                            <span style={{ color: '#666666' }}>{sessionDate}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px 0' }}>
                            <strong style={{ color: '#333333' }}>Time:</strong>{' '}
                            <span style={{ color: '#666666' }}>{sessionTime}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px 0' }}>
                            <strong style={{ color: '#333333' }}>Therapist:</strong>{' '}
                            <span style={{ color: '#666666' }}>{therapistName}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px 0' }}>
                            <strong style={{ color: '#333333' }}>Duration:</strong>{' '}
                            <span style={{ color: '#666666' }}>{durationInMinutes} minutes</span>
                          </td>
                        </tr>
                      </table>
                    </div>

                    {sessionNotes && (
                      <div style={{ marginBottom: '30px' }}>
                        <h3
                          style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#333333',
                            marginBottom: '10px',
                          }}
                        >
                          Session Notes
                        </h3>
                        <p
                          style={{
                            fontSize: '16px',
                            lineHeight: '24px',
                            color: '#666666',
                            backgroundColor: '#f8f9fa',
                            padding: '15px',
                            borderRadius: '6px',
                          }}
                        >
                          {sessionNotes}
                        </p>
                      </div>
                    )}

                    {nextSessionDate && nextSessionTime && (
                      <div
                        style={{
                          backgroundColor: '#e6f2ff',
                          borderLeft: '4px solid #3b82f6',
                          padding: '15px',
                          marginBottom: '30px',
                          borderRadius: '6px',
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
                          Next Session Scheduled
                        </p>
                        <p
                          style={{
                            fontSize: '16px',
                            color: '#1e40af',
                            margin: '5px 0 0 0',
                          }}
                        >
                          {nextSessionDate} at {nextSessionTime}
                        </p>
                      </div>
                    )}

                    <div style={{ textAlign: 'center', marginTop: '40px' }}>
                      <a
                        href="https://therapy.ai/dashboard"
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#6366f1',
                          color: '#ffffff',
                          textDecoration: 'none',
                          padding: '12px 30px',
                          borderRadius: '6px',
                          fontWeight: '600',
                          fontSize: '16px',
                        }}
                      >
                        View Dashboard
                      </a>
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
                      Keep up the great work on your journey to better mental health!
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

export default SessionCompletedEmail;