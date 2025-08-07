// src/components/dashboard/CommunicationMetricsUnified.tsx
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { UnifiedLoadingState } from './UnifiedLoadingState';
import { useCommunicationMetricsFromContext } from '@/hooks/useDashboardContext';
import { dashboardTheme, getMetricTheme, getProgressBarClasses } from '@/lib/dashboard-theme';
import { useDashboardLoading } from '@/app/dashboard/page';
import { DashboardErrorWrapper } from './DashboardErrorBoundary';
import { DashboardAPIError } from './DashboardAPIErrorBoundary';
import { 
  MessageSquare, 
  Heart, 
  Users, 
  Volume2,
  Ear,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2
} from 'lucide-react';

// Custom hook for periodic animation triggers
function usePeriodicAnimation(interval: number = 8000) {
  const [isAnimating, setIsAnimating] = React.useState(false);
  
  React.useEffect(() => {
    // Start initial animation after a short delay
    const initialTimeout = setTimeout(() => {
      setIsAnimating(true);
    }, 500);
    
    // Set up interval for periodic animations
    const intervalId = setInterval(() => {
      setIsAnimating(true);
      
      // Stop animation after 4 seconds (half the interval)
      setTimeout(() => {
        setIsAnimating(false);
      }, 4000);
    }, interval);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [interval]);
  
  return isAnimating;
}

// Inspirational sayings for each metric type
const inspirationalSayings = {
  clarity: [
    "Clear words build strong bridges",
    "Understanding begins with clarity", 
    "Speak your truth with kindness",
    "Clarity is the foundation of connection"
  ],
  empathy: [
    "Feel deeply, love completely",
    "Understanding hearts heal together",
    "Empathy is love in action",
    "Walk gently in each other's shoes"
  ],
  respect: [
    "Honor each other's journey",
    "Respect nurtures lasting love",
    "Value the person, not just the words",
    "Together we rise with mutual respect"
  ],
  communication: [
    "Every conversation is a new beginning",
    "Connection grows through communication",
    "Your words matter, your heart matters more",
    "Building bridges one word at a time"
  ]
};

// Get a consistent saying based on the value (so it doesn't change on re-renders)
const getInspirationalSaying = (metricType: string, value: number): string => {
  // For empty state (0 values), show encouraging message
  if (value === 0) {
    return "Your journey begins with the first step";
  }
  
  const sayings = inspirationalSayings[metricType as keyof typeof inspirationalSayings] || inspirationalSayings.communication;
  const index = Math.floor(value / 25) % sayings.length; // Cycle through sayings based on value ranges
  return sayings[index];
};

interface MetricItemProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  metricType: 'communication' | 'empathy' | 'clarity' | 'respect';
  index: number;
  isAnimating: boolean;
}

