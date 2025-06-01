# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 15 TypeScript therapy platform with:
- **VAPI**: Real-time voice AI therapy sessions  
- **NextAuth.js**: User authentication
- **Prisma + Supabase**: PostgreSQL database
- **Resend**: Email notifications
- **Deepgram**: Real-time transcription
- **Framer Motion**: Interactive animations

## Essential Commands

### Development
- `npm run dev` - Development server with turbopack (0.0.0.0:3000)
- `npm run dev:https` - HTTPS development (requires SSL certs)
- `npm run build` - Production build
- `npm run lint` - ESLint validation

### Database (Critical Workflow)
```bash
# After modifying prisma/schema.prisma:
npm run prisma:generate  # Generate client
npm run prisma:db:push   # Sync to Supabase
npx prisma studio        # Database UI
```

**CRITICAL**: Always use `.env` (never `.env.local`) for Supabase PostgreSQL connection:
`postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

**Common Fixes**:
- `P2022: Column does not exist` → Run `npx prisma db push`
- `P1001: Can't reach database` → Remove `.env.local`, use only `.env`

## Code Standards

### TypeScript & Next.js
- Strict mode, ES2017 target, path aliases `@/*` → `src/*`
- App Router conventions, functional components with typed props
- Async/await for all operations, proper error handling in API routes
- Import order: React/Next.js → external libs → internal modules
- camelCase variables, PascalCase components

### Styling & Animation
- **TailwindCSS 4** with `clsx` + `tailwind-merge` utilities
- **Framer Motion** for all animations (motion.dev)
- Custom breakpoint: `xs: "480px"`
- **Mobile-first approach**: Design for mobile devices first, then scale up to larger screens/desktop

### Authentication
- **NextAuth** JWT strategy (30-day sessions)
- **bcrypt** password hashing
- Public routes: `/`, `/auth/*`, `/terms`, `/privacy`

## Key Dependencies

**Core**: Next.js 15, React 19, Prisma, NextAuth  
**Voice/AI**: @vapi-ai/web, @deepgram/sdk, ws  
**UI**: TailwindCSS 4, Framer Motion, @heroicons/react, lucide-react  
**Data**: Recharts, react-datepicker  
**Communication**: Resend, @react-email/components  
**Utilities**: date-fns, bcrypt, jsonwebtoken, uuid

## VAPI Configuration

