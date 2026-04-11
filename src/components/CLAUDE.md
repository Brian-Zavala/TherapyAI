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

**`AIInsightsWithTabs`** — Primary insights component on dashboard. Therapy type tabs (Solo/Couple/Family) + insight cards + collapsible "Dive Deeper" sections:
- **Action Plan** (green) — Weekly goals (numbered) + focus areas (badge pills). Accordion toggle.
- **Your Strengths** (purple) — Identified therapy strengths as animated badges.
- **Daily Tips & Exercises** (blue) — Daily practices, weekly recommendations, therapeutic exercises.
- Data comes from `personalizedTips` and `summary` in `/api/therapy-insights` response.
- `ComprehensiveTherapyInsightsUnified` exists but is NOT used — `AIInsightsWithTabs` is the active component.

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

### Text Sizing (ALWAYS use breakpoints - INCLUDING LARGE SCREENS)
- **Main Titles**: `text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl`
- **Headings**: `text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl`
- **Subheadings**: `text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl`
- **Body text**: `text-sm sm:text-base md:text-lg lg:text-xl`
- **Small text**: `text-xs sm:text-sm lg:text-base`
- **Metric Values**: `text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl`
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

### Element Sizing (WITH LARGE SCREEN SUPPORT)
- **Large elements**: `w-48 sm:w-64 md:w-80 lg:w-96 xl:w-112 2xl:w-128`
- **Medium elements**: `w-32 sm:w-48 md:w-56 lg:w-64`
- **Small elements**: `w-1.5 h-1.5 sm:w-2 sm:h-2` (like dots)
- **Buttons**: `px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base lg:text-lg`
- **Icons**: `h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 xl:h-8 xl:w-8`
- **Card Icons**: `w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14`

### Spacing (PROGRESSIVE SCALING FOR ALL SCREENS)
- **Margins**: `mb-4 sm:mb-6 md:mb-8 lg:mb-10 xl:mb-12`
- **Padding**: `p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7 2xl:p-8`
- **Container Padding**: `px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12`
- **Gaps**: `gap-4 sm:gap-5 md:gap-6 lg:gap-8 xl:gap-10`
- **Small gaps**: `gap-0.5 sm:gap-1 lg:gap-2` for tight element groups

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

### 🎨 Glassmorphism Effect (REQUIRED FOR ALL CARDS)
- **Background**: `bg-white/10` for transparency
- **Blur**: `backdrop-blur-lg` for frosted glass effect
- **Border**: `border border-white/20` for subtle edges
- **Shadow**: `shadow-xl` for depth and elevation
- **Hover State**: `hover:bg-white/15 hover:border-white/30`
- **Inner Elements**: `bg-white/20 backdrop-blur-md` for nested cards

### 🎯 Text Alignment (CRITICAL)
- **Card Headers/Titles**: Always `text-center` with `justify-center` for ALL screen sizes
- **Card Content/Metrics**: Always `text-center` to maintain consistency
- **Body Text**: Can use `text-center` or justified based on content type
- **NEVER use `sm:text-left`** for card headers - they must remain centered

### 📐 Container Width & Max-Width (CRITICAL FOR LARGE SCREENS)
- **Dashboard Container**: `max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1920px]`
- **Content Sections**: Maintain proper max-widths to prevent text sprawl
- **Grid Layouts**: `grid-cols-1 md:grid-cols-2 xl:grid-cols-2` with responsive gaps

### Testing Requirements
- **iPhone SE (375x667)** - Smallest supported
- **iPhone 12/13 (390x844)** - Standard mobile
- **Tablet (768x1024)** - Medium screens
- **Desktop (1920x1080)** - Large screens
- **4K Displays (3840x2160)** - Ultra-wide screens

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

## 💳 Credit Display System

**`CreditDisplay.tsx`** — Shows available/total/used credits with visual indicators
- **Position**: Fixed top-right, responsive (`top-20` mobile, `top-24` tablet, `top-4` desktop), `z-[35]`
- **Integration**: Dashboard, therapy, and sessions pages with error boundary wrapper
- **Data Fetching**: React Query with exponential backoff polling (5s → 10s → 20s) — reduces API calls 70%
- **Real-time countdown**: Decrements every 30s during active VAPI sessions (local timer, syncs on end)
- **Events**: Listens for `sessionStarted`/`sessionEnded` window events

**Key Points:**
- Free tier: 30 credits (30 min/month) | Pro tier: Unlimited
- No SSE/WebSocket — Upstash Redis doesn't support pub/sub
- Wrap in error boundary to prevent UI crashes from API failures
- Stripe price IDs via env vars only — never hardcode

## 🐛 Profile System Known Issues

### Profile Update Flow
1. `ProfileClient.tsx` → Form state with `isInitialized` flag
2. `ProfileProvider.tsx` → React Query optimistic updates
3. `/api/user/profile/route.ts` → Transaction-based updates (User, UserProfile, FamilyMember)
4. Database → Run `npm run prisma:db:push` if schema mismatch errors

### Critical Fixes Applied
- **Variable Scope**: `familyMembersToCreate` used outside transaction → Added `familyMembersCreatedCount` tracker
- **Loading Flicker**: Form showed empty before data → Added `isInitialized` flag + `ProfileLoadingSpinner`
- **Array Fields**: `currentConcerns`/`preferredDays` need comma-separated input handling
- **Error Handling**: Empty `{}` errors → Enhanced JSON/text parsing with user-friendly messages

### Checklist
✅ All form fields in `handleUpdate` spread  
✅ Array fields handled specially (currentConcerns, preferredDays)  
✅ Age fields parsed `string → integer`  
✅ Transaction variables hoisted before transaction scope  
✅ Loading waits for both `profile` data AND `isInitialized`  

## 📚 Mistakes — Components & Credit Display

**MISTAKE**: `useEffect` with `refetch` dependency placed before `useQuery` declaration
- **Error**: `ReferenceError: Cannot access 'refetch' before initialization`
- **FIX**: Move event listener `useEffect` AFTER `useQuery` hook
- **LESSON**: Declare `useQuery` before any `useEffect` that uses its return values

**MISTAKE**: Implemented SSE with Upstash Redis using `duplicate()` and `subscribe()`
- **Error**: 500 — methods don't exist on Upstash Redis client
- **FIX**: Use React Query polling + window events instead
- **LESSON**: Upstash Redis ≠ traditional Redis. Verify library capabilities before implementation.

**MISTAKE**: `useClerkSession` created new session object references every render
- **Error**: Infinite re-render loops in hooks using session as dependency
- **FIX**: Wrap session in `useMemo` with stable primitive deps (`clerkUser?.fullName`, `dbUserId`)
- **LESSON**: Hooks returning objects must memoize them. Use `.user?.id` not the object as deps.