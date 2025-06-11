import { renderHook, act } from '@testing-library/react'
import { useVapiSession } from '../useVapiSession'
import { initVapi } from '@/lib/vapi'
import { VapiMessage } from '@/types/vapi'

// Mock dependencies
jest.mock('@/lib/vapi', () => ({
  initVapi: jest.fn()
}))

// Mock VAPI instance
const mockVapiInstance = {
  on: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  setMuted: jest.fn()
}

// Mock browser APIs
global.AudioContext = jest.fn().mockImplementation(() => ({
  createAnalyser: jest.fn().mockReturnValue({
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: jest.fn()
  }),
  createMediaStreamSource: jest.fn().mockReturnValue({
    connect: jest.fn()
  }),
  close: jest.fn()
}))

global.navigator.mediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue({
    getTracks: jest.fn().mockReturnValue([
      { stop: jest.fn() }
    ])
  })
}

describe('useVapiSession', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_VAPI_API_KEY = 'test-api-key'
    ;(initVapi as jest.Mock).mockResolvedValue(mockVapiInstance)
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useVapiSession())
      
      expect(result.current.vapiState).toEqual({
        isActive: false,
        isLoading: false,
        isMuted: false,
        error: null,
        audioLevel: 0
      })
      expect(result.current.audioLevel).toBe(0)
      expect(result.current.isInstanceReady()).toBe(false)
    })
  })

  describe('createVapiInstance', () => {
    it('should create VAPI instance successfully', async () => {
      const { result } = renderHook(() => useVapiSession())
      
      let success: boolean = false
      await act(async () => {
        success = await result.current.createVapiInstance('test-session-id')
      })
      
      expect(success).toBe(true)
      expect(initVapi).toHaveBeenCalledWith('test-api-key', {
        useCustomTranscriber: false,
        reconnectEnabled: true,
        iceServers: expect.any(Array)
      })
      expect(result.current.isInstanceReady()).toBe(true)
    })

    it('should handle missing API key', async () => {
      delete process.env.NEXT_PUBLIC_VAPI_API_KEY
      const onError = jest.fn()
      const { result } = renderHook(() => useVapiSession({ onError }))
      
      let success: boolean = false
      await act(async () => {
        success = await result.current.createVapiInstance()
      })
      
      expect(success).toBe(false)
      expect(result.current.vapiState.error).toContain('API key not configured')
      expect(onError).toHaveBeenCalled()
    })

    it('should dispose of existing instance before creating new one', async () => {
      const { result } = renderHook(() => useVapiSession())
      
      // Create first instance
      await act(async () => {
        await result.current.createVapiInstance('session-1')
      })
      
      // Create second instance
      await act(async () => {
        await result.current.createVapiInstance('session-2')
      })
      
      expect(mockVapiInstance.stop).toHaveBeenCalledTimes(1)
    })
  })

  describe('event handlers', () => {
    it('should handle call-start event', async () => {
      const onCallStart = jest.fn()
      const { result } = renderHook(() => useVapiSession({ onCallStart }))
      
      await act(async () => {
        await result.current.createVapiInstance()
      })
      
      // Get the call-start handler
      const callStartHandler = mockVapiInstance.on.mock.calls.find(
        call => call[0] === 'call-start'
      )?.[1]
      
      await act(async () => {
        await callStartHandler()
      })
      
      expect(result.current.vapiState.isActive).toBe(true)
      expect(result.current.vapiState.isLoading).toBe(false)
      expect(onCallStart).toHaveBeenCalled()
    })

    it('should handle call-end event', async () => {
      const onCallEnd = jest.fn()
      const { result } = renderHook(() => useVapiSession({ onCallEnd }))
      
      await act(async () => {
        await result.current.createVapiInstance()
      })
      
      // Start call first
      const callStartHandler = mockVapiInstance.on.mock.calls.find(
        call => call[0] === 'call-start'
      )?.[1]
      await act(async () => {
        await callStartHandler()
      })
      
      // Then end call
      const callEndHandler = mockVapiInstance.on.mock.calls.find(
        call => call[0] === 'call-end'
      )?.[1]
      
      await act(async () => {
        await callEndHandler({ reason: 'user_hangup' })
      })
      
      expect(result.current.vapiState.isActive).toBe(false)
      expect(onCallEnd).toHaveBeenCalledWith('user_hangup')
    })

    it('should handle error event', async () => {
      const onError = jest.fn()
      const { result } = renderHook(() => useVapiSession({ onError }))
      
      await act(async () => {
        await result.current.createVapiInstance()
      })
      
      const errorHandler = mockVapiInstance.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1]
      
      const testError = { message: 'Test error', code: 'TEST_001' }
      act(() => {
        errorHandler(testError)
      })
      
      expect(result.current.vapiState.error).toContain('Test error')
      expect(result.current.vapiState.error).toContain('TEST_001')
      expect(onError).toHaveBeenCalledWith(testError)
    })

    it('should handle message event with function call', async () => {
      const onFunctionCall = jest.fn()
      const onMessage = jest.fn()
      const { result } = renderHook(() => useVapiSession({ onFunctionCall, onMessage }))
      
      await act(async () => {
        await result.current.createVapiInstance()
      })
      
      const messageHandler = mockVapiInstance.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1]
      
      const testMessage: VapiMessage = {
        type: 'function-call',
        functionCall: {
          name: 'end_therapy_session',
          parameters: { reason: 'user_requested' }
        }
      } as any
      
      act(() => {
        messageHandler(testMessage)
      })
      
      expect(onFunctionCall).toHaveBeenCalledWith('end_therapy_session', { reason: 'user_requested' })
      expect(onMessage).toHaveBeenCalledWith(testMessage)
    })
  })

  describe('call control', () => {
    it('should start call with assistant ID', async () => {
      const { result } = renderHook(() => useVapiSession())
      
      await act(async () => {
        await result.current.createVapiInstance()
      })
      
      await act(async () => {
        await result.current.startCall('assistant-123')
      })
      
      expect(mockVapiInstance.start).toHaveBeenCalledWith('assistant-123')
    })

    it('should start call with full configuration', async () => {
      const { result } = renderHook(() => useVapiSession())
      
      await act(async () => {
        await result.current.createVapiInstance()
      })
      
      const config = {
        id: 'assistant-123',
        name: 'Test Assistant',
        type: 'therapist',
        model: {
          provider: 'anthropic',
          model: 'claude-3',
          temperature: 0.7,
          messages: []
        },
        voice: {
          provider: 'elevenlabs',
          voiceId: 'voice-123'
        },
        firstMessage: 'Hello!'
      }
      
      await act(async () => {
        await result.current.startCall(config)
      })
      
      expect(mockVapiInstance.start).toHaveBeenCalledWith(config)
    })

    it('should stop call', async () => {
      const { result } = renderHook(() => useVapiSession())
      
      await act(async () => {
        await result.current.createVapiInstance()
      })
      
      await act(async () => {
        await result.current.stopCall()
      })
      
      expect(mockVapiInstance.stop).toHaveBeenCalled()
    })

    it('should toggle mute', async () => {
      const { result } = renderHook(() => useVapiSession())
      
      await act(async () => {
        await result.current.createVapiInstance()
      })
      
      act(() => {
        result.current.toggleMute()
      })
      
      expect(mockVapiInstance.setMuted).toHaveBeenCalledWith(true)
      expect(result.current.vapiState.isMuted).toBe(true)
      
      act(() => {
        result.current.toggleMute()
      })
      
      expect(mockVapiInstance.setMuted).toHaveBeenCalledWith(false)
      expect(result.current.vapiState.isMuted).toBe(false)
    })
  })

  describe('audio analysis', () => {
    it('should setup audio analyzer on call start', async () => {
      const { result } = renderHook(() => useVapiSession())
      
      await act(async () => {
        await result.current.createVapiInstance()
      })
      
      const callStartHandler = mockVapiInstance.on.mock.calls.find(
        call => call[0] === 'call-start'
      )?.[1]
      
      await act(async () => {
        await callStartHandler()
      })
      
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
    })

    it('should handle audio permission denied', async () => {
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(
        new Error('Permission denied')
      )
      
      const { result } = renderHook(() => useVapiSession())
      
      await act(async () => {
        await result.current.createVapiInstance()
      })
      
      const callStartHandler = mockVapiInstance.on.mock.calls.find(
        call => call[0] === 'call-start'
      )?.[1]
      
      await act(async () => {
        await callStartHandler()
      })
      
      expect(result.current.vapiState.error).toContain('Microphone permission denied')
    })
  })

  describe('cleanup', () => {
    it('should clean up on unmount', async () => {
      const { result, unmount } = renderHook(() => useVapiSession())
      
      await act(async () => {
        await result.current.createVapiInstance()
      })
      
      unmount()
      
      expect(mockVapiInstance.stop).toHaveBeenCalled()
    })
  })
})