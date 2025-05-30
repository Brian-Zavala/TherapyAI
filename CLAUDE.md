# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 TypeScript web application for couple and therapy sessions with:
- Real-time voice AI therapy sessions using VAPI
- User authentication with NextAuth.js
- PostgreSQL database with Prisma ORM
- Email notifications with Resend
- Real-time transcription with Deepgram
- Interactive UI with Framer Motion animations

## Commands

### Development
- `npm run dev`: Run development server with turbopack on 0.0.0.0:3000
- `npm run dev:https`: Run development server with HTTPS enabled (requires SSL certificates)
- `npm run dev:server`: Run development server using custom server.js (HTTP)
- `npm run dev:turbo`: Alternative turbo dev command
- `npm run build`: Build the project
- `npm run start`: Start production server with custom server.js
- `npm run start:next`: Start with Next.js default server
- `npm run lint`: Run ESLint for code linting

### Database (Prisma)
- `npm run prisma:generate`: Generate Prisma client with env vars
- `npm run prisma:db:push`: Push schema changes to database
- `npm run prisma:migrate`: Run migrations in development
- `npm run prisma:studio`: Open Prisma database UI
- `npx prisma db seed`: Seed database with test data

**CRITICAL: Database Schema Change Workflow**
1. **Environment Configuration**:
   - **ALWAYS use `.env` file** - Never create `.env.local` for database connections
   - The project uses Supabase PostgreSQL hosted on AWS, not local database
   - Database URL format: `postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

2. **After modifying `prisma/schema.prisma`**:
   ```bash
   # Step 1: Generate new Prisma client
   npm run prisma:generate
   
   # Step 2: Push schema changes to database
   npm run prisma:db:push
   # OR if npm script fails:
   npx prisma db push
   ```

3. **Common Database Sync Issues**:
   - **Error `P2022: Column does not exist`**: Database is out of sync with schema
   - **Fix**: Run `npx prisma db push` to add missing columns
   - **Error `P1001: Can't reach database`**: Wrong database URL (check for .env.local)
   - **Fix**: Remove .env.local, use only .env file

4. **Best Practices**:
   - Always sync database after schema changes before running the app
   - Test with `npm run build` to catch TypeScript/schema mismatches
   - Use `npx prisma studio` to visually verify database changes

### Utilities
- `npm run migrate-transcripts`: Migrate transcript data

## Code Style Guidelines

### TypeScript Configuration
- Strict mode enabled with ES2017 target
- Use path aliases: `@/*` maps to `src/*` directory
- Module resolution: bundler
- Incremental compilation enabled

### Coding Standards
- Follow Next.js App Router conventions for routes and API endpoints
- Prefer functional components with typed props
- Use proper error handling with try/catch blocks in API routes
- Follow ESLint rules from Next.js core-web-vitals and TypeScript configs
- Async/await for all asynchronous operations
- Format imports in this order: React/Next.js, external libraries, internal modules
- Use descriptive variable/function names in camelCase, components in PascalCase
- Always look through codebase if new session is started

### Styling
- Use TailwindCSS for styling with custom utilities
- Utility functions: `clsx` for conditional classes, `tailwind-merge` for merging
- Custom breakpoint available: `xs: "480px"`
- Extensive animation keyframes defined in Tailwind config
- Always use Framer Motion (motion.dev) for animations

### Authentication & Security
- Implement proper authentication checks using NextAuth
- JWT strategy with 30-day session max age
- Public routes: `/`, `/auth/login`, `/auth/register`, `/terms`, `/privacy`
- Use bcrypt for password hashing
- Environment-based configuration for secrets

## Key Libraries & Dependencies

### Core Framework
- **Next.js 15** with App Router
- **React 19** with TypeScript
- **Prisma ORM** for database operations
- **NextAuth.js** for authentication

### UI & Styling
- **TailwindCSS 4** for styling
- **Framer Motion** (motion.dev) for animations
- **@heroicons/react** and **lucide-react** for icons
- **react-icons** for additional icon sets
- **next-themes** for theme management
- **clsx** + **tailwind-merge** for className utilities

### Data Visualization
- **Recharts** for charts and graphs
- **react-datepicker** for date selection

### Voice & AI
- **@vapi-ai/web** for voice AI assistant
- **@deepgram/sdk** for speech processing
- **ws** for WebSocket connections

### Email & Communications
- **Resend** for email delivery
- **@react-email/components** for email templates
- **Twilio** (optional) for SMS notifications

### Utilities
- **date-fns** for date formatting
- **bcrypt** for password hashing
- **jsonwebtoken** for JWT handling
- **simplex-noise** for procedural generation
- **uuid** for unique identifiers

## Vapi Documentation

