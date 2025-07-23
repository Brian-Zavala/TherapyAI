// src/app/dashboard/page.tsx
"use client";

import React, { useState, useMemo, useCallback, createContext, useContext } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  LayoutDashboard, 
  Brain, 
  TrendingUp, 
  Calendar,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { ComprehensiveTherapyInsightsUnified } from "@/components/dashboard/ComprehensiveTherapyInsightsUnified";
import { CommunicationMetricsUnified } from "@/components/dashboard/CommunicationMetricsUnified";
import { RelationshipProgressUnified } from "@/components/dashboard/RelationshipProgressUnified";
import UpcomingSessions from "@/components/dashboard/UpcomingSessions";
import { useDashboardDataUnified } from "@/hooks/useDashboardDataUnified";
import { DashboardProvider } from "@/hooks/useDashboardContext";
import { UnifiedLoadingState } from "@/components/dashboard/UnifiedLoadingState";
import { DashboardErrorBoundary, DashboardErrorWrapper } from "@/components/dashboard/DashboardErrorBoundary";

// Context to prevent child components from showing loading states during initial load
const DashboardLoadingContext = createContext<{ isInitialLoading: boolean }>({ isInitialLoading: false });
export const useDashboardLoading = () => useContext(DashboardLoadingContext);

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  
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
  
  // Memoize the refresh handler to prevent re-creating function on every render
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Show loading state for initial load
  if (isLoading && !data) {
    return (
      <UnifiedLoadingState 
        type="brain"
        message="Analyzing your therapy journey..."
        variant="fullscreen"
      />
    );
  }

  const isInitialLoading = isLoading && !data;

  return (
    <DashboardLoadingContext.Provider value={{ isInitialLoading }}>
      <DashboardProvider dashboardData={dashboardData}>
        <DashboardErrorBoundary
          onError={(error) => {
            console.error('Dashboard page error:', error);
          }}
          resetKeys={[activeTab]}
        >
        <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-white/70">
              Track your therapy progress and insights
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching || isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching || isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl bg-white/10 border border-white/20 backdrop-blur-sm">
          <TabsTrigger 
            value="overview" 
            className="gap-2 cursor-pointer text-white/60 hover:text-white hover:bg-white/10 data-[state=active]:text-white data-[state=active]:bg-white/20 data-[state=active]:shadow-sm transition-all duration-200"
          >
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="insights" 
            className="gap-2 cursor-pointer text-white/60 hover:text-white hover:bg-white/10 data-[state=active]:text-white data-[state=active]:bg-white/20 data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Brain className="h-4 w-4" />
            AI Insights
          </TabsTrigger>
          <TabsTrigger 
            value="progress" 
            className="gap-2 cursor-pointer text-white/60 hover:text-white hover:bg-white/10 data-[state=active]:text-white data-[state=active]:bg-white/20 data-[state=active]:shadow-sm transition-all duration-200"
          >
            <TrendingUp className="h-4 w-4" />
            Progress
          </TabsTrigger>
          <TabsTrigger 
            value="sessions" 
            className="gap-2 cursor-pointer text-white/60 hover:text-white hover:bg-white/10 data-[state=active]:text-white data-[state=active]:bg-white/20 data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Calendar className="h-4 w-4" />
            Sessions
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
              <ComprehensiveTherapyInsightsUnified />
            </DashboardErrorWrapper>
          </motion.div>
          
          {/* Communication Metrics & Relationship Progress - Side by Side */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Communication Metrics */}
            <DashboardErrorWrapper componentName="CommunicationMetrics">
              <CommunicationMetricsUnified />
            </DashboardErrorWrapper>
            
            {/* Relationship Progress */}
            <DashboardErrorWrapper componentName="RelationshipProgress">
              <RelationshipProgressUnified />
            </DashboardErrorWrapper>
          </motion.div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ComprehensiveTherapyInsightsUnified />
          </motion.div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Detailed Progress View */}
            <RelationshipProgressUnified />
            
            {/* Communication Deep Dive */}
            <CommunicationMetricsUnified />
            
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
    </DashboardLoadingContext.Provider>
  );
}