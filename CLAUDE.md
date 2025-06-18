# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 15 TypeScript therapy platform with real-time voice AI therapy sessions.

**Tech Stack**: Next.js 15, React 19, TypeScript, Prisma, PostgreSQL (Supabase), VAPI (Voice AI), NextAuth.js, TailwindCSS 4, Framer Motion

**Key Features**: Voice therapy sessions, real-time transcription, session recovery, dashboard analytics, email notifications

## 📂 Directory Documentation

Detailed documentation for each area of the codebase:

- `/src/hooks/CLAUDE.md` - Custom React hooks (auth, session recovery, real-time metrics)
- `/src/components/CLAUDE.md` - UI components (modals, animations, dashboard widgets)
- `/src/lib/CLAUDE.md` - Core services (VAPI, auth, database, real-time systems)
- `/src/app/api/CLAUDE.md` - API routes (REST endpoints, WebSocket, authentication)
- `/src/app/dashboard/CLAUDE.md` - Dashboard pages (data flow, real-time updates)
- `/prisma/CLAUDE.md` - Database schema (models, migrations, optimization)
- `/src/emails/CLAUDE.md` - Email templates (session notifications, reminders)
- `/src/types/CLAUDE.md` - TypeScript types (comprehensive type definitions)

## Essential Commands

### Development
```bash
npm run dev              # Development server (0.0.0.0:3000)
npm run dev:https        # HTTPS development (required for VAPI)
npm run build            # Production build
npm run lint             # ESLint validation
npm run typecheck        # TypeScript validation
```

### Database
```bash
# Critical workflow after schema changes:
npm run prisma:generate  # Generate Prisma client
npm run prisma:db:push   # Sync to Supabase
npx prisma studio        # Database UI
```

## 🚨 Critical Configuration

### Database Connection
**ALWAYS use `.env`** (never `.env.local`) for Supabase:
```
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### VAPI Speech Guidelines
**❌ NEVER USE**: `*action*`, `<emotion>`, stage directions  
**✅ USE**: Natural speech with "..." for pauses, spell out numbers

### Environment Variables
**Required**: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `RESEND_API_KEY`, `VAPI_API_KEY`, `JWT_TOKEN_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Code Standards

### General Patterns
- **TypeScript**: Strict mode, explicit types, path aliases `@/*` → `src/*`
- **React**: Functional components, typed props, custom hooks for logic
- **Async**: Always use async/await, proper error handling
- **Imports**: React/Next → external libs → internal modules
- **Naming**: camelCase variables, PascalCase components

### API Routes
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Implementation
    return NextResponse.json({ data });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### UI & Styling
- **TailwindCSS 4** with mobile-first approach
- **Framer Motion** for all animations
- **Responsive**: Design mobile-first, scale up
- **Components**: Use composition, avoid prop drilling
- **React Portals**: Use for modals, tooltips, and overlays to avoid CSS stacking context issues

## Project Structure
```
src/
├── app/           # Next.js App Router
├── components/    # React components
├── hooks/         # Custom React hooks ← REFACTORED CODE HERE
├── lib/           # Services & utilities
├── types/         # TypeScript definitions
└── emails/        # Email templates
```

## 🔄 Recent Refactoring ✅ COMPLETED

**UPDATE: The refactored code is now the primary implementation**

The original TherapyButton.tsx (4,431 lines) has been successfully refactored into:
- **11 focused hooks** in `/src/hooks/`:
  - `useVapiSession` - VAPI voice AI integration
  - `useSessionManagement` - Session state orchestration
  - `useTranscriptHandler` - Real-time transcript processing
  - `useTherapySessionRecovery` - Session recovery logic
  - `useSupabaseRealTimeMetrics` - Supabase Realtime metrics (replaces WebSocket)
  - `useSupabaseSessionState` - Session pause/resume state via Supabase
  - `useVapiMetricsBridge` - Bridges VAPI with Supabase broadcasting
  - `useAuth` - Authentication management
  - `useButtonSound` - UI sound effects
  - `usePersistentOnboarding` - Onboarding state
  - `useVapiToken` - JWT token management with rate limiting ⚠️ NEW
- **10+ small UI components** for modular session interface
- **Feature flag system** with development mode defaulting to refactored code
- **TherapyButtonWrapper** component that routes to refactored implementation

**Current Status**:
- ✅ Development environment uses refactored code exclusively
- ✅ TherapyButtonRefactored is the active implementation
- ✅ Inline VAPI assistant configuration fully integrated
- ✅ All hooks and components tested and working
- ✅ Rate limiting properly implemented in useVapiToken hook
- ✅ Fixed infinite loop issues with memoized callbacks
- ⚠️ Original TherapyButton.tsx kept for emergency fallback only

**Recent Critical Fixes (Dec 2024)**:
- Fixed `useVapiSession` initialization order preventing "Cannot access before initialization" errors
- Implemented proper rate limiting in `useVapiToken` with exponential backoff
- Added comprehensive token validation and expiry checking
- Memoized all callbacks to prevent re-render loops
- Added user switching protection to clear rate limit state
- Implemented periodic token validity checks for edge cases
- **Fixed UI flicker during VAPI session initialization** - Centralized session-active class management
- **Resolved "Maximum update depth exceeded" errors** - Removed setState calls from cleanup functions
- **Implemented ref-based state access in callbacks** - Prevents stale closures and re-render loops
- **Fixed react-timer-hook infinite loops** - Used refs for timer functions to prevent re-render cycles
- **Fixed pause/resume UI accessibility** - Adjusted overlay positioning to keep controls accessible
- **Added optimistic UI updates** - Instant feedback for pause/resume actions

