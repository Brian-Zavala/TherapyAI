// src/app/layout.tsx
import AuthProvider from '@/components/AuthProvider'
import Navigation from '@/components/Navigation'
import { SoundProvider } from '@/components/SoundProvider'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <SoundProvider>
            <Navigation />
            <main className="container mx-auto py-8 px-4">
              {children}
            </main>
          </SoundProvider>
        </AuthProvider>
      </body>
    </html>
  )
}