# CLAUDE.md

Production-ready Next.js 15 therapy platform with enterprise voice AI.

**Status**: ✅ **PRODUCTION READY** | **Stack**: Next.js 15, React 19, TypeScript, Prisma, Supabase, VAPI, NextAuth, TailwindCSS 4

⚠️ **Important**: We deploy on Railway, NOT Vercel. All Vercel-specific code has been removed.

🚨 **CRITICAL**: Platform is **NOT HIPAA COMPLIANT**. See [HIPAA-COMPLIANCE.md](./HIPAA-COMPLIANCE.md) for required actions before handling real patient data.

## 🚀 React 19 Modern Standards (2025)

**MANDATORY: Use React 19's latest features - NO legacy patterns!**

### Must-Use Hooks
- **`useOptimistic`**: Instant UI updates with auto-rollback on failure
- **`useActionState`**: Form state + pending states in one hook
- **`use()`**: Read promises/context directly (works in loops/conditionals!)
- **`useFormStatus`**: Access form state without prop drilling
- **`useTransition`**: Async support for non-blocking updates
- **`useDeferredValue`**: Control expensive re-renders

### Modern Patterns
- **Actions API**: Async functions with automatic pending/error states
- **Server Components**: Use RSC for data fetching (stable in v19)
- **Render-as-you-fetch**: Start rendering immediately, update progressively
- **No useEffect for data**: Use `use()` hook or Server Components

### Performance First
- Concurrent rendering by default
- Suspense for all async operations
- Error boundaries for global error handling

## 🚨🚨 CRITICAL UI/UX REQUIREMENT 🚨🚨

**MANDATORY FOR ALL UI UPDATES:**
- **ALWAYS** follow mobile-first patterns in `/src/components/CLAUDE.md`
- **MUST** test on 375px width (iPhone SE)
- **Key patterns**: `text-sm sm:text-base`, `p-3 sm:p-4`

See `/src/components/CLAUDE.md` → "📱 Responsive Design Guidelines"

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
- Essential: 160 credits, Growth: 400 credits, Unlimited: 1200 credits
- No SSE/WebSocket - Upstash Redis doesn't support traditional pub/sub
- Exponential backoff polling reduces API calls by 70%
- Error boundaries prevent UI crashes from API failures
- Environment-based Stripe price IDs (no hardcoding)

## 📚 Claude's Mistakes & Lessons Learned

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

## 📁 Project Structure (Updated Jan 2025)

### Documentation
- **`/CLAUDE.md`**: Main project docs
- **`/docs/`**: Organized documentation
  - `architecture/`: System design docs
  - `deployment/`: Deploy guides
  - `compliance/`: HIPAA, security
  - `api/`: VAPI guides
  - `features/`: Pricing, testing

### Code Organization
- **`/src/components/`**: React components
  - `modals/`: All modal dialogs
  - `forms/`: Inputs & selectors
  - `ui/`: Primitives (buttons, display)
  - `sessions/`: Session components
  - `providers/`: Context providers
  - `shared/`: Utility components
- **`/src/lib/`**: Core libraries
  - `database/`: Prisma, Supabase
  - `services/`: Business logic
  - `vapi/`: VAPI integration
  - `metrics/`: Real-time metrics
