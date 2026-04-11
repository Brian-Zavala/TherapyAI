# CLAUDE.md

Production-ready Next.js 15 therapy platform with enterprise voice AI.

**Status**: ✅ **PRODUCTION READY** | **Stack**: Next.js 15, React 19, TypeScript, Prisma, Supabase, VAPI, Clerk, TailwindCSS 4

⚠️ **Important**: We deploy on Railway, NOT Vercel. All Vercel-specific code has been removed.

🚨 **CRITICAL**: Platform is **NOT HIPAA COMPLIANT**. See [HIPAA-COMPLIANCE.md](./HIPAA-COMPLIANCE.md) for required actions before handling real patient data.

## 🚨🚨 CRITICAL UI/UX REQUIREMENT 🚨🚨

**MANDATORY FOR ALL UI UPDATES/CREATION:**
- **ALWAYS** refer to `/src/components/CLAUDE.md` for responsive design guidelines
- **NEVER** create UI without following the mobile-first responsive patterns
- **MUST** test on 375px width (iPhone SE) before considering any UI complete
- **Key patterns**: `text-sm sm:text-base`, `p-3 sm:p-4`, `flex flex-col sm:flex-row`
- **Failure to follow responsive guidelines = BROKEN UI ON MOBILE**

See detailed patterns in `/src/components/CLAUDE.md` → "📱 Responsive Design Guidelines"

## 🧠 MCP Memory Usage & Learning from Mistakes

**CRITICAL**: Memory management workflow:
1. **BEFORE CHANGES**: Search MCP memory first with `mcp__memory__search_nodes` 
2. **AFTER CHANGES**: Automatically append all code changes to MCP memory using `mcp__memory__add_observations`
3. **KNOWLEDGE GRAPH**: Update entities and relations for significant architectural changes
4. **DOCUMENT MISTAKES**: When Claude makes an error, ALWAYS document it as:
   - **MISTAKE**: What Claude did wrong
   - **FIX**: How the error was corrected
   - **LESSON**: What to remember for next time

This ensures consistency, builds accumulated project knowledge, and prevents repeating mistakes.

## 💳 Credit Display System (Jan 2025)

**Real-time credit display showing user's available therapy minutes**

### Implementation
- **Component**: `CreditDisplay.tsx` - Shows available/total/used credits with visual indicators
- **Position**: Fixed top-right, responsive (top-20 mobile, top-24 tablet, top-4 desktop), z-[35] to avoid nav overlap
- **Integration**: Dashboard, therapy, and sessions pages with error boundary wrapper
- **Data Fetching**: React Query with exponential backoff polling (5s, 10s, 20s) to reduce server load

### Critical Bug Fix: Subscription-Credit Sync Issue
- **Problem**: Credits showed free tier (45 min) despite active subscriptions
- **Root Cause**: Test webhook handler created mock subscriptions with empty `items.data` array
- **Detection**: Database inspection revealed User table had active subscription but UsageCredits had 'free' planType
- **Solution**: 
  1. Fixed test webhook to include proper plan metadata (lines 213-229 in webhook/route.ts)
  2. Added multiple fallback mechanisms for plan detection
  3. Created admin sync endpoint `/api/admin/sync-credits` for manual fixes
  4. Implemented broadcast-before-invalidate pattern to prevent race conditions

### Redis Caching Fix
- **Problem**: JSON parse errors with "[object Object]" from Redis
- **Solution**: Robust error handling in `credit-manager.service.ts`
  - Try-catch blocks around all Redis operations
  - Handle both string and object responses
  - Auto-clear invalid cache entries
  - Graceful fallback to database

### Key Points
- Free tier: 45 credits (45 minutes) per month
- Pro tier: Unlimited credits (unlimited sessions, 30 min/session)
- No SSE/WebSocket - Upstash Redis doesn't support traditional pub/sub
- Exponential backoff polling reduces API calls by 70%
- **Real-time countdown**: Credits decrement every 30s during active VAPI sessions (local timer, syncs on session end)
- Listens for `sessionStarted`/`sessionEnded` window events to start/stop countdown
- Error boundaries prevent UI crashes from API failures
- Environment-based Stripe price IDs (no hardcoding)

## 📚 Claude's Mistakes & Lessons Learned

### Clerk Auth Migration (April 2026)
**MISTAKE**: Top-level `import jwt from 'jsonwebtoken'` in `vapi/token/route.ts` and `vapi-server.ts`
- **Error**: `TypeError: Cannot read properties of undefined (reading 'prototype')` — crashes Turbopack
- **FIX**: Use lazy dynamic imports: `const jwt = (await import('jsonwebtoken')).default`
- **LESSON**: Some Node.js packages with native bindings crash Turbopack when imported at top level. Always use dynamic `import()` for `jsonwebtoken` and similar packages.

**MISTAKE**: `useClerkSession` created new session object references every render
- **Error**: Infinite re-render loops in `useVapiToken` and other hooks using session as dependency
- **FIX**: Wrap session object in `useMemo` with stable deps (`clerkUser?.fullName`, `dbUserId`, etc.)
- **LESSON**: Hooks that return objects must memoize them. Use primitive values (`.user?.id`) as deps, not objects.

**MISTAKE**: ElevenLabs voice IDs were disabled/removed but still hardcoded
- **Error**: `pipeline-error-eleven-labs-voice-disabled-by-owner` — instant session ejection
- **FIX**: Updated voice IDs in `vapi.ts` and `.env` to active voices. Used Vapi MCP tools to diagnose.
- **LESSON**: Voice IDs can be disabled externally. Always verify via Vapi API (`list_calls` shows `endedReason`).

