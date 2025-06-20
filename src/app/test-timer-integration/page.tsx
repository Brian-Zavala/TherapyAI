'use client'

import { useState, useEffect } from 'react'
import { useAccurateSessionTimer } from '@/hooks/useAccurateSessionTimer'

interface TestCase {
  name: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  result?: string
  error?: string
}

export default function TestTimerIntegrationPage() {
  const [testCases, setTestCases] = useState<TestCase[]>([
    { name: 'Basic Timer Start/Stop', status: 'pending' },
    { name: 'Pause/Resume Accuracy', status: 'pending' },
    { name: 'Time Update Callbacks', status: 'pending' },
    { name: 'Session Expiry', status: 'pending' },
    { name: 'Recovery with Initial Time', status: 'pending' },
    { name: 'Billing Calculation', status: 'pending' },
  ])
  
  const [currentTest, setCurrentTest] = useState<string | null>(null)
  const [testLog, setTestLog] = useState<string[]>([])
  
  // Test configurations
  const [timerConfig, setTimerConfig] = useState({
    sessionDurationMinutes: 30,
    initialConversationTimeSeconds: 0,
    initialPausedTimeSeconds: 0,
    isConversationActive: false,
    isPaused: false,
  })
  
  const [timeUpdateLog, setTimeUpdateLog] = useState<number[]>([])
  
  const timer = useAccurateSessionTimer({
    ...timerConfig,
    onTimeUpdate: (conversationTime) => {
      setTimeUpdateLog(prev => [...prev, conversationTime])
      logTest(`Time update: ${conversationTime}s`)
    },
    onExpire: () => {
      logTest('🔔 Timer expired!')
    },
    updateIntervalMs: 1000, // 1 second for testing
  })
  
  const logTest = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setTestLog(prev => [...prev, `[${timestamp}] ${message}`])
  }
  
  const updateTestStatus = (name: string, status: TestCase['status'], result?: string, error?: string) => {
    setTestCases(prev => prev.map(test => 
      test.name === name ? { ...test, status, result, error } : test
    ))
  }
  
  // Test 1: Basic Timer Start/Stop
  const testBasicTimer = async () => {
    const testName = 'Basic Timer Start/Stop'
    setCurrentTest(testName)
    updateTestStatus(testName, 'running')
    logTest(`Starting ${testName}...`)
    
    try {
      // Reset timer
      setTimerConfig({
        sessionDurationMinutes: 30,
        initialConversationTimeSeconds: 0,
        initialPausedTimeSeconds: 0,
        isConversationActive: false,
        isPaused: false,
      })
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Start timer
      logTest('Starting conversation...')
      setTimerConfig(prev => ({ ...prev, isConversationActive: true }))
      
      // Wait 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Check time
      const elapsed = timer.conversationTimeSeconds
      logTest(`After 3 seconds: ${elapsed}s elapsed`)
      
      // Stop timer
      setTimerConfig(prev => ({ ...prev, isConversationActive: false }))
      
      // Verify
      if (elapsed >= 2 && elapsed <= 4) {
        updateTestStatus(testName, 'passed', `Timer tracked ${elapsed}s correctly`)
      } else {
        updateTestStatus(testName, 'failed', `Expected ~3s, got ${elapsed}s`)
      }
    } catch (error) {
      updateTestStatus(testName, 'failed', '', String(error))
    }
    
    setCurrentTest(null)
  }
  
  // Test 2: Pause/Resume Accuracy
  const testPauseResume = async () => {
    const testName = 'Pause/Resume Accuracy'
    setCurrentTest(testName)
    updateTestStatus(testName, 'running')
    logTest(`Starting ${testName}...`)
    
    try {
      // Reset and start
      setTimerConfig({
        sessionDurationMinutes: 30,
        initialConversationTimeSeconds: 0,
        initialPausedTimeSeconds: 0,
        isConversationActive: true,
        isPaused: false,
      })
      
      // Run for 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000))
      const beforePause = timer.conversationTimeSeconds
      logTest(`Before pause: ${beforePause}s conversation time`)
      
      // Pause
      setTimerConfig(prev => ({ ...prev, isPaused: true }))
      logTest('Paused session')
      
      // Wait 2 seconds (should not count)
      await new Promise(resolve => setTimeout(resolve, 2000))
      const duringPause = timer.conversationTimeSeconds
      const pauseTime = timer.pausedTimeSeconds
      logTest(`During pause: ${duringPause}s conversation, ${pauseTime}s paused`)
      
      // Resume
      setTimerConfig(prev => ({ ...prev, isPaused: false }))
      logTest('Resumed session')
      
      // Run for 2 more seconds
      await new Promise(resolve => setTimeout(resolve, 2000))
      const afterResume = timer.conversationTimeSeconds
      const totalPaused = timer.pausedTimeSeconds
      logTest(`After resume: ${afterResume}s conversation, ${totalPaused}s total paused`)
      
      // Stop
      setTimerConfig(prev => ({ ...prev, isConversationActive: false }))
      
      // Verify
      const conversationDiff = afterResume - beforePause
      if (conversationDiff >= 1.5 && conversationDiff <= 2.5 && totalPaused >= 1.5) {
        updateTestStatus(testName, 'passed', 
          `Correctly tracked: ${afterResume}s conversation, ${totalPaused}s paused`)
      } else {
        updateTestStatus(testName, 'failed', 
          `Unexpected times: ${afterResume}s conversation, ${totalPaused}s paused`)
      }
    } catch (error) {
      updateTestStatus(testName, 'failed', '', String(error))
    }
    
    setCurrentTest(null)
  }
  
  // Test 3: Time Update Callbacks
  const testTimeUpdates = async () => {
    const testName = 'Time Update Callbacks'
    setCurrentTest(testName)
    updateTestStatus(testName, 'running')
    logTest(`Starting ${testName}...`)
    
    try {
      // Clear update log
      setTimeUpdateLog([])
      
      // Start timer
      setTimerConfig({
        sessionDurationMinutes: 30,
        initialConversationTimeSeconds: 0,
        initialPausedTimeSeconds: 0,
        isConversationActive: true,
        isPaused: false,
      })
      
      // Wait for updates (configured for 1 second intervals)
      await new Promise(resolve => setTimeout(resolve, 3500))
      
      // Stop timer
      setTimerConfig(prev => ({ ...prev, isConversationActive: false }))
      
      // Check updates
      logTest(`Received ${timeUpdateLog.length} time updates`)
      logTest(`Updates: ${timeUpdateLog.join(', ')}`)
      
      // Verify we got updates
      if (timeUpdateLog.length >= 2 && timeUpdateLog.length <= 4) {
        updateTestStatus(testName, 'passed', 
          `Received ${timeUpdateLog.length} updates as expected`)
      } else {
        updateTestStatus(testName, 'failed', 
          `Expected 2-4 updates, got ${timeUpdateLog.length}`)
      }
    } catch (error) {
      updateTestStatus(testName, 'failed', '', String(error))
    }
    
    setCurrentTest(null)
  }
  
  // Test 4: Recovery with Initial Time
  const testRecovery = async () => {
    const testName = 'Recovery with Initial Time'
    setCurrentTest(testName)
    updateTestStatus(testName, 'running')
    logTest(`Starting ${testName}...`)
    
    try {
      // Simulate recovery with 10 minutes already used
      const initialConversation = 600 // 10 minutes
      const initialPaused = 120 // 2 minutes paused
      
      setTimerConfig({
        sessionDurationMinutes: 30,
        initialConversationTimeSeconds: initialConversation,
        initialPausedTimeSeconds: initialPaused,
        isConversationActive: false,
        isPaused: false,
      })
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Check initial state
      logTest(`Recovery state: ${timer.conversationTimeSeconds}s conversation, ${timer.pausedTimeSeconds}s paused`)
      logTest(`Remaining: ${timer.formattedRemaining}`)
      
      // Verify recovery
      if (timer.conversationTimeSeconds === initialConversation && 
          timer.pausedTimeSeconds === initialPaused &&
          timer.remainingSeconds === (30 * 60 - initialConversation)) {
        updateTestStatus(testName, 'passed', 
          `Correctly recovered: ${timer.formattedRemaining} remaining`)
      } else {
        updateTestStatus(testName, 'failed', 
          `Recovery mismatch: ${timer.conversationTimeSeconds}s conversation, ${timer.remainingSeconds}s remaining`)
      }
    } catch (error) {
      updateTestStatus(testName, 'failed', '', String(error))
    }
    
    setCurrentTest(null)
  }
  
  // Test 5: Billing Calculation
  const testBilling = async () => {
    const testName = 'Billing Calculation'
    setCurrentTest(testName)
    updateTestStatus(testName, 'running')
    logTest(`Starting ${testName}...`)
    
    try {
      // Reset timer
      setTimerConfig({
        sessionDurationMinutes: 60,
        initialConversationTimeSeconds: 0,
        initialPausedTimeSeconds: 0,
        isConversationActive: true,
        isPaused: false,
      })
      
      // Simulate: 2s active, 1s pause, 2s active
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setTimerConfig(prev => ({ ...prev, isPaused: true }))
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setTimerConfig(prev => ({ ...prev, isPaused: false }))
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setTimerConfig(prev => ({ ...prev, isConversationActive: false }))
      
      // Calculate billing
      const totalConversation = timer.conversationTimeSeconds
      const totalPaused = timer.pausedTimeSeconds
      const billableMinutes = Math.ceil(totalConversation / 60)
      
      logTest(`Billing summary:`)
      logTest(`- Conversation: ${totalConversation}s`)
      logTest(`- Paused: ${totalPaused}s`)
      logTest(`- Billable: ${billableMinutes} minute(s)`)
      logTest(`- Progress: ${timer.progressPercentage.toFixed(1)}%`)
      
      // Verify billing
      if (totalConversation >= 3 && totalConversation <= 5 && 
          totalPaused >= 0.5 && totalPaused <= 1.5) {
        updateTestStatus(testName, 'passed', 
          `Accurate billing: ${billableMinutes} min (${totalConversation}s active)`)
      } else {
        updateTestStatus(testName, 'failed', 
          `Billing error: ${totalConversation}s conversation, ${totalPaused}s paused`)
      }
    } catch (error) {
      updateTestStatus(testName, 'failed', '', String(error))
    }
    
    setCurrentTest(null)
  }
  
  // Run all tests
  const runAllTests = async () => {
    setTestLog([])
    setTimeUpdateLog([])
    
    await testBasicTimer()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await testPauseResume()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await testTimeUpdates()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await testRecovery()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await testBilling()
    
    logTest('✅ All tests completed!')
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Timer Integration Test Suite</h1>
        
        {/* Current Timer State */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Timer State</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Conversation Time</div>
              <div className="text-2xl font-mono">{timer.formattedConversation}</div>
              <div className="text-xs text-gray-500">{timer.conversationTimeSeconds}s</div>
            </div>
            <div>
              <div className="text-gray-600">Remaining Time</div>
              <div className="text-2xl font-mono">{timer.formattedRemaining}</div>
              <div className="text-xs text-gray-500">{timer.remainingSeconds}s</div>
            </div>
            <div>
              <div className="text-gray-600">Paused Time</div>
              <div className="text-2xl font-mono">{Math.floor(timer.pausedTimeSeconds / 60)}:{(timer.pausedTimeSeconds % 60).toString().padStart(2, '0')}</div>
              <div className="text-xs text-gray-500">{timer.pausedTimeSeconds}s</div>
            </div>
            <div>
              <div className="text-gray-600">Progress</div>
              <div className="text-2xl font-mono">{timer.progressPercentage.toFixed(1)}%</div>
              <div className="text-xs text-gray-500">
                {timer.isRunning ? '🟢 Running' : timer.isPaused ? '⏸️ Paused' : '⏹️ Stopped'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Test Results */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Test Results</h2>
            <button
              onClick={runAllTests}
              disabled={currentTest !== null}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {currentTest ? 'Tests Running...' : 'Run All Tests'}
            </button>
          </div>
          
          <div className="space-y-2">
            {testCases.map((test) => (
              <div key={test.name} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm
                    ${test.status === 'passed' ? 'bg-green-500' : 
                      test.status === 'failed' ? 'bg-red-500' :
                      test.status === 'running' ? 'bg-blue-500 animate-pulse' :
                      'bg-gray-300'}`}>
                    {test.status === 'passed' ? '✓' : 
                     test.status === 'failed' ? '✗' :
                     test.status === 'running' ? '...' : '-'}
                  </div>
                  <div>
                    <div className="font-medium">{test.name}</div>
                    {test.result && <div className="text-sm text-gray-600">{test.result}</div>}
                    {test.error && <div className="text-sm text-red-600">{test.error}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Test Log */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Test Log</h2>
            <button
              onClick={() => setTestLog([])}
              className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
            >
              Clear Log
            </button>
          </div>
          <div className="bg-gray-900 text-green-400 rounded p-4 h-64 overflow-y-auto font-mono text-xs">
            {testLog.length === 0 ? (
              <div className="text-gray-500">Waiting for tests...</div>
            ) : (
              testLog.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </div>
        
        {/* Manual Controls */}
        <div className="mt-6 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold mb-4">Manual Timer Controls</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTimerConfig(prev => ({ ...prev, isConversationActive: true, isPaused: false }))}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Start
            </button>
            <button
              onClick={() => setTimerConfig(prev => ({ ...prev, isPaused: true }))}
              className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Pause
            </button>
            <button
              onClick={() => setTimerConfig(prev => ({ ...prev, isPaused: false }))}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Resume
            </button>
            <button
              onClick={() => setTimerConfig(prev => ({ ...prev, isConversationActive: false }))}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Stop
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}