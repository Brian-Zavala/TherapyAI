'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useVapiSession } from '@/hooks/useVapiSession'
import { useSupabaseSessionState } from '@/hooks/useSupabaseSessionState'

export default function TestVapiPausePage() {
  const { data: session } = useSession()
  const [sessionId, setSessionId] = useState<string>('')
  const [assistantId, setAssistantId] = useState<string>('')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const vapi = useVapiSession({
    onCallStart: () => addLog('VAPI call started'),
    onCallEnd: (reason) => addLog(`VAPI call ended: ${reason}`),
    onError: (error) => addLog(`VAPI error: ${error}`),
    onMessage: (message) => addLog(`VAPI message: ${JSON.stringify(message).substring(0, 100)}...`)
  })

  const sessionState = useSupabaseSessionState({
    sessionId: sessionId || undefined,
    userId: session?.user?.id || '',
    onVapiPause: vapi.pauseCall,
    onVapiResume: vapi.resumeCall
  })

  const handleStartSession = async () => {
    try {
      addLog('Starting VAPI session...')
      await vapi.startCall(assistantId)
      addLog('VAPI session started successfully')
    } catch (error) {
      addLog(`Failed to start session: ${error}`)
    }
  }

  const handlePauseSession = async () => {
    try {
      addLog('Pausing session...')
      await sessionState.pauseSession()
      addLog('Session paused successfully')
    } catch (error) {
      addLog(`Failed to pause session: ${error}`)
    }
  }

  const handleResumeSession = async () => {
    try {
      addLog('Resuming session...')
      await sessionState.resumeSession()
      addLog('Session resumed successfully')
    } catch (error) {
      addLog(`Failed to resume session: ${error}`)
    }
  }

  const handleStopSession = async () => {
    try {
      addLog('Stopping VAPI session...')
      await vapi.stopCall()
      addLog('VAPI session stopped')
    } catch (error) {
      addLog(`Failed to stop session: ${error}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">VAPI Pause/Resume Test</h1>
      
      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium mb-2">Session ID</label>
          <input
            type="text"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="Enter session ID"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Assistant ID</label>
          <input
            type="text"
            value={assistantId}
            onChange={(e) => setAssistantId(e.target.value)}
            placeholder="Enter VAPI assistant ID"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
          />
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <button
          onClick={handleStartSession}
          disabled={!assistantId || vapi.vapiState.isActive}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
        >
          Start Session
        </button>
        
        <button
          onClick={handlePauseSession}
          disabled={!vapi.vapiState.isActive || sessionState.isPaused}
          className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
        >
          Pause
        </button>
        
        <button
          onClick={handleResumeSession}
          disabled={!sessionState.isPaused}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
        >
          Resume
        </button>
        
        <button
          onClick={handleStopSession}
          disabled={!vapi.vapiState.isActive}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
        >
          Stop
        </button>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">VAPI State</h2>
          <pre className="text-sm text-gray-300">
            {JSON.stringify(vapi.vapiState, null, 2)}
          </pre>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Session State</h2>
          <pre className="text-sm text-gray-300">
            {JSON.stringify({
              isActive: sessionState.isActive,
              isPaused: sessionState.isPaused,
              isConnected: sessionState.isConnected,
              sessionId: sessionState.session?.id
            }, null, 2)}
          </pre>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Logs</h2>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="text-sm text-gray-300 font-mono">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}