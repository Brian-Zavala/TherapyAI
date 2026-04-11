# CLAUDE.md - Core Services & Utilities

Authentication, database, real-time metrics, VAPI integration, WebSocket communication.

## Auth & Database

**`auth.ts`** - Clerk auth helpers. `getAuthSession()` is the drop-in replacement for `getServerSession(authOptions)`. Resolves Clerk user → DB user via `clerkId` or email. Auto-creates users and initializes credits.

**`prisma.ts`** - Singleton client, connection pooling, dev/prod handling

**REMOVED**: `custom-prisma-adapter.ts`, `auth-optimized.ts`, `next-auth-config.ts`, `auth/session-cache.ts`, `auth/session-optimized.ts` (all NextAuth-specific)

## VAPI Integration

**`vapi.ts`** - SDK config, transcriber, ICE servers, reconnection, token auth, WebSocket. Contains `getPersonalizedSystemPromptForType()` which builds system prompts for solo/couple/family therapy. Injects `previousSessionContext` from `userProfile` into all three prompts as a `PREVIOUS SESSION MEMORY` block when prior `SessionSummary` records exist.

**`vapi-server.ts`** - Server API calls, webhooks, API key mgmt, dynamic assistants

**`vapi-config-store.ts`** - User-specific configs, personalized prompts, caching

**`vapi-config-cleaner.ts`** - Removes invalid VAPI fields, ensures providers, validates configs

**`vapi-message-validator.ts`** - Message sanitization, role validation, conversation formatting

**`therapeutic-insight-engine.ts`** - Generates `SessionSummary` after each session (keyThemes, emotionalJourney, breakthroughMoments, challengeAreas, nextSessionFocus, contextForNextSession). These are read at session START by `/api/vapi/assistant` to populate `previousSessionContext`. The `getTherapeuticContext()` method exists but is unused — context is fetched directly in the API route for simpler control.

**`services/vapi-instance-manager.ts`** - Singleton managing VAPI SDK instance lifecycle. `getOrCreateInstance(token)` is now called eagerly when JWT first becomes available (in `TherapyButtonRefactored`) so instance construction is off the critical path at session start.

## Real-time & Supabase

**`real-time-metrics-optimized.ts`** - Metrics engine: confidence, engagement, communication analysis, incremental updates, Supabase broadcast

**`supabase-realtime-config.ts`** - Channel config, event types, typed payloads, broadcast/DB subscriptions

## Session & Transcripts

**`transcript-service-optimized.ts`** - Real-time processing, batch ops, deduplication, transactions, recovery. `getPreviousSessionsTranscript()` fetches `/api/sessions` and filters by `status?.toUpperCase() === 'COMPLETED'` (API returns uppercase Prisma enums).

**`transcript-service.ts`** - Same as above (legacy version). Same uppercase fix applies.

**`session-cache.ts`** - In-memory cache, TTL expiration, Redis-compatible interface

**`sessions/[id]/metrics-helper.ts`** - `generateMetricsFromSession()` and `analyzeTranscriptForMetrics()`. Both normalize `therapyType` with `.toLowerCase()` on entry. `generateMetricsFromSession` is upsert-aware: skips existing non-zero `CommunicationMetric`/`ProgressTracking` records (keeps `calculateMetrics()` result), repairs all-zero legacy records, creates if absent.

**`cache/dashboard-cache.ts`** - Server-side dashboard cache. `mapSessionToTherapyType()` uses `lowerType === 'solo'` (not just theme text) to map `SOLO` sessions to the 'solo' cache bucket. `invalidateOnSessionComplete()` must be called after ALL session completion paths.

**`utils/session-status.ts`** - Normalization helpers: `normalizeSessionStatus()`, `isSessionCompleted()`, `isSessionActive()`. Use these instead of raw string comparisons when dealing with session status values from mixed sources (API vs Supabase realtime).

## Utilities

**`utils.ts`** - Date formatting, validation, string manipulation, memoized functions

**`fileLogger.ts`** - Structured logging, file rotation, dev/prod modes, error tracking

**`env-validation.ts`** - Runtime env validation, clear error messages

**`sms-service[.mock].ts`** - Twilio SMS, templates, delivery tracking, dev mock

## Architecture

**Layers**: API Routes → Service Layer → Database/External APIs/Cache  
WebSocket Server ← Service Layer ← Real-time Metrics

**Flows**: Request (API→Service→DB), Real-time (VAPI→Metrics→WS→Client), Session (Client→Config→Start→Track)

## Patterns

**Singleton**: DB client (dev: global.prisma, prod: new instance)

**Factory**: VAPI config creation based on user/therapy type

**Observer**: Metrics broadcasting to WebSocket subscribers
## Performance

**Database**: Connection pooling, query optimization, batch ops, strategic caching

