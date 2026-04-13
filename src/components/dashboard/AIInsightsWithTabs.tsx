// @ts-nocheck
// src/components/dashboard/AIInsightsWithTabs.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { InsightDetailModal } from './InsightDetailModal';
import { getSupabaseClient } from '@/lib/supabase-singleton';
import { useSession } from '@/hooks/useClerkSession'
import { logger } from '@/lib/logger';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { UnifiedLoadingState } from './UnifiedLoadingState';
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
  Activity,
  Award,
  MessageSquare,
  Users,
  ArrowRight,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  BookOpen,
  Zap,
  Star,
  Calendar,
  Lightbulb,
  Dumbbell
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert string trend ("moderate", "good", …) or number to 0-100 */
function getProgressScore(progress: string | number): number {
  if (typeof progress === 'number') return Math.min(100, Math.max(0, Math.round(progress)));
  const map: Record<string, number> = {
    excellent: 90, very_good: 85, good: 75, improving: 65,
    moderate: 50, stable: 50, 'needs-attention': 35,
    'needs-improvement': 30, declining: 25, poor: 20
  };
  const key = String(progress ?? '').toLowerCase().replace(/-/g, '_');
  return map[key] ?? 50;
}

function getProgressLabel(progress: string | number): string {
  if (typeof progress === 'number') {
    if (progress >= 80) return 'Excellent';
    if (progress >= 65) return 'Good';
    if (progress >= 45) return 'Moderate';
    return 'Needs Work';
  }
  const s = String(progress ?? '');
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
}

