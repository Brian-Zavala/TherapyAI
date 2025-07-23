// src/components/dashboard/AIInsightsCard.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { UnifiedLoadingState } from './UnifiedLoadingState';
import { useTherapyInsights } from '@/hooks/useDashboardDataUnified';
import { Brain, Sparkles, ArrowRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useDashboardLoading } from '@/app/dashboard/page';

export function AIInsightsCard() {
  const { isInitialLoading } = useDashboardLoading();
  // Use unified hook for AI insights
  const { 
    data, 
    isLoading, 
    error 
  } = useTherapyInsights({
    enableRealTime: true,
    refetchInterval: 60000 // 1 minute
  });

  // Show placeholder during initial dashboard load
  if (isInitialLoading) {
    return null;
  }

  // Use unified loading state
  if (isLoading && !data) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UnifiedLoadingState 
            type="spinner" 
            message="Loading AI insights..."
            variant="inline"
          />
        </CardContent>
      </Card>
    );
  }

  if (error || !data || !data.insights || data.insights.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Empty state message */}
            <div className="text-center py-4">
              <Brain className="h-8 w-8 text-purple-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">
                No insights available yet
              </p>
            </div>
            
            {/* View All Button */}
            <Button 
              variant="outline" 
              className="w-full"
              asChild
            >
              <Link href="/dashboard?tab=insights">
                View AI Insights Tab
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get summary metrics
  const totalInsights = data.insights.length;
  const highPriorityCount = data.insights.filter(i => i.priority === 'high').length;
  const averageProgress = data.insights.reduce((acc, i) => acc + (i.progress || 0), 0) / totalInsights;

  // Get latest insight for preview
  const latestInsight = data.insights[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800 h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              AI Insights
            </CardTitle>
            <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/50">
              {totalInsights} Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Overview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{Math.round(averageProgress)}%</span>
            </div>
            <Progress 
              value={averageProgress} 
              className="h-2"
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs text-muted-foreground">Progress Rate</span>
              </div>
              <p className="text-lg font-semibold">+{data.progressRate || 0}%</p>
            </div>
            <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs text-muted-foreground">Key Areas</span>
              </div>
              <p className="text-lg font-semibold">{highPriorityCount}</p>
            </div>
          </div>

          {/* Latest Insight Preview */}
          {latestInsight && (
            <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground mb-1">Latest Insight</p>
              <p className="text-sm font-medium line-clamp-2">{latestInsight.title}</p>
            </div>
          )}

          {/* View All Button */}
          <Button 
            variant="outline" 
            className="w-full"
            asChild
          >
            <Link href="/dashboard?tab=insights">
              View All AI Insights
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}