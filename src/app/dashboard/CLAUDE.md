# CLAUDE.md - Dashboard Pages & Data Flow

Therapy progress insights, session management, real-time analytics. Next.js 15 App Router.

## Pages

**Main** (`/dashboard`): Progress cards, upcoming sessions, quick actions, real-time status

**Therapy** (`/therapy/`): Session interface, recovery, VAPI integration, refactored hooks

**Others**: Profile (user/family info), Sessions (history/scheduling), Resources (education), Admin (VAPI mgmt)

## Data Flow

**Real-time**: VAPI → MetricsBridge → Supabase → Dashboard  
**Static**: DB → API → SWR → Components  
**Updates**: Actions → API → DB → Supabase → Real-time

**Components**: `CommunicationMetrics`, `RelationshipProgressCard`, `SessionTimeChart`, `UpcomingSessions`

## State & Design

**State**: Local (tabs/filters), Global (auth/metrics/recovery), SWR caching, Supabase real-time

**Responsive**: Mobile nav <lg, desktop sidebar ≥lg, adaptive grids/cards/charts

## Performance

**Data**: SWR 30s refresh, 10s dedupe, userId cache keys, 3 retries

**Components**: React.memo charts, lazy load heavy components, Suspense skeletons

## Error & Security

**Errors**: Error boundaries with retry, skeleton loaders, throw → catch → fallback

**Security**: Filter by userId, exclude sensitive data, verify auth, select only needed fields

## Testing & Pitfalls

**Testing**: SWRConfig wrapper, skeleton verification, mock APIs, waitFor async

**Pitfalls**: WebSocket cleanup, sync conflicts, re-renders (memoize), over-fetching, 44px touch targets, stale cache
- Loading feedback → Clear UI states
- Error recovery → Retry mechanisms

## Future Enhancements
Advanced analytics, goal tracking, PDF exports, notification center, PWA features

## 🔐 Dashboard Permission Flow & Persistence

**Complete flow with proper acceptance handling:**

1. **Initial Visit**: Dashboard → ClinicalDisclaimerModal shows (via useDisclaimerCheck)
2. **User Accepts**: 
   - Clears `dashboardDisclaimerDeclined` flag
   - Sets `dashboardPermissionGranted` flag  
   - Saves to database via API
   - Dashboard loads normally
   - **Disclaimer never shows again** (database remembers acceptance)
3. **User Declines**: "I'll review later" → Sets `dashboardDisclaimerDeclined` flag → Shows DashboardPermissionPrompt
4. **Persistence**: Permission page shows on EVERY dashboard visit until "Grant Permissions" clicked
5. **Grant Flow**: "Grant Permissions" → Clears flag → Reloads → Shows disclaimer modal again

**Key Implementation Details:**
- **Database Check**: `useDisclaimerCheck` checks if user accepted in database
- **If accepted in DB**: Automatically clears any declined flags, never shows permission page
- **localStorage flags**:
  - `dashboardDisclaimerDeclined` - Set on decline, cleared on grant or if accepted in DB
  - `dashboardPermissionGranted` - Set on accept
- **Permission page only shows if**: User hasn't accepted in DB AND clicked "Review Later"
- **Disclaimer modal never shows if**: Already accepted in database

## Communication Metrics Fix (April 2026)

**Root causes of 0% metrics after completed sessions:**

1. **`therapyType` wrong in completion routes** — enhanced route defaulted to 'couple'; non-enhanced didn't invalidate dashboard cache → use `sessionType` DB field, call `dashboardCache.invalidateOnSessionComplete()` in all completion paths
2. **Case sensitivity** — `generateMetricsFromSession` compared uppercase Prisma enum `'SOLO'` against lowercase `'solo'` → always normalize with `.toLowerCase()`
3. **`mapSessionToTherapyType` in `dashboard-cache.ts`** — missing `lowerType === 'solo'` check → SOLO sessions never invalidated the right cache bucket
4. **API caching zero values** — communication-metrics route cached results even when all values were 0 → added `shouldCache` guard and `metricsAreAllZero` fallback to transcript analysis
5. **Duplicate metric records** — `calculateMetrics()` (good values, runs first) then `generateMetricsFromSession()` (zero values, wrong type, runs second) → `findFirst(DESC)` picked the second one → made `generateMetricsFromSession` upsert-aware: skip if non-zero exists, repair zero records, create if absent

**Key files:** `src/app/api/dashboard/communication-metrics/route.ts`, `src/lib/cache/dashboard-cache.ts`, `src/app/api/sessions/[id]/metrics-helper.ts`, `src/app/api/sessions/[id]/complete/enhanced/route.ts`

## Dashboard API Optimization (Jan 2025)

### Performance Improvements
- Dashboard queries optimized from >1000ms to ~500ms
- Request deduplication prevents concurrent API calls
- Comprehensive error boundaries on all dashboard components
- Unified loading states for consistent UX

### Validation & Safety
- Use `dashboard-error-handler.ts` for consistent error handling
- Number safety with `sanitizeNumber()` and `sanitizePercentage()` from `dashboard-schemas.ts`
- Zod schemas for all dashboard data validation