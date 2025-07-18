// src/components/dashboard/CommunicationMetricsUnified.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { UnifiedLoadingState } from './UnifiedLoadingState';
import { useCommunicationMetrics } from '@/hooks/useDashboardMetricsUnified';
import { 
  MessageSquare, 
  Heart, 
  Users, 
  Volume2,
  Ear,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface MetricItemProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
}

function MetricItem({ label, value, icon, trend, color = "bg-blue-500" }: MetricItemProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      default:
        return <Minus className="h-3 w-3 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${color} bg-opacity-20`}>
            {icon}
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        {trend && getTrendIcon()}
      </div>
      <div className="space-y-1">
        <Progress value={value} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{value}%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
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
    refreshInterval: 30000 // 30 seconds
  });

  if (isLoading && !data) {
    return <UnifiedLoadingState {...loadingState} />;
  }

  if (error || !data) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No communication data available</p>
          </div>
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
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricItem
            label="Clarity"
            value={Math.round(data.clarity)}
            icon={<MessageSquare className="h-4 w-4 text-blue-600" />}
            trend={getTrend(data.clarity)}
            color="bg-blue-500"
          />
          <MetricItem
            label="Empathy"
            value={Math.round(data.empathy)}
            icon={<Heart className="h-4 w-4 text-pink-600" />}
            trend={getTrend(data.empathy)}
            color="bg-pink-500"
          />
          <MetricItem
            label="Respect"
            value={Math.round(data.respect)}
            icon={<Users className="h-4 w-4 text-green-600" />}
            trend={getTrend(data.respect)}
            color="bg-green-500"
          />
          <MetricItem
            label="Overall"
            value={Math.round(data.overall)}
            icon={<TrendingUp className="h-4 w-4 text-purple-600" />}
            trend={getTrend(data.overall)}
            color="bg-purple-500"
          />
        </div>
        
        {data.listening !== undefined && data.expression !== undefined && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <MetricItem
              label="Listening"
              value={Math.round(data.listening)}
              icon={<Ear className="h-4 w-4 text-orange-600" />}
              trend={getTrend(data.listening)}
              color="bg-orange-500"
            />
            <MetricItem
              label="Expression"
              value={Math.round(data.expression)}
              icon={<Volume2 className="h-4 w-4 text-cyan-600" />}
              trend={getTrend(data.expression)}
              color="bg-cyan-500"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}