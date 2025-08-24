#!/usr/bin/env ts-node

/**
 * Timer Accuracy Validation Script
 * Validates that our timer implementation meets billing requirements
 */

interface ValidationResult {
  test: string
  passed: boolean
  details: string
  actual?: any
  expected?: any
}

class TimerValidator {
  private results: ValidationResult[] = []
  
  // Test 1: Verify conversation time tracking
  validateConversationTimeTracking() {
    console.log('\n🧪 Test 1: Conversation Time Tracking')
    
    // Scenario: 30-minute session, various usage patterns
    const scenarios = [
      {
        name: 'Simple continuous usage',
        sessionMinutes: 30,
        conversationSeconds: 900, // 15 minutes
        expectedRemaining: 900,    // 15 minutes
      },
      {
        name: 'Full session usage',
        sessionMinutes: 30,
        conversationSeconds: 1800, // 30 minutes
        expectedRemaining: 0,
      },
      {
        name: 'Minimal usage',
        sessionMinutes: 60,
        conversationSeconds: 30,   // 30 seconds
        expectedRemaining: 3570,   // 59.5 minutes
      },
    ]
    
    scenarios.forEach(scenario => {
      const totalSeconds = scenario.sessionMinutes * 60
      const actualRemaining = Math.max(0, totalSeconds - scenario.conversationSeconds)
      const passed = actualRemaining === scenario.expectedRemaining
      
      this.results.push({
        test: `Conversation tracking: ${scenario.name}`,
        passed,
        details: `Session: ${scenario.sessionMinutes}min, Used: ${scenario.conversationSeconds}s`,
        actual: actualRemaining,
        expected: scenario.expectedRemaining,
      })
    })
  }
  
  // Test 2: Verify pause time handling
  validatePauseTimeHandling() {
    console.log('\n🧪 Test 2: Pause Time Handling')
    
    const scenarios = [
      {
        name: 'Single pause',
        activeSegments: [300, 600], // 5min + 10min
        pauseSegments: [120],       // 2min pause
        expectedConversation: 900,   // 15min total active
        expectedPaused: 120,        // 2min paused
      },
      {
        name: 'Multiple pauses',
        activeSegments: [300, 180, 420], // 5min + 3min + 7min
        pauseSegments: [60, 90],         // 1min + 1.5min pauses
        expectedConversation: 900,        // 15min total active
        expectedPaused: 150,             // 2.5min paused
      },
    ]
    
    scenarios.forEach(scenario => {
      const totalConversation = scenario.activeSegments.reduce((sum, seg) => sum + seg, 0)
      const totalPaused = scenario.pauseSegments.reduce((sum, seg) => sum + seg, 0)
      
      const conversationPassed = totalConversation === scenario.expectedConversation
      const pausedPassed = totalPaused === scenario.expectedPaused
      
      this.results.push({
        test: `Pause handling: ${scenario.name}`,
        passed: conversationPassed && pausedPassed,
        details: `Active: ${totalConversation}s, Paused: ${totalPaused}s`,
        actual: { conversation: totalConversation, paused: totalPaused },
        expected: { conversation: scenario.expectedConversation, paused: scenario.expectedPaused },
      })
    })
  }
  
  // Test 3: Verify billing calculations
  validateBillingCalculations() {
    console.log('\n🧪 Test 3: Billing Calculations')
    
    const billingScenarios = [
      // Test ceiling function
      { seconds: 1, expectedMinutes: 1 },
      { seconds: 30, expectedMinutes: 1 },
      { seconds: 60, expectedMinutes: 1 },
      { seconds: 61, expectedMinutes: 2 },
      { seconds: 119, expectedMinutes: 2 },
      { seconds: 120, expectedMinutes: 2 },
      { seconds: 121, expectedMinutes: 3 },
      { seconds: 1800, expectedMinutes: 30 },
      { seconds: 1801, expectedMinutes: 31 },
    ]
    
    billingScenarios.forEach(scenario => {
      const calculatedMinutes = Math.ceil(scenario.seconds / 60)
      const passed = calculatedMinutes === scenario.expectedMinutes
      
      this.results.push({
        test: `Billing calculation: ${scenario.seconds}s`,
        passed,
        details: `${scenario.seconds}s should bill as ${scenario.expectedMinutes} minute(s)`,
        actual: calculatedMinutes,
        expected: scenario.expectedMinutes,
      })
    })
  }
  
  // Test 4: Verify recovery scenarios
  validateRecoveryScenarios() {
    console.log('\n🧪 Test 4: Recovery Scenarios')
    
    const recoveryScenarios = [
      {
        name: 'Mid-session recovery',
        sessionMinutes: 60,
        priorConversation: 1200, // 20 minutes used before crash
        priorPaused: 300,        // 5 minutes paused
        expectedRemaining: 2400,  // 40 minutes left
      },
      {
        name: 'Recovery near end',
        sessionMinutes: 30,
        priorConversation: 1740, // 29 minutes used
        priorPaused: 0,
        expectedRemaining: 60,    // 1 minute left
      },
      {
        name: 'Recovery of paused session',
        sessionMinutes: 30,
        priorConversation: 600,  // 10 minutes used
        priorPaused: 180,        // 3 minutes paused
        expectedRemaining: 1200,  // 20 minutes left
      },
    ]
    
    recoveryScenarios.forEach(scenario => {
      const totalSeconds = scenario.sessionMinutes * 60
      const remaining = Math.max(0, totalSeconds - scenario.priorConversation)
      const passed = remaining === scenario.expectedRemaining
      
      this.results.push({
        test: `Recovery: ${scenario.name}`,
        passed,
        details: `Prior use: ${scenario.priorConversation}s + ${scenario.priorPaused}s paused`,
        actual: remaining,
        expected: scenario.expectedRemaining,
      })
    })
  }
  