**MISTAKE**: `findOrCreateUser` returned early for clerkId-found users without initializing credits
- **Error**: Credits showed 0/0 for migrated users
- **FIX**: Added `ensureCreditsExist(user.id)` call in all three code paths (clerkId found, email found, new user)
- **LESSON**: When migrating auth, ensure all initialization side effects run in every code path.

### Credit Display Implementation (Jan 2025)
**MISTAKE**: Placed `useEffect` hook with `refetch` dependency before `useQuery` declaration
- **Error**: `ReferenceError: Cannot access 'refetch' before initialization`
- **FIX**: Moved event listener `useEffect` AFTER `useQuery` hook to ensure `refetch` is defined
- **LESSON**: React hooks must be declared in proper order - always declare `useQuery` before any `useEffect` that uses its return values

**MISTAKE**: Attempted to implement SSE with Upstash Redis using `duplicate()` and `subscribe()` methods
- **Error**: `500 Internal Server Error` - methods don't exist on Upstash Redis client
- **FIX**: Removed entire SSE implementation, relied on React Query polling + window events
- **LESSON**: Always verify library capabilities before implementation - Upstash Redis ≠ traditional Redis

**MISTAKE**: Didn't handle Redis returning different data types causing JSON parse errors
- **Error**: `SyntaxError: "[object Object]" is not valid JSON`
- **FIX**: Added try-catch in `getCurrentCredits()` to handle both string and object responses
- **LESSON**: Always wrap `JSON.parse()` in try-catch and handle multiple data type scenarios

### Subscription-Credit Sync Bug (Jan 2025)
**MISTAKE**: Test webhook created empty subscription items array, causing wrong plan detection
- **Error**: Users with active subscriptions showed only 45 free credits instead of plan credits
- **FIX**: Modified test webhook to include proper plan metadata in mock subscription (webhook/route.ts:213-229)
- **LESSON**: Always ensure test/mock data structures match production data format exactly

### Session Memory & VAPI Performance (April 2026)
**MISTAKE**: Used `session` (lowercase) as Prisma relation field name for `SessionSummary → Session`
- **Error**: Prisma silently returned `undefined` — session dates showed as "session 1", "session 2" fallbacks
- **FIX**: Use `Session` (capital S) matching the schema field name; verified via `SessionSummaryInclude` generated type
- **LESSON**: Always verify Prisma relation field names against generated `node_modules/.prisma/client/index.d.ts` types, not just the schema — schema field names are case-sensitive in queries

**MISTAKE**: `sessionsCompleted: sessions.length` used array length (always 0 or 1) instead of real session count
- **Error**: Milestone detection (`% 5 === 0`), `Session #N` numbering, and behavior switches (`> 3`, `> 10`) were all broken for returning users
- **FIX**: Hoist `completedSessionCount` variable outside try block, assign from the DB count inside, use it in `userProfile`
- **LESSON**: When building `userProfile` from data fetched inside a try block, hoist result variables before the try so they're accessible in the outer scope

**MISTAKE**: `lastSessionDate: sessions[0]?.date` was never populated — `sessions` array only stored `{ length: count }`, never a date
- **Error**: "Since our last session on [date]" never showed a real date in first messages
- **FIX**: Hoist `lastCompletedSession` variable, assign from the already-fetched `lastSession` parallel query result
- **LESSON**: When you have the data from a parallel fetch, use it directly — don't reconstruct it through an intermediate structure that drops fields

**MISTAKE**: `SessionSummary` context was stored after every session (via `TherapeuticInsightEngine`) but never read when starting the next session
- **Error**: VAPI assistant had no memory of previous sessions despite rich data in the database
- **FIX**: Fetch last 3 `SessionSummary` records in parallel with session count in `/api/vapi/assistant`, build `previousSessionContext` string, inject into all three therapy system prompts (solo/couple/family)
- **LESSON**: Check that data written at session END is actually READ at session START — write-only pipelines are invisible bugs

### Critical Development Process Lessons (Credit System Implementation)
❌ **Implementation Order Mistakes**: Should start with timing foundation FIRST, then unified architecture, then individual routes - timing provides foundation for accurate billing
❌ **Code Review Timing**: Should use code-reviewer agents EARLIER to catch syntax issues before deep implementation
❌ **Route Discovery**: Should do comprehensive route analysis UPFRONT to identify all completion paths before fixing individual routes
❌ **Database Schema Verification**: Always verify schema compatibility FIRST before writing code that references columns/tables
❌ **Edge Case Analysis**: Should systematically analyze all possible bypass routes before declaring system secure
❌ **Foundation-First Principle**: Build core services (timing, validation, security) before orchestration layers
✅ **Multi-Agent Verification**: Using specialized agents (backend, code-reviewer, api-architect) prevents critical oversights
✅ **Systematic Documentation**: TodoWrite + MCP memory creates knowledge continuity
✅ **Security-First Mindset**: Always think 'how can users bypass this?' when building billing/revenue systems

## 📁 CLAUDE.md File Structure

**IMPORTANT**: Multiple CLAUDE.md files exist for different purposes. Update the CORRECT file:

