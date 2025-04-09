// src/app/layout.tsx
import AuthProvider from '@/components/AuthProvider'
import Navigation from '@/components/Navigation'
import { SoundProvider } from '@/components/SoundProvider'
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
        {/* Preload critical assets */}
        <link 
          rel="preload" 
          href="/images/happy-couple.jpg" 
          as="image"
        />
      </head>
      <body>
        <AuthProvider>
          <SoundProvider>
            <Navigation />
            <main className="overflow-x-hidden">
              {children}
            </main>
          </SoundProvider>
        </AuthProvider>
      </body>
    </html>
  )
}