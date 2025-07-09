![download-modified](https://github.com/user-attachments/assets/d470ce81-0824-4a5f-9fbf-0e273b67bda4)

# Therapy AI Platform

An AI-powered therapy platform featuring real-time voice therapy sessions, intelligent conversation analysis, and comprehensive session management.

## 🌟 Features

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

### Authentication & Security
- **Secure authentication** with NextAuth.js
- **JWT token management** with rate limiting
- **Session-based access control**
- **Protected API routes** and pages

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

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Supabase](https://supabase.com/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Voice AI**: [VAPI](https://vapi.ai/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Email**: [Resend](https://resend.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Charts**: [Recharts](https://recharts.org/)
- **Real-time**: Supabase Realtime

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (via Supabase)
- VAPI account for voice AI
- Resend account for emails
- SSL certificates for local HTTPS development

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Brian-Zavala/couple-therapy-website.git
cd couple-therapy-website
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file (not `.env.local`) in the root directory:

```env
# Database
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# VAPI
VAPI_API_KEY=your-vapi-api-key

# JWT
JWT_TOKEN_SECRET=your-jwt-secret

# Email
RESEND_API_KEY=your-resend-api-key

# Cron
CRON_SECRET=your-cron-secret

# HTTPS (for local development)
USE_HTTPS=true
```

### 4. Set up the database

```bash
# Generate Prisma client
npm run prisma:generate

# Push schema to database
npm run prisma:db:push

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 5. Set up HTTPS for local development (Required for VAPI)

```bash
# Install mkcert (Ubuntu/WSL)
sudo apt update && sudo apt install libnss3-tools

# Install mkcert globally
npm install -g mkcert

# Create local CA
mkcert -install

# Generate certificates
mkcert localhost 127.0.0.1 ::1
```

### 6. Run the development server

```bash
# HTTP development
npm run dev

# HTTPS development (required for VAPI)
npm run dev:https
```

Open [https://localhost:3000](https://localhost:3000) in your browser.

## 📝 Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run dev:https` - Start HTTPS development server
- `npm run build` - Build for production
- `npm run start` - Start production server

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
│   │   ├── auth.ts        # Authentication config
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

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test updates
- `chore:` Build process or auxiliary tool changes

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy with automatic CI/CD

### Manual Deployment
```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📄 License

This project is proprietary and confidential.

## 👥 Team

- **Developer**: Brian Zavala
- **Contact**: [GitHub Profile](https://github.com/Brian-Zavala)

---

Built with ❤️ using Next.js and AI technology
