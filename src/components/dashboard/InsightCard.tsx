// src/components/dashboard/InsightCard.tsx
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Lightbulb, 
  Award,
  Target,
  Zap,
  ChevronRight,
  Sparkles
} from "lucide-react";
import type { MetricInsight } from "@/lib/enhanced-metrics/types";

interface InsightCardProps {
  insight: MetricInsight;
  onAction?: (insightId: string) => void;
  variant?: 'compact' | 'full';
}

export default function InsightCard({ insight, onAction, variant = 'full' }: InsightCardProps) {
  const getIcon = () => {
    switch (insight.type) {
      case 'strength':
        return <Award className="w-5 h-5" />;
      case 'improvement':
        return <Target className="w-5 h-5" />;
      case 'observation':
        return <Lightbulb className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  const getColorClasses = () => {
    switch (insight.type) {
      case 'strength':
        return {
          bg: 'bg-gradient-to-br from-green-500/20 to-emerald-500/10',
          border: 'border-green-500/30',
          text: 'text-green-400',
          icon: 'text-green-400'
        };
      case 'improvement':
        return {
          bg: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/10',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
          icon: 'text-blue-400'
        };
      case 'observation':
        return {
          bg: 'bg-gradient-to-br from-purple-500/20 to-pink-500/10',
          border: 'border-purple-500/30',
          text: 'text-purple-400',
          icon: 'text-purple-400'
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-br from-amber-500/20 to-orange-500/10',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          icon: 'text-amber-400'
        };
    }
  };

  const colors = getColorClasses();

  if (variant === 'compact') {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onAction?.(insight.id)}
        className={`
          p-3 rounded-lg border cursor-pointer
          ${colors.bg} ${colors.border}
          transition-all duration-200
        `}
      >
        <div className="flex items-center gap-3">
          <div className={colors.icon}>{getIcon()}</div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-white truncate">
              {insight.title}
            </h4>
            <p className="text-xs text-white/60 mt-0.5 line-clamp-1">
              {insight.description}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`
        p-4 rounded-xl border backdrop-blur-sm
        ${colors.bg} ${colors.border}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-black/20 ${colors.icon}`}>
          {getIcon()}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">
            {insight.title}
          </h3>
          <p className="text-sm text-white/80 leading-relaxed">
            {insight.description}
          </p>
          
          {insight.confidence > 0 && (
            <div className="mt-3 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-yellow-400" />
                <span className="text-xs text-white/60">
                  {insight.confidence}% confidence
                </span>
              </div>
              
              {onAction && (
                <button
                  onClick={() => onAction(insight.id)}
                  className={`
                    text-xs font-medium
                    ${colors.text} hover:${colors.text}/80
                    transition-colors
                  `}
                >
                  Learn more →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Insight List Component
export function InsightList({ 
  insights, 
  onAction,
  maxItems = 5,
  variant = 'full'
}: {
  insights: MetricInsight[];
  onAction?: (insightId: string) => void;
  maxItems?: number;
  variant?: 'compact' | 'full';
}) {
  const sortedInsights = [...insights].sort((a, b) => {
    const typeOrder = { warning: 0, improvement: 1, observation: 2, strength: 3 };
    return typeOrder[a.type] - typeOrder[b.type];
  });

  const displayedInsights = sortedInsights.slice(0, maxItems);

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {displayedInsights.map(insight => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onAction={onAction}
            variant={variant}
          />
        ))}
      </AnimatePresence>
      
      {insights.length > maxItems && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full p-3 text-center text-sm text-white/60 hover:text-white/80 transition-colors"
        >
          View {insights.length - maxItems} more insights
        </motion.button>
      )}
    </div>
  );
}