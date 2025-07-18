// src/components/dashboard/RelationshipProgressUnified.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { UnifiedLoadingState } from './UnifiedLoadingState';
import { useProgressMetrics } from '@/hooks/useDashboardMetricsUnified';
import { 
  Heart,
  MessageSquare,
  Shield,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Award
} from 'lucide-react';

interface ProgressMetricProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function ProgressMetric({ label, value, icon, color }: ProgressMetricProps) {
  const getProgressColor = (value: number) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-blue-500';
    if (value >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
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
        <span className="text-sm font-semibold">{value}%</span>
      </div>
      <Progress 
        value={value} 
        className={`h-2 ${getProgressColor(value)}`}
      />
    </div>
  );
}

export function RelationshipProgressUnified() {
  const { 
    data, 
    isLoading, 
    error, 
    loadingState,
    isRefetching
  } = useProgressMetrics({
    enableRealTime: true,
    refreshInterval: 60000 // 1 minute
  });

  if (isLoading && !data) {
    return <UnifiedLoadingState {...loadingState} />;
  }

  if (error || !data) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Heart className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No progress data available</p>
          </div>
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
            color="bg-pink-500"
          />
          <ProgressMetric
            label="Communication Quality"
            value={Math.round(data.communicationScore)}
            icon={<MessageSquare className="h-4 w-4 text-blue-600" />}
            color="bg-blue-500"
          />
          <ProgressMetric
            label="Conflict Resolution"
            value={Math.round(data.conflictResolution)}
            icon={<Shield className="h-4 w-4 text-green-600" />}
            color="bg-green-500"
          />
          <ProgressMetric
            label="Emotional Support"
            value={Math.round(data.emotionalSupport)}
            icon={<Sparkles className="h-4 w-4 text-purple-600" />}
            color="bg-purple-500"
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