# Dynamic AI Insights System

## 🚀 **DEPLOYMENT GUIDE**

### **Environment Variables Required**

Add these to your Railway/production environment:

```bash
# AI Provider (Choose one)
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
# OR
OPENAI_API_KEY=sk-your-openai-key-here

# Cron Job Security
CRON_SECRET=your-secure-random-string-here

# Supabase (should already exist)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### **Database Migration**

Add these models to your `prisma/schema.prisma`:

```prisma
model AIInsight {
  id          String   @id @default(cuid())
  userId      String
  sessionIds  String[]
  
  title       String
  description String   @db.Text
  category    String
  priority    String
  timeframe   String
  
  actionItems String[] @default([])
  basedOn     String[] @default([])
  evidence    String[] @default([])
  
  confidence    Int      @default(70)
  aiModel       String   @default("claude-3-sonnet")
  aiPromptHash  String?
  
  status        String   @default("active")
  isPersonalized Boolean @default(true)
  lastReviewed  DateTime?
  dismissedAt   DateTime?
  dismissalReason String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, createdAt])
  @@index([userId, status])
  @@index([category, priority])
  @@index([timeframe])
}

model DailyTip {
  id          String   @id @default(cuid())
  userId      String?
  
  title       String?
  content     String   @db.Text
  category    String
  difficulty  String   @default("easy")
  
  isActive        Boolean  @default(true)
  scheduledDate   DateTime?
  lastShownAt     DateTime?
  timesShown      Int      @default(0)
  
  isPersonalized  Boolean  @default(false)
  basedOnInsights String[] @default([])
  targetAudience  String?
  
  userRating      Int?
  clickCount      Int      @default(0)
  completedCount  Int      @default(0)
  
  aiGenerated     Boolean  @default(false)
  aiModel         String?
  confidence      Int?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user User? @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, isActive])
  @@index([scheduledDate])
  @@index([category, difficulty])
  @@index([isPersonalized, targetAudience])
}

model InsightPattern {
  id          String   @id @default(cuid())
  userId      String
  
  patternType    String
  patternTitle   String
  description    String   @db.Text
  
  firstObserved  DateTime
  lastObserved   DateTime
  frequency      Int      @default(1)
  confidence     Float    @default(0.5)
  
  sessionIds     String[] @default([])
  insightIds     String[] @default([])
  evidence       Json
  
  isPositive     Boolean  @default(true)
  isActive       Boolean  @default(true)
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, patternType])
  @@index([userId, isActive])
  @@index([firstObserved, lastObserved])
}

model DynamicGoal {
  id          String   @id @default(cuid())
  userId      String
  
  title       String
  description String?  @db.Text
  category    String
  type        String
  
  targetDate  DateTime
  status      String   @default("active")
  progress    Int      @default(0)
  
  basedOnInsights String[] @default([])
  basedOnPatterns String[] @default([])
  aiGenerated     Boolean  @default(true)
  confidence      Int      @default(70)
  
  milestones      Json     @default("[]")
  completedAt     DateTime?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, status])
  @@index([targetDate])
  @@index([category, type])
}

model SessionAnalysisCache {
  id          String   @id @default(cuid())
  sessionId   String   @unique
  userId      String
  
  analysisData        Json
  analysisVersion     String   @default("1.0")
  
  isValid             Boolean  @default(true)
  dataQuality         String
  processingDuration  Int?
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  session Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([isValid, analysisVersion])
}

# Add to User model relations:
# aiInsights          AIInsight[]
# dailyTips           DailyTip[]
# insightPatterns     InsightPattern[]
# dynamicGoals        DynamicGoal[]
# sessionAnalysisCache SessionAnalysisCache[]
```

**Run migration:**
```bash
npx prisma db push
npx prisma generate
```

### **Cron Job Setup**

**Railway:**
Add to your Railway environment:
1. Set `CRON_SECRET` to a secure random string
2. Use Railway's Cron Jobs or external service (cron-job.org)
3. Schedule: `0 0 * * *` (daily at midnight)
4. URL: `https://your-app.railway.app/api/cron/daily-tips`
5. Method: POST
6. Headers: `Authorization: Bearer YOUR_CRON_SECRET`

**Alternative - GitHub Actions:**
```yaml
# .github/workflows/daily-tips.yml
name: Daily Tips Rotation
on:
  schedule:
    - cron: '0 8 * * *'  # 8 AM UTC = Midnight PST
jobs:
  rotate-tips:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Daily Tips
        run: |
          curl -X POST "${{ secrets.APP_URL }}/api/cron/daily-tips" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### **Real-time Updates Setup**

Ensure Supabase realtime is enabled:
1. Go to Supabase Dashboard → Settings → API
2. Enable Realtime for relevant tables
3. Check that `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set

### **Testing the System**

1. **Test AI Generation:**
```bash
# Create a completed session with transcript data
# Visit /api/therapy-insights to see dynamic insights
```

2. **Test Daily Tips:**
```bash
curl -X POST "http://localhost:3000/api/cron/daily-tips" \
  -H "Authorization: Bearer your-test-secret"
```

3. **Test Real-time Updates:**
```javascript
// In browser console on dashboard
const { supabase } = window;
supabase.channel('insights:your-user-id')
  .on('broadcast', { event: 'insights_updated' }, console.log)
  .subscribe();
```

## 🧠 **ARCHITECTURE OVERVIEW**

### **Data Flow**
```
VAPI Session → Session Processor → AI Analyzer → Insights Storage → Dashboard Display
                                              ↓
                               Real-time Broadcaster → Supabase → Dashboard Updates
```

### **Components**

1. **SessionDataProcessor** - Extracts patterns from VAPI sessions
2. **AIInsightGenerator** - Uses Claude to generate insights from session data
3. **DynamicInsightsService** - Main service integrating all components
4. **DailyTipScheduler** - Handles midnight tip rotation
5. **RealTimeInsightsBroadcaster** - Sends updates via Supabase
6. **useRealTimeInsights** - React hook for dashboard updates

### **Key Features**

✅ **No Hardcoded Values** - All insights derived from actual VAPI data  
✅ **Real-time Updates** - Dashboard updates instantly when insights change  
✅ **Daily Tip Rotation** - Automatic midnight rotation with personalized tips  
✅ **Pattern Recognition** - Identifies trends in communication and emotional patterns  
✅ **Confidence Scoring** - AI provides confidence levels for insights  
✅ **Caching** - Intelligent caching to avoid unnecessary AI calls  
✅ **Fallback System** - Graceful degradation when AI services fail  

## 🚨 **IMPORTANT NOTES**

1. **AI Costs** - Monitor Claude API usage, implement rate limiting if needed
2. **Database Growth** - Set up cleanup jobs for old insights/tips
3. **Privacy** - Insights contain user session data, ensure GDPR compliance
4. **Performance** - AI generation can take 5-15 seconds, use caching
5. **Monitoring** - Set up alerts for failed insight generation

## 🔧 **CUSTOMIZATION**

### **Add New Insight Categories**
Edit `ai-insight-generator.ts` prompt to include new categories.

### **Customize Daily Tips**
Modify `daily-tip-scheduler.ts` tip generation logic.

### **Change AI Provider**
Implement new `AIProvider` interface in `ai-insight-generator.ts`.

### **Adjust Real-time Frequency**
Modify broadcasting logic in `real-time-insights-broadcaster.ts`.

---

**🎯 RESULT:** Your dashboard will now show dynamic, personalized insights that change based on actual VAPI session conversations, with daily tips that rotate automatically at midnight!