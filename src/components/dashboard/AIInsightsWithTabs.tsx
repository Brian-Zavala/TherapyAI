// src/components/dashboard/AIInsightsWithTabs.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { InsightDetailModal } from './InsightDetailModal';
import { getSupabaseClient } from '@/lib/supabase-singleton';
import { useSession } from 'next-auth/react';
import { logger } from '@/lib/logger';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { UnifiedLoadingState } from './UnifiedLoadingState';
import { dashboardTheme, getMetricTheme, getProgressBarClasses } from '@/lib/dashboard-theme';
import { emptyStateTheme, getEmptyStateClasses } from '@/lib/dashboard-empty-state-theme';
import { DashboardAPIError } from './DashboardAPIErrorBoundary';
import TherapyTypeTabs, { 
  useTherapyTypeTabs, 
  TherapyType, 
  THERAPY_TYPE_CONFIGS 
} from './TherapyTypeTabs';
import { useTherapyTypeData } from '@/hooks/useDashboardDataWithTherapyTypes';
import { 
  Brain, 
  Heart, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Calendar,
  BookOpen,
  Activity,
  Award,
  MessageSquare,
  Users,
  Lightbulb,
  ArrowRight,
  Clock,
  ChevronRight,
  RefreshCw,
  User
} from 'lucide-react';

// Therapy-specific insight categories and priorities
const THERAPY_INSIGHT_CONFIGS = {
  solo: {
    categories: ['mental-health', 'emotional', 'behavioral', 'progress'],
    priorities: {
      high: 'Self-care urgency',
      medium: 'Growth opportunity', 
      low: 'Personal enhancement'
    },
    emptyState: {
      title: "Your Personal Growth Journey Awaits",
      description: "Complete individual therapy sessions to receive personalized insights about your mental health and personal development.",
      cta: "Start Individual Session"
    }
  },
  couple: {
    categories: ['relationship', 'communication', 'emotional', 'progress'],
    priorities: {
      high: 'Relationship priority',
      medium: 'Strengthen bond',
      low: 'Enhance connection'
    },
    emptyState: {
      title: "Strengthen Your Relationship Together",
      description: "Complete couples therapy sessions to receive insights about your communication patterns and relationship dynamics.",
      cta: "Start Couples Session"
    }
  },
  family: {
    categories: ['relationship', 'communication', 'behavioral', 'progress'],
    priorities: {
      high: 'Family harmony focus',
      medium: 'Family improvement',
      low: 'Family enhancement'
    },
    emptyState: {
      title: "Build Stronger Family Bonds",
      description: "Complete family therapy sessions to receive insights about family dynamics and communication patterns.",
      cta: "Start Family Session"
    }
  }
};

const categoryIcons = {
  communication: MessageSquare,
  emotional: Heart,
  behavioral: Activity,
  'mental-health': Brain,
  relationship: Users,
  progress: TrendingUp
};

const categoryMapping = {
  communication: 'communication',
  emotional: 'empathy',
  behavioral: 'support',
  'mental-health': 'progress',
  relationship: 'empathy',
  progress: 'progress'
} as const;

const priorityConfig = {
  high: {
    background: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    icon: AlertCircle
  },
  medium: {
    background: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    icon: Clock
  },
  low: {
    background: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
    icon: CheckCircle2
  }
};

