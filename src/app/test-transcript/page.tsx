'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import SessionTranscriptSMS from '@/components/SessionTranscriptSMS'
import SessionTranscript from '@/components/SessionTranscript'

export default function TestTranscriptPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')
  const [viewMode, setViewMode] = useState<'sms' | 'original'>('sms')
  const [testMode, setTestMode] = useState(false)
  const [mockEntries, setMockEntries] = useState<any[]>([])

  // Generate mock transcript data for testing
  const generateMockData = () => {
    const now = new Date()
    const mockTranscript = [
      {
        id: '1',
        sessionId: sessionId || 'test-session',
        speaker: 'user',
        text: 'I was just working',
        timestamp: new Date(now.getTime() - 300000).toISOString(),
        isFinal: true
      },
      {
        id: '2',
        sessionId: sessionId || 'test-session',
        speaker: 'user',
        text: 'all kinds of stress and',
        timestamp: new Date(now.getTime() - 290000).toISOString(),
        isFinal: true
      },
      {
        id: '3',
        sessionId: sessionId || 'test-session',
        speaker: 'assistant',
        text: 'I hear that work has been causing you significant stress. Can you tell me more about what specific aspects of your job are creating the most pressure for you right now?',
        timestamp: new Date(now.getTime() - 280000).toISOString(),
        isFinal: true
      },
      {
        id: '4',
        sessionId: sessionId || 'test-session',
        speaker: 'user',
        text: 'full time jobs for',
        timestamp: new Date(now.getTime() - 270000).toISOString(),
        isFinal: true
      },
      {
        id: '5',
        sessionId: sessionId || 'test-session',
        speaker: 'user',
        text: 'kids.',
        timestamp: new Date(now.getTime() - 260000).toISOString(),
        isFinal: true
      },
      {
        id: '6',
        sessionId: sessionId || 'test-session',
        speaker: 'assistant',
        text: 'Managing full-time work while caring for children is incredibly challenging. It sounds like you\'re juggling multiple demanding responsibilities.',
        timestamp: new Date(now.getTime() - 250000).toISOString(),
        isFinal: true
      },
      {
        id: '7',
        sessionId: sessionId || 'test-session',
        speaker: 'assistant',
        text: 'How are you currently handling the balance between your work obligations and your family needs?',
        timestamp: new Date(now.getTime() - 240000).toISOString(),
        isFinal: true
      },
      {
        id: '8',
        sessionId: sessionId || 'test-session',
        speaker: 'user',
        text: 'You know,',
        timestamp: new Date(now.getTime() - 230000).toISOString(),
        isFinal: true
      },
      {
        id: '9',
        sessionId: sessionId || 'test-session',
        speaker: 'user',
        text: 'stress life.',
        timestamp: new Date(now.getTime() - 220000).toISOString(),
        isFinal: true
      },
      {
        id: '10',
        sessionId: sessionId || 'test-session',
        speaker: 'user',
        text: 'Probably',
        timestamp: new Date(now.getTime() - 210000).toISOString(),
        isFinal: true
      },
      {
        id: '11',
        sessionId: sessionId || 'test-session',
        speaker: 'user',
        text: 'everything',
        timestamp: new Date(now.getTime() - 200000).toISOString(),
        isFinal: true
      },
      {
        id: '12',
        sessionId: sessionId || 'test-session',
        speaker: 'assistant',
        text: 'It sounds like the stress is really pervasive - affecting many areas of your life. When everything feels stressful, it can be overwhelming to know where to start making changes.',
        timestamp: new Date(now.getTime() - 190000).toISOString(),
        isFinal: true
      },
      {
        id: '13',
        sessionId: sessionId || 'test-session',
        speaker: 'assistant',
        text: 'What would you say is the most pressing concern for you right now? What\'s causing you the most distress on a daily basis?',
        timestamp: new Date(now.getTime() - 180000).toISOString(),
        isFinal: true
      },
      {
        id: '14',
        sessionId: sessionId || 'test-session',
        speaker: 'user',
        text: 'going all at once.',
        timestamp: new Date(now.getTime() - 170000).toISOString(),
        isFinal: true
      },
      {
        id: '15',
        sessionId: sessionId || 'test-session',
        speaker: 'assistant',
        text: 'Yes, when multiple stressors hit at the same time, it can feel like a tsunami of pressure. That sense of everything happening at once can make it difficult to process or cope effectively.',
        timestamp: new Date(now.getTime() - 160000).toISOString(),
        isFinal: true
      },
      {
        id: '16',
        sessionId: sessionId || 'test-session',
        speaker: 'assistant',
        text: 'Let\'s try to break this down together. Can you identify maybe two or three specific things that happened recently that contributed to this feeling of everything piling up?',
        timestamp: new Date(now.getTime() - 150000).toISOString(),
        isFinal: true
      }
    ]

    return mockTranscript
  }

  // Simulate real-time message addition
  useEffect(() => {
    if (testMode) {
      const mockData = generateMockData()
      let index = 0
      
      const interval = setInterval(() => {
        if (index < mockData.length) {
          setMockEntries(prev => [...prev, mockData[index]])
          index++
        } else {
          clearInterval(interval)
        }
      }, 2000) // Add new message every 2 seconds
      
      return () => clearInterval(interval)
    }
  }, [testMode])

  if (!sessionId && !testMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full shadow-2xl">
          <h1 className="text-2xl font-bold text-white mb-4">Test Transcript Display</h1>
          <p className="text-gray-400 mb-6">
            Enter a session ID in the URL to test the transcript display, or use test mode.
          </p>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Example: /test-transcript?sessionId=your-session-id
            </p>
            <div className="border-t border-gray-700 pt-4">
              <button
                onClick={() => setTestMode(true)}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
              >
                Start Test Mode with Mock Data
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const effectiveSessionId = sessionId || 'test-session'
  const mockSession = testMode ? {
    id: effectiveSessionId,
    date: new Date().toISOString(),
    duration: 30,
    theme: 'Test Session',
    status: 'active',
    transcriptEntries: mockEntries
  } : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Control Panel */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Transcript Display Test</h1>
          <div className="flex items-center space-x-4">
            {testMode && (
              <span className="text-sm text-green-400">
                Test Mode Active ({mockEntries.length} messages)
              </span>
            )}
            <div className="flex rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('sms')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'sms'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                SMS Style
              </button>
              <button
                onClick={() => setViewMode('original')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'original'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Original Style
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Display */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl" style={{ height: '80vh' }}>
          {viewMode === 'sms' ? (
            <SessionTranscriptSMS 
              sessionId={effectiveSessionId}
              initialSession={mockSession}
            />
          ) : (
            <SessionTranscript 
              sessionId={effectiveSessionId}
              initialSession={mockSession}
            />
          )}
        </div>
      </div>

      {/* Debug Info */}
      {testMode && (
        <div className="max-w-4xl mx-auto p-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Debug Info</h3>
            <div className="text-xs text-gray-500 space-y-1">
              <p>Session ID: {effectiveSessionId}</p>
              <p>Messages: {mockEntries.length}</p>
              <p>View Mode: {viewMode}</p>
              <p>Last Message: {mockEntries[mockEntries.length - 1]?.text}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}