- https://docs.vapi.ai/introduction
- https://docs.vapi.ai/assistants
- https://docs.vapi.ai/sdk/web
- https://docs.vapi.ai/customization/jwt-authentication
- https://github.com/VapiAI/server-sdk-typescript
- https://github.com/VapiAI/example-client-javascript-react
- https://github.com/VapiAI/example-server-serverless-supabase
- https://github.com/VapiAI/example-server-javascript-node
- https://docs.vapi.ai/customization/tool-calling-integration
- https://docs.vapi.ai/free-telephony

### VAPI Prompting Best Practices
- **Avoid stage directions**: Don't use `*action*` or `<emotion>` - they're read aloud
- **Natural speech elements**:
  - Pauses: Use ellipses `...` for natural pauses
  - Hesitation: Add "um", "uh", "well" for realism
  - Stuttering: Repeat letters/sounds (e.g., "I-I-I don't know")
  - Emphasis: Use punctuation and capitalization
- **Numbers**: Spell out for natural speech (e.g., "three" not "3")
- **Time format**: "four thirty PM" not "4:30 PM"
- **Date format**: "January twenty-fourth" not "January 24th"

### VAPI Age Integration for Natural Speech
**CRITICAL**: Never mention ages immediately after names - this sounds robotic and unnatural.

❌ **Wrong**:
- "I'm speaking to Julie 11 and Charles 9"
- "Hello John four and Sarah six"

✅ **Correct**:
- "I see we have Julie who is 11 years old and Charles who is 9 years old"
- "So from my notes, Julie, at 8 years old, you're at an age where..."
- "Charles, being 9 years old, might have different perspectives..."
- "I understand that at 35, John, you might be experiencing..."

**Implementation**: System prompts include explicit AGE INTEGRATION INSTRUCTIONS that:
- Forbid mechanical age listing after names
- Provide natural integration examples
- Connect ages to developmental stages and life transitions
- Reference age-appropriate communication styles
- Group similar-aged family members when relevant

## Voice & Audio

### React Voice Visualizer
- https://github.com/YZarytskyi/react-voice-visualizer

### Custom Audio Features
- Click sounds for buttons (`useButtonSound` hook)
- Background music player with playlist
- Voice waveform visualization during sessions

## VAPI Assistant Configuration

### Assistant Types & IDs
- **Couple Therapy**: Dr. Maya Thompson (`NEXT_PUBLIC_VAPI_COUPLE_ASSISTANT_ID`)
- **Solo Therapy**: Dr. Elliot Mackaphy (`NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID`)
- **Family Therapy**: Dr. Jada Pearson (`NEXT_PUBLIC_VAPI_FAMILY_ASSISTANT_ID`)

### Key Configuration Files
- `/src/lib/vapi.ts`: Main VAPI configuration and personalization logic
  - `getPersonalizedAssistantConfig()`: Generates personalized configs based on user profile
  - `getPersonalizedFirstMessageForType()`: Creates dynamic intro messages
  - Contains assistant configurations for all three therapy types
  - **Accepts sessionOptions**: `{ duration: 30|60, startTime: ISO string }`
- `/src/components/TherapyButton.tsx`: Client-side session initialization
  - Fetches personalized config from API
  - Handles server-side and client-side configuration
  - **Important**: Always passes `firstMessage` when starting sessions
  - Shows SessionDurationModal before starting session
  - Passes selected duration to API: `&duration=${selectedSessionDuration}`
- `/src/components/SessionDurationModal.tsx`: Duration selection UI
  - Mobile-responsive modal component
  - 30/60 minute options with features and pricing
- `/src/app/api/vapi/assistant/route.ts`: GET endpoint for personalized configs
  - Accepts duration parameter: `?duration=30` or `?duration=60`
  - Passes sessionOptions to getPersonalizedAssistantConfig
- `/src/app/api/vapi/assistant/configure/route.ts`: POST endpoint for server-side updates

### Speech Patterns & Guidelines
- **NO stage directions**: Never use `*warm tone*`, `*pause*`, etc. - they get read aloud!
- **Natural pauses**: Use ellipses (`...`) for pauses in speech
- **Filler words**: Include "um", "uh", "well" for natural hesitation
- **Emotional emphasis**: Use punctuation (! for excitement, ? for questions)
- **Multiple variations**: Each therapy type has 3+ intro variations that rotate randomly
- **Time awareness**: Intros can include "Good morning/afternoon/evening" based on time

### Critical Meta Speech Prevention
**PROBLEM**: Meta-observational language gets read aloud by text-to-speech, making therapists sound robotic and unprofessional.

**PROHIBITED META SPEECH PATTERNS**:
- ❌ "I see we have Julie who is 11 years old..."
- ❌ "I notice we have 5 minutes left..."
- ❌ "I find that many couples experience..."
- ❌ "I understand that at thirty-five..."
- ❌ "Replying warmly to children..."
- ❌ "*warm tone*" or "*pause*" stage directions

