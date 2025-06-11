import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useVapiSession } from '../../../useVapiSession'
import { useSessionManagement } from '../../../useSessionManagement'
import { useTranscriptHandler } from '../../../useTranscriptHandler'
import { useAuth } from '../../../useAuth'
import type { ExtendedVapi } from '@/types/therapy-session'
import type { SessionData } from '@/types/session'

// Mock dependencies
jest.mock('../../../useAuth')
jest.mock('@/lib/vapi', () => ({
  createVapiInstance: jest.fn()
}))
jest.mock('@/lib/transcript-service-optimized')

// Mock Vapi instance
const mockVapi = {
  start: jest.fn(),
  stop: jest.fn(),
  setMuted: jest.fn(),
  isMuted: jest.fn(),
  send: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn(),
  _sessionId: 'vapi-session-123'
} as unknown as ExtendedVapi

// Recovery test component
function SessionRecoveryTestComponent({ 
  autoRecover = true,
  onRecoveryComplete
}: { 
  autoRecover?: boolean
  onRecoveryComplete?: (session: SessionData) => void
}) {
  const vapi = useVapiSession()
  const session = useSessionManagement({
    vapi: vapi.vapi,
    userId: 'test-user-123',
    sessionId: vapi.vapi?._sessionId,
    autoCheckActiveSession: autoRecover,
    onSessionRecovered: onRecoveryComplete
  })
  const transcript = useTranscriptHandler({
    sessionId: session.currentSession?.id || '',
    isEnabled: !!session.currentSession
  })

  const handleRecoverSession = async () => {
    const recovered = await session.recoverSession()
    if (recovered && vapi.vapi) {
      await vapi.startCall({
        assistantId: recovered.assistantId || 'default-assistant'
      })
    }
  }

  return (
    <div>
      {/* Recovery Status */}
      <div data-testid="recovery-status">
        {session.isCheckingSession ? 'Checking...' : 
         session.currentSession ? 'Recovered' : 'No Session'}
      </div>
      
      {/* Session Info */}
      {session.currentSession && (
        <>
          <div data-testid="session-id">{session.currentSession.id}</div>
          <div data-testid="session-duration">
            {session.conversationTime} seconds
          </div>
          <div data-testid="pause-count">
            {session.currentSession.pauseCount || 0} pauses
          </div>
          <div data-testid="pause-time">
            {session.totalPausedTime} seconds paused
          </div>
        </>
      )}
      
      {/* Manual Recovery Button */}
      {!autoRecover && !session.currentSession && (
        <button
          data-testid="recover-button"
          onClick={handleRecoverSession}
        >
          Recover Session
        </button>
      )}
      
      {/* Transcript Recovery */}
      <div data-testid="transcript-entries">
        {transcript.transcriptEntries.length} entries
      </div>
      <div data-testid="recovered-transcript">
        {transcript.transcriptEntries.map((entry, i) => (
          <div key={i}>{entry.content}</div>
        ))}
      </div>
      
      {/* Error State */}
      {session.error && (
        <div data-testid="error">{session.error}</div>
      )}
    </div>
  )
}

