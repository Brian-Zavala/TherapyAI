# DATABASE SCHEMA CONSISTENCY ANALYSIS
**Next.js 15 Therapy Platform - Critical Architectural Issue Report**

Date: January 12, 2025  
Status: 🚨 **CRITICAL - IMMEDIATE ACTION REQUIRED**

## Executive Summary

The platform has **two competing session models** creating severe data integrity risks:
- **Legacy System**: `Session` model (145+ fields) with complex relationships
- **Credit System**: `TherapySession` model (13 fields) with simplified structure

**Critical Issue**: Frontend recently switched to credit system, but majority of codebase still expects legacy Session model, creating potential data corruption and feature failures.

## 🏗️ Model Comparison Analysis

### 1. Field Coverage Comparison

| Feature Category | Session Model | TherapySession Model | Data Loss Risk |
|-----------------|---------------|---------------------|---------------|
| **Core Session Data** | ✅ Complete | ✅ Basic | 🟡 Medium |
| **VAPI Integration** | ✅ Full tracking | ❌ Missing | 🔴 High |
| **Real-time Metrics** | ✅ Comprehensive | ❌ None | 🔴 High |
| **Pause/Resume** | ✅ Full support | ❌ Missing | 🔴 High |
| **Transcript Storage** | ✅ Relationship | ❌ No relation | 🔴 High |
| **Family Members** | ✅ Many-to-many | ❌ No relation | 🔴 High |
| **Progress Tracking** | ✅ Linked | ❌ No relation | 🔴 High |
| **Notifications** | ✅ Full system | ❌ Basic flags | 🟡 Medium |
| **Audit Trail** | ✅ Comprehensive | ❌ Basic | 🔴 High |

### 2. Detailed Field Analysis

#### Session Model (Legacy) - 145+ Fields
```typescript
// Core session management
id, userId, assistantId, date, startTime, endTime, completedAt
duration, theme, notes, status, terminationReason

// Real-time conversation tracking  
conversationTimeSeconds, lastConversationStart, isPaused, pausedAt, resumedAt
totalPausedTimeSeconds, pauseStartTime

// VAPI integration
vapiCallId, vapiCallCost, vapiRecordingUrl

// Notification system
reminderSent, smsReminderSent, emailReminderSent, oneHourReminderSent
notificationToken, notificationTokenExpiry, startedViaNotification

// Credit tracking (retrofit)
creditsAllocated, creditsUsed

// Relationships (critical dependencies)
- sessionFamilyMembers: SessionFamilyMember[]
- transcriptEntries: TranscriptEntry[]
- sessionMetrics: SessionMetrics?
- therapyInsights: TherapyInsight[]
- conversationState: ConversationState?
- communicationMetrics: CommunicationMetric[]
- progressTracking: ProgressTracking[]
- notificationTracking: NotificationTracking[]
```

#### TherapySession Model (Credit) - 13 Fields
```typescript
// Minimal session data
id, userId, sessionDate, duration, notes, status, reminderSent, createdAt, updatedAt

// Basic notification flags
notificationPrefs, smsReminderSent, emailReminderSent

// No relationships - isolated model
```

## 🔍 Data Flow Analysis

### Current Architecture Problems

#### 1. Webhook Routing Conflicts
```mermaid
graph TD
    A[VAPI Call] --> B{Webhook Route?}
    B --> C[/api/vapi/webhooks] 
    B --> D[/api/vapi/webhook-credit]
    C --> E[Session Model Updates]
    D --> F[TherapySession Model Updates]
    E --> G[Database Mismatch]
    F --> G
    G --> H[Data Corruption Risk]
```

**Problem**: VAPI calls could hit either webhook handler depending on configuration, updating different models with incompatible schemas.

#### 2. Session Creation Flow Inconsistency

**Legacy Flow** (`/api/sessions`)
```typescript
POST /api/sessions → Session.create() → 145 fields populated → Full feature support
```

**Credit Flow** (`/api/sessions/create-with-credits`)  
```typescript
POST /api/sessions/create-with-credits → TherapySession.create() → 13 fields → Limited features
```

**Critical Issue**: Frontend switched to credit flow but dashboard expects Session model data.

#### 3. Real-time Feature Mismatches

| Feature | Legacy Support | Credit Support | Impact |
|---------|---------------|----------------|---------|
| **Session Pause/Resume** | ✅ Full tracking | ❌ Status only | Session state loss |
| **Live Metrics Broadcasting** | ✅ Supabase realtime | ❌ No setup | Dashboard breaks |
| **Transcript Real-time** | ✅ Progressive display | ❌ No storage | Feature failure |
| **Progress Insights** | ✅ AI analysis | ❌ No data link | Insights lost |
| **Family Session Tracking** | ✅ Participant links | ❌ No support | Data isolation |

