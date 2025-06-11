import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useVapiSession } from '../../../useVapiSession'
import { useSessionManagement } from '../../../useSessionManagement'
import { useTranscriptHandler } from '../../../useTranscriptHandler'
import { useRealTimeMetrics } from '../../../useRealTimeMetrics'
import { useAuth } from '../../../useAuth'

// Mock dependencies
jest.mock('../../../useAuth')
jest.mock('../../../useRealTimeMetrics')
jest.mock('@/lib/vapi', () => ({
  createVapiInstance: jest.fn()
}))
jest.mock('@/lib/transcript-service-optimized')

// Mock VAPI with event emitter capabilities
class MockVapiEmitter {
  private listeners: Record<string, Array<(...args: unknown[]) => void>> = {}
  
  on(event: string, handler: (...args: unknown[]) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(handler)
  }
  
  off(event: string, handler: (...args: unknown[]) => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(h => h !== handler)
    }
  }
  
  emit(event: string, ...args: unknown[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(handler => handler(...args))
    }
  }
  
  removeAllListeners() {
    this.listeners = {}
  }
  
  start = jest.fn().mockResolvedValue(undefined)
  stop = jest.fn().mockResolvedValue(undefined)
  setMuted = jest.fn()
  isMuted = jest.fn().mockReturnValue(false)
  send = jest.fn()
  _sessionId = 'real-time-session'
}

// Real-time sync test component
function RealTimeSyncTestComponent() {
  const vapi = useVapiSession()
  const session = useSessionManagement({
    vapi: vapi.vapi,
    userId: 'test-user-123',
    sessionId: vapi.vapi?._sessionId
  })
  const transcript = useTranscriptHandler({
    sessionId: session.currentSession?.id || '',
    isEnabled: !!session.currentSession
  })
  const metrics = useRealTimeMetrics()

  // Sync state for testing
  const [syncStatus, setSyncStatus] = React.useState({
    vapiEvents: 0,
    transcriptUpdates: 0,
    metricsUpdates: 0,
    sessionUpdates: 0
  })

  // Track updates
  React.useEffect(() => {
    if (vapi.isActive) {
      setSyncStatus(prev => ({ ...prev, vapiEvents: prev.vapiEvents + 1 }))
    }
  }, [vapi.isActive])

  React.useEffect(() => {
    if (transcript.currentTranscript) {
      setSyncStatus(prev => ({ ...prev, transcriptUpdates: prev.transcriptUpdates + 1 }))
    }
  }, [transcript.currentTranscript])

  React.useEffect(() => {
    if (session.currentSession) {
      setSyncStatus(prev => ({ ...prev, sessionUpdates: prev.sessionUpdates + 1 }))
    }
  }, [session.currentSession])

  return (
    <div>
      {/* Real-time Status */}
      <div data-testid="vapi-status">
        {vapi.isActive ? 'Active' : 'Inactive'} | Level: {vapi.audioLevel}
      </div>
      <div data-testid="session-timer">
        {session.conversationTime}s active | {session.totalPausedTime}s paused
      </div>
      <div data-testid="transcript-live">
        {transcript.currentTranscript || 'No transcript'}
      </div>
      
      {/* Metrics Display */}
      <div data-testid="metrics-sentiment">
        Sentiment: {metrics.sentiment || 'neutral'}
      </div>
      <div data-testid="metrics-participation">
        User: {metrics.userParticipation}% | AI: {metrics.aiParticipation}%
      </div>
      <div data-testid="metrics-engagement">
        Engagement: {metrics.engagementScore}/10
      </div>
      
      {/* Sync Counters */}
      <div data-testid="sync-vapi">{syncStatus.vapiEvents}</div>
      <div data-testid="sync-transcript">{syncStatus.transcriptUpdates}</div>
      <div data-testid="sync-metrics">{syncStatus.metricsUpdates}</div>
      <div data-testid="sync-session">{syncStatus.sessionUpdates}</div>
      
      {/* Test Controls */}
      <button
        data-testid="start-session"
        onClick={async () => {
          const newSession = await session.createSession({
            therapyType: 'couple',
            duration: 30,
            assistantId: 'test-assistant',
            startTime: new Date().toISOString()
          })
          if (newSession) {
            await vapi.startCall({ assistantId: 'test-assistant' })
          }
        }}
        disabled={!!session.currentSession}
      >
        Start
      </button>
      
      <button
        data-testid="simulate-speech"
        onClick={() => {
          if (vapi.vapi && 'emit' in vapi.vapi) {
            // @ts-expect-error - accessing test method
            (vapi.vapi as MockVapiEmitter).emit('speech-start')
            setTimeout(() => {
              // @ts-expect-error - accessing test method
              (vapi.vapi as MockVapiEmitter).emit('speech-end')
            }, 1000)
          }
        }}
        disabled={!vapi.isActive}
      >
        Simulate Speech
      </button>
      
      <button
        data-testid="pause-toggle"
        onClick={() => {
          if (session.isPaused) {
            session.resumeSession()
          } else {
            session.pauseSession()
          }
        }}
        disabled={!session.currentSession}
      >
        {session.isPaused ? 'Resume' : 'Pause'}
      </button>
    </div>
  )
}

