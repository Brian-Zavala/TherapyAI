import { renderHook, act } from '@testing-library/react'
import { useSessionManagement } from '../useSessionManagement'
import { SessionRecoveryData } from '@/types/therapy-session'

// Mock fetch
global.fetch = jest.fn()

describe('useSessionManagement', () => {
  const mockOptions = {
    userId: 'test-user-123',
    therapyType: 'couple',
    onSessionCreated: jest.fn(),
    onSessionRecovered: jest.fn(),
    onSessionCompleted: jest.fn(),
    onError: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    sessionStorage.clear()
    ;(fetch as jest.Mock).mockReset()
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useSessionManagement(mockOptions))
      
      expect(result.current.sessionId).toBeNull()
      expect(result.current.sessionStartTime).toBeNull()
      expect(result.current.sessionDuration).toBe(60)
      expect(result.current.sessionRecovered).toBe(false)
      expect(result.current.isEndingSession).toBe(false)
      expect(result.current.isSessionPaused).toBe(false)
      expect(result.current.pauseStartTime).toBeNull()
      expect(result.current.totalPausedTimeSeconds).toBe(0)
      expect(result.current.conversationTimeSeconds).toBe(0)
      expect(result.current.conversationStartTime).toBeNull()
    })
  })

  describe('createSession', () => {
    it('should create a new session successfully', async () => {
      const mockSession = { id: 'session-123' }
      
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ name: 'Test User' }) }) // Profile fetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockSession }) // Session creation
      
      const { result } = renderHook(() => useSessionManagement(mockOptions))
      
      let sessionId: string | null = null
      await act(async () => {
        sessionId = await result.current.createSession(30)
      })
      
      expect(sessionId).toBe('session-123')
      expect(result.current.sessionId).toBe('session-123')
      expect(result.current.sessionDuration).toBe(30)
      expect(result.current.sessionStartTime).toBeInstanceOf(Date)
      expect(mockOptions.onSessionCreated).toHaveBeenCalledWith('session-123')
      
      // Check storage
      expect(sessionStorage.getItem('current-session-id')).toBe('session-123')
      expect(sessionStorage.getItem('active-session-id')).toBe('session-123')
    })

    it('should prevent duplicate session creation', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ id: 'session-123' }) })
      
      const { result } = renderHook(() => useSessionManagement(mockOptions))
      
      // Start two concurrent session creations
      const promise1 = act(async () => result.current.createSession(30))
      const promise2 = act(async () => result.current.createSession(30))
      
      const [result1, result2] = await Promise.all([promise1, promise2])
      
      // One should succeed, one should return null
      expect([result1, result2].filter(r => r === null)).toHaveLength(1)
      expect(fetch).toHaveBeenCalledTimes(2) // One for profile, one for session
    })

    it('should handle session creation failure', async () => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ name: 'Test User' }) })
        .mockResolvedValueOnce({ ok: false })
      
      const { result } = renderHook(() => useSessionManagement(mockOptions))
      
      let sessionId: string | null = null
      await act(async () => {
        sessionId = await result.current.createSession(60)
      })
      
      expect(sessionId).toBeNull()
      expect(result.current.sessionId).toBeNull()
      expect(mockOptions.onError).toHaveBeenCalled()
    })
  })

  describe('checkForActiveSession', () => {
    it('should find and return active session', async () => {
      const activeSession = {
        id: 'session-123',
        status: 'active',
        startTime: new Date().toISOString(),
        duration: 60,
        conversationTimeSeconds: 300
      }
      
      ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => activeSession })
      
      const { result } = renderHook(() => useSessionManagement(mockOptions))
      
      let recoveryData: SessionRecoveryData | null = null
      await act(async () => {
        recoveryData = await result.current.checkForActiveSession()
      })
      
      expect(recoveryData).not.toBeNull()
      expect(recoveryData?.sessionId).toBe('session-123')
      expect(recoveryData?.conversationTimeSeconds).toBe(300)
      expect(recoveryData?.remainingMinutes).toBe(55) // 60 - 5
    })

    it('should return null for expired session', async () => {
      const expiredSession = {
        id: 'session-123',
        status: 'active',
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        duration: 60,
        conversationTimeSeconds: 3600 // 60 minutes
      }
      
      ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => expiredSession })
      
      const { result } = renderHook(() => useSessionManagement(mockOptions))
      
      let recoveryData: SessionRecoveryData | null = null
      await act(async () => {
        recoveryData = await result.current.checkForActiveSession()
      })
      
      expect(recoveryData).toBeNull()
    })
  })

  describe('recoverSession', () => {
    it('should recover session state', async () => {
      const recoveryData: SessionRecoveryData = {
        sessionId: 'session-123',
        originalStart: new Date().toISOString(),
        recoveredAt: new Date().toISOString(),
        conversationTimeMinutes: 10,
        conversationTimeSeconds: 600,
        remainingMinutes: 50,
        autoRestarted: false,
        sessionData: {
          id: 'session-123',
          userId: 'user-123',
          startTime: new Date().toISOString(),
          duration: 60,
          status: 'active'
        }
      }
      
      const { result } = renderHook(() => useSessionManagement(mockOptions))
      
      await act(async () => {
        await result.current.recoverSession(recoveryData)
      })
      
      expect(result.current.sessionId).toBe('session-123')
      expect(result.current.sessionDuration).toBe(60)
      expect(result.current.conversationTimeSeconds).toBe(600)
      expect(result.current.sessionRecovered).toBe(true)
      expect(mockOptions.onSessionRecovered).toHaveBeenCalledWith(recoveryData)
    })

    it('should recover paused session', async () => {
      const recoveryData: SessionRecoveryData = {
        sessionId: 'session-123',
        originalStart: new Date().toISOString(),
        recoveredAt: new Date().toISOString(),
        conversationTimeMinutes: 10,
        conversationTimeSeconds: 600,
        remainingMinutes: 50,
        autoRestarted: false,
        sessionData: {
          id: 'session-123',
          userId: 'user-123',
          startTime: new Date().toISOString(),
          duration: 60,
          status: 'active'
        },
        pauseInfo: {
          isPaused: true,
          pauseStartTime: new Date().toISOString(),
          totalPausedTime: 120
        }
      }
      
      const { result } = renderHook(() => useSessionManagement(mockOptions))
      
      await act(async () => {
        await result.current.recoverSession(recoveryData)
      })
      
      expect(result.current.isSessionPaused).toBe(true)
      expect(result.current.pauseStartTime).toBeInstanceOf(Date)
      expect(result.current.totalPausedTimeSeconds).toBe(120)
    })
  })

  describe('pause and resume', () => {
    it('should pause session', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true })
      
      const { result } = renderHook(() => useSessionManagement(mockOptions))
      
      // Set up active session
      act(() => {
        result.current.sessionId = 'session-123'
        result.current.conversationTimeSeconds = 600
      })
      
      await act(async () => {
        await result.current.pauseSession()
      })
      
      expect(result.current.isSessionPaused).toBe(true)
      expect(result.current.pauseStartTime).toBeInstanceOf(Date)
      
      // Check API call
      expect(fetch).toHaveBeenCalledWith(
        '/api/sessions/session-123',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('isPaused')
        })
      )
      
      // Check storage
      const pauseState = sessionStorage.getItem('session-session-123-pause-state')
      expect(pauseState).toBeTruthy()
    })

    it('should resume session', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true })
      
      const { result } = renderHook(() => useSessionManagement(mockOptions))
      
      // Set up paused session
      const pauseTime = new Date(Date.now() - 60000) // 1 minute ago
      act(() => {
        result.current.sessionId = 'session-123'
        result.current.isSessionPaused = true
        result.current.pauseStartTime = pauseTime
        result.current.totalPausedTimeSeconds = 0
      })
      
      await act(async () => {
        await result.current.resumeSession()
      })
      
      expect(result.current.isSessionPaused).toBe(false)
      expect(result.current.pauseStartTime).toBeNull()
      expect(result.current.totalPausedTimeSeconds).toBeGreaterThan(0)
      expect(result.current.conversationStartTime).toBeInstanceOf(Date)
    })
  })

  describe('endSession', () => {
    it('should end session successfully', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true })
      
      const { result } = renderHook(() => useSessionManagement(mockOptions))
      
      // Set up active session
      act(() => {
        result.current.sessionId = 'session-123'
        result.current.conversationTimeSeconds = 1800 // 30 minutes
        result.current.totalPausedTimeSeconds = 300 // 5 minutes
      })
      
      await act(async () => {
        await result.current.endSession()
      })
      
      expect(fetch).toHaveBeenCalledWith(
        '/api/sessions/session-123/complete',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('actualDurationMinutes')
        })
      )
      
      const bodyStr = (fetch as jest.Mock).mock.calls[0][1].body
      const body = JSON.parse(bodyStr)
      expect(body.actualDurationMinutes).toBe(30)
      expect(body.totalPausedMinutes).toBe(5)
      expect(body.billableMinutes).toBe(30)
      
      expect(mockOptions.onSessionCompleted).toHaveBeenCalled()
      
      // Session should be cleared
      expect(result.current.sessionId).toBeNull()
      expect(sessionStorage.getItem('current-session-id')).toBeNull()
    })
  })

  describe('conversation time', () => {
    it('should update conversation time', () => {
      const { result } = renderHook(() => useSessionManagement(mockOptions))
      
      act(() => {
        result.current.updateConversationTime(30)
      })
      
      expect(result.current.conversationTimeSeconds).toBe(30)
      
      act(() => {
        result.current.updateConversationTime(45)
      })
      
      expect(result.current.conversationTimeSeconds).toBe(75)
    })
  })

  describe('session backup', () => {
    it('should save session backup', () => {
      const { result } = renderHook(() => useSessionManagement(mockOptions))
      
      act(() => {
        result.current.sessionId = 'session-123'
        result.current.conversationTimeSeconds = 600
        result.current.totalPausedTimeSeconds = 120
        result.current.isSessionPaused = false
      })
      
      act(() => {
        result.current.saveSessionBackup()
      })
      
      const backup = sessionStorage.getItem('session-session-123-backup-time')
      expect(backup).toBeTruthy()
      
      const parsed = JSON.parse(backup!)
      expect(parsed.sessionId).toBe('session-123')
      expect(parsed.conversationTimeSeconds).toBe(600)
      expect(parsed.totalPausedTimeSeconds).toBe(120)
      expect(parsed.isPaused).toBe(false)
    })
  })
})