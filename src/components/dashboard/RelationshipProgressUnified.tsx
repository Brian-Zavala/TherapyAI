// src/components/dashboard/RelationshipProgressUnified.tsx
"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { UnifiedLoadingState } from './UnifiedLoadingState';
import { useProgressDataFromContext } from '@/hooks/useDashboardContext';
import { dashboardTheme, getMetricTheme, getProgressBarClasses } from '@/lib/dashboard/dashboard-theme';
import { useDashboardLoading } from '@/app/dashboard/page';
import { DashboardErrorWrapper } from './DashboardErrorBoundary';
import { DashboardAPIError } from './DashboardAPIErrorBoundary';
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
  Zap
} from 'lucide-react';

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
      className="relative group"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
    >
      <div 
        className={`space-y-3 p-4 rounded-xl border transition-all duration-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:${theme.shadow} hover:border-opacity-60 cursor-pointer`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Animated icon container */}
            <motion.div 
              className={`metric-icon-container p-3 rounded-xl bg-gradient-to-br ${theme.gradient} ${theme.shadow}`}
              whileHover={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-white">
                {icon}
              </div>
            </motion.div>
            
            <div>
              <span className="label text-gray-800 dark:text-gray-200">
                {label}
              </span>
              {description && (
                <p className="caption text-gray-600 dark:text-gray-400 mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Percentage value prominently displayed */}
            <motion.span 
              className="text-lg font-bold text-gray-900 dark:text-gray-100 min-w-[3rem] text-right"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {displayValue}%
            </motion.span>
            
            {/* Achievement badge */}
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
        
        {/* Progress bar visualization */}
        <div className="relative">
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

// Comprehensive therapeutic sayings database (emojis removed to prevent duplication)
const THERAPEUTIC_SAYINGS = {
  high: [
    "Outstanding progress! Your relationship is thriving. Keep nurturing this beautiful growth!",
    "Amazing work! You've built something truly special together. Celebrate these victories!",
    "Incredible journey! Your commitment to each other shines brightly. Keep this momentum!",
    "Exceptional progress! You're both showing what dedication and love can achieve together!",
    "Remarkable growth! Your relationship is flourishing beautifully. Trust in your strength!",
    "Wonderful achievement! You're creating the love story you both deserve. Stay proud!",
    "Brilliant work together! Your partnership is a beacon of hope and inspiration.",
    "Magnificent progress! You've mastered the art of growing together while staying true to yourselves.",
    "Extraordinary bond! You're proof that two hearts can beat as one while maintaining their uniqueness.",
    "Spectacular growth! Your relationship is a testament to what's possible with mutual respect and care.",
    "Outstanding teamwork! You've created a safe haven where both of you can flourish completely.",
    "Incredible harmony! You've found the perfect balance between togetherness and individual growth."
  ],
  medium: [
    "Good progress! You're building something meaningful. Consistency is your superpower!",
    "Steady growth! Every step forward matters. Keep nurturing your connection!",
    "Great momentum! You're on a beautiful path together. Trust the process!",
    "Wonderful progress! Small daily choices are creating lasting change. Keep going!",
    "Solid foundation! You're creating positive patterns that will serve you well!",
    "Beautiful development! You're learning to dance together through life's rhythms.",
    "Promising growth! Each conversation is building bridges between your hearts.",
    "Meaningful progress! You're discovering new ways to understand and support each other.",
    "Positive momentum! Your willingness to grow together is already transforming your bond.",
    "Encouraging development! You're cultivating the garden of your relationship with patience.",
    "Hopeful journey! Every effort you make together is planting seeds for future happiness.",
    "Inspiring progress! You're writing a new chapter in your love story, day by day.",
    "Valuable growth! You're learning that love is both a feeling and a daily choice.",
    "Thoughtful development! You're building trust brick by brick, conversation by conversation."
  ],
  low: [
    "Every journey starts somewhere. Small, consistent efforts lead to big changes over time.",
    "New beginnings are full of possibility. Each moment is a chance to grow closer.",
    "Like a garden, relationships flourish with patience, care, and gentle attention.",
    "Gentle waves create the deepest changes. Your journey is just beginning to unfold.",
    "Healing happens one conversation at a time. Be gentle with yourselves as you grow.",
    "After every storm comes a rainbow. Your commitment to growth is already a victory.",
    "The strongest flames start with a single spark. Your willingness to try is that spark.",
    "Every master was once a beginner. Your courage to start is the first step toward transformation.",
    "Mountains are moved one stone at a time. Your small efforts will create mighty changes.",
    "The oak tree was once an acorn that held its ground. Your perseverance will grow into strength.",
    "Dawn always follows the darkest hour. Your commitment to healing brings hope to your relationship.",
    "Rivers carve canyons through patient persistence. Your gentle efforts will shape lasting love.",
    "Butterflies emerge from cocoons through struggle. Your challenges are preparing you for beauty.",
    "Seeds need darkness before they reach toward light. Your current struggles are nurturing future growth.",
    "Every artist's masterpiece begins with a single brushstroke. You're creating something beautiful together.",
    "Lighthouses shine brightest during the stormiest nights. Your love can be a beacon of hope.",
    "Diamonds are formed under pressure over time. Your relationship is being refined through these moments.",
    "The tallest trees have the deepest roots. You're building a foundation that will support lasting love."
  ]
};

function RelationshipProgressComponent() {
  const { isInitialLoading } = useDashboardLoading();
  const { 
    data, 
    isLoading, 
    error, 
    loadingState,
    isRefetching,
    refetch
  } = useProgressDataFromContext();

  // State for dynamic therapeutic saying that changes on each component mount  
  const [therapeuticSaying, setTherapeuticSaying] = React.useState<string>("");

  // Function to get a random saying based on progress level
  const getRandomSaying = React.useCallback((level: 'high' | 'medium' | 'low') => {
    const sayings = THERAPEUTIC_SAYINGS[level];
    const randomIndex = Math.floor(Math.random() * sayings.length);
    return sayings[randomIndex];
  }, []);

  // Function to get dynamic colors for Overall Relationship Health icon based on score
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

  // Set a new random saying when component mounts or data changes
  React.useEffect(() => {
    if (data) {
      const overallScore = Math.round(
        (data.closenessScore + 
         data.communicationScore + 
         data.conflictResolution + 
         data.emotionalSupport) / 4
      );
      
      const level = overallScore >= 80 ? 'high' : overallScore >= 60 ? 'medium' : 'low';
      setTherapeuticSaying(getRandomSaying(level));
    }
  }, [data, getRandomSaying]);

  // Don't show individual loading state during initial dashboard load
  if (isLoading && !data && !isInitialLoading) {
    return (
      <UnifiedLoadingState 
        type="progress" 
        message={dashboardTheme.loadingStates.progress.message}
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
      <Card className="w-full border-0 shadow-sm">
        <CardContent className={`${dashboardTheme.responsive.padding.mobile} ${dashboardTheme.responsive.padding.desktop}`}>
          <DashboardAPIError
            error={error}
            onRetry={refetch}
            componentName="RelationshipProgress"
            showDetails={process.env.NODE_ENV === 'development'}
          />
        </CardContent>
      </Card>
    );
  }
  
  if (!data) {
    return (
      <Card className="w-full border-0 shadow-sm">
        <CardContent className={`${dashboardTheme.responsive.padding.mobile} ${dashboardTheme.responsive.padding.desktop}`}>
          <motion.div 
            className="text-center text-muted-foreground"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Heart className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm leading-relaxed">No progress data available</p>
            <p className="caption mt-1">Start your therapy journey to track progress</p>
          </motion.div>
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

  // Get dynamic colors for the health icon
  const healthIconColors = getHealthIconColors(overallScore);

  // Determine if any metric is exceptional
  const hasExceptionalProgress = Object.values(data).some(
    value => typeof value === 'number' && value >= 85
  );

  return (
    <Card className="w-full h-full min-h-[500px] flex flex-col bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-xl border-gray-200/50 dark:border-gray-700/50">
      <CardHeader className="metric-card-header">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="dashboard-heading">Relationship Progress</CardTitle>
            <p className="caption text-gray-600 dark:text-gray-400 mt-1">
              Track your journey together
            </p>
          </div>
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
      <CardContent className="space-y-6 flex-1 flex flex-col">
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
            <span className="text-3xl font-bold text-gray-800 dark:text-gray-200">{overallScore}%</span>
          </div>
          <h3 className="card-title text-gray-700 dark:text-gray-300 mb-1">
            Overall Relationship Health
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Based on your comprehensive progress across all areas
          </p>
        </div>

        {/* Individual Metrics */}
        <div className="space-y-5 flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-5 bg-gradient-to-b from-green-500 to-teal-500 rounded-full"></div>
            <h3 className="card-title text-gray-700 dark:text-gray-300">
              Progress Breakdown
            </h3>
          </div>
          <ProgressMetric
            label="Emotional Closeness"
            value={Math.round(data.closenessScore)}
            icon={<Heart className="h-4 w-4 text-pink-600" />}
            metricType="empathy"
          />
          <ProgressMetric
            label="Communication Quality"
            value={Math.round(data.communicationScore)}
            icon={<MessageSquare className="h-4 w-4 text-blue-600" />}
            metricType="communication"
          />
          <ProgressMetric
            label="Conflict Resolution"
            value={Math.round(data.conflictResolution)}
            icon={<Shield className="h-4 w-4 text-green-600" />}
            metricType="progress"
          />
          <ProgressMetric
            label="Emotional Support"
            value={Math.round(data.emotionalSupport)}
            icon={<Sparkles className="h-4 w-4 text-purple-600" />}
            metricType="support"
          />
        </div>

        {/* Relationship Insights Section */}
        <motion.div 
          className="mt-6 space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          {/* Section Title */}
          <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
            <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-teal-500 rounded-full"></div>
            <h3 className="card-title text-gray-800 dark:text-gray-200">
              Relationship Insights
            </h3>
          </div>
          
          {/* Dynamic Therapeutic Message */}
          <motion.div 
            className={`p-4 rounded-lg border shadow-sm ${
              overallScore >= 80 
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700' 
                : overallScore >= 60 
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
            }`}
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <p className={`text-sm font-medium leading-relaxed ${
              overallScore >= 80 
                ? 'text-emerald-800 dark:text-emerald-200' 
                : overallScore >= 60 
                ? 'text-blue-800 dark:text-blue-200'
                : 'text-amber-800 dark:text-amber-200'
            }`}>
              {therapeuticSaying || "Your journey matters, and every step forward is meaningful."}
            </p>
          </motion.div>
        </motion.div>
      </CardContent>
    </Card>
  );
}

// Export the component wrapped with error boundary
export function RelationshipProgressUnified() {
  return (
    <DashboardErrorWrapper
      componentName="RelationshipProgress"
      isolate={true}
    >
      <RelationshipProgressComponent />
    </DashboardErrorWrapper>
  );
}