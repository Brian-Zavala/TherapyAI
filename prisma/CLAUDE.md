# CLAUDE.md - Prisma / Database

PostgreSQL via Supabase. Prisma ORM with connection pooling (pgbouncer).

## Critical Rules

- **Enums are UPPERCASE** — always use `COMPLETED`, `ACTIVE`, `SOLO`, `COUPLE`, `FAMILY`, `PAUSED`
- **Soft deletes**: Use `isDeleted` flag, NOT `isActive`
- **Auth field**: `User.clerkId` links Clerk user to DB user
- **Schema sync**: Run `npm run prisma:db:push` after schema changes

## Key Models

| Model | Purpose |
|-------|---------|
| `User` | Core user — has `clerkId`, `subscriptionStatus`, `stripeCustomerId` |
| `Session` | Therapy sessions — `status` enum: SCHEDULED/ACTIVE/PAUSED/COMPLETED/CANCELLED/TERMINATED/ABANDONED/TECHNICAL_ISSUE |
| `SessionSummary` | AI-generated session insights — relation field is `Session` (capital S) |
| `UsageCredits` | Credit balance per user — `planType`: 'free' or 'pro' |
| `CreditReservation` | In-progress session credit holds |
| `UserProfile` | Extended user preferences, therapy goals |
| `FamilyMember` | Family therapy participants |
| `CommunicationMetric` | Per-session metrics — upsert-aware to avoid duplicates |
| `ProgressTracking` | Long-term therapy progress |
| `AIInsight` | Per-session AI insights — requires valid `sessionId` FK, uses `metadata` JSON for extras |
| `DynamicGoal` | AI-generated goals — `status` is `GoalStatus` enum (ACTIVE/COMPLETED/CANCELLED/PAUSED/OVERDUE), field is `goalType` not `type` |
| `InsightPattern` | Tracked therapy patterns — `isActive`, `isPositive`, `frequency` |
| `DailyTip` | Scheduled daily tips — `isActive`, `scheduledDate`, `isPersonalized` |
| `Resource` | Curated therapy resources — matched to users by topic/session type |

## SessionStatus Enum

```prisma
enum SessionStatus {
  SCHEDULED
  ACTIVE
  PAUSED
  COMPLETED
  CANCELLED
  TERMINATED
  ABANDONED
  TECHNICAL_ISSUE
}
```

**CRITICAL**: Supabase realtime `postgres_changes` and Prisma both return uppercase. Always compare with uppercase or normalize:
```typescript
status?.toUpperCase() === 'COMPLETED'  // ✅
status === 'completed'                  // ❌ silently fails
```

## SessionSummary Relation

```typescript
// ✅ Correct — capital S matches generated type
const summary = await prisma.sessionSummary.findFirst({
  include: { Session: true }  // capital S
})

// ❌ Wrong — lowercase returns undefined silently
include: { session: true }
```

Verify relation field names against `node_modules/.prisma/client/index.d.ts` (`SessionSummaryInclude` type).

## CommunicationMetric Upsert Pattern

`generateMetricsFromSession` is upsert-aware:
- Skip if non-zero `CommunicationMetric` record already exists (preserves `calculateMetrics()` result)
- Repair all-zero legacy records
- Create if absent

Never run `create` — always check for existing before inserting metrics.

## Connection Config

```env
DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://..."  # for migrations
```

`pgbouncer=true` required for Railway + Supabase connection pooling.

## Common Commands

```bash
npm run prisma:generate   # Regenerate client after schema change
npm run prisma:db:push    # Sync schema → database (dev)
npx prisma migrate dev    # Create and apply migration
npx prisma studio         # Visual DB browser
```

## Migrations & Schema Files

- `schema.prisma` — primary schema (use this)
- `schema-enhanced.prisma` / `schema.enhanced.prisma` — legacy/experimental, do not use

Always run `prisma:generate` after editing schema so TypeScript types update.

## AIInsight Metadata Pattern

`AIInsight` has a minimal schema (type, title, description, importance, actionable, confidence, metadata). Extended fields (category, priority, timeframe, actionItems, basedOn, evidence, aiModel) are stored in the `metadata` JSON column. Always read/write extras via `metadata`:

```typescript
// ✅ Correct — store extras in metadata
await prisma.aIInsight.create({
  data: {
    userId, sessionId, type: 'progress', title, description,
    importance: 'medium', actionable: true, confidence: 80,
    metadata: { category, priority, actionItems, basedOn, evidence }
  }
});

// ✅ Correct — read extras from metadata
const meta = (insight.metadata as any) || {};
const category = meta.category || 'progress';

// ❌ Wrong — these fields don't exist on the model
status: 'active',    // no status field
priority: 'high',    // use importance instead
category: 'progress' // use type instead, or metadata.category
```

## DynamicGoal Field Mapping

```typescript
// ✅ Correct
goalType: 'relationship'  // NOT type
status: 'COMPLETED'       // GoalStatus enum, uppercase
metadata: { confidence }  // NOT a top-level field

// ❌ Wrong
type: 'relationship'      // field is goalType
status: 'active'          // must be uppercase: 'ACTIVE'
confidence: 100           // not a schema field, use metadata
```
