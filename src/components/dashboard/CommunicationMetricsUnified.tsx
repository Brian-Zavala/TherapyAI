// src/components/dashboard/CommunicationMetricsUnified.tsx
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { UnifiedLoadingState } from './UnifiedLoadingState';
import { useCommunicationMetrics } from '@/hooks/useDashboardDataUnified';
import { dashboardTheme, getMetricTheme, getProgressBarClasses } from '@/lib/dashboard-theme';
import { 
  MessageSquare, 
  Heart, 
  Users, 
  Volume2,
  Ear,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Loader2
} from 'lucide-react';

interface MetricItemProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  metricType: 'communication' | 'empathy' | 'clarity' | 'respect';
}

function MetricItem({ label, value, icon, trend, metricType }: MetricItemProps) {
  const theme = getMetricTheme(metricType);
  const trendData = trend ? dashboardTheme.getTrendIcon(trend) : null;
  
  // Smooth value animation
  const [displayValue, setDisplayValue] = React.useState(0);
  
  React.useEffect(() => {
    const timer = setTimeout(() => setDisplayValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <motion.div 
      className="space-y-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Icon with cohesive gradient background */}
          <motion.div 
            className={`p-2.5 rounded-lg bg-gradient-to-br ${theme.gradient} ${theme.shadow}`}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="text-white">
              {icon}
            </div>
          </motion.div>
          
          {/* Consistent label typography */}
          <span className={`${dashboardTheme.typography.label} text-gray-700 dark:text-gray-300`}>
            {label}
          </span>
        </div>
        
        {/* Trend indicator with theme colors */}
        {trendData && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            {trend === 'up' && <TrendingUp className="h-4 w-4" style={{ color: trendData.color }} />}
            {trend === 'down' && <TrendingDown className="h-4 w-4" style={{ color: trendData.color }} />}
            {trend === 'stable' && <Minus className="h-4 w-4" style={{ color: trendData.color }} />}
          </motion.div>
        )}
      </div>
      
      <div className="space-y-1">
        {/* Progress bar with smooth animation */}
        <div className="relative">
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5" />
          <motion.div
            className={`absolute inset-y-0 left-0 h-2.5 rounded-full ${getProgressBarClasses(value)}`}
            initial={{ width: 0 }}
            animate={{ width: `${displayValue}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Shimmer effect for high values */}
            {value >= 80 && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
            )}
          </motion.div>
        </div>
        
        {/* Value display with animation */}
        <div className="flex justify-between items-center">
          <motion.span 
            className={`${dashboardTheme.typography.caption} font-medium`}
            animate={{ opacity: [0.5, 1] }}
            transition={{ duration: 0.5 }}
          >
            {displayValue}%
          </motion.span>
          
          {/* Achievement indicator for high scores */}
          {value >= 80 && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Sparkles className="h-3 w-3 text-yellow-500" />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function CommunicationMetricsUnified() {
  const { 
    data, 
    isLoading, 
    error, 
    loadingState,
    isRefetching
  } = useCommunicationMetrics({
    enableRealTime: true,
    refetchInterval: 30000 // 30 seconds
  });

  if (isLoading && !data) {
    return (
      <UnifiedLoadingState 
        type="communication" 
        message={dashboardTheme.loadingStates.communication.message}
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
            <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className={dashboardTheme.typography.body}>No communication data available</p>
            <p className={`${dashboardTheme.typography.caption} mt-1`}>Complete a session to see metrics</p>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  // Calculate trends based on historical data (mock for now)
  const getTrend = (current: number): 'up' | 'down' | 'stable' => {
    // This would normally compare with historical data
    if (current > 75) return 'up';
    if (current < 50) return 'down';
    return 'stable';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={`w-full border-0 ${dashboardTheme.shadows.md} hover:${dashboardTheme.shadows.lg} transition-shadow duration-300`}>
        <CardHeader className={`${dashboardTheme.responsive.padding.mobile} ${dashboardTheme.responsive.padding.desktop} pb-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${dashboardTheme.metrics.communication.gradient}`}>
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <CardTitle className={dashboardTheme.typography.h2}>Communication Metrics</CardTitle>
            </div>
            {isRefetching && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </motion.div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className={`${dashboardTheme.responsive.padding.mobile} ${dashboardTheme.responsive.padding.desktop} pt-2`}>
          <div className={`grid grid-cols-1 md:grid-cols-2 ${dashboardTheme.responsive.gap.mobile} ${dashboardTheme.responsive.gap.desktop}`}>
            <MetricItem
              label="Clarity"
              value={Math.round(data.clarity)}
              icon={<MessageSquare className={dashboardTheme.icons.md} />}
              trend={getTrend(data.clarity)}
              metricType="clarity"
            />
            <MetricItem
              label="Empathy"
              value={Math.round(data.empathy)}
              icon={<Heart className={dashboardTheme.icons.md} />}
              trend={getTrend(data.empathy)}
              metricType="empathy"
            />
            <MetricItem
              label="Respect"
              value={Math.round(data.respect)}
              icon={<Users className={dashboardTheme.icons.md} />}
              trend={getTrend(data.respect)}
              metricType="respect"
            />
            <MetricItem
              label="Overall Communication"
              value={Math.round(data.overall)}
              icon={<TrendingUp className={dashboardTheme.icons.md} />}
              trend={getTrend(data.overall)}
              metricType="communication"
            />
          </div>
        
          {data.listening !== undefined && data.expression !== undefined && (
            <>
              <motion.div 
                className="md:col-span-2 my-4"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
              </motion.div>
              
              <MetricItem
                label="Active Listening"
                value={Math.round(data.listening)}
                icon={<Ear className={dashboardTheme.icons.md} />}
                trend={getTrend(data.listening)}
                metricType="support"
              />
              <MetricItem
                label="Self Expression"
                value={Math.round(data.expression)}
                icon={<Volume2 className={dashboardTheme.icons.md} />}
                trend={getTrend(data.expression)}
                metricType="clarity"
              />
            </>
          )}
          
          {/* Summary insight */}
          {data.overall >= 70 && (
            <motion.div 
              className="md:col-span-2 mt-4 p-4 rounded-lg bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className={`${dashboardTheme.typography.bodySmall} text-green-800 dark:text-green-200`}>
                  Great progress! Your communication is {data.overall >= 80 ? 'excellent' : 'strong'} across all areas.
                </p>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}