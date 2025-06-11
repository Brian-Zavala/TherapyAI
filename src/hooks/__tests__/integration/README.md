# Integration Tests for TherapyButton Components

## Purpose

Integration tests validate the end-to-end workflows and interactions between multiple components in the therapy session system. Unlike unit tests that isolate individual functions, integration tests ensure that complex component interactions work correctly together.

### Integration vs Unit Tests

- **Unit Tests**: Test individual hooks and functions in isolation with mocked dependencies
- **Integration Tests**: Test complete workflows across multiple components, hooks, and external services
- **Focus**: Real-world user scenarios and cross-component communication

## Test Scenarios Coverage

### Core Integration Workflows

1. **Complete Session Lifecycle**
   - User clicks therapy button → Duration selection → VAPI session start → Transcript handling → Session completion
   - Tests: TherapyButton + SessionDurationModal + VAPI hooks + Transcript service + Session management

2. **Session Recovery Flow**
   - Active session detection → Recovery modal → Session reconnection → Transcript sync
   - Tests: Session recovery system + VAPI reconnection + Real-time metrics + Transcript continuity

3. **Error Handling & Fallbacks**
   - VAPI connection failures → User notification → Recovery options → Graceful degradation
   - Tests: Error boundaries + User feedback + Session state management

4. **Real-time Data Synchronization**
   - Live transcript updates + Session metrics + Progress tracking + WebSocket connections
   - Tests: Real-time metrics + Transcript streaming + Session state sync

### Key Integration Points

#### 1. VAPI Session Management
```typescript
// Integration: TherapyButton → useVapiSession → VAPI SDK → Session state
- Session initialization with personalized config
- Real-time session state updates
- Audio stream management
- Session termination handling
```

#### 2. Transcript Processing Pipeline
```typescript
// Integration: VAPI events → useTranscriptHandler → Database → UI updates
- Real-time transcript capture from VAPI
- Transcript processing and storage
- UI updates with live transcript display
- Batch processing for performance optimization
```

#### 3. Session State Management
```typescript
// Integration: useSessionManagement → Database → UI components → Recovery system
- Session creation and updates
- State persistence across page refreshes
- Recovery from unexpected disconnections
- Session completion and cleanup
```

#### 4. UI Component Orchestration
```typescript
// Integration: Multiple modals + Session components + Real-time updates
- Modal state management and transitions
- Component communication through shared state
- Real-time UI updates during sessions
- Error state handling and user feedback
```

## Test Environment Setup

### Prerequisites
- Jest testing framework
- React Testing Library
- MSW (Mock Service Worker) for API mocking
- JSDOM environment for browser APIs

### Mock Strategy
```typescript
// Mock external services while testing real component interactions
- VAPI SDK: Mock WebSocket connections and events
- Database: Mock Prisma operations
- WebSocket: Mock real-time connections
- Audio APIs: Mock browser audio interfaces
```

## Running Integration Tests

### Commands
```bash
# Run all integration tests
npm run test:integration

# Run specific integration test suite
npm run test:integration -- TherapyButton.integration.test.tsx

# Run integration tests in watch mode
npm run test:integration -- --watch

# Run integration tests with coverage
npm run test:integration -- --coverage
```

### Test File Naming Convention
```
ComponentName.integration.test.tsx
WorkflowName.integration.test.tsx
```

## Test Structure & Organization

### File Organization
```
/src/hooks/__tests__/integration/
├── TherapyButton.integration.test.tsx     # Main therapy button workflows
├── SessionRecovery.integration.test.tsx   # Session recovery scenarios
├── TranscriptFlow.integration.test.tsx    # Transcript processing workflows
├── RealTimeMetrics.integration.test.tsx   # Live metrics and WebSocket tests
├── ErrorHandling.integration.test.tsx     # Error scenarios and fallbacks
└── helpers/
    ├── test-utils.tsx                     # Integration test utilities
    ├── mock-providers.tsx                 # Mock context providers
    └── scenario-builders.tsx              # Test scenario builders
```

### Test Categories

#### 1. Happy Path Scenarios
- Complete session from start to finish
- Successful session recovery
- Real-time data synchronization

#### 2. Error Scenarios
- Network connection failures
- VAPI service errors
- Database connection issues
- Browser API failures

#### 3. Edge Cases
- Rapid user interactions
- Multiple concurrent sessions
- Session state corruption
- Browser refresh during sessions

#### 4. Performance Tests
- Large transcript handling
- High-frequency real-time updates
- Memory leak detection
- Component rendering performance

## Key Metrics & Assertions

### Session Flow Validation
```typescript
// Verify complete session lifecycle
expect(sessionState.status).toBe('completed');
expect(transcriptEntries.length).toBeGreaterThan(0);
expect(sessionMetrics.duration).toBeCloseTo(expectedDuration, 1);
```

### Real-time Synchronization
```typescript
// Verify real-time updates
await waitFor(() => {
  expect(transcriptDisplay).toContainText(latestTranscriptEntry);
  expect(sessionTimer).toDisplayTime(currentSessionTime);
});
```

### Error Recovery
```typescript
// Verify graceful error handling
expect(errorNotification).toBeVisible();
expect(recoveryOptions).toBeEnabled();
expect(sessionState.canRecover).toBe(true);
```

## Best Practices

### 1. Test Real User Workflows
- Focus on complete user journeys, not isolated component behavior
- Test the most common user paths thoroughly
- Include error scenarios users might encounter

### 2. Mock External Dependencies Appropriately
- Mock external services (VAPI, Database) but keep component interactions real
- Use realistic mock data that matches production scenarios
- Maintain mock consistency across test scenarios

### 3. Verify Cross-Component Communication
- Test that state changes propagate correctly between components
- Verify event handling and callback execution
- Ensure proper cleanup and memory management

### 4. Performance Considerations
- Test with realistic data volumes (long transcripts, extended sessions)
- Verify no memory leaks in long-running sessions
- Test performance under high-frequency updates

### 5. Async Operations Handling
- Properly wait for async operations to complete
- Test race conditions and timing-sensitive operations
- Verify proper loading states and user feedback

## Maintenance & Updates

### When to Update Integration Tests
- New features added to therapy session workflow
- Changes to VAPI integration or configuration
- Database schema updates affecting session data
- UI/UX changes impacting user workflows

### Test Review Process
- Integration tests should be reviewed alongside feature changes
- Test scenarios should be validated against real user usage patterns
- Performance benchmarks should be updated with significant changes

---

*Last Updated: January 2025*
*Next Review: When major therapy session features are added or modified*