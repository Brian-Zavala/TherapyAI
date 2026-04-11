// src/components/dashboard/InsightDetailModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
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
  Calendar,
  BarChart3,
  Users,
  Lightbulb,
  Play,
  Download,
  Share2,
  X,
  Info,
  AlertCircle,
  Zap,
  ArrowRight,
  ExternalLink,
  Loader2,
  Star,
  Library
} from 'lucide-react';

interface InsightDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  insight: any;
  therapyType: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getScoreColor(score: number) {
  if (score >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreBg(score: number) {
  if (score >= 75) return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
  if (score >= 50) return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
  return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
}

function getScoreLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Moderate';
  if (score >= 30) return 'Needs Work';
  return 'Getting Started';
}

const categoryIcons: Record<string, React.ComponentType<any>> = {
  communication: MessageSquare,
  emotional: Heart,
  behavioral: Activity,
  'mental-health': Brain,
  relationship: Users,
  progress: TrendingUp
};

// ─── Empty state for charts / pattern data ────────────────────────────────────

function NoDataState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-10 text-center px-4">
      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
        <Info className="h-5 w-5 text-gray-400" />
      </div>
      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xs">{message}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ResourceItem {
  id: string
  title: string
  description: string
  type: string
  source: string
  url?: string | null
  duration?: string | null
  difficulty: string
  steps: string[]
  relevanceScore: number
  relevanceReasons: string[]
}

interface BookItem {
  title: string
  authors: string[]
  description: string
  url: string
  source: string
  type: string
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  intermediate: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  advanced: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
}

const TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  article: BookOpen,
  exercise: Zap,
  technique: Target,
  worksheet: Activity,
  book: Library,
}

