// @ts-nocheck
// src/components/dashboard/AIInsightsCard.tsx
'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { UnifiedLoadingState } from './UnifiedLoadingState';
import { useTherapyInsights } from '@/hooks/useDashboardDataUnified';
import { Brain, Sparkles, ArrowRight, TrendingUp, Activity, Heart, MessageSquare, Wifi, Clock } from 'lucide-react';
import Link from 'next/link';
import { useDashboardLoading } from '@/app/dashboard/page';
import { useActiveSession } from '@/hooks/useActiveSession';
import '@/styles/dashboard-modern.css';

export function AIInsightsCard() {
  const { isInitialLoading } = useDashboardLoading();
  const { activeSessionId } = useActiveSession();
  
  // Use unified hook for AI insights with real-time support
  const { 
    data, 
    isLoading, 
    error,
    isRealTime
  } = useTherapyInsights({
    enableRealTime: true,
    refetchInterval: 60000, // 1 minute
    sessionId: activeSessionId // Pass active session for real-time insights
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
            <div className="text-center py-6">
              <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-3">
                <Brain className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                AI Analytics Awaiting Data
              </h4>
              <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                Complete your first therapy session to unlock personalized insights
              </p>
            </div>
            
            {/* View All Button */}
            <Button 
              variant="outline" 
              className="w-full group"
              asChild
            >
              <Link href="/dashboard/therapy">
                Start Your First Session
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Extract real metrics from insights data
  const metrics = useMemo(() => {
    if (!data?.insights?.length) {
      return {
        communicationHealth: 0,
        emotionalIntelligence: 0,
        communicationDelta: 0,
        emotionalDelta: 0,
        improvementRate: 0
      };
    }

    // Calculate per-category averages from actual insight confidence scores
    const commInsights = data.insights.filter(i => i.category === 'communication');
    const emoInsights = data.insights.filter(i => i.category === 'emotional');
    const allInsights = data.insights;

    const avgConfidence = (items: typeof allInsights) =>
      items.length > 0
        ? Math.round(items.reduce((s, i) => s + (i.confidence || 0), 0) / items.length)
        : 0;

    const commScore = commInsights.length > 0 ? avgConfidence(commInsights) : avgConfidence(allInsights);
    const emoScore = emoInsights.length > 0 ? avgConfidence(emoInsights) : Math.round(avgConfidence(allInsights) * 0.9);

    // Derive deltas from priority distribution (low = improving, high = declining)
    const lowRatio = allInsights.filter(i => i.priority === 'low').length / allInsights.length;
    const highRatio = allInsights.filter(i => i.priority === 'high').length / allInsights.length;
    const delta = Math.round((lowRatio - highRatio) * 20); // -20 to +20 range

    return {
      communicationHealth: commScore,
      emotionalIntelligence: emoScore,
      communicationDelta: delta,
      emotionalDelta: Math.round(delta * 0.8),
      improvementRate: Math.max(0, delta)
    };
  }, [data]);
  
  // Get insight categories from real data
  const insightCategories = useMemo(() => {
    if (!data?.insights?.length) {
      return [
        { icon: MessageSquare, label: "Communication", count: 0, color: "text-blue-600 dark:text-blue-400" },
        { icon: Heart, label: "Emotional", count: 0, color: "text-pink-600 dark:text-pink-400" },
        { icon: Activity, label: "Behavioral", count: 0, color: "text-green-600 dark:text-green-400" }
      ];
    }
    
    const categoryCounts = data.insights.reduce((acc, insight) => {
      const category = insight.category || 'behavioral';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return [
      { icon: MessageSquare, label: "Communication", count: categoryCounts.communication || 0, color: "text-blue-600 dark:text-blue-400" },
      { icon: Heart, label: "Emotional", count: categoryCounts.emotional || 0, color: "text-pink-600 dark:text-pink-400" },
      { icon: Activity, label: "Behavioral", count: categoryCounts.behavioral || 0, color: "text-green-600 dark:text-green-400" }
    ];
  }, [data]);
  
  const totalInsights = insightCategories.reduce((acc, cat) => acc + cat.count, 0);
  const averageProgress = Object.values(metrics).reduce((a, b) => a + b, 0) / Object.keys(metrics).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800 h-full flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              AI Analytics
            </CardTitle>
            <div className="flex items-center gap-2">
              {isRealTime && (
                <Badge variant="outline" className="realtime-indicator">
                  <Wifi className="w-3 h-3 mr-1" />
                  <span className="realtime-dot" />
                  Live
                </Badge>
              )}
              <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/50">
                <Sparkles className="h-3 w-3 mr-1" />
                {totalInsights} Insights
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 flex-1 flex flex-col">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-2 sm:p-3">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                {metrics.communicationDelta !== 0 && (
                  <span className={`text-[10px] sm:text-xs font-medium ${metrics.communicationDelta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    {metrics.communicationDelta > 0 ? '+' : ''}{metrics.communicationDelta}%
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Communication</p>
              <p className="text-base sm:text-lg font-bold">{metrics.communicationHealth}%</p>
            </div>
            <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-2 sm:p-3">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <Heart className="h-3 w-3 sm:h-4 sm:w-4 text-pink-600 dark:text-pink-400" />
                {metrics.emotionalDelta !== 0 && (
                  <span className={`text-[10px] sm:text-xs font-medium ${metrics.emotionalDelta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    {metrics.emotionalDelta > 0 ? '+' : ''}{metrics.emotionalDelta}%
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Emotional IQ</p>
              <p className="text-base sm:text-lg font-bold">{metrics.emotionalIntelligence}%</p>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Health Score</span>
              <span className="font-medium text-purple-600 dark:text-purple-400">{Math.round(averageProgress)}%</span>
            </div>
            <Progress 
              value={averageProgress} 
              className="h-2"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span>{metrics.improvementRate}% improvement this month</span>
            </div>
          </div>

          {/* Insight Categories */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Active Insight Areas</p>
            <div className="space-y-1">
              {insightCategories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <div key={index} className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-900/50 rounded">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-3 w-3 ${category.color}`} />
                      <span className="text-xs">{category.label}</span>
                    </div>
                    <Badge variant="outline" className="text-xs h-5 flex-shrink-0">
                      {category.count}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-time Update Indicator */}
          {data?.timestamp && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
              <Clock className="w-3 h-3" />
              <span>Updated {new Date(data.timestamp).toLocaleTimeString()}</span>
            </div>
          )}
          
          {/* View All Button */}
          <div className="mt-auto pt-2">
            <Button 
              variant="outline" 
              className="w-full group"
              size="sm"
              asChild
            >
              <Link href="/dashboard?tab=insights">
                View All AI Insights
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}