**Memory**: Channel cleanup, TTL cache, streaming for large data, explicit GC

**Real-time**: Incremental metrics calculation with caching

## Configuration

**Env Validation**: Required vars: DATABASE_URL, VAPI_API_KEY, CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, JWT_TOKEN_SECRET

**Feature Flags**: realTimeMetrics, enhancedTranscription, advancedAnalytics (env-based)

## Error Handling

**ServiceError**: Custom error class with code, statusCode, details

**Supabase Recovery**: Auto-reconnect, auth refresh on AUTH errors

## Security

**Auth**: JWT validation, bcrypt hashing, secure sessions

**API**: Rate limiting, input validation, CORS config

**Data**: Encryption (rest/transit), audit logging, GDPR/CCPA compliance

## Integration

**External**: VAPI error handling, logging, ServiceError wrapping

**Database**: Transaction patterns for complex ops (session complete = update + metrics + progress)

## Testing

**Unit**: Mock externals, edge cases, env validation

**Integration**: Test DB, WebSocket lifecycle, sandbox APIs

**Performance**: Load testing, memory profiling, query optimization

## Monitoring

**Logging**: Structured logs with service/operation/data/duration

**Metrics**: Performance (response/throughput/errors), Business (completion/engagement), System (memory/connections)

**Health Checks**: DB, VAPI, WebSocket, Cache - return status + details

## 🔥 Welcome Email Infinite Loop Fix (Jan 2025)

### Problem
- Infinite welcome emails sent after user onboarding
- SMS failures caused continuous retries, triggering duplicate emails
- Multiple notification systems running in parallel

### Solution: Redis Deduplication Pattern
```typescript
// In src/lib/welcome-messages.ts
const dedupKey = `welcome_sent:${user.id}`
const lockAcquired = await redis.set(dedupKey, '1', {
  nx: true,     // SETNX - only set if not exists
  ex: 86400 * 7 // 7 days TTL
})
```

### Key Changes
1. **Redis SETNX**: Prevents concurrent sends & duplicates
2. **Partial Success = Complete**: Email OR SMS success marks as sent
3. **Permanent Failure Detection**: No retries for invalid phones, rate limits
4. **Cleanup on Total Failure**: Redis key removed to allow retry

### Files Modified
- `welcome-messages.ts` - Added Redis deduplication
- `queue/background-jobs.ts` - Re-enabled processing
- API integration in `/api/user/profile/route.ts`

## Notification System Architecture

### Current Systems (4 parallel systems - needs consolidation)
1. **Job Queue** (`background-jobs.ts`) - Primary system with Redis/Upstash
2. **Enhanced Scheduler** (`enhanced-scheduler/`) - Advanced features
3. **Notification Worker** (`notification-worker.ts`) - Background processing
4. **Direct API** (`/api/reminders/send`) - Immediate sends

### Deduplication Strategy
- **Redis Keys**: `welcome_sent:{userId}` with 7-day TTL
- **Database Flag**: `welcomeMessageSent` + `welcomeMessageSentAt`
- **Job Queue**: Check for pending jobs before enqueueing
- **Partial Success**: Any channel success = complete (no retries)

## Cache Management

**`session-cache.ts`** - In-memory cache with TTL expiration
**`profile-cache.ts`** - User profile caching with invalidation patterns
**Key Pattern**: `profile:*${email}*` for comprehensive cache clearing

## Optimized Queries

**`optimized-user-queries.ts`** - Parallel queries reducing 2514ms → ~500ms
- Splits User.findUnique into parallel queries
- Selective field loading
- Efficient relationship loading

## Session Memory Architecture (April 2026)

**Write path** (end of session): `TherapeuticInsightEngine.processSession()` → creates `SessionSummary` with `processingStatus: 'completed'`

**Read path** (start of next session): `/api/vapi/assistant` fetches last 3 completed `SessionSummary` records in the same `Promise.all` as session count + last session queries. Builds `previousSessionContext` string from `contextForNextSession`, `nextSessionFocus`, `breakthroughMoments`, `challengeAreas`. Passes via `userProfile.previousSessionContext` → `getPersonalizedAssistantConfig()` → `getPersonalizedSystemPromptForType()` → injected as `PREVIOUS SESSION MEMORY` block in system prompt.

**Critical**: Prisma relation in `SessionSummary` is `Session` (capital S) — always use capital in `select`/`include` queries. Verified against `SessionSummaryInclude` generated type.

## 🧠 Enhanced Insights System (EXPANDED - Jan 2025)

### Overview
Comprehensive multi-tiered insights system providing deep, evidence-based therapy insights without requiring external AI APIs. Analyzes 20+ metrics including conversation dynamics, attachment patterns, and temporal trends.

### Three Levels of Analysis