**CORRECT DIRECT SPEECH**:
- ✅ "Julie, at eleven years old, you might find..."
- ✅ "We have about 5 minutes left..."
- ✅ "Many couples experience..."
- ✅ "John, at thirty-five, you might be experiencing..."

**INTEGRATION PIPELINE VERIFICATION**:
1. **Core Configuration** (`/src/lib/vapi.ts`): All therapy type prompts include explicit meta speech prohibitions
2. **API Endpoint** (`/api/vapi/assistant`): Correctly passes personalized configs without meta language
3. **Client Integration** (`TherapyButton.tsx`): Uses returned configs for session initialization
4. **System-Wide Prevention**: All therapist AIs include these prohibitions:
   - "Never verbalize internal thoughts or stage directions"
   - "Avoid meta-observational language like 'I find' or 'I notice'"
   - "NEVER use meta-observational phrases like 'I see we have' or 'I notice that'"

**WHEN MODIFYING PROMPTS**: Always verify no meta-observational language is introduced. Use direct, natural speech patterns as if having a real conversation.

### VAPI Settings
- `backgroundSound: "off"`: Disables ambient office sounds
- `hipaaEnabled: true`: Ensures HIPAA compliance (no data stored on VAPI servers)
- `recordingEnabled: true`: Enables session recording
- `silenceTimeoutSeconds`: Varies by therapy type (45-60 seconds)
- `responseDelaySeconds`: Natural response timing (0.8-1.0 seconds)
- `maxDurationSeconds`: Session duration limit (1800 for 30min, 3600 for 60min)

### Personalization Flow
1. User profile data is fetched (names, ages, concerns, session history)
2. `getPersonalizedAssistantConfig()` generates config with user data
3. Server-side configuration via `/api/vapi/assistant/configure`
4. Client passes personalized `firstMessage` and `variableValues` when starting
5. Assistant uses personalized system prompt and dynamic intro

### Variable Values Passed
- Core: `userName`, `userAge`, `pronouns`, `therapyType`
- Couple: `partnerName`, `partnerAge`, `relationshipStatus`
- Family: `familyMember1-4`, `familyMember1Age-4Age`
- Context: `currentConcerns`, `sessionHistory`, `communicationStyle`
- Session Timing: `sessionDurationMinutes`, `sessionDurationSeconds`, `warningTimeMinutes`

## Session Duration Selection

### Overview
Users can select between 30 and 60-minute therapy sessions before starting. This integrates with VAPI's `maxDurationSeconds` to automatically end sessions at the selected time.

### Components
- **SessionDurationModal** (`/src/components/SessionDurationModal.tsx`)
  - Mobile-responsive modal with duration options
  - Shows pricing info (currently free during beta)
  - Adapts layout for mobile devices
  - 60 minutes is marked as "Recommended"

### Duration Flow
1. User clicks therapy button → Duration modal opens
2. User selects 30 or 60 minutes (default: 60)
3. Duration passed to API: `&duration=30` or `&duration=60`
4. VAPI config sets `maxDurationSeconds` (30min=1800s, 60min=3600s)
5. AI receives timing instructions in system prompt
6. Session ends automatically at selected duration

### AI Timing Behavior
- **30-Minute Sessions**:
  - 0-25 minutes: Normal conversation
  - 25 minutes: "I notice we have about 5 minutes left..."
  - 28-29 minutes: Begin summarization and closure
  - 30 minutes: VAPI automatically ends call

- **60-Minute Sessions**:
  - 0-55 minutes: Normal conversation
  - 55 minutes: "I notice we have about 5 minutes left..."
  - 58-59 minutes: Begin summarization and closure
  - 60 minutes: VAPI automatically ends call

### System Prompt Integration
The system prompt includes dynamic `SESSION TIMING MANAGEMENT` instructions:
```
SESSION TIMING MANAGEMENT:
• This is a {duration}-minute session that will automatically end when time expires
• At {duration-5} minutes (5 minutes remaining), naturally begin winding down
• Provide gentle transition: "I notice we have about 5 minutes left..."
• End gracefully and naturally without abrupt cutoffs
```

### Testing Session Duration
1. **Debug Utilities**: Use `debug-vapi-config.js` in browser console:
   ```javascript
   await debugVapiConfig(30, 'couple')  // Test 30-min couple therapy
   await testAllDurations()  // Test all duration/type combinations
   await simulateTherapyButtonFlow(30)  // Simulate complete flow
   ```

2. **Manual Testing**: Follow `TEST_DURATION_FLOW.md` for comprehensive testing

3. **Key Verification Points**:
   - API call includes `duration` parameter
   - `maxDurationSeconds` matches selected duration
   - System prompt contains correct timing instructions
   - AI gives natural time warnings
   - Session ends at exact duration

