// src/components/dashboard/UnifiedLoadingStateV2.tsx
"use client";

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Brain, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ========================================
// TYPES
// ========================================

export interface UnifiedLoadingStateProps {
  type: 'brain' | 'skeleton' | 'spinner' | 'none';
  message?: string;
  className?: string;
  variant?: 'card' | 'inline' | 'fullscreen';
  'aria-label'?: string;
}

// ========================================
// LOADING COMPONENTS
// ========================================

function BrainLoader({ message, ariaLabel }: { message?: string; ariaLabel?: string }) {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <div 
      role="status" 
      aria-live="polite" 
      aria-label={ariaLabel || message || 'Analyzing therapy data'}
      className="flex flex-col items-center justify-center space-y-4 py-12"
    >
      <motion.div
        initial={shouldReduceMotion ? {} : { scale: 0.8, opacity: 0 }}
        animate={shouldReduceMotion ? {} : { scale: 1, opacity: 1 }}
        transition={shouldReduceMotion ? {} : { duration: 0.5 }}
        style={shouldReduceMotion ? {} : { willChange: 'transform, opacity' }}
      >
        <Brain 
          className={cn(
            "h-12 w-12 text-purple-600 dark:text-purple-400",
            !shouldReduceMotion && "animate-pulse"
          )}
          aria-hidden="true"
        />
      </motion.div>
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-foreground">
          {message || 'Analyzing your therapy journey...'}
        </p>
        <p className="text-sm text-muted-foreground">
          Generating personalized insights and recommendations
        </p>
      </div>
    </div>
  );
}

function SkeletonLoader({ message, ariaLabel }: { message?: string; ariaLabel?: string }) {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <div 
      role="status" 
      aria-live="polite" 
      aria-label={ariaLabel || message || 'Loading content'}
      className="space-y-4"
    >
      {message && (
        <p className="text-sm text-muted-foreground text-center mb-4">
          {message}
        </p>
      )}
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "space-y-2",
              !shouldReduceMotion && "animate-pulse"
            )}
          >
            <div 
              className="h-4 bg-muted rounded w-3/4"
              style={{ animationDelay: `${i * 150}ms` }}
            />
            <div 
              className="h-3 bg-muted rounded w-1/2"
              style={{ animationDelay: `${i * 150 + 75}ms` }}
            />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading, please wait...</span>
    </div>
  );
}

function SpinnerLoader({ message, ariaLabel }: { message?: string; ariaLabel?: string }) {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <div 
      role="status" 
      aria-live="polite" 
      aria-label={ariaLabel || message || 'Updating content'}
      className="flex items-center justify-center space-x-2 py-4"
    >
      <Loader2 
        className={cn(
          "h-5 w-5 text-primary",
          !shouldReduceMotion && "animate-spin"
        )}
        aria-hidden="true"
      />
      {message && (
        <span className="text-sm text-muted-foreground">{message}</span>
      )}
      {!message && <span className="sr-only">Loading...</span>}
    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export function UnifiedLoadingState({
  type,
  message,
  className = '',
  variant = 'card',
  'aria-label': ariaLabel
}: UnifiedLoadingStateProps) {
  if (type === 'none') return null;
  
  const content = (
    <>
      {type === 'brain' && <BrainLoader message={message} ariaLabel={ariaLabel} />}
      {type === 'skeleton' && <SkeletonLoader message={message} ariaLabel={ariaLabel} />}
      {type === 'spinner' && <SpinnerLoader message={message} ariaLabel={ariaLabel} />}
    </>
  );
  
  if (variant === 'inline') {
    return <div className={cn("inline-flex", className)}>{content}</div>;
  }
  
  if (variant === 'fullscreen') {
    return (
      <div 
        className={cn(
          "fixed inset-0 flex items-center justify-center",
          "bg-background/80 backdrop-blur-sm z-50",
          className
        )}
      >
        {content}
      </div>
    );
  }
  
  // Default card variant
  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-6">
        {content}
      </CardContent>
    </Card>
  );
}

// ========================================
// PRESET LOADING STATES WITH ERROR BOUNDARY
// ========================================

import { ErrorBoundary } from 'react-error-boundary';

function LoadingErrorFallback({ error }: { error: Error }) {
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="text-center text-muted-foreground">
          <p>Failed to load component</p>
          <p className="text-xs mt-2">{error.message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function withLoadingBoundary<P extends object>(
  Component: React.ComponentType<P>
) {
  return function BoundedComponent(props: P) {
    return (
      <ErrorBoundary fallback={<LoadingErrorFallback error={new Error('Component error')} />}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export const LoadingStates = {
  TherapyInsights: withLoadingBoundary(() => (
    <UnifiedLoadingState
      type="brain"
      message="Analyzing your therapy journey..."
      aria-label="Loading therapy insights with AI analysis"
    />
  )),
  
  CommunicationMetrics: withLoadingBoundary(() => (
    <UnifiedLoadingState
      type="skeleton"
      message="Loading communication metrics..."
      aria-label="Loading communication quality data"
    />
  )),
  
  ProgressData: withLoadingBoundary(() => (
    <UnifiedLoadingState
      type="skeleton"
      message="Loading progress data..."
      aria-label="Loading relationship progress information"
    />
  )),
  
  SessionAnalytics: withLoadingBoundary(() => (
    <UnifiedLoadingState
      type="skeleton"
      message="Loading session analytics..."
      aria-label="Loading session statistics and analytics"
    />
  )),
  
  RefreshingData: withLoadingBoundary(() => (
    <UnifiedLoadingState
      type="spinner"
      message="Updating..."
      variant="inline"
      aria-label="Refreshing dashboard data"
    />
  ))
};