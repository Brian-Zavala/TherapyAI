// src/components/dashboard/RelationshipProgressWithTabs.tsx
"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Heart,
  MessageSquare,
  Shield,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Loader2,
  Users,
  Zap,
  RefreshCw,
  UserCheck,
  Home
} from 'lucide-react';

// Therapy-specific progress configurations
const THERAPY_PROGRESS_CONFIGS = {
  couple: {
    metrics: [
      { 
        key: 'closenessScore', 
        label: 'Emotional Intimacy', 
        icon: <Heart className="h-5 w-5" />, 
        type: 'empathy' as const,
        description: 'Your emotional connection and vulnerability with each other'
      },
      { 
        key: 'communicationScore', 
        label: 'Communication Quality', 
        icon: <MessageSquare className="h-5 w-5" />, 
        type: 'communication' as const,
        description: 'How effectively you express needs and listen to each other'
      },
      { 
        key: 'conflictResolution', 
        label: 'Conflict Resolution', 
        icon: <Shield className="h-5 w-5" />, 
        type: 'support' as const,
        description: 'Your ability to work through disagreements constructively'
      },
      { 
        key: 'emotionalSupport', 
        label: 'Mutual Support', 
        icon: <UserCheck className="h-5 w-5" />, 
        type: 'progress' as const,
        description: 'How well you provide comfort and encouragement to each other'
      }
    ],
    title: 'Relationship Progress',
    subtitle: 'Track your journey together as a couple',
    emptyState: {
      title: "Your Relationship Journey Awaits",
      description: "Complete couples therapy sessions to track your relationship progress and see how your bond strengthens over time.",
      cta: "Start Couples Session"
    }
  },
  family: {
    metrics: [
      { 
        key: 'closenessScore', 
        label: 'Family Bonding', 
        icon: <Home className="h-5 w-5" />, 
        type: 'empathy' as const,
        description: 'The strength of emotional connections within your family'
      },
      { 
        key: 'communicationScore', 
        label: 'Family Communication', 
        icon: <MessageSquare className="h-5 w-5" />, 
        type: 'communication' as const,
        description: 'How effectively family members express needs and listen'
      },
      { 
        key: 'conflictResolution', 
        label: 'Harmony & Resolution', 
        icon: <Shield className="h-5 w-5" />, 
        type: 'support' as const,
        description: 'Your family\'s ability to resolve conflicts peacefully'
      },
      { 
        key: 'emotionalSupport', 
        label: 'Family Support', 
        icon: <Users className="h-5 w-5" />, 
        type: 'progress' as const,
        description: 'How well family members support each other emotionally'
      }
    ],
    title: 'Family Progress',
    subtitle: 'Track your family\'s growth and harmony',
    emptyState: {
      title: "Strengthen Your Family Bonds",
      description: "Complete family therapy sessions to track your family's progress and see how relationships within your family strengthen.",
      cta: "Start Family Session"
    }
  }
};

// Therapeutic sayings adapted for different therapy types
const THERAPEUTIC_SAYINGS = {
  couple: {
    high: [
      "Outstanding progress! Your relationship is thriving. Keep nurturing this beautiful growth!",
      "Amazing work! You've built something truly special together. Celebrate these victories!",
      "Incredible journey! Your commitment to each other shines brightly. Keep this momentum!",
      "Exceptional progress! You're both showing what dedication and love can achieve together!"
    ],
    medium: [
      "Good progress! You're building something meaningful. Consistency is your superpower!",
      "Steady growth! Every step forward matters. Keep nurturing your connection!",
      "Great momentum! You're on a beautiful path together. Trust the process!",
      "Wonderful progress! Small daily choices are creating lasting change. Keep going!"
    ],
    low: [
      "Every journey starts somewhere. Small, consistent efforts lead to big changes over time.",
      "New beginnings are full of possibility. Each moment is a chance to grow closer.",
      "Like a garden, relationships flourish with patience, care, and gentle attention.",
      "Gentle waves create the deepest changes. Your journey is just beginning to unfold."
    ]
  },
  family: {
    high: [
      "Outstanding family progress! Your bonds are stronger than ever. Celebrate this harmony!",
      "Amazing family work! You've created a loving, supportive home environment together.",
      "Incredible family journey! Your commitment to each other creates lasting happiness.",
      "Exceptional family growth! You're showing what unity and understanding can achieve."
    ],
    medium: [
      "Good family progress! You're building stronger connections every day. Keep it up!",
      "Steady family growth! Each conversation brings you closer together as a unit.",
      "Great family momentum! You're creating positive traditions and memories together.",
      "Wonderful family development! Your efforts are building a foundation of love and trust."
    ],
    low: [
      "Every family's journey starts with small steps. Your commitment to growth matters immensely.",
      "New family beginnings bring hope. Each interaction is a chance to strengthen your bonds.",
      "Like a tree, families grow strong roots through patience, care, and understanding.",
      "Gentle changes create the deepest family connections. Your journey is just beginning."
    ]
  }
};

