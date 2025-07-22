// src/components/dashboard/UnifiedLoadingState.tsx
"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Loader2, 
  MessageSquare, 
  TrendingUp, 
  Calendar,
  Heart,
  Activity,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { dashboardTheme } from '@/lib/dashboard-theme';

// ========================================
// TYPES
// ========================================

export interface UnifiedLoadingStateProps {
  type: 'brain' | 'skeleton' | 'spinner' | 'none' | 'communication' | 'progress' | 'session' | 'insights';
  message?: string;
  className?: string;
  variant?: 'card' | 'inline' | 'fullscreen';
  metricType?: keyof typeof dashboardTheme.loadingStates;
}

// ========================================
// LOADING COMPONENTS
// ========================================

// Communication metrics loader
function CommunicationLoader({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <MessageSquare className="h-12 w-12 text-blue-600" />
        <motion.div
          className="absolute inset-0 bg-blue-500 opacity-20 rounded-full"
          animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>
      <div className="text-center space-y-2">
        <p className={`text-lg font-medium ${dashboardTheme.typography.h3}`}>
          {message || dashboardTheme.loadingStates.communication.message}
        </p>
        <p className={`${dashboardTheme.typography.bodySmall} text-muted-foreground`}>
          Evaluating conversation patterns
        </p>
      </div>
    </div>
  );
}

// Progress metrics loader
function ProgressLoader({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12">
      <motion.div className="relative">
        <TrendingUp className="h-12 w-12 text-green-600" />
        <motion.div
          className="absolute -top-2 -right-2"
          animate={{ y: [-2, -8, -2] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Sparkles className="h-4 w-4 text-yellow-500" />
        </motion.div>
      </motion.div>
      <div className="text-center space-y-2">
        <p className={`text-lg font-medium ${dashboardTheme.typography.h3}`}>
          {message || dashboardTheme.loadingStates.progress.message}
        </p>
        <p className={`${dashboardTheme.typography.bodySmall} text-muted-foreground`}>
          Tracking growth over time
        </p>
      </div>
    </div>
  );
}

// Therapy insights loader (Brain)
function BrainLoader({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <Brain className="h-12 w-12 text-purple-600" />
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <div className="h-full w-full rounded-full border-2 border-purple-200 border-t-purple-600" />
        </motion.div>
      </motion.div>
      <div className="text-center space-y-2">
        <p className={`text-lg font-medium ${dashboardTheme.typography.h3}`}>
          {message || dashboardTheme.loadingStates.insights.message}
        </p>
        <p className={`${dashboardTheme.typography.bodySmall} text-muted-foreground`}>
          Creating personalized recommendations
        </p>
      </div>
    </div>
  );
}

// Session analytics loader
function SessionLoader({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12">
      <motion.div className="relative">
        <Calendar className="h-12 w-12 text-blue-600" />
        <motion.div
          className="absolute top-0 right-0 flex space-x-1"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, staggerChildren: 0.2 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-2 w-2 bg-blue-500 rounded-full"
              animate={{ scale: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.div>
      </motion.div>
      <div className="text-center space-y-2">
        <p className={`text-lg font-medium ${dashboardTheme.typography.h3}`}>
          {message || dashboardTheme.loadingStates.sessions.message}
        </p>
        <p className={`${dashboardTheme.typography.bodySmall} text-muted-foreground`}>
          Organizing your therapy timeline
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
  variant = 'card',
  metricType
}: UnifiedLoadingStateProps) {
  if (type === 'none') return null;
  
  const content = (
    <AnimatePresence mode="wait">
      {(type === 'brain' || type === 'insights') && <BrainLoader message={message} />}
      {type === 'communication' && <CommunicationLoader message={message} />}
      {type === 'progress' && <ProgressLoader message={message} />}
      {type === 'session' && <SessionLoader message={message} />}
      {type === 'skeleton' && <SkeletonLoader message={message} />}
      {type === 'spinner' && <SpinnerLoader message={message} />}
    </AnimatePresence>
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