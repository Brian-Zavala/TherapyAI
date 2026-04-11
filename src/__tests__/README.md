# Credit Deduction Integration Testing Suite

This comprehensive testing suite validates all credit deduction scenarios in our therapy platform to ensure accurate billing, prevent race conditions, and maintain data integrity.

## 📋 Overview

The test suite covers critical scenarios including:
- Manual session completion with credit deduction
- VAPI webhook completion with credit deduction  
- Concurrent completion attempts (race condition prevention)
- Failed credit deduction scenarios
- Timing reconciliation with different source combinations
- Zero-minute sessions and edge cases
- Browser crash simulation and error recovery
- Idempotency testing to prevent double charging

## 🚀 Quick Start

### Prerequisites

1. Node.js 18+ installed
2. All project dependencies installed: `npm install`
3. Environment variables configured (see `.env.example`)
4. Database connection available (for integration tests)

### Running Tests

```bash
# Run all credit deduction tests
npm run test:credit-deduction

# Run all tests with coverage
npm run test:coverage

# Run tests in watch mode during development
npm run test:watch

# Run specific test file in watch mode
npm run test:credit-deduction:watch

# Run tests for CI/CD (no watch, with coverage)
npm run test:ci

# Debug tests with Node.js debugger
npm run test:debug
```

## 📁 File Structure

```
src/__tests__/
├── README.md                           # This file
├── credit-deduction-integration.test.ts # Main test suite
└── utils/
    ├── test-helpers.ts                 # Mock data factories
    ├── test-scenarios.ts               # Pre-defined test scenarios
    ├── test-validators.ts              # Assertion helpers
    └── performance-helpers.ts          # Performance testing utilities
```

## 🧪 Test Categories

### 1. Manual Session Completion Tests
Validates the flow when users manually end therapy sessions through the UI.

```typescript
describe('Manual Session Completion', () => {
  it('should deduct credits when user manually ends session')
  it('should handle concurrent manual completion attempts')
  it('should prevent completion of already completed session')
})
```

### 2. VAPI Webhook Completion Tests
Tests the automated completion flow triggered by VAPI webhook events.

```typescript
describe('VAPI Webhook Completion', () => {
  it('should delegate to SessionLifecycleManager')
  it('should handle fallback when lifecycle manager fails')
})
```

### 3. Race Condition Prevention Tests
Ensures concurrent operations don't cause double charging or data corruption.

```typescript
describe('Race Condition Prevention', () => {
  it('should prevent double credit deduction from concurrent calls')
  it('should handle idempotency keys correctly')
})
```

### 4. Timing Reconciliation Tests
Validates accurate billing through reconciliation of timing from multiple sources.

```typescript
describe('Timing Reconciliation', () => {
  it('should prioritize VAPI timing over client/server')
  it('should handle missing VAPI data gracefully')
  it('should apply pause time adjustments')
})
```

### 5. Edge Case Tests
Covers unusual scenarios and error conditions.

```typescript
describe('Zero-Minute Sessions', () => {
  it('should handle zero-minute sessions without charging')
  it('should complete zero-minute sessions without credit deduction')
})

describe('Browser Crash Simulation', () => {
  it('should handle missing client timing data')
})
```

## 🛠 Test Utilities

### Mock Data Factories
Located in `utils/test-helpers.ts`, these functions create consistent test data:

```typescript
// Create mock session
const session = createMockSession({
  conversationTimeSeconds: 1200,
  status: SessionStatus.ACTIVE
});

// Create mock credits
const credits = createMockCredits({
  totalCredits: 160,
  usedCredits: 20,
  planType: 'essential'
});

// Create mock reconciliation result
const reconciliation = createMockReconciliation({
  actualMinutes: 20,
  confidence: 0.9,
  source: 'vapi'
});
```

### Pre-defined Scenarios
Located in `utils/test-scenarios.ts`, these provide complete test scenarios:

```typescript
// Zero-minute session
const scenario = TestScenarios.zeroMinuteSession();

// Browser crash simulation
const scenario = TestScenarios.browserCrashSession();

// Pro plan user
const scenario = TestScenarios.proPlanSession();
```

### Validation Helpers
Located in `utils/test-validators.ts`, these provide assertion utilities:

```typescript
// Validate credit deduction
TestValidators.validateCreditDeduction(transaction, 20, sessionId, userId);

// Validate timing reconciliation
TestValidators.validateReconciliation(result, 20, 'vapi', 0.9);

// Validate completion response
TestValidators.validateCompletionResponse(response, 20);
```

### Performance Testing
Located in `utils/performance-helpers.ts`, these help with performance validation:

```typescript
// Measure operation duration
const { result, duration } = await PerformanceHelpers.measureDuration(operation);

// Run concurrent operations
const { results, totalDuration } = await PerformanceHelpers.runConcurrent(operations);

// Load testing
const loadResults = await PerformanceHelpers.loadTest(operation, 50);
```

## 📊 Test Coverage

The test suite aims for comprehensive coverage of:

### Core Functionality (100% target)
- ✅ Credit deduction logic
- ✅ Timing reconciliation
- ✅ Session lifecycle management
- ✅ Idempotency mechanisms

### Error Scenarios (95% target)
- ✅ Database connection failures
- ✅ Redis connection failures
- ✅ VAPI webhook failures
- ✅ Insufficient credits
- ✅ Concurrent operation conflicts

### Edge Cases (90% target)
- ✅ Zero-minute sessions
- ✅ Browser crashes
- ✅ Extreme durations
- ✅ Negative timing values
- ✅ Missing data scenarios