describe('Session Recovery Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock auth
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: 'test-user-123', name: 'Test User' }
    })
    
    // Mock createVapiInstance
    jest.mocked(require('@/lib/vapi').createVapiInstance).mockReturnValue(mockVapi)
    
    // Mock fetch
    global.fetch = jest.fn()
    
    // Clear localStorage
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('automatically recovers active session on mount', async () => {
    // Setup: Store active session data
    const activeSession: SessionData = {
      id: 'recovered-session-123',
      userId: 'test-user-123',
      therapyType: 'family',
      status: 'active',
      startTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      assistantId: 'family-assistant',
      pauseCount: 2,
      totalPausedTime: 120
    }
    
    localStorage.setItem('activeTherapySession', JSON.stringify(activeSession))
    
    // Store some transcript entries
    const transcriptEntries = [
      { timestamp: Date.now() - 240000, speaker: 'assistant', content: 'Welcome back!' },
      { timestamp: Date.now() - 180000, speaker: 'user', content: 'Thank you' },
      { timestamp: Date.now() - 120000, speaker: 'assistant', content: 'How are you feeling?' }
    ]
    sessionStorage.setItem(
      `transcript_${activeSession.id}`,
      JSON.stringify(transcriptEntries)
    )
    
    // Mock API response
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => activeSession
    })

    const onRecoveryComplete = jest.fn()
    
    render(
      <SessionRecoveryTestComponent 
        autoRecover={true}
        onRecoveryComplete={onRecoveryComplete}
      />
    )

    // Should show checking status initially
    expect(screen.getByTestId('recovery-status')).toHaveTextContent('Checking...')

    // Wait for recovery to complete
    await waitFor(() => {
      expect(screen.getByTestId('recovery-status')).toHaveTextContent('Recovered')
    })

    // Verify session data
    expect(screen.getByTestId('session-id')).toHaveTextContent('recovered-session-123')
    expect(screen.getByTestId('pause-count')).toHaveTextContent('2 pauses')
    expect(screen.getByTestId('pause-time')).toHaveTextContent('120 seconds paused')
    
    // Verify transcript recovery
    expect(screen.getByTestId('transcript-entries')).toHaveTextContent('3 entries')
    const transcripts = screen.getByTestId('recovered-transcript').children
    expect(transcripts).toHaveLength(3)
    expect(transcripts[0]).toHaveTextContent('Welcome back!')
    
    // Verify callback
    expect(onRecoveryComplete).toHaveBeenCalledWith(activeSession)
  })

  it('handles manual session recovery', async () => {
    // Setup expired session
    const expiredSession: SessionData = {
      id: 'expired-session',
      userId: 'test-user-123',
      therapyType: 'couple',
      status: 'active',
      startTime: new Date(Date.now() - 90 * 60 * 1000).toISOString(), // 90 minutes ago
      assistantId: 'couple-assistant'
    }
    
    localStorage.setItem('activeTherapySession', JSON.stringify(expiredSession))
    
    // Mock API to indicate session is still valid
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => expiredSession
    })

    render(<SessionRecoveryTestComponent autoRecover={false} />)

    // Should show manual recovery button
    expect(screen.getByTestId('recovery-status')).toHaveTextContent('No Session')
    expect(screen.getByTestId('recover-button')).toBeInTheDocument()

    // Click recover
    await act(async () => {
      fireEvent.click(screen.getByTestId('recover-button'))
    })

    // Wait for recovery
    await waitFor(() => {
      expect(screen.getByTestId('recovery-status')).toHaveTextContent('Recovered')
    })

    // Verify VAPI was started
    expect(mockVapi.start).toHaveBeenCalled()
  })

  it('handles recovery failure gracefully', async () => {
    // Setup invalid session
    const invalidSession = {
      id: 'invalid-session',
      userId: 'different-user',
      status: 'active'
    }
    
    localStorage.setItem('activeTherapySession', JSON.stringify(invalidSession))
    
    // Mock API to return error
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Session not found' })
    })

    render(<SessionRecoveryTestComponent autoRecover={true} />)

    // Wait for recovery attempt
    await waitFor(() => {
      expect(screen.getByTestId('recovery-status')).toHaveTextContent('No Session')
    })

    // Should clear invalid session
    expect(localStorage.getItem('activeTherapySession')).toBeNull()
    
    // Should not show error for auto-recovery failure
    expect(screen.queryByTestId('error')).not.toBeInTheDocument()
  })

  it('recovers session with partial data', async () => {
    // Session with minimal data
    const minimalSession: SessionData = {
      id: 'minimal-session',
      userId: 'test-user-123',
      therapyType: 'individual',
      status: 'active',
      startTime: new Date().toISOString()
    }
    
    localStorage.setItem('activeTherapySession', JSON.stringify(minimalSession))
    
    // No transcript in storage
    
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...minimalSession,
        // Server adds missing data
        assistantId: 'default-assistant',
        pauseCount: 0,
        totalPausedTime: 0
      })
    })

    render(<SessionRecoveryTestComponent autoRecover={true} />)

    await waitFor(() => {
      expect(screen.getByTestId('recovery-status')).toHaveTextContent('Recovered')
    })

    // Should have default values
    expect(screen.getByTestId('pause-count')).toHaveTextContent('0 pauses')
    expect(screen.getByTestId('transcript-entries')).toHaveTextContent('0 entries')
  })

  it('maintains session timing accuracy during recovery', async () => {
    // Session started 10 minutes ago with 3 minutes paused
    const startTime = Date.now() - 10 * 60 * 1000
    const sessionWithTiming: SessionData = {
      id: 'timed-session',
      userId: 'test-user-123',
      therapyType: 'couple',
      status: 'active',
      startTime: new Date(startTime).toISOString(),
      pauseCount: 1,
      totalPausedTime: 180, // 3 minutes
      lastPauseTime: new Date(Date.now() - 60000).toISOString() // Paused 1 minute ago
    }
    
    localStorage.setItem('activeTherapySession', JSON.stringify(sessionWithTiming))
    
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => sessionWithTiming
    })

    render(<SessionRecoveryTestComponent autoRecover={true} />)

    await waitFor(() => {
      expect(screen.getByTestId('recovery-status')).toHaveTextContent('Recovered')
    })

    // Active time should be ~7 minutes (10 total - 3 paused)
    await waitFor(() => {
      const duration = parseInt(screen.getByTestId('session-duration').textContent || '0')
      expect(duration).toBeGreaterThanOrEqual(420) // 7 minutes
      expect(duration).toBeLessThanOrEqual(480) // 8 minutes (allowing for test execution time)
    })
  })

  it('handles concurrent recovery attempts', async () => {
    const session: SessionData = {
      id: 'concurrent-session',
      userId: 'test-user-123',
      therapyType: 'family',
      status: 'active',
      startTime: new Date().toISOString()
    }
    
    localStorage.setItem('activeTherapySession', JSON.stringify(session))
    
    let fetchCallCount = 0
    ;(global.fetch as jest.Mock).mockImplementation(() => {
      fetchCallCount++
      return Promise.resolve({
        ok: true,
        json: async () => session
      })
    })

    // Render multiple instances
    render(
      <>
        <SessionRecoveryTestComponent autoRecover={true} />
        <SessionRecoveryTestComponent autoRecover={true} />
      </>
    )

    await waitFor(() => {
      expect(screen.getAllByTestId('recovery-status')[0]).toHaveTextContent('Recovered')
    })

    // Should only make one API call despite multiple components
    expect(fetchCallCount).toBe(1)
  })
})