## 🚨 Critical Issues Identified

### 1. **Data Integrity Violations** 
- Sessions created via credit system have no transcript storage capability
- Real-time metrics cannot be associated with TherapySession records
- Progress tracking becomes disconnected from session data

### 2. **Query Compatibility Failures**
```typescript
// This query WILL FAIL if session created via credit system
const sessionWithTranscripts = await prisma.session.findMany({
  include: { transcriptEntries: true } // TherapySession has no transcriptEntries relation
});
```

### 3. **Foreign Key Constraint Violations**
- `SessionFamilyMember.sessionId` references `Session.id` but credit system creates `TherapySession.id`
- `TranscriptEntry.sessionId` cannot link to TherapySession records
- `SessionMetrics.sessionId` relationships broken for credit sessions

### 4. **Webhook Processing Conflicts**
```typescript
// webhook-credit/route.ts expects TherapySession
await prisma.therapySession.updateMany({
  where: { id: sessionId, status: { not: SessionStatus.ACTIVE }}
});

// webhooks/route.ts expects Session  
const session = await prisma.session.findUnique({
  include: { transcriptEntries: true, sessionMetrics: true }
});
```

**Risk**: Wrong webhook handler = data corruption or 500 errors.

## 🔗 Integration Dependencies Analysis

### Systems Expecting Session Model

1. **Dashboard Components** (`/dashboard`)
   - Session history tables
   - Progress charts  
   - Real-time metrics
   - Transcript viewers

2. **Real-time Features** (`/lib/realtime`)
   - Supabase subscriptions configured for `Session` table
   - Broadcast channels expect Session schema
   - Live metrics depend on Session relationships

3. **Analytics Engine** (`/lib/analytics`)
   - Session aggregation queries
   - Progress tracking calculations
   - Insight generation algorithms

4. **Notification System** (`/lib/notifications`)
   - Session reminder scheduling
   - Progress update emails
   - Achievement notifications

### Systems Expecting TherapySession Model

1. **Credit Manager** (`/lib/services/credit-manager.service.ts`)
   - Usage tracking and deduction
   - Billing calculations
   - Quota enforcement

2. **VAPI Session Manager** (`/lib/services/vapi-session-manager.ts`)  
   - Session lifecycle management
   - Credit-based time limits
   - Webhook processing

## 🚨 Real-time Features Impact Assessment

### Supabase Real-time Configuration Issues

```typescript
// Current setup expects Session table
const subscription = supabase
  .channel('session-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public', 
    table: 'Session'  // TherapySession records won't trigger updates
  });
```

**Impact**: Real-time features completely broken for credit-system sessions.

### Broadcast Channel Mismatches

```typescript
// Dashboard expects Session schema
broadcast.send({
  sessionId: session.id,
  transcriptEntries: session.transcriptEntries, // undefined for TherapySession
  metrics: session.sessionMetrics,              // undefined for TherapySession
  pausedAt: session.pausedAt                   // undefined for TherapySession  
});
```

## 💾 Database Migration Risks

### Option 1: Migrate TherapySession → Session (Recommended)
**Risks:**
- Credit system logic needs refactoring to work with Session model
- Data transformation complexity for missing fields
- Potential service disruption during migration

**Benefits:**
- Preserves existing feature functionality
- Single source of truth
- No query compatibility issues

### Option 2: Migrate Session → TherapySession (NOT RECOMMENDED)
**Risks:**
- Massive data loss (132 fields removed)
- All real-time features broken
- Major architectural refactoring required
- Complete feature regression

### Option 3: Dual Model Sync (Complex)
**Risks:**
- Data consistency challenges
- Complex sync logic required
- Performance overhead
- Still maintains architectural debt

## 🛠️ Immediate Fix Recommendations

### Priority 1: CRITICAL (Fix Today)
1. **Webhook Route Consolidation**
   ```bash
   # Merge webhook handlers to handle both models
   # Route based on sessionId lookup rather than assumption
   ```

2. **Session Creation Endpoint Fix**
   ```bash
   # Modify /api/sessions/create-with-credits to create Session records
   # Keep credit logic but use proper model
   ```

3. **Frontend Route Update**  
   ```bash
   # Change frontend to use /api/sessions with credit=true flag
   # Avoid dual endpoints entirely
   ```

