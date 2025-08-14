'use client';

import { motion } from 'framer-motion';
import { Calendar, TrendingUp, Target, Activity, BarChart3, Zap } from 'lucide-react';

interface FrequencyOption {
  value: string;
  label: string;
  description: string;
  interval: string;
  icon: React.ReactNode;
  color: string;
  benefits: string[];
  intensity: 'low' | 'medium' | 'high' | 'flexible';
  recommended?: boolean;
}

const FREQUENCY_OPTIONS: FrequencyOption[] = [
  {
    value: 'weekly',
    label: 'Weekly',
    description: 'Consistent progress with regular check-ins',
    interval: 'Every 7 days',
    icon: <Zap size={24} />,
    color: 'amber',
    intensity: 'high',
    benefits: ['Fast progress', 'Strong momentum', 'Deep work'],
    recommended: true
  },
  {
    value: 'biweekly',
    label: 'Bi-Weekly',
    description: 'Balanced approach for steady improvement',
    interval: 'Every 14 days',
    icon: <Target size={24} />,
    color: 'blue',
    intensity: 'medium',
    benefits: ['Good balance', 'Time to practice', 'Sustainable']
  },
  {
    value: 'monthly',
    label: 'Monthly',
    description: 'Maintenance and long-term support',
    interval: 'Every 30 days',
    icon: <Calendar size={24} />,
    color: 'green',
    intensity: 'low',
    benefits: ['Low commitment', 'Check-ins only', 'Budget-friendly']
  },
  {
    value: 'as-needed',
    label: 'As Needed',
    description: 'Flexible scheduling based on your needs',
    interval: 'On demand',
    icon: <Activity size={24} />,
    color: 'purple',
    intensity: 'flexible',
    benefits: ['Full control', 'Crisis support', 'No pressure']
  }
];