function MetricItem({ label, value, icon, trend, metricType, index, isAnimating }: MetricItemProps) {
  const theme = getMetricTheme(metricType);
  const trendData = trend ? dashboardTheme.getTrendIcon(trend) : null;
  
  // Smooth value animation
  const [displayValue, setDisplayValue] = React.useState(0);
  const [hasReachedTarget, setHasReachedTarget] = React.useState(false);
  const [showCounterMorph, setShowCounterMorph] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const wasZero = displayValue === 0;
      setDisplayValue(value);
      // Trigger flourish animation when first reaching target
      if (wasZero && value > 0) {
        setTimeout(() => {
          setHasReachedTarget(true);
          setTimeout(() => setHasReachedTarget(false), 600);
        }, 1200); // Wait for progress bar to finish animating
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [value, displayValue]);
  
  // Trigger counter morph animation periodically
  React.useEffect(() => {
    if (isAnimating && value > 0) {
      const morphTimeout = setTimeout(() => {
        setShowCounterMorph(true);
        setTimeout(() => setShowCounterMorph(false), 600);
      }, index * 200); // Stagger the morphing
      
      return () => clearTimeout(morphTimeout);
    }
  }, [isAnimating, value, index]);

  return (
    <motion.div 
      className={`bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300 ${
        isAnimating ? 'breathing-glow breathing-glow-active' : 'breathing-glow'
      } ${isAnimating ? `cascade-wave stagger-${index + 1}` : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-start sm:items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Icon with sophisticated floating animation */}
          <motion.div 
            className={`p-3 rounded-xl bg-gradient-to-br ${theme.gradient} ${theme.shadow} relative ${
              isAnimating ? 'sophisticated-float sophisticated-float-active liquid-morph liquid-morph-active' : 'sophisticated-float liquid-morph'
            } ${isAnimating ? 'glass-shimmer glass-shimmer-active' : 'glass-shimmer'}`}
            whileHover={{ scale: 1.1 }}
            transition={{ 
              scale: { type: "spring", stiffness: 300 }
            }}
          >
            <div className="text-white">
              {icon}
            </div>
          </motion.div>
          
          <div>
            {/* Label with better typography */}
            <h3 className="card-title text-gray-800 dark:text-gray-200">
              {label}
            </h3>
            {/* Mini trend indicator - only show for non-zero values */}
            {trendData && value > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                {trend === 'up' && <TrendingUp className="h-3 w-3" style={{ color: trendData.color }} />}
                {trend === 'down' && <TrendingDown className="h-3 w-3" style={{ color: trendData.color }} />}
                {trend === 'stable' && <Minus className="h-3 w-3" style={{ color: trendData.color }} />}
                <span className="text-xs" style={{ color: trendData.color }}>
                  {trend === 'up' ? 'Improving' : trend === 'down' ? 'Needs attention' : 'Stable'}
                </span>
              </div>
            )}
            {/* Empty state indicator for 0 values */}
            {value === 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Awaiting data
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Animated percentage with morph effect */}
        <motion.div 
          className="flex items-center"
        >
          <motion.span 
            className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent ${
              isAnimating ? 'value-glow value-glow-active' : 'value-glow'
            } ${showCounterMorph ? 'counter-update' : ''} ${displayValue !== 0 ? 'number-type' : ''}`}
          >
            {displayValue}%
          </motion.span>
        </motion.div>
      </div>
      
      {/* Enhanced progress bar with sophisticated animations */}
      <div className="mb-3">
        <div className="relative h-4 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
          {/* Progress fill with gradient shift */}
          <motion.div
            className={`absolute inset-y-0 left-0 h-full rounded-full ${getProgressBarClasses(value)} ${
              isAnimating ? 'progress-pulse progress-pulse-active gradient-shift gradient-shift-active' : 'progress-pulse gradient-shift'
            } ${hasReachedTarget ? 'animate-[progress-complete_0.6s_ease-out]' : ''}`}
            initial={{ width: 0 }}
            animate={{ width: `${displayValue}%` }}
            transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1], delay: index * 0.1 }}
            style={{
              backgroundImage: value >= 80 
                ? 'linear-gradient(90deg, #10b981 0%, #34d399 50%, #10b981 100%)' 
                : value >= 60 
                ? 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #3b82f6 100%)'
                : value >= 40
                ? 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%)'
                : 'linear-gradient(90deg, #ef4444 0%, #f87171 50%, #ef4444 100%)',
              backgroundSize: '200% 100%',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: '0% 50%'
            }}
          >
            {/* Wave effect overlay */}
            <div
              className={`absolute inset-0 opacity-30 ${
                isAnimating ? 'progress-wave progress-wave-active' : 'progress-wave'
              }`}
              style={{
                backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                width: '50%'
              }}
            />
            
            {/* Subtle inner shadow for depth */}
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
              }}
            />
          </motion.div>
          
          {/* Progress track subtle pattern */}
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.02) 50%, transparent 100%)',
              backgroundSize: '20px 100%'
            }}
          />
        </div>
      </div>
      
      {/* Inspirational saying with better styling */}
      <motion.p 
        className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 italic text-center leading-relaxed"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        "{getInspirationalSaying(metricType, value)}"
      </motion.p>
    </motion.div>
  );
}