See documentation for details:
- `/docs/REFACTORING_STATUS.md` - Full refactoring implementation
- `/docs/JWT_AUTHENTICATION_FIX.md` - JWT/VAPI authentication fixes  
- `/docs/UI_FLICKER_FIX.md` - UI flicker and infinite loop fixes
- `/src/hooks/RATE_LIMITING_FIX.md` - Rate limiting best practices
- `/docs/REACT_TIMER_HOOK_FIX.md` - React timer hook infinite loop fixes
- `/docs/SESSION_RECOVERY_FIXES.md` - Session recovery and pause/resume fixes

## Development Setup

### WSL2 File System Access
**Screenshots & Windows Files**: Access Windows file system from WSL2:
```bash
# Screenshots location (Windows OneDrive)
../../../../../../mnt/c/Users/Quadf/OneDrive/Pictures/Screenshots

# General Windows file access
/mnt/c/Users/[Username]/[Path]
```
**Important**: When asked to view screenshots or access files outside WSL2, look in the Windows file system mounted at `/mnt/c/`.

### HTTPS (Required for VAPI)
```bash
# Install mkcert
sudo apt update && sudo apt install libnss3-tools
# Generate certificates
mkcert -install && mkcert localhost 127.0.0.1 ::1
# Enable HTTPS
echo "USE_HTTPS=true" >> .env
npm run dev:https
```

### Git Workflow
- Commit format: `<type>: <description>` (feat/fix/refactor/style/docs/test/chore)
- **Never include Claude attribution** in commits

## Common Issues & Solutions

### Rate Limiting & Token Management
**Problem**: Infinite loops when rate limited, token refresh issues
**Solution**: Proper state management and memoization

```typescript
// ✅ CORRECT: Use refs for callbacks to prevent re-renders
const onErrorRef = useRef(onError);
useEffect(() => {
  onErrorRef.current = onError;
}, [onError]);

// ✅ CORRECT: Check rate limit before token fetch
if (isRateLimitedRef.current && Date.now() < rateLimitResetTimeRef.current - 100) {
  return; // Skip fetch while rate limited
}

// ✅ CORRECT: Validate received tokens
if (!tokenData.token || tokenData.expiresAt <= Date.now() / 1000) {
  throw new Error('Invalid or expired token');
}
```

### React Portals for Modals & Overlays
**Problem**: Modals/overlays constrained by parent CSS (transform, filter, perspective)
**Solution**: Use React Portals to render outside DOM hierarchy

```typescript
import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';

export default function Modal({ isOpen, children }) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  if (!isClient) return null;
  
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;
  
  return createPortal(
    <>{isOpen && children}</>,
    modalRoot
  );
}
```

**Required**: Add `<div id="modal-root"></div>` to root layout.tsx after main content

### Database Errors
- `P2022: Column does not exist` → Run `npx prisma db push`
- `P1001: Can't reach database` → Check `.env` file (not `.env.local`)

### React/JSX Errors
- `Unexpected token div` → Check closing tags, `.map()` syntax
- Debug: `npx tsc --noEmit --jsx preserve <file>`

### Conditional Rendering
```javascript
// ❌ BUG: Overlapping string matches
if (field.name.startsWith("familyMember")) // Catches "familyMemberCount"

// ✅ FIX: Be specific
if (field.name.startsWith("familyMember") && field.name !== "familyMemberCount")
```

## External Resources

**Documentation**: [Next.js](https://nextjs.org/docs) | [TailwindCSS](https://tailwindcss.com/docs) | [Framer Motion](https://motion.dev/docs) | [VAPI](https://docs.vapi.ai/introduction)

**VAPI Reference Code**: When working with VAPI integration, reference these local directories for implementation patterns:
- **/server-sdk-typescript-main/** - Server-side VAPI integration patterns and API usage
- **/example-client-javascript-react-master/** - Client-side JavaScript implementation examples  
- **/client-sdk-web-main/** - Web SDK usage patterns and TypeScript definitions

**Examples**: [VAPI React](https://github.com/VapiAI/example-client-javascript-react) | [Recharts](https://recharts.org/en-US/examples)

## Critical Reminders

1. **Think and double-check** all work before finalizing
2. **Use `.env`** for database connections (never `.env.local`)
3. **Avoid meta-speech** in AI prompts ("I see...", "I notice...")
4. **Test refactored code** - Dev environment uses new code by default
5. **Follow TypeScript strict mode** - No `any` types
6. **Handle errors properly** in all async operations
7. **Mobile-first design** for all UI components
8. **Check directory CLAUDE.md** for area-specific guidance
9. **Use React Portals** for all modals, tooltips, dropdowns, and overlays

## Cost Optimization (Future)

Voice AI costs ~$0.13/minute. Future implementation:
- Usage limits & token system
- Quality tiers (basic/standard/premium)
- Subscription plans ($24.99-$99.99/month)
- See detailed plan in original CLAUDE.md archive