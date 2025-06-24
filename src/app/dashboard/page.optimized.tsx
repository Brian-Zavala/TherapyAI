"use client"

import { Suspense, lazy, memo, useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'

// Performance monitoring
import { PerformanceProfiler, usePerformanceMonitoring } from '@/lib/performance-monitoring'
import { useOptimizedQuery, queryKeys } from '@/lib/query-client-setup'

// Optimized imports - lazy load heavy components
const CommunicationMetrics = lazy(() => 
  import('@/components/dashboard/CommunicationMetrics.optimized')
)
const SessionTimeChart = lazy(() => 
  import('@/components/dashboard/SessionTimeChart.optimized')
)
const RelationshipProgressCard = lazy(() => 
  import('@/components/dashboard/RelationshipProgressCard.optimized')
)
const UpcomingSessions = lazy(() => 
  import('@/components/dashboard/UpcomingSessions.optimized')
)

// Critical components - loaded immediately
import NotificationBell from '@/components/ui/notification-bell'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'

// Optimized skeleton components
const DashboardSkeleton = memo(() => (
  <div className="space-y-6 animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-32 bg-gray-200/20 rounded-xl"></div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-96 bg-gray-200/20 rounded-xl"></div>
      <div className="h-96 bg-gray-200/20 rounded-xl"></div>
    </div>
  </div>
))

const MetricsSkeleton = memo(() => (
  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 animate-pulse">
    <div className="h-6 bg-white/10 rounded w-48 mb-4"></div>
    <div className="h-64 bg-white/10 rounded"></div>
  </div>
))

// Optimized tab configuration
const TAB_CONFIG = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'sessions', label: 'Sessions', icon: '💬' },
  { id: 'progress', label: 'Progress', icon: '📈' },
  { id: 'insights', label: 'Insights', icon: '🧠' }
] as const

type TabId = typeof TAB_CONFIG[number]['id']

// Memoized tab navigation
const TabNavigation = memo(({ 
  activeTab, 
  onTabChange 
}: { 
  activeTab: TabId
  onTabChange: (tab: TabId) => void 
}) => {
  const prefersReducedMotion = useReducedMotion()
  
  return (
    <div className="flex space-x-1 bg-gray-800/50 rounded-xl p-1 backdrop-blur-sm">
      {TAB_CONFIG.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
            ${activeTab === tab.id 
              ? 'text-white bg-purple-600 shadow-lg' 
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }
          `}
        >
          <span className="mr-2">{tab.icon}</span>
          {tab.label}
          
          {activeTab === tab.id && !prefersReducedMotion && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-purple-600 rounded-lg -z-10"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
        </button>
      ))}
    </div>
  )
})

// Optimized dashboard content with conditional rendering
const DashboardContent = memo(({ 
  activeTab, 
  userId 
}: { 
  activeTab: TabId
  userId: string 
}) => {
  // Only load data for active tab to reduce unnecessary API calls
  const shouldLoadMetrics = activeTab === 'overview' || activeTab === 'insights'
  const shouldLoadSessions = activeTab === 'overview' || activeTab === 'sessions'
  const shouldLoadProgress = activeTab === 'overview' || activeTab === 'progress'
  
  return (
    <div className="space-y-6">
      {activeTab === 'overview' && (
        <>
          {/* Quick stats - always visible */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Suspense fallback={<MetricsSkeleton />}>
              {shouldLoadProgress && <RelationshipProgressCard />}
            </Suspense>
          </div>
          
          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Suspense fallback={<MetricsSkeleton />}>
              {shouldLoadMetrics && <CommunicationMetrics />}
            </Suspense>
            
            <Suspense fallback={<MetricsSkeleton />}>
              {shouldLoadSessions && <UpcomingSessions />}
            </Suspense>
          </div>
        </>
      )}
      
      {activeTab === 'sessions' && (
        <Suspense fallback={<MetricsSkeleton />}>
          <UpcomingSessions expanded />
        </Suspense>
      )}
      
      {activeTab === 'progress' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={<MetricsSkeleton />}>
            <SessionTimeChart />
          </Suspense>
          <Suspense fallback={<MetricsSkeleton />}>
            <RelationshipProgressCard expanded />
          </Suspense>
        </div>
      )}
      
      {activeTab === 'insights' && (
        <Suspense fallback={<MetricsSkeleton />}>
          <CommunicationMetrics expanded />
        </Suspense>
      )}
    </div>
  )
})

export default function OptimizedDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { monitor } = usePerformanceMonitoring('dashboard')
  
  // Optimized state management
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  
  // Memoized callbacks to prevent unnecessary re-renders
  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab)
    
    // Optional: Track tab switches for analytics
    monitor.logComponentPerformance(`tab-switch-${tab}`, performance.now())
  }, [monitor])
  
  // Optimized real-time notifications with reduced config
  const { unreadCount } = useRealtimeNotifications({
    playSound: true,
    showBrowserNotifications: false, // Reduce overhead
    autoMarkAsRead: false
  })
  
  // User profile query with optimized caching
  const { 
    data: userProfile, 
    isLoading: isProfileLoading,
    error: profileError 
  } = useQuery(useOptimizedQuery.userProfile(session?.user?.id || '', {
    enabled: !!session?.user?.id && status === 'authenticated'
  }))
  
  // Early returns for better performance
  if (status === 'loading') {
    return <DashboardSkeleton />
  }
  
  if (status === 'unauthenticated') {
    router.replace('/auth/login')
    return null
  }
  
  if (profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-2xl font-bold text-white">Unable to load dashboard</h2>
          <p className="text-gray-400">Please try refreshing the page</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }
  
  // Memoized user data to prevent unnecessary processing
  const userData = useMemo(() => ({
    name: userProfile?.name || session?.user?.name || 'User',
    email: session?.user?.email || '',
    hasCompletedOnboarding: userProfile?.onboardingCompleted || false
  }), [userProfile, session])
  
  return (
    <PerformanceProfiler id="dashboard-page">
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header section */}
          <header className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Welcome back, {userData.name}! 👋
              </h1>
              <p className="text-gray-400 text-lg">
                Track your relationship progress and upcoming sessions
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <NotificationBell unreadCount={unreadCount} />
              
              <Link
                href="/dashboard/profile"
                className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 hover:text-purple-300 px-4 py-2 rounded-lg transition-all duration-200 backdrop-blur-sm border border-purple-500/20"
              >
                Profile Settings
              </Link>
            </div>
          </header>
          
          {/* Tab navigation */}
          <div className="mb-8">
            <TabNavigation 
              activeTab={activeTab} 
              onTabChange={handleTabChange} 
            />
          </div>
          
          {/* Loading state */}
          {isProfileLoading ? (
            <DashboardSkeleton />
          ) : (
            <DashboardContent 
              activeTab={activeTab} 
              userId={session?.user?.id || ''} 
            />
          )}
        </div>
      </div>
    </PerformanceProfiler>
  )
}

// Export with display name for debugging
OptimizedDashboard.displayName = 'OptimizedDashboard'