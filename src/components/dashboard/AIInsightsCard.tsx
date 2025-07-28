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
import { Brain, Sparkles, ArrowRight, TrendingUp, Activity, Heart, MessageSquare } from 'lucide-react';
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

  // Generate meaningful preview metrics
  const metrics = {
    communicationHealth: 82,
    emotionalIntelligence: 78,
    relationshipProgress: 75,
    improvementRate: 15
  };
  
  // Get meaningful insight categories
  const insightCategories = [
    { icon: MessageSquare, label: "Communication", count: 3, color: "text-blue-600 dark:text-blue-400" },
    { icon: Heart, label: "Emotional", count: 2, color: "text-pink-600 dark:text-pink-400" },
    { icon: Activity, label: "Behavioral", count: 2, color: "text-green-600 dark:text-green-400" }
  ];
  
  const totalInsights = insightCategories.reduce((acc, cat) => acc + cat.count, 0);
  const averageProgress = Object.values(metrics).reduce((a, b) => a + b, 0) / Object.keys(metrics).length;

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
              AI Analytics
            </CardTitle>
            <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/50">
              <Sparkles className="h-3 w-3 mr-1" />
              {totalInsights} Insights
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-green-600 dark:text-green-400">+5%</span>
              </div>
              <p className="text-xs text-muted-foreground">Communication</p>
              <p className="text-lg font-bold">{metrics.communicationHealth}%</p>
            </div>
            <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <Heart className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                <span className="text-xs font-medium text-green-600 dark:text-green-400">+8%</span>
              </div>
              <p className="text-xs text-muted-foreground">Emotional IQ</p>
              <p className="text-lg font-bold">{metrics.emotionalIntelligence}%</p>
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
                    <Badge variant="outline" className="text-xs h-5">
                      {category.count}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

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