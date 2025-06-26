import { Suspense } from 'react'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'

// Analytics and performance monitoring
import { AnalyticsProvider } from '@/lib/analytics/posthog'
import { PerformanceMonitoring } from '@/lib/analytics/web-vitals'

// Optimized providers
import { OptimizedProviders } from '@/components/providers/OptimizedProviders'
import { PerformanceProfiler } from '@/lib/performance-monitoring'

// Critical CSS only
import './globals.css'

// Optimized font loading
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter'
})

// Optimized metadata
export const metadata: Metadata = {
  title: {
    default: 'AI Couple Therapy - Transform Your Relationship',
    template: '%s | AI Couple Therapy'
  },
  description: 'Experience personalized AI-powered couple therapy sessions designed to strengthen your bond and improve communication. Start your journey today.',
  keywords: ['couple therapy', 'AI therapy', 'relationship counseling', 'communication improvement'],
  authors: [{ name: 'AI Therapy Platform' }],
  creator: 'AI Therapy Platform',
  publisher: 'AI Therapy Platform',
  
  // Open Graph optimization
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://your-domain.com',
    siteName: 'AI Couple Therapy',
    title: 'AI Couple Therapy - Transform Your Relationship',
    description: 'Experience personalized AI-powered couple therapy sessions designed to strengthen your bond and improve communication.',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'AI Couple Therapy Platform'
      }
    ]
  },
  
  // Twitter optimization
  twitter: {
    card: 'summary_large_image',
    title: 'AI Couple Therapy - Transform Your Relationship',
    description: 'Experience personalized AI-powered couple therapy sessions designed to strengthen your bond and improve communication.',
    images: ['/images/og-image.jpg']
  },
  
  // Performance optimization
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  
  // PWA optimization
  manifest: '/manifest.json',
  
  // Additional optimization
  verification: {
    google: 'your-google-verification-code'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ]
}

// Loading component for Suspense boundaries
function GlobalLoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-white/80 text-lg">Loading your therapy platform...</p>
      </div>
    </div>
  )
}

// Error boundary component
function GlobalErrorBoundary({ 
  error,
  reset 
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-800 flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-6xl">🚨</div>
        <h1 className="text-3xl font-bold text-white">Something went wrong</h1>
        <p className="text-white/80">
          We encountered an unexpected error. Our team has been notified.
        </p>
        <button
          onClick={reset}
          className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

export default function OptimizedRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Critical resource hints */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch for external services */}
        <link rel="dns-prefetch" href="//api.openai.com" />
        <link rel="dns-prefetch" href="//api.supabase.com" />
        
        {/* Preload critical images */}
        <link rel="preload" href="/images/home/3.jpg" as="image" type="image/jpeg" />
        
        {/* Service Worker registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/service-worker.js');
                });
              }
            `
          }}
        />
      </head>
      
      <body className={`${inter.className} antialiased`}>
        {/* Performance monitoring wrapper */}
        <PerformanceProfiler id="app-root">
          <Suspense fallback={<GlobalLoadingFallback />}>
            <AnalyticsProvider>
              <OptimizedProviders>
                {/* Error boundary for the entire app */}
                <Suspense fallback={<GlobalLoadingFallback />}>
                  {children}
                </Suspense>
              </OptimizedProviders>
              
              {/* Performance monitoring - loaded after main content */}
              <Suspense>
                <PerformanceMonitoring />
              </Suspense>
            </AnalyticsProvider>
          </Suspense>
        </PerformanceProfiler>
        
        {/* Performance monitoring script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Critical performance monitoring
              if ('PerformanceObserver' in window) {
                // Monitor layout shifts
                new PerformanceObserver((list) => {
                  for (const entry of list.getEntries()) {
                    if (entry.value > 0.1) {
                      console.warn('[Performance] Layout shift detected:', entry.value);
                    }
                  }
                }).observe({ type: 'layout-shift', buffered: true });
                
                // Monitor largest contentful paint
                new PerformanceObserver((list) => {
                  const entries = list.getEntries();
                  const lastEntry = entries[entries.length - 1];
                  console.log('[Performance] LCP:', lastEntry.startTime);
                }).observe({ type: 'largest-contentful-paint', buffered: true });
              }
            `
          }}
        />
      </body>
    </html>
  )
}