#### Level 1: Deterministic Insights (Default)
- **9 Evidence-Based Patterns** from Gottman Method & EFT
- **Zero API Costs** - completely self-contained
- **Instant Response** - pattern matching in milliseconds
- **Core Metrics**: Communication, emotional, engagement, balance scores

#### Level 2: Enhanced Insights (Optional)
- **20+ Advanced Metrics**:
  - Communication Quality: clarity, empathy, respect, listening, expression (0-100)
  - Conversation Dynamics: interruption rate, turn-taking, emotional synchrony
  - Topic Analysis: depth, variety, problem vs solution focus
  - Attachment Patterns: secure, anxious, avoidant indicators
- **6 Sophisticated Patterns** with therapy exercises
- **Personalized Resources**: Books, videos, worksheets

#### Level 3: Comprehensive Analysis (With Enhanced Mode)
- **Transcript Analysis**: 
  - Sentiment breakdown by speaker
  - Emotional moment detection with intensity
  - Topic flow and depth measurement
  - Speaker pattern analysis (questions, affirmations, interruptions)
- **Temporal Insights**:
  - Session consistency tracking
  - Progress velocity calculation
  - Optimal timing identification
- **Merged Intelligence**: Combines all engines for maximum insight

### Key Files
- `deterministic-insights-engine.ts`: 9 core patterns
- `enhanced-insights-engine.ts`: 6 advanced patterns + exercises  
- `comprehensive-insights-service.ts`: Full analysis integration
- `ai-insight-generator.ts`: Main entry point
- `dynamic-insights-service.ts`: Main dashboard insights generator — stores extras in `metadata` JSON (see `prisma/CLAUDE.md` for AIInsight schema)
- `daily-tip-scheduler.ts`: Rotates daily tips from recent insights — reads `category`/`actionItems` from `metadata`
- `session-completion-handler.ts`: Triggers insight regeneration + milestone detection on session complete

### Personalized Resources
- `resources/resource-matcher.service.ts`: Matches resources to users by topic, session type, and progress
- `resources/resource-seed-data.ts`: 32 curated resources with real URLs (Therapist Aid, GoodTherapy)
- `resources/open-library-client.ts`: Fetches book data from Open Library API
- `resources/seed-resources.ts`: Seeds resources into database
- `/api/resources/route.ts`: GET endpoint — returns matched resources for authenticated user

### Configuration
```env
# Level 1: Basic deterministic insights (default)
USE_DETERMINISTIC_INSIGHTS="true"

# Level 2-3: Enable enhanced comprehensive analysis
USE_ENHANCED_INSIGHTS="true"  # Analyzes all available data

# Optional: AI enhancement (not required)
ANTHROPIC_API_KEY=""  # Only if you want AI fallback
```

## 🔐 Authentication: Clerk

**CRITICAL**: Uses Clerk, NOT NextAuth. All NextAuth code removed.

- **`auth.ts`** — `getAuthSession()` is the drop-in for `getServerSession(authOptions)`. Resolves Clerk user → DB user via `clerkId` or email. Auto-creates users + initializes credits.
- **`useClerkSession`** — `src/hooks/useClerkSession.ts` — drop-in for `useSession()` from next-auth/react. Uses `useMemo` for stable object references.
- **Middleware** — `src/middleware.ts` uses `clerkMiddleware()` with rate limiting
- **Webhook** — `/api/webhooks/clerk/route.ts` handles user sync events

