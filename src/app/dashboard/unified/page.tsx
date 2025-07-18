// src/app/dashboard/unified/page.tsx
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Brain, 
  TrendingUp, 
  Calendar,
  RefreshCw
} from "lucide-react";
import { ComprehensiveTherapyInsightsUnified } from "@/components/dashboard/ComprehensiveTherapyInsightsUnified";
import { CommunicationMetricsUnified } from "@/components/dashboard/CommunicationMetricsUnified";
import { RelationshipProgressUnified } from "@/components/dashboard/RelationshipProgressUnified";
import { SessionTimeChart } from "@/components/dashboard/SessionTimeChart";
import { UpcomingSessions } from "@/components/dashboard/UpcomingSessions";
import { useDashboardMetricsUnified } from "@/hooks/useDashboardMetricsUnified";
import { UnifiedLoadingState } from "@/components/dashboard/UnifiedLoadingState";

export default function UnifiedDashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  
  // Use the unified hook to get all dashboard data at once
  const { 
    data, 
    isLoading, 
    error, 
    refetch, 
    isRefetching,
    loadingState 
  } = useDashboardMetricsUnified({
    enableRealTime: true,
    refreshInterval: 60000, // 1 minute
    includeInsights: true
  });

  // Show loading state for initial load
  if (isLoading && !data) {
    return (
      <div className="container mx-auto p-6">
        <UnifiedLoadingState {...loadingState} />
      </div>
    );
  }

  return (
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
          disabled={isRefetching}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

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
          <TabsContent value="overview" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Communication Metrics */}
              <CommunicationMetricsUnified />
              
              {/* Relationship Progress */}
              <RelationshipProgressUnified />
              
              {/* Session Analytics */}
              <div className="md:col-span-2">
                <SessionTimeChart />
              </div>
              
              {/* Upcoming Sessions */}
              <div className="md:col-span-2">
                <UpcomingSessions />
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ComprehensiveTherapyInsightsUnified />
            </motion.div>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
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

          <TabsContent value="sessions" className="space-y-6">
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
      {data?.dataSource === 'realtime' && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm border rounded-full px-3 py-1.5 text-xs">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-muted-foreground">Live updates active</span>
        </div>
      )}
    </div>
  );
}