- **`/CLAUDE.md`** (ROOT - THIS FILE): Main project documentation, config, workflows
- **`/PRICING-STRATEGY-ANALYSIS.md`**: 💰 CRITICAL - Pricing tiers, credits, costs (MUST READ for pricing/billing features)
- **`/docs/CREDIT-SYSTEM-INTEGRATION-PLAN.md`**: 🎯 CRITICAL - Credit/session integration architecture (MUST READ for session features)
- **`/VAPI-COMPLETE-GUIDE.md`**: 🚨 CRITICAL - Comprehensive VAPI documentation (MUST READ for ANY VAPI work)
- **`/src/components/CLAUDE.md`**: React component patterns, UI guidelines
- **`/src/app/api/CLAUDE.md`**: API route documentation, patterns
- **`/src/app/dashboard/CLAUDE.md`**: Dashboard-specific features
- **`/src/hooks/CLAUDE.md`**: Custom hooks documentation
- **`/src/lib/CLAUDE.md`**: Library utilities, helpers
- **`/src/types/CLAUDE.md`**: TypeScript types, interfaces
- **`/src/emails/CLAUDE.md`**: Email templates, configs
- **`/prisma/CLAUDE.md`**: Database schema, migrations

Always verify you're updating the appropriate CLAUDE.md for your changes!

## 🤖 AI Development Team Configuration

**Specialized agents installed from awesome-claude-agents for expert-level assistance.**

### Team Composition & Routing

#### Orchestrators
- **tech-lead-orchestrator**: Coordinates complex features, manages three-phase workflow
- **project-analyst**: Analyzes codebase, detects tech stack, enables smart routing
- **team-configurator**: Auto-configures agent team based on project needs

#### Framework Specialists for This Project
- **react-nextjs-expert**: Next.js 15 app router, React 19, SSR/SSG patterns
- **react-component-architect**: Component design, hooks, state management
- **react-state-manager**: Zustand, React Query v5, global state patterns
- **backend-developer**: TypeScript APIs, Prisma ORM, Supabase integration
- **api-architect**: VAPI voice integration, webhook design, RESTful patterns

#### Core Team
- **code-reviewer**: Production readiness, security practices, performance
- **performance-optimizer**: Query optimization, caching, bundle size
- **documentation-specialist**: Technical docs, API documentation
- **tailwind-css-expert**: TailwindCSS 4, responsive design, animations

### Agent Invocation

Use the Task tool with specific agent types:

```bash
# For complex features - Tech Lead coordinates everything
Task(subagent_type="tech-lead-orchestrator", prompt="Build user dashboard with real-time metrics")

# For specific expertise
Task(subagent_type="react-nextjs-expert", prompt="Optimize Next.js 15 app router performance")
Task(subagent_type="api-architect", prompt="Design VAPI webhook handling system")
Task(subagent_type="performance-optimizer", prompt="Optimize dashboard query taking 2514ms")

# For code analysis
Task(subagent_type="project-analyst", prompt="Analyze session management architecture")
Task(subagent_type="code-reviewer", prompt="Review security of authentication flow")
```

### Three-Phase Orchestration Pattern

Tech Lead coordinates through:
1. **Research Phase**: Multiple specialists analyze in parallel
2. **Planning Phase**: Creates tasks with TodoWrite, identifies dependencies
3. **Execution Phase**: Agents work together, sharing context

### Project-Specific Agent Knowledge

Agents are configured to understand:
- Next.js 15 with app router (NOT pages directory)
- Railway deployment (NOT Vercel)
- VAPI voice AI integration patterns
- Prisma with Supabase (uppercase enums)
- Non-HIPAA compliant constraints
- Redis deduplication patterns
- Session management architecture

## Quick Commands

```bash
npm run dev              # Dev server (0.0.0.0:3001) — Turbopack
npm run build            # Production build
npm run typecheck        # Check types
npm run lint             # Lint code
npm run prisma:generate  # Generate Prisma client
npm run prisma:db:push   # Sync schema to database

# Testing
npm run test                    # Jest unit tests
npm run test:watch              # Watch mode
npm run test:coverage           # Coverage report
npm run test:ci                 # CI/CD (serial, single worker)
npm run test:credit-deduction   # Credit system integration tests
npm run e2e                     # Playwright end-to-end tests

# Development tools
npm run storybook               # Component library (port 6006)
ANALYZE=true npm run build      # Bundle analyzer
```

## 🌿 Git Workflow

⚠️ **IMPORTANT**: Always create and switch to a feature branch before adding new features!

```bash
# Create and switch to a new feature branch
git checkout -b feature/your-feature-name

# Or switch to existing branch
git checkout feature/your-feature-name

# NEVER work directly on main branch for new features
```

### 📝 Commit Requirements

**CRITICAL**: After completing EVERY task, you MUST commit the changes:

```bash
# Stage all changes
git add .

# Commit with descriptive message (NO co-authored messages)
git commit -m "feat: describe what was accomplished"

# DO NOT include:
# - Co-Authored-By: Claude <noreply@anthropic.com>
# - 🤖 Generated with [Claude Code] tags
# - Any AI attribution

# Examples of good commit messages:
git commit -m "fix: resolve profile loading flicker issue"
git commit -m "feat: add animated loading spinner component"
git commit -m "docs: update profile system architecture"
```

**Commit after EACH completed task** - don't batch multiple tasks into one commit!

## image file location

../../../../../../mnt/c/Users/Quadf/OneDrive/Pictures/Screenshots/

## 💰 Pricing & Credit System

### Subscription Tiers
| Tier | Price | Sessions | Minutes/Session | Total Minutes |
|------|-------|----------|-----------------|---------------|
| **Free** | $0 | 3/month | 15 min | 45 min |
| **Pro** | $5/month (or $48/year) | Unlimited | 30 min | Unlimited |

### Stripe Price IDs
- Monthly: `STRIPE_PRICE_PRO_MONTHLY` + `NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID`
- Annual: `STRIPE_PRICE_PRO_ANNUAL` + `NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID`
- Both vars hold the same value — server var for validation, `NEXT_PUBLIC_` for client-side checkout

### VAPI Costs
- **Confirmed Rate**: $0.0203/minute (from actual dashboard data)
- **Margins**: Strong margin at $5/month given typical session usage

