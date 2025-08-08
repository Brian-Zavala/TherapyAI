// src/app/dashboard/page.tsx
"use client";

import React, { useState, useMemo, useCallback, createContext, useContext, useEffect } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  LayoutDashboard, 
  Brain, 
  TrendingUp, 
  Calendar,
  AlertCircle
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
import { useSession } from "next-auth/react";
import { ClinicalDisclaimerModal } from "@/components/ClinicalDisclaimerModal";
import { useDisclaimerCheck } from "@/hooks/useDisclaimerCheck";
import { DashboardPermissionPrompt } from "@/components/DashboardPermissionPrompt";
import "@/styles/dashboard-scoped.css";
import "@/styles/dashboard-viewport-fix.css";
import "@/styles/dashboard-colors.css";

// Context to prevent child components from showing loading states during initial load
const DashboardLoadingContext = createContext<{ isInitialLoading: boolean }>({ isInitialLoading: false });
export const useDashboardLoading = () => useContext(DashboardLoadingContext);

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { data: session, status } = useSession();
  
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
    const baseClasses = "gap-2 cursor-pointer transition-all duration-200 text-sm rounded-md flex items-center justify-center relative";
    const activeClasses = isActive 
      ? "text-white bg-white/25 backdrop-blur-sm shadow-lg border border-white/40 font-medium -m-2 px-5 py-4 z-10"
      : "text-white/60 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/20 px-3 py-2.5";
    
    return `${baseClasses} ${activeClasses}`;
  };
  
  // Memoize hook options to prevent unnecessary re-renders
  const hookOptions = useMemo(() => ({
    enableRealTime: true,
    refetchInterval: 5 * 60 * 1000, // 5 minutes - reduced from 1 minute to prevent constant reloading
    includeInsights: true,
    staleTime: 2 * 60 * 1000, // 2 minutes - data is considered fresh for this duration
    gcTime: 30 * 60 * 1000, // 30 minutes - keep data in cache
    onError: (error) => {
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
        <div className="dashboard-page-container mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1920px] pt-8 sm:pt-10 md:pt-12" data-page="dashboard">

        {/* Error Alert */}
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error?.message || 'Failed to load dashboard data'}
              {failedEndpoints.length > 0 && (
                <span className="block mt-1 text-xs">
                  Failed endpoints: {failedEndpoints.join(', ')}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Partial Data Warning */}
        {data?.isPartial && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Some dashboard data is temporarily unavailable. 
              {failedEndpoints.length > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  className="ml-2 h-auto p-0"
                  onClick={() => {
                    failedEndpoints.forEach(endpoint => {
                      refetchMetric(endpoint as keyof typeof data);
                    });
                  }}
                >
                  Retry failed components
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="dashboard-main-tabs space-y-4">
        <TabsList className="main-nav-tabs grid w-full grid-cols-2 md:grid-cols-4 max-w-2xl mx-auto bg-white/10 border border-white/20 backdrop-blur-sm p-2 rounded-lg gap-2">
          <TabsTrigger 
            value="overview" 
            className={getTabClasses("overview")}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger 
            value="insights" 
            className={getTabClasses("insights")}
          >
            <Brain className="h-5 w-5" />
            <span className="hidden sm:inline">Insights</span>
          </TabsTrigger>
          <TabsTrigger 
            value="progress" 
            className={getTabClasses("progress")}
          >
            <TrendingUp className="h-5 w-5" />
            <span className="hidden sm:inline">Progress</span>
          </TabsTrigger>
          <TabsTrigger 
            value="sessions" 
            className={getTabClasses("sessions")}
          >
            <Calendar className="h-5 w-5" />
            <span className="hidden sm:inline">Sessions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 sm:gap-5 md:gap-6 lg:gap-8 xl:gap-10"
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

        <TabsContent value="insights" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AIInsightsWithTabs />
          </motion.div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 sm:gap-5 md:gap-6 lg:gap-8 xl:gap-10"
          >
            {/* Detailed Progress View */}
            <RelationshipProgressWithTabs />
            
            {/* Communication Deep Dive */}
            <CommunicationMetricsWithTabs />
          </motion.div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
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