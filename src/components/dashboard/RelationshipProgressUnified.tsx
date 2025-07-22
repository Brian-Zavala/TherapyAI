// src/components/dashboard/RelationshipProgressUnified.tsx
"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { UnifiedLoadingState } from './UnifiedLoadingState';
import { useProgressData } from '@/hooks/useDashboardDataUnified';
import { dashboardTheme, getMetricTheme, getProgressBarClasses } from '@/lib/dashboard-theme';
import { 
  Heart,
  MessageSquare,
  Shield,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Loader2,
  Users,
  Zap
} from 'lucide-react';

interface ProgressMetricProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  metricType: 'progress' | 'empathy' | 'communication' | 'support';
  description?: string;
}

function ProgressMetric({ label, value, icon, metricType, description }: ProgressMetricProps) {
  const theme = getMetricTheme(metricType);
  const [displayValue, setDisplayValue] = React.useState(0);
  
  React.useEffect(() => {
    const timer = setTimeout(() => setDisplayValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  // Determine achievement level
  const getAchievementBadge = (val: number) => {
    if (val >= 90) return { label: 'Excellent', icon: Award, color: 'text-yellow-600' };
    if (val >= 75) return { label: 'Strong', icon: Sparkles, color: 'text-purple-600' };
    if (val >= 60) return { label: 'Good', icon: TrendingUp, color: 'text-blue-600' };
    return null;
  };

  const achievement = getAchievementBadge(value);

  return (
    <motion.div 
      className="relative group"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
    >
      <div 
        className={`space-y-3 p-4 rounded-xl border transition-all duration-300 border-gray-200 dark:border-gray-700 hover:${theme.shadow}`}
        style={{ backgroundColor: theme.background }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Animated icon container */}
            <motion.div 
              className={`p-3 rounded-xl bg-gradient-to-br ${theme.gradient} ${theme.shadow}`}
              whileHover={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-white">
                {icon}
              </div>
            </motion.div>
            
            <div>
              <span className={`${dashboardTheme.typography.label} text-gray-800 dark:text-gray-200`}>
                {label}
              </span>
              {description && (
                <p className={`${dashboardTheme.typography.caption} text-gray-600 dark:text-gray-400 mt-0.5`}>
                  {description}
                </p>
              )}
            </div>
          </div>
          
          {/* Achievement badge */}
          {achievement && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-1"
            >
              <achievement.icon className={`h-4 w-4 ${achievement.color}`} />
              <span className={`text-xs font-medium ${achievement.color}`}>
                {achievement.label}
              </span>
            </motion.div>
          )}
        </div>
        
        {/* Progress visualization */}
        <div className="space-y-2">
          <div className="relative">
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-full h-3" />
            <motion.div
              className={`absolute inset-y-0 left-0 h-3 rounded-full ${getProgressBarClasses(value)}`}
              initial={{ width: 0 }}
              animate={{ width: `${displayValue}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              {/* Pulse effect for high values */}
              {value >= 80 && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-white/30"
                  animate={{ opacity: [0, 0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.div>
            
            {/* Value indicator */}
            <motion.div
              className="absolute -top-8 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-1 rounded text-xs font-medium"
              style={{ left: `${displayValue}%`, transform: 'translateX(-50%)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {displayValue}%
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function RelationshipProgressUnified() {
  const { 
    data, 
    isLoading, 
    error, 
    loadingState,
    isRefetching
  } = useProgressData({
    enableRealTime: true,
    refetchInterval: 60000 // 1 minute
  });

  if (isLoading && !data) {
    return (
      <UnifiedLoadingState 
        type="progress" 
        message={dashboardTheme.loadingStates.progress.message}
        variant="card"
      />
    );
  }

  if (error || !data) {
    return (
      <Card className="w-full border-0 shadow-sm">
        <CardContent className={`${dashboardTheme.responsive.padding.mobile} ${dashboardTheme.responsive.padding.desktop}`}>
          <motion.div 
            className="text-center text-muted-foreground"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Heart className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className={dashboardTheme.typography.body}>No progress data available</p>
            <p className={`${dashboardTheme.typography.caption} mt-1`}>Start your therapy journey to track progress</p>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendBadgeVariant = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'default';
      case 'declining':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Calculate overall score
  const overallScore = Math.round(
    (data.closenessScore + 
     data.communicationScore + 
     data.conflictResolution + 
     data.emotionalSupport) / 4
  );

  // Determine if any metric is exceptional
  const hasExceptionalProgress = Object.values(data).some(
    value => typeof value === 'number' && value >= 85
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Relationship Progress</CardTitle>
          <div className="flex items-center gap-2">
            {hasExceptionalProgress && (
              <Badge variant="outline" className="gap-1">
                <Award className="h-3 w-3" />
                Excellent Progress
              </Badge>
            )}
            <Badge variant={getTrendBadgeVariant(data.trend)} className="gap-1">
              {getTrendIcon(data.trend)}
              {data.trend}
            </Badge>
            {isRefetching && (
              <UnifiedLoadingState 
                type="spinner" 
                message="" 
                variant="inline" 
                className="ml-2"
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="text-center pb-4 border-b">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <span className="text-2xl font-bold">{overallScore}%</span>
          </div>
          <p className="text-sm text-muted-foreground">Overall Relationship Health</p>
        </div>

        {/* Individual Metrics */}
        <div className="space-y-4">
          <ProgressMetric
            label="Emotional Closeness"
            value={Math.round(data.closenessScore)}
            icon={<Heart className="h-4 w-4 text-pink-600" />}
            metricType="empathy"
          />
          <ProgressMetric
            label="Communication Quality"
            value={Math.round(data.communicationScore)}
            icon={<MessageSquare className="h-4 w-4 text-blue-600" />}
            metricType="communication"
          />
          <ProgressMetric
            label="Conflict Resolution"
            value={Math.round(data.conflictResolution)}
            icon={<Shield className="h-4 w-4 text-green-600" />}
            metricType="progress"
          />
          <ProgressMetric
            label="Emotional Support"
            value={Math.round(data.emotionalSupport)}
            icon={<Sparkles className="h-4 w-4 text-purple-600" />}
            metricType="support"
          />
        </div>

        {/* Motivational Message */}
        {overallScore >= 80 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              🎉 Outstanding progress! Your relationship is thriving. Keep up the excellent work!
            </p>
          </div>
        )}
        {overallScore >= 60 && overallScore < 80 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💪 Good progress! You're on the right track. Focus on consistency to reach the next level.
            </p>
          </div>
        )}
        {overallScore < 60 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              🌱 Every journey starts somewhere. Small, consistent efforts lead to big changes over time.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}