function CommunicationMetricsComponent() {
  const { isInitialLoading } = useDashboardLoading();
  const { 
    data, 
    isLoading, 
    error, 
    loadingState,
    isRefetching,
    refetch
  } = useCommunicationMetricsFromContext();
  
  // Use periodic animation hook for timed animation triggers
  const isAnimating = usePeriodicAnimation(12000); // Trigger animations every 12 seconds

  // TEMPORARY: Always show enhanced loading animation for demonstration
  // Remove this condition to see the enhanced loading animation
  if (true) {
    return (
      <UnifiedLoadingState 
        type="communication" 
        message="Analyzing conversation patterns..."
        variant="card"
      />
    );
  }

  // Don't show individual loading state during initial dashboard load
  if (isLoading && !data && !isInitialLoading) {
    return (
      <UnifiedLoadingState 
        type="communication" 
        message="Analyzing conversation patterns..."
        variant="card"
      />
    );
  }

  // Show placeholder during initial load
  if (isInitialLoading) {
    return null;
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full h-full"
      >
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 min-h-[500px] h-full flex flex-col p-4 sm:p-6 lg:p-8">
          <div className="flex items-center gap-4 mb-6 metric-card-header">
            <div className="metric-icon-container p-2.5 sm:p-3 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl">
              <MessageSquare className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h2 className="dashboard-heading text-gray-900 dark:text-gray-100">
                Communication Metrics
              </h2>
              <p className="caption text-gray-600 dark:text-gray-400 mt-1">
                Track your connection journey
              </p>
            </div>
          </div>
          
          <div className="flex-1 flex items-center justify-center">
            <DashboardAPIError
              error={error}
              onRetry={refetch}
              componentName="CommunicationMetrics"
              showDetails={process.env.NODE_ENV === 'development'}
            />
          </div>
        </div>
      </motion.div>
    );
  }
  
  if (!data) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full h-full"
      >
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 min-h-[500px] h-full flex flex-col p-4 sm:p-6 lg:p-8">
          <div className="flex items-center gap-4 mb-6 metric-card-header">
            <div className="metric-icon-container p-2.5 sm:p-3 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl">
              <MessageSquare className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h2 className="dashboard-heading text-gray-900 dark:text-gray-100">
                Communication Metrics
              </h2>
              <p className="caption text-gray-600 dark:text-gray-400 mt-1">
                Track your connection journey
              </p>
            </div>
          </div>
          
          <div className="flex-1 flex items-center justify-center">
            <motion.div 
              className="text-center text-muted-foreground"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <MessageSquare className="h-8 w-8 opacity-50" />
              </div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 leading-relaxed">No communication data yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">Complete your first session to see your metrics</p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Check if this is an empty state (new API format)
  const isEmpty = (data as any).isEmpty || false;
  const emptyStateMessage = (data as any).message || '';
  
  // Show empty state with 0% progress bars
  if (isEmpty) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full h-full"
      >
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 min-h-[500px] h-full flex flex-col p-4 sm:p-6 lg:p-8">
          {/* Header Section */}
          <div className="flex items-center gap-4 mb-6 metric-card-header">
            <div className="metric-icon-container p-2.5 sm:p-3 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl">
              <MessageSquare className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h2 className="dashboard-heading text-gray-900 dark:text-gray-100">
                Communication Metrics
              </h2>
              <p className="caption text-gray-600 dark:text-gray-400 mt-1">
                Track your connection journey
              </p>
            </div>
          </div>
          
          {/* Empty State Content */}
          <div className="flex-1 flex flex-col justify-center">
              <motion.div 
                className="text-center mb-8"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center">
                  <MessageSquare className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="card-title text-gray-700 dark:text-gray-300 mb-2">
                  Ready to begin your journey?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                  {emptyStateMessage || "Complete your first session to see your communication metrics"}
                </p>
              </motion.div>

              {/* Empty state metrics grid - shows 0% with proper styling */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
                <MetricItem
                  label="Clarity"
                  value={0}
                  icon={<MessageSquare className="h-5 w-5" />}
                  metricType="clarity"
                  index={0}
                  isAnimating={isAnimating}
                />
                <MetricItem
                  label="Empathy"
                  value={0}
                  icon={<Heart className="h-5 w-5" />}
                  metricType="empathy"
                  index={1}
                  isAnimating={isAnimating}
                />
                <MetricItem
                  label="Respect"
                  value={0}
                  icon={<Users className="h-5 w-5" />}
                  metricType="respect"
                  index={2}
                  isAnimating={isAnimating}
                />
                <MetricItem
                  label="Overall Communication"
                  value={0}
                  icon={<TrendingUp className="h-5 w-5" />}
                  metricType="communication"
                  index={3}
                  isAnimating={isAnimating}
                />
                <MetricItem
                  label="Active Listening"
                  value={0}
                  icon={<Ear className="h-5 w-5" />}
                  metricType="empathy"
                  index={4}
                  isAnimating={isAnimating}
                />
                <MetricItem
                  label="Self Expression"
                  value={0}
                  icon={<Volume2 className="h-5 w-5" />}
                  metricType="clarity"
                  index={5}
                  isAnimating={isAnimating}
                />
              </div>
              
              {/* Communication Insights Section for Empty State */}
              <motion.div 
                className="mt-6 space-y-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                {/* Section Title */}
                <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                  <h3 className="card-title text-gray-800 dark:text-gray-200">
                    Communication Insights
                  </h3>
                </div>
                
                {/* Encouraging Message for Empty State */}
                <motion.div 
                  className="p-4 rounded-lg border shadow-sm bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700"
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
                    Your communication journey awaits. Take the first step towards deeper connection and understanding.
                  </p>
                </motion.div>
              </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Calculate trends based on historical data (mock for now)
  const getTrend = (current: number): 'up' | 'down' | 'stable' | undefined => {
    // Don't show trends for empty state
    if (current === 0) return undefined;
    
    // This would normally compare with historical data
    if (current > 75) return 'up';
    if (current < 50) return 'down';
    return 'stable';
  };

  // Calculate if we're on target
  const isOnTarget = data.overall >= 60;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full h-full"
    >
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 min-h-[500px] h-full flex flex-col p-4 sm:p-6 lg:p-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="metric-icon-container p-2.5 sm:p-3 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl">
              <MessageSquare className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h2 className="dashboard-heading text-gray-900 dark:text-gray-100">
                Communication Metrics
              </h2>
              <p className="caption text-gray-600 dark:text-gray-400 mt-1">
                Track your connection journey
              </p>
            </div>
          </div>
          
          {/* On target indicator - only shows when metrics are good */}
          {isOnTarget && (
            <motion.div 
              className="flex items-center gap-2 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-4 py-2 sophisticated-float"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              transition={{ 
                initial: { duration: 0.3 },
                hover: { type: "spring", stiffness: 300 }
              }}
            >
              <span className="text-2xl">🎯</span>
              <span className="label text-gray-700 dark:text-gray-300">On target</span>
            </motion.div>
          )}
          
          {isRefetching && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="absolute top-4 right-4"
            >
              <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
            </motion.div>
          )}
        </div>
        
        {/* Content Section */}
        <div className="flex-1 flex flex-col justify-between">
            {/* Main metrics grid - responsive and compact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
              <MetricItem
                label="Clarity"
                value={Math.round(data.clarity)}
                icon={<MessageSquare className="h-5 w-5" />}
                trend={getTrend(data.clarity)}
                metricType="clarity"
                index={0}
                isAnimating={isAnimating}
              />
              <MetricItem
                label="Empathy"
                value={Math.round(data.empathy)}
                icon={<Heart className="h-5 w-5" />}
                trend={getTrend(data.empathy)}
                metricType="empathy"
                index={1}
                isAnimating={isAnimating}
              />
              <MetricItem
                label="Respect"
                value={Math.round(data.respect)}
                icon={<Users className="h-5 w-5" />}
                trend={getTrend(data.respect)}
                metricType="respect"
                index={2}
                isAnimating={isAnimating}
              />
              <MetricItem
                label="Overall Communication"
                value={Math.round(data.overall)}
                icon={<TrendingUp className="h-5 w-5" />}
                trend={getTrend(data.overall)}
                metricType="communication"
                index={3}
                isAnimating={isAnimating}
              />
              <MetricItem
                label="Active Listening"
                value={Math.round(data.listening || 0)}
                icon={<Ear className="h-5 w-5" />}
                trend={getTrend(data.listening || 0)}
                metricType="empathy"
                index={4}
                isAnimating={isAnimating}
              />
              <MetricItem
                label="Self Expression"
                value={Math.round(data.expression || 0)}
                icon={<Volume2 className="h-5 w-5" />}
                trend={getTrend(data.expression || 0)}
                metricType="clarity"
                index={5}
                isAnimating={isAnimating}
              />
            </div>
            
            {/* Communication Insights Section */}
            <motion.div 
              className="mt-6 space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              {/* Section Title */}
              <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  Communication Insights
                </h3>
              </div>
              
              {/* Dynamic Communication Message */}
              <motion.div 
                className={`p-4 rounded-lg border shadow-sm ${
                  data.overall >= 80 
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700' 
                    : data.overall >= 60 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
                }`}
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <p className={`text-sm font-medium leading-relaxed ${
                  data.overall >= 80 
                    ? 'text-emerald-800 dark:text-emerald-200' 
                    : data.overall >= 60 
                    ? 'text-blue-800 dark:text-blue-200'
                    : 'text-amber-800 dark:text-amber-200'
                }`}>
                  {data.overall >= 80 
                    ? "Your communication is exceptional! You're creating a safe space where both voices are heard and valued." 
                    : data.overall >= 60 
                    ? "You're building strong communication patterns. Keep nurturing this connection with patience and understanding."
                    : "Every conversation is a step forward. Focus on listening with your heart and speaking with kindness."}
                </p>
              </motion.div>
            </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// Export the component wrapped with error boundary
export function CommunicationMetricsUnified() {
  return (
    <DashboardErrorWrapper
      componentName="CommunicationMetrics"
      isolate={true}
    >
      <CommunicationMetricsComponent />
    </DashboardErrorWrapper>
  );
}