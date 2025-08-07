// src/components/dashboard/CommunicationMetricsWithTabs.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UnifiedLoadingState } from './UnifiedLoadingState';
import { dashboardTheme, getMetricTheme, getProgressBarClasses } from '@/lib/dashboard-theme';
import { emptyStateTheme, getEmptyStateClasses } from '@/lib/dashboard-empty-state-theme';
import { DashboardAPIError } from './DashboardAPIErrorBoundary';
import { DashboardErrorWrapper } from './DashboardErrorBoundary';
import TherapyTypeTabs, { 
  useTherapyTypeTabs, 
  TherapyType, 
  THERAPY_TYPE_CONFIGS 
} from './TherapyTypeTabs';
import { useTherapyTypeData } from '@/hooks/useDashboardDataWithTherapyTypes';
import { 
  MessageSquare, 
  Heart, 
  Users, 
  Volume2,
  Ear,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Brain
} from 'lucide-react';

// Therapy-specific metric configurations
const THERAPY_METRIC_CONFIGS = {
  solo: [
    { name: "Self-awareness", icon: Brain, type: 'clarity' as const, description: "Understanding your thoughts and emotions" },
    { name: "Emotional Regulation", icon: Heart, type: 'empathy' as const, description: "Managing and expressing emotions healthily" },
    { name: "Personal Growth", icon: TrendingUp, type: 'respect' as const, description: "Progress in personal development goals" },
    { name: "Coping Skills", icon: CheckCircle2, type: 'communication' as const, description: "Healthy strategies for handling stress" }
  ],
  couple: [
    { name: "Active Listening", icon: Ear, type: 'clarity' as const, description: "Understanding your partner's perspective" },
    { name: "Expressing Needs", icon: MessageSquare, type: 'empathy' as const, description: "Communicating your feelings clearly" },
    { name: "Conflict Resolution", icon: Users, type: 'respect' as const, description: "Working through disagreements constructively" },
    { name: "Emotional Support", icon: Heart, type: 'communication' as const, description: "Providing comfort and understanding" }
  ],
  family: [
    { name: "Family Communication", icon: MessageSquare, type: 'clarity' as const, description: "Open dialogue among family members" },
    { name: "Role Definition", icon: Users, type: 'empathy' as const, description: "Understanding each person's responsibilities" },
    { name: "Conflict Management", icon: Volume2, type: 'respect' as const, description: "Resolving family disputes peacefully" },
    { name: "Family Bonding", icon: Heart, type: 'communication' as const, description: "Strengthening family connections" }
  ]
};

// Inspirational sayings for different therapy types
const THERAPY_INSPIRATIONAL_SAYINGS = {
  solo: {
    clarity: ["Self-understanding is the first step to growth", "Know yourself, trust yourself"],
    empathy: ["Be gentle with yourself", "Self-compassion heals from within"],
    respect: ["Honor your journey", "Every step forward matters"],
    communication: ["Your inner voice deserves to be heard", "Express yourself with kindness"]
  },
  couple: {
    clarity: ["Clear words build strong bridges", "Understanding begins with clarity"],
    empathy: ["Feel deeply, love completely", "Understanding hearts heal together"],
    respect: ["Honor each other's journey", "Respect nurtures lasting love"],
    communication: ["Every conversation is a new beginning", "Connection grows through communication"]
  },
  family: {
    clarity: ["Clear communication strengthens family bonds", "Understanding each other builds unity"],
    empathy: ["Every family member's feelings matter", "Empathy creates lasting family connections"],
    respect: ["Respect within the family creates harmony", "Honor each family member's unique perspective"],
    communication: ["Family conversations build lifelong bonds", "Communication is the heart of family unity"]
  }
};

interface MetricItemProps {
  name: string;
  value: number;
  icon: React.ComponentType<any>;
  type: 'communication' | 'empathy' | 'clarity' | 'respect';
  description: string;
  therapyType: TherapyType;
  index: number;
  isAnimating: boolean;
}

function MetricItem({ name, value, icon: Icon, type, description, therapyType, index, isAnimating }: MetricItemProps) {
  const theme = getMetricTheme(type);
  const [displayValue, setDisplayValue] = useState(0);
  const [hasReachedTarget, setHasReachedTarget] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      const wasZero = displayValue === 0;
      setDisplayValue(value);
      if (wasZero && value > 0) {
        setTimeout(() => {
          setHasReachedTarget(true);
          setTimeout(() => setHasReachedTarget(false), 600);
        }, 1200);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [value, displayValue]);

  // Get therapy-specific inspirational saying
  const getSaying = () => {
    const sayings = THERAPY_INSPIRATIONAL_SAYINGS[therapyType]?.[type] || 
                   THERAPY_INSPIRATIONAL_SAYINGS.couple[type];
    if (value === 0) {
      return "Your journey begins with the first step";
    }
    const index = Math.floor(value / 25) % sayings.length;
    return sayings[index];
  };

  return (
    <motion.div 
      className={`bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-3 sm:p-4 md:p-5 border border-gray-100 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300 ${
        isAnimating ? 'breathing-glow breathing-glow-active' : 'breathing-glow'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ y: -2 }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className={`p-2 rounded-lg ${theme.background} flex-shrink-0`}>
            <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${theme.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white text-center sm:text-left">{name}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center sm:text-left">{description}</p>
          </div>
        </div>
        
        <div className="text-center sm:text-right w-full sm:w-auto">
          <motion.div 
            className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white"
            animate={hasReachedTarget ? { 
              scale: [1, 1.2, 1], 
              color: ['#000', theme.primary, '#000'] 
            } : {}}
            transition={{ duration: 0.6 }}
          >
            {displayValue}%
          </motion.div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <motion.div
            className={getProgressBarClasses(type)}
            initial={{ width: 0 }}
            animate={{ width: `${displayValue}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Inspirational Message */}
      <div className="text-xs text-gray-600 dark:text-gray-300 italic leading-relaxed">
        "{getSaying()}"
      </div>
    </motion.div>
  );
}