### Resources
- [Docs](https://docs.vapi.ai/introduction) | [SDK](https://docs.vapi.ai/sdk/web) | [Assistants](https://docs.vapi.ai/assistants)
- [Examples](https://github.com/VapiAI/example-client-javascript-react) | [Server SDK](https://github.com/VapiAI/server-sdk-typescript)

### Speech Guidelines (CRITICAL)
**❌ NEVER USE**: `*action*`, `<emotion>`, stage directions (read aloud!)
**✅ NATURAL SPEECH**: 
- Pauses: `...` | Hesitation: "um", "uh", "well" 
- Numbers: "three" not "3" | Time: "four thirty PM" not "4:30 PM"

### Age Integration (CRITICAL)
**❌ Wrong**: "Julie 11 and Charles 9" (robotic)
**✅ Correct**: "Julie, at 8 years old, you're at an age where..."

### Audio Features
- Click sounds (`useButtonSound` hook)
- Background music player
- Voice waveform visualization
- [React Voice Visualizer](https://github.com/YZarytskyi/react-voice-visualizer)

### Assistants & Model Configuration
**All use**: Claude Sonnet 4 (`claude-sonnet-4-20250514`), Temp: 1.0, Max Tokens: 750

- **Couple**: Dr. Maya Thompson (`NEXT_PUBLIC_VAPI_COUPLE_ASSISTANT_ID`)
- **Solo**: Dr. Elliot Mackaphy (`NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID`) 
- **Family**: Dr. Jada Pearson (`NEXT_PUBLIC_VAPI_FAMILY_ASSISTANT_ID`)

### Key Files
- `/src/lib/vapi.ts` - Core config & personalization
- `/src/components/TherapyButton.tsx` - Client session init
- `/src/components/SessionDurationModal.tsx` - Duration selection
- `/src/app/api/vapi/assistant/route.ts` - GET personalized configs

### Critical Settings
- `clientMessages`: Include `"model-output"` for transcript capture
- `maxDurationSeconds`: 1800 (30min) | 3600 (60min)
- `recordingEnabled: true`, `backgroundSound: "off"`

### Meta Speech Prevention (CRITICAL)
**❌ PROHIBITED**: "I see we have...", "I notice...", "I find that..."
**✅ DIRECT**: "Julie, at eleven years old...", "We have 5 minutes left..."

### Personalization Variables
- **Core**: userName, userAge, pronouns, therapyType
- **Couple**: partnerName, partnerAge, relationshipStatus  
- **Family**: familyMember1-4, familyMember1Age-4Age
- **Context**: currentConcerns, sessionHistory, communicationStyle

## Session Duration & Timing

### Duration Selection Flow
1. User clicks therapy button → Duration modal opens (30/60 min, default: 60)
2. API receives `&duration=30|60` → Sets `maxDurationSeconds` (1800s|3600s)
3. AI receives timing instructions in system prompt
4. Session auto-ends at selected duration

### AI Timing Behavior
- **Warning**: At duration-5 minutes: "We have about 5 minutes left..."
- **Closure**: Final 2 minutes begin summarization
- **Auto-end**: VAPI terminates at exact duration

## External Resources

### Documentation Links
**TailwindCSS**: [Installation](https://tailwindcss.com/docs/installation/framework-guides/nextjs) | [Responsive Design](https://tailwindcss.com/docs/responsive-design)
**Recharts**: [Getting Started](https://recharts.org/en-US/guide/getting-started) | [API](https://recharts.org/en-US/api)
**Motion.dev**: [Quick Start](https://motion.dev/docs/react-quick-start) | [Animations](https://motion.dev/docs/react-layout-animations) | [Hooks](https://motion.dev/docs/react-use-animate)
**Next.js**: [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) | [Docs](https://nextjs.org/docs)

### Therapy Enhancement Resources
- [BetterHelp Quotes](https://www.betterhelp.com/advice/therapy/50-therapy-quotes-to-encourage-you/)
- [Therapy Approaches](https://mentalhealthmatch.com/articles/glossary-therapy-approaches-modalities)
- [Speech Therapy Phrases](https://www.vocovision.com/resources/parents/carrier-phrases-speech-therapy/)

## Environment Variables

**Required**: `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `RESEND_API_KEY`, `VAPI_API_KEY`, `JWT_TOKEN_SECRET`, `CRON_SECRET`

**Optional**: Google OAuth (`GOOGLE_CLIENT_ID/SECRET`), Facebook OAuth (`FACEBOOK_CLIENT_ID/SECRET`), Twilio SMS, `USE_HTTPS=true`

## Project Structure & Patterns

```
src/
├── app/           # Next.js App Router (API routes, pages)
├── components/    # React components (ui/, dashboard/)
├── hooks/         # Custom React hooks  
├── lib/           # Services & utilities
├── types/         # TypeScript definitions
└── emails/        # Email templates
```

### API Route Template
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Animation Pattern
```typescript
import { motion } from 'framer-motion';

<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
  Content
</motion.div>
```

## Custom Components & Hooks

**UI Components**: Aurora Background, Vortex, Spotlight, Glass Card, Hero Highlight, Images Slider, Layout Grid, Pulse Ring, Therapeutic Bokeh

**Hooks**: `useAuth()` (session management), `useButtonSound()` (UI effects)

**Database Models**: User, Session, Transcript, Progress, Notification preferences

## Development Setup & Debugging

### Git Workflow
- Commit after significant changes with meaningful messages
- Format: `<type>: <description>` (feat/fix/refactor/style/docs/test/chore)
- **Never include Claude attribution** in commits (no "Generated with Claude Code" or "Co-Authored-By: Claude")

### HTTPS Setup (Required for VAPI)
```bash
# Install mkcert (WSL2)
sudo apt update && sudo apt install libnss3-tools wget
wget -O mkcert https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64
chmod +x mkcert && sudo mv mkcert /usr/local/bin/

# Generate certificates
mkcert -install && mkcert localhost 127.0.0.1 ::1

# Enable HTTPS
echo "USE_HTTPS=true" >> .env
npm run dev:https
```

### WSL2 File Access
Use `/mnt/c/Users/...` for Windows files with absolute paths

### Common JSX Errors
**Symptom**: "Unexpected token `div`"
**Causes**: Missing closing tags, extra parentheses in `.map()`, unclosed functions
**Debug**: `npx tsc --noEmit --jsx preserve src/components/Component.tsx`


## Welcome Page Validation

**File**: `/src/app/welcome/page.tsx` - 6-step onboarding form
**Step 1 Validation**: Name (required, non-empty) + Age (required, > 0)

### Validation Features
- Visual feedback: Red borders, warning tooltips, field-specific messages
- Edge case handling: Whitespace, zero/negative ages
- Progressive: Only Step 1 validated currently
- Debugging: Console logs for validation state

## Layout & Viewport Issues

### Spotlight Component Fix (Dec 2024)
**Problem**: Extra scrollable space on minimal content pages
**Root Cause**: `h-screen`/`w-screen` forcing viewport dimensions
**Solution**: Use `fixed inset-0` with `w-full h-full` instead

## Cost Optimization & Revenue Strategy

### Current State: Free Beta → Sustainable Business Model
**Problem**: Voice AI costs $0.13/minute (~$4-8 per session) with no revenue controls
**Solution**: Implement Yuna-style optimization with premium positioning

### Key Implementation Areas

#### 1. Usage Limits & Token System
```prisma
// Database additions needed:
model Subscription {
  plan              String    @default("free") // free, basic, premium
  tokensRemaining   Int       @default(3)
  monthlyLimit      Int       @default(3)
  resetDate         DateTime
}

model UsageRecord {
  durationMinutes  Int
  tokensUsed       Int       // 1 token = 30min, 2 tokens = 60min
  costUSD          Float     // Track actual VAPI costs
  qualityTier      String    // basic/standard/premium
}
```

#### 2. Quality Tiers for Cost Control
```typescript
// VAPI optimization strategies:
const QUALITY_TIERS = {
  basic: {
    model: 'claude-haiku-20241022',    // 70% cost reduction
    maxTokens: 500,
    voiceModel: 'eleven_turbo_v2'
  },
  standard: {
    model: 'claude-sonnet-4-20250514', // Current quality
    maxTokens: 750,
    voiceModel: 'eleven_turbo_v2_5'
  },
  premium: {
    model: 'claude-sonnet-4-20250514', // Enhanced features
    maxTokens: 1000,
    voiceModel: 'eleven_multilingual_v2'
  }
}
```

#### 3. Session Psychology & Behavioral Controls
- **Free users**: 30-min sessions only, gentle completion suggestions at 20 minutes
- **Session limits**: Daily caps (1-4 sessions) based on plan
- **Smart warnings**: Real-time token usage alerts and upgrade prompts
- **Natural psychology**: Users self-regulate when shown usage transparently

#### 4. Revenue Model
```typescript
// Pricing strategy (competitive with Yuna $19.99/month):
const PLANS = {
  free: { price: 0, tokens: 3, sessions: 3, duration: [30] },
  basic: { price: 24.99, tokens: 8, sessions: 8, duration: [30, 60] },
  premium: { price: 49.99, tokens: 25, sessions: 25, duration: [30, 60] },
  enterprise: { price: 99.99, tokens: 100, sessions: 100, duration: [30, 60] }
}
```

### Implementation Priority
1. **Week 1-2**: Database schema + usage limits (`/api/subscriptions`, usage validation)
2. **Week 3**: Quality tiers + session psychology (VAPI config optimization)
3. **Week 4**: UI/UX improvements (upgrade prompts, usage dashboard)
4. **Week 5**: Analytics & cost monitoring (admin dashboard, alerts)

### Key Files to Modify
- `prisma/schema.prisma` - Add subscription & usage models
- `src/lib/usage-limits.ts` - New usage validation service
- `src/components/SessionDurationModal.tsx` - Add plan restrictions
- `src/app/api/sessions/route.ts` - Pre-session usage checks
- `src/lib/vapi-config-optimizer.ts` - Quality tier selection

### Cost Reduction Targets
- **35-50% cost reduction** through quality tiers and session limits
- **Break-even**: ~500 active users with 15% conversion to paid plans
- **Risk mitigation**: Automated cost monitoring and usage caps

### Competitive Positioning
- **vs Yuna ($19.99)**: Position premium voice experience at $24.99-49.99
- **vs Traditional therapy ($150/session)**: Massive value proposition
- **vs Text-only AI**: Premium voice interaction justifies higher pricing

## Critical Reminders

- **Database**: Always use `.env` (never `.env.local`) for Supabase
- **Meta Speech**: Avoid "I see we have..." patterns in AI prompts
- **JSX Errors**: Check parentheses in `.map()` functions
- **Git**: Meaningful commits, no Claude attribution
- **Authentication**: Follow NextAuth patterns
- **Styling**: TailwindCSS + Framer Motion for animations
- **Error Handling**: Try/catch in API routes with descriptive logs
- **Cost Control**: Always validate usage limits before starting VAPI sessions
- **Quality Tiers**: Use appropriate VAPI configs based on user's subscription plan
