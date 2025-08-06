# CLAUDE.md - Core Services & Utilities

Authentication, database, real-time metrics, VAPI integration, WebSocket communication.

## Auth & Database

**`auth.ts`** - NextAuth config, JWT strategy, 30-day sessions, email/password + OAuth

**`prisma.ts`** - Singleton client, connection pooling, dev/prod handling

**`custom-prisma-adapter.ts`** - NextAuth-Prisma bridge for session persistence

## VAPI Integration

**`vapi.ts`** - SDK config, transcriber, ICE servers, reconnection, token auth, WebSocket

**`vapi-server.ts`** - Server API calls, webhooks, API key mgmt, dynamic assistants

**`vapi-config-store.ts`** - User-specific configs, personalized prompts, caching

**`vapi-config-cleaner.ts`** - Removes invalid VAPI fields, ensures providers, validates configs

**`vapi-message-validator.ts`** - Message sanitization, role validation, conversation formatting

## Real-time & Supabase

**`real-time-metrics-optimized.ts`** - Metrics engine: confidence, engagement, communication analysis, incremental updates, Supabase broadcast

**`supabase-realtime-config.ts`** - Channel config, event types, typed payloads, broadcast/DB subscriptions

## Session & Transcripts

**`transcript-service-optimized.ts`** - Real-time processing, batch ops, deduplication, transactions, recovery

**`session-cache.ts`** - In-memory cache, TTL expiration, Redis-compatible interface

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

**Env Validation**: Required vars: DATABASE_URL, VAPI_API_KEY, NEXTAUTH_SECRET, JWT_TOKEN_SECRET

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

### Configuration
```env
# Level 1: Basic deterministic insights (default)
USE_DETERMINISTIC_INSIGHTS="true"

# Level 2-3: Enable enhanced comprehensive analysis
USE_ENHANCED_INSIGHTS="true"  # Analyzes all available data

# Optional: AI enhancement (not required)
ANTHROPIC_API_KEY=""  # Only if you want AI fallback
```