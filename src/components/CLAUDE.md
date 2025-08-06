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
- **Mobile-first padding**: `px-3 sm:px-4 md:px-6` or `p-3 sm:p-4 md:p-6`
- **Border radius**: `rounded-lg sm:rounded-xl` for responsive corners

### Text Sizing (ALWAYS use breakpoints)
- **Headings**: `text-2xl sm:text-3xl md:text-4xl lg:text-5xl`
- **Subheadings**: `text-lg sm:text-xl md:text-2xl`
- **Body text**: `text-sm sm:text-base md:text-lg`
- **Small text**: `text-xs sm:text-sm`
- **Line height**: Add `leading-tight` or `leading-relaxed` as needed

### Mobile-Specific Success/Error Messages (Jan 2025 Update)
- **Container**: `p-3 sm:p-4` padding, `rounded-lg sm:rounded-xl`
- **Title + Message**: Use `flex flex-col sm:flex-row` for stacking on mobile
- **Title**: `text-base sm:text-lg font-semibold`
- **Message**: `text-sm sm:text-base` 
- **Subtitle/Helper**: `text-xs sm:text-sm opacity-70`
- **Icons**: `w-5 h-5 sm:w-6 sm:h-6` for proper scaling
- **Layout**: `flex items-start sm:items-center` to align properly on mobile
- **Icon alignment**: Add `mt-1 sm:mt-0` to icons when text wraps

### Element Sizing
- **Large elements**: `w-48 sm:w-64 md:w-80 lg:w-96`
- **Medium elements**: `w-32 sm:w-48 md:w-56`
- **Small elements**: `w-1.5 h-1.5 sm:w-2 sm:h-2` (like dots)
- **Buttons**: `px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base`
- **Icons in messages**: `w-5 h-5 sm:w-6 sm:h-6`

### Spacing (use responsive values)
- **Margins**: `mb-4 sm:mb-6 md:mb-8`
- **Padding**: `p-3 sm:p-4 md:p-6`
- **Gaps**: `gap-3 sm:gap-4 md:gap-6`
- **Small gaps**: `gap-0.5 sm:gap-1` for tight element groups

### Flexbox Patterns for Mobile
- **Responsive direction**: `flex flex-col sm:flex-row`
- **Alignment**: `items-start sm:items-center`
- **Wrapping**: Add `flex-wrap` when needed
- **Shrinking**: Use `flex-shrink-0` for icons, `flex-1 min-w-0` for text
- **Text overflow**: Add `min-w-0` to flex children to prevent text overflow

### Interactive Elements
- **ALWAYS add**: `cursor-pointer` to clickable elements
- **Hover states**: Include responsive hover effects
- **Touch targets**: Minimum 44px on mobile
- **Icon positioning**: Add `mt-1 sm:mt-0` to align with multi-line text

### Background & Overlays
- **Gradients**: Ensure full viewport coverage with `fixed inset-0`
- **Modals**: Use proper z-index stacking (10000+)
- **Pointer events**: Use `pointer-events-none` on decorative overlays
- **Shimmer effects**: Animate with `animate-shimmer` class

### Testing Requirements
- **iPhone SE (375x667)** - Smallest supported
- **iPhone 12/13 (390x844)** - Standard mobile
- **Tablet (768x1024)** - Medium screens
- **Desktop (1920x1080)** - Large screens

### Breakpoint Reference
- **xs**: 480px (custom defined in tailwind.config.mjs)
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

⚠️ **NEVER use fixed sizes without responsive alternatives!**
⚠️ **ALWAYS test text readability on 375px width devices!**
⚠️ **Prevent text cramping with proper flex patterns and min-w-0!**

## Profile Loading Animation (Jan 2025)

**ProfileLoadingSpinner.tsx** - Modern animated loading state
- Multi-ring morphing animations with GPU acceleration
- Responsive scaling: `scale-75 sm:scale-90 md:scale-100 lg:scale-110`
- Letter wave animation for "Loading profile..."
- Performance optimized with `will-change` and `translateZ(0)`
- Full viewport coverage with `fixed inset-0 w-full h-full`