### Mobile Responsiveness
- Modal uses responsive breakpoints: `max-w-sm sm:max-w-2xl lg:max-w-4xl`
- Text sizes adapt: `text-xs sm:text-sm lg:text-base`
- Buttons stack vertically on mobile
- Touch-optimized interaction areas
- Scroll support for small screens with `max-h-[90vh] overflow-y-auto`

## Therapy speech Enhancements

https://www.betterhelp.com/advice/therapy/50-therapy-quotes-to-encourage-you/
https://sageclinic.org/blog/understanding-therapist-lingo/
https://mentalhealthmatch.com/articles/glossary-therapy-approaches-modalities
https://www.wholeselfgr.com/blog
https://www.brightervision.com/blog/therapist-quotes/
https://www.vocovision.com/resources/parents/carrier-phrases-speech-therapy/

## Tailwind

https://tailwindcss.com/docs/installation/framework-guides/nextjs
https://tailwindcss.com/docs/responsive-design
https://tailwindcss.com/docs/adding-custom-styles
https://tailwindcss.com/docs/height
https://tailwindcss.com/

## Recharts

- https://recharts.org/en-US/guide/getting-started
- https://recharts.org/en-US/guide/customize

## motion.dev, componenets & animations

- https://motion.dev/docs/react-quick-start
- https://motion.dev/docs/react-gestures
- https://motion.dev/docs/react-layout-animations
- https://motion.dev/docs/react-scroll-animations
- https://motion.dev/docs/react-transitions
- https://motion.dev/docs/react-motion-component
- https://motion.dev/docs/react-animate-number
- https://motion.dev/docs/react-animate-presence
- https://motion.dev/docs/cursor
- https://motion.dev/docs/react-layout-group
- https://motion.dev/docs/react-lazy-motion
- https://motion.dev/docs/react-motion-config
- https://motion.dev/docs/react-reorder

## motion.dev, motion values

- https://motion.dev/docs/react-motion-value
- https://motion.dev/docs/react-use-motion-t
- https://motion.dev/docs/react-use-motion-value-event
- https://motion.dev/docs/react-use-scroll
- https://motion.dev/docs/react-use-spring
- https://motion.dev/docs/react-use-time
- https://motion.dev/docs/react-use-transform
- https://motion.dev/docs/react-use-velocity

## motion.dev hooks

- https://motion.dev/docs/react-use-animate
- https://motion.dev/docs/react-use-animation-frame
- https://motion.dev/docs/react-use-drag-controls
- https://motion.dev/docs/react-use-in-view
- https://motion.dev/docs/react-use-reduced-motion

## Next.js API

- https://nextjs.org/docs/messages/sync-dynamic-apis
- https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- https://nextjs.org/docs

# Material

- https://www.creative-tim.com/learning-lab/react/overview/material-kit/
  https://www.creative-tim.com/learning-lab/react/what-is-mui/material-kit/

# Recharts

- https://recharts.org/en-US/api

## Environment Variables

### Required
- `DATABASE_URL`: PostgreSQL connection string
- `DIRECT_URL`: Direct PostgreSQL connection (for migrations)
- `NEXTAUTH_URL`: Application URL
- `NEXTAUTH_SECRET`: Secret for NextAuth sessions
- `RESEND_API_KEY`: API key for email service
- `VAPI_API_KEY`: VAPI service API key
- `JWT_TOKEN_SECRET`: Secret for JWT tokens
- `CRON_SECRET`: Secret for cron job authentication

### Optional
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Facebook OAuth: `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`
- Twilio SMS: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Development: `USE_HTTPS`: Set to "true" to enable HTTPS in development mode

## Project Structure

```
src/
├── app/              # Next.js App Router pages and API routes
│   ├── api/         # API endpoints
│   ├── auth/        # Authentication pages
│   ├── dashboard/   # Protected dashboard pages
│   └── ...          # Other pages
├── components/      # React components
│   ├── ui/         # Reusable UI components
│   └── dashboard/  # Dashboard-specific components
├── hooks/          # Custom React hooks
├── lib/            # Utility functions and services
├── types/          # TypeScript type definitions
└── emails/         # Email templates
```

## API Patterns

### Route Handler Template
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
    
    // Your logic here
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Custom UI Components

### Available Components
- **Aurora Background**: Animated gradient backgrounds
- **Vortex**: Swirling particle effects
- **Spotlight**: Focus lighting effects
- **Glass Card**: Glassmorphism card components
- **Hero Highlight**: Text highlighting animations
- **Images Slider**: Carousel component
- **Layout Grid**: Responsive grid system
- **Pulse Ring**: Pulsing animation rings
- **Therapeutic Bokeh**: Calming background effects

## Custom Hooks

- `useAuth()`: Session management wrapper
- `useButtonSound()`: UI sound effects

## Database Schema

Key models include:
- User (with NextAuth integration)
- Session (therapy sessions)
- Transcript (session recordings)
- Progress (relationship metrics)
- Notification preferences

