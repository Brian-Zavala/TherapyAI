![download-modified](https://github.com/user-attachments/assets/d470ce81-0824-4a5f-9fbf-0e273b67bda4)

# Therapy AI Platform

An AI-powered therapy platform featuring real-time voice therapy sessions, intelligent conversation analysis, and comprehensive session management.

## Features

### Voice AI Therapy Sessions
- **Real-time voice conversations** with AI therapist
- **Live transcription** with speaker identification
- **Session recording** and playback capabilities
- **Pause/resume functionality** with state persistence
- **Automatic session recovery** after connection loss

### Dashboard & Analytics
- **Interactive session dashboard** with real-time metrics
- **Session history** with searchable transcripts
- **Analytics charts** showing therapy progress
- **Mood tracking** and session insights
- **Export capabilities** for session data

### AI-Powered Insights (No External API Required)
- **Deterministic insight engine** based on evidence-based therapy research
- **9 insight patterns** covering different relationship scenarios
- **Personalized recommendations** based on session metrics
- **No AI API costs** - uses built-in pattern matching
- **Evidence-based content** from Gottman Method and EFT research
- **Dynamic goal setting** and focus area identification
- **Progress tracking** with confidence scoring

### Authentication & Security
- **Secure authentication** with [Clerk](https://clerk.com/)
- **JWT token management** with rate limiting
- **Session-based access control** via Clerk middleware
- **Protected API routes** and pages
- **Webhook-based user sync** with Clerk events

### Responsive Design
- **Mobile-first responsive UI**
- **Progressive Web App (PWA)** capabilities
- **Optimized for all devices**
- **Smooth animations** with Framer Motion

### Email Notifications
- **Session summaries** sent via email
- **Appointment reminders**
- **Welcome emails** for new users
- **Custom email templates** with Resend

##  Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Supabase](https://supabase.com/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Voice AI**: [VAPI](https://vapi.ai/)
- **Authentication**: [Clerk](https://clerk.com/)
- **Email**: [Resend](https://resend.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Charts**: [Recharts](https://recharts.org/)
- **Real-time**: Supabase Realtime

#- `npm run start` - Start production server

### Database
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run migrations
- `npm run prisma:db:push` - Push schema changes
- `npm run prisma:studio` - Open Prisma Studio

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run typecheck` - Run TypeScript checks

## 📁 Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── api/            # API routes
│   │   ├── dashboard/      # Dashboard pages
│   │   └── ...
│   ├── components/         # React components
│   │   ├── dashboard/      # Dashboard components
│   │   ├── therapy/        # Therapy session components
│   │   └── ui/            # Reusable UI components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and services
│   │   ├── auth.ts        # Clerk auth helpers (getAuthSession)
│   │   ├── prisma.ts      # Database client
│   │   └── vapi/          # VAPI integration
│   ├── types/             # TypeScript type definitions
│   └── emails/            # Email templates
├── prisma/
│   └── schema.prisma      # Database schema
├── public/                # Static assets
└── docs/                  # Documentation
```

## 🔧 Key Features Implementation

### Voice AI Sessions
- Real-time voice processing using VAPI WebRTC
- Automatic transcription with speaker diarization
- Session state management with recovery capabilities
- WebSocket connection for real-time updates

### Real-time Metrics
- Supabase Realtime for live session metrics
- Dashboard updates without page refresh
- Synchronized state across multiple tabs
- Optimistic UI updates for better UX

### Session Recovery
- Automatic reconnection on network issues
- State persistence in database
- Graceful degradation
- User notification system

## 🗄️ Database Schema

The application uses Prisma with PostgreSQL, featuring:
- User authentication and profiles
- Therapy session records
- Real-time session states
- Transcript storage
- Analytics data
