// src/components/dashboard/InsightDetailModal.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Brain,
  Heart,
  MessageSquare,
  Activity,
  TrendingUp,
  Target,
  BookOpen,
  Clock,
  CheckCircle2,
  ArrowRight,
  Calendar,
  BarChart3,
  Users,
  Lightbulb,
  Play,
  Download,
  Share2,
  X
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface InsightDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  insight: any;
  therapyType: string;
}

const CHART_COLORS = {
  primary: '#8b5cf6',
  secondary: '#ec4899',
  accent: '#10b981',
  warning: '#f59e0b',
  info: '#3b82f6'
};

export function InsightDetailModal({ isOpen, onClose, insight, therapyType }: InsightDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!insight) return null;

  // Generate mock progress data
  const progressData = [
    { week: 'Week 1', score: 65, baseline: 60 },
    { week: 'Week 2', score: 68, baseline: 60 },
    { week: 'Week 3', score: 72, baseline: 60 },
    { week: 'Week 4', score: 78, baseline: 60 },
    { week: 'Current', score: 82, baseline: 60 },
  ];

  // Generate radar chart data for communication metrics
  const communicationRadarData = [
    { skill: 'Active Listening', value: 89, fullMark: 100 },
    { skill: 'Empathy', value: 67, fullMark: 100 },
    { skill: 'Clarity', value: 82, fullMark: 100 },
    { skill: 'Respect', value: 91, fullMark: 100 },
    { skill: 'Expression', value: 75, fullMark: 100 },
    { skill: 'Validation', value: 68, fullMark: 100 },
  ];

  // Session patterns data
  const sessionPatterns = [
    { day: 'Mon', sessions: 2, avgDuration: 45 },
    { day: 'Tue', sessions: 1, avgDuration: 30 },
    { day: 'Wed', sessions: 3, avgDuration: 52 },
    { day: 'Thu', sessions: 1, avgDuration: 40 },
    { day: 'Fri', sessions: 2, avgDuration: 35 },
    { day: 'Sat', sessions: 0, avgDuration: 0 },
    { day: 'Sun', sessions: 1, avgDuration: 60 },
  ];

  const getInsightIcon = () => {
    const icons = {
      communication: MessageSquare,
      emotional: Heart,
      behavioral: Activity,
      'mental-health': Brain,
      relationship: Users,
      progress: TrendingUp
    };
    return (icons as any)[insight.category] || Brain;
  };

  const InsightIcon = getInsightIcon();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="relative flex-shrink-0 pb-3 sm:pb-4 border-b">
          <div className="pr-10 sm:pr-12">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 lg:p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <InsightIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold truncate pr-2">{insight.title}</DialogTitle>
                <DialogDescription className="mt-0.5 sm:mt-1 text-xs sm:text-sm lg:text-base">
                  In-depth analysis and personalized recommendations
                </DialogDescription>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="flex-shrink-0 grid w-full grid-cols-2 sm:grid-cols-4 px-3 sm:px-4 md:px-6">
            <TabsTrigger value="overview" className="text-xs sm:text-sm lg:text-base">Overview</TabsTrigger>
            <TabsTrigger value="progress" className="text-xs sm:text-sm lg:text-base">Progress</TabsTrigger>
            <TabsTrigger value="patterns" className="hidden sm:inline-flex text-xs sm:text-sm lg:text-base">Patterns</TabsTrigger>
            <TabsTrigger value="resources" className="hidden sm:inline-flex text-xs sm:text-sm lg:text-base">Resources</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 pb-3 sm:pb-4">
            <TabsContent value="overview" className="space-y-4 m-0">
              {/* Current Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Current Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {insight.metrics && Object.entries(insight.metrics).slice(0, 4).map(([key, value]) => {
                      if (typeof value === 'number') {
                        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                        return (
                          <div key={key} className="text-center">
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                              {value}%
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">{label}</p>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>

                  {/* Communication Skills Radar */}
                  {insight.category === 'communication' && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-4">Communication Skills Breakdown</h4>
                      <div className="w-full h-[250px] sm:h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={communicationRadarData}>
                          <PolarGrid strokeDasharray="3 3" />
                          <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12 }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} />
                          <Radar
                            name="Your Score"
                            dataKey="value"
                            stroke={CHART_COLORS.primary}
                            fill={CHART_COLORS.primary}
                            fillOpacity={0.6}
                          />
                          <Tooltip />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Key Findings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Key Findings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <h5 className="font-medium text-green-800 dark:text-green-200 mb-1">Strengths</h5>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Your active listening skills are exceptional (89%). Partners report feeling heard and understood.
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <h5 className="font-medium text-amber-800 dark:text-amber-200 mb-1">Areas for Growth</h5>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Emotional validation needs attention (67%). Focus on acknowledging feelings before problem-solving.
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-1">Opportunity</h5>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Implementing structured communication exercises could boost overall effectiveness by 15-20%.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Plan */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Your Personalized Action Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insight.actionItems?.map((item: string, index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">{item}</p>
                          <Button variant="link" size="sm" className="h-auto p-0 mt-1">
                            <Play className="h-3 w-3 mr-1" />
                            Start this exercise
                          </Button>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress" className="space-y-4 m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Progress Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-[250px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={progressData}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis domain={[50, 100]} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="baseline"
                        stroke={CHART_COLORS.warning}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke={CHART_COLORS.primary}
                        fillOpacity={1}
                        fill="url(#colorScore)"
                      />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-600">+22%</p>
                      <p className="text-xs text-muted-foreground">Total Improvement</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">5</p>
                      <p className="text-xs text-muted-foreground">Weeks of Progress</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">82%</p>
                      <p className="text-xs text-muted-foreground">Current Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Milestone Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Milestone Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { title: "First Breakthrough", date: "2 weeks ago", description: "Successfully used I-statements in conflict" },
                      { title: "Consistency Champion", date: "1 week ago", description: "Completed 7 days of communication exercises" },
                      { title: "Empathy Explorer", date: "3 days ago", description: "Achieved 70% on emotional validation metric" }
                    ].map((milestone, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                        <div className="flex-1">
                          <h5 className="font-medium">{milestone.title}</h5>
                          <p className="text-xs text-muted-foreground">{milestone.date}</p>
                          <p className="text-sm mt-1">{milestone.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="patterns" className="space-y-4 m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Session Activity Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-[200px] sm:h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sessionPatterns}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="sessions" fill={CHART_COLORS.primary}>
                        {sessionPatterns.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.sessions > 2 ? CHART_COLORS.accent : CHART_COLORS.primary} />
                        ))}
                      </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm">
                      <strong>Peak Performance:</strong> Wednesday sessions show the highest engagement and progress.
                      Consider scheduling important discussions mid-week.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Behavioral Patterns */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Identified Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <h5 className="font-medium mb-1">Communication Style</h5>
                      <p className="text-sm text-muted-foreground">
                        You tend to be more analytical during morning sessions and more emotionally open in evening sessions.
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <h5 className="font-medium mb-1">Stress Response</h5>
                      <p className="text-sm text-muted-foreground">
                        When stressed, you default to problem-solving mode. Partners need emotional validation first.
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <h5 className="font-medium mb-1">Progress Triggers</h5>
                      <p className="text-sm text-muted-foreground">
                        Breakthrough moments often occur after structured exercises and guided conversations.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resources" className="space-y-4 m-0">
              {/* Exercises */}
              {insight.exercise && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recommended Exercise
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                      <h4 className="font-semibold text-lg mb-2">{insight.exercise.name}</h4>
                      <p className="text-sm text-muted-foreground mb-4">{insight.exercise.description}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          {insight.exercise.duration}
                        </Badge>
                        <Badge variant="secondary">
                          <Calendar className="h-3 w-3 mr-1" />
                          {insight.exercise.frequency}
                        </Badge>
                      </div>
                      <Button className="w-full">
                        <Play className="h-4 w-4 mr-2" />
                        Start Exercise Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Learning Resources */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Learning Resources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {insight.resources?.map((resource: any, index: number) => (
                      <div
                        key={index}
                        className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium">{resource.title}</h5>
                            <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {resource.type}
                              </Badge>
                              {resource.duration && (
                                <Badge variant="outline" className="text-xs">
                                  {resource.duration}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="ml-2">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Additional Tools */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Additional Tools</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    <Button variant="outline" className="justify-start">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Progress with Partner
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Export Progress Report
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Follow-up Session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex-shrink-0 pt-3 sm:pt-4 px-3 sm:px-4 md:px-6 border-t flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Badge variant="outline" className="text-xs sm:text-sm">{insight.category}</Badge>
            <Badge variant="outline" className="text-xs sm:text-sm">{insight.priority} priority</Badge>
          </div>
          <Button onClick={onClose} size="sm" className="text-xs sm:text-sm">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}