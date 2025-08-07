/**
 * Unified Metric Card Component
 * Reusable component for displaying real-time metrics with consistent styling
 * Supports various metric types and real-time updates
 */

'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import '@/styles/dashboard-modern.css';

interface UnifiedMetricCardProps {
  // Core props
  title: string;
  value: number | string;
  previousValue?: number | string;
  unit?: string;
  
  // Visual props
  icon?: React.ElementType;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  
  // State props
  isLoading?: boolean;
  error?: string | null;
  isRealTime?: boolean;
  lastUpdate?: Date | null;
  confidence?: number;
  
  // Display options
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  progressMax?: number;
  sparklineData?: number[];
  
  // Actions
  onRefresh?: () => void;
  onClick?: () => void;
  
  // Custom styling
  className?: string;
  gradientFrom?: string;
  gradientTo?: string;
}

export function UnifiedMetricCard({
  title,
  value,
  previousValue,
  unit = '',
  icon: Icon,
  iconColor = 'bg-primary',
  trend,
  trendValue,
  isLoading = false,
  error,
  isRealTime = false,
  lastUpdate,
  confidence,
  size = 'medium',
  showProgress = false,
  progressMax = 100,
  sparklineData = [],
  onRefresh,
  onClick,
  className,
  gradientFrom = '#6366f1',
  gradientTo = '#8b5cf6'
}: UnifiedMetricCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);

  // Animate value changes
  useEffect(() => {
    if (previousValue !== undefined && previousValue !== value) {
      setIsUpdating(true);
      const timeout = setTimeout(() => {
        setIsUpdating(false);
        setDisplayValue(value);
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setDisplayValue(value);
    }
  }, [value, previousValue]);

  // Calculate trend if not provided
  const calculatedTrend = trend || (
    previousValue !== undefined && typeof value === 'number' && typeof previousValue === 'number'
      ? value > previousValue ? 'up' : value < previousValue ? 'down' : 'neutral'
      : 'neutral'
  );

  // Calculate trend value if not provided
  const calculatedTrendValue = trendValue !== undefined ? trendValue : (
    typeof value === 'number' && typeof previousValue === 'number'
      ? ((value - previousValue) / previousValue) * 100
      : 0
  );

  // Size classes - Mobile-first responsive
  const sizeClasses = {
    small: {
      card: 'p-2 sm:p-3',
      icon: 'w-6 h-6 sm:w-8 sm:h-8',
      iconSvg: 'w-3 h-3 sm:w-4 sm:h-4',
      title: 'text-xs sm:text-sm',
      value: 'text-base sm:text-lg md:text-xl',
      trend: 'text-xs'
    },
    medium: {
      card: 'p-3 sm:p-4 md:p-5',
      icon: 'w-8 h-8 sm:w-10 sm:h-10',
      iconSvg: 'w-4 h-4 sm:w-5 sm:h-5',
      title: 'text-xs sm:text-sm md:text-base',
      value: 'text-lg sm:text-2xl md:text-3xl',
      trend: 'text-xs sm:text-sm'
    },
    large: {
      card: 'p-4 sm:p-5 md:p-6',
      icon: 'w-10 h-10 sm:w-12 sm:h-12',
      iconSvg: 'w-5 h-5 sm:w-6 sm:h-6',
      title: 'text-sm sm:text-base md:text-lg',
      value: 'text-xl sm:text-3xl md:text-4xl',
      trend: 'text-sm sm:text-base'
    }
  };

  const currentSize = sizeClasses[size];

  // Generate sparkline path
  const generateSparklinePath = () => {
    if (sparklineData.length < 2) return '';
    
    const width = 80;
    const height = 30;
    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const range = max - min || 1;
    
    const points = sparklineData.map((val, i) => {
      const x = (i / (sparklineData.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  };

  if (error) {
    return (
      <Card className={cn('metric-card', currentSize.card, className)}>
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="mt-2 text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      <Card 
        className={cn(
          'metric-card',
          currentSize.card,
          onClick && 'cursor-pointer',
          isUpdating && 'updating',
          className
        )}
        onClick={onClick}
      >
        <div className="metric-header">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
            {Icon && (
              <div 
                className={cn('metric-icon flex-shrink-0', currentSize.icon, iconColor)}
                style={{
                  background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`
                }}
              >
                <Icon className={cn('text-white', currentSize.iconSvg)} />
              </div>
            )}
            <div className="flex-1 text-center sm:text-left">
              <h3 className={cn('metric-label', currentSize.title)}>{title}</h3>
              {isRealTime && (
                <div className="flex items-center gap-2 mt-1">
                  {lastUpdate ? (
                    <Badge variant="outline" className="realtime-indicator">
                      <Wifi className="w-3 h-3 mr-1" />
                      <span className="text-xs">
                        {new Date().getTime() - lastUpdate.getTime() < 5000 
                          ? 'Live' 
                          : `${Math.round((new Date().getTime() - lastUpdate.getTime()) / 1000)}s ago`
                        }
                      </span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      <WifiOff className="w-3 h-3 mr-1" />
                      <span className="text-xs">Offline</span>
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {sparklineData.length > 0 && (
            <div className="communication-metric-chart">
              <svg className="sparkline" viewBox="0 0 80 30">
                <path
                  d={generateSparklinePath()}
                  fill="none"
                  stroke={gradientFrom}
                  strokeWidth="2"
                />
              </svg>
            </div>
          )}
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="skeleton skeleton-metric" />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={displayValue}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  'metric-value text-center',
                  currentSize.value,
                  isUpdating && 'metric-value-animated updating'
                )}
                data-trend={calculatedTrend}
              >
                {displayValue}{unit}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Trend Indicator */}
          {calculatedTrend !== 'neutral' && calculatedTrendValue !== 0 && (
            <div className={cn('flex items-center gap-2 mt-2', currentSize.trend)}>
              {calculatedTrend === 'up' ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">
                    +{Math.abs(calculatedTrendValue).toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <span className="text-red-500">
                    -{Math.abs(calculatedTrendValue).toFixed(1)}%
                  </span>
                </>
              )}
            </div>
          )}

          {/* Progress Bar */}
          {showProgress && typeof value === 'number' && (
            <div className="metric-progress mt-3">
              <motion.div
                className="metric-progress-bar"
                initial={{ width: 0 }}
                animate={{ width: `${(value / progressMax) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          )}

          {/* Confidence Indicator */}
          {confidence !== undefined && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="insight-confidence">
                <span className="text-xs text-muted-foreground">Confidence</span>
                <div className="insight-confidence-bar">
                  <div 
                    className="insight-confidence-fill" 
                    style={{ width: `${confidence}%` }}
                  />
                </div>
                <span className="text-xs font-medium">{confidence}%</span>
              </div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// Preset configurations for common metric types
export const MetricCardPresets = {
  communication: {
    iconColor: 'bg-blue-500',
    gradientFrom: '#3b82f6',
    gradientTo: '#2563eb',
    showProgress: true
  },
  emotional: {
    iconColor: 'bg-pink-500',
    gradientFrom: '#ec4899',
    gradientTo: '#db2777',
    showProgress: true
  },
  engagement: {
    iconColor: 'bg-green-500',
    gradientFrom: '#10b981',
    gradientTo: '#059669',
    showProgress: true
  },
  stress: {
    iconColor: 'bg-orange-500',
    gradientFrom: '#f97316',
    gradientTo: '#ea580c',
    showProgress: true
  },
  progress: {
    iconColor: 'bg-purple-500',
    gradientFrom: '#8b5cf6',
    gradientTo: '#7c3aed',
    showProgress: true
  }
};