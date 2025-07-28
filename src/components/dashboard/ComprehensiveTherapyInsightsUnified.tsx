// src/components/dashboard/ComprehensiveTherapyInsightsUnified.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { UnifiedLoadingState } from './UnifiedLoadingState';
import { useTherapyInsightsFromContext } from '@/hooks/useDashboardContext';
import { TherapyInsightsErrorBoundary } from '@/components/therapy-insights';
import { dashboardTheme, getMetricTheme, getProgressBarClasses } from '@/lib/dashboard-theme';
import { DashboardAPIError } from './DashboardAPIErrorBoundary';
import '@/styles/dashboard-positioning-fix.css';
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
  ChevronRight
} from 'lucide-react';

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

function ComprehensiveTherapyInsightsComponent() {
  const [activeTab, setActiveTab] = useState('insights');
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  // Use unified hook for AI insights from context
  const { 
    data, 
    isLoading, 
    error, 
    loadingState,
    refetch 
  } = useTherapyInsightsFromContext();

  // Use unified loading state
  if (isLoading && !data) {
    return (
      <UnifiedLoadingState 
        type="insights" 
        message={dashboardTheme.loadingStates.insights.message}
        variant="card"
      />
    );
  }

  if (error) {
    return (
      <Card className="w-full border-0 shadow-sm">
        <CardContent className={`${dashboardTheme.responsive.padding.mobile} ${dashboardTheme.responsive.padding.desktop}`}>
          <DashboardAPIError
            error={error}
            onRetry={refetch}
            componentName="TherapyInsights"
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
            <Brain className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className={dashboardTheme.typography.body}>No AI insights available</p>
            <p className={`${dashboardTheme.typography.caption} mt-1`}>Complete more sessions to receive AI-powered insights</p>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  const { insights, summary, trends, personalizedTips } = data;

  // Helper function to get progress value
  const getProgressValue = (trend: string) => {
    switch (trend) {
      case 'excellent': return 90;
      case 'good': return 70;
      case 'improving': return 70;
      case 'moderate': return 50;
      case 'stable': return 50;
      case 'needs-attention': return 30;
      case 'declining': return 30;
      case 'needs-improvement': return 30;
      default: return 50;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="therapy-insights-card">
        <CardHeader className="therapy-insights-header metric-card-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div 
                className={`p-2 rounded-lg bg-gradient-to-br ${dashboardTheme.metrics.support.gradient}`}
                whileHover={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.5 }}
              >
                <Brain className="h-5 w-5 text-white" />
              </motion.div>
              <CardTitle className="dashboard-heading">AI Insights</CardTitle>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <Badge 
                variant="outline" 
                className="gap-1 border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
              >
                <Activity className="h-3 w-3" />
                {summary.overallProgress}
              </Badge>
            </motion.div>
          </div>
        </CardHeader>
      <CardContent className="therapy-insights-content">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full therapy-type-tabs-container">
          <TabsList className="therapy-tabs-list flex-col sm:flex-row">
            <TabsTrigger 
              value="insights" 
              className="therapy-tab-trigger w-full sm:w-auto data-[state=active]:bg-blue-500/20 data-[state=active]:text-white data-[state=active]:border-blue-500/50"
            >
              <Lightbulb className="h-4 w-4" />
              <span>Key Insights</span>
            </TabsTrigger>
            <TabsTrigger 
              value="action-plan" 
              className="therapy-tab-trigger w-full sm:w-auto data-[state=active]:bg-blue-500/20 data-[state=active]:text-white data-[state=active]:border-blue-500/50"
            >
              <Target className="h-4 w-4" />
              <span>Action Plan</span>
            </TabsTrigger>
            <TabsTrigger 
              value="tips" 
              className="therapy-tab-trigger w-full sm:w-auto data-[state=active]:bg-blue-500/20 data-[state=active]:text-white data-[state=active]:border-blue-500/50"
            >
              <Sparkles className="h-4 w-4" />
              <span>Daily Tips</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="space-y-6 mt-6">
            {/* Progress Overview */}
            <motion.div 
              className="progress-cards-grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div 
                className="progress-metric-card"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between">
                  <span className="label">Communication</span>
                  <Badge variant="secondary" className="text-xs">
                    {trends.communication}
                  </Badge>
                </div>
                <div className="progress-bar-container">
                  <motion.div
                    className="progress-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${getProgressValue(trends.communication)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
              
              <motion.div 
                className="progress-metric-card"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between">
                  <span className="label">Emotional Connection</span>
                  <Badge variant="secondary" className="text-xs">
                    {trends.emotional}
                  </Badge>
                </div>
                <div className="progress-bar-container">
                  <motion.div
                    className="progress-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${getProgressValue(trends.emotional)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                  />
                </div>
              </motion.div>
              
              <motion.div 
                className="progress-metric-card"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between">
                  <span className="label">Consistency</span>
                  <Badge variant="secondary" className="text-xs">
                    {trends.consistency}
                  </Badge>
                </div>
                <div className="progress-bar-container">
                  <motion.div
                    className="progress-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${getProgressValue(trends.consistency)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                  />
                </div>
              </motion.div>
            </motion.div>

            {/* Insights List */}
            <div className="insights-list">
              {insights.map((insight, index) => {
                const Icon = categoryIcons[insight.category];
                const metricType = categoryMapping[insight.category] || 'support';
                const theme = getMetricTheme(metricType as any);
                const priorityStyle = priorityConfig[insight.priority];
                const isExpanded = expandedInsight === insight.id;
                
                return (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="insight-card"
                    onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="insight-card-header">
                      <motion.div 
                        className="insight-icon-container"
                        whileHover={{ rotate: [0, -5, 5, 0] }}
                        transition={{ duration: 0.5 }}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </motion.div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="card-title">{insight.title}</h4>
                          <Badge 
                            variant="outline" 
                            className={`ml-2 ${priorityStyle.background} ${priorityStyle.text} ${priorityStyle.border}`}
                          >
                            <priorityStyle.icon className="h-3 w-3 mr-1" />
                            {insight.priority}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground leading-relaxed">{insight.description}</p>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div 
                              className="mt-4 space-y-4"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                            {/* Action Items */}
                            <div>
                              <h5 className="font-medium mb-2 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                Action Steps
                              </h5>
                              <ul className="space-y-1 ml-6">
                                {insight.actionItems.map((item, index) => (
                                  <li key={index} className="text-sm text-muted-foreground">
                                    • {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            {/* Mental Health Tips */}
                            {insight.mentalHealthTips && insight.mentalHealthTips.length > 0 && (
                              <div>
                                <h5 className="font-medium mb-2 flex items-center gap-2">
                                  <Heart className="h-4 w-4 text-pink-600" />
                                  Mental Health Tips
                                </h5>
                                <ul className="space-y-1 ml-6">
                                  {insight.mentalHealthTips.map((tip, index) => (
                                    <li key={index} className="text-sm text-muted-foreground leading-relaxed">
                                      • {tip}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Resources */}
                            {insight.resources && insight.resources.length > 0 && (
                              <div>
                                <h5 className="font-medium mb-2 flex items-center gap-2">
                                  <BookOpen className="h-4 w-4 text-blue-600" />
                                  Recommended Resources
                                </h5>
                                <div className="space-y-2">
                                  {insight.resources.map((resource, idx) => (
                                    <motion.div 
                                      key={idx} 
                                      className="ml-6 p-3 bg-gradient-to-r from-gray-50 to-blue-50/30 dark:from-gray-800 dark:to-blue-900/10 rounded-lg border border-gray-200 dark:border-gray-700"
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: idx * 0.1 }}
                                    >
                                      <h6 className="label text-gray-800 dark:text-gray-200">{resource.title}</h6>
                                      <p className="caption mt-1">
                                        {resource.description}
                                      </p>
                                      <Badge variant="secondary" className="mt-2 text-xs">
                                        {resource.type}
                                      </Badge>
                                    </motion.div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Timeframe */}
                            {insight.timeframe && (
                              <div className="flex items-center gap-2 mt-3">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  Recommended timeframe: {insight.timeframe.replace('-', ' ')}
                                </span>
                              </div>
                            )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            Based on: {insight.basedOn.join(', ')}
                          </span>
                          <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="action-plan" className="space-y-6 mt-6">
            {/* Weekly Goals */}
            <div>
              <h3 className="card-title mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                This Week's Goals
              </h3>
              <div className="space-y-3">
                {summary.weeklyGoals.map((goal, index) => (
                  <motion.div 
                    key={index} 
                    className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <motion.div 
                      className="flex items-center justify-center w-6 h-6 bg-gradient-to-br from-green-500 to-green-700 text-white rounded-full text-xs font-bold shadow-md"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      {index + 1}
                    </motion.div>
                    <p className={dashboardTheme.typography.body}>{goal}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Focus Areas */}
            <div>
              <h3 className="card-title mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Areas to Focus On
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {summary.focusAreas.map((area, index) => (
                  <motion.div 
                    key={index} 
                    className="p-4 border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.03 }}
                  >
                    <h4 className="label text-amber-800 dark:text-amber-200">{area}</h4>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Strengths */}
            <div>
              <h3 className="card-title mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-600" />
                Your Strengths
              </h3>
              <motion.div className="flex flex-wrap gap-2">
                {summary.topStrengths.map((strength, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1, type: "spring", stiffness: 500 }}
                  >
                    <Badge 
                      variant="secondary" 
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                    >
                      <Award className="h-3 w-3 mr-1.5" />
                      {strength}
                    </Badge>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="tips" className="space-y-6 mt-6">
            {/* Daily Tips */}
            <div>
              <h3 className="card-title mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Daily Practices
              </h3>
              <div className="space-y-2">
                {personalizedTips?.daily?.map((tip, index) => (
                  <motion.div 
                    key={index} 
                    className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 5 }}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </motion.div>
                    <p className={dashboardTheme.typography.bodySmall}>{tip}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Weekly Tips */}
            <div>
              <h3 className="card-title mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Weekly Goals
              </h3>
              <div className="space-y-2">
                {personalizedTips?.weekly?.map((tip, index) => (
                  <motion.div 
                    key={index} 
                    className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 5 }}
                  >
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                    >
                      <ArrowRight className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </motion.div>
                    <p className={dashboardTheme.typography.bodySmall}>{tip}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Exercises */}
            <div>
              <h3 className="card-title mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Recommended Exercises
              </h3>
              <div className="space-y-3">
                {personalizedTips?.exercises?.map((exercise, index) => (
                  <motion.div 
                    key={index} 
                    className="p-4 border border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-start gap-3">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      >
                        <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </motion.div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200 leading-relaxed">{exercise}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    </motion.div>
  );
}

// Export the component wrapped with error boundary
export function ComprehensiveTherapyInsightsUnified() {
  return (
    <TherapyInsightsErrorBoundary>
      <ComprehensiveTherapyInsightsComponent />
    </TherapyInsightsErrorBoundary>
  );
}

// Legacy export for backwards compatibility
export function ComprehensiveTherapyInsightsWithErrorBoundary() {
  return <ComprehensiveTherapyInsightsUnified />;
}