interface SessionFrequencySelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function SessionFrequencySelector({
  value,
  onChange,
  className = ''
}: SessionFrequencySelectorProps) {
  const getColorClasses = (color: string, isSelected: boolean) => {
    const colorMap: Record<string, { bg: string; border: string; icon: string; badge: string; bar: string }> = {
      amber: {
        bg: isSelected ? 'from-amber-500/20 to-yellow-500/20' : 'bg-white/5',
        border: isSelected ? 'border-amber-500/50' : 'border-white/10',
        icon: isSelected ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-gray-400',
        badge: 'from-amber-500 to-yellow-500',
        bar: 'bg-amber-500'
      },
      blue: {
        bg: isSelected ? 'from-blue-500/20 to-cyan-500/20' : 'bg-white/5',
        border: isSelected ? 'border-blue-500/50' : 'border-white/10',
        icon: isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-gray-400',
        badge: 'from-blue-500 to-cyan-500',
        bar: 'bg-blue-500'
      },
      green: {
        bg: isSelected ? 'from-green-500/20 to-emerald-500/20' : 'bg-white/5',
        border: isSelected ? 'border-green-500/50' : 'border-white/10',
        icon: isSelected ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-gray-400',
        badge: 'from-green-500 to-emerald-500',
        bar: 'bg-green-500'
      },
      purple: {
        bg: isSelected ? 'from-purple-500/20 to-violet-500/20' : 'bg-white/5',
        border: isSelected ? 'border-purple-500/50' : 'border-white/10',
        icon: isSelected ? 'bg-purple-500/20 text-purple-400' : 'bg-white/10 text-gray-400',
        badge: 'from-purple-500 to-violet-500',
        bar: 'bg-purple-500'
      }
    };
    return colorMap[color] || colorMap.blue;
  };

  const getIntensityBars = (intensity: string) => {
    switch (intensity) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      case 'flexible': return 0;
      default: return 0;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Info Header */}
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg border border-indigo-500/20">
        <BarChart3 className="text-indigo-400" size={20} />
        <div className="flex-1">
          <p className="text-sm text-gray-300">
            <span className="font-semibold text-white">Choose Your Pace:</span> Research shows 
            <span className="text-indigo-300"> weekly sessions</span> yield fastest results, but any consistency helps
          </p>
        </div>
      </div>

      {/* Frequency Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FREQUENCY_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          const colors = getColorClasses(option.color, isSelected);
          const intensityBars = getIntensityBars(option.intensity);
          
          return (
            <motion.button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`relative p-4 rounded-xl border transition-all text-left ${
                isSelected
                  ? `bg-gradient-to-br ${colors.bg} ${colors.border} shadow-lg`
                  : `${colors.bg} ${colors.border} hover:bg-white/10 hover:border-white/20`
              }`}
            >
              {option.recommended && (
                <div className="absolute -top-2 -right-2">
                  <motion.span 
                    initial={{ scale: 0, rotate: -12 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-gradient-to-r ${colors.badge} text-white rounded-full shadow-lg`}
                  >
                    <TrendingUp size={12} />
                    Best Results
                  </motion.span>
                </div>
              )}
              
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <motion.div 
                    className={`p-2.5 rounded-xl ${colors.icon}`}
                    animate={isSelected ? { rotate: [0, -5, 5, 0] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {option.icon}
                  </motion.div>
                  
                  <div className="flex-1">
                    <h4 className={`font-bold text-base mb-0.5 ${
                      isSelected ? 'text-white' : 'text-gray-200'
                    }`}>
                      {option.label}
                    </h4>
                    <p className={`text-xs font-medium mb-1 ${
                      isSelected ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {option.interval}
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                </div>
                
                {/* Intensity Indicator */}
                {option.intensity !== 'flexible' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Intensity:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3].map((bar) => (
                        <motion.div
                          key={bar}
                          className={`w-1.5 h-3 rounded-full ${
                            bar <= intensityBars 
                              ? colors.bar 
                              : 'bg-gray-700'
                          }`}
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: isSelected && bar <= intensityBars ? 1 : 0.3 }}
                          transition={{ delay: bar * 0.1 }}
                        />
                      ))}
                    </div>
                    <span className={`text-xs capitalize ${
                      isSelected ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {option.intensity}
                    </span>
                  </div>
                )}
                
                {/* Benefits */}
                <div className="flex flex-wrap gap-1.5">
                  {option.benefits.map((benefit, index) => (
                    <motion.span
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ 
                        opacity: isSelected ? 1 : 0.7, 
                        scale: 1 
                      }}
                      transition={{ delay: index * 0.05 }}
                      className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                        isSelected
                          ? 'bg-white/10 text-gray-300'
                          : 'bg-white/5 text-gray-500'
                      }`}
                    >
                      {benefit}
                    </motion.span>
                  ))}
                </div>
              </div>
              
              {isSelected && (
                <motion.div
                  layoutId="frequency-selector"
                  className={`absolute inset-0 border-2 ${colors.border} rounded-xl pointer-events-none`}
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Visual Comparison Chart */}
      <div className="p-4 bg-black/30 rounded-xl border border-white/10">
        <h4 className="text-sm font-semibold text-white mb-3">Session Impact Over Time</h4>
        <div className="space-y-2">
          {FREQUENCY_OPTIONS.filter(opt => opt.intensity !== 'flexible').map((option) => {
            const progress = option.intensity === 'high' ? 100 : option.intensity === 'medium' ? 65 : 35;
            const colors = getColorClasses(option.color, value === option.value);
            
            return (
              <div key={option.value} className="flex items-center gap-3">
                <span className={`text-xs w-20 ${
                  value === option.value ? 'text-white font-medium' : 'text-gray-500'
                }`}>
                  {option.label}
                </span>
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${colors.bar} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-12 text-right">
                  {progress}%
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          * Estimated progress rate based on typical therapeutic outcomes
        </p>
      </div>
    </div>
  );
}