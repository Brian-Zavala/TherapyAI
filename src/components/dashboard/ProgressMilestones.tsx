// src/components/dashboard/ProgressMilestones.tsx
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Target, 
  Flame, 
  Star,
  Lock,
  CheckCircle,
  TrendingUp,
  Calendar,
  Award,
  Zap
} from "lucide-react";
import type { Milestone } from "@/lib/enhanced-metrics/types";
import { useButtonSound } from "@/hooks/useButtonSound";

interface ProgressMilestonesProps {
  milestones: Milestone[];
  onMilestoneClick?: (milestone: Milestone) => void;
}

export default function ProgressMilestones({ 
  milestones, 
  onMilestoneClick 
}: ProgressMilestonesProps) {
  const playSound = useButtonSound();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'achievement' | 'improvement' | 'streak'>('all');
  
  const categories = [
    { id: 'all', label: 'All', icon: Trophy },
    { id: 'achievement', label: 'Achievements', icon: Award },
    { id: 'improvement', label: 'Skills', icon: TrendingUp },
    { id: 'streak', label: 'Streaks', icon: Flame }
  ];

  const filteredMilestones = selectedCategory === 'all' 
    ? milestones 
    : milestones.filter(m => m.type === selectedCategory);

  const unlockedCount = milestones.filter(m => m.unlockedAt).length;
  const totalCount = milestones.length;
  const overallProgress = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Progress Milestones</h3>
        <div className="flex items-center justify-between">
          <p className="text-white/70">
            {unlockedCount} of {totalCount} milestones unlocked
          </p>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-white">
              {overallProgress.toFixed(0)}% Complete
            </span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2">
        {categories.map(category => {
          const Icon = category.icon;
          const isActive = selectedCategory === category.id;
          
          return (
            <motion.button
              key={category.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                playSound();
                setSelectedCategory(category.id as any);
              }}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg
                transition-all duration-200
                ${isActive 
                  ? 'bg-purple-500/20 border-purple-500/50 text-white' 
                  : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                }
                border
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{category.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Milestones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredMilestones.map((milestone, index) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              onClick={() => {
                playSound();
                onMilestoneClick?.(milestone);
              }}
              index={index}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredMilestones.length === 0 && (
        <div className="text-center py-8">
          <p className="text-white/60">No milestones in this category yet</p>
        </div>
      )}
    </div>
  );
}

// Individual Milestone Card
function MilestoneCard({ 
  milestone, 
  onClick, 
  index 
}: { 
  milestone: Milestone; 
  onClick: () => void;
  index: number;
}) {
  const isUnlocked = !!milestone.unlockedAt;
  const isClose = milestone.progress >= 80 && !isUnlocked;
  
  const getIcon = () => {
    if (isUnlocked) return <CheckCircle className="w-6 h-6" />;
    if (isClose) return <Star className="w-6 h-6" />;
    return <Lock className="w-6 h-6" />;
  };

  const getTypeIcon = () => {
    switch (milestone.type) {
      case 'achievement':
        return <Trophy className="w-4 h-4" />;
      case 'improvement':
        return <Target className="w-4 h-4" />;
      case 'streak':
        return <Flame className="w-4 h-4" />;
      case 'breakthrough':
        return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative p-4 rounded-xl border cursor-pointer
        transition-all duration-200
        ${isUnlocked 
          ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/10 border-purple-500/30' 
          : isClose
          ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20'
          : 'bg-white/5 border-white/10'
        }
      `}
    >
      {/* Reward Badge */}
      {milestone.reward && isUnlocked && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="absolute -top-2 -right-2 text-2xl"
        >
          {milestone.reward.icon}
        </motion.div>
      )}

      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className={`
          p-2 rounded-lg
          ${isUnlocked 
            ? 'bg-green-500/20 text-green-400' 
            : isClose
            ? 'bg-amber-500/20 text-amber-400'
            : 'bg-white/10 text-white/40'
          }
        `}>
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-semibold min-w-0 ${isUnlocked ? 'text-white' : 'text-white/80'}`}>
              {milestone.title}
            </h4>
            <div className={`flex-shrink-0 ${isUnlocked ? 'text-purple-400' : 'text-white/40'}`}>
              {getTypeIcon()}
            </div>
          </div>
          
          <p className={`text-sm ${isUnlocked ? 'text-white/70' : 'text-white/50'}`}>
            {milestone.description}
          </p>

          {/* Progress Info */}
          <div className="mt-3 space-y-2">
            {/* Progress Bar */}
            <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${milestone.progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`
                  h-full rounded-full
                  ${isUnlocked 
                    ? 'bg-gradient-to-r from-green-400 to-emerald-400' 
                    : isClose
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                  }
                `}
              />
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-xs">
              <span className={isUnlocked ? 'text-white/60' : 'text-white/40'}>
                {milestone.criteria.current} / {milestone.criteria.target} {milestone.criteria.unit}
              </span>
              {isUnlocked ? (
                <span className="text-green-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(milestone.unlockedAt as any).toLocaleDateString()}
                </span>
              ) : isClose ? (
                <span className="text-amber-400">Almost there!</span>
              ) : (
                <span className="text-white/40">{milestone.progress.toFixed(0)}%</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}