### Priority 2: HIGH (Fix This Week)
1. **Data Migration Script**
   - Move TherapySession records to Session table
   - Populate missing fields with defaults
   - Preserve credit tracking

2. **Real-time Configuration Update**
   - Ensure all Supabase subscriptions point to Session table
   - Update broadcast schemas

3. **Query Auditing**
   - Find all queries assuming Session model
   - Add error handling for missing relationships

### Priority 3: MEDIUM (Fix Next Sprint)  
1. **Model Consolidation**
   - Remove TherapySession model entirely
   - Add credit fields to Session model (already present)
   - Update all service references

2. **Testing Suite**
   - Add integration tests for session creation
   - Test webhook routing with both legacy and new sessions
   - Validate real-time features work consistently

## 📋 Migration Strategy

### Phase 1: Emergency Stabilization (Today)
```sql
-- Create emergency sync function
CREATE OR REPLACE FUNCTION sync_therapy_to_session()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert/update Session record when TherapySession changes
  INSERT INTO "Session" (
    id, "userId", date, duration, theme, notes, status, 
    "reminderSent", "createdAt", "updatedAt"
  ) VALUES (
    NEW.id, NEW."userId", NEW."sessionDate", NEW.duration, 
    'AI Therapy Session', NEW.notes, NEW.status,
    NEW."reminderSent", NEW."createdAt", NEW."updatedAt"
  ) ON CONFLICT (id) DO UPDATE SET
    duration = NEW.duration,
    notes = NEW.notes,
    status = NEW.status,
    "reminderSent" = NEW."reminderSent",
    "updatedAt" = NEW."updatedAt";
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger for temporary sync
CREATE TRIGGER therapy_session_sync
  AFTER INSERT OR UPDATE ON "TherapySession"
  FOR EACH ROW EXECUTE FUNCTION sync_therapy_to_session();
```

### Phase 2: Data Migration (Week 1)
```typescript
// Migration script to move TherapySession records
async function migrateTherapyToSession() {
  const therapySessions = await prisma.therapySession.findMany();
  
  for (const therapy of therapySessions) {
    await prisma.session.upsert({
      where: { id: therapy.id },
      create: {
        id: therapy.id,
        userId: therapy.userId,
        date: therapy.sessionDate,
        duration: therapy.duration,
        theme: 'AI Therapy Session',
        notes: therapy.notes || '',
        status: therapy.status as SessionStatus,
        reminderSent: therapy.reminderSent,
        createdAt: therapy.createdAt,
        updatedAt: therapy.updatedAt,
        // Default values for missing fields
        conversationTimeSeconds: 0,
        totalPausedTimeSeconds: 0,
        isPaused: false,
        sessionType: 'SOLO'
      },
      update: {
        duration: therapy.duration,
        notes: therapy.notes,
        status: therapy.status as SessionStatus,
        updatedAt: therapy.updatedAt
      }
    });
  }
}
```

### Phase 3: Model Cleanup (Week 2)
1. Remove TherapySession model from schema
2. Update all service imports
3. Remove dual webhook handlers
4. Clean up migration artifacts

## 🧪 Testing Requirements

### Critical Test Cases
1. **Session Creation Consistency**
   - Verify both endpoints create same model
   - Test all required fields populated
   - Validate relationship integrity

2. **Webhook Processing**  
   - Test VAPI webhooks hit correct handler
   - Verify session updates work regardless of creation method
   - Test real-time broadcasting

3. **Real-time Features**
   - Test dashboard updates for all session types
   - Verify transcript streaming works  
   - Check metrics broadcasting

4. **Credit System Integration**
   - Verify credit deduction works with Session model
   - Test quota enforcement
   - Validate billing calculations

## 🎯 Success Metrics

- [ ] Zero 500 errors on session creation
- [ ] Real-time features work for all sessions  
- [ ] No data loss in migration
- [ ] Single webhook handler processes all VAPI events
- [ ] Dashboard shows consistent data regardless of session creation method
- [ ] All foreign key relationships intact
- [ ] Credit system functions normally with unified model

## 📞 Conclusion

The dual session model architecture represents a **critical data integrity risk** that must be resolved immediately. The recommended solution is to **consolidate on the Session model** while preserving credit system functionality.

**Immediate Actions Required:**
1. Stop creating TherapySession records (use Session model)
2. Merge webhook handlers to process both record types safely  
3. Plan data migration to eliminate architectural debt

**Timeline:**
- **Today**: Emergency fixes for webhook routing
- **Week 1**: Complete data migration  
- **Week 2**: Remove TherapySession model entirely

The platform's scalability and data integrity depend on resolving this architectural conflict quickly and thoroughly.