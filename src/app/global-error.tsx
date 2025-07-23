'use client'

import * as Sentry from '@sentry/nextjs'
import NextError from 'next/error'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error, {
      tags: {
        location: 'global-error',
        digest: error.digest,
      },
      contexts: {
        react: {
          componentStack: error.stack,
        },
      },
    })
  }, [error])

  return (
    <html>
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            Something went wrong!
          </h1>
          <p style={{ marginBottom: '2rem', color: '#666' }}>
            We apologize for the inconvenience. The error has been reported and we'll fix it as soon as possible.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: '10px 20px',
              fontSize: '1rem',
              borderRadius: '5px',
              border: 'none',
              backgroundColor: '#0070f3',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
              <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                Error details (development only)
              </summary>
              <pre style={{ fontSize: '0.875rem', overflow: 'auto' }}>
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </body>
    </html>
  )
}