/**
 * Specialized Error Boundary for Therapy Insights
 * Handles AI service errors, data processing failures, and fallback states
 */
"use client";

import React from 'react';
import { Brain, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DashboardErrorBoundary } from '@/components/dashboard/DashboardErrorBoundary';

interface TherapyInsightsErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

export function TherapyInsightsErrorBoundary({ 
  children, 
  onReset 
}: TherapyInsightsErrorBoundaryProps) {
  return (
    <DashboardErrorBoundary
      fallback={<TherapyInsightsErrorFallback onReset={onReset} />}
      onError={(error, errorInfo) => {
        console.error('Therapy Insights Error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
        });
      }}
      resetKeys={['therapyInsights']}
      isolate={true}
    >
      {children}
    </DashboardErrorBoundary>
  );
}

interface TherapyInsightsErrorFallbackProps {
  onReset?: () => void;
}

function TherapyInsightsErrorFallback({ onReset }: TherapyInsightsErrorFallbackProps) {
  return (
    <Card className="w-full border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-amber-100 dark:bg-amber-900/20 p-3">
            <Brain className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              AI Insights Temporarily Unavailable
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              We're having trouble generating your therapy insights right now. 
              This might be due to high demand or a temporary service issue.
            </p>
          </div>
          
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Your therapy data is safe and secure. You can still access your sessions, 
              metrics, and progress tracking while we resolve this issue.
            </AlertDescription>
          </Alert>
          
          {onReset && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// PARTIAL INSIGHTS COMPONENT
// ========================================

interface PartialInsightsProps {
  availableInsights: string[];
  missingInsights: string[];
  onRetry?: () => void;
}

export function PartialInsights({
  availableInsights,
  missingInsights,
  onRetry,
}: PartialInsightsProps) {
  if (missingInsights.length === 0) return null;
  
  return (
    <Alert variant={"warning" as any} className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <div className="ml-2">
        <AlertDescription>
          <span className="font-medium">Limited insights available.</span>
          {' '}Some AI features couldn't be loaded:{' '}
          {missingInsights.join(', ')}.
        </AlertDescription>
        {onRetry && (
          <Button
            variant="link"
            size="sm"
            onClick={onRetry}
            className="h-auto p-0 mt-1"
          >
            Try loading missing insights
          </Button>
        )}
      </div>
    </Alert>
  );
}

// ========================================
// INSIGHTS LOADING STATE
// ========================================

export function InsightsLoadingState() {
  return (
    <Card className="w-full border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 p-3">
            <Brain className="h-6 w-6 text-white animate-pulse" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-muted animate-pulse rounded w-1/3" />
            <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
          </div>
        </div>
        
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-muted/50 rounded-lg animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-5/6 mt-1" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// INSIGHTS EMPTY STATE
// ========================================

interface InsightsEmptyStateProps {
  reason?: 'no-sessions' | 'insufficient-data' | 'processing';
  onAction?: () => void;
}

export function InsightsEmptyState({ 
  reason = 'no-sessions',
  onAction 
}: InsightsEmptyStateProps) {
  const content = {
    'no-sessions': {
      title: 'No Insights Available Yet',
      description: 'Complete your first therapy session to receive personalized AI insights.',
      actionLabel: 'Schedule a Session',
    },
    'insufficient-data': {
      title: 'Building Your Insights',
      description: 'We need a few more sessions to generate meaningful insights for you.',
      actionLabel: 'View Progress',
    },
    'processing': {
      title: 'Processing Your Sessions',
      description: 'We\'re analyzing your recent sessions. Check back in a few minutes.',
      actionLabel: 'Refresh',
    },
  };
  
  const { title, description, actionLabel } = content[reason];
  
  return (
    <Card className="w-full border-0 shadow-sm">
      <CardContent className="p-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-muted p-4">
            <Brain className="h-10 w-10 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {description}
            </p>
          </div>
          
          {onAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAction}
              className="mt-2"
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}