'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
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

interface TherapyInsight {
  id: string;
  category: 'communication' | 'emotional' | 'behavioral' | 'mental-health' | 'relationship' | 'progress';
  title: string;
  description: string;
  actionItems: string[];
  priority: 'high' | 'medium' | 'low';
  basedOn: string[];
  mentalHealthTips?: string[];
  resources?: {
    title: string;
    description: string;
    type: 'exercise' | 'article' | 'technique' | 'practice';
  }[];
  timeframe?: 'immediate' | 'this-week' | 'this-month';
  celebrationType?: 'improvement' | 'milestone' | 'consistency';
}

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

export function ComprehensiveTherapyInsights() {
  const [activeTab, setActiveTab] = useState('insights');
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['therapy-insights'],
    queryFn: async () => {
      const response = await fetch('/api/therapy-insights');
      if (!response.ok) throw new Error('Failed to fetch insights');
      return response.json();
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Brain className="h-12 w-12 text-purple-600 animate-pulse" />
            <p className="text-lg font-medium">Analyzing your therapy journey...</p>
            <p className="text-sm text-muted-foreground">Generating personalized insights and recommendations</p>
          </div>
        </CardContent>
      </Card>
    );
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

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Brain className="h-6 w-6 text-purple-600" />
                Your Therapy Journey Insights
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Personalized analysis and recommendations based on your progress
              </p>
            </div>
            <Badge 
              variant="outline" 
              className={`
                ${summary.overallProgress === 'excellent' ? 'bg-green-100 text-green-700' : ''}
                ${summary.overallProgress === 'good' ? 'bg-blue-100 text-blue-700' : ''}
                ${summary.overallProgress === 'moderate' ? 'bg-yellow-100 text-yellow-700' : ''}
                ${summary.overallProgress === 'needs-attention' ? 'bg-red-100 text-red-700' : ''}
              `}
            >
              {summary.overallProgress.replace('-', ' ').toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Trends */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Trends</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Communication</span>
                  <Badge variant="outline" className="text-xs">
                    {trends.communication}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Emotional Connection</span>
                  <Badge variant="outline" className="text-xs">
                    {trends.emotional}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Session Consistency</span>
                  <Badge variant="outline" className="text-xs">
                    {trends.consistency}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Top Strengths */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Your Strengths</p>
              <ul className="space-y-1">
                {summary.topStrengths.map((strength: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weekly Goals */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">This Week's Goals</p>
              <ul className="space-y-1">
                {summary.weeklyGoals.slice(0, 3).map((goal: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <Target className="h-3 w-3 text-blue-600" />
                    <span className="line-clamp-1">{goal}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
          <TabsTrigger value="insights">Key Insights</TabsTrigger>
          <TabsTrigger value="actions">Action Plan</TabsTrigger>
          <TabsTrigger value="tips">Daily Tips</TabsTrigger>
        </TabsList>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4 mt-6">
          {insights.map((insight: TherapyInsight) => {
            const Icon = categoryIcons[insight.category];
            const isExpanded = expandedInsight === insight.id;
            const isCelebration = !!insight.celebrationType;

            return (
              <Card 
                key={insight.id} 
                className={`transition-all duration-200 hover:shadow-md ${
                  isCelebration ? 'border-green-200 bg-green-50/50' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${categoryColors[insight.category]} bg-opacity-10`}>
                        <Icon className={`h-5 w-5 ${categoryColors[insight.category].replace('bg-', 'text-')}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{insight.title}</h3>
                          {isCelebration && <Award className="h-5 w-5 text-yellow-500" />}
                        </div>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {insight.timeframe && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {insight.timeframe.replace('-', ' ')}
                        </Badge>
                      )}
                      <Badge className={`${priorityColors[insight.priority]} text-xs`}>
                        {insight.priority}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}
                    className="mb-3"
                  >
                    {isExpanded ? 'Show Less' : 'Show Action Steps'}
                    <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </Button>

                  {isExpanded && (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                      {/* Action Items */}
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Action Steps
                        </h4>
                        <ul className="space-y-2">
                          {insight.actionItems.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                              <span className="text-sm">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Mental Health Tips */}
                      {insight.mentalHealthTips && insight.mentalHealthTips.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <Lightbulb className="h-4 w-4" />
                            Mental Health Tips
                          </h4>
                          <ul className="space-y-2">
                            {insight.mentalHealthTips.map((tip, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <Heart className="h-4 w-4 text-pink-500 mt-0.5 flex-shrink-0" />
                                <span className="text-sm">{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Resources */}
                      {insight.resources && insight.resources.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Recommended Practices
                          </h4>
                          <div className="space-y-2">
                            {insight.resources.map((resource, idx) => (
                              <div key={idx} className="bg-gray-50 rounded-lg p-3">
                                <h5 className="font-medium text-sm">{resource.title}</h5>
                                <p className="text-xs text-muted-foreground mt-1">{resource.description}</p>
                                <Badge variant="outline" className="mt-2 text-xs">
                                  {resource.type}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Based On */}
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Based on:</span> {insight.basedOn.join(', ')}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Action Plan Tab */}
        <TabsContent value="actions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Your Personalized Action Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Immediate Actions */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  Start Today
                </h3>
                <div className="space-y-2">
                  {insights
                    .filter((i: TherapyInsight) => i.timeframe === 'immediate' && i.priority === 'high')
                    .slice(0, 3)
                    .map((insight: TherapyInsight) => (
                      <div key={insight.id} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                        <div className="mt-0.5">
                          <div className="h-6 w-6 rounded-full bg-yellow-200 flex items-center justify-center">
                            <ArrowRight className="h-3 w-3" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{insight.actionItems[0]}</p>
                          <p className="text-xs text-muted-foreground mt-1">From: {insight.title}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* This Week */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  This Week's Focus
                </h3>
                <div className="grid gap-2">
                  {summary.weeklyGoals.map((goal: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-blue-600" />
                      <span className="text-sm">{goal}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Focus Areas */}
              {summary.focusAreas.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    Areas Needing Attention
                  </h3>
                  <div className="space-y-2">
                    {summary.focusAreas.map((area: string, idx: number) => (
                      <div key={idx} className="p-3 bg-orange-50 rounded-lg">
                        <p className="text-sm font-medium">{area}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Tips Tab */}
        <TabsContent value="tips" className="mt-6">
          <div className="grid gap-4">
            {/* Daily Practices */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Daily Practices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {personalizedTips.daily.map((tip: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="mt-0.5 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium">{idx + 1}</span>
                      </div>
                      <span className="text-sm">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Weekly Rituals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Weekly Rituals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {personalizedTips.weekly.map((tip: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Recommended Exercises */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Recommended Exercises
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {personalizedTips.exercises.map((exercise: string, idx: number) => (
                    <div key={idx} className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm">{exercise}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Export wrapped version with error boundary
export function ComprehensiveTherapyInsightsWithErrorBoundary() {
  return (
    <TherapyInsightsErrorBoundary
      showPartialData={true}
      partialData={{
        message: "We're still analyzing your previous sessions. Basic insights will be available soon.",
        summary: {
          overallProgress: 'good',
          topStrengths: ['Consistent attendance', 'Open communication'],
          weeklyGoals: ['Continue daily check-ins', 'Practice active listening'],
          focusAreas: []
        }
      }}
      onError={(error, errorInfo) => {
        console.error('[TherapyInsights] Error caught:', error, errorInfo);
      }}
    >
      <ComprehensiveTherapyInsights />
    </TherapyInsightsErrorBoundary>
  );
}