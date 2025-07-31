/**
 * Real-Time Communication Metrics Component
 * Displays live session metrics from VAPI with animated updates
 * 100% real data, no hardcoded values
 */

'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVAPIRealTimeMetrics } from '@/hooks/useVAPIRealTimeMetrics';
import { useTherapyTypeTabs } from './TherapyTypeTabs';
import { 
  Activity, 
  MessageSquare, 
  Heart, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import '@/styles/dashboard-modern.css';

interface MetricItemProps {
  name: string;
  value: number;
  previousValue?: number;
  icon: React.ElementType;
  color: string;
  isLoading?: boolean;
  lastUpdate?: Date | null;
}

function MetricItem({ 
  name, 
  value, 
  previousValue, 
  icon: Icon, 
  color, 
  isLoading,
  lastUpdate 
}: MetricItemProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const trend = previousValue !== undefined ? 
    value > previousValue ? 'up' : value < previousValue ? 'down' : 'neutral' 
    : 'neutral';

  useEffect(() => {
    if (previousValue !== undefined && previousValue !== value) {
      setIsUpdating(true);
      const timeout = setTimeout(() => setIsUpdating(false), 600);
      return () => clearTimeout(timeout);
    }
  }, [value, previousValue]);

  const formattedValue = Math.round(value);
  const change = previousValue !== undefined ? value - previousValue : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="communication-metric-item"
    >
      <div className="flex items-center gap-3">
        <div className={cn("metric-icon", color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="communication-metric-name">{name}</p>
          {lastUpdate && (
            <p className="text-xs text-muted-foreground">
              Updated {new Date().getTime() - lastUpdate.getTime() < 5000 ? 'just now' : 
                `${Math.round((new Date().getTime() - lastUpdate.getTime()) / 1000)}s ago`}
            </p>
          )}
        </div>
      </div>
      
      <div className="communication-metric-score">
        <div className="text-right">
          <div className={cn(
            "metric-value-animated communication-metric-value",
            isUpdating && "updating"
          )} data-trend={trend}>
            {isLoading ? (
              <div className="skeleton skeleton-text w-12 h-6" />
            ) : (
              <>
                {formattedValue}%
                {change !== 0 && (
                  <span className={cn(
                    "text-xs ml-1",
                    change > 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {change > 0 ? '+' : ''}{change.toFixed(1)}
                  </span>
                )}
              </>
            )}
          </div>
          {trend !== 'neutral' && (
            <div className="flex items-center justify-end gap-1 mt-1">
              {trend === 'up' ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
            </div>
          )}
        </div>
        
        {/* Mini sparkline placeholder - would integrate with real chart library */}
        <div className="communication-metric-chart hide-mobile">
          <svg className="sparkline" viewBox="0 0 60 30">
            <defs>
              <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`M 0,${30 - (previousValue || value) * 0.3} L 30,${30 - value * 0.3} L 60,${30 - value * 0.3}`}
              className="sparkline-path"
            />
            <path
              d={`M 0,${30 - (previousValue || value) * 0.3} L 30,${30 - value * 0.3} L 60,${30 - value * 0.3} L 60,30 L 0,30 Z`}
              className="sparkline-fill"
            />
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

export function CommunicationMetricsRealTime() {
  const { activeType, availableTypes, setActiveType } = useTherapyTypeTabs('communication');
  const [previousMetrics, setPreviousMetrics] = useState<any>(null);
  
  // Get real-time metrics for active therapy type
  const {
    metrics,
    categories,
    isConnected,
    error,
    lastUpdate,
    derivedMetrics,
    refetch
  } = useVAPIRealTimeMetrics({ 
    therapyType: activeType,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Track previous values for trend indicators
  useEffect(() => {
    if (metrics && !previousMetrics) {
      setPreviousMetrics(metrics);
    } else if (metrics && previousMetrics) {
      // Update previous metrics after a delay
      const timeout = setTimeout(() => {
        setPreviousMetrics(metrics);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [metrics, previousMetrics]);

  const metricIcons = {
    'Active Listening': MessageSquare,
    'Expressing Needs': Heart,
    'Conflict Resolution': Users,
    'Emotional Support': Activity,
    'Self-awareness': MessageSquare,
    'Emotional Regulation': Heart,
    'Personal Growth': TrendingUp,
    'Coping Skills': Activity,
    'Family Communication': Users,
    'Role Definition': MessageSquare,
    'Conflict Management': Activity,
    'Family Bonding': Heart
  };

  const metricColors = {
    'Active Listening': 'bg-blue-500',
    'Expressing Needs': 'bg-pink-500',
    'Conflict Resolution': 'bg-purple-500',
    'Emotional Support': 'bg-green-500',
    'Self-awareness': 'bg-indigo-500',
    'Emotional Regulation': 'bg-rose-500',
    'Personal Growth': 'bg-emerald-500',
    'Coping Skills': 'bg-cyan-500',
    'Family Communication': 'bg-orange-500',
    'Role Definition': 'bg-violet-500',
    'Conflict Management': 'bg-amber-500',
    'Family Bonding': 'bg-teal-500'
  };

  const isLoading = !metrics && !error;
  const hasData = metrics && categories.primary.some(m => m.value > 0);

  return (
    <Card className="metric-card dashboard-grid-span-6">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl font-semibold">
              Communication Metrics
            </CardTitle>
            {isConnected ? (
              <Badge variant="outline" className="realtime-indicator">
                <div className="realtime-dot" />
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
          
          {/* Therapy Type Selector */}
          <div className="flex items-center gap-2">
            {availableTypes.map(type => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-all",
                  activeType === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {error ? (
          <div className="error-state">
            <WifiOff className="error-icon mx-auto" />
            <p className="error-message">{error}</p>
            <button onClick={refetch} className="retry-button">
              <RefreshCw className="w-4 h-4 mr-2 inline" />
              Retry
            </button>
          </div>
        ) : !hasData && !isLoading ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">
              Start a {activeType} therapy session to see real-time metrics
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overall Score */}
            {derivedMetrics && (
              <div className="bg-secondary/50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Communication Health</p>
                    <p className="text-2xl font-bold">
                      {derivedMetrics.communicationHealth}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Confidence</p>
                    <p className="text-lg font-semibold">
                      {derivedMetrics.confidence}%
                    </p>
                  </div>
                </div>
                <div className="metric-progress mt-3">
                  <motion.div
                    className="metric-progress-bar"
                    initial={{ width: 0 }}
                    animate={{ width: `${derivedMetrics.communicationHealth}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}

            {/* Individual Metrics */}
            <div className="communication-metrics">
              <AnimatePresence mode="wait">
                {categories.primary.map((metric, index) => {
                  const Icon = metricIcons[metric.name as keyof typeof metricIcons] || Activity;
                  const color = metricColors[metric.name as keyof typeof metricColors] || 'bg-gray-500';
                  const previousValue = previousMetrics ? 
                    (metric.name === 'Active Listening' ? previousMetrics.activeListeningScore :
                     metric.name === 'Expressing Needs' ? previousMetrics.expressingNeedsScore :
                     metric.name === 'Conflict Resolution' ? previousMetrics.conflictResolutionScore :
                     metric.name === 'Emotional Support' ? previousMetrics.emotionalSupportScore :
                     metric.value) : undefined;

                  return (
                    <MetricItem
                      key={`${activeType}-${metric.name}`}
                      name={metric.name}
                      value={metric.value}
                      previousValue={previousValue}
                      icon={Icon}
                      color={color}
                      isLoading={isLoading}
                      lastUpdate={lastUpdate}
                    />
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Engagement Indicator */}
            {derivedMetrics && derivedMetrics.engagementLevel > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Session Engagement</span>
                  <span className={cn(
                    "font-medium",
                    derivedMetrics.engagementLevel > 70 ? "text-green-500" :
                    derivedMetrics.engagementLevel > 40 ? "text-yellow-500" :
                    "text-red-500"
                  )}>
                    {derivedMetrics.engagementLevel > 70 ? 'High' :
                     derivedMetrics.engagementLevel > 40 ? 'Medium' : 'Low'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}