interface InsightCardProps {
  insight: any;
  therapyType: TherapyType;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function MetricDisplay({ label, value, unit, trend }: { label: string; value: number; unit?: string; trend?: string }) {
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : '';
  
  return (
    <div className="bg-white/20 backdrop-blur-md rounded-lg p-3 border border-white/30">
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white text-center">
        {value}{unit || '%'} <span className={`text-xs sm:text-sm ${trendColor}`}>{trendIcon}</span>
      </p>
    </div>
  );
}

function InsightCard({ insight, therapyType, isExpanded, onToggleExpand, onViewDetails }: InsightCardProps & { onViewDetails: () => void }) {
  const CategoryIcon = categoryIcons[insight.category] || Brain;
  const priorityStyles = priorityConfig[insight.priority] || priorityConfig.medium;
  const PriorityIcon = priorityStyles.icon;
  const config = THERAPY_INSIGHT_CONFIGS[therapyType];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`rounded-xl border p-3 sm:p-4 transition-all duration-200 hover:shadow-md cursor-pointer ${priorityStyles.background} ${priorityStyles.border}`}
      onClick={onViewDetails}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm`}>
            <CategoryIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">{insight.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={`text-xs ${priorityStyles.text} border-current`}>
                <PriorityIcon className="h-3 w-3 mr-1" />
                {config.priorities[insight.priority]}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {insight.category.replace('-', ' ')}
              </Badge>
            </div>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </Button>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
        {insight.description}
      </p>

      {/* Display metrics if available */}
      {insight.metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {Object.entries(insight.metrics).map(([key, value]) => {
            if (typeof value === 'number') {
              const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              return (
                <MetricDisplay 
                  key={key}
                  label={label}
                  value={value}
                  trend={key === 'improvement' || key === 'improvementRate' ? 'up' : undefined}
                />
              );
            }
            return null;
          })}
        </div>
      )}

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {insight.actionItems && insight.actionItems.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Personalized Action Plan
                </h5>
                <ul className="space-y-2">
                  {insight.actionItems.map((item: string, index: number) => (
                    <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2 p-2 bg-white/10 backdrop-blur-sm rounded-lg">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {insight.exercise && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h5 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Recommended Exercise
                </h5>
                <p className="font-semibold text-sm text-blue-700 dark:text-blue-300">{insight.exercise.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{insight.exercise.description}</p>
                <div className="flex gap-4 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {insight.exercise.duration}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    {insight.exercise.frequency}
                  </Badge>
                </div>
              </div>
            )}

            {insight.resources && insight.resources.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Recommended Resources
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {insight.resources.map((resource: any, index: number) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="p-3 h-auto flex flex-col items-start text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => {
                        // Handle resource click
                        if (resource.link) {
                          window.location.href = resource.link;
                        }
                      }}
                    >
                      <div className="w-full">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{resource.title}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{resource.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {resource.type}
                          </Badge>
                          {resource.duration && (
                            <Badge variant="outline" className="text-xs">
                              {resource.duration}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function EmptyState({ therapyType }: { therapyType: TherapyType }) {
  const config = THERAPY_INSIGHT_CONFIGS[therapyType];
  const typeConfig = THERAPY_TYPE_CONFIGS[therapyType];
  const Icon = typeConfig.icon;
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
          {config.emptyState.title}
        </h3>
        <p className={classes.description}>
          {config.emptyState.description}
        </p>
      </div>
      
      <Button 
        className={classes.button}
        onClick={() => window.location.href = '/dashboard/therapy'}
      >
        {config.emptyState.cta}
      </Button>
    </motion.div>
  );
}

export default function AIInsightsWithTabs() {
  const { availableTypes, activeType, setActiveType } = useTherapyTypeTabs('insights');
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [realTimeInsights, setRealTimeInsights] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const { data: session } = useSession();
  
  // Get data for the active therapy type
  const { 
    aiInsights, 
    sessionCount, 
    isLoading, 
    error, 
    refetch 
  } = useTherapyTypeData(activeType, activeSessionId);
  
  // Subscribe to real-time insights updates
  useEffect(() => {
    if (!activeSessionId) return;
    
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`insights-${activeSessionId}`)
      .on('broadcast', { event: 'insights-update' }, (payload) => {
        logger.info('Received real-time insights update', {
          sessionId: activeSessionId,
          insightCount: payload.payload.insights?.length
        });
        setRealTimeInsights(payload.payload.insights || []);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSessionId]);
  
  // Check for active session
  useEffect(() => {
    const checkActiveSession = async () => {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch(`/api/sessions/active?userId=${session.user.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.session?.id) {
            setActiveSessionId(data.session.id);
          }
        }
      } catch (error) {
        console.error('Failed to check active session:', error);
      }
    };
    
    checkActiveSession();
    // Check every 30 seconds
    const interval = setInterval(checkActiveSession, 30000);
    
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  // Use real-time insights if available, otherwise use API data
  const generateInsights = () => {
    // If we have real-time insights, use those
    if (realTimeInsights.length > 0) {
      const avgProgress = realTimeInsights.reduce((acc, insight) => {
        const metrics = insight.metrics || {};
        const score = metrics.score || metrics.overallScore || 
                      metrics.currentStressLevel || metrics.cohesionScore || 75;
        return acc + score;
      }, 0) / realTimeInsights.length;
      
      return {
        insights: realTimeInsights,
        summary: {
          overallProgress: Math.round(avgProgress),
          primaryFocus: realTimeInsights[0]?.title.split(':')[0] || 'Personal Growth',
          nextMilestone: `Continue progress in ${realTimeInsights.find(i => i.priority === 'high')?.category || 'all areas'}`,
          improvementRate: 15,
          sessionsAnalyzed: sessionCount || 0,
          isRealTime: true
        }
      };
    }
    
    // CRITICAL: Return API data directly, no fallback data
    return aiInsights || { insights: [], summary: null };
  };

  const insights = generateInsights();

  const hasData = insights && insights.insights && insights.insights.length > 0;

  // Get session counts for tab badges
  const sessionCounts = availableTypes.reduce((acc, type) => {
    acc[type] = 0; // This would come from the session counts query
    return acc;
  }, {} as Record<TherapyType, number>);

  const handleInsightToggle = (insightId: string) => {
    setExpandedInsight(expandedInsight === insightId ? null : insightId);
  };

  return (
    <Card className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-xl h-full flex flex-col">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="w-full text-center">
            <CardTitle className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 dark:text-white">
              AI-Powered Therapy Analytics
            </CardTitle>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600 dark:text-gray-400 mt-1 lg:mt-2">
              Data-driven insights to accelerate your growth and strengthen relationships
            </p>
          </div>
          
          {error && (
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
            errors={{ [activeType]: error || undefined }}
            variant="default"
            showCounts={true}
            showDescriptions={true}
          />
        </div>

        {/* Progress Summary */}
        {hasData && insights.summary && (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {insights.summary.primaryFocus}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Next milestone: {insights.summary.nextMilestone}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {insights.summary.overallProgress}%
                </div>
                <div className="text-xs text-gray-500">Overall Health</div>
              </div>
            </div>
            <Progress 
              value={insights.summary.overallProgress} 
              className="h-2 bg-white dark:bg-gray-700"
            />
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                {insights.summary.isRealTime ? (
                  <>
                    <Activity className="h-4 w-4 text-green-600 dark:text-green-400 animate-pulse" />
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                      Live Session Data
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {insights.summary.improvementRate}% improvement this month
                    </span>
                  </>
                )}
              </div>
              {insights.summary.sessionsAnalyzed > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {insights.summary.isRealTime ? 'Real-time' : `Based on ${insights.summary.sessionsAnalyzed} sessions`}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <UnifiedLoadingState 
              key="loading"
              type="insights" 
              message={`Analyzing your ${THERAPY_TYPE_CONFIGS[activeType].label.toLowerCase()} therapy insights...`}
              variant="card"
            />
          ) : error ? (
            <DashboardAPIError 
              key="error"
              error={error}
              onRetry={refetch}
              context={`AI insights for ${activeType} therapy`}
            />
          ) : !hasData ? (
            <EmptyState key="empty" therapyType={activeType} />
          ) : (
            <motion.div
              key={`insights-${activeType}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {insights.insights.map((insight: any) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  therapyType={activeType}
                  isExpanded={expandedInsight === insight.id}
                  onToggleExpand={() => handleInsightToggle(insight.id)}
                  onViewDetails={() => {
                    setSelectedInsight(insight);
                    setIsModalOpen(true);
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Session Count Badge */}
        {sessionCount > 0 && (
          <div className="mt-6 text-center">
            <Badge variant="secondary" className="text-xs">
              Based on {sessionCount} completed {activeType} session{sessionCount > 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </CardContent>
      
      {/* Insight Detail Modal */}
      <InsightDetailModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedInsight(null);
        }}
        insight={selectedInsight}
        therapyType={activeType}
      />
    </Card>
  );
}