function EmptyState({ therapyType }: { therapyType: TherapyType }) {
  const config = THERAPY_TYPE_CONFIGS[therapyType];
  const Icon = config.icon;
  const classes = getEmptyStateClasses();

  return (
    <motion.div
      initial={emptyStateTheme.animations.container.initial}
      animate={emptyStateTheme.animations.container.animate}
      transition={emptyStateTheme.animations.container.transition}
      className={classes.container}
    >
      <div className="mb-8">
        <motion.div 
          className={classes.iconWrapper}
          whileHover={emptyStateTheme.animations.icon.hover}
          transition={emptyStateTheme.animations.icon.transition}
        >
          <Icon className={classes.icon} />
        </motion.div>
        <h3 className={classes.title}>
          No {config.label} Sessions Yet
        </h3>
        <p className={classes.description}>
          Complete your first {config.label.toLowerCase()} therapy session to see detailed communication metrics and insights.
        </p>
      </div>
      
      <Button 
        className={classes.button}
        onClick={() => window.location.href = '/dashboard/therapy'}
      >
        Start {config.label} Session
      </Button>
    </motion.div>
  );
}

export default function CommunicationMetricsWithTabs() {
  return (
    <DashboardErrorWrapper componentName="CommunicationMetrics">
      <CommunicationMetricsContent />
    </DashboardErrorWrapper>
  );
}

function CommunicationMetricsContent() {
  const { availableTypes, activeType, setActiveType } = useTherapyTypeTabs('communication');
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Get data for the active therapy type
  const { 
    communicationMetrics, 
    sessionCount, 
    isLoading, 
    error, 
    refetch 
  } = useTherapyTypeData(activeType);

  // Periodic animation trigger
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 4000);
    }, 8000);
    
    return () => clearInterval(interval);
  }, []);

  // Get session counts for tab badges - use actual sessionCount from hook
  const sessionCounts = availableTypes.reduce((acc, type) => {
    // For now, use the current session count for the active type
    // TODO: Implement per-type session counts if needed
    acc[type] = type === activeType ? sessionCount : 0;
    return acc;
  }, {} as Record<TherapyType, number>);

  const metricConfigs = THERAPY_METRIC_CONFIGS[activeType];
  const hasData = communicationMetrics && Array.isArray(communicationMetrics) && communicationMetrics.length > 0;

  return (
    <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-white/20 dark:border-gray-700/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Communication Metrics
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Track your communication skills across different therapy types
            </p>
          </div>
          
          {error && error.name !== 'AbortError' && (
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          )}
        </div>

        {/* Therapy Type Tabs */}
        <div className="therapy-type-tabs mt-4">
          <TherapyTypeTabs
            availableTypes={availableTypes}
            activeType={activeType}
            onTypeChange={setActiveType}
            sessionCounts={sessionCounts}
            loading={{ [activeType]: isLoading }}
            errors={{ [activeType]: (error && error.name !== 'AbortError') ? error : undefined }}
            variant="default"
            showCounts={true}
            showDescriptions={true}
          />
        </div>
      </CardHeader>

      <CardContent>
        <AnimatePresence mode="wait">
          {isLoading ? (
            <UnifiedLoadingState 
              key="loading"
              type="metrics" 
              message={`Loading ${THERAPY_TYPE_CONFIGS[activeType].label.toLowerCase()} communication metrics...`}
              variant="card"
            />
          ) : error && error.name !== 'AbortError' ? (
            <DashboardAPIError 
              key="error"
              error={error}
              onRetry={refetch}
              context={`Communication metrics for ${activeType} therapy`}
            />
          ) : !hasData ? (
            <EmptyState key="empty" therapyType={activeType} />
          ) : (
            <motion.div
              key={`metrics-${activeType}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {metricConfigs.map((config, index) => {
                const metric = communicationMetrics.find((m: any) => m.name === config.name);
                return (
                  <MetricItem
                    key={`${config.name}-${activeType}`}
                    name={config.name}
                    value={metric?.value || 0}
                    icon={config.icon}
                    type={config.type}
                    description={config.description}
                    therapyType={activeType}
                    index={index}
                    isAnimating={isAnimating}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Session Count Badge */}
        {sessionCount > 0 && (
          <div className="mt-4 text-center">
            <Badge variant="secondary" className="text-xs">
              Based on {sessionCount} completed {activeType} session{sessionCount > 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}