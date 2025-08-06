# CLAUDE.md - React Components

UI components: sessions, modals, dashboard, animations. TypeScript + Framer Motion + TailwindCSS 4.

## Core Session Components

**Refactored**: `TherapyButtonWrapper` (routing) → `TherapyButtonRefactored` ✅ PRIMARY | `TherapyButton` ⚠️ LEGACY

**Session UI**: `SessionTimer[V2]`, `SessionDurationModal`, `ActiveSessionFoundModal`, `SessionRecoveryNotification`, `VoiceWaveform`, `SessionNotes`, `SessionTranscript`

## Therapy UI (`/therapy/`)

`StartTherapyButton`, `CallControls` (mute/pause/end), `CallHeader`, `PauseResumeButton`, `MuteButton`, `EndCallButton`, `PausedOverlay`, `ErrorDisplay`, `LoadingAnimation`

**Optimized Components**: `PauseResumeButtonOptimized`, `PausedOverlayOptimized`, `EndCallButtonOptimized`, `CallControlsOptimized` + `/components/`: `ActiveSessionFoundModalOptimized`, `SessionEndModalOptimized` (memo, responsive, a11y, animations)

## Modals

✅ Portal: `SessionDurationModal`  
⚠️ Need Portal: `FamilyMemberSelectionModal`, `RemoveMemberConfirmationModal`, `ActiveSessionFoundModal`, `TherapyTypeSelector`

## Dashboard (`/dashboard/`)

`CommunicationMetrics`, `RelationshipProgressCard`, `SessionTimeChart`, `UpcomingSessions`

## Animation

`SpiralPathAnimation`, `SpiralTextAnimation`, `TypewriterText`, `VoiceWaveform`, `ScrollDownArrow`

## UI Foundation (`/ui/`)

`aurora-background`, `therapeutic-bokeh-background`, `therapy-lamp`, `glass-card`, `hero-highlight`, `images-slider`, `confetti-animation`

## Utilities

`OptimizedImage`, `ImagePreloader`, `ButtonWithSound`, `MusicPlayer`, `Navigation`, `SupabaseConnectionStatus`

## Session Flow

`TherapyButtonWrapper` → Feature Flag → `TherapyButtonRefactored` ✅ (or `TherapyButton` legacy)  
→ `SessionDurationModal` → `TherapyTypeSelector` → VAPI Start → `SessionTimer` + `CallControls`  
Recovery: Page Refresh → `ActiveSessionFoundModal` → Session Recovery

**Refactored**: Modular hooks, inline VAPI config, better error handling

**State**: Session hooks, real-time updates, auto-recovery, error boundaries

**Animations**: Framer Motion, therapeutic theme, performance optimized, a11y aware

## Component Chain

**Refactored**: `TherapyButtonWrapper` → `TherapyButtonRefactored` (hooks: VAPI, session, transcript, sound) → `SessionDurationModal` → Active UI (`SessionTimer`, `VoiceWaveform`, `SessionTranscript`, `SessionNotes`, `CallControls`)

**Modals**: Controlled (`isOpen`/`onClose`), escape/backdrop handling, focus trap, ❗ MUST use React Portals

**Portal Pattern**: Use `createPortal` with `modal-root`, z-index 10000+, SSR check (`isClient`)

**Dashboard Flow**: `useRealTimeMetrics()` → `CommunicationMetrics`, `RelationshipProgressCard`, `SessionTimeChart`, `UpcomingSessions`

## Patterns

**Compound**: `<SessionControls>` with `.Timer`, `.Mute`, `.Pause`, `.End`

**Render Props**: `<VoiceWaveform>{({ isActive, amplitude }) => ...}</VoiceWaveform>`

**Event Delegation**: Sound via `useButtonSound`, unified analytics, error boundaries

## Styling

**TailwindCSS**: Base classes + variant objects, mobile-first, 44px touch targets

**Animations**: `.therapy-fade-in`, `.therapy-slide-up`, `.therapy-scale`

## Testing

**Tests**: Unit, integration, a11y in `__tests__/`

**Mocks**: `mockVapiSession` with connection/mute/pause/duration states

## Performance

**Optimize**: `React.memo`, `useMemo`/`useCallback`, lazy loading, `OptimizedImage`

**Bundle Split**: `lazy(() => import('./SessionTranscript'))`

**Memory**: Cleanup timers/listeners/animations, manage WebSocket lifecycle

## Pitfalls

**Sessions**: Sync state sources, prevent duplicate recovery, use conversation time, handle audio permissions

**Modals**: Use Portals (CSS stacking), z-index 10000+, focus trap, prevent body scroll, SSR check

**Animations**: GPU acceleration (transform/opacity), avoid layout thrashing, cleanup, respect reduced motion

## Integration

**Backend**: SWR/React Query, WebSocket subscriptions, consistent error handling

**VAPI**: Direct SDK integration, lifecycle events, connection error recovery

**State**: Context (global), local (component), localStorage (persistence)

## Accessibility

**Screen Reader**: Semantic HTML, ARIA labels, live regions

**Keyboard**: Logical tab order, shortcuts, clear focus indicators

**Motor**: 44px touch targets, hover feedback, timing controls

## 📱 Responsive Design Guidelines (CRITICAL)

**ALWAYS follow these responsive patterns for ALL components:**

### Container Layout
- **Full viewport coverage**: Use `fixed inset-0 w-full h-full` NOT `min-h-screen`
- **Scrollable content**: Add `overflow-y-auto` to content containers
- **Mobile-first padding**: `px-4 py-8` with responsive increases

### Text Sizing (ALWAYS use breakpoints)
- **Headings**: `text-3xl sm:text-4xl md:text-5xl lg:text-6xl`
- **Subheadings**: `text-xl sm:text-2xl md:text-3xl`
- **Body text**: `text-base sm:text-lg md:text-xl`
- **Small text**: `text-xs sm:text-sm`
- **Line height**: Add `leading-tight` or `leading-relaxed` as needed

### Element Sizing
- **Large elements**: `w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96`
- **Medium elements**: `w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:w-64`
- **Buttons**: `px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg`

### Spacing (use responsive values)
- **Margins**: `mb-6 sm:mb-8 md:mb-10 lg:mb-12`
- **Padding**: `p-4 sm:p-6 md:p-8`
- **Gaps**: `gap-4 sm:gap-6 md:gap-8`

### Interactive Elements
- **ALWAYS add**: `cursor-pointer` to clickable elements
- **Hover states**: Include responsive hover effects
- **Touch targets**: Minimum 44px on mobile

### Background & Overlays
- **Gradients**: Ensure full viewport coverage with `fixed inset-0`
- **Modals**: Use proper z-index stacking (10000+)
- **Pointer events**: Use `pointer-events-none` on decorative overlays

### Testing Requirements
- **iPhone SE (375x667)** - Smallest supported
- **iPhone 12/13 (390x844)** - Standard mobile
- **Tablet (768x1024)** - Medium screens
- **Desktop (1920x1080)** - Large screens

⚠️ **NEVER use fixed sizes without responsive alternatives!**

## Profile Loading Animation (Jan 2025)

**ProfileLoadingSpinner.tsx** - Modern animated loading state
- Multi-ring morphing animations with GPU acceleration
- Responsive scaling: `scale-75 sm:scale-90 md:scale-100 lg:scale-110`
- Letter wave animation for "Loading profile..."
- Performance optimized with `will-change` and `translateZ(0)`
- Full viewport coverage with `fixed inset-0 w-full h-full`