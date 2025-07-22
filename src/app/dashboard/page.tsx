// src/app/dashboard/page.tsx
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import SessionTimeChart from "@/components/dashboard/SessionTimeChart";
import UpcomingSessions from "@/components/dashboard/UpcomingSessions";
import { useDashboardDataUnified } from "@/hooks/useDashboardDataUnified";
import { UnifiedLoadingState } from "@/components/dashboard/UnifiedLoadingState";
import { DashboardErrorBoundary, DashboardErrorWrapper } from "@/components/dashboard/DashboardErrorBoundary";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  
  // Use the unified hook to get all dashboard data at once
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
  } = useDashboardDataUnified({
    enableRealTime: true,
    refetchInterval: 60000, // 1 minute
    includeInsights: true,
    onError: (error) => {
      console.error('Dashboard error:', error);
    }
  });

  // Show loading state for initial load
  if (isLoading && !data) {
    return (
      <div className="container mx-auto p-6">
        <UnifiedLoadingState 
          type={loadingState.type === 'partial' ? 'spinner' : loadingState.type} 
          message={loadingState.message} 
        />
      </div>
    );
  }

  return (
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
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Track your therapy progress and insights
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
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
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2">
            <Brain className="h-4 w-4" />
            AI Insights
          </TabsTrigger>
          <TabsTrigger value="progress" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2">
            <Calendar className="h-4 w-4" />
            Sessions
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent key="overview" value="overview" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
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
              
              {/* Session Analytics */}
              <div className="md:col-span-2">
                <DashboardErrorWrapper componentName="SessionTimeChart">
                  <SessionTimeChart />
                </DashboardErrorWrapper>
              </div>
              
              {/* Upcoming Sessions */}
              <div className="md:col-span-2">
                <DashboardErrorWrapper componentName="UpcomingSessions">
                  <UpcomingSessions />
                </DashboardErrorWrapper>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent key="insights" value="insights" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ComprehensiveTherapyInsightsUnified />
            </motion.div>
          </TabsContent>

          <TabsContent key="progress" value="progress" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Detailed Progress View */}
              <RelationshipProgressUnified />
              
              {/* Communication Deep Dive */}
              <CommunicationMetricsUnified />
              
              {/* Historical Progress Chart */}
              <div className="md:col-span-2">
                <SessionTimeChart />
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent key="sessions" value="sessions" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Session Management */}
              <UpcomingSessions />
              
              {/* Session Analytics */}
              <SessionTimeChart />
            </motion.div>
          </TabsContent>
        </AnimatePresence>
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
  );
}