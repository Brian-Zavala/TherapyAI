/**
 * Initialize MCP Memory Server with therapy platform context
 * This script creates a knowledge graph of project-specific information
 */

const therapyPlatformMemory = {
  entities: [
    // Project Structure
    {
      name: "TherapyPlatform",
      type: "Project",
      observations: [
        "Next.js 15 TypeScript application for AI-powered voice therapy sessions",
        "Uses VAPI for voice AI integration with real-time transcription",
        "Deployed on Vercel with Supabase PostgreSQL database",
        "Features session recovery, dashboard analytics, and email notifications",
        "Refactored from monolithic TherapyButton.tsx (4,431 lines) to 11 focused hooks"
      ]
    },
    
    // Technical Stack
    {
      name: "TechStack",
      type: "Technology",
      observations: [
        "Frontend: Next.js 15, React 19, TypeScript (strict mode)",
        "Styling: TailwindCSS 4 with mobile-first approach",
        "Animation: Framer Motion for all UI animations",
        "Database: PostgreSQL via Supabase with Prisma ORM",
        "Authentication: NextAuth.js with JWT tokens",
        "Voice AI: VAPI with inline assistant configuration",
        "Real-time: Supabase Realtime for metrics broadcasting",
        "Email: Resend API for session notifications"
      ]
    },
    
    // Key Features
    {
      name: "VoiceTherapySessions",
      type: "Feature",
      observations: [
        "Real-time voice conversations with AI therapist",
        "Session duration: 5-120 minutes (configurable)",
        "Automatic transcription and conversation history",
        "Pause/resume functionality with state persistence",
        "Session recovery for interrupted calls",
        "Cost: approximately $0.13 per minute of voice AI"
      ]
    },
    
    // Critical Configurations
    {
      name: "CriticalConfig",
      type: "Configuration",
      observations: [
        "Database connection MUST use .env file (never .env.local)",
        "VAPI requires HTTPS in development (use mkcert)",
        "No stage directions (*action*, <emotion>) in VAPI prompts",
        "React Portals required for modals to avoid CSS stacking issues",
        "Rate limiting implemented with exponential backoff for JWT tokens",
        "Session state synced via Supabase Realtime, not WebSocket"
      ]
    },
    
    // Common Issues
    {
      name: "CommonIssues",
      type: "KnownProblem",
      observations: [
        "Infinite loops: Use refs for callbacks in hooks to prevent re-renders",
        "UI flicker: Centralized session-active class management in useVapiSession",
        "Timer sync drift: Rate-limited syncing only during active conversations",
        "VAPI 400 errors: Fixed by supporting inline assistant configurations",
        "Session recovery: Sessions only inherit isPaused from DB when status is 'active'",
        "React timer hooks: Use refs for timer functions to prevent re-render cycles"
      ]
    },
    
    // Development Workflow
    {
      name: "DevWorkflow",
      type: "Process",
      observations: [
        "Always run 'npm run lint' and 'npm run typecheck' before committing",
        "After Prisma schema changes: npm run prisma:generate && npm run prisma:db:push",
        "Use feature flags for testing: development mode defaults to refactored code",
        "WSL2 screenshots at: /mnt/c/Users/Quadf/OneDrive/Pictures/Screenshots",
        "Git commits: <type>: <description> format, no Claude attribution"
      ]
    },
    
    // Key Hooks
    {
      name: "RefactoredHooks",
      type: "Component",
      observations: [
        "useVapiSession: Core VAPI integration with initialization order fixes",
        "useSessionManagement: Orchestrates session state across components",
        "useTranscriptHandler: Processes real-time speech transcriptions",
        "useTherapySessionRecovery: Handles interrupted session restoration",
        "useSupabaseRealTimeMetrics: Broadcasts session metrics via Supabase",
        "useVapiToken: JWT management with rate limiting and retry logic"
      ]
    },
    
    // API Patterns
    {
      name: "APIPatterns",
      type: "Pattern",
      observations: [
        "All API routes require authentication via getServerSession",
        "Consistent error handling with try-catch and proper status codes",
        "NextRequest/NextResponse from 'next/server' for App Router",
        "Database operations use Prisma with proper error handling",
        "Rate limiting on token generation endpoints"
      ]
    }
  ],
  
  relations: [
    { from: "TherapyPlatform", to: "TechStack", type: "uses" },
    { from: "TherapyPlatform", to: "VoiceTherapySessions", type: "implements" },
    { from: "VoiceTherapySessions", to: "RefactoredHooks", type: "powered_by" },
    { from: "RefactoredHooks", to: "CriticalConfig", type: "requires" },
    { from: "CommonIssues", to: "RefactoredHooks", type: "fixed_in" },
    { from: "DevWorkflow", to: "APIPatterns", type: "follows" },
    { from: "TechStack", to: "CriticalConfig", type: "configured_by" }
  ]
};

// Output for manual initialization or automated script
console.log(JSON.stringify(therapyPlatformMemory, null, 2));

// Instructions for use:
console.log(`
To initialize MCP memory:
1. Ensure memory server is running
2. Use MCP tools to create entities and relations
3. This provides a structured knowledge base for the therapy platform
`);