## Testing

No testing framework is currently configured. Consider adding:
- Jest for unit testing
- React Testing Library for component testing
- Playwright for E2E testing

## Build Configuration

### Next.js Config
- Turbopack enabled for development (`--turbopack` flag)
- Development server binds to all interfaces (`--hostname 0.0.0.0`)
- Custom server implementation in `server.js` for production
- Server external packages: `ws`, `@deepgram/sdk`
- Custom webpack configuration for server builds
- Both `serverExternalPackages` and webpack externals configured for compatibility

## Important Patterns

### Error Handling
```typescript
try {
  // Your code
} catch (error) {
  console.error('Descriptive error message:', error);
  // Handle error appropriately
}
```

### Prisma Usage
```typescript
import { prisma } from '@/lib/prisma';

// Always use prisma from the lib singleton
const data = await prisma.model.findMany();
```

### Animation Pattern
```typescript
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.5 }}
>
  Content
</motion.div>
```

## Common Workflows

### Adding a New API Route
1. Create route file in `src/app/api/[route-name]/route.ts`
2. Use the route handler template with authentication
3. Handle errors with try/catch blocks
4. Return consistent JSON responses

### Creating a New Component
1. Check existing UI components first
2. Use TypeScript interfaces for props
3. Apply Framer Motion for animations
4. Use Tailwind classes with clsx for styling
5. Place in appropriate directory (`components/ui/` for reusable)

### Working with Database
1. Define schema in `prisma/schema.prisma`
2. Run `npm run prisma:db:push` to sync
3. Use singleton instance from `@/lib/prisma`
4. Handle Prisma errors appropriately

### Email Integration
1. Create template in `src/emails/`
2. Use React Email components
3. Send via Resend API in server code
4. Test with development preview

## Version Control Practices

### Git Workflow
- **Commit after every significant change** to the codebase
- Use meaningful commit messages that explain the "why" not just the "what"
- Stage only relevant files for each commit
- Run `git status` before committing to review changes
- Use `git diff` to verify changes before staging
- **NEVER include Claude attribution** in commit messages (no "Generated with Claude Code" or "Co-Authored-By: Claude")

### Commit Message Format
```
<type>: <description>

[optional body]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `style`: UI/styling changes
- `docs`: Documentation updates
- `test`: Test additions/changes
- `chore`: Build process or auxiliary tool changes

Example:
```
feat: add real-time transcription for therapy sessions

- Integrated Deepgram SDK for speech-to-text
- Added WebSocket handler for streaming transcripts
- Updated session UI to display live captions
```

## File System Access in WSL2

### Reading Windows Files
When reading files from the Windows filesystem in WSL2:
- Use the path format: `/mnt/c/Users/Quadf/OneDrive/Pictures/Screenshots/`
- Example: `Read("/mnt/c/Users/Quadf/OneDrive/Pictures/Screenshots/screenshot.png")`
- The `/mnt/c/` prefix maps to the Windows C: drive
- Always use absolute paths when accessing Windows filesystem

## HTTPS Development Setup

To enable HTTPS in development (required for VAPI voice features):

1. **Install mkcert**:
   ```bash
   # For WSL2 Ubuntu/Debian:
   sudo apt update && sudo apt install libnss3-tools wget
   wget -O mkcert https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64
   chmod +x mkcert && sudo mv mkcert /usr/local/bin/
   ```

2. **Generate certificates**:
   ```bash
   cd /home/quadcode/workspace/github.com/Brian-Zavala/couple-therapy-website
   mkcert -install
   mkcert localhost 127.0.0.1 ::1
   ```

3. **Enable HTTPS**:
   - Set `USE_HTTPS=true` in your `.env` file
   - Run `npm run dev:https` to start the HTTPS server
   - Access the app at `https://localhost:3000`

The server will automatically fall back to HTTP if certificates are not found.

### Remote Access from Phone/Tablet (WSL2)

Since this project runs in WSL2, additional setup is required for phone access:

1. **Find your Windows IP**: 
   - Open Windows PowerShell and run `ipconfig`
   - Look for IPv4 Address under your network adapter (e.g., 192.168.1.100)

2. **Generate certificates with Windows IP**:
   ```bash
   ./generate-remote-certs.sh  # Interactive script that prompts for your Windows IP
   ```

3. **Set up Windows port forwarding**:
   - Open PowerShell as Administrator
   - Navigate to project: `cd \\wsl$\Ubuntu\home\quadcode\workspace\github.com\Brian-Zavala\couple-therapy-website`
   - Run: `.\setup-port-forward.ps1`

4. **Access from phone**: 
   - Connect to same WiFi
   - Visit `https://YOUR_WINDOWS_IP:3000`
   - Accept the certificate warning

## Common JSX/React Errors

### JSX Parsing Errors
When encountering "Unexpected token `div`. Expected jsx identifier" or similar parsing errors:

**Common Causes:**
1. **Missing closing tags** - Every JSX element must be properly closed
2. **Extra closing parentheses** - Check `.map()` functions and their closing syntax
3. **Unclosed function parentheses** - Ensure all functions have matching opening/closing parens
4. **Invalid JSX nesting** - JSX elements must be properly nested

**Example Fix:**
```typescript
// ❌ WRONG - Extra closing parenthesis
{items.map((item) => (
  <div key={item.id}>{item.name}</div>
)))  // Too many closing parens

// ✅ CORRECT
{items.map((item) => (
  <div key={item.id}>{item.name}</div>
))}  // Proper closing syntax
```

**Debugging Steps:**
1. Use TypeScript compiler: `npx tsc --noEmit --jsx preserve src/components/YourComponent.tsx`
2. Check for mismatched parentheses, especially in `.map()` functions
3. Verify all JSX elements have proper opening/closing tags
4. Look for syntax errors around the reported line number

## Transcript System Architecture

### Overview
The application uses a multi-layered transcript storage system for VAPI voice AI therapy sessions:

1. **Real-time capture** via VAPI message events in `TherapyButton.tsx`
2. **Multi-layer storage** with sessionStorage backup and database persistence
3. **Structured display** through `SessionTranscript.tsx` component
4. **API endpoints** for CRUD operations on transcript entries

### Database Schema
- **TranscriptEntry** model with fields: `id`, `sessionId`, `speaker`, `text`, `timestamp`, `isFinal`, `assistantId`
- **Session** model with legacy `transcript` field for backward compatibility
- Proper indexing on `sessionId`, `timestamp`, and `assistantId`

### Storage Strategy
**Primary**: Database via `/api/sessions/[id]/transcript` endpoint
**Backup**: SessionStorage with multiple keys for reliability
**Legacy**: Single transcript string in Session model

### Key Components
- **TherapyButton.tsx**: VAPI event handling and transcript capture
- **SessionTranscript.tsx**: Display component with filtering and deduplication
- **transcript-service.ts**: API layer with multi-attempt saving strategy
- **transcriptionService.ts**: Deepgram integration for speech-to-text

### Transcript Quality & Meta Speech Impact
**CRITICAL**: Meta-observational language in AI prompts directly affects transcript quality. When therapist AIs use phrases like "I see we have..." or "I notice that...", these get captured in transcripts as unprofessional robotic speech.

**Connection to Meta Speech Prevention**:
- Meta speech patterns appear in session transcripts exactly as spoken
- Filtering logic cannot reliably remove meta speech without affecting legitimate conversation
- Prevention at the prompt level (in `/src/lib/vapi.ts`) is the only reliable solution
- Transcript display issues often trace back to AI prompt problems, not display logic

## Transcript System Fixes (December 2024)

### Critical Issues Resolved

#### 1. **VAPI Assistant Message Capture** (May 2025 - CRITICAL FIX)
**Problem**: Assistant messages not appearing in session transcripts despite user messages being captured correctly
**Root Cause Analysis**: 
- **Default Speaker Assignment**: `const speaker = message.role || 'user'` (line 805) defaulted ALL messages to 'user' if no role specified
- **Final-Only Processing**: Lines 814-817 skipped ALL non-final transcripts, but VAPI assistant messages might not be marked as `isFinal: true`
- **Result**: Assistant messages were either completely skipped or saved as user messages

**Solution Implemented**: 
- **Intelligent Speaker Detection**: Uses content analysis with therapeutic language patterns to identify assistant messages when role is missing
- **Process Assistant Messages Regardless of Final Status**: Only skips partial user transcripts, always processes assistant messages
- **Enhanced Content Analysis**: Detects phrases like "I understand", "tell me more", "how does that make you feel"

**Files Fixed**: `src/components/TherapyButton.tsx:803-838`

**Key Code Changes**:
```typescript
// OLD (BROKEN):
const speaker = message.role || 'user';  // Always defaulted to 'user'
if (!isFinal) return;  // Skipped ALL non-final messages

// NEW (FIXED):
let speaker = message.role || message.speaker || null;
if (!speaker) {
  // Content analysis for speaker detection
  const isLikelyAssistant = /\b(I understand|let me|tell me more)\b/i.test(text);
  speaker = isLikelyAssistant ? 'assistant' : 'user';
}
// Process assistant messages regardless of final status
if (!isFinal && speaker === 'user') return;  // Only skip partial user messages
```

**Why This Fixes the Issue**: VAPI assistant messages were coming through the `transcript` event path but being either skipped (not final) or misidentified (no role). The fix ensures all assistant content is captured and saved correctly.