interface ProgressMetricProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  metricType: 'progress' | 'empathy' | 'communication' | 'support';
  description?: string;
}

function ProgressMetric({ label, value, icon, metricType, description }: ProgressMetricProps) {
  const theme = getMetricTheme(metricType);
  const [displayValue, setDisplayValue] = React.useState(0);
  
  React.useEffect(() => {
    const timer = setTimeout(() => setDisplayValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  // Determine achievement level
  const getAchievementBadge = (val: number) => {
    if (val >= 90) return { label: 'Excellent', icon: Award, color: 'text-yellow-600' };
    if (val >= 75) return { label: 'Strong', icon: Sparkles, color: 'text-purple-600' };
    if (val >= 60) return { label: 'Good', icon: TrendingUp, color: 'text-blue-600' };
    return null;
  };

  const achievement = getAchievementBadge(value);

  return (
    <motion.div 
      className="relative group h-full"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
    >
      <div 
        className={`h-full flex flex-col gap-3 p-4 rounded-xl border transition-all duration-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:${theme.shadow} hover:border-opacity-60 cursor-pointer min-h-[140px]`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              className={`p-3 rounded-xl bg-gradient-to-br ${theme.gradient} ${theme.shadow}`}
              whileHover={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-white">
                {icon}
              </div>
            </motion.div>
            
            <div>
              <span className={`${dashboardTheme.typography.label} text-gray-800 dark:text-gray-200`}>
                {label}
              </span>
              {description && (
                <p className={`${dashboardTheme.typography.caption} text-gray-600 dark:text-gray-400 mt-0.5`}>
                  {description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <motion.span 
              className="text-lg font-bold text-gray-900 dark:text-gray-100 min-w-[3rem] text-right"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {displayValue}%
            </motion.span>
            
            {achievement && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-1"
              >
                <achievement.icon className={`h-4 w-4 ${achievement.color}`} />
                <span className={`text-xs font-medium ${achievement.color}`}>
                  {achievement.label}
                </span>
              </motion.div>
            )}
          </div>
        </div>
        
        {/* Progress bar visualization - pushed to bottom with mt-auto */}
        <div className="relative mt-auto">
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-full h-3" />
          <motion.div
            className={`absolute inset-y-0 left-0 h-3 rounded-full ${getProgressBarClasses(value)}`}
            initial={{ width: 0 }}
            animate={{ width: `${displayValue}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            {/* Pulse effect for high values */}
            {value >= 80 && (
              <motion.div
                className="absolute inset-0 rounded-full bg-white/30"
                animate={{ opacity: [0, 0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ therapyType }: { therapyType: Exclude<TherapyType, 'solo'> }) {
  const config = THERAPY_PROGRESS_CONFIGS[therapyType];
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

export default function RelationshipProgressWithTabs() {
  const { availableTypes, activeType, setActiveType } = useTherapyTypeTabs('progress');
  const [therapeuticSaying, setTherapeuticSaying] = React.useState<string>("");
  
  // Get data for the active therapy type
  const { 
    relationshipProgress, 
    sessionCount, 
    isLoading, 
    error, 
    refetch 
  } = useTherapyTypeData(activeType);

  // Use real data from the hook
  const data = relationshipProgress;
  const hasData = !!data && sessionCount > 0;

  const config = THERAPY_PROGRESS_CONFIGS[activeType as Exclude<TherapyType, 'solo'>];

  // Function to get a random saying based on progress level
  const getRandomSaying = React.useCallback((level: 'high' | 'medium' | 'low', therapyType: Exclude<TherapyType, 'solo'>) => {
    const sayings = THERAPEUTIC_SAYINGS[therapyType][level];
    const randomIndex = Math.floor(Math.random() * sayings.length);
    return sayings[randomIndex];
  }, []);

  // Function to get dynamic colors for Overall Health icon based on score
  const getHealthIconColors = React.useCallback((score: number) => {
    if (score >= 80) {
      return {
        background: 'from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30',
        icon: 'text-emerald-600 dark:text-emerald-400'
      };
    } else if (score >= 60) {
      return {
        background: 'from-blue-100 to-sky-100 dark:from-blue-900/30 dark:to-sky-900/30',
        icon: 'text-blue-600 dark:text-blue-400'
      };
    } else if (score >= 40) {
      return {
        background: 'from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30',
        icon: 'text-amber-600 dark:text-amber-400'
      };
    } else {
      return {
        background: 'from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30',
        icon: 'text-red-600 dark:text-red-400'
      };
    }
  }, []);

  // Set therapeutic saying when data changes
  React.useEffect(() => {
    if (hasData) {
      const overallScore = Math.round(
        (data.closenessScore + 
         data.communicationScore + 
         data.conflictResolution + 
         data.emotionalSupport) / 4
      );
      
      const level = overallScore >= 80 ? 'high' : overallScore >= 60 ? 'medium' : 'low';
      setTherapeuticSaying(getRandomSaying(level, activeType as Exclude<TherapyType, 'solo'>));
    }
  }, [data, getRandomSaying, activeType, hasData]);

  // Get session counts for tab badges
  const sessionCounts = availableTypes.reduce((acc, type) => {
    acc[type] = 0; // This would come from the session counts query
    return acc;
  }, {} as Record<TherapyType, number>);

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
  const overallScore = hasData ? Math.round(
    (data.closenessScore + 
     data.communicationScore + 
     data.conflictResolution + 
     data.emotionalSupport) / 4
  ) : 0;

  // Get dynamic colors for the health icon
  const healthIconColors = getHealthIconColors(overallScore);

  // Determine if any metric is exceptional
  const hasExceptionalProgress = hasData && Object.values(data).some(
    value => typeof value === 'number' && value >= 85
  );

  return (
    <Card className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-xl min-h-[500px] flex flex-col">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="w-full text-center">
            <CardTitle className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 dark:text-white">
              {config.title}
            </CardTitle>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600 dark:text-gray-400 mt-1 lg:mt-2">
              {config.subtitle}
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
            variant="compact"
            showCounts={true}
            showDescriptions={true}
          />
        </div>

        {/* Overall Progress & Trend */}
        {hasData && (
          <div className="flex items-center justify-between mt-4">
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
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6 flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <UnifiedLoadingState 
              key="loading"
              type="progress" 
              message={`Loading ${config.title.toLowerCase()}...`}
              variant="inline"
            />
          ) : error ? (
            <div key="error" className="flex-1 flex items-center justify-center">
              <DashboardAPIError 
                error={error}
                onRetry={refetch}
                context={`${config.title} for ${activeType} therapy`}
              />
            </div>
          ) : !hasData ? (
            <div key="empty" className="flex-1 flex items-center justify-center">
              <EmptyState therapyType={activeType as Exclude<TherapyType, 'solo'>} />
            </div>
          ) : (
            <motion.div
              key={`progress-${activeType}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 flex-1 flex flex-col"
            >
              {/* Overall Progress */}
              <div className="text-center pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <motion.div 
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${healthIconColors.background} flex items-center justify-center`}
                    animate={{ 
                      scale: [1, 1.05, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      repeatDelay: 3 
                    }}
                  >
                    <TrendingUp className={`h-6 w-6 ${healthIconColors.icon}`} />
                  </motion.div>
                  <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-800 dark:text-gray-200">{overallScore}%</span>
                </div>
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Overall {activeType === 'family' ? 'Family' : 'Relationship'} Health
                </h3>
                {therapeuticSaying && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic max-w-md mx-auto leading-relaxed">
                    "{therapeuticSaying}"
                  </p>
                )}
              </div>

              {/* Progress Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6 lg:gap-8 xl:gap-10 flex-1 auto-rows-fr items-stretch">
                {config.metrics.map((metric) => (
                  <ProgressMetric
                    key={metric.key}
                    label={metric.label}
                    value={data[metric.key] || 0}
                    icon={metric.icon}
                    metricType={metric.type}
                    description={metric.description}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Session Count Badge */}
        {sessionCount > 0 && (
          <div className="text-center mt-auto">
            <Badge variant="secondary" className="text-xs">
              Based on {sessionCount} completed {activeType} session{sessionCount > 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}