import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useVapiSession } from '../../../useVapiSession'
import { useSessionManagement } from '../../../useSessionManagement'
import { useTranscriptHandler } from '../../../useTranscriptHandler'
import { useAuth } from '../../../useAuth'

// Mock dependencies
jest.mock('../../../useAuth')
jest.mock('@/lib/vapi', () => ({
  createVapiInstance: jest.fn()
}))
jest.mock('@/lib/transcript-service-optimized', () => ({
  storeTranscriptBatch: jest.fn(),
  appendToTranscript: jest.fn()
}))

// Mock WebSocket for connection testing
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  
  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  
  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 100)
  }
  
  close() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }
  
  send(_data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
  }
}

global.WebSocket = MockWebSocket as unknown as typeof WebSocket

// Error test component
function ErrorHandlingTestComponent() {
  const vapi = useVapiSession({
    onError: (error) => console.error('VAPI Error:', error)
  })
  const session = useSessionManagement({
    vapi: vapi.vapi,
    userId: 'test-user-123',
    sessionId: vapi.vapi?._sessionId
  })
  const transcript = useTranscriptHandler({
    sessionId: session.currentSession?.id || '',
    isEnabled: !!session.currentSession,
    maxRetries: 3
  })

  const [customError, setCustomError] = React.useState<string | null>(null)

  return (
    <div>
      {/* Error States */}
      <div data-testid="vapi-error">{vapi.error || 'No error'}</div>
      <div data-testid="session-error">{session.error || 'No error'}</div>
      <div data-testid="custom-error">{customError || 'No error'}</div>
      
      {/* Connection State */}
      <div data-testid="connection-state">
        {vapi.isActive ? 'Connected' : 'Disconnected'}
      </div>
      
      {/* Audio Level (for audio context errors) */}
      <div data-testid="audio-level">{vapi.audioLevel}</div>
      
      {/* Test Actions */}
      <button
        data-testid="start-without-auth"
        onClick={async () => {
          try {
            await session.createSession({
              therapyType: 'couple',
              duration: 30,
              assistantId: 'test-assistant',
              startTime: new Date().toISOString()
            })
          } catch (error) {
            setCustomError(error instanceof Error ? error.message : 'Unknown error')
          }
        }}
      >
        Start Without Auth
      </button>
      
      <button
        data-testid="simulate-network-error"
        onClick={() => {
          if (vapi.vapi && 'ws' in vapi.vapi) {
            // @ts-expect-error - accessing internal ws property
            (vapi.vapi as { ws?: { close: () => void } }).ws?.close()
          }
        }}
      >
        Simulate Network Error
      </button>
      
      <button
        data-testid="corrupt-session-data"
        onClick={() => {
          localStorage.setItem('activeTherapySession', 'invalid-json{')
          session.checkForActiveSession()
        }}
      >
        Corrupt Session Data
      </button>
      
      <button
        data-testid="exceed-transcript-limit"
        onClick={() => {
          // Simulate rapid transcript updates
          for (let i = 0; i < 100; i++) {
            transcript.addTranscriptEntry(
              'user',
              `Message ${i}: ${new Array(1000).fill('x').join('')}`
            )
          }
        }}
      >
        Exceed Transcript Limit
      </button>
      
      {/* Transcript Storage Status */}
      <div data-testid="transcript-buffer-size">
        {transcript.transcriptBuffer.length}
      </div>
      <div data-testid="transcript-storage-status">
        {transcript.isStoring ? 'Storing' : 'Idle'}
      </div>
    </div>
  )
}