#### 2. **Over-Aggressive Display Filtering**
**Problem**: `SessionTranscript.tsx` was filtering out valid conversation entries
**Root Cause**: Complex filtering logic removed assistant messages containing common therapeutic phrases
**Solution**: Simplified filtering to only remove obvious artifacts (separators, system messages)
**Files**: `src/components/SessionTranscript.tsx:570-580`

#### 3. **Missing Session ID Validation** 
**Problem**: Transcripts processed without session ID were not saved to database
**Root Cause**: Early return when `currentSessionId` was null, skipping database storage
**Solution**: Added session ID recovery logic and emergency session creation
**Files**: `src/components/TherapyButton.tsx:736-798`

#### 4. **Complex Deduplication Logic**
**Problem**: Multi-stage deduplication removed legitimate conversation turns
**Root Cause**: Overly sophisticated similarity detection and grouping algorithms
**Solution**: Simplified to only remove exact duplicates and obvious progressions
**Files**: `src/components/SessionTranscript.tsx:604-671`

### Enhanced Verification & Monitoring

#### Database Save Verification
```typescript
// In transcript-service.ts - now verifies saves
const verifyResponse = await fetch(`/api/sessions/${entry.sessionId}/transcript?limit=1&offset=0`);
console.log(`✅ VERIFICATION SUCCESS: Found ${entries.length} entries in database`);
```

#### Speaker Breakdown Logging
```typescript
// Enhanced logging shows user vs assistant message counts
const userCount = entries.filter(e => e.speaker === 'user').length;
const assistantCount = entries.filter(e => e.speaker === 'assistant').length;
console.log(`📊 SPEAKER BREAKDOWN: ${userCount} user, ${assistantCount} assistant`);
```

#### Session ID Recovery Logic
```typescript
// Multi-source session ID recovery in TherapyButton.tsx
const recoveredSessionId = sessionId || 
                          vapiInstanceRef.current?._sessionId || 
                          sessionStorage.getItem('current-session-id');
```

### Best Practices for Transcript Development

#### When Adding New Filtering Logic
- **DO**: Only filter obvious system artifacts and separators
- **DON'T**: Filter based on message content or therapeutic phrases
- **TEST**: Verify both user and assistant messages appear in final display

#### When Handling Session Context
- **ALWAYS**: Validate session ID exists before processing transcripts
- **FALLBACK**: Implement recovery mechanisms for missing session context
- **LOG**: Use detailed logging to track session ID availability and recovery

#### When Implementing Deduplication
- **SIMPLE**: Only remove exact duplicates and clear progressions
- **PRESERVE**: Maintain conversation flow between speakers
- **VERIFY**: Test with real VAPI transcript data for edge cases

### Debugging Transcript Issues

#### Common Symptoms & Solutions
**Symptom**: Assistant messages not appearing in transcripts (MOST COMMON)
**Cause**: VAPI assistant messages being skipped or misidentified as user messages
**Debug**: Check `TherapyButton.tsx` speaker detection logic and final status handling
**Solution**: Ensure intelligent speaker detection and assistant message processing regardless of final status

**Symptom**: Transcripts appear during session but not in history
**Cause**: Missing session ID causing database skip
**Debug**: Check console for "CRITICAL: Processing transcript without session ID"

**Symptom**: Only user OR assistant messages showing
**Cause**: Speaker normalization inconsistency or over-filtering
**Debug**: Check console for "SPEAKER BREAKDOWN" logs

**Symptom**: Duplicate or partial messages
**Cause**: Deduplication logic too permissive
**Debug**: Review deduplication console logs and entry counts

#### Essential Console Log Patterns
```bash
# Success patterns to look for:
"✅ PRIMARY API SUCCESS: Entry saved with ID"
"✅ VERIFICATION SUCCESS: Found X entries in database"
"📊 SPEAKER BREAKDOWN: X user, Y assistant"

# Warning patterns that indicate issues:
"⚠️ CRITICAL: Processing transcript without session ID"
"⚠️ VERIFICATION WARNING: No entries found in database"
"💥 FATAL: Cannot recover session ID"
```

### Testing Transcript System
1. **Start therapy session** and verify session ID is created
2. **Speak as user** and check for transcript capture logs
3. **Wait for AI response** and verify assistant message logging
4. **End session** and check database persistence
5. **View session history** and confirm both speakers appear
6. **Check console logs** for verification success messages

## Welcome Page Onboarding & Validation

### Overview
The welcome page (`/src/app/welcome/page.tsx`) is a multi-step onboarding form that collects user profile information and preferences before users can access therapy sessions.

### Step 1 Validation Implementation
**Location**: `/src/app/welcome/page.tsx:566-582`

The first step requires users to input their name and age before proceeding. The validation system includes:

#### Validation Logic
```typescript
const isCurrentStepValid = () => {
  if (currentStep === 0) { // Step 1 (index 0)
    // Check if nickname and age are filled (trim whitespace and check for meaningful values)
    const nickname = formData.nickname?.trim();
    const age = formData.age?.toString().trim();
    const isValid = !!(nickname && nickname.length > 0) && !!(age && parseInt(age) > 0);
    return isValid;
  }
  return true; // Other steps don't have validation yet
}
```

