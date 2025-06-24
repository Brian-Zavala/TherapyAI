"use client"

import { ReactNode, Suspense, lazy, useMemo, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'

// Performance optimized imports
import { createOptimizedQueryClient, setupQueryPersistence } from '@/lib/query-client-setup'
import { usePerformanceMonitoring } from '@/lib/performance-monitoring'

// Lazy load heavy providers
const ReactQueryDevtoolsLazy = lazy(() => 
  import('@tanstack/react-query-devtools').then(mod => ({
    default: mod.ReactQueryDevtools
  }))
)

// Memoized theme provider configuration
const themeConfig = {
  attribute: 'class',
  defaultTheme: 'dark',
  enableSystem: true,
  disableTransitionOnChange: false
} as const

// Session provider configuration
const sessionConfig = {
  refetchInterval: 5 * 60, // 5 minutes
  refetchOnWindowFocus: true
} as const

interface OptimizedProvidersProps {
  children: ReactNode
  session?: any
}

export function OptimizedProviders({ 
  children, 
  session 
}: OptimizedProvidersProps) {
  // Performance monitoring for providers
  const { monitor } = usePerformanceMonitoring('providers')
  
  // Memoized query client to prevent recreating on every render
  const queryClient = useMemo(() => {
    const client = createOptimizedQueryClient()
    
    // Setup persistence in browser environment
    if (typeof window !== 'undefined') {
      setupQueryPersistence(client)
    }
    
    return client
  }, [])
  
  // Development tools only in development
  const showDevtools = process.env.NODE_ENV === 'development'
  
  return (
    <SessionProvider 
      session={session}
      {...sessionConfig}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider {...themeConfig}>
          {children}
          
          {/* Development tools - lazy loaded */}
          {showDevtools && (
            <Suspense fallback={null}>
              <ReactQueryDevtoolsLazy
                initialIsOpen={false}
                position="bottom-right"
              />
            </Suspense>
          )}
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}

// Hook for accessing optimized query client across the app
import { useQueryClient } from '@tanstack/react-query'

export function useOptimizedQueryClient() {
  const queryClient = useQueryClient()
  return queryClient
}

// Performance-aware provider wrapper
export function withPerformanceProvider<T extends {}>(
  Component: React.ComponentType<T>,
  providerName: string
) {
  const WrappedComponent = (props: T) => {
    const startTime = performance.now()
    
    useEffect(() => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      if (renderTime > 50) { // Providers shouldn't take > 50ms
        console.warn(`🐌 Slow provider: ${providerName} took ${renderTime}ms`)
      }
    }, [])
    
    return <Component {...props} />
  }
  
  WrappedComponent.displayName = `withPerformanceProvider(${providerName})`
  return WrappedComponent
}

export default OptimizedProviders