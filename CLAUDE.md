# CLAUDE.md

Production-ready Next.js 15 therapy platform with enterprise voice AI.

**Status**: ✅ **PRODUCTION READY** | **Stack**: Next.js 15, React 19, TypeScript, Prisma, Supabase, VAPI, NextAuth, TailwindCSS 4

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

## 🧠 MCP Memory Usage

**CRITICAL**: Memory management workflow:
1. **BEFORE CHANGES**: Search MCP memory first with `mcp__memory__search_nodes` 
2. **AFTER CHANGES**: Automatically append all code changes to MCP memory using `mcp__memory__add_observations`
3. **KNOWLEDGE GRAPH**: Update entities and relations for significant architectural changes

This ensures consistency and builds accumulated project knowledge.

## 📁 CLAUDE.md File Structure

**IMPORTANT**: Multiple CLAUDE.md files exist for different purposes. Update the CORRECT file:

- **`/CLAUDE.md`** (ROOT - THIS FILE): Main project documentation, config, workflows
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
npm run dev              # Dev server (0.0.0.0:3000)
npm run build            # Production build
npm run typecheck        # Check types
npm run lint             # Lint code
npm run prisma:generate  # Generate Prisma client
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

## 🚀 Railway Deployment Guide

**Infrastructure**: Railway + Supabase + VAPI  
**Cost**: ~$25-50/month (10K users) | **Voice**: ~$0.13/min  
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

### 4. Dockerfile Optimization for Railway

**Create optimized Dockerfile:**
```dockerfile
# Use official Node.js runtime as base image
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```

**Update next.config.js:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: __dirname,
  },
  // Railway-specific optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
}

module.exports = nextConfig
```

### 5. Health Check Configuration

**Create health check endpoint:**
```typescript
// src/app/api/health/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Add any health checks here (database, external services)
    return NextResponse.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      environment: process.env.RAILWAY_ENVIRONMENT || 'development'
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Health check failed' }, 
      { status: 503 }
    );
  }
}
```

**Configure in Railway Dashboard:**
1. Go to Service Settings → Deployments
2. Set Health Check Path: `/api/health`
3. Set Health Check Timeout: `300` seconds (5 minutes)
4. Railway will wait for 200 status before routing traffic

**Health Check Requirements:**
- Must return HTTP 200 when healthy
- Railway uses hostname `healthcheck.railway.app`
- Add to allowed hosts if using host restrictions
- Timeout: 300 seconds default (configurable via `RAILWAY_HEALTHCHECK_TIMEOUT_SEC`)

### 6. Domain Setup & SSL Certificates

#### Railway-Provided Domain
```bash
# Generate automatic domain
railway domain
```
Or in Dashboard: Service Settings → Networking → Generate Domain

#### Custom Domain Setup

**1. Add Custom Domain in Railway:**
- Dashboard → Service Settings → Networking → + Custom Domain
- Enter your domain (e.g., `yourdomain.com`)
- Copy provided CNAME (e.g., `g05ns7.up.railway.app`)

**2. Configure DNS Records:**

**Cloudflare (Recommended):**
```
Type: CNAME
Name: @ (or yourdomain.com)
Target: g05ns7.up.railway.app
Proxy: ON (orange cloud)
```

**Other Providers:**
```
Type: CNAME (or ALIAS/ANAME)
Name: @ 
Target: g05ns7.up.railway.app
```

**3. SSL Configuration:**
- Railway auto-generates Let's Encrypt certificates
- No manual SSL configuration needed
- HTTPS automatically available once domain verified

**4. Cloudflare-Specific Settings:**
- Set SSL/TLS to **Full** (NOT Full Strict)
- Enable Universal SSL
- Create www → root redirect if needed

**Wildcard Domains:**
```
Type: CNAME
Name: *
Target: g05ns7.up.railway.app

Type: CNAME  
Name: _acme-challenge
Target: authorize.railwaydns.net
Proxy: OFF (grey cloud)
```

### 7. Deployment Process

#### Deploy via CLI
```bash
# Deploy current directory
railway up

# Deploy with build logs
railway up --verbose

# Deploy in background
railway up --detach
```

#### Deploy via GitHub (Recommended)
1. Connect GitHub repo in Railway Dashboard
2. Enable auto-deploys on push to main
3. Configure build settings if needed
4. Deployments trigger automatically

#### Pre-deploy Commands
```bash
# Set in Railway Dashboard or railway.toml
railway config set build.command "npm run build"
railway config set build.watchPatterns "src/**"
```

### 8. Monitoring & Logging Setup

#### Built-in Monitoring
```bash
# View logs
railway logs

# Follow logs in real-time
railway logs --tail

