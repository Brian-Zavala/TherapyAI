import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useVapiSession } from '../../../useVapiSession'
import { useSessionManagement } from '../../../useSessionManagement'
import { useTranscriptHandler } from '../../../useTranscriptHandler'
import { useAuth } from '../../../useAuth'
import type { ExtendedVapi } from '@/types/therapy-session'

// Mock all external dependencies
jest.mock('../../../useAuth')
jest.mock('@/lib/vapi', () => ({
  createVapiInstance: jest.fn()
}))
jest.mock('@/lib/transcript-service-optimized')

// Mock Vapi class
const mockVapi = {
  start: jest.fn(),
  stop: jest.fn(),
  setMuted: jest.fn(),
  isMuted: jest.fn(),
  send: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn(),
  _sessionId: 'test-session-123'
} as unknown as ExtendedVapi

// Test component that integrates all hooks
function TherapySessionTestComponent({ 
  onSessionComplete 
}: { 
  onSessionComplete?: (sessionId: string) => void 
}) {
  const vapi = useVapiSession()
  const session = useSessionManagement({
    vapi: vapi.vapi,
    userId: 'test-user-123',
    sessionId: vapi.vapi?._sessionId,
    onSessionComplete
  })
  const transcript = useTranscriptHandler({
    sessionId: session.currentSession?.id || '',
    isEnabled: !!session.currentSession
  })

  return (
    <div>
      {/* Session Status */}
      <div data-testid="session-status">
        {session.currentSession ? 'Active' : 'Inactive'}
      </div>
      
      {/* VAPI Status */}
      <div data-testid="vapi-status">
        {vapi.isActive ? 'Connected' : 'Disconnected'}
      </div>
      
      {/* Loading State */}
      {vapi.isLoading && <div data-testid="loading">Loading...</div>}
      
      {/* Error Display */}
      {vapi.error && <div data-testid="error">{vapi.error}</div>}
      
      {/* Start Button */}
      {!session.currentSession && (
        <button
          data-testid="start-button"
          onClick={async () => {
            const newSession = await session.createSession({
              therapyType: 'couple',
              duration: 30,
              assistantId: 'test-assistant',
              startTime: new Date().toISOString()
            })
            if (newSession) {
              await vapi.startCall({
                assistantId: 'test-assistant',
                assistantOverrides: {
                  firstMessage: 'Hello, how can I help you today?'
                }
              })
            }
          }}
        >
          Start Therapy
        </button>
      )}
      
      {/* End Button */}
      {session.currentSession && (
        <button
          data-testid="end-button"
          onClick={async () => {
            await vapi.endCall()
            await session.endSession()
          }}
        >
          End Session
        </button>
      )}
      
      {/* Pause/Resume Button */}
      {session.currentSession && (
        <button
          data-testid="pause-button"
          onClick={() => {
            if (session.isPaused) {
              session.resumeSession()
            } else {
              session.pauseSession()
            }
          }}
        >
          {session.isPaused ? 'Resume' : 'Pause'}
        </button>
      )}
      
      {/* Transcript Display */}
      <div data-testid="transcript">
        {transcript.currentTranscript}
      </div>
      
      {/* Transcript Entry Count */}
      <div data-testid="transcript-count">
        {transcript.transcriptEntries.length}
      </div>
    </div>
  )
}