describe('Real-Time Synchronization Integration', () => {
  let mockVapiInstance: MockVapiEmitter
  let mockMetricsEmit: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    
    // Mock auth
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: 'test-user-123', name: 'Test User' }
    })
    
    // Create mock VAPI instance
    mockVapiInstance = new MockVapiEmitter()
    jest.mocked(require('@/lib/vapi').createVapiInstance).mockReturnValue(mockVapiInstance)
    
    // Mock real-time metrics
    mockMetricsEmit = jest.fn()
    ;(useRealTimeMetrics as jest.Mock).mockReturnValue({
      sentiment: 'positive',
      userParticipation: 45,
      aiParticipation: 55,
      engagementScore: 7,
      emit: mockMetricsEmit
    })
    
    // Mock fetch
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('synchronizes all components in real-time during active session', async () => {
    // Mock session creation
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'sync-test-session',
        userId: 'test-user-123',
        therapyType: 'couple',
        status: 'active',
        startTime: new Date().toISOString()
      })
    })

    render(<RealTimeSyncTestComponent />)

    // Start session
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-session'))
    })

    // Wait for session to be created
    await waitFor(() => {
      expect(screen.getByTestId('sync-session').textContent).toBe('1')
    })

    // Simulate VAPI connection
    act(() => {
      mockVapiInstance.emit('call-start')
    })

    await waitFor(() => {
      expect(screen.getByTestId('vapi-status')).toHaveTextContent('Active')
      expect(screen.getByTestId('sync-vapi').textContent).toBe('1')
    })

    // Simulate transcript updates
    act(() => {
      mockVapiInstance.emit('message', {
        type: 'transcript',
        role: 'assistant',
        transcript: 'Hello, how are you today?'
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('transcript-live')).toHaveTextContent('Hello, how are you today?')
      expect(screen.getByTestId('sync-transcript').textContent).toBe('1')
    })

    // Simulate multiple rapid transcript updates
    const messages = [
      'I am doing well, thank you.',
      'What brings you here today?',
      'I wanted to talk about communication.'
    ]

    for (const message of messages) {
      act(() => {
        mockVapiInstance.emit('message', {
          type: 'transcript',
          role: 'user',
          transcript: message
        })
      })
      // Small delay between messages
      act(() => {
        jest.advanceTimersByTime(100)
      })
    }

    await waitFor(() => {
      expect(screen.getByTestId('transcript-live')).toHaveTextContent('I wanted to talk about communication.')
      expect(parseInt(screen.getByTestId('sync-transcript').textContent || '0')).toBeGreaterThan(1)
    })

    // Verify metrics are being emitted
    expect(mockMetricsEmit).toHaveBeenCalledWith(
      'transcript',
      expect.objectContaining({
        content: expect.any(String),
        timestamp: expect.any(Number)
      })
    )
  })

  it('maintains timer accuracy during pause/resume cycles', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'timer-test-session',
        userId: 'test-user-123',
        therapyType: 'individual',
        status: 'active',
        startTime: new Date().toISOString()
      })
    })

    render(<RealTimeSyncTestComponent />)

    // Start session
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-session'))
    })

    // Let session run for 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000)
    })

    await waitFor(() => {
      const timer = screen.getByTestId('session-timer').textContent
      expect(timer).toMatch(/5s active/)
    })

    // Pause session
    await act(async () => {
      fireEvent.click(screen.getByTestId('pause-toggle'))
    })

    // Let it stay paused for 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000)
    })

    await waitFor(() => {
      const timer = screen.getByTestId('session-timer').textContent
      expect(timer).toMatch(/5s active.*3s paused/)
    })

    // Resume session
    await act(async () => {
      fireEvent.click(screen.getByTestId('pause-toggle'))
    })

    // Run for another 2 seconds
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    await waitFor(() => {
      const timer = screen.getByTestId('session-timer').textContent
      expect(timer).toMatch(/7s active.*3s paused/)
    })
  })

  it('synchronizes audio level changes in real-time', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'audio-test-session',
        userId: 'test-user-123',
        therapyType: 'couple',
        status: 'active',
        startTime: new Date().toISOString()
      })
    })

    render(<RealTimeSyncTestComponent />)

    // Start session
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-session'))
    })

    // Connect VAPI
    act(() => {
      mockVapiInstance.emit('call-start')
    })

    // Simulate volume-level events
    const audioLevels = [0.2, 0.5, 0.8, 0.3, 0.1]
    
    for (const level of audioLevels) {
      act(() => {
        mockVapiInstance.emit('volume-level', level)
      })
      
      await waitFor(() => {
        const status = screen.getByTestId('vapi-status').textContent
        expect(status).toContain(`Level: ${level}`)
      })
    }
  })

  it('handles speech events for real-time UI updates', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'speech-test-session',
        userId: 'test-user-123',
        therapyType: 'family',
        status: 'active',
        startTime: new Date().toISOString()
      })
    })

    render(<RealTimeSyncTestComponent />)

    // Start and connect
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-session'))
    })

    act(() => {
      mockVapiInstance.emit('call-start')
    })

    // Simulate speech detection
    await act(async () => {
      fireEvent.click(screen.getByTestId('simulate-speech'))
    })

    // Speech should trigger metrics update
    expect(mockMetricsEmit).toHaveBeenCalledWith(
      'speech',
      expect.objectContaining({
        event: 'start',
        timestamp: expect.any(Number)
      })
    )

    // Wait for speech end
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(mockMetricsEmit).toHaveBeenCalledWith(
      'speech',
      expect.objectContaining({
        event: 'end',
        timestamp: expect.any(Number)
      })
    )
  })

  it('maintains state consistency across rapid state changes', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: async () => ({
          id: 'rapid-test-session',
          userId: 'test-user-123',
          therapyType: 'couple',
          status: 'active',
          startTime: new Date().toISOString()
        })
      })
    )

    render(<RealTimeSyncTestComponent />)

    // Start session
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-session'))
    })

    // Rapid fire events
    act(() => {
      mockVapiInstance.emit('call-start')
      mockVapiInstance.emit('message', { type: 'transcript', role: 'assistant', transcript: 'A' })
      mockVapiInstance.emit('volume-level', 0.5)
      mockVapiInstance.emit('message', { type: 'transcript', role: 'user', transcript: 'B' })
      mockVapiInstance.emit('speech-start')
      mockVapiInstance.emit('volume-level', 0.8)
      mockVapiInstance.emit('message', { type: 'transcript', role: 'assistant', transcript: 'C' })
      mockVapiInstance.emit('speech-end')
    })

    // All states should update correctly
    await waitFor(() => {
      expect(screen.getByTestId('vapi-status')).toHaveTextContent('Active')
      expect(screen.getByTestId('vapi-status')).toHaveTextContent('Level: 0.8')
      expect(screen.getByTestId('transcript-live')).toHaveTextContent('C')
    })

    // Verify sync counters show multiple updates
    expect(parseInt(screen.getByTestId('sync-transcript').textContent || '0')).toBeGreaterThan(2)
  })

  it('handles WebSocket reconnection without losing state', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'reconnect-test-session',
        userId: 'test-user-123',
        therapyType: 'couple',
        status: 'active',
        startTime: new Date().toISOString()
      })
    })

    render(<RealTimeSyncTestComponent />)

    // Start session
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-session'))
    })

    // Connect and add some state
    act(() => {
      mockVapiInstance.emit('call-start')
      mockVapiInstance.emit('message', {
        type: 'transcript',
        role: 'assistant',
        transcript: 'Before disconnect'
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('transcript-live')).toHaveTextContent('Before disconnect')
    })

    // Simulate disconnect
    act(() => {
      mockVapiInstance.emit('call-end')
    })

    await waitFor(() => {
      expect(screen.getByTestId('vapi-status')).toHaveTextContent('Inactive')
    })

    // Simulate reconnect
    act(() => {
      mockVapiInstance.emit('call-start')
      mockVapiInstance.emit('message', {
        type: 'transcript',
        role: 'assistant',
        transcript: 'After reconnect'
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('vapi-status')).toHaveTextContent('Active')
      expect(screen.getByTestId('transcript-live')).toHaveTextContent('After reconnect')
    })

    // Session should maintain continuity
    expect(screen.getByTestId('session-timer')).toBeInTheDocument()
  })
})