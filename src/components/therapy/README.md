# Therapy UI Components

This directory contains UI components extracted from the monolithic `TherapyButton.tsx` component as part of the refactoring effort to improve code maintainability and reusability.

## Components

### Button Components

- **MuteButton** - Mute/unmute microphone control
- **EndCallButton** - End therapy session button
- **PauseResumeButton** - Pause/resume session for billing optimization
- **StartTherapyButton** - Animated start session button

### Display Components

- **CallHeader** - Shows therapist name and connection status
- **LoadingAnimation** - Animated loading state with rotating messages
- **PausedOverlay** - Overlay displayed when session is paused
- **ErrorDisplay** - Error message display with dismissal option

### Container Components

- **CallControls** - Groups mute, end call, and pause/resume buttons

## Usage Example

When refactoring `TherapyButton.tsx`, these components can be imported and used as follows:

```tsx
import {
  StartTherapyButton,
  CallHeader,
  CallControls,
  LoadingAnimation,
  PausedOverlay,
  ErrorDisplay
} from './therapy'

// In the render method:
<ErrorDisplay 
  error={errorMessage} 
  onDismiss={() => setErrorMessage(null)} 
/>

<CallHeader
  therapistName={assistantConfig?.name || 'AI Therapist'}
  isPaused={isSessionPaused}
  isVisible={(isCallActive || isSessionPaused) && !isLoading}
/>

<LoadingAnimation isVisible={isCallActive && isLoading} />

<PausedOverlay 
  isPaused={isSessionPaused} 
  totalPausedMinutes={Math.floor(totalPausedTimeSeconds / 60)} 
/>

<CallControls
  isMuted={isMuted}
  isSessionPaused={isSessionPaused}
  totalPausedTimeSeconds={totalPausedTimeSeconds}
  isLoading={isLoading}
  onMuteToggle={() => setIsMuted(!isMuted)}
  onEndCall={endTherapySession}
  onPauseResume={pauseResumeSession}
/>
```

## Benefits

1. **Modularity** - Each component has a single responsibility
2. **Reusability** - Components can be used in other parts of the application
3. **Testability** - Smaller components are easier to test in isolation
4. **Maintainability** - Changes to UI elements are localized
5. **Type Safety** - Each component has well-defined TypeScript interfaces

## Testing

Test files are located in the `__tests__` directory. Run tests with:

```bash
npm test -- src/components/therapy/__tests__
```

## Future Improvements

- Add Storybook stories for visual testing
- Add accessibility tests
- Consider extracting common styles to a shared CSS module
- Add animation variants as props for customization