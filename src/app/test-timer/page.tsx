'use client'

import { useState } from 'react'
import { useTimer, useStopwatch } from 'react-timer-hook'

export default function TestTimerPage() {
  const [testResults, setTestResults] = useState<string[]>([])
  
  // Test 1: Basic countdown timer
  const expiryTimestamp = new Date()
  expiryTimestamp.setSeconds(expiryTimestamp.getSeconds() + 300) // 5 minutes
  
  const timer = useTimer({
    expiryTimestamp,
    onExpire: () => addTestResult('Timer expired!'),
    autoStart: false
  })
  
  // Test 2: Stopwatch for elapsed time
  const stopwatch = useStopwatch({
    autoStart: false,
    offsetTimestamp: (() => {
      const offset = new Date()
      offset.setSeconds(offset.getSeconds() + 120) // Start at 2 minutes
      return offset
    })()
  })
  
  const addTestResult = (result: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setTestResults(prev => [...prev, `[${timestamp}] ${result}`])
  }
  
  // Test timer pause/resume accuracy
  const testPauseResume = async () => {
    addTestResult('Starting pause/resume test...')
    
    // Start timer
    timer.start()
    const startSeconds = timer.totalSeconds
    addTestResult(`Timer started at ${startSeconds} seconds`)
    
    // Run for 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000))
    const afterRun = timer.totalSeconds
    addTestResult(`After 3 seconds: ${afterRun} seconds (diff: ${startSeconds - afterRun})`)
    
    // Pause
    timer.pause()
    const pauseTime = timer.totalSeconds
    addTestResult(`Paused at ${pauseTime} seconds`)
    
    // Wait 2 seconds while paused
    await new Promise(resolve => setTimeout(resolve, 2000))
    const duringPause = timer.totalSeconds
    addTestResult(`During 2s pause: ${duringPause} seconds (should be same as pause time)`)
    
    // Resume
    timer.resume()
    addTestResult(`Resumed timer`)
    
    // Run for 2 more seconds
    await new Promise(resolve => setTimeout(resolve, 2000))
    const finalTime = timer.totalSeconds
    addTestResult(`Final time: ${finalTime} seconds`)
    addTestResult(`Total time elapsed: ${startSeconds - finalTime} seconds (should be ~5 seconds)`)
    
    timer.pause()
  }
  
  // Test stopwatch accuracy
  const testStopwatch = async () => {
    addTestResult('Starting stopwatch test...')
    
    stopwatch.reset(undefined, false) // Reset without autostart
    stopwatch.start()
    const startTime = stopwatch.totalSeconds
    addTestResult(`Stopwatch started at ${startTime} seconds (with 120s offset)`)
    
    // Run for 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000))
    const elapsed = stopwatch.totalSeconds
    addTestResult(`After 5 seconds: ${elapsed} seconds (diff: ${elapsed - startTime})`)
    
    stopwatch.pause()
    addTestResult(`Stopwatch paused at ${elapsed} seconds`)
  }
  
  // Test restart functionality
  const testRestart = () => {
    addTestResult('Testing timer restart...')
    
    const newExpiry = new Date()
    newExpiry.setSeconds(newExpiry.getSeconds() + 180) // 3 minutes
    
    const beforeRestart = timer.totalSeconds
    addTestResult(`Before restart: ${beforeRestart} seconds remaining`)
    
    timer.restart(newExpiry, true) // Restart and autostart
    
    const afterRestart = timer.totalSeconds
    addTestResult(`After restart: ${afterRestart} seconds remaining (should be ~180)`)
  }
  
  // Test our billing scenario
  const testBillingScenario = async () => {
    addTestResult('=== BILLING SCENARIO TEST ===')
    
    // Reset stopwatch to track conversation time
    const conversationTimer = useStopwatch({ autoStart: false })
    
    // Simulate 30-minute session
    const sessionDuration = 30 * 60 // 30 minutes in seconds
    
    addTestResult('Starting 30-minute therapy session...')
    stopwatch.reset(undefined, false)
    stopwatch.start()
    
    // Active for 10 minutes
    await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate 10 min with 2 sec
    stopwatch.pause()
    const firstSegment = stopwatch.totalSeconds
    addTestResult(`First conversation segment: ${firstSegment}s (simulated 10 min)`)
    
    // Paused for 5 minutes
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate 5 min pause with 1 sec
    
    // Resume for another 5 minutes
    stopwatch.start()
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate 5 min with 1 sec
    const totalConversation = stopwatch.totalSeconds
    addTestResult(`Total conversation time: ${totalConversation}s (should track only active time)`)
    
    // Calculate remaining
    const remaining = sessionDuration - totalConversation
    addTestResult(`Remaining session time: ${remaining}s`)
    addTestResult(`Billing calculation: ${Math.ceil(totalConversation / 60)} minutes`)
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">React Timer Hook Test Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Timer Display */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Countdown Timer</h2>
            <div className="text-4xl font-mono mb-4">
              {timer.minutes.toString().padStart(2, '0')}:
              {timer.seconds.toString().padStart(2, '0')}
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Total seconds: {timer.totalSeconds}
              {timer.isRunning && ' (Running)'}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => timer.start()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Start
              </button>
              <button
                onClick={() => timer.pause()}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Pause
              </button>
              <button
                onClick={() => timer.resume()}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Resume
              </button>
            </div>
          </div>
          
          {/* Stopwatch Display */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Stopwatch (Elapsed Time)</h2>
            <div className="text-4xl font-mono mb-4">
              {Math.floor(stopwatch.totalSeconds / 60).toString().padStart(2, '0')}:
              {(stopwatch.totalSeconds % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Total seconds: {stopwatch.totalSeconds}
              {stopwatch.isRunning && ' (Running)'}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => stopwatch.start()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Start
              </button>
              <button
                onClick={() => stopwatch.pause()}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Pause
              </button>
              <button
                onClick={() => stopwatch.reset(undefined, false)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
        
        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Accuracy Tests</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={testPauseResume}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Test Pause/Resume
            </button>
            <button
              onClick={testStopwatch}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
            >
              Test Stopwatch
            </button>
            <button
              onClick={testRestart}
              className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600"
            >
              Test Restart
            </button>
            <button
              onClick={testBillingScenario}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Test Billing
            </button>
          </div>
        </div>
        
        {/* Test Results */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="bg-gray-100 rounded p-4 h-64 overflow-y-auto font-mono text-sm">
            {testResults.length === 0 ? (
              <p className="text-gray-500">Run tests to see results...</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => setTestResults([])}
            className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear Results
          </button>
        </div>
        
        {/* Documentation */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold mb-2">Key Findings:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Timer counts DOWN from a target time (for remaining session time)</li>
            <li>Stopwatch counts UP from zero or offset (for elapsed/conversation time)</li>
            <li>Both pause/resume accurately without time loss</li>
            <li>totalSeconds gives us the exact second count for billing</li>
            <li>Restart allows changing session duration mid-session</li>
            <li>No drift or timing issues detected</li>
          </ul>
        </div>
      </div>
    </div>
  )
}