# View specific service logs
railway logs --service web
```

#### Railway Dashboard Monitoring:
- CPU/Memory usage graphs
- Request metrics
- Build/deployment history
- Error tracking
- Performance insights

#### External Monitoring Setup:

**PostHog Analytics:**
```typescript
// Already configured in the project
// Set NEXT_PUBLIC_POSTHOG_KEY in Railway variables
```

**Uptime Monitoring:**
```bash
# Add Uptime Kuma service
railway add
# Select "Uptime Kuma" template
```

### 9. Common Deployment Issues & Troubleshooting

#### Build Failures
```bash
# Clear build cache
railway service delete-cache

# Check build logs
railway logs --deployment <deployment-id>

# Verify environment variables
railway variables
```

#### Port Issues
```bash
# Ensure app listens on Railway's PORT
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0');
```

#### Database Connection Issues
```bash
# Verify connection string
railway variables get DATABASE_URL

# Test connection locally
railway run npm run db:test
```

#### Domain/SSL Issues
- Verify DNS propagation: `nslookup yourdomain.com`
- Check Cloudflare proxy settings (Full SSL, not Strict)
- Wait up to 72 hours for DNS propagation
- Ensure ACME challenge isn't proxied

#### Memory/Performance Issues
```bash
# Check resource usage
railway service metrics

# Scale service (Pro plan)
railway service scale --replicas 2
```

### 10. Production Readiness Checklist

**Before Going Live:**
- [ ] Environment variables properly set
- [ ] Database connection tested
- [ ] Health check endpoint returning 200
- [ ] Custom domain configured and verified
- [ ] SSL certificate issued and working
- [ ] Error monitoring enabled (Sentry)
- [ ] Analytics tracking configured (PostHog)
- [ ] Redis cache properly connected
- [ ] VAPI integration tested
- [ ] Backup strategy in place

**Security:**
- [ ] NEXTAUTH_SECRET is 32+ characters
- [ ] Database URL uses connection pooling
- [ ] API rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers implemented

**Performance:**
- [ ] Build optimization enabled
- [ ] Image optimization configured
- [ ] Database queries optimized
- [ ] Caching strategy implemented
- [ ] Health checks configured

### Railway Architecture

```
GitHub Push → Railway Build → Health Check → Live Deployment
     ↓              ↓              ↓              ↓
Auto-deploy → Docker Build → /api/health → Traffic Switch
```

**Traffic Flow:**
```
User Request → Railway Edge (Global) → Your Container (US-East)
                ↓
Static Assets → CDN Cache → Direct Serve
API Requests → Load Balancer → App Instance
```

⚠️ **CRITICAL**: Address CVE-2025-29927 (Next.js auth bypass) before production deployment

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




## Core Patterns

```typescript
// API Route
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
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

### Debug Checklist

- **API 500s**: Check Prisma init → ENV vars → DB connection → Middleware order
- **Session Issues**: Verify hook structure → API response format → Auth state
- **Build Errors**: Clean artifacts → Check imports → Fix circular deps

### File Dependencies

```
Profile: /api/user/profile → cache/profile-cache → queue/background-jobs
Session: /api/sessions → session-cache → prisma-optimized → hooks → VAPI-COMPLETE-GUIDE.md
Auth: lib/auth → middleware → all API routes
VAPI: Any VAPI code → VAPI-COMPLETE-GUIDE.md (MANDATORY REFERENCE)
```

### Common Issues & Migrations

- **Sentry v8**: Remove `autoSessionTracking`, `maxValueLength`
- **React Query v5**: `cacheTime` → `gcTime`, remove `onError`
- **Prisma**: Use uppercase enums (COMPLETED), `isDeleted` not `isActive`
- **NextAuth**: Need `/api/auth/session` & `/api/auth/providers` routes
- **useEffect**: Must be imported from 'react' in all components


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

### Performance Optimizations
- Dashboard queries taking >1000ms need indexing improvements
- Implement request deduplication to prevent concurrent API calls
- Add comprehensive error boundaries to dashboard components
- Create unified loading states for consistent UX

## Resources

- [Next.js 15](https://nextjs.org/docs) | [VAPI](https://docs.vapi.ai) | [Supabase](https://supabase.com/docs)
- [Railway Deploy](https://docs.railway.app) | [PostHog](https://posthog.com/docs)
- [Sentry v8 Migration](https://docs.sentry.io/platforms/javascript/guides/nextjs/migration/v7-to-v8/) 
- [React Query v5 Migration](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5)
- [Prisma 5.0 Changes](https://www.prisma.io/docs/guides/upgrade-guides/upgrading-versions/upgrading-to-prisma-5)