describe('Error Handling and Edge Cases Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    
    // Mock auth
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: 'test-user-123', name: 'Test User' }
    })
    
    // Mock fetch
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('handles unauthorized session creation', async () => {
    // Mock auth to return no user
    ;(useAuth as jest.Mock).mockReturnValue({ user: null })
    
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' })
    })

    render(<ErrorHandlingTestComponent />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-without-auth'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('custom-error')).toHaveTextContent('Unauthorized')
    })
  })

  it('handles WebSocket connection failures', async () => {
    // Mock WebSocket to fail
    const OriginalWebSocket = global.WebSocket
    global.WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url)
        setTimeout(() => {
          this.onerror?.(new Event('error'))
          this.onclose?.(new CloseEvent('close', { code: 1006, reason: 'Connection failed' }))
        }, 50)
      }
    } as unknown as typeof WebSocket

    jest.mocked(require('@/lib/vapi').createVapiInstance).mockReturnValue({
      start: jest.fn().mockRejectedValue(new Error('WebSocket connection failed')),
      stop: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn()
    })

    render(<ErrorHandlingTestComponent />)

    // Should handle connection error
    await waitFor(() => {
      expect(screen.getByTestId('connection-state')).toHaveTextContent('Disconnected')
    })

    global.WebSocket = OriginalWebSocket
  })

  it('handles corrupt session data gracefully', async () => {
    jest.mocked(require('@/lib/vapi').createVapiInstance).mockReturnValue({
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn()
    })

    render(<ErrorHandlingTestComponent />)

    // Corrupt the session data
    await act(async () => {
      fireEvent.click(screen.getByTestId('corrupt-session-data'))
    })

    // Should handle gracefully without crashing
    expect(screen.getByTestId('session-error')).toHaveTextContent('No error')
    
    // Should clear corrupt data
    expect(localStorage.getItem('activeTherapySession')).toBeNull()
  })

  it('handles transcript storage failures', async () => {
    jest.mocked(require('@/lib/transcript-service-optimized').storeTranscriptBatch).mockRejectedValue(new Error('Storage quota exceeded'))

    jest.mocked(require('@/lib/vapi').createVapiInstance).mockReturnValue({
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn()
    })

    render(<ErrorHandlingTestComponent />)

    // Trigger transcript storage
    await act(async () => {
      fireEvent.click(screen.getByTestId('exceed-transcript-limit'))
    })

    // Should buffer transcripts
    await waitFor(() => {
      expect(parseInt(screen.getByTestId('transcript-buffer-size').textContent || '0')).toBeGreaterThan(0)
    })

    // Should retry storage
    expect(require('@/lib/transcript-service-optimized').storeTranscriptBatch).toHaveBeenCalled()
  })

  it('handles audio context initialization failures', async () => {
    // Mock AudioContext to fail
    const OriginalAudioContext = window.AudioContext
    window.AudioContext = class {
      constructor() {
        throw new Error('Audio context not allowed')
      }
    } as unknown as typeof AudioContext

    jest.mocked(require('@/lib/vapi').createVapiInstance).mockReturnValue({
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
      start: jest.fn()
    })

    render(<ErrorHandlingTestComponent />)

    // Should handle audio context error gracefully
    expect(screen.getByTestId('audio-level')).toHaveTextContent('0')
    
    // Restore AudioContext
    window.AudioContext = OriginalAudioContext
  })

  it('handles API rate limiting', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ 
          error: 'Rate limit exceeded',
          retryAfter: 60
        })
      })

    jest.mocked(require('@/lib/vapi').createVapiInstance).mockReturnValue({
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn()
    })

    render(<ErrorHandlingTestComponent />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-without-auth'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('custom-error')).toHaveTextContent('Rate limit exceeded')
    })
  })

  it('handles memory cleanup on unmount', async () => {
    const mockVapi = {
      stop: jest.fn(),
      removeAllListeners: jest.fn(),
      on: jest.fn(),
      off: jest.fn()
    }
    jest.mocked(require('@/lib/vapi').createVapiInstance).mockReturnValue(mockVapi)

    const { unmount } = render(<ErrorHandlingTestComponent />)

    // Unmount component
    unmount()

    // Should cleanup
    expect(mockVapi.stop).toHaveBeenCalled()
    expect(mockVapi.removeAllListeners).toHaveBeenCalled()
  })

  it('handles concurrent API calls correctly', async () => {
    let callCount = 0
    ;(global.fetch as jest.Mock).mockImplementation(() => {
      callCount++
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({ 
              id: `session-${callCount}`,
              status: 'active'
            })
          })
        }, 100)
      })
    })

    jest.mocked(require('@/lib/vapi').createVapiInstance).mockReturnValue({
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn()
    })

    render(<ErrorHandlingTestComponent />)

    // Trigger multiple concurrent actions
    await act(async () => {
      // Click multiple times quickly
      fireEvent.click(screen.getByTestId('start-without-auth'))
      fireEvent.click(screen.getByTestId('start-without-auth'))
      fireEvent.click(screen.getByTestId('start-without-auth'))
    })

    // Should handle concurrent calls without errors
    await waitFor(() => {
      expect(callCount).toBeGreaterThanOrEqual(1)
    })
  })

  it('handles browser storage quota exceeded', async () => {
    // Mock localStorage to throw quota error
    const originalSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = jest.fn().mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })

    jest.mocked(require('@/lib/vapi').createVapiInstance).mockReturnValue({
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn()
    })

    render(<ErrorHandlingTestComponent />)

    // Try to exceed storage
    await act(async () => {
      fireEvent.click(screen.getByTestId('exceed-transcript-limit'))
    })

    // Should handle storage error gracefully
    expect(screen.getByTestId('transcript-storage-status')).toBeInTheDocument()

    // Restore original
    Storage.prototype.setItem = originalSetItem
  })
})