#### Visual Feedback Components

1. **Next Button State** (`lines 1109-1117`):
   - Gray background with red border when validation fails
   - Disabled cursor and no hover effects when invalid
   - Returns to blue styling when validation passes

2. **Global Warning Tooltip** (`lines 817-829`):
   - Fixed positioned at top of screen
   - Red background with warning icon
   - Auto-hides after 3 seconds
   - Framer Motion animations for smooth entrance/exit

3. **Field-Specific Messages** (`lines 922-945`):
   - Individual validation messages below required fields
   - Animated warnings that appear when tooltip is shown
   - Specific messages: "Name is required" and "Valid age is required"

4. **Input Field Enhancements** (`lines 954-968`, `990-1004`):
   - Pulsing red border animation for invalid fields
   - Enhanced shadow effects when validation fails
   - Different styling for name vs age fields

#### Key Features
- **Edge Case Handling**: Validates against empty strings, whitespace-only input, and age ≤ 0
- **Console Logging**: Detailed validation state logging for debugging
- **Progressive Enhancement**: Validation only applies to step 1, other steps proceed normally
- **Accessibility**: Clear visual and textual feedback for validation failures

#### Debugging Validation Issues
1. Check browser console for validation state logs
2. Verify `formData.nickname` and `formData.age` values
3. Test edge cases: empty strings, whitespace, zero/negative ages
4. Ensure tooltip appears when clicking Next without required fields

### Form Steps Structure
The onboarding process consists of 6 steps:
1. **Personal Info** (name, age, pronouns) - **Validated**
2. **Relationships** (partner, family members)
3. **Therapy Goals** (type, concerns)
4. **Preferences** (session timing, communication style)
5. **Additional Info** (emergency contact, notes)
6. **Relationship Assessment** (couples/family only)

### Best Practices for Validation Updates
- Add validation logic to `isCurrentStepValid()` function for new required fields
- Use consistent styling patterns for invalid states
- Include field-specific error messages with animations
- Test validation with edge cases and empty inputs
- Maintain console logging for debugging validation state

## Important Reminders

- Always check existing patterns in the codebase before implementing new features
- Use the established service layers in `/lib` for external integrations
- Maintain consistency with existing UI components and animations
- Follow the authentication patterns established with NextAuth
- Use environment variables for all sensitive configuration
- Prefer editing existing files over creating new ones
- Clean up any temporary files created for testing
- Run `npm run lint` before committing changes
- Test authentication flows with different providers
- Verify responsive design on mobile devices
- Check console for errors during development
- **Create git commits after significant code changes**
- **Always validate JSX syntax** when making component edits
- **For missing assistant transcripts**: Check TherapyButton.tsx speaker detection and final status logic first
- **For transcript issues**: Check session ID validation and filtering logic second
- **For transcript quality issues**: Verify AI prompts don't contain meta-observational language
- **For onboarding validation**: Test edge cases and verify visual feedback appears correctly

## Layout and Viewport Height Issues

### Spotlight Component Height Problems (Fixed December 2024)

**Issue**: The Spotlight component was creating extra scrollable space on pages with minimal content (like onboarding/welcome pages).

**Root Cause**: The Spotlight component used `h-screen` and `w-screen` classes that forced full viewport dimensions even when absolutely positioned, creating layout constraints that added extra page height.

**Location**: `/src/components/ui/spotlight-new.tsx`

**Solution Applied**:
1. **Main container**: Changed from `absolute inset-0 h-full w-full` to `fixed inset-0`
2. **Child containers**: Changed from `w-screen h-screen` to `w-full h-full`

**Fixed Code**:
```tsx
// Before (problematic):
className="pointer-events-none absolute inset-0 h-full w-full"
className="absolute top-0 left-0 w-screen h-screen z-40 pointer-events-none"

// After (fixed):
className="pointer-events-none fixed inset-0"
className="absolute top-0 left-0 w-full h-full z-40 pointer-events-none"
```

**Why This Works**:
- `fixed inset-0` creates overlay without affecting document flow or page height
- `w-full h-full` uses container dimensions instead of forcing viewport dimensions
- Eliminates forced viewport height while maintaining visual effects

**Debugging Technique Used**:
- Added temporary debug CSS with visible borders to identify layout culprits:
```css
.welcome-page * { outline: 1px solid rgba(255, 0, 0, 0.3) !important; }
.welcome-page > * { outline: 2px solid rgba(0, 255, 0, 0.8) !important; }
```

**Key Learning**: Components with `h-screen` or `100vh` classes can create layout issues even when absolutely positioned. Always use `fixed` positioning with container-relative dimensions for overlays that shouldn't affect page height.