function getScoreColor(score: number) {
  if (score >= 75) return { text: 'text-emerald-400', bar: 'bg-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
  if (score >= 50) return { text: 'text-amber-400', bar: 'bg-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
  return { text: 'text-red-400', bar: 'bg-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' };
}

// ─── Therapy configs ─────────────────────────────────────────────────────────

const THERAPY_INSIGHT_CONFIGS = {
  solo: {
    categories: ['mental-health', 'emotional', 'behavioral', 'progress'],
    priorities: { high: 'Needs Attention', medium: 'Growth Opportunity', low: 'Nice to Improve' },
    emptyState: {
      title: 'Your Personal Growth Journey Awaits',
      description: 'Complete individual therapy sessions to receive personalised insights about your mental health and personal development.',
      cta: 'Start Individual Session'
    }
  },
  couple: {
    categories: ['relationship', 'communication', 'emotional', 'progress'],
    priorities: { high: 'Relationship Priority', medium: 'Strengthen Bond', low: 'Enhance Connection' },
    emptyState: {
      title: 'Strengthen Your Relationship Together',
      description: 'Complete couples therapy sessions to receive insights about your communication patterns and relationship dynamics.',
      cta: 'Start Couples Session'
    }
  },
  family: {
    categories: ['relationship', 'communication', 'behavioral', 'progress'],
    priorities: { high: 'Family Harmony Focus', medium: 'Family Improvement', low: 'Family Enhancement' },
    emptyState: {
      title: 'Build Stronger Family Bonds',
      description: 'Complete family therapy sessions to receive insights about family dynamics and communication patterns.',
      cta: 'Start Family Session'
    }
  }
};

const categoryIcons: Record<string, React.ComponentType<any>> = {
  communication: MessageSquare,
  emotional: Heart,
  behavioral: Activity,
  'mental-health': Brain,
  relationship: Users,
  progress: TrendingUp
};

const priorityStyles = {
  high: {
    leftBar: 'bg-red-500',
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    icon: AlertCircle
  },
  medium: {
    leftBar: 'bg-amber-500',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: Clock
  },
  low: {
    leftBar: 'bg-emerald-500',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: CheckCircle2
  }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ProgressOverviewProps {
  summary: any;
}

function ProgressOverview({ summary }: ProgressOverviewProps) {
  const score = getProgressScore(summary.overallProgress);
  const label = getProgressLabel(summary.overallProgress);
  const colors = getScoreColor(score);

  // Ring dimensions
  const ringSize = 100;
  const strokeWidth = 8;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-4 rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 sm:p-5 md:p-6 overflow-hidden relative"
    >
      {/* Subtle gradient glow behind the ring */}
      <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none ${score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} />

      <div className="flex items-center gap-4 sm:gap-5 relative z-10">
        {/* Circular progress ring */}
        <div className="flex-shrink-0 relative">
          <svg width={ringSize} height={ringSize} className="transform -rotate-90 drop-shadow-lg">
            {/* Track */}
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={strokeWidth}
            />
            {/* Progress */}
            <motion.circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - (score / 100) * circumference }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171'} />
                <stop offset="100%" stopColor={score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'} />
              </linearGradient>
            </defs>
          </svg>
          {/* Score text centered in ring */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className={`text-2xl sm:text-3xl font-bold ${colors.text} leading-none`}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              {score}
            </motion.span>
            <span className="text-[10px] text-white/40 font-medium uppercase tracking-wide">
              of 100
            </span>
          </div>
        </div>

        {/* Info column */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-white/40 mb-1">
            Health Score
          </p>
          <h4 className="text-sm sm:text-base md:text-lg font-bold text-white leading-snug truncate">
            {summary.primaryFocus || 'Your Progress'}
          </h4>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${colors.bg} ${colors.text} border ${colors.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${colors.bar}`} />
              {label}
            </span>
          </div>
          {summary.nextMilestone && (
            <p className="text-[10px] sm:text-xs text-white/50 mt-1.5 leading-relaxed">
              Next: {summary.nextMilestone}
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 pt-3 border-t border-white/5 gap-1.5 relative z-10">
        <div className="flex items-center gap-1.5">
          {summary.isRealTime ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs text-emerald-400 font-medium">Live Session Data</span>
            </>
          ) : (
            <>
              <TrendingUp className="h-3.5 w-3.5 text-white/40" />
              <span className="text-xs text-white/40">
                {summary.improvementRate ? `${summary.improvementRate}% improvement this month` : 'Based on your sessions'}
              </span>
            </>
          )}
        </div>
        {summary.sessionsAnalyzed > 0 && (
          <span className="text-[10px] sm:text-xs text-white/30 tabular-nums">
            {summary.sessionsAnalyzed} session{summary.sessionsAnalyzed !== 1 ? 's' : ''} analysed
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Insight Card ─────────────────────────────────────────────────────────────

interface InsightCardProps {
  insight: any;
  therapyType: TherapyType;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onViewDetails: () => void;
  index: number;
}

function InsightCard({ insight, therapyType, isExpanded, onToggleExpand, onViewDetails, index }: InsightCardProps) {
  const CategoryIcon = categoryIcons[insight.category] || Brain;
  const pStyle = priorityStyles[insight.priority as keyof typeof priorityStyles] || priorityStyles.medium;
  const PriorityIcon = pStyle.icon;
  const config = THERAPY_INSIGHT_CONFIGS[therapyType];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ delay: index * 0.07, duration: 0.3 }}
      className="relative flex rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/8 transition-all duration-200"
    >
      {/* Priority left bar */}
      <div className={`w-1 flex-shrink-0 ${pStyle.leftBar}`} />

      <div className="flex-1 min-w-0 p-3 sm:p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 rounded-lg bg-white/10 mt-0.5">
            <CategoryIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white/80" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <Badge className={`text-[10px] sm:text-xs border px-1.5 py-0 whitespace-nowrap flex-shrink-0 ${pStyle.badge}`}>
                <PriorityIcon className="h-2.5 w-2.5 mr-0.5" />
                {config.priorities[insight.priority as keyof typeof config.priorities] || insight.priority}
              </Badge>
              <Badge variant="outline" className="text-[10px] sm:text-xs border-white/20 text-white/50 px-1.5 py-0 whitespace-nowrap flex-shrink-0">
                {insight.category.replace('-', ' ')}
              </Badge>
            </div>

            <h4 className="text-sm sm:text-base font-semibold text-white leading-snug">
              {insight.title}
            </h4>
            <p className="text-xs sm:text-sm text-white/60 mt-1 leading-relaxed">
              {insight.description}
            </p>
          </div>

          {/* Expand toggle — only show if there's an exercise (action steps moved to Action Plan section) */}
          {insight.exercise && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
              className="flex-shrink-0 p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Metrics strip */}
        {insight.metrics && Object.keys(insight.metrics).some(k => typeof insight.metrics[k] === 'number') && (
          <div className="flex flex-wrap gap-2 mt-3">
            {Object.entries(insight.metrics).map(([key, value]) => {
              if (typeof value !== 'number') return null;
              const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
              const score = Math.min(100, Math.max(0, value));
              const c = getScoreColor(score);
              return (
                <div key={key} className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/10">
                  <span className="text-xs text-white/50">{label}</span>
                  <span className={`text-sm font-bold ${c.text}`}>{score}%</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Expanded content — exercise only (action steps live in the Action Plan section below) */}
        <AnimatePresence>
          {isExpanded && insight.exercise && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-3 overflow-hidden"
            >
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs font-semibold text-blue-300 mb-1 flex items-center gap-1.5">
                  <Zap className="h-3 w-3" />
                  Recommended Exercise
                </p>
                <p className="text-sm font-medium text-white">{insight.exercise.name}</p>
                <p className="text-xs text-white/60 mt-0.5">{insight.exercise.description}</p>
                <div className="flex gap-2 mt-1.5">
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                    {insight.exercise.duration}
                  </span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                    {insight.exercise.frequency}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer: View Full Analysis */}
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-[10px] sm:text-xs text-white/30">
            Based on: {(insight.basedOn || []).join(', ') || 'session data'}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 sm:h-8 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 gap-1.5 px-2.5"
            onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
          >
            <ExternalLink className="h-3 w-3" />
            Full Analysis
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ therapyType }: { therapyType: TherapyType }) {
  const config = THERAPY_INSIGHT_CONFIGS[therapyType];
  const typeConfig = THERAPY_TYPE_CONFIGS[therapyType];
  const Icon = typeConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center text-center py-10 sm:py-14 px-4"
    >
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-5">
        <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-white/60" />
      </div>
      <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-2">
        {config.emptyState.title}
      </h3>
      <p className="text-sm sm:text-base text-white/50 leading-relaxed max-w-xs sm:max-w-sm mb-6">
        {config.emptyState.description}
      </p>
      <Button
        className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm sm:text-base"
        onClick={() => window.location.href = '/dashboard/therapy'}
      >
        {config.emptyState.cta}
      </Button>
    </motion.div>
  );
}

// ─── Collapsible Section ─────────────────────────────────────────────────────

interface CollapsibleSectionProps {
  icon: React.ComponentType<any>;
  title: string;
  subtitle: string;
  gradient: string;
  accentColor: string;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}

function CollapsibleSection({
  icon: Icon,
  title,
  subtitle,
  gradient,
  accentColor,
  isOpen,
  onToggle,
  badge,
  children
}: CollapsibleSectionProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-200">
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 p-3.5 sm:p-4 cursor-pointer transition-all duration-200 ${
          isOpen ? 'bg-white/10' : 'bg-white/5 hover:bg-white/8'
        }`}
      >
        <div className={`flex-shrink-0 p-2 sm:p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-semibold text-white leading-tight">{title}</h4>
            {badge && (
              <Badge className={`text-[10px] border px-1.5 py-0 whitespace-nowrap flex-shrink-0 ${accentColor}`}>
                {badge}
              </Badge>
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-white/45 mt-0.5 leading-relaxed">{subtitle}</p>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="flex-shrink-0 p-1.5 rounded-lg text-white/40"
        >
          <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-3.5 sm:px-4 pb-4 pt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Insights Extras (Action Plan, Strengths, Tips) ──────────────────────────

interface InsightsExtrasProps {
  summary: any;
  personalizedTips: any;
  trends: any;
}

function InsightsExtras({ summary, personalizedTips, trends }: InsightsExtrasProps) {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggle = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const hasGoals = summary?.weeklyGoals?.length > 0;
  const hasFocusAreas = summary?.focusAreas?.length > 0;
  const hasStrengths = summary?.topStrengths?.length > 0;
  const hasDailyTips = personalizedTips?.daily?.length > 0;
  const hasWeeklyTips = personalizedTips?.weekly?.length > 0;
  const hasExercises = personalizedTips?.exercises?.length > 0;
  const hasTipsSection = hasDailyTips || hasWeeklyTips || hasExercises;

  if (!hasGoals && !hasFocusAreas && !hasStrengths && !hasTipsSection) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
      className="space-y-2.5 sm:space-y-3"
    >
      {/* Divider label */}
      <div className="flex items-center gap-2 pt-1">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-white/30 flex items-center gap-1.5">
          <Lightbulb className="h-3 w-3" />
          Dive Deeper
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>

      {/* Action Plan */}
      {(hasGoals || hasFocusAreas) && (
        <CollapsibleSection
          icon={Target}
          title="Action Plan"
          subtitle="Weekly goals and focus areas from your sessions"
          gradient="from-emerald-500 to-teal-600"
          accentColor="bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
          isOpen={openSection === 'action-plan'}
          onToggle={() => toggle('action-plan')}
          badge={hasGoals ? `${summary.weeklyGoals.length} goals` : undefined}
        >
          <div className="space-y-4">
            {/* Weekly Goals */}
            {hasGoals && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2.5 flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  This Week's Goals
                </p>
                <div className="space-y-2">
                  {summary.weeklyGoals.map((goal: string, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/15"
                    >
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5 shadow-sm">
                        {i + 1}
                      </span>
                      <p className="text-xs sm:text-sm text-white/75 leading-relaxed">{goal}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Focus Areas */}
            {hasFocusAreas && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2.5 flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3" />
                  Areas to Focus On
                </p>
                <div className="flex flex-wrap gap-2">
                  {summary.focusAreas.map((area: string, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.08 }}
                    >
                      <Badge className="px-3 py-1.5 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/25 hover:bg-amber-500/15 transition-colors">
                        <AlertCircle className="h-3 w-3 mr-1.5" />
                        {area}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Your Strengths */}
      {hasStrengths && (
        <CollapsibleSection
          icon={Award}
          title="Your Strengths"
          subtitle="Positive patterns identified from your therapy journey"
          gradient="from-purple-500 to-pink-600"
          accentColor="bg-purple-500/15 text-purple-400 border-purple-500/30"
          isOpen={openSection === 'strengths'}
          onToggle={() => toggle('strengths')}
          badge={`${summary.topStrengths.length} identified`}
        >
          <div className="flex flex-wrap gap-2">
            {summary.topStrengths.map((strength: string, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1, type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Badge className="px-3 py-2 text-xs sm:text-sm bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/15 transition-colors">
                  <Star className="h-3 w-3 mr-1.5 text-purple-400" />
                  {strength}
                </Badge>
              </motion.div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Daily Tips & Exercises */}
      {hasTipsSection && (
        <CollapsibleSection
          icon={Sparkles}
          title="Daily Tips & Exercises"
          subtitle="Personalised practices to reinforce your progress"
          gradient="from-blue-500 to-cyan-600"
          accentColor="bg-blue-500/15 text-blue-400 border-blue-500/30"
          isOpen={openSection === 'tips'}
          onToggle={() => toggle('tips')}
        >
          <div className="space-y-4">
            {/* Daily Tips */}
            {hasDailyTips && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2.5 flex items-center gap-1.5">
                  <Lightbulb className="h-3 w-3" />
                  Daily Practices
                </p>
                <div className="space-y-2">
                  {personalizedTips.daily.map((tip: string, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-lg bg-blue-500/8 border border-blue-500/15"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs sm:text-sm text-white/75 leading-relaxed">{tip}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly Tips */}
            {hasWeeklyTips && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2.5 flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  Weekly Recommendations
                </p>
                <div className="space-y-2">
                  {personalizedTips.weekly.map((tip: string, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-lg bg-cyan-500/8 border border-cyan-500/15"
                    >
                      <ArrowRight className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs sm:text-sm text-white/75 leading-relaxed">{tip}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Exercises */}
            {hasExercises && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2.5 flex items-center gap-1.5">
                  <Dumbbell className="h-3 w-3" />
                  Therapeutic Exercises
                </p>
                <div className="space-y-2">
                  {personalizedTips.exercises.map((exercise: string, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-lg bg-indigo-500/8 border border-indigo-500/15"
                    >
                      <Zap className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs sm:text-sm text-white/75 leading-relaxed">{exercise}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AIInsightsWithTabs() {
  const { availableTypes, activeType, setActiveType } = useTherapyTypeTabs('insights');
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [realTimeInsights, setRealTimeInsights] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const { data: session } = useSession();

  const { aiInsights, sessionCount, isLoading, error, refetch } = useTherapyTypeData(activeType, activeSessionId);

  // Real-time insights subscription
  useEffect(() => {
    if (!activeSessionId) return;
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`insights-${activeSessionId}`)
      .on('broadcast', { event: 'insights-update' }, (payload) => {
        setRealTimeInsights(payload.payload.insights || []);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeSessionId]);

  // Active session check
  useEffect(() => {
    const checkActiveSession = async () => {
      if (!session?.user?.id) return;
      try {
        const res = await fetch('/api/sessions/active');
        if (res.ok) {
          const data = await res.json();
          setActiveSessionId(data?.session?.id || data?.id || null);
        }
      } catch { /* silently ignore */ }
    };
    checkActiveSession();
    const interval = setInterval(checkActiveSession, 30000);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  // Derive displayable insights
  const generateInsights = () => {
    if (realTimeInsights.length > 0) {
      const avgProgress = realTimeInsights.reduce((acc, ins) => {
        const m = ins.metrics || {};
        return acc + (m.score || m.overallScore || 50);
      }, 0) / realTimeInsights.length;

      // Calculate improvement from priority distribution
      const lowCount = realTimeInsights.filter(i => i.priority === 'low').length;
      const highCount = realTimeInsights.filter(i => i.priority === 'high').length;
      const total = realTimeInsights.length || 1;
      const improvementRate = Math.max(0, Math.round(((lowCount - highCount) / total) * 20));

      return {
        insights: realTimeInsights,
        summary: {
          overallProgress: Math.round(avgProgress),
          primaryFocus: realTimeInsights[0]?.title?.split(':')[0] || 'Personal Growth',
          nextMilestone: `Continue progress in ${realTimeInsights.find(i => i.priority === 'high')?.category || 'all areas'}`,
          improvementRate,
          sessionsAnalyzed: sessionCount || 0,
          isRealTime: true
        },
        personalizedTips: null,
        trends: null
      };
    }
    return aiInsights || { insights: [], summary: null, personalizedTips: null, trends: null };
  };

  const insights = generateInsights();
  const hasData = insights?.insights?.length > 0;
  const sessionCounts = availableTypes.reduce((acc, t) => ({ ...acc, [t]: 0 }), {} as Record<TherapyType, number>);

  return (
    <Card className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-xl flex flex-col">
      {/* ── Header ── */}
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
              <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-xl md:text-2xl font-bold text-white leading-tight">
                AI Therapy Analytics
              </CardTitle>
              <p className="text-xs sm:text-sm text-white/50 mt-0.5 leading-relaxed">
                Personalised insights to support your journey
              </p>
            </div>
          </div>

          {error && (
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              className="gap-1.5 text-red-400 border-red-400/30 hover:bg-red-400/10 flex-shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
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

        {/* Progress Overview — only when data is present */}
        {hasData && insights.summary && (
          <ProgressOverview summary={insights.summary} />
        )}
      </CardHeader>

      {/* ── Body ── */}
      <CardContent className="flex-1 flex flex-col pt-0">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <UnifiedLoadingState
              key="loading"
              type="insights"
              message={`Analysing your ${THERAPY_TYPE_CONFIGS[activeType].label.toLowerCase()} therapy insights…`}
              variant="inline"
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="space-y-3 sm:space-y-4"
            >
              {/* Section label */}
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  Your Personalised Insights
                </p>
              </div>

              {insights.insights.map((insight: any, i: number) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  therapyType={activeType}
                  isExpanded={expandedInsight === insight.id}
                  onToggleExpand={() => setExpandedInsight(expandedInsight === insight.id ? null : insight.id)}
                  onViewDetails={() => { setSelectedInsight(insight); setIsModalOpen(true); }}
                  index={i}
                />
              ))}

              {/* Collapsible extras: Action Plan, Strengths, Tips & Exercises */}
              <InsightsExtras
                summary={insights.summary}
                personalizedTips={insights.personalizedTips}
                trends={insights.trends}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Session count footer */}
        {sessionCount > 0 && !isLoading && (
          <div className="mt-4 pt-4 border-t border-white/10 text-center">
            <span className="text-xs text-white/30">
              Based on {sessionCount} completed {activeType} session{sessionCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </CardContent>

      {/* Insight Detail Modal */}
      <InsightDetailModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedInsight(null); }}
        insight={selectedInsight}
        therapyType={activeType}
      />
    </Card>
  );
}
