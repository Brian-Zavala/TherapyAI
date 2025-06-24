// src/components/dashboard/EnhancedCommunicationMetrics.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download,
  Calendar
} from "lucide-react";
import MetricContainer, { MetricValue, MetricSkeleton } from "./MetricContainer";
import { DashboardErrorBoundary, ChartErrorBoundary } from "./DashboardErrorBoundary";
import { useMetricSubscription } from "./RealTimeMetricProvider";
import { useButtonSound } from "@/hooks/useButtonSound";

// ========================================
// TYPES
// ========================================

interface MetricData {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  trend?: 'up' | 'down' | 'stable';
  confidence: number;
  source: 'session' | 'assessment' | 'calculated';
  timestamp: string;
}

interface MetricMetadata {
  totalSessions: number;
  averageConfidence: number;
  lastUpdated: string;
  dataQuality: 'high' | 'medium' | 'low';
  suggestions?: string[];
}

// ========================================
// CONSTANTS
// ========================================

const CHART_COLORS = {
  primary: '#8b5cf6',
  secondary: '#3b82f6',
  tertiary: '#10b981',
  quaternary: '#f59e0b',
  background: 'rgba(139, 92, 246, 0.1)',
  grid: 'rgba(255, 255, 255, 0.1)'
};

const TIME_RANGES = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' }
];

// ========================================
// MAIN COMPONENT
// ========================================

export default function EnhancedCommunicationMetrics() {
  const playSound = useButtonSound();
  
  // State
  const [selectedTimeRange, setSelectedTimeRange] = useState('month');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Real-time updates
  useMetricSubscription((update) => {
    console.log('📊 Real-time metric update:', update);
    // Handle real-time updates here
  }, []);

  // ========================================
  // HANDLERS
  // ========================================

  const handleTimeRangeChange = useCallback((range: string) => {
    playSound();
    setSelectedTimeRange(range);
  }, [playSound]);

  const handleMetricClick = useCallback((metricId: string) => {
    playSound();
    setSelectedMetric(selectedMetric === metricId ? null : metricId);
  }, [playSound, selectedMetric]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    playSound();
    
    try {
      // TODO: Implement export functionality
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create CSV or PDF export
      const data = "Metric,Value,Trend,Confidence\n..."; // Placeholder
      const blob = new Blob([data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metrics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [playSound]);

  // ========================================
  // RENDER
  // ========================================

  return (
    <DashboardErrorBoundary componentName="EnhancedCommunicationMetrics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Communication Metrics</h2>
            <p className="text-white/70 mt-1">
              Track your progress across key communication areas
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Time Range Selector */}
            <select
              value={selectedTimeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {TIME_RANGES.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
            
            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="p-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors disabled:opacity-50"
              title="Export metrics"
            >
              <Download className={`w-4 h-4 ${isExporting ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        </div>

        {/* Main Metrics Container */}
        <MetricContainer
          title="Overall Progress"
          description="Your communication effectiveness across all sessions"
          fetchUrl={`/api/dashboard/metrics/v2?type=couple&timeRange=${selectedTimeRange}&aggregation=latest`}
          refreshInterval={30000}
          enableRealTime={true}
          cacheKey={`metrics-${selectedTimeRange}`}
        >
          {({ metrics, loading, error, retry, lastUpdated }) => (
            <div className="space-y-6">
              {/* Loading State */}
              {loading && <MetricSkeleton count={4} />}
              
              {/* Error State */}
              {error && !loading && (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <p className="text-white/70">{error}</p>
                  <button
                    onClick={retry}
                    className="mt-3 text-purple-400 hover:text-purple-300 text-sm underline"
                  >
                    Try again
                  </button>
                </div>
              )}
              
              {/* Metrics Display */}
              {!loading && !error && metrics.length > 0 && (
                <>
                  {/* Radar Chart */}
                  <ChartErrorBoundary>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={metrics}>
                          <PolarGrid 
                            stroke={CHART_COLORS.grid}
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
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartErrorBoundary>

                  {/* Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {metrics.map((metric) => (
                      <motion.div
                        key={metric.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleMetricClick(metric.id)}
                        className={`
                          p-4 bg-white/5 border rounded-lg cursor-pointer transition-all
                          ${selectedMetric === metric.id 
                            ? 'border-purple-500 bg-purple-500/10' 
                            : 'border-white/20 hover:border-white/30'
                          }
                        `}
                      >
                        <MetricValue metric={metric} />
                        
                        {/* Expanded Details */}
                        <AnimatePresence>
                          {selectedMetric === metric.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 pt-3 border-t border-white/10"
                            >
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-white/60">Source:</span>
                                  <span className="text-white capitalize">{metric.source}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-white/60">Confidence:</span>
                                  <span className="text-white">{metric.confidence}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-white/60">Last Update:</span>
                                  <span className="text-white">
                                    {new Date(metric.timestamp).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>

                  {/* Insights Section */}
                  <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <h4 className="font-medium text-white">Insights & Recommendations</h4>
                        <ul className="space-y-1 text-sm text-white/80">
                          <li>• Your active listening has improved by 15% this month</li>
                          <li>• Consider focusing on emotional support in upcoming sessions</li>
                          <li>• Conflict resolution shows steady progress - keep it up!</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </MetricContainer>

        {/* Trend Analysis */}
        <MetricContainer
          title="Progress Over Time"
          description="See how your metrics have changed"
          fetchUrl={`/api/dashboard/metrics/v2?type=couple&timeRange=${selectedTimeRange}&aggregation=trend`}
          refreshInterval={60000}
          cacheKey={`trends-${selectedTimeRange}`}
        >
          {({ metrics, loading }) => (
            <ChartErrorBoundary>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-pulse text-white/60">Loading trends...</div>
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={transformMetricsForAreaChart(metrics)}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                      <XAxis 
                        dataKey="date" 
                        stroke="white"
                        tick={{ fill: 'white', fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="white"
                        tick={{ fill: 'white', fontSize: 12 }}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="overall"
                        stroke={CHART_COLORS.primary}
                        fillOpacity={1}
                        fill="url(#colorPrimary)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartErrorBoundary>
          )}
        </MetricContainer>
      </div>
    </DashboardErrorBoundary>
  );
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function transformMetricsForAreaChart(metrics: MetricData[]): any[] {
  // Transform metrics data for area chart visualization
  // This is a placeholder - implement based on actual data structure
  return metrics.map((m, index) => ({
    date: new Date(Date.now() - (metrics.length - index) * 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    overall: m.value,
    name: m.name
  }));
}