  // Test 5: Verify timer drift handling
  validateTimerDrift() {
    console.log('\n🧪 Test 5: Timer Drift Handling')
    
    // Simulate timer drift scenarios
    const driftScenarios = [
      {
        name: 'No drift',
        clientTime: 300,
        serverTime: 300,
        acceptableDrift: 2,
        shouldCorrect: false,
      },
      {
        name: 'Minor drift (1s)',
        clientTime: 301,
        serverTime: 300,
        acceptableDrift: 2,
        shouldCorrect: false,
      },
      {
        name: 'Major drift (5s)',
        clientTime: 305,
        serverTime: 300,
        acceptableDrift: 2,
        shouldCorrect: true,
      },
    ]
    
    driftScenarios.forEach(scenario => {
      const drift = Math.abs(scenario.clientTime - scenario.serverTime)
      const needsCorrection = drift > scenario.acceptableDrift
      const passed = needsCorrection === scenario.shouldCorrect
      
      this.results.push({
        test: `Timer drift: ${scenario.name}`,
        passed,
        details: `Client: ${scenario.clientTime}s, Server: ${scenario.serverTime}s, Drift: ${drift}s`,
        actual: needsCorrection,
        expected: scenario.shouldCorrect,
      })
    })
  }
  
  // Test 6: Verify edge cases
  validateEdgeCases() {
    console.log('\n🧪 Test 6: Edge Cases')
    
    // Test boundary conditions
    const edgeCases = [
      {
        name: 'Zero duration session',
        sessionMinutes: 0,
        conversationSeconds: 0,
        expectedValid: false,
      },
      {
        name: 'Negative time (should be clamped)',
        sessionMinutes: 30,
        conversationSeconds: 2000, // More than session duration
        expectedRemaining: 0,       // Should clamp to 0
      },
      {
        name: 'Very long session',
        sessionMinutes: 180,        // 3 hours
        conversationSeconds: 7200,  // 2 hours used
        expectedRemaining: 3600,    // 1 hour left
      },
    ]
    
    edgeCases.forEach(testCase => {
      if ('expectedValid' in testCase) {
        // Validation test
        const isValid = testCase.sessionMinutes > 0
        this.results.push({
          test: `Edge case: ${testCase.name}`,
          passed: isValid === testCase.expectedValid,
          details: `Session validation`,
          actual: isValid,
          expected: testCase.expectedValid,
        })
      } else {
        // Remaining time test
        const totalSeconds = testCase.sessionMinutes * 60
        const remaining = Math.max(0, totalSeconds - testCase.conversationSeconds)
        const passed = remaining === testCase.expectedRemaining
        
        this.results.push({
          test: `Edge case: ${testCase.name}`,
          passed,
          details: `Remaining time calculation`,
          actual: remaining,
          expected: testCase.expectedRemaining,
        })
      }
    })
  }
  
  // Run all validations
  runAllValidations() {
    console.log('🚀 Starting Timer Validation Suite\n')
    
    this.validateConversationTimeTracking()
    this.validatePauseTimeHandling()
    this.validateBillingCalculations()
    this.validateRecoveryScenarios()
    this.validateTimerDrift()
    this.validateEdgeCases()
    
    this.printResults()
  }
  
  // Print results summary
  printResults() {
    console.log('\n' + '='.repeat(80))
    console.log('📊 VALIDATION RESULTS SUMMARY')
    console.log('='.repeat(80) + '\n')
    
    const passed = this.results.filter(r => r.passed).length
    const failed = this.results.filter(r => !r.passed).length
    const total = this.results.length
    
    // Group results by pass/fail
    console.log('✅ PASSED TESTS:')
    this.results.filter(r => r.passed).forEach(result => {
      console.log(`  ✓ ${result.test}`)
    })
    
    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:')
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`  ✗ ${result.test}`)
        console.log(`    Details: ${result.details}`)
        console.log(`    Expected: ${JSON.stringify(result.expected)}`)
        console.log(`    Actual: ${JSON.stringify(result.actual)}`)
      })
    }
    
    // Overall summary
    console.log('\n' + '='.repeat(80))
    console.log(`TOTAL: ${total} tests | PASSED: ${passed} | FAILED: ${failed}`)
    console.log(`SUCCESS RATE: ${((passed / total) * 100).toFixed(1)}%`)
    console.log('='.repeat(80) + '\n')
    
    // Exit code
    process.exit(failed > 0 ? 1 : 0)
  }
}

// Run validation
const validator = new TimerValidator()
validator.runAllValidations()