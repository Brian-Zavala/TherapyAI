// src/components/dashboard/UnifiedLoadingState.tsx
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// ========================================
// TYPES
// ========================================

export interface UnifiedLoadingStateProps {
  type: 'brain' | 'skeleton' | 'spinner' | 'none';
  message?: string;
  className?: string;
  variant?: 'card' | 'inline' | 'fullscreen';
}

// ========================================
// LOADING COMPONENTS
// ========================================

function BrainLoader({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Brain className="h-12 w-12 text-purple-600 animate-pulse" />
      </motion.div>
      <div className="text-center space-y-2">
        <p className="text-lg font-medium">
          {message || 'Analyzing your therapy journey...'}
        </p>
        <p className="text-sm text-muted-foreground">
          Generating personalized insights and recommendations
        </p>
      </div>
    </div>
  );
}

function SkeletonLoader({ message }: { message?: string }) {
  return (
    <div className="space-y-4">
      {message && (
        <p className="text-sm text-muted-foreground text-center mb-4">
          {message}
        </p>
      )}
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SpinnerLoader({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center space-x-2 py-4">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      {message && (
        <span className="text-sm text-muted-foreground">{message}</span>
      )}
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
  variant = 'card'
}: UnifiedLoadingStateProps) {
  if (type === 'none') return null;
  
  const content = (
    <>
      {type === 'brain' && <BrainLoader message={message} />}
      {type === 'skeleton' && <SkeletonLoader message={message} />}
      {type === 'spinner' && <SpinnerLoader message={message} />}
    </>
  );
  
  if (variant === 'inline') {
    return <div className={className}>{content}</div>;
  }
  
  if (variant === 'fullscreen') {
    return (
      <div className={`fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50 ${className}`}>
        {content}
      </div>
    );
  }
  
  // Default card variant
  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-6">
        {content}
      </CardContent>
    </Card>
  );
}

// ========================================
// PRESET LOADING STATES
// ========================================

export const LoadingStates = {
  TherapyInsights: () => (
    <UnifiedLoadingState
      type="brain"
      message="Analyzing your therapy journey..."
    />
  ),
  
  CommunicationMetrics: () => (
    <UnifiedLoadingState
      type="skeleton"
      message="Loading communication metrics..."
    />
  ),
  
  ProgressData: () => (
    <UnifiedLoadingState
      type="skeleton"
      message="Loading progress data..."
    />
  ),
  
  SessionAnalytics: () => (
    <UnifiedLoadingState
      type="skeleton"
      message="Loading session analytics..."
    />
  ),
  
  RefreshingData: () => (
    <UnifiedLoadingState
      type="spinner"
      message="Updating..."
      variant="inline"
    />
  )
};