export function InsightDetailModal({ isOpen, onClose, insight, therapyType }: InsightDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [books, setBooks] = useState<BookItem[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourcesError, setResourcesError] = useState(false);
  const [expandedResourceId, setExpandedResourceId] = useState<string | null>(null);

  // Fetch personalized resources when the Resources tab is opened
  useEffect(() => {
    if (activeTab !== 'resources' || !insight) return;
    if (resourcesLoading) return;

    setResourcesLoading(true);
    setResourcesError(false);

    const sessionType = therapyType?.toUpperCase() === 'COUPLE' ? 'COUPLE'
      : therapyType?.toUpperCase() === 'FAMILY' ? 'FAMILY' : 'SOLO';

    const topics = insight.basedOn?.join(',') || '';
    const params = new URLSearchParams({
      category: insight.category || 'communication',
      sessionType,
      priority: insight.priority || 'medium',
      topics,
    });

    fetch(`/api/resources?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setResources(data.resources || []);
        setBooks(data.books || []);
      })
      .catch(() => setResourcesError(true))
      .finally(() => setResourcesLoading(false));
  // Intentionally excludes resources.length — always re-fetch fresh data per tab open
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, insight?.id, therapyType]);

  // Reset resources when a different insight is opened
  useEffect(() => {
    setResources([]);
    setBooks([]);
    setResourcesError(false);
    setExpandedResourceId(null);
    setActiveTab('overview');
  }, [insight?.id]);

  if (!insight) return null;

  const InsightIcon = categoryIcons[insight.category] || Brain;

  // Numeric metrics from the insight
  const numericMetrics = insight.metrics
    ? Object.entries(insight.metrics).filter(([, v]) => typeof v === 'number') as [string, number][]
    : [];

  // Determine overall score from metrics (average) or fall back to null
  const overallScore = numericMetrics.length > 0
    ? Math.round(numericMetrics.reduce((acc, [, v]) => acc + v, 0) / numericMetrics.length)
    : null;

  // Key findings derived from real insight data
  const hasStrengths = insight.priority === 'low';
  const hasGrowthArea = insight.priority === 'high' || insight.priority === 'medium';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] sm:max-h-[92vh] overflow-hidden flex flex-col p-0">

        {/* Header */}
        <DialogHeader className="relative flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b">
          <div className="pr-10 sm:pr-12">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex-shrink-0 p-1.5 sm:p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <InsightIcon className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base sm:text-lg md:text-xl font-bold leading-snug text-gray-900 dark:text-white">{insight.title}</DialogTitle>
                <DialogDescription className="mt-0.5 text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                  In-depth analysis and personalised recommendations
                </DialogDescription>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="flex-shrink-0 grid w-full grid-cols-4 mx-0 mt-0 mb-0 bg-gray-100/80 dark:bg-gray-800/80 rounded-none border-b gap-0 p-0 h-10 sm:h-11">
            {['overview', 'progress', 'patterns', 'resources'].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="h-full text-[10px] sm:text-xs md:text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 data-[state=inactive]:text-gray-500 dark:data-[state=inactive]:text-gray-400 font-medium transition-all capitalize"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            {/* ── OVERVIEW ── */}
            <TabsContent value="overview" className="space-y-4 m-0 p-4 sm:p-5 md:p-6">

              {/* Current Status */}
              <Card>
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                    Current Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {numericMetrics.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {numericMetrics.slice(0, 4).map(([key, value]) => {
                        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                        const score = Math.min(100, Math.max(0, value));
                        return (
                          <div key={key} className={`text-center p-3 rounded-lg border ${getScoreBg(score)}`}>
                            <p className={`text-2xl sm:text-3xl font-extrabold ${getScoreColor(score)}`}>{score}%</p>
                            <p className="text-xs text-muted-foreground mt-1 leading-tight">{label}</p>
                            <p className={`text-[10px] font-medium mt-0.5 ${getScoreColor(score)}`}>{getScoreLabel(score)}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Show insight description as status when no numeric metrics */
                    <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                      <p className="text-sm sm:text-base text-purple-900 dark:text-purple-100 leading-relaxed">
                        {insight.description}
                      </p>
                      {insight.timeframe && (
                        <div className="flex items-center gap-2 mt-3">
                          <Clock className="h-4 w-4 text-purple-500 flex-shrink-0" />
                          <span className="text-xs sm:text-sm text-purple-700 dark:text-purple-300">
                            Recommended timeframe: <strong>{insight.timeframe.replace(/-/g, ' ')}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Key Findings — derived from real insight data */}
              <Card>
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    Key Findings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Priority-based finding */}
                  {insight.priority === 'low' && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <h5 className="font-semibold text-emerald-800 dark:text-emerald-200 text-sm mb-1 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Strength
                      </h5>
                      <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed">
                        {insight.description}
                      </p>
                    </div>
                  )}

                  {(insight.priority === 'medium' || insight.priority === 'high') && (
                    <div className={`p-3 rounded-lg border ${insight.priority === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'}`}>
                      <h5 className={`font-semibold text-sm mb-1 flex items-center gap-1.5 ${insight.priority === 'high' ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200'}`}>
                        <AlertCircle className="h-3.5 w-3.5" />
                        {insight.priority === 'high' ? 'Priority Area' : 'Area for Growth'}
                      </h5>
                      <p className={`text-xs sm:text-sm leading-relaxed ${insight.priority === 'high' ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
                        {insight.description}
                      </p>
                    </div>
                  )}

                  {/* Opportunity from first mental health tip or action item */}
                  {(insight.mentalHealthTips?.[0] || insight.actionItems?.[0]) && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h5 className="font-semibold text-blue-800 dark:text-blue-200 text-sm mb-1 flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5" /> Opportunity
                      </h5>
                      <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                        {insight.mentalHealthTips?.[0] || insight.actionItems?.[0]}
                      </p>
                    </div>
                  )}

                  {!insight.description && !insight.mentalHealthTips?.[0] && !insight.actionItems?.[0] && (
                    <NoDataState message="Complete more sessions to generate key findings for this insight." />
                  )}
                </CardContent>
              </Card>

              {/* Action Plan — real action items */}
              {insight.actionItems && insight.actionItems.length > 0 && (
                <Card>
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-500" />
                      Your Personalised Action Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2.5">
                      {insight.actionItems.map((item: string, index: number) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.08 }}
                          className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800"
                        >
                          <div className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{index + 1}</span>
                          </div>
                          <p className="text-xs sm:text-sm leading-relaxed flex-1">{item}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── PROGRESS ── */}
            <TabsContent value="progress" className="space-y-4 m-0 p-4 sm:p-5 md:p-6">

              {/* Current metrics as progress display */}
              <Card>
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    Your Current Scores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {numericMetrics.length > 0 ? (
                    <div className="space-y-3">
                      {numericMetrics.map(([key, value]) => {
                        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                        const score = Math.min(100, Math.max(0, value));
                        const colorClass = score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
                        const textColor = getScoreColor(score);
                        return (
                          <div key={key}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs sm:text-sm font-medium">{label}</span>
                              <span className={`text-sm sm:text-base font-bold ${textColor}`}>{score}% — {getScoreLabel(score)}</span>
                            </div>
                            <div className="h-2 sm:h-2.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full ${colorClass}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${score}%` }}
                                transition={{ duration: 0.7, ease: 'easeOut' }}
                              />
                            </div>
                          </div>
                        );
                      })}

                      {/* Overall score summary */}
                      {overallScore !== null && (
                        <div className="mt-4 pt-4 border-t flex items-center justify-between">
                          <span className="text-sm font-semibold text-muted-foreground">Overall Average</span>
                          <span className={`text-xl sm:text-2xl font-extrabold ${getScoreColor(overallScore)}`}>
                            {overallScore}% — {getScoreLabel(overallScore)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Session milestone roadmap — honest about what's needed */
                    <div className="space-y-3">
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        Metric scores track your progress <strong>across sessions</strong> — here's what unlocks at each stage:
                      </p>
                      {[
                        { sessions: 1, label: 'Baseline established', detail: 'Your first session sets the starting point.', done: true },
                        { sessions: 2, label: 'Communication & emotional scores', detail: 'Scores appear once you have 2 sessions to compare.', done: false },
                        { sessions: 3, label: 'Trend detection', detail: 'Improving vs. declining patterns become visible.', done: false },
                        { sessions: 5, label: 'Detailed progress metrics', detail: 'Specific area scores and personalised benchmarks.', done: false },
                      ].map((milestone, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${milestone.done ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700 opacity-60'}`}>
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${milestone.done ? 'bg-emerald-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}>
                            {milestone.done ? '✓' : milestone.sessions}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs sm:text-sm font-semibold ${milestone.done ? 'text-emerald-800 dark:text-emerald-200' : 'text-gray-700 dark:text-gray-300'}`}>{milestone.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{milestone.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Session data source — from insight.basedOn */}
              <Card>
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    Data Sources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {insight.basedOn && insight.basedOn.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                        This insight is based on the following session data:
                      </p>
                      {insight.basedOn.map((source: string, index: number) => (
                        <div key={index} className="flex items-center gap-2.5 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                          <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">{source}</p>
                        </div>
                      ))}
                      {insight.timeframe && (
                        <div className="flex items-center gap-2 mt-3 p-2.5 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            Recommended timeframe: <strong>{insight.timeframe.replace(/-/g, ' ')}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <NoDataState message="Session data sources will appear here after your sessions are fully analysed." />
                  )}
                </CardContent>
              </Card>

              {/* Mental health tips as growth indicators */}
              {insight.mentalHealthTips && insight.mentalHealthTips.length > 0 && (
                <Card>
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <Heart className="h-4 w-4 text-pink-500" />
                      Growth Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {insight.mentalHealthTips.map((tip: string, i: number) => (
                        <div key={i} className="flex items-start gap-2.5 p-2.5 bg-pink-50 dark:bg-pink-900/15 rounded-lg border border-pink-100 dark:border-pink-800">
                          <ArrowRight className="h-4 w-4 text-pink-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs sm:text-sm text-pink-800 dark:text-pink-200 leading-relaxed">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── PATTERNS ── */}
            <TabsContent value="patterns" className="space-y-4 m-0 p-4 sm:p-5 md:p-6">

              {/* Session patterns — no fake charts, only real data */}
              <Card>
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-500" />
                    Patterns & Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Show patterns from category-specific content */}
                  {insight.category === 'communication' && insight.metrics && numericMetrics.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Based on your session data, here are the communication patterns identified:
                      </p>
                      {numericMetrics.map(([key, value]) => {
                        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                        const score = Math.min(100, Math.max(0, value as number));
                        const isStrength = score >= 70;
                        return (
                          <div key={key} className={`p-3 rounded-lg border ${isStrength ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'}`}>
                            <div className="flex items-center justify-between">
                              <h5 className={`font-semibold text-sm ${isStrength ? 'text-emerald-800 dark:text-emerald-200' : 'text-amber-800 dark:text-amber-200'}`}>
                                {label}
                              </h5>
                              <Badge variant="outline" className={`text-xs ${isStrength ? 'border-emerald-400 text-emerald-700' : 'border-amber-400 text-amber-700'}`}>
                                {score}%
                              </Badge>
                            </div>
                            <p className={`text-xs mt-1 ${isStrength ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                              {isStrength ? `Strong ${label.toLowerCase()} — a key asset in your sessions` : `${label} has room to grow — focus here for faster progress`}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : insight.actionItems && insight.actionItems.length > 0 ? (
                    <div className="space-y-3">
                      {/* Honest label: with few sessions these are AI recommendations, not detected patterns */}
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                          These are AI-generated starting recommendations based on your sessions so far. Specific patterns unique to you emerge after 3+ sessions.
                        </p>
                      </div>
                      {insight.actionItems.slice(0, 3).map((item: string, i: number) => (
                        <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60">
                          <Target className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs sm:text-sm leading-relaxed">{item}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <NoDataState message="Patterns are identified over multiple sessions. Complete more sessions to see your unique therapy patterns emerge." />
                  )}
                </CardContent>
              </Card>

              {/* Category-specific insight */}
              <Card>
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Brain className="h-4 w-4 text-indigo-500" />
                    About This Insight
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                      <p className="text-xs sm:text-sm text-indigo-800 dark:text-indigo-200 leading-relaxed">
                        {insight.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">Category: {insight.category.replace('-', ' ')}</Badge>
                      <Badge variant="outline" className="text-xs">Priority: {insight.priority}</Badge>
                      {insight.timeframe && (
                        <Badge variant="outline" className="text-xs">Timeframe: {insight.timeframe.replace(/-/g, ' ')}</Badge>
                      )}
                    </div>
                    {insight.basedOn && insight.basedOn.length > 0 && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        Sources: {insight.basedOn.join(' • ')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── RESOURCES ── */}
            <TabsContent value="resources" className="space-y-4 m-0 p-4 sm:p-5 md:p-6">

              {/* AI exercise from insight (if generated) */}
              {insight.exercise && (
                <Card>
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <Zap className="h-4 w-4 text-purple-500" />
                      Personalised Exercise
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <h4 className="font-bold text-base sm:text-lg mb-2 text-purple-900 dark:text-purple-100">{insight.exercise.name}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3 leading-relaxed">{insight.exercise.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {insight.exercise.duration && (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />{insight.exercise.duration}
                          </Badge>
                        )}
                        {insight.exercise.frequency && (
                          <Badge variant="secondary" className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />{insight.exercise.frequency}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Curated Resources — fetched from /api/resources */}
              <Card>
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    Recommended Resources
                    {resources.length > 0 && (
                      <span className="ml-auto text-xs font-normal text-muted-foreground">
                        Matched to your session
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {resourcesLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">Finding resources matched to your session…</span>
                    </div>
                  ) : resourcesError ? (
                    <NoDataState message="Could not load resources right now. Please try again later." />
                  ) : resources.length > 0 ? (
                    <div className="space-y-3">
                      {resources.map(resource => {
                        const TypeIcon = TYPE_ICONS[resource.type] || BookOpen;
                        const isExpanded = expandedResourceId === resource.id;
                        const hasSteps = resource.steps?.length > 0;
                        const hasUrl = !!resource.url;

                        return (
                          <div
                            key={resource.id}
                            className="border rounded-lg overflow-hidden transition-all duration-200"
                          >
                            {/* Card header — always visible */}
                            <div className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-900/60 transition-colors">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                  <TypeIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <h5 className="font-semibold text-sm sm:text-base leading-snug">{resource.title}</h5>
                                    {hasUrl && (
                                      <a
                                        href={resource.url!}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-shrink-0 text-blue-500 hover:text-blue-700 transition-colors"
                                        aria-label={`Open ${resource.title}`}
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </a>
                                    )}
                                  </div>
                                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">{resource.description}</p>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                    <Badge variant="outline" className="text-[10px] sm:text-xs capitalize">{resource.type}</Badge>
                                    {resource.duration && (
                                      <Badge variant="outline" className="text-[10px] sm:text-xs">
                                        <Clock className="h-3 w-3 mr-1" />{resource.duration}
                                      </Badge>
                                    )}
                                    <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[resource.difficulty] || DIFFICULTY_COLORS.beginner}`}>
                                      {resource.difficulty}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground ml-auto">{resource.source}</span>
                                  </div>
                                  {resource.relevanceReasons.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {resource.relevanceReasons.map((reason, i) => (
                                        <span key={i} className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                                          {reason}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Show/hide steps toggle — shown for any resource that has step data */}
                              {hasSteps && (
                                <button
                                  onClick={() => setExpandedResourceId(isExpanded ? null : resource.id)}
                                  className="mt-3 ml-11 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/60 transition-colors text-xs font-semibold"
                                >
                                  <Zap className="h-3.5 w-3.5 flex-shrink-0" />
                                  {isExpanded ? 'Hide steps' : 'How to do this →'}
                                </button>
                              )}
                            </div>

                            {/* Expandable steps panel */}
                            {hasSteps && isExpanded && (
                              <div className="border-t bg-purple-50 dark:bg-purple-900/20 px-4 sm:px-5 py-4">
                                <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider mb-3">
                                  Step-by-step
                                </p>
                                <ol className="space-y-2.5">
                                  {resource.steps.map((step, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-100 text-[10px] font-bold flex items-center justify-center mt-0.5">
                                        {i + 1}
                                      </span>
                                      <p className="text-xs sm:text-sm text-purple-900 dark:text-purple-100 leading-relaxed">{step}</p>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <NoDataState message="No matched resources yet. Complete a session and open this insight to see personalised recommendations." />
                  )}
                </CardContent>
              </Card>

              {/* Book recommendations from Open Library */}
              {books.length > 0 && (
                <Card>
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <Library className="h-4 w-4 text-amber-500" />
                      Recommended Reading
                      <span className="ml-auto text-[10px] text-muted-foreground font-normal">via Open Library</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {books.map((book, i) => (
                        <a
                          key={i}
                          href={book.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 p-3 rounded-lg border hover:bg-amber-50 dark:hover:bg-amber-900/10 hover:border-amber-200 dark:hover:border-amber-800 transition-colors group"
                        >
                          <div className="flex-shrink-0 w-8 h-10 bg-amber-100 dark:bg-amber-900/30 rounded flex items-center justify-center">
                            <Library className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-semibold text-sm leading-snug group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">{book.title}</h5>
                            <p className="text-xs text-muted-foreground mt-0.5">{book.authors.slice(0, 2).join(', ')}</p>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{book.description}</p>
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 sm:px-5 md:px-6 py-3 sm:py-4 border-t flex items-center justify-end bg-gray-50 dark:bg-gray-900/50">
          <Button onClick={onClose} size="sm" className="text-xs sm:text-sm">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
