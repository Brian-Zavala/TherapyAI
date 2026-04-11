# CLAUDE.md - React Hooks

Custom hooks for auth, sessions, real-time metrics, VAPI integration. Refactored from 4,431-line TherapyButton.tsx.

## Core Hooks

**`useAuth`** - Clerk session management, returns `{ user, isAuthenticated, isLoading, logout }`

**`useClerkSession`** - Drop-in replacement for `useSession()` from next-auth/react. Uses `useMemo` for stable object references. Returns `{ data: session, status }`.

**`useTherapySessionRecovery`** - Detects/recovers interrupted sessions, conversation-time based validation, deduplication logic

**`useSupabaseRealTimeMetrics`** - Real-time metrics via Supabase channels, provider/consumer roles

**`useSupabaseSessionState`** - Pause/resume/end states via Supabase, DB subscriptions, broadcast events

**`useVapiMetricsBridge`** - Bridges VAPI events → Supabase broadcasting

## Session Hooks

**`useVapiSession`** - VAPI voice AI lifecycle, supports assistant IDs + inline configs, Dec 2024: fixed init order, memoized callbacks

**`useVapiToken`** ⚠️ - JWT management, auto-refresh, rate limiting (20/15min, 5/min burst), user switch protection. Token fetch starts on component mount when session is authenticated. By the time a user selects a session duration, the token should already be loaded — the polling fallback in `startVAPISession` is for edge cases only.

**`useSessionManagement`** - High-level orchestration across VAPI/DB/UI

**`useTranscriptHandler`** - Real-time transcript processing from VAPI

## Utility Hooks

**`useButtonSound`** - Click sounds with volume control

**`usePersistentOnboarding`** - Multi-step onboarding with localStorage

## Hook Flow

`useAuth` → `useTherapySessionRecovery` → `useVapiSession` (+ `useVapiToken`) → `useSessionManagement` → `useTranscriptHandler`

Realtime: `useVapiMetricsBridge` → `useSupabaseRealTimeMetrics` ← `useSupabaseSessionState`

## Patterns

**Session Recovery**: Mount → Check active sessions → Validate conversation time → Auto-restart if valid → Deduplication

**Supabase Realtime**: Broadcast (ephemeral), Database (persistent), Presence (tracking) - Auto-reconnect, proper cleanup

**Auth**: Clerk auth via `useClerkSession`, memoized session object to prevent re-renders, DB user ID resolution via `/api/auth/me`

## Common Issues

**Recovery**: HMR duplicates, use `conversationTimeSeconds` not wall-clock, check status, implement cooldowns

**Supabase**: Set NEXT_PUBLIC_SUPABASE_ANON_KEY, handle unauth users, cleanup channels, enable table realtime

**Memory**: Clear timers/channels/listeners in cleanup

## Performance

**Optimize**: `useCallback` for handlers, minimal deps, batch state updates, throttle broadcasts (1s/30s)

**Resources**: Reuse channels, immediate cleanup, careful localStorage use

## Integration

**DB**: Recovery via `/api/sessions/active`, metrics broadcast + periodic persist

**VAPI**: SDK lifecycle coordination, real-time transcript processing, state preservation

**UI**: Auth drives routing, session state controls UI, metrics power dashboard

## 🔧 Session Completion Architecture

**Race Condition Prevention**: 
- Both `useSessionManagementV2` and `useSupabaseSessionState` call `/api/sessions/{id}/complete`
- Session-level locks in API prevent duplicate processing
- First request processes, second gets cached result
- Both hooks work independently but share completion logic

**Cleanup Sequence**:
1. Clear pending timeouts
2. Clear pending transcript chunks  
3. Cleanup metrics calculator
4. Broadcast session end event

**Error Handling**:
- Proper error serialization (no more empty `{}` objects)
- Graceful degradation on cleanup failures
- Detailed logging for debugging

## Session Pause Fix (Jan 2025)

**Problem**: 400 error "Session is already paused" due to duplicate API calls
**Root Cause**: `session.pauseSession()` → PATCH, then `sessionState.pauseSession()` → POST
**Solution**: Removed duplicate call in TherapyButtonRefactored.tsx:1563-1565
**Idempotent Endpoint**: `/api/sessions/[id]/pause` now returns success if already paused
**Pause Flow**: Client → sessionState.pauseSession() → VAPI pause → DB update → Broadcast