// src/app/dashboard/page.tsx
"use client";

import React, { useState, useMemo, useCallback, createContext, useContext, useEffect } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  LayoutDashboard,
  Brain,
  TrendingUp,
  Calendar,
  RefreshCw,
  CloudOff,
  Sparkles,
  MessageCircle,
  X
} from "lucide-react";
import { ComprehensiveTherapyInsightsUnified } from "@/components/dashboard/ComprehensiveTherapyInsightsUnified";
import { CommunicationMetricsUnified } from "@/components/dashboard/CommunicationMetricsUnified";
import { RelationshipProgressUnified } from "@/components/dashboard/RelationshipProgressUnified";
// New tabbed components
import AIInsightsWithTabs from "@/components/dashboard/AIInsightsWithTabs";
import CommunicationMetricsWithTabs from "@/components/dashboard/CommunicationMetricsWithTabs";
import RelationshipProgressWithTabs from "@/components/dashboard/RelationshipProgressWithTabs";
import UpcomingSessions from "@/components/dashboard/UpcomingSessions";
import { useDashboardDataUnified } from "@/hooks/useDashboardDataUnified";
import { DashboardProvider } from "@/hooks/useDashboardContext";
import { UnifiedLoadingState } from "@/components/dashboard/UnifiedLoadingState";
import { DashboardErrorBoundary, DashboardErrorWrapper } from "@/components/dashboard/DashboardErrorBoundary";
import { useSession } from '@/hooks/useClerkSession'
import { ClinicalDisclaimerModal } from "@/components/ClinicalDisclaimerModal";
import { useDisclaimerCheck } from "@/hooks/useDisclaimerCheck";
import { DashboardPermissionPrompt } from "@/components/DashboardPermissionPrompt";
import "@/styles/dashboard-scoped.css";
import "@/styles/dashboard-viewport-fix.css";
import "@/styles/dashboard-colors.css";

// Context to prevent child components from showing loading states during initial load
const DashboardLoadingContext = createContext<{ isInitialLoading: boolean }>({ isInitialLoading: false });
export const useDashboardLoading = () => useContext(DashboardLoadingContext);