describe('Complete Session Lifecycle Integration', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Mock auth
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: 'test-user-123', name: 'Test User' }
    })
    
    // Mock createVapiInstance
    jest.mocked(require('@/lib/vapi').createVapiInstance).mockReturnValue(mockVapi)
    
    // Mock fetch for API calls
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('completes full therapy session flow from start to finish', async () => {
    // Mock API responses
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          id: 'session-123',
          userId: 'test-user-123',
          therapyType: 'couple',
          status: 'ACTIVE',
          startTime: new Date().toISOString()
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

    const onSessionComplete = jest.fn()
    render(
      <TherapySessionTestComponent onSessionComplete={onSessionComplete} />
    )

    // Initial state
    expect(screen.getByTestId('session-status')).toHaveTextContent('Inactive')
    expect(screen.getByTestId('vapi-status')).toHaveTextContent('Disconnected')
    expect(screen.getByTestId('start-button')).toBeInTheDocument()

    // Start session
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-button'))
    })

    // Wait for session creation
    await waitFor(() => {
      expect(screen.getByTestId('session-status')).toHaveTextContent('Active')
    })

    // Verify VAPI start was called
    expect(mockVapi.start).toHaveBeenCalled()

    // Simulate VAPI connection
    await act(async () => {
      const callStartHandler = mockVapi.on.mock.calls.find(
        call => call[0] === 'call-start'
      )?.[1]
      if (callStartHandler) {
        callStartHandler()
      }
    })

    await waitFor(() => {
      expect(screen.getByTestId('vapi-status')).toHaveTextContent('Connected')
    })

    // Simulate transcript updates
    await act(async () => {
      const messageHandler = mockVapi.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1]
      if (messageHandler) {
        messageHandler({
          type: 'transcript',
          role: 'assistant',
          transcript: 'Hello, how can I help you today?'
        })
      }
    })

    await waitFor(() => {
      expect(screen.getByTestId('transcript')).toHaveTextContent('Hello, how can I help you today?')
    })

    // Test pause/resume
    await act(async () => {
      fireEvent.click(screen.getByTestId('pause-button'))
    })

    expect(screen.getByTestId('pause-button')).toHaveTextContent('Resume')

    await act(async () => {
      fireEvent.click(screen.getByTestId('pause-button'))
    })

    expect(screen.getByTestId('pause-button')).toHaveTextContent('Pause')

    // End session
    await act(async () => {
      fireEvent.click(screen.getByTestId('end-button'))
    })

    // Verify VAPI stop was called
    expect(mockVapi.stop).toHaveBeenCalled()

    // Wait for session to end
    await waitFor(() => {
      expect(screen.getByTestId('session-status')).toHaveTextContent('Inactive')
      expect(screen.getByTestId('vapi-status')).toHaveTextContent('Disconnected')
    })

    // Verify completion callback
    expect(onSessionComplete).toHaveBeenCalledWith('session-123')
  })

  it('handles session recovery on mount', async () => {
    // Mock active session in storage
    const activeSession = {
      id: 'existing-session',
      userId: 'test-user-123',
      therapyType: 'individual',
      status: 'ACTIVE',
      startTime: new Date().toISOString()
    }
    
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
      if (key === 'activeTherapySession') {
        return JSON.stringify(activeSession)
      }
      return null
    })

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => activeSession
    })

    render(<TherapySessionTestComponent />)

    // Should detect and recover the session
    await waitFor(() => {
      expect(screen.getByTestId('session-status')).toHaveTextContent('Active')
    })

    // Should not show start button for active session
    expect(screen.queryByTestId('start-button')).not.toBeInTheDocument()
    expect(screen.getByTestId('end-button')).toBeInTheDocument()
  })

  it('handles connection errors gracefully', async () => {
    // Mock VAPI connection failure
    mockVapi.start.mockRejectedValueOnce(new Error('Connection failed'))

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        id: 'session-123',
        userId: 'test-user-123',
        therapyType: 'couple',
        status: 'ACTIVE',
        startTime: new Date().toISOString()
      })
    })

    render(<TherapySessionTestComponent />)

    // Start session
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-button'))
    })

    // Should show error
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to start call: Connection failed')
    })

    // Session should still be created even if VAPI fails
    expect(screen.getByTestId('session-status')).toHaveTextContent('Active')
  })

  it('synchronizes transcript with session state', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        id: 'session-123',
        userId: 'test-user-123',
        therapyType: 'couple',
        status: 'ACTIVE',
        startTime: new Date().toISOString()
      })
    })

    render(<TherapySessionTestComponent />)

    // Start session
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-button'))
    })

    // Wait for session to be active
    await waitFor(() => {
      expect(screen.getByTestId('session-status')).toHaveTextContent('Active')
    })

    // Simulate multiple transcript messages
    const messages = [
      { type: 'transcript', role: 'assistant', transcript: 'Hello!' },
      { type: 'transcript', role: 'user', transcript: 'Hi there' },
      { type: 'transcript', role: 'assistant', transcript: 'How can I help?' }
    ]

    for (const message of messages) {
      await act(async () => {
        const messageHandler = mockVapi.on.mock.calls.find(
          call => call[0] === 'message'
        )?.[1]
        if (messageHandler) {
          messageHandler(message)
        }
      })
    }

    // Should show latest transcript
    await waitFor(() => {
      expect(screen.getByTestId('transcript')).toHaveTextContent('How can I help?')
      expect(screen.getByTestId('transcript-count')).toHaveTextContent('3')
    })
  })
})