### Credit System Implementation

**MUST READ [/docs/CREDIT-SYSTEM-INTEGRATION-PLAN.md](./docs/CREDIT-SYSTEM-INTEGRATION-PLAN.md) for implementation details!**

#### Key Components
- **CreditManager**: `src/lib/services/credit-manager.service.ts` - Core credit operations
- **VapiSessionManager**: `src/lib/services/vapi-session-manager.ts` - Session limits enforcement
- **Integration Hook**: `src/hooks/useSessionWithCredits.ts` - UI credit integration
- **Webhook Handler**: `/api/vapi/webhook-credit` - Real-time tracking

#### Critical Edge Cases (See Integration Plan)
- **Connection Loss**: 5-minute grace period for recovery without charge
- **Page Refresh**: Auto-recovery with credit preservation
- **Pause/Resume**: Credit checkpoint system with 24-hour expiry
- **Multi-tab**: Synchronized credit updates via Supabase

## 🚀 Railway Deployment Guide

**Infrastructure**: Railway + Supabase + VAPI  
**Fixed Costs**: ~$70/month | **VAPI**: $0.0203/min  
**Performance**: <200ms response times, 99.9% uptime, global edge

### 1. Railway CLI Installation & Authentication

#### Install Railway CLI

**Option 1: Homebrew (macOS)**
```bash
brew install railway
```

**Option 2: npm (Cross-platform)**
```bash
npm i -g @railway/cli
```
*Requires Node.js >=16*

**Option 3: Shell Script (macOS/Linux/WSL)**
```bash
bash <(curl -fsSL cli.new)
```

**Option 4: Scoop (Windows)**
```powershell
scoop install railway
```

#### Authenticate with Railway

**Interactive Login (Recommended)**
```bash
railway login
```
*Opens browser for OAuth authentication*

**Manual Login (CI/CD/SSH)**
```bash
railway login --browserless
```
*Provides pairing code for manual authentication*

**Token Authentication (CI/CD)**
```bash
# Project Token (project-level actions only)
export RAILWAY_TOKEN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
railway up

# Account Token (all actions)
export RAILWAY_API_TOKEN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
railway whoami
```

### 2. Project Creation & Configuration

#### Create New Railway Project
```bash
# Initialize new project
railway init

# Link to existing project
railway link

# Select specific service
railway service
```

#### Environment Setup
```bash
# Set environment (production is default)
railway environment

# View current environment
railway status
```

### 3. Environment Variables Configuration

Set these in Railway Dashboard → Project → Variables or via CLI:

```env
# Core Configuration (use .env NOT .env.local)
DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=1"

# Clerk Authentication (replaces NextAuth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/intro
CLERK_WEBHOOK_SECRET=whsec_...

# Railway-specific (auto-injected)
RAILWAY_ENVIRONMENT=production
PORT=3000
HOSTNAME=0.0.0.0

# Services
RESEND_API_KEY=re_your_api_key
VAPI_API_KEY=your-vapi-key
VAPI_ORG_ID=your-vapi-org-id
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Analytics (PostHog replaces Vercel Analytics)
NEXT_PUBLIC_POSTHOG_KEY=phc_your_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

**Set via CLI:**
```bash
railway variables set DATABASE_URL="postgresql://..."
railway variables set CLERK_SECRET_KEY="sk_live_..."
```

### 4. Railway Configuration

**Standard Dockerfile & next.config.js available in project root**

### 5. Health Check

**Endpoint**: `/api/health` (already implemented)  
**Path**: `/api/health` | **Timeout**: 300s

### 6. Domain Setup

**Auto Domain**: `railway domain`  
**Custom Domain**: Dashboard → Networking → + Custom Domain → CNAME setup  
**SSL**: Auto-generated Let's Encrypt certificates

### 7. Deployment

**CLI**: `railway up` | **GitHub**: Auto-deploy on push to main (recommended)

### 8. Monitoring

**Logs**: `railway logs --tail` | **Dashboard**: CPU/Memory/Request metrics | **Analytics**: PostHog configured

### 9. Troubleshooting

**Build**: `railway service delete-cache` | **Variables**: `railway variables` | **Logs**: `railway logs --deployment <id>`

### 10. Production Checklist

✅ Environment variables | ✅ Database connection | ✅ Health checks | ✅ SSL/Domain | ✅ Error monitoring (Sentry) | ✅ Analytics (PostHog) | ✅ VAPI integration

**Architecture**: GitHub → Railway Build → Health Check → Live Deployment  
**Traffic**: Edge → CDN/Load Balancer → App Instance  
⚠️ **NOTE**: CVE-2025-29927 (Next.js middleware auth bypass) is mitigated by Clerk middleware handling auth server-side

## 🚨 CRITICAL: VAPI Documentation Reference Requirement 🚨

**MANDATORY FOR ALL VAPI-RELATED CHANGES:**
- **ALWAYS** consult `/VAPI-COMPLETE-GUIDE.md` BEFORE implementing ANY VAPI, session, or assistant features
- **NEVER** modify VAPI code without checking the comprehensive documentation first
- **MUST** follow the documented patterns for JWT tokens, session management, and API calls
- **KEY REFERENCE**: 2,464-line guide with complete TypeScript patterns and optimizations
- **Failure to reference VAPI docs = BROKEN VOICE FEATURES**

The VAPI documentation contains:
- Every available API call and method
- Correct configuration patterns (hipaaEnabled: false, recordingEnabled: true)
- Session management best practices
- WebSocket optimization techniques
- Transcript storage configuration
- Performance optimization strategies (<500-700ms latency targets)
- Provider selection guidance
- Tool/function calling patterns
- Event handling and webhook implementations

## 🚨 VAPI Session Critical Fixes (Updated April 2026)

1. **JWT Expiration**: Must be < 3600 seconds (use 3599) - Fixed in `vapi-jwt-redis.service.ts`
2. **Inline Config Structure**: Pass clean config object directly to `vapi.start()`:
   ```typescript
   // Correct structure for inline assistant
   vapi.start({
     transcriber: { provider: 'deepgram', model: 'nova-3', ... },
     model: { provider: 'anthropic', model: 'claude-3', tools: [...], ... },
     voice: { provider: '11labs', voiceId: '...', ... },
     firstMessage: "Hello...",
     // Other valid fields: maxDurationSeconds, silenceTimeoutSeconds, etc.
   })
   ```
3. **ServerUrl Requirements**: Must use HTTPS or omit for local dev
4. **Functions Field**: Must be in `model.tools` array, not at root level:
   ```typescript
   // ❌ Wrong: functions at root
   { functions: [...], model: {...} }
   
   // ✅ Correct: tools inside model
   { model: { tools: [...], ... } }
   ```
5. **Prisma Enums**: Use uppercase (COMPLETED not completed) - Fixed Jan 2025
   - All SessionStatus comparisons now use uppercase: SCHEDULED, ACTIVE, PAUSED, COMPLETED, CANCELLED, TERMINATED, ABANDONED, TECHNICAL_ISSUE
   - Created `src/types/session-status.ts` for centralized type definitions
   - Fixed SQL queries to use uppercase enums
6. **Invalid Fields**: Remove these to prevent 400 errors:
   - `variableValues`, `metadata`, `recordingEnabled`, `hipaaEnabled`
   - `responseDelaySeconds`, `llmRequestDelaySeconds`, `numWordsToInterruptAssistant`
   - `functions` (at root), `backgroundDenoisingEnabled`
7. **ElevenLabs Voice IDs**: Must be active in your ElevenLabs account. Current voices (April 2026):
   - Dr. Elliot (solo): `XmUeU0FRyne67Dy7UaT4`
   - Dr. Maya (couples): `0G7xjh2pNSLRvJSpklE4`
   - Dr. Jada (family): `zQjGMGv0jjccPqAwHqqv`
   - Set via env: `NEXT_PUBLIC_VAPI_ELLIOT_VOICE_ID`, `NEXT_PUBLIC_VAPI_MAYA_VOICE_ID`, `NEXT_PUBLIC_VAPI_JADA_VOICE_ID`
   - Error `pipeline-error-eleven-labs-voice-disabled-by-owner` = voice ID invalid/disabled
8. **Model Names**: Use real models (`gpt-4o-mini`, not `gpt-5-mini`). Invalid model = instant Daily.co ejection.
9. **Session Pause Errors Fixed** (Jan 2025):
   - **Problem**: 400 error "Session is already paused" due to duplicate API calls
   - **Root Cause**: `session.pauseSession()` → PATCH, then `sessionState.pauseSession()` → POST
   - **Solution**: Removed duplicate call in TherapyButtonRefactored.tsx:1563-1565
   - **Idempotent Endpoint**: `/api/sessions/[id]/pause` now returns success if already paused
   - **Pause Flow**: Client → sessionState.pauseSession() → VAPI pause → DB update → Broadcast

## ✅ VAPI Session Success Indicators

**Working Session Logs**:
```
✅ VAPI call started successfully
📞 VAPI started, starting conversation timer
🎤 Setting up audio analyzer...
📨 VAPI Message: speech-update → transcript → conversation-update
📊 METRICS: Confidence: 20% → 40% → 80% → 95%
```

**Message Flow**: `call-start` → `speech-update` → `transcript` → `model-output` → `voice-input`

**Known Issues**:
- WebRTC transport may show "disconnected" warnings - this is normal, session continues
- Metrics broadcast every 5-10 entries or on significant confidence changes

## 🐛 Profile System Known Issues & Solutions (Jan 2025)

### Profile Update Flow Architecture
1. **Frontend**: `ProfileClient.tsx` → Form state management with `isInitialized` flag
2. **Provider**: `ProfileProvider.tsx` → React Query with optimistic updates and error recovery
3. **API**: `/api/user/profile/route.ts` → Transaction-based updates for User, UserProfile, FamilyMember
4. **Database**: Prisma with PostgreSQL → Ensure schema sync with `prisma:db:push`

### Critical Bug Fixes Applied
- **Variable Scope Issue**: `familyMembersToCreate` was used outside transaction scope → Added `familyMembersCreatedCount` tracker
- **Loading Flicker**: Form rendered with empty fields before data → Added `isInitialized` flag + `ProfileLoadingSpinner`
- **Missing UI Fields**: No inputs for array fields → Added comma-separated inputs for currentConcerns/preferredDays
- **Error Handling**: Empty `{}` errors → Enhanced parsing for JSON/text responses with detailed messages
- **Database Sync**: Missing `timezone` column → Run `prisma:db:push` to sync schema

### Profile Update Checklist
✅ All form fields must be included in `handleUpdate` spread operator
✅ Array fields (currentConcerns, preferredDays) need special handling
✅ Age fields must be parsed from string to integer
✅ Transaction must track variables needed outside its scope
✅ Loading state must wait for both `profile` data AND `isInitialized` flag
✅ Error messages must be user-friendly with specific guidance
✅ Database schema must match Prisma schema (run `prisma:db:push` if errors)




## 🔐 Authentication: Clerk (Migrated from NextAuth — April 2026)

**CRITICAL**: This project uses **Clerk** for authentication, NOT NextAuth. All NextAuth code has been removed.

### Auth Architecture
- **Server-side**: `getAuthSession()` from `src/lib/auth.ts` — drop-in replacement for `getServerSession(authOptions)`
- **Client-side**: `useClerkSession()` from `src/hooks/useClerkSession.ts` — drop-in for `useSession()` from next-auth/react
- **Middleware**: `src/middleware.ts` uses `clerkMiddleware()` with rate limiting
- **Webhook**: `/api/webhooks/clerk/route.ts` handles Clerk user sync events
- **Sign-in/up pages**: `/sign-in/[[...sign-in]]` and `/sign-up/[[...sign-up]]`

### Auth Pattern for API Routes
```typescript
import { getAuthSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  // session.user has: id (DB user ID), email, name, image
}
```

### Auth Pattern for Client Components
```typescript
import { useClerkSession } from '@/hooks/useClerkSession'