## 🚨 Critical Test Scenarios

### Scenario 1: Race Condition Prevention
**Importance**: Prevents double charging users
**Test**: Concurrent completion requests should only process once
**Validation**: Check idempotency mechanisms and database locks

### Scenario 2: Timing Reconciliation
**Importance**: Ensures accurate billing
**Test**: Multiple timing sources should reconcile to correct billable time
**Validation**: VAPI timing prioritized, confidence scoring accurate

### Scenario 3: Zero-Minute Sessions
**Importance**: Prevents billing for non-sessions
**Test**: Sessions with no conversation time should not charge credits
**Validation**: No credit deduction, proper completion flow

### Scenario 4: Browser Crash Recovery
**Importance**: Handles real-world connectivity issues
**Test**: Missing client timing should not prevent accurate billing
**Validation**: Server/VAPI timing used, reduced confidence noted

## 🔧 Configuration

### Jest Configuration
Located in `jest.config.js`:
- Next.js integration with `next/jest`
- TypeScript support
- Module path mapping for `@/` aliases
- 30-second timeout for integration tests
- Serial execution to prevent race conditions

### Mock Setup
Located in `jest.setup.js`:
- Global mocks for external services
- Environment variable configuration
- Database and Redis client mocking
- Error suppression for test noise

### Environment Variables
Required for testing:
```bash
NEXTAUTH_SECRET=test-secret-key-for-jest-testing
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://test:test@localhost:5432/test
UPSTASH_REDIS_REST_URL=test-redis-url
UPSTASH_REDIS_REST_TOKEN=test-redis-token
VAPI_API_KEY=test-vapi-key
VAPI_ORG_ID=test-vapi-org
```

## 📈 Performance Thresholds

### Response Time Targets
- Session completion: < 5 seconds
- Credit deduction: < 2 seconds  
- Timing reconciliation: < 1 second
- Concurrent operations: < 10 seconds total

### Memory Usage
- Test suite should not consume > 512MB
- Individual test should not leak memory
- Garbage collection monitored

### Concurrency Limits
- Support up to 50 concurrent operations
- Graceful degradation beyond limits
- No data corruption under load

## 🐛 Debugging Tests

### Common Issues

1. **Test Timeouts**
   ```bash
   # Increase timeout in jest.config.js
   testTimeout: 60000 // 60 seconds
   ```

2. **Mock Conflicts**
   ```bash
   # Clear mocks between tests
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

3. **Database Connection**
   ```bash
   # Ensure test database is available
   # Check DATABASE_URL environment variable
   ```

4. **Race Conditions in Tests**
   ```bash
   # Run tests serially
   npm run test:credit-deduction -- --maxWorkers=1
   ```

### Debug Mode
```bash
# Start debugger
npm run test:debug

# Connect with VS Code or Chrome DevTools
# Breakpoints will be honored
```

### Verbose Output
```bash
# Show detailed test output
npm run test -- --verbose

# Show console logs from tests
npm run test -- --verbose --no-silent
```

## 🚀 Continuous Integration

### GitHub Actions
The test suite integrates with CI/CD:

```yaml
# .github/workflows/test.yml
- name: Run Credit Deduction Tests
  run: npm run test:ci
  
- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

### Pre-commit Hooks
Recommended setup:
```bash
# Install husky for git hooks
npm install --save-dev husky

# Run tests before commit
npx husky add .husky/pre-commit "npm run test:credit-deduction"
```

## 📝 Writing New Tests

### Test Structure
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup mocks and test data
  });

  it('should handle specific scenario', async () => {
    // Arrange
    const mockData = createMockSession();
    
    // Act
    const result = await operationUnderTest(mockData);
    
    // Assert
    TestValidators.validateExpectedBehavior(result);
  });
});
```

### Best Practices
1. **Descriptive Names**: Test names should describe behavior, not implementation
2. **Arrange-Act-Assert**: Clear separation of test phases
3. **Mock Isolation**: Each test should be independent
4. **Data Factories**: Use helpers for consistent test data
5. **Error Testing**: Test both success and failure paths
6. **Performance**: Include timing validations for critical paths

### Adding New Scenarios
1. Add scenario to `utils/test-scenarios.ts`
2. Create test in main test file
3. Add validation helpers if needed
4. Update documentation

## 📋 Maintenance

### Regular Tasks
- Review test coverage monthly
- Update mocks when APIs change
- Performance threshold review quarterly
- Scenario coverage assessment bi-annually

### Updating Tests
When modifying credit deduction logic:
1. Update affected test scenarios
2. Verify mock data still represents reality
3. Check performance thresholds remain valid
4. Run full test suite before deployment

### Monitoring
- Test execution time trends
- Coverage percentage changes
- Failure rate analysis
- Performance regression detection

## 🤝 Contributing

### Adding Tests
1. Identify the scenario to test
2. Create appropriate mocks using helpers
3. Write descriptive test cases
4. Add performance validations
5. Update documentation

### Reporting Issues
Include:
- Test scenario description
- Expected vs actual behavior
- Error messages and stack traces
- Environment details
- Steps to reproduce

## 📚 References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [Next.js Testing](https://nextjs.org/docs/testing)
- [Project Architecture Documentation](../docs/)
- [Credit System Integration Plan](../docs/CREDIT-SYSTEM-INTEGRATION-PLAN.md)
- [VAPI Integration Guide](../VAPI-COMPLETE-GUIDE.md)