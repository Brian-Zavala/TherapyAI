// src/components/dashboard/CommunicationMetricsUnifiedV2.tsx
"use client";

import React, { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { UnifiedLoadingState } from './UnifiedLoadingStateV2';
import { useCommunicationMetrics, type CommunicationMetrics } from '@/hooks/useDashboardMetricsUnifiedV2';
import { ErrorBoundary } from 'react-error-boundary';
import { 
  MessageSquare, 
  Heart, 
  Users, 
  Volume2,
  Ear,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle
} from 'lucide-react';

// ========================================
// UTILITIES
// ========================================

function safeNumber(value: any, defaultValue = 0): number {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return defaultValue;
  }
  return Math.max(0, Math.min(100, value)); // Clamp between 0-100
}

function getTrendFromHistory(
  current: number,
  history?: { value: number; timestamp: Date }[]
): 'up' | 'down' | 'stable' {
  if (!history || history.length < 2) return 'stable';
  
  const previous = history[history.length - 2]?.value;
  if (typeof previous !== 'number') return 'stable';
  
  const difference = current - previous;
  if (difference > 5) return 'up';
  if (difference < -5) return 'down';
  return 'stable';
}

// ========================================
// METRIC ITEM COMPONENT
// ========================================

interface MetricItemProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
  description?: string;
}

const MetricItem = memo(function MetricItem({ 
  label, 
  value, 
  icon, 
  trend = 'stable', 
  color = "bg-blue-500",
  description
}: MetricItemProps) {
  const getTrendIcon = useCallback(() => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" aria-label="Improving" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" aria-label="Declining" />;
      default:
        return <Minus className="h-3 w-3 text-gray-400" aria-label="Stable" />;
    }
  }, [trend]);

  const safeValue = safeNumber(value);
  const progressColor = safeValue >= 70 ? 'bg-green-500' : safeValue >= 50 ? 'bg-blue-500' : 'bg-yellow-500';

  return (
    <div className="space-y-2" role="group" aria-label={`${label} metric`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className={`p-1.5 rounded-lg ${color} bg-opacity-20`}
            aria-hidden="true"
          >
            {icon}
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        {getTrendIcon()}
      </div>
      <div className="space-y-1">
        <Progress 
          value={safeValue} 
          className={`h-2 ${progressColor}`}
          aria-label={`${label}: ${safeValue}%`}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{safeValue}%</span>
          <span>100%</span>
        </div>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
});

// ========================================
// ERROR FALLBACK COMPONENT
// ========================================

function MetricsErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="font-semibold">Failed to load communication metrics</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error.message || 'An unexpected error occurred'}
            </p>
          </div>
          <button
            onClick={resetErrorBoundary}
            className="text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// EMPTY STATE COMPONENT
// ========================================

function EmptyState() {
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="text-center text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No communication data available</p>
          <p className="text-sm mt-1">Complete a therapy session to see your metrics</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

function CommunicationMetricsUnifiedContent() {
  const { 
    data, 
    isLoading, 
    error, 
    loadingState,
    isRefetching,
    refetch
  } = useCommunicationMetrics({
    enableRealTime: true,
    refreshInterval: 30000 // 30 seconds
  });

  // Loading state
  if (isLoading && !data) {
    return <UnifiedLoadingState {...loadingState} />;
  }

  // Error state
  if (error) {
    throw error; // Let error boundary handle it
  }

  // Empty state
  if (!data) {
    return <EmptyState />;
  }

  // Calculate safe metric values
  const metrics = {
    clarity: safeNumber(data.clarity, 50),
    empathy: safeNumber(data.empathy, 50),
    respect: safeNumber(data.respect, 50),
    overall: safeNumber(data.overall, 50),
    listening: data.listening !== undefined ? safeNumber(data.listening, 50) : undefined,
    expression: data.expression !== undefined ? safeNumber(data.expression, 50) : undefined,
  };

  // For now, use simple trend calculation
  // In production, this would compare with historical data
  const getTrend = (current: number): 'up' | 'down' | 'stable' => {
    if (current >= 75) return 'up';
    if (current < 50) return 'down';
    return 'stable';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Communication Metrics</CardTitle>
          {isRefetching && (
            <UnifiedLoadingState 
              type="spinner" 
              message="" 
              variant="inline" 
              className="ml-2"
              aria-label="Refreshing metrics"
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricItem
            label="Clarity"
            value={metrics.clarity}
            icon={<MessageSquare className="h-4 w-4 text-blue-600" />}
            trend={getTrend(metrics.clarity)}
            color="bg-blue-500"
            description="How clearly you express your thoughts and needs"
          />
          <MetricItem
            label="Empathy"
            value={metrics.empathy}
            icon={<Heart className="h-4 w-4 text-pink-600" />}
            trend={getTrend(metrics.empathy)}
            color="bg-pink-500"
            description="Understanding and sharing your partner's feelings"
          />
          <MetricItem
            label="Respect"
            value={metrics.respect}
            icon={<Users className="h-4 w-4 text-green-600" />}
            trend={getTrend(metrics.respect)}
            color="bg-green-500"
            description="Valuing each other's opinions and boundaries"
          />
          <MetricItem
            label="Overall"
            value={metrics.overall}
            icon={<TrendingUp className="h-4 w-4 text-purple-600" />}
            trend={getTrend(metrics.overall)}
            color="bg-purple-500"
            description="Your combined communication effectiveness"
          />
        </div>
        
        {(metrics.listening !== undefined || metrics.expression !== undefined) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            {metrics.listening !== undefined && (
              <MetricItem
                label="Listening"
                value={metrics.listening}
                icon={<Ear className="h-4 w-4 text-orange-600" />}
                trend={getTrend(metrics.listening)}
                color="bg-orange-500"
                description="Active listening and understanding"
              />
            )}
            {metrics.expression !== undefined && (
              <MetricItem
                label="Expression"
                value={metrics.expression}
                icon={<Volume2 className="h-4 w-4 text-cyan-600" />}
                trend={getTrend(metrics.expression)}
                color="bg-cyan-500"
                description="Expressing yourself authentically"
              />
            )}
          </div>
        )}
        
        {/* Helpful tip based on lowest metric */}
        {(() => {
          const lowestMetric = Object.entries(metrics)
            .filter(([_, value]) => value !== undefined)
            .reduce((min, [key, value]) => 
              (value as number) < (min[1] as number) ? [key, value] : min
            );
          
          if ((lowestMetric[1] as number) < 60) {
            return (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 Focus on improving {lowestMetric[0]} for better communication outcomes
                </p>
              </div>
            );
          }
          return null;
        })()}
      </CardContent>
    </Card>
  );
}

// ========================================
// EXPORTED COMPONENT WITH ERROR BOUNDARY
// ========================================

export function CommunicationMetricsUnified() {
  return (
    <ErrorBoundary 
      FallbackComponent={MetricsErrorFallback}
      onReset={() => window.location.reload()}
    >
      <CommunicationMetricsUnifiedContent />
    </ErrorBoundary>
  );
}