import { renderHook, act } from '@testing-library/react'
import { useTranscriptHandler } from '../useTranscriptHandler'
import { VapiMessage } from '@/types/vapi'
import { saveTranscript } from '@/lib/transcript-service-optimized'

// Mock dependencies
jest.mock('@/lib/transcript-service-optimized', () => ({
  saveTranscript: jest.fn()
}))

// Mock timers
jest.useFakeTimers()

describe('useTranscriptHandler', () => {
  const mockOptions = {
    sessionId: 'test-session-123',
    onTranscriptUpdate: jest.fn(),
    onMetricsUpdate: jest.fn(),
    onError: jest.fn()
  }
  
  beforeEach(() => {
    jest.clearAllMocks()
    sessionStorage.clear()
    ;(saveTranscript as jest.Mock).mockResolvedValue(true)
  })
  
  afterEach(() => {
    jest.clearAllTimers()
  })
  
  describe('initialization', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useTranscriptHandler(mockOptions))
      
      expect(result.current.transcriptChunks).toEqual([])
      expect(result.current.isProcessingAssistant).toBe(false)
      expect(result.current.isProcessingUser).toBe(false)
      expect(result.current.getBufferState()).toEqual({
        assistantBuffer: '',
        userBuffer: ''
      })
    })
  })
  
  describe('handleVapiMessage - user transcript', () => {
    it('should buffer and debounce user messages', async () => {
      const { result } = renderHook(() => useTranscriptHandler(mockOptions))
      
      // Send first user message
      const message1: VapiMessage = {
        type: 'transcript',
        transcript: {
          speaker: 'user',
          text: 'Hello',
          isFinal: true
        }
      } as any
      
      await act(async () => {
        await result.current.handleVapiMessage(message1, null)
      })
      
      // Buffer should contain the message
      expect(result.current.getBufferState().userBuffer).toBe('Hello')
      expect(result.current.isProcessingUser).toBe(true)
      expect(result.current.transcriptChunks).toEqual([])
      
      // Send second message before debounce
      const message2: VapiMessage = {
        type: 'transcript',
        transcript: {
          speaker: 'user',
          text: 'there',
          isFinal: true
        }
      } as any
      
      await act(async () => {
        await result.current.handleVapiMessage(message2, null)
      })
      
      // Buffer should contain both messages
      expect(result.current.getBufferState().userBuffer).toBe('Hello there')
      
      // Fast forward past debounce time
      await act(async () => {
        jest.advanceTimersByTime(1500)
      })
      
      // Should be processed now
      expect(result.current.transcriptChunks).toEqual(['You: Hello there'])
      expect(result.current.isProcessingUser).toBe(false)
      expect(result.current.getBufferState().userBuffer).toBe('')
      
      // Check callbacks
      expect(mockOptions.onTranscriptUpdate).toHaveBeenCalledWith(['You: Hello there'])
      expect(mockOptions.onMetricsUpdate).toHaveBeenCalledWith({
        userWords: 2,
        assistantWords: 0
      })
      
      // Check storage
      expect(sessionStorage.getItem('transcript-test-session-123')).toContain('You: Hello there')
      
      // Check database save
      expect(saveTranscript).toHaveBeenCalledWith(
        'test-session-123',
        expect.arrayContaining([
          expect.objectContaining({
            speaker: 'user',
            text: 'Hello there',
            isFinal: true
          })
        ])
      )
    })
    
    it('should ignore non-final user messages', async () => {
      const { result } = renderHook(() => useTranscriptHandler(mockOptions))
      
      const message: VapiMessage = {
        type: 'transcript',
        transcript: {
          speaker: 'user',
          text: 'Hello',
          isFinal: false
        }
      } as any
      
      await act(async () => {
        await result.current.handleVapiMessage(message, null)
      })
      
      expect(result.current.getBufferState().userBuffer).toBe('')
      expect(result.current.isProcessingUser).toBe(false)
    })
  })
  
  describe('handleVapiMessage - assistant model output', () => {
    it('should buffer and debounce assistant messages', async () => {
      const { result } = renderHook(() => useTranscriptHandler(mockOptions))
      
      // Send first assistant message
      const message1: VapiMessage = {
        type: 'model-output',
        model: {
          role: 'assistant',
          content: 'Hello! How'
        }
      } as any
      
      await act(async () => {
        await result.current.handleVapiMessage(message1, null)
      })
      
      // Send second message
      const message2: VapiMessage = {
        type: 'model-output',
        model: {
          role: 'assistant',
          content: 'can I help you?'
        }
      } as any
      
      await act(async () => {
        await result.current.handleVapiMessage(message2, null)
      })
      
      // Buffer should contain both
      expect(result.current.getBufferState().assistantBuffer).toBe('Hello! How can I help you?')
      expect(result.current.isProcessingAssistant).toBe(true)
      
      // Fast forward past debounce
      await act(async () => {
        jest.advanceTimersByTime(1500)
      })
      
      // Should be processed
      expect(result.current.transcriptChunks).toEqual(['AI: Hello! How can I help you?'])
      expect(result.current.isProcessingAssistant).toBe(false)
      expect(result.current.getBufferState().assistantBuffer).toBe('')
      
      // Check metrics
      expect(mockOptions.onMetricsUpdate).toHaveBeenCalledWith({
        userWords: 0,
        assistantWords: 6
      })
    })
  })
  
  describe('handleVapiMessage - conversation update', () => {
    it('should recover session ID from conversation', async () => {
      const { result } = renderHook(() => useTranscriptHandler(mockOptions))
      
      const mockVapi = { _sessionId: null }
      
      const message: VapiMessage = {
        type: 'conversation-update',
        conversation: [
          {
            role: 'system',
            content: 'You are a therapist. Session ID: recovered-session-123'
          },
          {
            role: 'assistant',
            content: 'Hello!'
          }
        ]
      } as any
      
      await act(async () => {
        await result.current.handleVapiMessage(message, mockVapi as any)
      })
      
      expect(mockVapi._sessionId).toBe('recovered-session-123')
    })
    
    it('should detect duplicate conversation updates', async () => {
      const { result } = renderHook(() => useTranscriptHandler(mockOptions))
      
      const conversation = [
        { role: 'assistant', content: 'Hello!' },
        { role: 'user', content: 'Hi there!' }
      ]
      
      const message1: VapiMessage = {
        type: 'conversation-update',
        conversation
      } as any
      
      // Send first update
      await act(async () => {
        await result.current.handleVapiMessage(message1, null)
      })
      
      // Send duplicate update
      const message2: VapiMessage = {
        type: 'conversation-update',
        conversation
      } as any
      
      // Spy on console.log to verify duplicate detection
      const consoleSpy = jest.spyOn(console, 'log')
      
      await act(async () => {
        await result.current.handleVapiMessage(message2, null)
      })
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate conversation update detected')
      )
      
      consoleSpy.mockRestore()
    })
  })
  
  describe('clearTranscripts', () => {
    it('should clear all transcript state', async () => {
      const { result } = renderHook(() => useTranscriptHandler(mockOptions))
      
      // Add some transcripts
      const message: VapiMessage = {
        type: 'transcript',
        transcript: {
          speaker: 'user',
          text: 'Test message',
          isFinal: true
        }
      } as any
      
      await act(async () => {
        await result.current.handleVapiMessage(message, null)
        jest.advanceTimersByTime(1500)
      })
      
      expect(result.current.transcriptChunks).toHaveLength(1)
      
      // Clear transcripts
      act(() => {
        result.current.clearTranscripts()
      })
      
      expect(result.current.transcriptChunks).toEqual([])
      expect(result.current.getBufferState()).toEqual({
        assistantBuffer: '',
        userBuffer: ''
      })
      expect(result.current.isProcessingAssistant).toBe(false)
      expect(result.current.isProcessingUser).toBe(false)
    })
  })
  
  describe('recoverTranscriptsFromStorage', () => {
    it('should recover transcripts from sessionStorage', () => {
      const { result } = renderHook(() => useTranscriptHandler(mockOptions))
      
      // Save some transcripts to storage
      sessionStorage.setItem(
        'transcript-test-session-123',
        'You: Hello\nAI: Hi there!\nYou: How are you?'
      )
      
      const recovered = result.current.recoverTranscriptsFromStorage()
      
      expect(recovered).toHaveLength(3)
      expect(recovered[0]).toMatchObject({
        speaker: 'user',
        text: 'Hello',
        isFinal: true
      })
      expect(recovered[1]).toMatchObject({
        speaker: 'assistant',
        text: 'Hi there!',
        isFinal: true
      })
      expect(recovered[2]).toMatchObject({
        speaker: 'user',
        text: 'How are you?',
        isFinal: true
      })
    })
    
    it('should return empty array if no transcripts found', () => {
      const { result } = renderHook(() => useTranscriptHandler(mockOptions))
      
      const recovered = result.current.recoverTranscriptsFromStorage()
      
      expect(recovered).toEqual([])
    })
    
    it('should handle recovery errors gracefully', () => {
      const { result } = renderHook(() => useTranscriptHandler(mockOptions))
      
      // Save invalid data
      sessionStorage.setItem('transcript-test-session-123', 'invalid\nformat')
      
      const recovered = result.current.recoverTranscriptsFromStorage()
      
      expect(recovered).toEqual([])
    })
  })
  
  describe('saveTranscriptBackup', () => {
    it('should save transcript backup to storage', async () => {
      const { result } = renderHook(() => useTranscriptHandler(mockOptions))
      
      // Add some transcripts
      const message: VapiMessage = {
        type: 'transcript',
        transcript: {
          speaker: 'user',
          text: 'Test backup',
          isFinal: true
        }
      } as any
      
      await act(async () => {
        await result.current.handleVapiMessage(message, null)
        jest.advanceTimersByTime(1500)
      })
      
      // Save backup
      act(() => {
        result.current.saveTranscriptBackup()
      })
      
      // Check that backup was saved
      const backupKeys = Object.keys(sessionStorage).filter(key => 
        key.startsWith('transcript-backup-test-session-123-')
      )
      
      expect(backupKeys).toHaveLength(1)
      
      const backupData = JSON.parse(sessionStorage.getItem(backupKeys[0])!)
      expect(backupData).toEqual(['You: Test backup'])
    })
  })
  
  describe('error handling', () => {
    it('should handle transcript save errors', async () => {
      (saveTranscript as jest.Mock).mockResolvedValueOnce(false)
      
      const { result } = renderHook(() => useTranscriptHandler(mockOptions))
      
      const message: VapiMessage = {
        type: 'transcript',
        transcript: {
          speaker: 'user',
          text: 'Error test',
          isFinal: true
        }
      } as any
      
      await act(async () => {
        await result.current.handleVapiMessage(message, null)
        jest.advanceTimersByTime(1500)
      })
      
      // Should still update UI even if save fails
      expect(result.current.transcriptChunks).toEqual(['You: Error test'])
    })
    
    it('should handle message processing errors', async () => {
      const { result } = renderHook(() => useTranscriptHandler(mockOptions))
      
      // Send invalid message
      const message = { type: 'invalid' } as any
      
      await act(async () => {
        await result.current.handleVapiMessage(message, null)
      })
      
      // Should not crash
      expect(result.current.transcriptChunks).toEqual([])
    })
  })
  
  describe('cleanup', () => {
    it('should process pending buffers on unmount', async () => {
      const { result, unmount } = renderHook(() => useTranscriptHandler(mockOptions))
      
      // Add messages to buffers
      const message: VapiMessage = {
        type: 'transcript',
        transcript: {
          speaker: 'user',
          text: 'Cleanup test',
          isFinal: true
        }
      } as any
      
      await act(async () => {
        await result.current.handleVapiMessage(message, null)
      })
      
      // Unmount before debounce completes
      unmount()
      
      // Should have saved the buffered content
      expect(saveTranscript).toHaveBeenCalledWith(
        'test-session-123',
        expect.arrayContaining([
          expect.objectContaining({
            text: 'Cleanup test'
          })
        ])
      )
    })
  })
})