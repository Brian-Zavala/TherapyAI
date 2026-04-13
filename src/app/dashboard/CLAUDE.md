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

**Components**: `AIInsightsWithTabs`, `CommunicationMetricsWithTabs`, `RelationshipProgressWithTabs`, `UpcomingSessions`

## State & Design

**State**: Local (tabs/filters), Global (auth/metrics/recovery), SWR caching, Supabase real-time

**Responsive**: Mobile nav <lg, desktop sidebar ≥lg, adaptive grids/cards/charts

## Performance

**Data**: SWR 30s refresh, 10s dedupe, userId cache keys, 3 retries

**Session End → Dashboard**: Session completion API returns after critical path only (status + credits + billing). Background work (metrics verification, email, SMS, AI insights) runs via `after()` from `next/server`. Client navigates to dashboard immediately — no 500ms delay.

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

## AI Insights Data Flow (April 2026)

`/api/therapy-insights` returns `ComprehensiveInsights` with:
- `insights[]` — Individual insight cards (rendered as expandable cards)
- `summary.weeklyGoals[]`, `summary.focusAreas[]`, `summary.topStrengths[]` — Action Plan + Strengths collapsibles
- `personalizedTips.daily[]`, `personalizedTips.weekly[]`, `personalizedTips.exercises[]` — Daily Tips collapsible
- `trends.communication`, `trends.emotional`, `trends.consistency` — Progress overview bar

`AIInsightsWithTabs` renders all of this via the `useTherapyTypeData` hook. The collapsible "Dive Deeper" sections (Action Plan, Strengths, Daily Tips) are accordion-style — only one open at a time. They only render when the API returns data for that section.

## Personalized Resources

`/api/resources` matches curated resources to users by topic, session type, and therapy progress. Seeded via `scripts/seed-resources.mjs` or `/api/admin/seed-resources`. Resources link to Therapist Aid, GoodTherapy, and Open Library.

## 📚 Mistakes — Dashboard & Metrics

**MISTAKE**: `therapyType` defaulted to 'couple' in `complete/enhanced/route.ts`; `generateMetricsFromSession` compared uppercase `'SOLO'` against lowercase `'solo'`
- **Error**: Communication Metrics always 0% for solo/family sessions
- **FIX**: `.toLowerCase()` normalization on all DB enum comparisons; use `sessionType` DB field not theme text
- **LESSON**: Prisma enums are uppercase. Always normalize with `.toLowerCase()` before comparing.

**MISTAKE**: Supabase `postgres_changes` payloads compared with lowercase status strings
- **Error**: Session-completed toast never fired, modal never auto-closed
- **FIX**: `?.toUpperCase() === 'COMPLETED'` in all 8 affected files
- **LESSON**: Supabase realtime delivers raw PostgreSQL row data — enums come as uppercase. Never compare lowercase without normalizing.

**MISTAKE**: `handleContinueActiveSession` detected therapy type from theme string
- **Error**: Solo/family sessions resumed with couple therapist (wrong voice + system prompt)
- **FIX**: Use `sessionData.sessionType` DB field as primary source in `therapy/client.tsx`
- **LESSON**: Theme text is user-visible and unreliable. Always use authoritative DB enum field for program logic.