// Auto-dismissing banner for transient states (error/partial), persistent for empty/insufficient data
function DashboardBanner({
  gradient,
  icon,
  title,
  subtitle,
  action,
  isTransient,
  onDismiss,
}: {
  gradient: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action: React.ReactNode;
  isTransient: boolean;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!isTransient) return;
    const timer = setTimeout(() => {
      setVisible(false);
      // Give exit animation time to finish before removing from DOM
      setTimeout(onDismiss, 400);
    }, 8000);
    return () => clearTimeout(timer);
  }, [isTransient, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r ${gradient} backdrop-blur-sm p-4 sm:p-5 mb-4`}
    >
      {isTransient && (
        <button
          onClick={() => { setVisible(false); setTimeout(onDismiss, 400); }}
          className="absolute top-3 right-3 p-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-0.5">{icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/90">{title}</p>
            <p className="text-xs text-white/50 mt-1 leading-relaxed">{subtitle}</p>
          </div>
        </div>
        <div className="flex-shrink-0 pl-12 sm:pl-0">{action}</div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [totalSessionCount, setTotalSessionCount] = useState<number | null>(null);
  const { data: session, status } = useSession();

  // Fetch actual total session count (across all therapy types) for accurate banner
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch('/api/sessions/counts')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (!cancelled && data) setTotalSessionCount(data.total ?? 0); })
      .catch(() => {}); // banner falls back gracefully
    return () => { cancelled = true; };
  }, [status]);
  
  // Initialize showPermissionPage based on localStorage immediately to prevent flash
  const [showPermissionPage, setShowPermissionPage] = useState(() => {
    // Check if user previously declined on initial render
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dashboardDisclaimerDeclined') === 'true';
    }
    return false;
  });
  
  // Track if acceptance is in progress to prevent modal from reopening
  const [isAcceptancePending, setIsAcceptancePending] = useState(false);
  
  // Call hooks in proper order - before any useEffect that depends on them
  const { 
    showDisclaimer, 
    acceptDisclaimer, 
    declineDisclaimer,
    isLoading: disclaimerLoading 
  } = useDisclaimerCheck();
  
  // Check permission page logic - database state takes priority over localStorage
  useEffect(() => {
    // Wait for disclaimer check to complete
    if (disclaimerLoading) return;
    
    // If disclaimer was already accepted in database (showDisclaimer is false), 
    // always clear any declined flags and don't show permission page
    if (!showDisclaimer) {
      localStorage.removeItem('dashboardDisclaimerDeclined');
      setShowPermissionPage(false);
      setIsAcceptancePending(false); // Clear pending state when DB confirms acceptance
      return;
    }
    
    // Only if user hasn't accepted in database, check if they previously declined
    const declined = localStorage.getItem('dashboardDisclaimerDeclined');
    setShowPermissionPage(declined === 'true');
  }, [showDisclaimer, disclaimerLoading]);
  
  // Generate tab classes with proper frosted glass effect
  const getTabClasses = (tabValue: string) => {
    const isActive = activeTab === tabValue;
    const baseClasses = "flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-all duration-200 !rounded-lg px-2 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium flex-1 min-w-0 select-none data-[state=active]:!bg-transparent data-[state=active]:!shadow-none";
    const activeClasses = isActive
      ? "text-white bg-white/25 backdrop-blur-sm shadow-lg border border-white/40 font-semibold"
      : "text-white/60 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/20";

    return `${baseClasses} ${activeClasses}`;
  };
  
  // Memoize hook options to prevent unnecessary re-renders
  const hookOptions = useMemo(() => ({
    enableRealTime: true,
    refetchInterval: 5 * 60 * 1000, // 5 minutes - reduced from 1 minute to prevent constant reloading
    includeInsights: true,
    staleTime: 2 * 60 * 1000, // 2 minutes - data is considered fresh for this duration
    gcTime: 30 * 60 * 1000, // 30 minutes - keep data in cache
    onError: (error: any) => {
      console.error('Dashboard error:', error);
    }
  }), []);
  
  // Use the unified hook to get all dashboard data at once
  const dashboardData = useDashboardDataUnified(hookOptions);
  const { 
    data, 
    isLoading, 
    isError,
    error,
    failedEndpoints,
    refetch,
    refetchMetric,
    isRefetching,
    isFetching,
    loadingState,
    isRealTimeConnected,
    lastRealTimeUpdate
  } = dashboardData;

  // Reset dismissed state when error/partial clears so new issues can re-trigger the banner
  const currentlyTransient = isError || data?.isPartial;
  useEffect(() => {
    if (!currentlyTransient) setBannerDismissed(false);
  }, [currentlyTransient]);

  // Show loading state for initial load - this MUST be checked after all hooks
  // Check auth loading state first, then data availability
  // Also wait for disclaimer check to complete to prevent flash
  if (status === "loading" || !data || (disclaimerLoading && !showPermissionPage)) {
    return (
      <UnifiedLoadingState 
        type="brain"
        message="Analyzing your therapy journey..."
        variant="fullscreen"
      />
    );
  }
  
  // Show permission page if user previously declined disclaimer - takes priority over disclaimer modal
  // This will only show if:
  // 1. User has NOT accepted disclaimer in database (showDisclaimer would be true)
  // 2. User clicked "I'll review later" (dashboardDisclaimerDeclined flag is set)
  if (showPermissionPage) {
    return <DashboardPermissionPrompt onPermissionGranted={() => {
      // Clear declined flag and hide permission page
      localStorage.removeItem('dashboardDisclaimerDeclined');
      setShowPermissionPage(false);
      // No need to reload - let the disclaimer modal show naturally
    }} />;
  }
  
  const isInitialLoading = false; // We already handled the loading state above

  return (
    <DashboardLoadingContext.Provider value={{ isInitialLoading }}>
      <DashboardProvider dashboardData={dashboardData}>
        <DashboardErrorBoundary
          onError={(error) => {
            console.error('Dashboard page error:', error);
          }}
          resetKeys={[activeTab]}
        >
        <div className="dashboard-page-container mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1920px] pt-20 sm:pt-22 md:pt-24" data-page="dashboard">

        {/* Dashboard status banner — handles: no sessions yet, error, partial load */}
        {(() => {
          // Use real total from /api/sessions/counts (all therapy types), not the filtered sessionAnalytics
          const totalSessions = totalSessionCount;
          const hasNoData = !isLoading && !isError && data && totalSessions === 0;
          const hasInsufficientData = !isLoading && !isError && data && totalSessions !== null && totalSessions > 0 && totalSessions < 3;
          const isTransient = isError || data?.isPartial;

          // Don't render until we know the real count (unless it's an error/partial state)
          if (totalSessions === null && !isTransient) return null;
          if (!hasNoData && !hasInsufficientData && !isTransient) return null;
          if (bannerDismissed && isTransient && !hasNoData && !hasInsufficientData) return null;

          // Pick banner content based on state
          let icon: React.ReactNode;
          let title: string;
          let subtitle: string;
          let action: React.ReactNode;
          let gradient: string;

          if (hasNoData) {
            gradient = "from-emerald-500/10 via-teal-500/10 to-cyan-500/10";
            icon = (
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-emerald-300" />
              </div>
            );
            title = "Welcome to your wellness dashboard";
            subtitle = "Complete your first therapy session and your personalized insights, progress tracking, and analytics will appear here.";
            action = (
              <Link href="/dashboard/therapy">
                <Button
                  size="sm"
                  className="h-9 px-4 text-xs font-medium bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 hover:text-white border border-emerald-500/30 rounded-lg transition-colors cursor-pointer"
                >
                  Start a session
                </Button>
              </Link>
            );
          } else if (hasInsufficientData) {
            gradient = "from-amber-500/10 via-orange-500/10 to-yellow-500/10";
            icon = (
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </div>
            );
            title = "Your insights are building up";
            subtitle = `You've completed ${totalSessions} session${totalSessions === 1 ? '' : 's'} so far. A few more and your analytics will really start to shine with personalized trends and recommendations.`;
            action = (
              <Link href="/dashboard/therapy">
                <Button
                  size="sm"
                  className="h-9 px-4 text-xs font-medium bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 hover:text-white border border-amber-500/30 rounded-lg transition-colors cursor-pointer"
                >
                  Continue your journey
                </Button>
              </Link>
            );
          } else if (isError) {
            gradient = "from-purple-500/10 via-indigo-500/10 to-blue-500/10";
            icon = (
              <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <CloudOff className="h-5 w-5 text-purple-300" />
              </div>
            );
            title = "We're gathering your latest insights";
            subtitle = "Some of your wellness data is still syncing. This usually resolves in a moment.";
            action = (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-4 text-xs text-purple-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                onClick={() => {
                  if (failedEndpoints.length > 0) {
                    failedEndpoints.forEach(endpoint => {
                      refetchMetric(endpoint as keyof typeof data);
                    });
                  }
                }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Refresh
              </Button>
            );
          } else {
            // isPartial
            gradient = "from-indigo-500/10 via-blue-500/10 to-cyan-500/10";
            icon = (
              <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-indigo-300" />
              </div>
            );
            title = "Almost there — loading your full dashboard";
            subtitle = "A few metrics are still updating. Your core data is ready below.";
            action = (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-4 text-xs text-indigo-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                onClick={() => {
                  if (failedEndpoints.length > 0) {
                    failedEndpoints.forEach(endpoint => {
                      refetchMetric(endpoint as keyof typeof data);
                    });
                  }
                }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Refresh
              </Button>
            );
          }

          return (
            <DashboardBanner
              key={hasNoData ? 'no-data' : hasInsufficientData ? 'insufficient' : isError ? 'error' : 'partial'}
              gradient={gradient}
              icon={icon}
              title={title}
              subtitle={subtitle}
              action={action}
              isTransient={!!isTransient && !hasNoData && !hasInsufficientData}
              onDismiss={() => setBannerDismissed(true)}
            />
          );
        })()}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="dashboard-main-tabs space-y-4">
        <TabsList className="main-nav-tabs flex w-full max-w-2xl mx-auto bg-white/10 border border-white/20 backdrop-blur-sm !p-1.5 rounded-xl gap-1">
          <TabsTrigger
            value="overview"
            className={getTabClasses("overview")}
          >
            <LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger
            value="insights"
            className={getTabClasses("insights")}
          >
            <Brain className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span>Insights</span>
          </TabsTrigger>
          <TabsTrigger
            value="progress"
            className={getTabClasses("progress")}
          >
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span>Progress</span>
          </TabsTrigger>
          <TabsTrigger
            value="sessions"
            className={getTabClasses("sessions")}
          >
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span>Sessions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          {/* AI Insights - Full Width */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DashboardErrorWrapper componentName="AIInsights">
              <AIInsightsWithTabs />
            </DashboardErrorWrapper>
          </motion.div>
          
          {/* Communication Metrics & Relationship Progress - Side by Side */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 lg:gap-8 xl:gap-10"
          >
            {/* Communication Metrics */}
            <DashboardErrorWrapper componentName="CommunicationMetrics">
              <CommunicationMetricsWithTabs />
            </DashboardErrorWrapper>
            
            {/* Relationship Progress */}
            <DashboardErrorWrapper componentName="RelationshipProgress">
              <RelationshipProgressWithTabs />
            </DashboardErrorWrapper>
          </motion.div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4 sm:space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AIInsightsWithTabs />
          </motion.div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4 sm:space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 lg:gap-8 xl:gap-10"
          >
            {/* Detailed Progress View */}
            <RelationshipProgressWithTabs />
            
            {/* Communication Deep Dive */}
            <CommunicationMetricsWithTabs />
          </motion.div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4 sm:space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Session Management */}
            <UpcomingSessions />
          </motion.div>
        </TabsContent>
      </Tabs>

        {/* Real-time indicator */}
        {isRealTimeConnected && (
          <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm border rounded-full px-3 py-1.5 text-xs">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-muted-foreground">
              Live updates active
              {lastRealTimeUpdate && (
                <span className="ml-1">
                  • Last update: {new Date(lastRealTimeUpdate).toLocaleTimeString()}
                </span>
              )}
            </span>
          </div>
        )}
      </div>
        </DashboardErrorBoundary>
      </DashboardProvider>

      {/* Clinical Disclaimer Modal - only show if permission page is not active AND disclaimer check is complete AND not accepting */}
      {!showPermissionPage && !disclaimerLoading && !isAcceptancePending && showDisclaimer && (
        <ClinicalDisclaimerModal
          isOpen={true}
          onAccept={() => {
            // Modal already calls acceptDisclaimer internally
            // Mark acceptance as pending to prevent modal from reopening
            setIsAcceptancePending(true);
            setShowPermissionPage(false);
          }}
          onDecline={() => {
            // Modal already calls declineDisclaimer internally
            setShowPermissionPage(true);
          }}
        />
      )}
    </DashboardLoadingContext.Provider>
  );
}