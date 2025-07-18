// src/components/dashboard/ComprehensiveTherapyInsightsUnified.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { UnifiedLoadingState } from './UnifiedLoadingState';
import { useTherapyInsights } from '@/hooks/useDashboardMetricsUnified';
import { TherapyInsightsErrorBoundary } from '@/components/therapy-insights';
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

const categoryColors = {
  communication: 'bg-blue-500',
  emotional: 'bg-pink-500',
  behavioral: 'bg-purple-500',
  'mental-health': 'bg-green-500',
  relationship: 'bg-red-500',
  progress: 'bg-yellow-500'
};

const priorityColors = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200'
};

export function ComprehensiveTherapyInsightsUnified() {
  const [activeTab, setActiveTab] = useState('insights');
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  // Use unified hook for therapy insights
  const { 
    data, 
    isLoading, 
    error, 
    loadingState 
  } = useTherapyInsights({
    enableRealTime: true,
    refreshInterval: 60000 // 1 minute
  });

  // Use unified loading state
  if (isLoading) {
    return <UnifiedLoadingState {...loadingState} />;
  }

  if (error || !data) {
    return (
      <Card className="w-full">
        <CardContent className="p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Insights Temporarily Unavailable</h3>
            <p className="text-muted-foreground">Continue your therapy sessions to unlock personalized insights.</p>
          </div>
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
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-purple-600" />
            <CardTitle className="text-2xl">AI Therapy Insights</CardTitle>
          </div>
          <Badge variant="outline" className="gap-1">
            <Activity className="h-3 w-3" />
            {summary.overallProgress}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="insights" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              Key Insights
            </TabsTrigger>
            <TabsTrigger value="action-plan" className="gap-2">
              <Target className="h-4 w-4" />
              Action Plan
            </TabsTrigger>
            <TabsTrigger value="tips" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Daily Tips
            </TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="space-y-6 mt-6">
            {/* Progress Overview */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Communication</span>
                  <span className="text-xs text-muted-foreground">{trends.communication}</span>
                </div>
                <Progress value={getProgressValue(trends.communication)} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Emotional Connection</span>
                  <span className="text-xs text-muted-foreground">{trends.emotional}</span>
                </div>
                <Progress value={getProgressValue(trends.emotional)} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Consistency</span>
                  <span className="text-xs text-muted-foreground">{trends.consistency}</span>
                </div>
                <Progress value={getProgressValue(trends.consistency)} className="h-2" />
              </div>
            </div>

            {/* Insights List */}
            <div className="space-y-4">
              {insights.map((insight) => {
                const Icon = categoryIcons[insight.category];
                const isExpanded = expandedInsight === insight.id;
                
                return (
                  <div
                    key={insight.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${categoryColors[insight.category]} bg-opacity-20`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold">{insight.title}</h4>
                          <Badge 
                            variant="outline" 
                            className={`ml-2 ${priorityColors[insight.priority]}`}
                          >
                            {insight.priority}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                        
                        {isExpanded && (
                          <div className="mt-4 space-y-4">
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
                                    <li key={index} className="text-sm text-muted-foreground">
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
                                  {insight.resources.map((resource, index) => (
                                    <div key={index} className="ml-6 p-3 bg-gray-50 rounded-lg">
                                      <h6 className="font-medium text-sm">{resource.title}</h6>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {resource.description}
                                      </p>
                                      <Badge variant="secondary" className="mt-2 text-xs">
                                        {resource.type}
                                      </Badge>
                                    </div>
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
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            Based on: {insight.basedOn.join(', ')}
                          </span>
                          <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="action-plan" className="space-y-6 mt-6">
            {/* Weekly Goals */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                This Week's Goals
              </h3>
              <div className="space-y-3">
                {summary.weeklyGoals.map((goal, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-center w-6 h-6 bg-green-600 text-white rounded-full text-xs font-bold">
                      {index + 1}
                    </div>
                    <p className="text-sm flex-1">{goal}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Focus Areas */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Areas to Focus On
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {summary.focusAreas.map((area, index) => (
                  <div key={index} className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
                    <h4 className="font-medium text-sm">{area}</h4>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-600" />
                Your Strengths
              </h3>
              <div className="flex flex-wrap gap-2">
                {summary.topStrengths.map((strength, index) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1">
                    {strength}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tips" className="space-y-6 mt-6">
            {/* Daily Tips */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Daily Practices
              </h3>
              <div className="space-y-2">
                {personalizedTips.daily.map((tip, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <p className="text-sm">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Tips */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Weekly Goals
              </h3>
              <div className="space-y-2">
                {personalizedTips.weekly.map((tip, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <ArrowRight className="h-4 w-4 text-purple-600" />
                    <p className="text-sm">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Exercises */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Recommended Exercises
              </h3>
              <div className="space-y-3">
                {personalizedTips.exercises.map((exercise, index) => (
                  <div key={index} className="p-4 border border-green-200 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium">{exercise}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export function ComprehensiveTherapyInsightsWithErrorBoundary() {
  return (
    <TherapyInsightsErrorBoundary>
      <ComprehensiveTherapyInsightsUnified />
    </TherapyInsightsErrorBoundary>
  );
}