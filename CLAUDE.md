# CLAUDE.md

Production-ready Next.js 15 therapy platform with enterprise voice AI.

**Status**: ✅ **PRODUCTION READY** | **Stack**: Next.js 15, React 19, TypeScript, Prisma, Supabase, VAPI, Clerk, TailwindCSS 4

⚠️ **Important**: We deploy on Railway, NOT Vercel. All Vercel-specific code has been removed.

🚨 **CRITICAL**: Platform is **NOT HIPAA COMPLIANT**. See [HIPAA-COMPLIANCE.md](./HIPAA-COMPLIANCE.md) for required actions before handling real patient data.

## 🚨 CRITICAL UI/UX REQUIREMENT

**ALWAYS** refer to `/src/components/CLAUDE.md` for responsive design guidelines. **NEVER** create UI without mobile-first patterns. **MUST** test on 375px width (iPhone SE).

## 🧠 MCP Memory Usage

**CRITICAL**: Memory management workflow:
1. **BEFORE CHANGES**: Search MCP memory first with `mcp__memory__search_nodes`
2. **AFTER CHANGES**: Append code changes to MCP memory with `mcp__memory__add_observations`
3. **DOCUMENT MISTAKES**: Format as **MISTAKE** / **FIX** / **LESSON** in the relevant subdirectory CLAUDE.md

## 📁 CLAUDE.md File Structure

Update the **correct** file for your changes:

| File | Purpose |
|------|---------|
| `/CLAUDE.md` | Root: project overview, commands, git, deployment, MCP tools |
| `/src/app/api/CLAUDE.md` | API route patterns, debug guide, auth patterns |
| `/src/app/dashboard/CLAUDE.md` | Dashboard pages, data flow, metrics fixes |
| `/src/components/CLAUDE.md` | React components, responsive design, credit display, profile |
| `/src/hooks/CLAUDE.md` | Custom hooks, session recovery, VAPI hooks |
| `/src/lib/CLAUDE.md` | Core services, auth (Clerk), VAPI fixes, credit system |
| `/VAPI-COMPLETE-GUIDE.md` | 🚨 CRITICAL — Read before ANY VAPI work |
| `/PRICING-STRATEGY-ANALYSIS.md` | Pricing tiers, credits, cost analysis |
| `/docs/CREDIT-SYSTEM-INTEGRATION-PLAN.md` | Credit/session integration architecture |
| `/prisma/CLAUDE.md` | Database schema, migrations |

## 🤖 AI Development Team

```bash
# Tech Lead coordinates complex features
Task(subagent_type="tech-lead-orchestrator", prompt="...")

# Specialists
Task(subagent_type="react-nextjs-expert", ...)
Task(subagent_type="api-architect", ...)
Task(subagent_type="backend-developer", ...)
Task(subagent_type="performance-optimizer", ...)
Task(subagent_type="code-reviewer", ...)
Task(subagent_type="tailwind-css-expert", ...)
```

Agents understand: Next.js 15 app router, Railway (NOT Vercel), VAPI, Prisma uppercase enums, non-HIPAA constraints.

## Quick Commands

```bash
npm run dev              # Dev server (0.0.0.0:3001) — Turbopack
npm run build            # Production build
npm run typecheck        # Check types
npm run lint             # Lint code
npm run prisma:generate  # Generate Prisma client
npm run prisma:db:push   # Sync schema to database

# Testing
npm run test             # Jest unit tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:ci          # CI/CD (serial, single worker)
npm run e2e              # Playwright end-to-end tests

# Development tools
npm run storybook                # Component library (port 6006)
ANALYZE=true npm run build       # Bundle analyzer
```

## 🌿 Git Workflow

⚠️ **Always create a feature branch** before new features. Never work directly on main.

```bash
git checkout -b feature/your-feature-name
```

### Commit Requirements

**Commit after EACH completed task.**

```bash
git commit -m "feat: describe what was accomplished"

# DO NOT include Co-Authored-By or AI attribution tags
```

## image file location

../../../../../../mnt/c/Users/Quadf/OneDrive/Pictures/Screenshots/

## 💰 Pricing Overview

| Tier | Price | Sessions | Minutes/Session |
|------|-------|----------|-----------------|
| **Free** | $0 | 2/month | 15 min |
| **Pro** | $10/month or $96/year | Unlimited | 30 min |

**Stripe Price IDs**: `STRIPE_PRICE_PRO_MONTHLY` + `NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID` (same value — server & client vars)

**VAPI Rate**: $0.0203/minute confirmed. See `/PRICING-STRATEGY-ANALYSIS.md` for full analysis.

## 🚀 Railway Deployment

**Infrastructure**: Railway + Supabase + VAPI | **Fixed Costs**: ~$70/month

```bash
railway login            # Auth (opens browser)
railway up               # Deploy
railway logs --tail      # Live logs
railway variables        # View env vars
railway variables set KEY="value"
```

**Key env vars**: `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `VAPI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `UPSTASH_REDIS_REST_URL`

**Health check**: `/api/health` | **SSL**: Auto Let's Encrypt | **Auto-deploy**: Push to main

⚠️ CVE-2025-29927 (Next.js middleware auth bypass) mitigated by Clerk server-side middleware.

## 🚨 VAPI Documentation Requirement

**ALWAYS consult `/VAPI-COMPLETE-GUIDE.md` BEFORE any VAPI, session, or assistant changes.** 2,464-line reference with complete TypeScript patterns.

## 🏛️ Key Architecture Notes

- **Auth**: Clerk (`getAuthSession()` server-side, `useClerkSession()` client-side) — NOT NextAuth
- **Primary session component**: `TherapyButtonRefactored.tsx` (not legacy `TherapyButton.tsx`)
- **Test runners**: Jest (primary) + Vitest (both available)
- **Image CDN**: Bunny CDN via custom Next.js loader in `next.config.js`
- **Middleware**: `src/middleware.ts` — Clerk + rate limiting
- **VAPI MCP Server**: `.mcp.json` for direct Vapi account inspection (in `.gitignore`)

## MCP Tools

### Search & Web
- `mcp__omnisearch__tavily_search` — Web search
- `mcp__omnisearch__brave_search` — Technical search
- `mcp__omnisearch__firecrawl_scrape_process` — Extract from URLs

### File Operations (Desktop Commander)
- `mcp__project-files__read_file` / `write_file` / `edit_block`
- `mcp__project-files__search_code` — Ripgrep search
- `mcp__project-files__execute_command` — Terminal commands

### Database & Memory
- `mcp__postgres__query` — Read-only SQL
- `mcp__memory__search_nodes` / `add_observations` / `read_graph`

## Development Workflow

1. **Task Management**: Break down → Prioritize → Track with TodoWrite
2. **VAPI Changes**: 🚨 READ `/VAPI-COMPLETE-GUIDE.md` FIRST
3. **Code Changes**: Search MCP memory → Make changes → Update MCP memory
4. **Testing**: Isolate → Integration checks → Validate
5. **Documentation**: Update the correct subdirectory CLAUDE.md

## Resources

- [Next.js 15](https://nextjs.org/docs) | [VAPI](https://docs.vapi.ai) | [Supabase](https://supabase.com/docs)
- [Clerk Docs](https://clerk.com/docs) | [Railway Deploy](https://docs.railway.app)
- [PostHog](https://posthog.com/docs) | [Prisma 5](https://www.prisma.io/docs/guides/upgrade-guides/upgrading-versions/upgrading-to-prisma-5)