- **`/scripts/`**: Organized scripts
  - `database/`: Migrations, backfills
  - `testing/`: Test scripts
  - `deployment/`: Setup scripts
  - `monitoring/`: Health checks
  - `utilities/`: Helper scripts

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
npm run dev              # Dev server (0.0.0.0:3000)
npm run build            # Production build
npm run typecheck        # Check types
npm run lint             # Lint code
npm run prisma:generate  # Generate Prisma client
```

## 🧹 Directory Cleanup (Jan 2025)

**366 files reorganized** for enterprise-ready structure:
- Removed root clutter (logs, test files, backups)
- 16 docs → `/docs/` with categories
- 90+ scripts → categorized folders
- 80+ lib files → logical grouping
- 58 components → structured by type

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

**ALWAYS refer to [docs/features/PRICING-STRATEGY-ANALYSIS.md](./docs/features/PRICING-STRATEGY-ANALYSIS.md) for pricing details!**

### Subscription Tiers (Per PRICING-STRATEGY-ANALYSIS.md)
| Tier | Price | Sessions | Minutes/Session | Total Minutes | Concurrent |
|------|-------|----------|-----------------|---------------|------------|
| **Free** | $0 | 3/month | 15 min | 45 min | 1 |
| **Essential** | $12.99 | 8/month | 20 min | 160 min | 1 |
| **Growth** | $24.99 | 16/month | 25 min | 400 min | 2 |
| **Unlimited** | $44.99 | 40/month | 30 min | 1200 min* | 3 |

*Soft cap to prevent abuse

### VAPI Costs
- **Confirmed Rate**: $0.0203/minute (from actual dashboard data)
- **Overage Charge**: $0.15/minute for Essential/Growth tiers
- **Margins**: 60-70% gross margin across all tiers

### Credit System Implementation

**MUST READ [docs/features/CREDIT-SYSTEM-INTEGRATION-PLAN.md](./docs/features/CREDIT-SYSTEM-INTEGRATION-PLAN.md) for implementation details!**

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
NEXTAUTH_URL=https://your-app.railway.app
NEXTAUTH_SECRET=min-32-chars-secure-key

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
railway variables set NEXTAUTH_SECRET="your-32-char-secret"
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
⚠️ **CRITICAL**: Address CVE-2025-29927 (Next.js auth bypass) before production

## 🚨 CRITICAL: VAPI Documentation Reference 🚨

**MANDATORY FOR ALL VAPI CHANGES:**
- **ALWAYS** consult `/docs/api/VAPI-COMPLETE-GUIDE.md` BEFORE any VAPI work
- **KEY REFERENCE**: 2,464-line guide with TypeScript patterns
- **Failure to reference = BROKEN VOICE FEATURES**

Contains:
- Every available API call and method
- Correct configuration patterns (hipaaEnabled: false, recordingEnabled: true)
- Session management best practices
- WebSocket optimization techniques
- Transcript storage configuration
- Performance optimization strategies (<500-700ms latency targets)
- Provider selection guidance
- Tool/function calling patterns
- Event handling and webhook implementations

## 🚨 VAPI Session Critical Fixes (Updated Jan 2025)

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
7. **Session Pause Errors Fixed** (Jan 2025):
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

## 🐛 Profile System Fixes (Jan 2025)

**Architecture**: ProfileClient → ProfileProvider (React Query) → API → Prisma transactions

**Fixed Issues**:
- Variable scope in transactions
- Loading flicker with `isInitialized` flag
- Array field handling (currentConcerns, preferredDays)
- Database sync with `prisma:db:push`




## Core Patterns (React 19 Style)

```typescript
// ✅ Modern Form with useActionState + useOptimistic
function TherapyForm() {
  const [optimisticData, setOptimistic] = useOptimistic(data);
  const [state, submitAction, isPending] = useActionState(
    async (prev, formData) => {
      setOptimistic(formData); // Instant UI update
      return await saveTherapySession(formData);
    }
  );
  
  return <form action={submitAction}>...</form>;
}

// ✅ Data Fetching with use() hook - NO useEffect!
function SessionData({ sessionId }) {
  const session = use(fetchSession(sessionId)); // Suspense-enabled
  return <div>{session.data}</div>;
}

// ✅ Performance with useTransition + useDeferredValue
function Dashboard({ data }) {
  const [isPending, startTransition] = useTransition();
  const deferredMetrics = useDeferredValue(data.metrics);
  
  return (
    <>
      <QuickStats data={data.stats} /> {/* Immediate */}
      <ExpensiveChart data={deferredMetrics} /> {/* Deferred */}
    </>
  );
}
```

## 🔍 Debug Guide

### Quick Fixes
- **Build Errors**: `rm -rf .next node_modules/.cache`
- **Prisma Sync**: `npm run prisma:db:push`
- **Session Pause 400**: Fixed duplicate calls (Jan 2025)
- **Profile Flicker**: `isInitialized` flag fix
- **Redis Parse**: Try-catch JSON.parse

### Migration Notes
- **React 19**: Stop using `useEffect` for data fetching
- **Forms**: Replace manual state with `useActionState`
- **Optimistic UI**: Use `useOptimistic` not manual rollback
- **Sentry v8**: Remove `autoSessionTracking`
- **React Query v5**: `cacheTime` → `gcTime`
- **Prisma**: Uppercase enums (COMPLETED)


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
2. **VAPI Changes**: 🚨 READ `/docs/api/VAPI-COMPLETE-GUIDE.md` FIRST → Implement → Test
3. **Code Changes**: Search MCP → Make changes → Update MCP memory
4. **Testing**: Isolate tests → Integration checks → Validate flow
5. **Documentation**: Update MCP entities → Document fixes → Update CLAUDE.md

## 🏗️ Build Error Resolution Strategy

1. **Run Build**: `npm run build`
2. **Categorize Errors**: Group by component/module
3. **Search Solutions**: Use MCP tools for latest docs
4. **Fix Systematically**: One module at a time
5. **Verify**: Re-run build after each fix batch

### Recent Fixes (Jan 2025)
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
- [Railway Deploy](https://docs.railway.app) | [PostHog](https://posthog.com/docs)
- [Sentry v8 Migration](https://docs.sentry.io/platforms/javascript/guides/nextjs/migration/v7-to-v8/) 
- [React Query v5 Migration](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5)
- [Prisma 5.0 Changes](https://www.prisma.io/docs/guides/upgrade-guides/upgrading-versions/upgrading-to-prisma-5)

