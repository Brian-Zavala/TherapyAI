import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Couples Connect - Therapy Platform',
  description: 'Virtual couple therapy sessions with AI assistance',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="bg-gray-100 mt-12 py-6 text-center">
          <p>© 2025 Couples Connect. All rights reserved.</p>
        </footer>
      </body>
    </html>
  )
}
