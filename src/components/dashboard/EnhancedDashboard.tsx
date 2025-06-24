// src/components/dashboard/EnhancedDashboard.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart3, 
  Brain, 
  TrendingUp, 
  Users, 
  Calendar,
  Activity,
  Sparkles,
  ChevronDown,
  Download,
  RefreshCw,
  Filter,
  MoreVertical
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from "recharts";
import { DashboardErrorBoundary, ChartErrorBoundary } from "./DashboardErrorBoundary";
import MetricContainer from "./MetricContainer";
import { InsightList } from "./InsightCard";
import ProgressMilestones from "./ProgressMilestones";
import { useMetricSubscription } from "./RealTimeMetricProvider";
import { EnhancedMetricCalculator } from "@/lib/enhanced-metrics/metric-calculator";
import type { 
  EnhancedMetricData, 
  MetricInsight, 
  CommunicationPattern,
  Milestone,
  Recommendation,
  ProgressSummary
} from "@/lib/enhanced-metrics/types";
import { useButtonSound } from "@/hooks/useButtonSound";

// ========================================
// CONSTANTS
// ========================================

const CHART_COLORS = {
  primary: '#8b5cf6',
  secondary: '#3b82f6', 
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  gradient: {
    primary: ['#8b5cf6', '#a855f7', '#c084fc'],
    secondary: ['#3b82f6', '#60a5fa', '#93c5fd'],
    success: ['#10b981', '#34d399', '#6ee7b7']
  }
};

const TIME_PERIODS = [
  { value: 'week', label: 'This Week', days: 7 },
  { value: 'month', label: 'This Month', days: 30 },
  { value: 'quarter', label: 'This Quarter', days: 90 },
  { value: 'year', label: 'This Year', days: 365 }
];

// ========================================
// MAIN COMPONENT
// ========================================

