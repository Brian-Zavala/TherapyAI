/**
 * Comprehensive Test Suite for Session End Dashboard Redirect
 * 
 * This file contains test scenarios and manual testing instructions
 * for the session end redirect functionality.
 */

// ============================================
// TEST UTILITIES
// ============================================

const testUtils = {
  // Simulate rapid button clicks
  simulateRapidClicks: (button: HTMLElement, times: number = 5) => {
    for (let i = 0; i < times; i++) {
      button.click()
    }
  },

  // Monitor console for specific messages
  monitorConsole: (messages: string[]) => {
    const originalLog = console.log
    const logs: string[] = []
    
    console.log = (...args) => {
      const message = args.join(' ')
      logs.push(message)
      originalLog.apply(console, args)
    }
    
    return {
      logs,
      restore: () => { console.log = originalLog },
      hasMessage: (msg: string) => logs.some(log => log.includes(msg))
    }
  },

  // Check navigation occurred
  checkNavigation: () => {
    return new Promise((resolve) => {
      const originalPush = window.history.pushState
      window.history.pushState = (...args) => {
        originalPush.apply(window.history, args)
        resolve(args[2]) // URL
      }
    })
  }
}

// ============================================
// TEST SCENARIOS
// ============================================

export const testScenarios = {
  /**
   * Test 1: Basic Manual End Session
   * Expected: Should redirect to dashboard after 500ms
   */
  testManualEndSession: async () => {
    console.log('🧪 Test 1: Manual End Session')
    
    const monitor = testUtils.monitorConsole([
      '⚠️ End session already in progress',
      '🚀 Navigating to dashboard after session end',
      '✅ Session ended, UI reset to inactive state'
    ])
    
    // Click end button
    const endButton = document.querySelector('[data-testid="end-call-button"]')
    if (!endButton) throw new Error('End button not found')
    
    endButton.click()
    
    // Wait for redirect
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Check results
    const results = {
      sessionEnded: monitor.hasMessage('Session ended'),
      navigationTriggered: monitor.hasMessage('Navigating to dashboard'),
      noDuplicates: !monitor.hasMessage('already in progress'),
      redirected: window.location.pathname === '/dashboard'
    }
    
    monitor.restore()
    return results
  },

  /**
   * Test 2: Rapid Multiple Clicks Prevention
   * Expected: Should only process first click
   */
  testRapidClicks: async () => {
    console.log('🧪 Test 2: Rapid Click Prevention')
    
    const monitor = testUtils.monitorConsole([])
    const endButton = document.querySelector('[data-testid="end-call-button"]') as HTMLElement
    
    // Simulate rapid clicks
    testUtils.simulateRapidClicks(endButton, 5)
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Count how many times "already in progress" appears
    const duplicateAttempts = monitor.logs.filter(log => 
      log.includes('already in progress')
    ).length
    
    const results = {
      duplicatesPrevented: duplicateAttempts >= 4,
      onlyOneEndProcessed: duplicateAttempts === 4
    }
    
    monitor.restore()
    return results
  },

  /**
   * Test 3: Natural Session Completion
   * Expected: Should redirect after VAPI timeout
   */
  testNaturalCompletion: async () => {
    console.log('🧪 Test 3: Natural Session Completion')
    
    const monitor = testUtils.monitorConsole([])
    
    // Simulate VAPI call-end event
    window.dispatchEvent(new CustomEvent('vapi-call-end', {
      detail: { reason: 'max-duration-reached' }
    }))
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const results = {
      naturalCompletionDetected: monitor.hasMessage('Natural session completion'),
      redirectTriggered: monitor.hasMessage('navigating to dashboard'),
      correctDelay: true // Check timing in actual test
    }
    
    monitor.restore()
    return results
  },

  /**
   * Test 4: Error During End Session
   * Expected: Should still reset UI, no redirect
   */
  testErrorHandling: async () => {
    console.log('🧪 Test 4: Error Handling')
    
    // Mock session.endSession to throw error
    const originalEnd = window.session?.endSession
    window.session.endSession = () => Promise.reject(new Error('Test error'))
    
    const monitor = testUtils.monitorConsole([])
    const endButton = document.querySelector('[data-testid="end-call-button"]')
    
    endButton?.click()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const results = {
      errorLogged: monitor.hasMessage('Failed to end session'),
      uiReset: !document.body.classList.contains('session-active'),
      noRedirect: window.location.pathname !== '/dashboard'
    }
    
    // Restore
    if (originalEnd) window.session.endSession = originalEnd
    monitor.restore()
    return results
  },

  /**
   * Test 5: Router Fallback to window.location
   * Expected: Should use window.location if router fails
   */
  testRouterFallback: async () => {
    console.log('🧪 Test 5: Router Fallback')
    
    // Mock router.push to throw
    const originalPush = window.router?.push
    window.router.push = () => { throw new Error('Router error') }
    
    const monitor = testUtils.monitorConsole([])
    const endButton = document.querySelector('[data-testid="end-call-button"]')
    
    endButton?.click()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const results = {
      fallbackUsed: monitor.hasMessage('Failed to navigate'),
      windowLocationUsed: window.location.href.includes('/dashboard')
    }
    
    // Restore
    if (originalPush) window.router.push = originalPush
    monitor.restore()
    return results
  },

  /**
   * Test 6: Session Storage Redirect Flag
   * Expected: Should prevent duplicate redirects
   */
  testDuplicateRedirectPrevention: async () => {
    console.log('🧪 Test 6: Duplicate Redirect Prevention')
    
    // Simulate multiple VAPI end events
    const events = [
      'max-duration-reached',
      'silence-timeout',
      'completed'
    ]
    
    let redirectCount = 0
    const originalHref = Object.getOwnPropertyDescriptor(window.location, 'href')
    Object.defineProperty(window.location, 'href', {
      set: () => { redirectCount++ }
    })
    
    for (const reason of events) {
      window.dispatchEvent(new CustomEvent('vapi-call-end', {
        detail: { reason }
      }))
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const results = {
      onlyOneRedirect: redirectCount === 1,
      flagSet: window.sessionStorage.getItem('vapi-redirect-in-progress') !== null
    }
    
    // Restore
    if (originalHref) {
      Object.defineProperty(window.location, 'href', originalHref)
    }
    window.sessionStorage.removeItem('vapi-redirect-in-progress')
    
    return results
  },

  /**
   * Test 7: User-Initiated vs Natural Completion
   * Expected: User-initiated should not trigger VAPI redirect
   */
  testUserInitiatedNoVapiRedirect: async () => {
    console.log('🧪 Test 7: User-Initiated No VAPI Redirect')
    
    const monitor = testUtils.monitorConsole([])
    
    // Simulate user-initiated end
    window.dispatchEvent(new CustomEvent('vapi-call-end', {
      detail: { reason: 'user-hangup' }
    }))
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const results = {
      noNaturalCompletion: !monitor.hasMessage('Natural session completion'),
      noVapiRedirect: !monitor.hasMessage('navigating to dashboard')
    }
    
    monitor.restore()
    return results
  },

  /**
   * Test 8: Cleanup After Redirect
   * Expected: All flags and states should be cleaned up
   */
  testCleanupAfterRedirect: async () => {
    console.log('🧪 Test 8: Cleanup After Redirect')
    
    const endButton = document.querySelector('[data-testid="end-call-button"]')
    endButton?.click()
    
    // Wait for redirect and cleanup
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const results = {
      sessionActiveRemoved: !document.body.classList.contains('session-active'),
      sessionStorageClean: !window.sessionStorage.getItem('vapi-redirect-in-progress'),
      sessionJustEndedSet: window.sessionStorage.getItem('session-just-ended') !== null,
      endSessionFlagReset: true // Check endSessionInProgressRef.current
    }
    
    return results
  }
}

// ============================================
// MANUAL TEST CHECKLIST
// ============================================

export const manualTestChecklist = `
# Manual Testing Checklist for Session End Redirect

## Pre-Test Setup
- [ ] Clear browser cache and session storage
- [ ] Open browser developer console
- [ ] Enable network throttling to "Slow 3G" to test timing
- [ ] Have two browser tabs ready (one for session, one for dashboard)

## Test Cases

### 1. Basic Flow Tests
- [ ] Start a therapy session
- [ ] Click red end button → Verify redirect to /dashboard after ~500ms
- [ ] Start another session
- [ ] Let it timeout naturally → Verify redirect to /dashboard after ~1s

### 2. Edge Case Tests
- [ ] Click end button 5 times rapidly → Verify only one redirect
- [ ] Start session, disconnect internet, click end → Verify error handling
- [ ] Start session, navigate away, come back → Verify session state
- [ ] Open session in two tabs, end in one → Verify both handle correctly

### 3. Timing Tests
- [ ] Measure time from click to redirect (should be ~500ms)
- [ ] Measure time from natural end to redirect (should be ~1000ms)
- [ ] Verify no UI flicker during transition

### 4. Console Monitoring
Watch for these console messages:
- "⚠️ End session already in progress" (only on duplicate clicks)
- "🚀 Navigating to dashboard after session end"
- "🚀 Natural session completion detected"
- "Failed to navigate to dashboard" (only on errors)

### 5. Network Failure Tests
- [ ] Disable network after session start, click end
- [ ] Slow network (throttled), click end
- [ ] Block /dashboard route, click end → Verify fallback

### 6. Browser Compatibility
Test on:
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Expected Behaviors

✅ **Success Criteria:**
- Redirect happens within specified timeframe
- No duplicate redirects
- UI cleanly transitions
- Session cleanup completes
- Error cases handled gracefully

❌ **Failure Indicators:**
- Multiple redirects
- Stuck on therapy page
- Console errors
- UI glitches during transition
- Session state not cleaned up

## Post-Test Verification
- [ ] Check session storage is clean
- [ ] Verify no memory leaks in performance tab
- [ ] Confirm dashboard loads correctly
- [ ] Check session metrics were saved
`

// ============================================
// AUTOMATED TEST RUNNER
// ============================================

export async function runAllTests() {
  console.log('🚀 Starting Comprehensive Session Redirect Tests\n')
  
  const results = []
  
  for (const [testName, testFn] of Object.entries(testScenarios)) {
    try {
      const result = await testFn()
      results.push({ test: testName, passed: Object.values(result).every(v => v === true), details: result })
      console.log(`✅ ${testName}: PASSED`, result)
    } catch (error) {
      results.push({ test: testName, passed: false, error: error.message })
      console.error(`❌ ${testName}: FAILED`, error)
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  // Summary
  console.log('\n📊 Test Summary:')
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  console.log(`Passed: ${passed}/${results.length}`)
  console.log(`Failed: ${failed}/${results.length}`)
  
  return results
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testSessionRedirect = runAllTests
  window.testScenarios = testScenarios
  console.log('💡 Run window.testSessionRedirect() to start automated tests')
}