### Environment Variables
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/intro
CLERK_WEBHOOK_SECRET=whsec_...
```

### Key Details
- `getAuthSession()` calls Clerk `auth()` + `currentUser()`, then finds/creates DB user
- User table has `clerkId` field for Clerk-to-DB linking
- Credits auto-initialized for all users (free tier: 30 min)
- `jsonwebtoken` MUST use lazy `import()` — top-level imports crash Turbopack

### Removed Files (NextAuth)
`next-auth-config.ts`, `auth-optimized.ts`, `custom-prisma-adapter.ts`, `auth/session-cache.ts`, `auth/session-optimized.ts`, `src/types/next-auth.d.ts`

## 🚨 VAPI Session Critical Fixes

**READ `/VAPI-COMPLETE-GUIDE.md` BEFORE any VAPI changes.**

1. **JWT Expiration**: Must be < 3600s (use 3599) — `vapi-jwt-redis.service.ts`
2. **Inline Config**: Pass clean config to `vapi.start()`:
   ```typescript
   vapi.start({
     transcriber: { provider: 'deepgram', model: 'nova-3' },
     model: { provider: 'anthropic', model: 'claude-3', tools: [...] },
     voice: { provider: '11labs', voiceId: '...' },
     firstMessage: "Hello...",
   })
   ```
3. **Tools location**: Must be in `model.tools`, NOT at root level
4. **Invalid fields** (cause 400): `variableValues`, `metadata`, `recordingEnabled`, `hipaaEnabled`, `responseDelaySeconds`, `llmRequestDelaySeconds`, `functions` (root), `backgroundDenoisingEnabled`
5. **ElevenLabs Voice IDs** (April 2026):
   - Dr. Elliot (solo): `XmUeU0FRyne67Dy7UaT4`
   - Dr. Maya (couples): `0G7xjh2pNSLRvJSpklE4`
   - Dr. Jada (family): `zQjGMGv0jjccPqAwHqqv`
   - Set via: `NEXT_PUBLIC_VAPI_ELLIOT_VOICE_ID`, `NEXT_PUBLIC_VAPI_MAYA_VOICE_ID`, `NEXT_PUBLIC_VAPI_JADA_VOICE_ID`
   - `pipeline-error-eleven-labs-voice-disabled-by-owner` = voice ID invalid/disabled
6. **Model Names**: Use real models (`gpt-4o-mini`, not `gpt-5-mini`) — invalid model = Daily.co ejection
7. **Prisma Enums**: Uppercase — `COMPLETED`, `ACTIVE`, `SOLO`, `COUPLE`, `FAMILY`, `PAUSED`
8. **Ejection on session end**: Expected from Daily.co when `endCall` tool fires — treated as normal call-end in `useVapiSession.ts`

### VAPI Success Indicators
```
✅ VAPI call started successfully
📞 VAPI started, starting conversation timer
📨 VAPI Message: speech-update → transcript → conversation-update
📊 METRICS: Confidence: 20% → 40% → 80% → 95%
```

## 💳 Credit System Key Components

- **`services/credit-manager.service.ts`** — core credit ops, Redis caching with robust error handling
- **`services/vapi-session-manager.ts`** — session limit enforcement, grace period logic
- **`services/vapi-instance-manager.ts`** — singleton VAPI SDK instance, pre-warmed on JWT ready

### Redis Caching Pattern
Always wrap `JSON.parse()` in try-catch in Redis ops — Upstash can return objects instead of strings:
```typescript
try {
  const raw = await redis.get(key);
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
} catch (e) {
  await redis.del(key); // auto-clear invalid cache
}
```

## 📚 Mistakes & Lessons — Auth & VAPI

**MISTAKE**: Top-level `import jwt from 'jsonwebtoken'` in `vapi/token/route.ts`
- **Error**: `TypeError: Cannot read properties of undefined (reading 'prototype')` — Turbopack crash
- **FIX**: `const jwt = (await import('jsonwebtoken')).default`
- **LESSON**: Always use lazy dynamic `import()` for `jsonwebtoken`

**MISTAKE**: `findOrCreateUser` returned early without initializing credits
- **Error**: Credits 0/0 for migrated users
- **FIX**: `ensureCreditsExist(user.id)` in all 3 code paths (clerkId found, email found, new user)
- **LESSON**: When migrating auth, run all init side effects in every code path

**MISTAKE**: Used `session` (lowercase) as Prisma relation field in `SessionSummary` queries
- **Error**: Prisma silently returned `undefined` — session dates showed as fallbacks
- **FIX**: Use `Session` (capital S) — verify against `SessionSummaryInclude` generated type
- **LESSON**: Always verify Prisma relation field names against `node_modules/.prisma/client/index.d.ts`

**MISTAKE**: `sessionsCompleted: sessions.length` used array length instead of real count
- **Error**: Milestone detection, Session #N numbering, behavior switches broken for returning users
- **FIX**: Hoist `completedSessionCount` outside try block, assign from DB count inside
- **LESSON**: Hoist result variables before try blocks when building objects from fetched data

**MISTAKE**: `SessionSummary` context written at session end but never read at session start
- **Error**: VAPI had no memory of previous sessions despite rich DB data
- **FIX**: Fetch last 3 `SessionSummary` records in `/api/vapi/assistant`, inject as `previousSessionContext`
- **LESSON**: Check that data written at session END is READ at session START — write-only pipelines are invisible bugs

**MISTAKE**: `dynamic-insights-service.ts`, `daily-tip-scheduler.ts`, `session-completion-handler.ts` used nonexistent fields on `AIInsight` (`status`, `priority`, `category`, `actionItems`, `basedOn`, `evidence`) and `DynamicGoal` (`type` instead of `goalType`, lowercase `'active'` instead of `'ACTIVE'`)
- **Error**: `Unknown argument 'status'` Prisma runtime error — insights always fell back to generic hardcoded content
- **FIX**: Map to real schema fields (`type`, `importance`, `actionable`), store extras in `metadata` JSON. Use `goalType` and uppercase `GoalStatus` enum. Anchor dynamic insights to user's most recent completed session for valid `sessionId` FK.
- **LESSON**: `@ts-nocheck` hides schema mismatches. Always verify Prisma field names against `schema.prisma` — the TypeScript compiler can't catch errors when type checking is disabled.