export default function EnhancedDashboard() {
  const playSound = useButtonSound();
  
  // State
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [activeView, setActiveView] = useState<'overview' | 'insights' | 'progress' | 'patterns'>('overview');
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Real-time subscription
  useMetricSubscription((update) => {
    console.log('📊 Real-time dashboard update:', update);
  }, []);

  // ========================================
  // TAB NAVIGATION
  // ========================================

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'insights', label: 'AI Insights', icon: Brain },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'patterns', label: 'Patterns', icon: Activity }
  ];

  // ========================================
  // EXPORT HANDLER
  // ========================================

  const handleExport = useCallback(async (format: 'json' | 'csv' | 'pdf' = 'pdf') => {
    setIsExporting(true);
    playSound();
    
    try {
      // Import export manager dynamically
      const { ExportManager } = await import('@/lib/export/export-manager');
      const exportManager = ExportManager.getInstance();
      
      // Collect current dashboard data
      const currentPeriod = TIME_PERIODS.find(p => p.value === selectedPeriod);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (currentPeriod?.days || 30));
      
      // Mock data - replace with actual data from your metrics hooks
      const exportData = {
        metadata: {
          generatedAt: new Date().toISOString(),
          userId: 'current-user-id', // Get from session
          userName: 'User Name', // Get from session
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            period: currentPeriod?.label || 'Last 30 days'
          },
          exportVersion: '1.0.0'
        },
        summary: {
          overallProgress: 78,
          sessionsCompleted: 24,
          averageSessionRating: 4.5,
          currentStreak: 7,
          improvementRate: 15.5,
          weeklyGoalProgress: 85,
          totalTimeInvested: 1440, // minutes
          keyStrengths: ['Active Listening', 'Emotional Validation'],
          areasOfGrowth: ['Conflict Resolution', 'Expressing Needs']
        },
        metrics: [], // Get from MetricContainer
        insights: [], // Get from EnhancedMetricCalculator
        patterns: [], // Get from EnhancedMetricCalculator
        milestones: [], // Get from EnhancedMetricCalculator
        recommendations: [], // Get from EnhancedMetricCalculator
        habits: [], // Get from habit tracking
        charts: {
          progressChart: [], // Chart data
          patternsChart: [], // Pattern analysis data
          habitsChart: [] // Habit correlation data
        }
      };
      
      // Show progress modal
      let progressValue = 0;
      const progressInterval = setInterval(() => {
        progressValue = Math.min(progressValue + 10, 90);
        // Update progress UI if you have one
      }, 100);
      
      // Generate export
      const blob = await exportManager.exportData(
        exportData,
        {
          format,
          includeMetrics: true,
          includeInsights: true,
          includePatterns: true,
          includeMilestones: true,
          includeRecommendations: true,
          includeHabits: true,
          includeCharts: format === 'pdf',
          customTitle: 'Your Therapy Journey Progress',
          customDescription: `Progress report for ${currentPeriod?.label}`
        },
        (progress) => {
          clearInterval(progressInterval);
          progressValue = progress;
          // Update progress UI
        }
      );
      
      clearInterval(progressInterval);
      
      // Download or share
      const filename = exportManager.generateFilename(format);
      
      // Try to share first (mobile friendly)
      const shared = await exportManager.shareFile(blob, filename);
      
      // If share fails or is not available, download
      if (!shared) {
        await exportManager.downloadFile(blob, filename);
      }
      
      // Show success toast/notification
      console.log('✅ Export completed successfully');
      
    } catch (error) {
      console.error('❌ Export failed:', error);
      // Show error toast/notification
    } finally {
      setIsExporting(false);
    }
  }, [selectedPeriod, playSound]);

  // ========================================
  // RENDER
  // ========================================

  return (
    <DashboardErrorBoundary componentName="EnhancedDashboard">
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-purple-400" />
                Communication Analytics
              </h1>
              <p className="text-white/70 mt-1">
                AI-powered insights into your relationship progress
              </p>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Period Selector */}
              <select
                value={selectedPeriod}
                onChange={(e) => {
                  playSound();
                  setSelectedPeriod(e.target.value);
                }}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 backdrop-blur-sm"
              >
                {TIME_PERIODS.map(period => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
              
              {/* Export Dropdown */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    playSound();
                    setShowExportMenu(!showExportMenu);
                  }}
                  disabled={isExporting}
                  className="p-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all disabled:opacity-50 backdrop-blur-sm"
                  title="Export progress report"
                >
                  <Download className={`w-4 h-4 ${isExporting ? 'animate-pulse' : ''}`} />
                </motion.button>
                
                <AnimatePresence>
                  {showExportMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur-lg border border-white/20 rounded-lg shadow-xl z-50"
                    >
                      <div className="p-1">
                        <button
                          onClick={() => {
                            handleExport('pdf');
                            setShowExportMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 rounded-md transition-colors flex items-center gap-2"
                        >
                          <div className="w-4 h-4 bg-red-500/20 rounded flex items-center justify-center">
                            <span className="text-xs text-red-400">PDF</span>
                          </div>
                          Professional Report
                        </button>
                        
                        <button
                          onClick={() => {
                            handleExport('csv');
                            setShowExportMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 rounded-md transition-colors flex items-center gap-2"
                        >
                          <div className="w-4 h-4 bg-green-500/20 rounded flex items-center justify-center">
                            <span className="text-xs text-green-400">CSV</span>
                          </div>
                          Spreadsheet Data
                        </button>
                        
                        <button
                          onClick={() => {
                            handleExport('json');
                            setShowExportMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 rounded-md transition-colors flex items-center gap-2"
                        >
                          <div className="w-4 h-4 bg-blue-500/20 rounded flex items-center justify-center">
                            <span className="text-xs text-blue-400">JSON</span>
                          </div>
                          Raw Data Export
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Tab Navigation */}
          <div className="flex gap-2 p-1 bg-white/5 rounded-xl backdrop-blur-sm">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeView === tab.id;
              
              return (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    playSound();
                    setActiveView(tab.id as any);
                  }}
                  className={`
                    flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                    transition-all duration-200
                    ${isActive 
                      ? 'bg-purple-500/20 text-white shadow-lg' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {activeView === 'overview' && (
              <OverviewTab key="overview" period={selectedPeriod} />
            )}
            {activeView === 'insights' && (
              <InsightsTab key="insights" period={selectedPeriod} />
            )}
            {activeView === 'progress' && (
              <ProgressTab key="progress" period={selectedPeriod} />
            )}
            {activeView === 'patterns' && (
              <PatternsTab key="patterns" period={selectedPeriod} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardErrorBoundary>
  );
}

// ========================================
// OVERVIEW TAB
// ========================================

function OverviewTab({ period }: { period: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Overall Progress"
          value={78}
          change={+12}
          icon={TrendingUp}
          color="primary"
        />
        <MetricCard
          title="Session Consistency"
          value={92}
          change={+5}
          icon={Calendar}
          color="success"
        />
        <MetricCard
          title="Communication Score"
          value={85}
          change={+8}
          icon={Users}
          color="secondary"
        />
        <MetricCard
          title="Active Insights"
          value={14}
          change={+3}
          icon={Brain}
          color="warning"
        />
      </div>

      {/* Main Chart */}
      <MetricContainer
        title="Communication Metrics Overview"
        description="Your progress across all key communication areas"
        fetchUrl={`/api/dashboard/metrics/v2?type=couple&timeRange=${period}&aggregation=latest`}
        refreshInterval={30000}
        enableRealTime={true}
      >
        {({ metrics, loading, error }) => (
          <div className="space-y-6">
            {loading && <div className="h-80 flex items-center justify-center">
              <div className="animate-pulse text-white/60">Loading metrics...</div>
            </div>}
            
            {!loading && !error && metrics.length > 0 && (
              <>
                {/* Radar Chart */}
                <ChartErrorBoundary>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={metrics}>
                        <PolarGrid 
                          stroke="rgba(255, 255, 255, 0.1)"
                          strokeDasharray="3 3"
                        />
                        <PolarAngleAxis 
                          dataKey="name" 
                          tick={{ fill: 'white', fontSize: 12 }}
                        />
                        <PolarRadiusAxis 
                          angle={90} 
                          domain={[0, 100]}
                          tick={{ fill: 'white', fontSize: 10 }}
                        />
                        <Radar
                          name="Current"
                          dataKey="value"
                          stroke={CHART_COLORS.primary}
                          fill={CHART_COLORS.primary}
                          fillOpacity={0.6}
                          strokeWidth={2}
                        />
                        {metrics[0]?.previousValue && (
                          <Radar
                            name="Previous"
                            dataKey="previousValue"
                            stroke={CHART_COLORS.secondary}
                            fill={CHART_COLORS.secondary}
                            fillOpacity={0.3}
                            strokeWidth={1}
                            strokeDasharray="5 5"
                          />
                        )}
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px'
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartErrorBoundary>

                {/* Metric Bars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {metrics.map(metric => (
                    <MetricBar key={metric.id} metric={metric} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </MetricContainer>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <QuickInsightCard
          title="Top Strength"
          value="Active Listening"
          description="Your strongest communication skill"
          icon={Award}
          color="success"
        />
        <QuickInsightCard
          title="Focus Area"
          value="Emotional Expression"
          description="Greatest opportunity for growth"
          icon={Target}
          color="warning"
        />
        <QuickInsightCard
          title="Next Milestone"
          value="25 Sessions"
          description="3 sessions away"
          icon={Trophy}
          color="primary"
        />
      </div>
    </motion.div>
  );
}

// ========================================
// INSIGHTS TAB
// ========================================

function InsightsTab({ period }: { period: string }) {
  const [insights, setInsights] = useState<MetricInsight[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  
  useEffect(() => {
    // Simulate fetching insights
    const mockInsights = EnhancedMetricCalculator.generateInsights(
      [], // Add actual metrics
      [], // Add historical data
      10  // Session count
    );
    setInsights(mockInsights);
    
    const mockRecommendations = EnhancedMetricCalculator.generateRecommendations(
      [], // Add actual metrics
      [], // Add patterns
      {}  // Add user profile
    );
    setRecommendations(mockRecommendations);
  }, [period]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* AI Summary */}
      <div className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/30 rounded-xl backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-500/20 rounded-lg">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2">AI Analysis Summary</h3>
            <p className="text-white/80 leading-relaxed">
              Based on your recent sessions, you're showing consistent improvement in active listening 
              and conflict resolution. Your communication patterns indicate growing emotional maturity 
              and stronger partnership dynamics. Focus on maintaining this momentum while addressing 
              emotional expression for balanced growth.
            </p>
            <div className="mt-4 flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-white/60">Confidence: 87%</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span className="text-white/60">Based on 12 sessions</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Key Insights</h3>
          <InsightList 
            insights={insights}
            onAction={(id) => console.log('Insight action:', id)}
          />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Personalized Recommendations</h3>
          <RecommendationList recommendations={recommendations} />
        </div>
      </div>

      {/* Predictive Analytics */}
      <div className="p-6 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-white mb-4">4-Week Projection</h3>
        <PredictiveChart />
      </div>
    </motion.div>
  );
}

// ========================================
// PROGRESS TAB
// ========================================

function ProgressTab({ period }: { period: string }) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  
  useEffect(() => {
    // Simulate fetching milestones
    const mockMilestones = EnhancedMetricCalculator.calculateMilestones(
      'user-123',
      [], // Add metrics
      [], // Add sessions
      []  // Add habits
    );
    setMilestones(mockMilestones);
  }, [period]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Progress Summary */}
      <ProgressSummaryCard period={period} />
      
      {/* Milestones */}
      <ProgressMilestones 
        milestones={milestones}
        onMilestoneClick={(m) => console.log('Milestone clicked:', m)}
      />
      
      {/* Trend Chart */}
      <div className="p-6 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-white mb-4">Progress Over Time</h3>
        <TrendChart period={period} />
      </div>
    </motion.div>
  );
}

// ========================================
// PATTERNS TAB
// ========================================

function PatternsTab({ period }: { period: string }) {
  const [patterns, setPatterns] = useState<CommunicationPattern[]>([]);
  
  useEffect(() => {
    // Simulate fetching patterns
    const mockPatterns = EnhancedMetricCalculator.detectPatterns(
      [], // Add sessions
      []  // Add metrics
    );
    setPatterns(mockPatterns);
  }, [period]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Pattern Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {patterns.map(pattern => (
          <PatternCard key={pattern.id} pattern={pattern} />
        ))}
      </div>
      
      {/* Behavioral Analysis */}
      <div className="p-6 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-white mb-4">Behavioral Analysis</h3>
        <BehaviorChart patterns={patterns} />
      </div>
      
      {/* Habit Tracking */}
      <HabitTracker period={period} />
    </motion.div>
  );
}

// ========================================
// HELPER COMPONENTS
// ========================================

function MetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color 
}: {
  title: string;
  value: number;
  change: number;
  icon: any;
  color: string;
}) {
  const colorClasses = {
    primary: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400',
    secondary: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-400',
    success: 'from-green-500/20 to-emerald-500/10 border-green-500/30 text-green-400',
    warning: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`
        p-4 rounded-xl border bg-gradient-to-br backdrop-blur-sm
        ${colorClasses[color as keyof typeof colorClasses]}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5" />
        <span className={`text-sm font-medium ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change > 0 ? '+' : ''}{change}%
        </span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-white/60 mt-1">{title}</div>
    </motion.div>
  );
}

function MetricBar({ metric }: { metric: EnhancedMetricData }) {
  const getTrendIcon = () => {
    if (!metric.trend) return null;
    if (metric.trend === 'up') return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (metric.trend === 'down') return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Activity className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-white">{metric.name}</h4>
        {getTrendIcon()}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Score</span>
          <span className="font-medium text-white">{metric.value}%</span>
        </div>
        <div className="h-2 bg-black/20 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${metric.value}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
          />
        </div>
        {metric.previousValue && (
          <div className="text-xs text-white/40">
            Previous: {metric.previousValue}%
          </div>
        )}
      </div>
    </div>
  );
}

function QuickInsightCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  color 
}: {
  title: string;
  value: string;
  description: string;
  icon: any;
  color: string;
}) {
  const colorClasses = {
    primary: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400',
    success: 'from-green-500/20 to-emerald-500/10 border-green-500/30 text-green-400',
    warning: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400'
  };

  return (
    <div className={`
      p-4 rounded-xl border bg-gradient-to-br backdrop-blur-sm
      ${colorClasses[color as keyof typeof colorClasses]}
    `}>
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-white/60">{title}</h4>
          <p className="text-lg font-semibold text-white mt-1">{value}</p>
          <p className="text-sm text-white/60 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

function RecommendationList({ recommendations }: { recommendations: Recommendation[] }) {
  return (
    <div className="space-y-3">
      {recommendations.map(rec => (
        <motion.div
          key={rec.id}
          whileHover={{ scale: 1.02 }}
          className={`
            p-4 rounded-lg border backdrop-blur-sm
            ${rec.priority === 'high' 
              ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-500/30'
              : 'bg-white/5 border-white/10'
            }
          `}
        >
          <div className="flex items-start gap-3">
            <Target className={`w-5 h-5 ${rec.priority === 'high' ? 'text-amber-400' : 'text-white/60'}`} />
            <div className="flex-1">
              <h4 className="font-medium text-white">{rec.title}</h4>
              <p className="text-sm text-white/70 mt-1">{rec.description}</p>
              <div className="mt-2 flex items-center gap-4 text-xs text-white/50">
                <span>{rec.timeframe}</span>
                <span>•</span>
                <span>{rec.expectedImpact}</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function PredictiveChart() {
  const data = [
    { week: 'Current', value: 75, projected: 75 },
    { week: 'Week 1', value: null, projected: 78 },
    { week: 'Week 2', value: null, projected: 81 },
    { week: 'Week 3', value: null, projected: 83 },
    { week: 'Week 4', value: null, projected: 85 }
  ];

  return (
    <ChartErrorBoundary>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis dataKey="week" stroke="white" tick={{ fill: 'white', fontSize: 12 }} />
            <YAxis stroke="white" tick={{ fill: 'white', fontSize: 12 }} domain={[60, 100]} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px'
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={CHART_COLORS.primary}
              strokeWidth={3}
              dot={{ fill: CHART_COLORS.primary, r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="projected"
              stroke={CHART_COLORS.secondary}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: CHART_COLORS.secondary, r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartErrorBoundary>
  );
}

function ProgressSummaryCard({ period }: { period: string }) {
  return (
    <div className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/30 rounded-xl backdrop-blur-sm">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <div className="text-3xl font-bold text-white">+24%</div>
          <div className="text-sm text-white/70 mt-1">Overall Progress</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-white">12</div>
          <div className="text-sm text-white/70 mt-1">Sessions Completed</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-white">8.5</div>
          <div className="text-sm text-white/70 mt-1">Avg. Session Rating</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-white">92%</div>
          <div className="text-sm text-white/70 mt-1">Consistency Score</div>
        </div>
      </div>
    </div>
  );
}

function TrendChart({ period }: { period: string }) {
  const data = [
    { date: 'Jan 1', listening: 65, expression: 60, resolution: 55, support: 70 },
    { date: 'Jan 8', listening: 68, expression: 63, resolution: 58, support: 72 },
    { date: 'Jan 15', listening: 72, expression: 65, resolution: 62, support: 75 },
    { date: 'Jan 22', listening: 75, expression: 70, resolution: 68, support: 78 },
    { date: 'Jan 29', listening: 78, expression: 73, resolution: 72, support: 82 }
  ];

  return (
    <ChartErrorBoundary>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorListening" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorExpression" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis dataKey="date" stroke="white" tick={{ fill: 'white', fontSize: 12 }} />
            <YAxis stroke="white" tick={{ fill: 'white', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px'
              }}
            />
            <Area
              type="monotone"
              dataKey="listening"
              stroke={CHART_COLORS.primary}
              fillOpacity={1}
              fill="url(#colorListening)"
            />
            <Area
              type="monotone"
              dataKey="expression"
              stroke={CHART_COLORS.secondary}
              fillOpacity={1}
              fill="url(#colorExpression)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartErrorBoundary>
  );
}

function PatternCard({ pattern }: { pattern: CommunicationPattern }) {
  const getImpactColor = () => {
    switch (pattern.impact) {
      case 'positive': return 'text-green-400';
      case 'negative': return 'text-red-400';
      case 'mixed': return 'text-amber-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-4 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-white">{pattern.name}</h4>
        <span className={`text-sm ${getImpactColor()}`}>
          {pattern.impact}
        </span>
      </div>
      <p className="text-sm text-white/70 mb-3">{pattern.description}</p>
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/50">Frequency: {pattern.frequency}</span>
        <span className="text-white/50">{pattern.examples.length} examples</span>
      </div>
    </motion.div>
  );
}

function BehaviorChart({ patterns }: { patterns: CommunicationPattern[] }) {
  const data = patterns.map(p => ({
    name: p.name,
    frequency: p.frequency === 'consistent' ? 4 : p.frequency === 'frequent' ? 3 : p.frequency === 'occasional' ? 2 : 1,
    impact: p.impact === 'positive' ? 3 : p.impact === 'negative' ? -3 : p.impact === 'mixed' ? 1 : 0
  }));

  return (
    <ChartErrorBoundary>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis dataKey="name" stroke="white" tick={{ fill: 'white', fontSize: 12 }} />
            <YAxis stroke="white" tick={{ fill: 'white', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="frequency" fill={CHART_COLORS.primary}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={
                  entry.impact > 0 ? CHART_COLORS.success : 
                  entry.impact < 0 ? CHART_COLORS.danger : 
                  CHART_COLORS.warning
                } />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartErrorBoundary>
  );
}

function HabitTracker({ period }: { period: string }) {
  const habits = [
    { name: 'Daily Check-in', streak: 14, target: 30, completed: true },
    { name: 'Active Listening Practice', streak: 7, target: 21, completed: false },
    { name: 'Gratitude Expression', streak: 21, target: 30, completed: true },
    { name: 'Conflict Resolution Exercise', streak: 3, target: 7, completed: false }
  ];

  return (
    <div className="p-6 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-white mb-4">Habit Tracker</h3>
      <div className="space-y-4">
        {habits.map(habit => (
          <div key={habit.name} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                habit.completed ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'
              }`}>
                {habit.completed ? '✓' : habit.streak}
              </div>
              <div>
                <div className="font-medium text-white">{habit.name}</div>
                <div className="text-sm text-white/60">{habit.streak} day streak</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Flame className={`w-4 h-4 ${habit.streak >= 7 ? 'text-orange-400' : 'text-white/40'}`} />
              <span className="text-sm text-white/60">{habit.streak}/{habit.target}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Add missing imports
import { Trophy, Target, Award } from "lucide-react";