function MyComponent() {
  const { data: session, status } = useClerkSession();
  // session?.user has: id, name, email, image
}
```

### Key Migration Details
- `getAuthSession()` calls Clerk's `auth()` + `currentUser()`, then finds/creates DB user via `clerkId` or email
- User table has `clerkId` field for Clerk-to-DB linking
- Credits are auto-initialized for all users (free tier: 45 min)
- `useClerkSession` uses `useMemo` to prevent infinite re-renders from object reference instability
- `jsonwebtoken` package MUST use lazy dynamic `import()` — top-level imports crash Turbopack

### Environment Variables (Clerk)
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/intro
CLERK_WEBHOOK_SECRET=whsec_... # For /api/webhooks/clerk
```

### Removed Files (NextAuth)
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/api/auth/{debug,diagnostic,providers,session,test}/route.ts`
- `src/lib/next-auth-config.ts`, `src/lib/auth-optimized.ts`
- `src/lib/custom-prisma-adapter.ts`
- `src/lib/auth/session-cache.ts`, `src/lib/auth/session-optimized.ts`
- `src/types/next-auth.d.ts`
- `src/middleware.optimized-upstash.ts`, `src/middleware.secure.ts`

## 🏛️ Key Architecture Notes

- **Authentication**: Clerk (NOT NextAuth) — see section above
- **Primary session component**: `TherapyButtonRefactored.tsx` (not the legacy `TherapyButton.tsx`)
- **Test runners**: Both Jest (`jest.config.js`) and Vitest (`vitest.config.ts`) are available; Jest is the primary runner
- **Image CDN**: Bunny CDN with a custom Next.js image loader in `next.config.js`
- **Middleware**: `src/middleware.ts` uses Clerk middleware with rate limiting
- **Bundle analysis**: Run `ANALYZE=true npm run build` to inspect bundle sizes
- **VAPI MCP Server**: `.mcp.json` connects Vapi API for direct account inspection (in `.gitignore`)

## Core Patterns

```typescript
// API Route (Clerk auth)
import { getAuthSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// VAPI Webhook (5s timeout)
export async function POST(request: NextRequest) {
  const body = await request.json();
  processWebhookAsync(body.message); // Fire & forget
  return NextResponse.json({ success: true });
}
```

## 🔍 Debug Guide

### Quick Fixes

1. **Async Prisma**: Fixed with Proxy wrapper in `prisma-optimized.ts`
2. **Session Returns Undefined**: Check hook returns `data.session.id` not `session.id`
3. **Build Errors**: `rm -rf .next node_modules/.cache`
4. **Type Errors**: Verify Prisma schema matches TypeScript types
5. **Infinite Welcome Emails**: Redis deduplication + partial success handling
6. **Notification Loops**: Check `welcomeMessageSent` flag + Redis keys
7. **Slow User.findUnique (2514ms)**: Fixed with parallel queries in `optimized-user-queries.ts`
8. **Dashboard API Errors**: Use `dashboard-error-handler.ts` for consistent error handling
9. **Number Safety**: Use `sanitizeNumber()` and `sanitizePercentage()` from `dashboard-schemas.ts`
10. **Session Pause 400 Errors**: Fixed duplicate calls, made endpoint idempotent (Jan 2025)
11. **Sentry Configuration**: Moved to `instrumentation.ts` with `onRequestError` hook + `global-error.tsx` (Jan 2025)
12. **Profile Update 500 Errors**: Check variable scope in transactions, ensure `familyMembersToCreate` is accessible
13. **Profile Loading Flicker**: Use `isInitialized` flag to prevent form showing before data loads
14. **Database Schema Mismatch**: Run `npm run prisma:db:push` to sync schema with database
15. **Missing Form Fields**: Ensure all profile fields have corresponding UI inputs (currentConcerns, preferredDays, etc.)
16. **VAPI Ejection ("Meeting ended due to ejection")**: Check ElevenLabs voice IDs are active, model name exists (use `gpt-4o-mini` not `gpt-5-mini`)
17. **jsonwebtoken Crash ("Cannot read properties of undefined reading 'prototype'")**: Use lazy `const jwt = (await import('jsonwebtoken')).default` — never top-level import
18. **Session Fetch Timeout (15s)**: Use `?lite=true` param on `/api/sessions/[id]` to skip transcript loading
19. **Credits Showing 0/0**: Check `ensureCreditsExist()` is called in all paths of `findOrCreateUser()` in `src/lib/auth.ts`
20. **Infinite Re-renders in VAPI hooks**: Use `session?.user?.id` as deps, not the session object (new reference each render)
21. **Communication Metrics always 0%**: Check `sessionType` field is set on session record; check `dashboardCache.invalidateOnSessionComplete()` is called after all completion paths; check `metricsAreAllZero` guard in communication-metrics route
22. **Session status comparisons fail silently**: Supabase `postgres_changes` and Prisma return uppercase enums — always use `?.toUpperCase() === 'COMPLETED'` not `=== 'completed'`
23. **Session recovery resumes wrong therapy type**: `handleContinueActiveSession` uses `sessionType` DB field as primary — ensure it's saved on session creation
24. **VAPI ejection errors after session ends**: Expected behavior from Daily.co when `endCall` tool fires — handled in `useVapiSession.ts` and `TherapyButtonRefactored.tsx`
21. **VAPI assistant has no memory of previous sessions**: Check `SessionSummary.processingStatus = 'completed'` records exist; `previousSessionContext` must be built in `/api/vapi/assistant` and injected into system prompt
22. **Prisma relation field returns undefined silently**: Verify field name casing against generated `SessionSummaryInclude` type — schema `Session Session @relation(...)` means query key is `Session` not `session`
23. **Session #N always shows Session #2 / milestones never trigger**: `sessionsCompleted` was broken; now reads from `completedSessionCount` (actual DB count)
24. **Slow session start (>500ms before VAPI)**: `create-with-credits` and `GET /api/vapi/assistant` now run in parallel; VAPI instance pre-warms on JWT token ready

### Debug Checklist

- **API 500s**: Check Prisma init → ENV vars → DB connection → Middleware order
- **Session Issues**: Verify hook structure → API response format → Auth state
- **Build Errors**: Clean artifacts → Check imports → Fix circular deps

### File Dependencies

```
Profile: /api/user/profile → cache/profile-cache → queue/background-jobs
Session: /api/sessions → session-cache → prisma-optimized → hooks → VAPI-COMPLETE-GUIDE.md
Auth: lib/auth (Clerk) → middleware (clerkMiddleware) → all API routes
Client Auth: useClerkSession → useAuth → all client components
VAPI: Any VAPI code → VAPI-COMPLETE-GUIDE.md (MANDATORY REFERENCE)
```

### Common Issues & Migrations

- **Sentry v8**: Remove `autoSessionTracking`, `maxValueLength`
- **React Query v5**: `cacheTime` → `gcTime`, remove `onError`
- **Prisma**: Use uppercase enums (COMPLETED), `isDeleted` not `isActive`
- **Auth**: Uses Clerk — `getAuthSession()` server-side, `useClerkSession()` client-side (NextAuth fully removed)
- **useEffect**: Must be imported from 'react' in all components
- **jsonwebtoken**: MUST use lazy `import()` — top-level imports crash Turbopack


## MCP Tools

### Search & Web Tools
- `mcp__omnisearch__tavily_search` - Web search with reliable sources
- `mcp__omnisearch__brave_search` - Privacy-focused technical search
- `mcp__omnisearch__kagi_search` - High-quality search without SEO spam
- `mcp__omnisearch__kagi_fastgpt_search` - Quick AI answers with citations
- `mcp__omnisearch__firecrawl_scrape_process` - Extract clean content from URLs
- `mcp__omnisearch__firecrawl_crawl_process` - Deep crawl entire websites
- `mcp__omnisearch__tavily_extract_process` - Extract web content efficiently

### File Operations (Desktop Commander)
- `mcp__project-files__read_file` - Read file contents with line limits
- `mcp__project-files__write_file` - Write/append files (chunk 25-30 lines)
- `mcp__project-files__edit_block` - Surgical text replacements
- `mcp__project-files__search_code` - Ripgrep-powered code search
- `mcp__project-files__search_files` - Find files by name pattern
- `mcp__project-files__list_directory` - List directory contents
- `mcp__project-files__execute_command` - Run terminal commands
- `mcp__project-files__get_config` - Get DC configuration

### Database & Memory
- `mcp__postgres__query` - Read-only SQL queries
- `mcp__memory__create_entities` - Create knowledge graph entities
- `mcp__memory__search_nodes` - Search knowledge graph
- `mcp__memory__read_graph` - Read entire knowledge graph

## Development Workflow

1. **Task Management**: Break down → Prioritize → Track with TodoWrite tool
2. **VAPI Changes**: 🚨 READ `/VAPI-COMPLETE-GUIDE.md` FIRST → Implement → Test
3. **Code Changes**: Search MCP → Make changes → Update MCP memory
4. **Testing**: Isolate tests → Integration checks → Validate flow
5. **Documentation**: Update MCP entities → Document fixes → Update CLAUDE.md

## 🏗️ Build Error Resolution Strategy

1. **Run Build**: `npm run build`
2. **Categorize Errors**: Group by component/module
3. **Search Solutions**: Use MCP tools for latest docs
4. **Fix Systematically**: One module at a time
5. **Verify**: Re-run build after each fix batch

### Recent Fixes (April 2026)
- ✅ **Migrated authentication from NextAuth to Clerk** (258 files changed)
- ✅ Fixed VAPI voice IDs — ElevenLabs voices were disabled by owner, updated to active voices
- ✅ Fixed VAPI model name (`gpt-5-mini` → `gpt-4o-mini` — nonexistent model caused instant ejection)
- ✅ Fixed `jsonwebtoken` top-level import crash with Turbopack (lazy dynamic imports)
- ✅ Fixed credit display real-time countdown during active sessions (30s update interval)
- ✅ Fixed session fetch query timeout — added `?lite=true` mode to skip transcript loading
- ✅ Fixed session conflict dialog for concurrent session handling
- ✅ Fixed React hooks order violation in `useClerkSession` (useMemo before early returns)
- ✅ Fixed infinite re-render loop from unstable session object references in `useVapiToken`
- ✅ Fixed `AIInsightsWithTabs` null access after session end (`/api/sessions/active` returns direct object, not wrapped)
- ✅ Fixed stale closure in TherapyButton VAPI message handler (use `sessionRef.current`)
- ✅ Updated `@vapi-ai/web` from 2.2.4 to 2.5.2 (daily-js 0.75.2 no longer supported)
- ✅ **Implemented cross-session memory** — `SessionSummary` context injected into all three therapy system prompts (solo/couple/family) via `previousSessionContext` field in `userProfile`
- ✅ Fixed Prisma relation field name `session` → `Session` (capital) in `SessionSummary` queries — lowercase was silently returning undefined
- ✅ Fixed `sessionsCompleted` always being 0 or 1 (was using `sessions.length` array length, not actual DB count) — milestones, Session #N and behavior switches now work correctly for returning users
- ✅ Fixed `lastSessionDate` always being null (was `sessions[0]?.date` which was never populated)
- ✅ **Parallelized session start** — `create-with-credits` + `GET /api/vapi/assistant` now fire simultaneously, saving ~200-300ms per session start
- ✅ **VAPI instance pre-warm** — `vapiInstanceManager.getOrCreateInstance()` called eagerly when JWT token first becomes available, not on-demand at session start
- ✅ **Fixed VAPI ejection errors on session end** — Daily.co fires "ejection" error when built-in `endCall` tool terminates the room; now treated as normal call-end in `useVapiSession.ts` and `TherapyButtonRefactored.tsx`
- ✅ **Fixed Communication Metrics showing 0%** — multi-root-cause fix:
  - `therapyType` defaulted to 'couple' in enhanced completion route → now uses `sessionType` DB field
  - Case: `'SOLO' !== 'solo'` → `.toLowerCase()` normalization in `metrics-helper.ts`
  - `mapSessionToTherapyType` in `dashboard-cache.ts` missing `lowerType === 'solo'` → fixed
  - Non-enhanced route missing `dashboardCache.invalidateOnSessionComplete()` → added
  - API cached zero values → `shouldCache` guard + `metricsAreAllZero` fallback added
  - Duplicate metric writes → `generateMetricsFromSession` made upsert-aware
- ✅ **Fixed SessionStatus case-sensitivity (8 files)** — Supabase `postgres_changes` and Prisma return uppercase enums; lowercase comparisons silently always failed. Affected: session-completed toast, modal auto-close, recovery safeguard, AI session history, therapy insights, PATCH metrics trigger. **Rule: always use `?.toUpperCase() === 'COMPLETED'` not `=== 'completed'` for DB/Supabase values.**
- ✅ **Fixed session recovery resuming with wrong therapist** — `handleContinueActiveSession` in `therapy/client.tsx` now uses `sessionType` DB field as primary source (not theme text which defaulted to 'couple')
- ✅ **Fixed `/api/sessions/active` missing PAUSED sessions** — now queries `status: { in: ['ACTIVE', 'PAUSED'] }`

### Previous Fixes (Jan 2025)
- ✅ Fixed Prisma SessionStatus enum case sensitivity (use UPPERCASE)
- ✅ Optimized User.findUnique query (2514ms → ~500ms) with parallel queries
- ✅ Fixed TranscriptEntry confidence field error (field doesn't exist)
- ✅ Unified dashboard validation with Zod schemas
- ✅ Migrated Sentry to Next.js 15 pattern (`instrumentation.ts` + `global-error.tsx`)
- ✅ Fixed profile update 500 errors - variable scope issue with `familyMembersToCreate`
- ✅ Resolved profile loading flicker with `isInitialized` flag and loading state
- ✅ Added missing UI fields for currentConcerns, preferredDays, recurringSession, reminderTiming
- ✅ Fixed database schema sync issues - run `npm run prisma:db:push` if columns missing
- ✅ Enhanced error handling with proper JSON/text parsing and user-friendly messages
- ✅ **Fixed Critical Subscription-Credit Sync Bug** (Jan 2025):
  - **Root Cause**: Test webhook created empty subscription items array → `getPlanTypeFromSubscription` returned 'free'
  - **Impact**: Users with active subscriptions showed only 45 free credits instead of plan credits
  - **Fix**: Modified test webhook to include proper plan metadata and price data
  - **Files Changed**: `/api/stripe/webhook/route.ts` lines 210-230
  - **Verification**: Created `/scripts/check-credits.ts` and `/scripts/fix-user-credits.ts` for manual correction

### Performance Optimizations
- Dashboard queries taking >1000ms need indexing improvements
- Implement request deduplication to prevent concurrent API calls
- Add comprehensive error boundaries to dashboard components
- Create unified loading states for consistent UX
- ✅ Implemented exponential backoff polling for CreditDisplay (5s, 10s, 20s) - reduced API calls by 70%
- ✅ Fixed race condition in webhook by broadcasting before cache invalidation
- ✅ Added environment-based Stripe price ID configuration (no more hardcoded IDs)

## Resources

- [Next.js 15](https://nextjs.org/docs) | [VAPI](https://docs.vapi.ai) | [Supabase](https://supabase.com/docs)
- [Clerk Docs](https://clerk.com/docs) | [Clerk Next.js](https://clerk.com/docs/quickstarts/nextjs)
- [Railway Deploy](https://docs.railway.app) | [PostHog](https://posthog.com/docs)
- [Sentry v8 Migration](https://docs.sentry.io/platforms/javascript/guides/nextjs/migration/v7-to-v8/) 
- [React Query v5 Migration](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5)
- [Prisma 5.0 Changes](https://www.prisma.io/docs/guides/upgrade-guides/upgrading-versions/upgrading-to-prisma-5)

