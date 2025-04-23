// src/app/layout.tsx
import AuthProvider from '@/components/AuthProvider'
import Navigation from '@/components/Navigation'
import { SoundProvider } from '@/components/SoundProvider'
import MusicPlayer from '@/components/MusicPlayer'
import { RadialGradientBackground } from '@/components/ui/radial-gradient-background'
import './globals.css'

export const metadata = {
  title: 'AI Couple Therapy',
  description: 'AI-powered therapy to help couples build stronger, healthier relationships',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Viewport meta tag for responsive design */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        
        {/* Preload critical assets */}
        <link 
          rel="preload" 
          href="/images/happy-couple.jpg" 
          as="image"
        />

      </head>
      <body className="min-h-screen w-full overflow-x-hidden">
        <RadialGradientBackground />
        <AuthProvider>
          <SoundProvider>
            <Navigation />
            <main className="overflow-x-hidden w-full min-h-screen">
              {children}
            </main>
            <MusicPlayer />
          </SoundProvider>
        </AuthProvider>
      </body>
    </html>
  )
}